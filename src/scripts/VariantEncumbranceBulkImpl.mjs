// Import JavaScript modules
import {
  EncumbranceActorType,
  EncumbranceBulkData,
  EncumbranceDnd5e,
  EncumbranceFlags,
  EncumbranceMode,
  ENCUMBRANCE_TIERS,
} from "./VariantEncumbranceModels.mjs";
import Effect from "./effects/effect.mjs";
import {
  daeActive,
  dfQualityLifeActive,
  ENCUMBRANCE_STATE,
  invMidiQol,
  invPlusActive,
  itemContainerActive,
} from "./modules.mjs";
import CONSTANTS from "./constants.mjs";
import {
  debug,
  error,
  i18n,
  isGMConnected,
  is_real_number,
  retrieveAttributeEncumbranceMax,
  retrieveAttributeCapacityCargo,
  getItemQuantity,
  getItemBulk,
  retrieveBackPackManagerItem,
  calculateBackPackManagerBulk,
} from "./lib/lib.mjs";
import API from "./api.mjs";

/* ------------------------------------ */
/* Constants         					*/
/* ------------------------------------ */

export const VariantEncumbranceBulkImpl = {
  updateEncumbrance: async function (actorEntity, updatedItems, updatedEffect, mode = undefined) {
    if (updatedItems && updatedItems.length > 0) {
      for (let i = 0; i < updatedItems.length; i++) {
        const updatedItem = updatedItems ? updatedItems[i] : undefined;
        await VariantEncumbranceBulkImpl._updateEncumbranceInternal(actorEntity, updatedItem, updatedEffect, mode);
      }
    } else {
      await VariantEncumbranceBulkImpl._updateEncumbranceInternal(actorEntity, undefined, updatedEffect, mode);
    }
  },

  _updateEncumbranceInternal: async function (actorEntity, updatedItem, updatedEffect = undefined, mode = undefined) {
    if (updatedItem) {
      let itemID;
      if (typeof updatedItem === "string" || updatedItem instanceof String) {
        itemID = updatedItem;
      } else {
        itemID = updatedItem?.id ? updatedItem?.id : updatedItem._id;
      }
      let itemCurrent = itemID ? actorEntity.items.get(itemID) : undefined;
      if (!itemCurrent && (updatedItem.id || updatedItem._id)) {
        itemCurrent = updatedItem;
      }
      if (itemCurrent?.type === "feat" || itemCurrent?.type === "spell") {
        return;
      }

      if (itemCurrent) {
        if (typeof updatedItem === "string" || updatedItem instanceof String) {
          // Do nothing
        } else {
          // On update operations, the actorEntity's items have not been updated.
          // Override the entry for this item using the updatedItem data
          try {
            const updatedItem2 = {};
            for (const [key, value] of Object.entries(updatedItem)) {
              if (key.startsWith("system.")) {
                const key2 = key.replace("system.", "");
                updatedItem2[key2] = value;
              } else {
                updatedItem2[key] = value;
              }
            }
            updatedItem = updatedItem2;
            //@ts-ignore
            mergeObject(itemCurrent.system, updatedItem);
          } catch (e) {
            error(e?.message);
          }
        }
        updatedItem = itemCurrent;
      }
    }

    const currentItemId = updatedItem?.id ? updatedItem?.id : updatedItem?._id;
    const inventoryItems = [];
    const isAlreadyInActor = actorEntity.items?.find((itemTmp) => itemTmp.id === currentItemId);
    const physicalItems = ["weapon", "equipment", "consumable", "tool", "backpack", "loot"];
    actorEntity.items.contents.forEach((im) => {
      if (im && physicalItems.includes(im.type)) {
        if (im.id === currentItemId) {
          if (mode === EncumbranceMode.DELETE) {
          } else {
            inventoryItems.push(im);
          }
        } else {
          inventoryItems.push(im);
        }
      }
    });
    if (!isAlreadyInActor) {
      const im = game.items?.find((itemTmp) => itemTmp.id === currentItemId);
      if (im && physicalItems.includes(im.type)) {
        if (mode === EncumbranceMode.DELETE) {
        } else {
          inventoryItems.push(im);
        }
      }
    }
    if (updatedEffect) {
      await VariantEncumbranceBulkImpl.calculateEncumbranceWithEffect(
        actorEntity,
        inventoryItems,
        false,
        invPlusActive
      );
    } else {
      VariantEncumbranceBulkImpl.calculateEncumbrance(actorEntity, inventoryItems, false, invPlusActive);
    }

    // Finalize some flag (maybe to remove...)
  },

  calculateEncumbranceWithEffect: async function (
    actorEntity,
    // veItemData: VariantEncumbranceItemData | null,
    inventoryItems,
    ignoreCurrency,
    invPlusActive
  ) {
    const encumbranceDataBulk = VariantEncumbranceBulkImpl.calculateEncumbrance(
      actorEntity,
      inventoryItems,
      ignoreCurrency,
      invPlusActive
    );

    // SEEM NOT NECESSARY Add pre check for encumbrance tier
    if (game.settings.get(CONSTANTS.MODULE_NAME, "enablePreCheckEncumbranceTier")) {
      if (hasProperty(actorEntity, `flags.${CONSTANTS.FLAG}.${EncumbranceFlags.DATA_BULK}`)) {
        const encumbranceDataCurrent = actorEntity.getFlag(CONSTANTS.FLAG, EncumbranceFlags.DATA_BULK);
        if (encumbranceDataCurrent.encumbranceTier === encumbranceDataBulk.encumbranceTier) {
          //We ignore all the AE check
          await actorEntity.setFlag(CONSTANTS.FLAG, EncumbranceFlags.DATA_BULK, encumbranceDataBulk);
          return encumbranceDataBulk;
        }
      }
    }

    const enableVarianEncumbranceEffectsOnActorFlag = actorEntity.getFlag(
      CONSTANTS.FLAG,
      EncumbranceFlags.ENABLED_AE_BULK
    );
    if (enableVarianEncumbranceEffectsOnActorFlag) {
      await VariantEncumbranceBulkImpl.manageActiveEffect(actorEntity, encumbranceDataBulk.encumbranceTier);
    }
    await actorEntity.setFlag(CONSTANTS.FLAG, EncumbranceFlags.DATA_BULK, encumbranceDataBulk);

    return encumbranceDataBulk;
  },

  manageActiveEffect: async function (actorEntity, encumbranceTier) {
    let effectEntityPresent;

    for (const effectEntity of actorEntity.effects) {
      //@ts-ignore
      const effectNameToSet = effectEntity.label;

      //const effectIsApplied = await VariantEncumbranceBulkImpl.hasEffectAppliedFromId(effectEntity, actorEntity);

      // Remove AE with empty a label but with flag of variant encumbrance ???
      if (!effectNameToSet && hasProperty(effectEntity, `flags.${CONSTANTS.FLAG}`)) {
        await VariantEncumbranceBulkImpl.removeEffectFromId(effectEntity, actorEntity);
        continue;
      }

      if (!effectNameToSet) {
        continue;
      }

      // Remove all encumbrance effect renamed from the player
      if (
        // encumbranceData.encumbranceTier &&
        //@ts-ignore
        effectEntity.flags &&
        hasProperty(effectEntity, `flags.${CONSTANTS.FLAG}`) &&
        effectNameToSet !== ENCUMBRANCE_STATE.UNENCUMBERED &&
        effectNameToSet !== ENCUMBRANCE_STATE.ENCUMBERED &&
        effectNameToSet !== ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED &&
        effectNameToSet !== ENCUMBRANCE_STATE.OVERBURDENED
      ) {
        await VariantEncumbranceBulkImpl.removeEffectFromId(effectEntity, actorEntity);
        continue;
      }

      // Remove Old settings
      //@ts-ignore
      if (effectEntity.flags && hasProperty(effectEntity, `flags.VariantEncumbrance`)) {
        await VariantEncumbranceBulkImpl.removeEffectFromId(effectEntity, actorEntity);
        continue;
      }

      // Ignore all non encumbrance effect renamed from the player (again)
      if (
        !hasProperty(effectEntity, `flags.${CONSTANTS.FLAG}`) &&
        effectNameToSet !== ENCUMBRANCE_STATE.UNENCUMBERED &&
        effectNameToSet !== ENCUMBRANCE_STATE.ENCUMBERED &&
        effectNameToSet !== ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED &&
        effectNameToSet !== ENCUMBRANCE_STATE.OVERBURDENED
      ) {
        continue;
      }

      // Remove encumbrance effect with same name used in this module
      if (
        !hasProperty(effectEntity, `flags.${CONSTANTS.FLAG}`) &&
        (effectNameToSet === ENCUMBRANCE_STATE.UNENCUMBERED ||
          effectNameToSet === ENCUMBRANCE_STATE.ENCUMBERED ||
          effectNameToSet === ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED ||
          effectNameToSet === ENCUMBRANCE_STATE.OVERBURDENED)
      ) {
        await VariantEncumbranceBulkImpl.removeEffectFromId(effectEntity, actorEntity);
        continue;
      }

      if (
        hasProperty(effectEntity, `flags.${CONSTANTS.FLAG}`) &&
        (effectNameToSet === ENCUMBRANCE_STATE.UNENCUMBERED ||
          effectNameToSet === ENCUMBRANCE_STATE.ENCUMBERED ||
          effectNameToSet === ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED ||
          effectNameToSet === ENCUMBRANCE_STATE.OVERBURDENED)
      ) {
        if (!effectEntityPresent) {
          effectEntityPresent = effectEntity;
        } else {
          await VariantEncumbranceBulkImpl.removeEffectFromId(effectEntityPresent, actorEntity);
          effectEntityPresent = effectEntity;
        }
      }
    }

    let effectName;
    switch (encumbranceTier) {
      case ENCUMBRANCE_TIERS.NONE:
        effectName = ENCUMBRANCE_STATE.UNENCUMBERED;
        break;
      case ENCUMBRANCE_TIERS.LIGHT:
        effectName = ENCUMBRANCE_STATE.ENCUMBERED;
        break;
      case ENCUMBRANCE_TIERS.HEAVY:
        effectName = ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED;
        break;
      case ENCUMBRANCE_TIERS.MAX:
        effectName = ENCUMBRANCE_STATE.OVERBURDENED;
        break;
      default:
        effectName = null;
    }

    if (!game.settings.get(CONSTANTS.MODULE_NAME, "useVariantEncumbrance")) {
      effectName = ENCUMBRANCE_STATE.UNENCUMBERED;
    }

    if (effectName && effectName !== "") {
      //@ts-ignore
      if (effectName === effectEntityPresent?.label) {
        // Skip if name is the same and the active effect is already present.
      } else {
        if (effectName === ENCUMBRANCE_STATE.UNENCUMBERED) {
          if (effectEntityPresent?.id) {
            const effectIsApplied1 = await VariantEncumbranceBulkImpl.hasEffectAppliedFromId(
              effectEntityPresent,
              actorEntity
            );
            if (effectIsApplied1) {
              await VariantEncumbranceBulkImpl.removeEffectFromId(effectEntityPresent, actorEntity);
            }
          }
        } else {
          if (effectEntityPresent?.id) {
            const effectIsApplied2 = await VariantEncumbranceBulkImpl.hasEffectAppliedFromId(
              effectEntityPresent,
              actorEntity
            );
            if (effectIsApplied2) {
              await VariantEncumbranceBulkImpl.removeEffectFromId(effectEntityPresent, actorEntity);
            }
          }
          const effectIsApplied3 = await VariantEncumbranceBulkImpl.hasEffectApplied(effectName, actorEntity);
          if (!effectIsApplied3) {
            const origin = `Actor.${actorEntity.id}`;
            await VariantEncumbranceBulkImpl.addEffect(effectName, actorEntity, origin, encumbranceTier);
          }
        }
      }
    }
  },

  /**
   * Compute the level and percentage of encumbrance for an Actor.
   * THIS FUNCTION IS INTEGRATED WITH THE CORE FUNCTIONALITY
   *
   * Optionally include the weight of carried currency across all denominations by applying the standard rule
   * from the PHB pg. 143
   * @param {Object} actorData      The data object for the Actor being rendered
   * @returns {{max, value, pct}}  An object describing the character's encumbrance level
   * @private
   */
  calculateEncumbrance: function (
    actorEntity,
    // veItemData: VariantEncumbranceItemData | null,
    inventoryItems,
    ignoreCurrency,
    invPlusActiveTmp
  ) {
    const mapItemEncumbrance = {};
    const enableVarianEncumbranceWeightBulkOnActorFlag = actorEntity.getFlag(
      CONSTANTS.FLAG,
      EncumbranceFlags.ENABLED_WE_BULK
    );
    const useStandardWeightCalculation = game.settings.get(CONSTANTS.MODULE_NAME, "useStandardWeightCalculation");
    const doNotIncreaseWeightByQuantityForNoAmmunition = game.settings.get(
      CONSTANTS.MODULE_NAME,
      "doNotIncreaseWeightByQuantityForNoAmmunition"
    );
    const doNotApplyWeightForEquippedArmor = game.settings.get(
      CONSTANTS.MODULE_NAME,
      "doNotApplyWeightForEquippedArmor"
    );
    const useStrValueInsteadStrModOnBulk = game.settings.get(CONSTANTS.MODULE_NAME, "useStrValueInsteadStrModOnBulk");
    const useEquippedUnequippedItemCollectionFeature = game.settings.get(
      CONSTANTS.MODULE_NAME,
      "useEquippedUnequippedItemCollectionFeature"
    );
    if (!enableVarianEncumbranceWeightBulkOnActorFlag) {
      return actorEntity.getFlag(CONSTANTS.FLAG, EncumbranceFlags.DATA_BULK) || {};
    } else if (enableVarianEncumbranceWeightBulkOnActorFlag) {
      const invPlusCategoriesWeightToAdd = new Map();

      // START TOTAL WEIGHT
      // Get the total weight from items
      const physicalItems = ["weapon", "equipment", "consumable", "tool", "backpack", "loot"];
      // let totalWeight = actorEntity.items.reduce((weight, item) => {
      let totalWeight = inventoryItems.reduce((weight, item) => {
        if (!physicalItems.includes(item.type)) {
          return weight;
        }

        let itemQuantity = getItemQuantity(item);
        let itemWeight = getItemBulk(item);

        let backpackManager = retrieveBackPackManagerItem(item);
        if (backpackManager) {
          // Does the weight of the items in the container carry over to the actor?
          const weightless = getProperty(item, "system.capacity.weightless") ?? false;
          // const backpackManagerWeight =
          // 	API.calculateBulkOnActor(backpackManager)?.totalWeight ?? itemWeight;
          const backpackManagerWeight = calculateBackPackManagerBulk(item, backpackManager, ignoreCurrency);
          itemWeight = weightless ? itemWeight : itemWeight + backpackManagerWeight;

          debug(
            `Is BackpackManager! Actor '${actorEntity.name}', Item '${item.name}' : Quantity = ${itemQuantity}, Weight = ${itemWeight}`
          );
          mapItemEncumbrance[item.id] = itemQuantity * itemWeight;
          return weight + itemQuantity * itemWeight;
        }

        const isEquipped =
          //@ts-ignore
          item.system.equipped ? true : false;
        const isProficient =
          //@ts-ignore
          item.system.proficient ? item.system.proficient : false;

        debug(`Actor '${actorEntity.name}', Item '${item.name}' : Quantity = ${itemQuantity}, Weight = ${itemWeight}`);

        // let ignoreEquipmentCheck = false;

        // External modules calculation
        let ignoreQuantityCheckForItemCollection = false;
        // Start Item container check
        if (hasProperty(item, `flags.itemcollection`) && itemContainerActive) {
          itemWeight = calcBulkItemCollection(
            item,
            useEquippedUnequippedItemCollectionFeature,
            doNotApplyWeightForEquippedArmor,
            ignoreCurrency,
            doNotIncreaseWeightByQuantityForNoAmmunition
          );
          ignoreQuantityCheckForItemCollection = true;
        }
        // End Item container check
        else {
          // Does the weight of the items in the container carry over to the actor?
          // TODO  wait for 2.2.0
          const weightless = getProperty(item, "system.capacity.weightless") ?? false;

          const itemArmorTypes = ["clothing", "light", "medium", "heavy", "natural"];
          if (
            isEquipped &&
            doNotApplyWeightForEquippedArmor &&
            //@ts-ignore
            itemArmorTypes.includes(item.system.armor?.type)
          ) {
            const applyWeightMultiplierForEquippedArmorClothing =
              game.settings.get(CONSTANTS.MODULE_NAME, "applyWeightMultiplierForEquippedArmorClothing") || 0;
            const applyWeightMultiplierForEquippedArmorLight =
              game.settings.get(CONSTANTS.MODULE_NAME, "applyWeightMultiplierForEquippedArmorLight") || 0;
            const applyWeightMultiplierForEquippedArmorMedium =
              game.settings.get(CONSTANTS.MODULE_NAME, "applyWeightMultiplierForEquippedArmorMedium") || 0;
            const applyWeightMultiplierForEquippedArmorHeavy =
              game.settings.get(CONSTANTS.MODULE_NAME, "applyWeightMultiplierForEquippedArmorHeavy") || 0;
            const applyWeightMultiplierForEquippedArmorNatural =
              game.settings.get(CONSTANTS.MODULE_NAME, "applyWeightMultiplierForEquippedArmorNatural") || 0;
            //@ts-ignore
            if (item.system.armor?.type === "clothing") {
              itemWeight *= applyWeightMultiplierForEquippedArmorClothing;
            }
            //@ts-ignore
            else if (item.system.armor?.type === "light") {
              itemWeight *= applyWeightMultiplierForEquippedArmorLight;
            }
            //@ts-ignore
            else if (item.system.armor?.type === "medium") {
              itemWeight *= applyWeightMultiplierForEquippedArmorMedium;
            }
            //@ts-ignore
            else if (item.system.armor?.type === "heavy") {
              itemWeight *= applyWeightMultiplierForEquippedArmorHeavy;
            }
            //@ts-ignore
            else if (item.system.armor?.type === "natural") {
              itemWeight *= applyWeightMultiplierForEquippedArmorNatural;
            }
            //@ts-ignore
            else {
              itemWeight *= 0;
            }
          } else if (isEquipped) {
            if (isProficient) {
              itemWeight *= game.settings.get(CONSTANTS.MODULE_NAME, "profEquippedMultiplier");
            } else {
              const applyWeightMultiplierForEquippedContainer =
                item.type === "backpack"
                  ? game.settings.get(CONSTANTS.MODULE_NAME, "applyWeightMultiplierForEquippedContainer") || -1
                  : -1;
              if (applyWeightMultiplierForEquippedContainer > -1) {
                itemWeight *= applyWeightMultiplierForEquippedContainer;
              } else {
                itemWeight *= game.settings.get(CONSTANTS.MODULE_NAME, "equippedMultiplier");
              }
            }
          } else {
            itemWeight *= game.settings.get(CONSTANTS.MODULE_NAME, "unequippedMultiplier");
          }

          // Feature: Do Not increase weight by quantity for no ammunition item
          if (doNotIncreaseWeightByQuantityForNoAmmunition) {
            //@ts-ignore
            if (item.system?.consumableType !== "ammo") {
              itemQuantity = 1;
            }
          }
        }
        // Start inventory+ module is active
        if (invPlusActiveTmp) {
          // Retrieve flag 'categorys' from inventory plus module
          const inventoryPlusCategories = actorEntity.getFlag(CONSTANTS.INVENTORY_PLUS_MODULE_NAME, "categorys");
          if (inventoryPlusCategories) {
            // "weapon", "equipment", "consumable", "tool", "backpack", "loot"
            let actorHasCustomCategories = false;
            for (const categoryId in inventoryPlusCategories) {
              const section = inventoryPlusCategories[categoryId];
              if (
                // This is a error from the inventory plus developer flags stay on 'item' not on the 'item'
                //@ts-ignore
                item.flags &&
                //@ts-ignore
                item.flags[CONSTANTS.INVENTORY_PLUS_MODULE_NAME]?.category === categoryId
              ) {
                // Ignore weight
                if (section?.ignoreBulk === true) {
                  itemWeight = 0;
                  // ignoreEquipmentCheck = true;
                }
                // EXIT FOR
                actorHasCustomCategories = true;
              }

              // Inherent weight
              if (section?.ownBulk > 0) {
                if (!invPlusCategoriesWeightToAdd.has(categoryId)) {
                  invPlusCategoriesWeightToAdd.set(categoryId, section.ownBulk);
                }
              }
              if (actorHasCustomCategories) {
                break;
              }
            }
            if (!actorHasCustomCategories) {
              for (const categoryId in inventoryPlusCategories) {
                if (item.type === categoryId) {
                  const section = inventoryPlusCategories[categoryId];
                  // Ignore weight
                  if (section?.ignoreBulk === true) {
                    itemWeight = 0;
                    // ignoreEquipmentCheck = true;
                  }
                  // Inherent weight
                  if (section?.ownBulk > 0) {
                    if (!invPlusCategoriesWeightToAdd.has(categoryId)) {
                      invPlusCategoriesWeightToAdd.set(categoryId, section.ownBulk);
                    }
                  }
                  // EXIT FOR
                  break;
                }
              }
            }
          }
        }
        // End Inventory+ module is active

        // End External modules calculation

        let appliedWeight = 0;
        if (ignoreQuantityCheckForItemCollection) {
          appliedWeight = itemWeight;
          debug(
            `Actor '${actorEntity.name}', Item '${item.name}', Equipped '${isEquipped}', Proficient ${isProficient} :
               1 * ${itemWeight} = ${appliedWeight} on total ${weight} => ${weight + appliedWeight}`
          );
        } else {
          appliedWeight = itemQuantity * itemWeight;
          debug(
            `Actor '${actorEntity.name}', Item '${item.name}', Equipped '${isEquipped}', Proficient ${isProficient} :
               ${itemQuantity} * ${itemWeight} = ${appliedWeight} on total ${weight} => ${weight + appliedWeight}`
          );
        }

        mapItemEncumbrance[item.id] = appliedWeight;
        return weight + appliedWeight;
      }, 0);

      // Start inventory+ module is active 2
      if (invPlusActiveTmp) {
        for (const [key, value] of invPlusCategoriesWeightToAdd) {
          debug(`Actor '${actorEntity.name}', Category '${key}' : ${value} => ${totalWeight + value}`);
          totalWeight = totalWeight + value;
        }
      }
      // End inventory+ module is active 2
      // END TOTAL WEIGHT

      // [Optional] add Currency Weight (for non-transformed actors)
      if (
        !ignoreCurrency &&
        game.settings.get(CONSTANTS.MODULE_NAME, "enableCurrencyWeight") &&
        game.settings.get("dnd5e", "currencyWeight") &&
        actorEntity.system.currency
      ) {
        //@ts-ignore
        const currency = actorEntity.system.currency;
        const numCoins = Object.values(currency).reduce((val, denom) => (val += Math.max(denom, 0)), 0);

        // const currencyPerWeight = game.settings.get('dnd5e', 'metricWeightUnits')
        // ? game.settings.get(CONSTANTS.MODULE_NAME, 'fakeMetricSystem')
        // 	? game.settings.get(CONSTANTS.MODULE_NAME, 'currencyWeight')
        // 	: game.settings.get(CONSTANTS.MODULE_NAME, 'currencyWeightMetric')
        // : game.settings.get(CONSTANTS.MODULE_NAME, 'currencyWeight');
        const currencyPerWeight = game.settings.get(CONSTANTS.MODULE_NAME, "currencyWeightBulk") ?? 100;
        if (currencyPerWeight == 0) {
          totalWeight += 0;
        } else {
          totalWeight += numCoins / currencyPerWeight;
        }
        debug(
          `Actor '${actorEntity.name}' : ${numCoins} / ${currencyPerWeight} = ${
            currencyPerWeight == 0 ? 0 : numCoins / currencyPerWeight
          } => ${totalWeight}`
        );
      }

      // Compute Encumbrance percentage
      totalWeight = totalWeight.toNearest(0.1);
      debug(`Actor '${actorEntity.name}' => ${totalWeight}`);

      let minimumBulk = 0;
      let inventorySlot = 0;

      //@ts-ignore
      const sizeOri = actorEntity.system.traits.size;
      let size = sizeOri;
      // Manage pworful build for bulk inveotry slot
      //@ts-ignore
      if (actorEntity.flags?.dnd5e?.powerfulBuild) {
        if (size === "tiny") {
          size = "sm";
        } else if (size === "sm") {
          size = "med";
        } else if (size === "med") {
          size = "lg";
        } else if (size === "lg") {
          size = "huge";
        } else if (size === "huge") {
          size = "grg";
        } else if (size === "grg") {
          size = "grg";
        }
      }

      if (actorEntity.type === EncumbranceActorType.CHARACTER) {
        if (size === "tiny") {
          minimumBulk = 5;
          //@ts-ignore
          inventorySlot =
            6 +
            (useStrValueInsteadStrModOnBulk
              ? //@ts-ignore
                actorEntity.system.abilities.str.value
              : //@ts-ignore
                actorEntity.system.abilities.str.mod);
        } else if (size === "sm") {
          minimumBulk = 10;
          //@ts-ignore
          inventorySlot =
            14 +
            (useStrValueInsteadStrModOnBulk
              ? //@ts-ignore
                actorEntity.system.abilities.str.value
              : //@ts-ignore
                actorEntity.system.abilities.str.mod);
        } else if (size === "med") {
          minimumBulk = 20;
          //@ts-ignore
          inventorySlot =
            18 +
            (useStrValueInsteadStrModOnBulk
              ? //@ts-ignore
                actorEntity.system.abilities.str.value
              : //@ts-ignore
                actorEntity.system.abilities.str.mod);
        } else if (size === "lg") {
          minimumBulk = 40;
          //@ts-ignore
          inventorySlot =
            22 +
            (useStrValueInsteadStrModOnBulk
              ? //@ts-ignore
                actorEntity.system.abilities.str.value
              : //@ts-ignore
                actorEntity.system.abilities.str.mod * 2);
        } else if (size === "huge") {
          minimumBulk = 80;
          //@ts-ignore
          inventorySlot =
            30 +
            (useStrValueInsteadStrModOnBulk
              ? //@ts-ignore
                actorEntity.system.abilities.str.value
              : //@ts-ignore
                actorEntity.system.abilities.str.mod * 4);
        } else if (size === "grg") {
          minimumBulk = 160;
          //@ts-ignore
          inventorySlot =
            46 +
            (useStrValueInsteadStrModOnBulk
              ? //@ts-ignore
                actorEntity.system.abilities.str.value
              : //@ts-ignore
                actorEntity.system.abilities.str.mod * 8);
        } else {
          minimumBulk = 20;
          //@ts-ignore
          inventorySlot =
            18 +
            (useStrValueInsteadStrModOnBulk
              ? //@ts-ignore
                actorEntity.system.abilities.str.value
              : //@ts-ignore
                actorEntity.system.abilities.str.mod);
        }
      } else if (actorEntity.type === EncumbranceActorType.VEHICLE) {
        //@ts-ignore
        // const capacityCargo = actorEntity.system.attributes.capacity.cargo;
        if (size === "tiny") {
          minimumBulk = 20;
          //@ts-ignore
          inventorySlot = 20;
        } else if (size === "sm") {
          minimumBulk = 60;
          //@ts-ignore
          inventorySlot = 60;
        } else if (size === "med") {
          minimumBulk = 180;
          //@ts-ignore
          inventorySlot = 180;
        } else if (size === "lg") {
          minimumBulk = 540;
          //@ts-ignore
          inventorySlot = 540;
        } else if (size === "huge") {
          minimumBulk = 1620;
          //@ts-ignore
          inventorySlot = 1620;
        } else if (size === "grg") {
          minimumBulk = 4860;
          //@ts-ignore
          inventorySlot = 4860;
        } else {
          minimumBulk = 180;
          //@ts-ignore
          inventorySlot = 180;
        }
      } else {
        // Like character by default
        if (size === "tiny") {
          minimumBulk = 5;
          //@ts-ignore
          inventorySlot =
            6 +
            (useStrValueInsteadStrModOnBulk
              ? //@ts-ignore
                actorEntity.system.abilities.str.value
              : //@ts-ignore
                actorEntity.system.abilities.str.mod);
        } else if (size === "sm") {
          minimumBulk = 10;
          //@ts-ignore
          inventorySlot =
            14 +
            (useStrValueInsteadStrModOnBulk
              ? //@ts-ignore
                actorEntity.system.abilities.str.value
              : //@ts-ignore
                actorEntity.system.abilities.str.mod);
        } else if (size === "med") {
          minimumBulk = 20;
          //@ts-ignore
          inventorySlot =
            18 +
            (useStrValueInsteadStrModOnBulk
              ? //@ts-ignore
                actorEntity.system.abilities.str.value
              : //@ts-ignore
                actorEntity.system.abilities.str.mod);
        } else if (size === "lg") {
          minimumBulk = 40;
          //@ts-ignore
          inventorySlot =
            22 +
            (useStrValueInsteadStrModOnBulk
              ? //@ts-ignore
                actorEntity.system.abilities.str.value
              : //@ts-ignore
                actorEntity.system.abilities.str.mod * 2);
        } else if (size === "huge") {
          minimumBulk = 80;
          //@ts-ignore
          inventorySlot =
            30 +
            (useStrValueInsteadStrModOnBulk
              ? //@ts-ignore
                actorEntity.system.abilities.str.value
              : //@ts-ignore
                actorEntity.system.abilities.str.mod * 4);
        } else if (size === "grg") {
          minimumBulk = 160;
          //@ts-ignore
          inventorySlot =
            46 +
            (useStrValueInsteadStrModOnBulk
              ? //@ts-ignore
                actorEntity.system.abilities.str.value
              : //@ts-ignore
                actorEntity.system.abilities.str.mod * 8);
        } else {
          minimumBulk = 20;
          //@ts-ignore
          inventorySlot =
            18 +
            (useStrValueInsteadStrModOnBulk
              ? //@ts-ignore
                actorEntity.system.abilities.str.value
              : //@ts-ignore
                actorEntity.system.abilities.str.mod);
        }
      }

      if (inventorySlot < minimumBulk) {
        inventorySlot = minimumBulk;
      }

      let modForSize = 1; //actorEntity.system.abilities.str.value;
      if (game.settings.get(CONSTANTS.MODULE_NAME, "sizeMultipliers")) {
        //@ts-ignore
        const size = actorEntity.system.traits.size;
        if (size === "tiny") {
          modForSize *= 0.5;
        } else if (size === "sm") {
          modForSize *= 1;
        } else if (size === "med") {
          modForSize *= 1;
        } else if (size === "lg") {
          modForSize *= 2;
        } else if (size === "huge") {
          modForSize *= 4;
        } else if (size === "grg") {
          modForSize *= 8;
        } else {
          modForSize *= 1;
        }
        // Powerful build support
        //@ts-ignore
        if (actorEntity.flags?.dnd5e?.powerfulBuild) {
          //jshint ignore:line
          // mod *= 2;
          modForSize = Math.min(modForSize * 2, 8);
        }
      }

      let strengthMultiplier = 1;
      if (game.settings.get(CONSTANTS.MODULE_NAME, "useStrengthMultiplier")) {
        strengthMultiplier = game.settings.get("dnd5e", "metricWeightUnits")
          ? game.settings.get(CONSTANTS.MODULE_NAME, "fakeMetricSystem")
            ? game.settings.get(CONSTANTS.MODULE_NAME, "strengthMultiplier")
            : game.settings.get(CONSTANTS.MODULE_NAME, "strengthMultiplierMetric")
          : game.settings.get(CONSTANTS.MODULE_NAME, "strengthMultiplier");
      }
      const displayedUnits = game.settings.get(CONSTANTS.MODULE_NAME, "unitsBulk");
      const lightMax = 0;
      const mediumMax = inventorySlot * 0.5; // This is a fixed value to half of the inventory
      const heavyMax = inventorySlot;

      let encumbranceTier = ENCUMBRANCE_TIERS.NONE;

      let max = 0;
      let pct = 0;
      const totalWeightOriginal = totalWeight;

      if (actorEntity.type === EncumbranceActorType.CHARACTER) {
        // ==================
        // CHARACTER
        // ==================
        // const max = (actorEntity.system.abilities.str.value * strengthMultiplier * modForSize).toNearest(0.1);
        //@ts-ignore
        max = actorEntity.system.abilities.str.value * strengthMultiplier * modForSize;
        const daeValueAttributeEncumbranceMax =
          daeActive && game.settings.get(CONSTANTS.MODULE_NAME, "enableDAEIntegration")
            ? retrieveAttributeEncumbranceMax(actorEntity, max)
            : 0;
        if (daeValueAttributeEncumbranceMax && daeValueAttributeEncumbranceMax > 0) {
          max = daeValueAttributeEncumbranceMax;
        }
        pct = Math.clamped((totalWeight * 100) / max, 0, 100);
      } else if (actorEntity.type === EncumbranceActorType.VEHICLE) {
        // ===============================
        // VEHICLE
        // ===============================
        //@ts-ignore
        const capacityCargo = actorEntity.system.attributes.capacity.cargo;
        // Compute overall encumbrance
        // const max = actorData.system.attributes.capacity.cargo;
        max = capacityCargo * strengthMultiplier * modForSize;
        const daeValueAttributeCapacityCargo =
          daeActive && game.settings.get(CONSTANTS.MODULE_NAME, "enableDAEIntegration")
            ? retrieveAttributeCapacityCargo(actorEntity, max)
            : 0;
        if (daeValueAttributeCapacityCargo && daeValueAttributeCapacityCargo > 0) {
          max = daeValueAttributeCapacityCargo;
        }
        pct = Math.clamped((totalWeightOriginal * 100) / max, 0, 100);
      } else {
        // ===========================
        // NO CHARACTER, NO VEHICLE (BY DEFAULT THE CHARACTER)
        // ===========================
        // const max = (actorEntity.system.abilities.str.value * strengthMultiplier * modForSize).toNearest(0.1);
        //@ts-ignore
        max = actorEntity.system.abilities.str.value * strengthMultiplier * modForSize;
        const daeValueAttributeEncumbranceMax =
          daeActive && game.settings.get(CONSTANTS.MODULE_NAME, "enableDAEIntegration")
            ? retrieveAttributeEncumbranceMax(actorEntity, max)
            : 0;
        if (daeValueAttributeEncumbranceMax && daeValueAttributeEncumbranceMax > 0) {
          max = daeValueAttributeEncumbranceMax;
        }
        pct = Math.clamped((totalWeight * 100) / max, 0, 100);
      }

      if (totalWeight > mediumMax) {
        encumbranceTier = ENCUMBRANCE_TIERS.HEAVY;
      }
      if (totalWeight > heavyMax) {
        encumbranceTier = ENCUMBRANCE_TIERS.MAX;
      }

      //@ts-ignore
      const dataEncumbrance = {
        value: totalWeightOriginal.toNearest(0.1),
        max: max.toNearest(0.1),
        pct: pct,
        encumbered: encumbranceTier !== ENCUMBRANCE_TIERS.NONE,
      };

      const encumbranceData = {
        totalWeight: totalWeightOriginal.toNearest(0.1),
        totalWeightToDisplay: totalWeight.toNearest(0.1),
        lightMax: lightMax.toNearest(0.1),
        mediumMax: mediumMax.toNearest(0.1),
        heavyMax: heavyMax.toNearest(0.1),
        encumbranceTier: encumbranceTier,
        speedDecrease: 0,
        unit: displayedUnits,
        inventorySlot: inventorySlot,
        minimumBulk: minimumBulk,
        encumbrance: dataEncumbrance,
        mapItemEncumbrance: mapItemEncumbrance,
      };
      debug(JSON.stringify(encumbranceData));
      return encumbranceData;
    } else {
      throw new Error("Something is wrong");
    }
  },

  /**
   * Adds dynamic effects for specific effects
   *
   * @param {Effect} effect - the effect to handle
   * @param {Actor5e} actor - the effected actor
   */
  addDynamicEffects: async function (effectName, actor, speedDecrease) {
    // const invMidiQol = game.modules.get(CONSTANTS.MIDI_QOL_MODULE_NAME)?.active;
    switch (effectName.toLowerCase()) {
      case ENCUMBRANCE_STATE.ENCUMBERED.toLowerCase():
      case ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED.toLowerCase(): {
        let effect;
        if (invMidiQol) {
          effect = VariantEncumbranceBulkImpl._bulkHeavilyEncumbered();
        } else {
          effect = VariantEncumbranceBulkImpl._bulkHeavilyEncumberedNoMidi();
        }
        const speedDecreased =
          speedDecrease > 0 ? speedDecrease : game.settings.get(CONSTANTS.MODULE_NAME, "heavyWeightDecreaseBulk");
        VariantEncumbranceBulkImpl._addEncumbranceEffects(effect, actor, speedDecreased);
        return effect;
      }
      case ENCUMBRANCE_STATE.UNENCUMBERED.toLowerCase(): {
        return null;
      }
      case ENCUMBRANCE_STATE.OVERBURDENED.toLowerCase(): {
        let effect;
        if (invMidiQol) {
          effect = VariantEncumbranceBulkImpl._bulkOverburdenedEncumbered();
        } else {
          effect = VariantEncumbranceBulkImpl._bulkOverburdenedEncumberedNoMidi();
        }
        VariantEncumbranceBulkImpl._addEncumbranceEffectsOverburdened(effect);
        return effect;
      }
      default: {
        throw new Error("The effect name '" + effectName + "' is not recognized");
      }
    }
  },

  _bulkHeavilyEncumbered: function () {
    return new Effect({
      name: ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED,
      description: i18n("variant-encumbrance-dnd5e.effect.description.heavily_encumbered"),
      icon: "icons/svg/downgrade.svg",
      isDynamic: true,
      transfer: true,
      changes: [
        {
          key: "flags.midi-qol.disadvantage.attack.str",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "1",
        },
        {
          key: "flags.midi-qol.disadvantage.attack.dex",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "1",
        },
        {
          key: "flags.midi-qol.disadvantage.attack.con",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "1",
        },
        {
          key: "flags.midi-qol.disadvantage.ability.check.str",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "1",
        },
        {
          key: "flags.midi-qol.disadvantage.ability.check.dex",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "1",
        },
        {
          key: "flags.midi-qol.disadvantage.ability.check.con",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "1",
        },
        {
          key: "flags.midi-qol.disadvantage.ability.save.str",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "1",
        },
        {
          key: "flags.midi-qol.disadvantage.ability.save.dex",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "1",
        },
        {
          key: "flags.midi-qol.disadvantage.ability.save.con",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "1",
        },
      ],
    });
  },

  _bulkHeavilyEncumberedNoMidi: function () {
    return new Effect({
      name: ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED,
      description: i18n("variant-encumbrance-dnd5e.effect.description.heavily_encumbered"),
      icon: "icons/svg/downgrade.svg",
      isDynamic: true,
      transfer: true,
      changes: [],
    });
  },

  _bulkOverburdenedEncumbered: function () {
    return new Effect({
      name: ENCUMBRANCE_STATE.OVERBURDENED,
      description: i18n("variant-encumbrance-dnd5e.effect.description.overburdened"),
      // icon: 'icons/svg/hazard.svg',
      icon: "icons/tools/smithing/anvil.webp",
      isDynamic: true,
      transfer: true,
      changes: [
        {
          key: "flags.midi-qol.disadvantage.attack.str",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "1",
        },
        {
          key: "flags.midi-qol.disadvantage.attack.dex",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "1",
        },
        {
          key: "flags.midi-qol.disadvantage.attack.con",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "1",
        },
        {
          key: "flags.midi-qol.disadvantage.ability.check.str",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "1",
        },
        {
          key: "flags.midi-qol.disadvantage.ability.check.dex",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "1",
        },
        {
          key: "flags.midi-qol.disadvantage.ability.check.con",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "1",
        },
        {
          key: "flags.midi-qol.disadvantage.ability.save.str",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "1",
        },
        {
          key: "flags.midi-qol.disadvantage.ability.save.dex",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "1",
        },
        {
          key: "flags.midi-qol.disadvantage.ability.save.con",
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: "1",
        },
      ],
    });
  },

  _bulkOverburdenedEncumberedNoMidi: function () {
    return new Effect({
      name: ENCUMBRANCE_STATE.OVERBURDENED,
      description: i18n("variant-encumbrance-dnd5e.effect.description.overburdened"),
      // icon: 'icons/svg/hazard.svg',
      icon: "icons/tools/smithing/anvil.webp",
      isDynamic: true,
      transfer: true,
      changes: [],
    });
  },

  _addEncumbranceEffects: function (effect, actor, value) {
    //@ts-ignore
    const movement = actor.system.attributes.movement;
    // if (!daeActive) {
    effect.changes.push({
      key: "system.attributes.movement.burrow",
      mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
      value: `${movement.burrow * value}`,
    });

    effect.changes.push({
      key: "system.attributes.movement.climb",
      mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
      value: `${movement.climb * value}`,
    });

    effect.changes.push({
      key: "system.attributes.movement.fly",
      mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
      value: `${movement.fly * value}`,
    });

    effect.changes.push({
      key: "system.attributes.movement.swim",
      mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
      value: `${movement.swim * value}`,
    });

    effect.changes.push({
      key: "system.attributes.movement.walk",
      mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
      value: `${movement.walk * value}`,
    });
    // THIS IS THE DAE SOLUTION
    // } else {
    //   effect.changes.push({
    //     key: 'system.attributes.movement.all',
    //     mode: CONST.ACTIVE_EFFECT_MODES.MULTIPLY,
    //     value: `${value * heavyWeightDecreaseBulk}`,
    //     priority: 5,
    //   });
    // }
  },

  _addEncumbranceEffectsOverburdened: function (effect) {
    // const movement = actor.system.attributes.movement;
    // if (!daeActive) {
    effect.changes.push({
      key: "system.attributes.movement.burrow",
      mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
      value: "0",
    });

    effect.changes.push({
      key: "system.attributes.movement.climb",
      mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
      value: "0",
    });

    effect.changes.push({
      key: "system.attributes.movement.fly",
      mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
      value: "0",
    });

    effect.changes.push({
      key: "system.attributes.movement.swim",
      mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
      value: "0",
    });

    effect.changes.push({
      key: "system.attributes.movement.walk",
      mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
      value: "0",
    });
    // THIS IS THE DAE SOLUTION
    // } else {
    //   effect.changes.push({
    //     key: 'system.attributes.movement.all',
    //     mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
    //     value: '0',
    //     priority: 5,
    //   });
    // }
  },

  /**
   * Checks to see if any of the current active effects applied to the actor
   * with the given UUID match the effect name and are a convenient effect
   *
   * @param {string} effectName - the name of the effect to check
   * @param {string} uuid - the uuid of the actor to see if the effect is
   * applied to
   * @returns {boolean} true if the effect is applied, false otherwise
   */
  async hasEffectApplied(effectName, actor) {
    return await actor?.effects?.some((e) => (e?.name == effectName || e?.label == effectName) && !e?.disabled);
  },

  /**
   * Checks to see if any of the current active effects applied to the actor
   * with the given UUID match the effect name and are a convenient effect
   *
   * @param {string} effectName - the name of the effect to check
   * @param {string} uuid - the uuid of the actor to see if the effect is
   * applied to
   * @returns {boolean} true if the effect is applied, false otherwise
   */
  async hasEffectAppliedFromId(effect, actor) {
    return await actor?.effects?.some((e) => e?.id == effect.id);
  },

  /**
   * Removes the effect with the provided name from an actor matching the
   * provided UUID
   *
   * @param {string} effectName - the name of the effect to remove
   * @param {string} uuid - the uuid of the actor to remove the effect from
   */
  async removeEffect(effectName, actor) {
    if (effectName) effectName = i18n(effectName);
    const actorEffects = actor?.effects || [];
    const effectToRemove = actorEffects.find((e) => e?.label === effectName || e?.name === effectName);
    if (!effectToRemove || !effectToRemove.id) return undefined;
    const activeEffectsRemoved = (await actor.deleteEmbeddedDocuments("ActiveEffect", [effectToRemove.id])) || [];
    return activeEffectsRemoved[0];
  },

  /**
   * Removes the effect with the provided name from an actor matching the
   * provided UUID
   *
   * @param {string} effectName - the name of the effect to remove
   * @param {string} uuid - the uuid of the actor to remove the effect from
   */
  async removeEffectFromId(effect, actor) {
    if (effect.id) {
      const effectToRemove = (actor?.effects || []).find((e) => e.id === effect.id);
      if (!effectToRemove || !effectToRemove.id) return undefined;
      const activeEffectsRemoved = (await actor.deleteEmbeddedDocuments("ActiveEffect", [effectToRemove.id])) || [];
      return activeEffectsRemoved[0];
    }
    return undefined;
  },

  /**
   * Adds the effect with the provided name to an actor matching the provided
   * UUID
   *
   * @param {string} effectName - the name of the effect to add
   * @param {string} uuid - the uuid of the actor to add the effect to
   */
  async addEffect(effectName, actor, origin, encumbranceTier) {
    let speedDecrease = 1;
    if (encumbranceTier === ENCUMBRANCE_TIERS.NONE) {
      speedDecrease = 1;
    } else if (encumbranceTier === ENCUMBRANCE_TIERS.LIGHT) {
      speedDecrease = game.settings.get(CONSTANTS.MODULE_NAME, "heavyWeightDecreaseBulk");
    } else if (encumbranceTier === ENCUMBRANCE_TIERS.HEAVY) {
      speedDecrease = game.settings.get(CONSTANTS.MODULE_NAME, "heavyWeightDecreaseBulk");
    } else if (encumbranceTier === ENCUMBRANCE_TIERS.MAX) {
      speedDecrease = null;
    }
    const effect = await VariantEncumbranceBulkImpl.addDynamicEffects(effectName, actor, speedDecrease);
    if (effect) {
      effect.flags = {
        "variant-encumbrance-dnd5e": {
          tier: encumbranceTier,
        },
      };
      effect.isTemporary = true;
      effectName = i18n(effectName);
      if (!origin) {
        origin = `Actor.${actor.id}`;
      }
      effect.origin = effect.origin ? effect.origin : origin;
      effect.overlay = false;
      if (await this.hasEffectApplied(effectName, actor)) {
        return undefined;
      }
      // Create the Convenient Effects flags
      let ceFlags = {};
      // if (!isNewerVersion(game.version, "10.999")) {
      //   ceFlags = {
      //     core: {
      //       statusId: `Convenient Effect: ${effectName}`,
      //     },
      //   };
      // }
      ceFlags[CONSTANTS.DFREDS_CONVENIENT_EFFECTS_MODULE_NAME] = {};
      ceFlags[CONSTANTS.DFREDS_CONVENIENT_EFFECTS_MODULE_NAME][CONSTANTS.DFREDS_CONVENIENT_EFFECTS.FLAGS.DESCRIPTION] =
        effect.description;
      ceFlags[CONSTANTS.DFREDS_CONVENIENT_EFFECTS_MODULE_NAME][
        CONSTANTS.DFREDS_CONVENIENT_EFFECTS.FLAGS.IS_CONVENIENT
      ] = true;
      ceFlags[CONSTANTS.DFREDS_CONVENIENT_EFFECTS_MODULE_NAME][CONSTANTS.DFREDS_CONVENIENT_EFFECTS.FLAGS.IS_DYNAMIC] =
        effect.isDynamic;
      ceFlags[CONSTANTS.DFREDS_CONVENIENT_EFFECTS_MODULE_NAME][CONSTANTS.DFREDS_CONVENIENT_EFFECTS.FLAGS.IS_VIEWABLE] =
        effect.isViewable;
      ceFlags[CONSTANTS.DFREDS_CONVENIENT_EFFECTS_MODULE_NAME][
        CONSTANTS.DFREDS_CONVENIENT_EFFECTS.FLAGS.NESTED_EFFECTS
      ] = effect.nestedEffects;
      ceFlags[CONSTANTS.DFREDS_CONVENIENT_EFFECTS_MODULE_NAME][CONSTANTS.DFREDS_CONVENIENT_EFFECTS.FLAGS.SUB_EFFECTS] =
        effect.subEffects;

      const changes = effect._handleIntegrations();
      const duration = {
        rounds: ~~(effect.rounds ?? effect.seconds / CONFIG.time.roundTime),
        seconds: ~~effect.seconds,
        startRound: game.combat?.round,
        startTime: game.time.worldTime,
        startTurn: game.combat?.turn,
        turns: ~~effect.turns,
      };
      // Create the ActiveEffect document
      // @league-of-foundry-developers is behind the curve here,
      // so we have to resort to some ts-ignores
      let activeEffectData = new CONFIG.ActiveEffect.documentClass({
        changes: changes, //changes
        disabled: false,
        duration: duration,
        flags: foundry.utils.mergeObject(ceFlags, effect.flags),
        icon: effect.icon, // icon
        // @ts-ignore
        name: effectName, // label
        origin: origin, // origin
        transfer: false,
        // @ts-ignore
        statuses: [`Convenient Effect: ${effectName}`],
      });
      // @ts-ignore
      const activeEffectsAdded = (await actor.createEmbeddedDocuments("ActiveEffect", [activeEffectData])) || [];
      // @ts-ignore
      return activeEffectsAdded[0];
    }
    return undefined;
  },
};

// ===========================
// Item Collection/Container SUPPORT
// ===========================

export function calcBulkItemCollection(
  item,
  useEquippedUnequippedItemCollectionFeature,
  doNotApplyWeightForEquippedArmor,
  ignoreCurrency,
  doNotIncreaseWeightByQuantityForNoAmmunition,
  { ignoreItems, ignoreTypes } = { ignoreItems: undefined, ignoreTypes: undefined }
) {
  const isEquipped =
    //@ts-ignore
    item.system?.equipped ? true : false;
  const isProficient =
    //@ts-ignore
    item.system?.proficient ? item.system?.proficient : false;

  // IF IS NOT A BACKPACK
  //@ts-ignore
  if (item.type !== "backpack" || !item.flags.itemcollection) {
    debug(`calcBulkItemCollection | Is not a 'backpack' and is not flagged as itemcollection`);
    let currentItemWeight = calcItemBulk(item, ignoreCurrency, doNotIncreaseWeightByQuantityForNoAmmunition);
    const itemArmorTypes = ["clothing", "light", "medium", "heavy", "natural"];
    //@ts-ignore
    if (isEquipped && doNotApplyWeightForEquippedArmor && itemArmorTypes.includes(item.system.armor?.type)) {
      debug(
        `calcBulkItemCollection | Is not a 'backpack' and is not flagged as itemcollection | Equipped = true, doNotApplyWeightForEquippedArmor = true, Armor Type = true (${item.system.armor?.type})`
      );
      const applyWeightMultiplierForEquippedArmorClothing =
        game.settings.get(CONSTANTS.MODULE_NAME, "applyWeightMultiplierForEquippedArmorClothing") || 0;
      const applyWeightMultiplierForEquippedArmorLight =
        game.settings.get(CONSTANTS.MODULE_NAME, "applyWeightMultiplierForEquippedArmorLight") || 0;
      const applyWeightMultiplierForEquippedArmorMedium =
        game.settings.get(CONSTANTS.MODULE_NAME, "applyWeightMultiplierForEquippedArmorMedium") || 0;
      const applyWeightMultiplierForEquippedArmorHeavy =
        game.settings.get(CONSTANTS.MODULE_NAME, "applyWeightMultiplierForEquippedArmorHeavy") || 0;
      const applyWeightMultiplierForEquippedArmorNatural =
        game.settings.get(CONSTANTS.MODULE_NAME, "applyWeightMultiplierForEquippedArmorNatural") || 0;
      //@ts-ignore
      if (item.system.armor?.type === "clothing") {
        debug(
          `calcBulkItemCollection | applyWeightMultiplierForEquippedArmorClothing with value ${applyWeightMultiplierForEquippedArmorClothing} : ${currentItemWeight} => ${
            currentItemWeight * applyWeightMultiplierForEquippedArmorClothing
          }`
        );
        currentItemWeight *= applyWeightMultiplierForEquippedArmorClothing;
      }
      //@ts-ignore
      else if (item.system.armor?.type === "light") {
        debug(
          `calcBulkItemCollection | applyWeightMultiplierForEquippedArmorLight  with value ${applyWeightMultiplierForEquippedArmorLight} :${currentItemWeight} => ${
            currentItemWeight * applyWeightMultiplierForEquippedArmorLight
          }`
        );
        currentItemWeight *= applyWeightMultiplierForEquippedArmorLight;
      }
      //@ts-ignore
      else if (item.system.armor?.type === "medium") {
        debug(
          `calcBulkItemCollection | applyWeightMultiplierForEquippedArmorMedium with value ${applyWeightMultiplierForEquippedArmorMedium} : ${currentItemWeight} => ${
            currentItemWeight * applyWeightMultiplierForEquippedArmorMedium
          }`
        );
        currentItemWeight *= applyWeightMultiplierForEquippedArmorMedium;
      }
      //@ts-ignore
      else if (item.system.armor?.type === "heavy") {
        debug(
          `calcBulkItemCollection | applyWeightMultiplierForEquippedArmorArmorHeavy with value ${applyWeightMultiplierForEquippedArmorHeavy} : ${currentItemWeight} => ${
            currentItemWeight * applyWeightMultiplierForEquippedArmorHeavy
          }`
        );
        currentItemWeight *= applyWeightMultiplierForEquippedArmorHeavy;
      }
      //@ts-ignore
      else if (item.system.armor?.type === "natural") {
        debug(
          `calcBulkItemCollection | applyWeightMultiplierForEquippedArmorNatural with value ${applyWeightMultiplierForEquippedArmorNatural} : ${currentItemWeight} => ${
            currentItemWeight * applyWeightMultiplierForEquippedArmorNatural
          }`
        );
        currentItemWeight *= applyWeightMultiplierForEquippedArmorNatural;
      }
      //@ts-ignore
      else {
        debug(
          `calcBulkItemCollection | doNotApplyWeightForEquippedArmor with value ${0} : ${currentItemWeight} => ${0}`
        );
        currentItemWeight *= 0;
      }
    } else if (isEquipped) {
      if (isProficient) {
        debug(
          `calcBulkItemCollection | Equipped = true, Proficient = true : ${currentItemWeight} => ${
            currentItemWeight * game.settings.get(CONSTANTS.MODULE_NAME, "profEquippedMultiplier")
          }`
        );
        currentItemWeight *= game.settings.get(CONSTANTS.MODULE_NAME, "profEquippedMultiplier");
      } else {
        debug(
          `calcBulkItemCollection | Equipped = true, Proficient = false : ${currentItemWeight} => ${
            currentItemWeight * game.settings.get(CONSTANTS.MODULE_NAME, "equippedMultiplier")
          }`
        );
        currentItemWeight *= game.settings.get(CONSTANTS.MODULE_NAME, "equippedMultiplier");
      }
    } else {
      debug(
        `calcBulkItemCollection | Equipped = false, Proficient = false : ${currentItemWeight} => ${
          currentItemWeight * game.settings.get(CONSTANTS.MODULE_NAME, "unequippedMultiplier")
        }`
      );
      currentItemWeight *= game.settings.get(CONSTANTS.MODULE_NAME, "unequippedMultiplier");
    }
    return currentItemWeight;
  }
  // IF IS A BACKPACK
  // MOD 4535992 Removed variant encumbrance take care of this

  // FVTT10
  // if (this.parent instanceof Actor && (!this.system.equipped && this.system.capacity.weightlessUnequipped)) return 0;
  // const weightless = getProperty(this, "system.capacity.weightless") ?? false;
  // if (weightless) return getProperty(this, "flags.itemcollection.bagWeight") || 0;

  // FVTT11
  // if (this.parent instanceof Actor && (!this.system.equipped && this.flags.itemcollection.weightlessUnequipped)) return 0;
  // const weightless = getProperty(this, "system.capacity.weightless") ?? false;
  // let itemWeight = getItemWeight(item) || 0;
  // if (weightless) return getProperty(this, "flags.itemcollection.bagWeight") ?? 0;

  let itemWeight = getItemBulk(item) || 0;
  //@ts-ignore
  if (useEquippedUnequippedItemCollectionFeature && !isEquipped && item.flags?.itemcollection?.weightlessUnequipped) {
    return 0;
  }
  // END MOD 4535992
  const weightless = getProperty(item, "system.capacity.weightless") ?? false;
  if (weightless) {
    itemWeight = getItemBulk(item) ?? 0;
  } else {
    itemWeight =
      calcItemBulk(item, ignoreCurrency, doNotIncreaseWeightByQuantityForNoAmmunition, { ignoreItems, ignoreTypes }) +
      (getItemBulk(item) ?? 0);
  }
  if (isEquipped) {
    if (isProficient) {
      itemWeight *= game.settings.get(CONSTANTS.MODULE_NAME, "profEquippedMultiplier");
    } else {
      const applyWeightMultiplierForEquippedContainer =
        item.type === "backpack"
          ? game.settings.get(CONSTANTS.MODULE_NAME, "applyWeightMultiplierForEquippedContainer") || -1
          : -1;
      if (applyWeightMultiplierForEquippedContainer > -1) {
        itemWeight *= applyWeightMultiplierForEquippedContainer;
      } else {
        itemWeight *= game.settings.get(CONSTANTS.MODULE_NAME, "equippedMultiplier");
      }
    }
  } else {
    itemWeight *= game.settings.get(CONSTANTS.MODULE_NAME, "unequippedMultiplier");
  }
  return itemWeight;
}

function calcItemBulk(
  item,
  ignoreCurrency,
  doNotIncreaseWeightByQuantityForNoAmmunition,
  { ignoreItems, ignoreTypes } = { ignoreItems: undefined, ignoreTypes: undefined }
) {
  //@ts-ignore
  if (item.type !== "backpack" || item.items === undefined) {
    debug(
      `calcItemBulk | Is not a backpack or has not items on it => ${_calcItemBulk(
        item,
        doNotIncreaseWeightByQuantityForNoAmmunition
      )}`
    );
    return _calcItemBulk(item, doNotIncreaseWeightByQuantityForNoAmmunition);
  }
  //@ts-ignore
  let weight = item.items.reduce((acc, item) => {
    if (ignoreTypes?.some((name) => item.name.includes(name))) return acc;
    if (ignoreItems?.includes(item.name)) return acc;
    return acc + getItemBulk(item) * getItemQuantity(item);
  }, (item.type === "backpack" ? 0 : _calcItemBulk(item, doNotIncreaseWeightByQuantityForNoAmmunition)) ?? 0);
  // [Optional] add Currency Weight (for non-transformed actors)
  if (
    !ignoreCurrency &&
    game.settings.get(CONSTANTS.MODULE_NAME, "enableCurrencyWeight") &&
    game.settings.get("dnd5e", "currencyWeight") &&
    //@ts-ignore
    item.system.currency
  ) {
    debug(`calcItemBulk | Check out currency = true => ${weight}`);
    //@ts-ignore
    const currency = item.system.currency ?? {};
    const numCoins = Object.values(currency).reduce((val, denom) => (val += Math.max(denom, 0)), 0);

    // const currencyPerWeight = game.settings.get("dnd5e", "metricWeightUnits")
    //   ? game.settings.get(CONSTANTS.MODULE_NAME, "fakeMetricSystem")
    //     ? game.settings.get(CONSTANTS.MODULE_NAME, "currencyWeight")
    //     : game.settings.get(CONSTANTS.MODULE_NAME, "currencyWeightMetric")
    //   : game.settings.get(CONSTANTS.MODULE_NAME, "currencyWeight");
    const currencyPerWeight = game.settings.get(CONSTANTS.MODULE_NAME, "currencyWeightBulk") ?? 100;
    if (currencyPerWeight == 0) {
      weight = weight + 0;
    } else {
      weight = weight + numCoins / currencyPerWeight;
    }
    weight = Math.round(weight * 100000) / 100000;
    debug(
      `calcItemBulk | Backpack : ${numCoins} / ${currencyPerWeight} = ${
        currencyPerWeight == 0 ? 0 : numCoins / currencyPerWeight
      } => ${weight}`
    );
  } else {
    debug(`calcItemBulk | Check out currency = false => ${weight}`);
    //@ts-ignore
    const currency = item.system.currency ?? {};
    const numCoins = currency ? Object.keys(currency).reduce((val, denom) => val + currency[denom], 0) : 0;
    weight = weight + numCoins / 100;
    weight = Math.round(weight * 100000) / 100000;
    debug(`calcItemBulk | Backpack : ${numCoins} / ${50} = ${numCoins / 50} => ${weight}`);
  }
  return weight;
}

function _calcItemBulk(item, doNotIncreaseWeightByQuantityForNoAmmunition) {
  let quantity = 1;
  // Feature: Do Not increase weight by quantity for no ammunition item
  if (doNotIncreaseWeightByQuantityForNoAmmunition) {
    if (item.system?.consumableType !== "ammo") {
      quantity = 1;
    } else {
      quantity = getItemQuantity(item);
    }
  } else {
    quantity = getItemQuantity(item);
  }
  const weight = getItemBulk(item);
  return Math.round(weight * quantity * 100000) / 100000;
}
