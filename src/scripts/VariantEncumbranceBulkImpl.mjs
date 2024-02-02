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
  isGMConnected,
  isRealNumber,
  retrieveAttributeEncumbranceMax,
  retrieveAttributeCapacityCargo,
  getItemQuantity,
  getItemBulk,
  retrieveBackPackManagerItem,
  calculateBackPackManagerBulk,
} from "./lib/lib.mjs";
import API from "./api.mjs";
import { VariantEncumbranceDnd5eHelpers } from "./lib/variant-encumbrance-dnd5e-helpers";
import Logger from "./lib/Logger";

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
    const inventoryItems = VariantEncumbranceDnd5eHelpers.prepareInventoryItemsFromUpdate(
      actorEntity,
      updatedItem,
      updatedEffect,
      mode
    );
    if (!inventoryItems || inventoryItems.length <= 0) {
      return;
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
    if (game.settings.get(CONSTANTS.MODULE_ID, "enablePreCheckEncumbranceTier")) {
      if (hasProperty(actorEntity, `flags.${CONSTANTS.MODULE_ID}.${EncumbranceFlags.DATA_BULK}`)) {
        const encumbranceDataCurrent = actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.DATA_BULK);
        if (encumbranceDataCurrent.encumbranceTier === encumbranceDataBulk.encumbranceTier) {
          //We ignore all the AE check
          await actorEntity.setFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.DATA_BULK, encumbranceDataBulk);
          return encumbranceDataBulk;
        }
      }
    }

    const enableVarianEncumbranceEffectsOnActorFlag = actorEntity.getFlag(
      CONSTANTS.MODULE_ID,
      EncumbranceFlags.ENABLED_AE_BULK
    );
    if (enableVarianEncumbranceEffectsOnActorFlag) {
      await VariantEncumbranceBulkImpl.manageActiveEffect(actorEntity, encumbranceDataBulk.encumbranceTier);
    }
    await actorEntity.setFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.DATA_BULK, encumbranceDataBulk);

    return encumbranceDataBulk;
  },

  manageActiveEffect: async function (actorEntity, encumbranceTier) {
    let effectEntityPresent;

    for (const effectEntity of actorEntity.effects) {
      const effectNameToSet = effectEntity.label;

      //const effectIsApplied = await VariantEncumbranceDnd5eHelpers.hasEffectAppliedFromId(effectEntity, actorEntity);

      // Remove AE with empty a label but with flag of variant encumbrance ???
      if (!effectNameToSet && hasProperty(effectEntity, `flags.${CONSTANTS.MODULE_ID}`)) {
        await VariantEncumbranceDnd5eHelpers.removeEffectFromId(effectEntity, actorEntity);
        continue;
      }

      if (!effectNameToSet) {
        continue;
      }

      // Remove all encumbrance effect renamed from the player
      if (
        // encumbranceData.encumbranceTier &&

        effectEntity.flags &&
        hasProperty(effectEntity, `flags.${CONSTANTS.MODULE_ID}`) &&
        effectNameToSet !== ENCUMBRANCE_STATE.UNENCUMBERED &&
        effectNameToSet !== ENCUMBRANCE_STATE.ENCUMBERED &&
        effectNameToSet !== ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED &&
        effectNameToSet !== ENCUMBRANCE_STATE.OVERBURDENED
      ) {
        await VariantEncumbranceDnd5eHelpers.removeEffectFromId(effectEntity, actorEntity);
        continue;
      }

      // Remove Old settings

      if (effectEntity.flags && hasProperty(effectEntity, `flags.VariantEncumbrance`)) {
        await VariantEncumbranceDnd5eHelpers.removeEffectFromId(effectEntity, actorEntity);
        continue;
      }

      // Ignore all non encumbrance effect renamed from the player (again)
      if (
        !hasProperty(effectEntity, `flags.${CONSTANTS.MODULE_ID}`) &&
        effectNameToSet !== ENCUMBRANCE_STATE.UNENCUMBERED &&
        effectNameToSet !== ENCUMBRANCE_STATE.ENCUMBERED &&
        effectNameToSet !== ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED &&
        effectNameToSet !== ENCUMBRANCE_STATE.OVERBURDENED
      ) {
        continue;
      }

      // Remove encumbrance effect with same name used in this module
      if (
        !hasProperty(effectEntity, `flags.${CONSTANTS.MODULE_ID}`) &&
        (effectNameToSet === ENCUMBRANCE_STATE.UNENCUMBERED ||
          effectNameToSet === ENCUMBRANCE_STATE.ENCUMBERED ||
          effectNameToSet === ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED ||
          effectNameToSet === ENCUMBRANCE_STATE.OVERBURDENED)
      ) {
        await VariantEncumbranceDnd5eHelpers.removeEffectFromId(effectEntity, actorEntity);
        continue;
      }

      if (
        hasProperty(effectEntity, `flags.${CONSTANTS.MODULE_ID}`) &&
        (effectNameToSet === ENCUMBRANCE_STATE.UNENCUMBERED ||
          effectNameToSet === ENCUMBRANCE_STATE.ENCUMBERED ||
          effectNameToSet === ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED ||
          effectNameToSet === ENCUMBRANCE_STATE.OVERBURDENED)
      ) {
        if (!effectEntityPresent) {
          effectEntityPresent = effectEntity;
        } else {
          await VariantEncumbranceDnd5eHelpers.removeEffectFromId(effectEntityPresent, actorEntity);
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

    if (!game.settings.get(CONSTANTS.MODULE_ID, "useVariantEncumbrance")) {
      effectName = ENCUMBRANCE_STATE.UNENCUMBERED;
    }

    if (effectName && effectName !== "") {
      if (effectName === effectEntityPresent?.label) {
        // Skip if name is the same and the active effect is already present.
      } else {
        if (effectName === ENCUMBRANCE_STATE.UNENCUMBERED) {
          if (effectEntityPresent?.id) {
            const effectIsApplied1 = await VariantEncumbranceDnd5eHelpers.hasEffectAppliedFromId(
              effectEntityPresent,
              actorEntity
            );
            if (effectIsApplied1) {
              await VariantEncumbranceDnd5eHelpers.removeEffectFromId(effectEntityPresent, actorEntity);
            }
          }
        } else {
          if (effectEntityPresent?.id) {
            const effectIsApplied2 = await VariantEncumbranceDnd5eHelpers.hasEffectAppliedFromId(
              effectEntityPresent,
              actorEntity
            );
            if (effectIsApplied2) {
              await VariantEncumbranceDnd5eHelpers.removeEffectFromId(effectEntityPresent, actorEntity);
            }
          }
          const effectIsApplied3 = await VariantEncumbranceDnd5eHelpers.hasEffectApplied(effectName, actorEntity);
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
      CONSTANTS.MODULE_ID,
      EncumbranceFlags.ENABLED_WE_BULK
    );
    const useStandardWeightCalculation = game.settings.get(CONSTANTS.MODULE_ID, "useStandardWeightCalculation");
    const doNotIncreaseWeightByQuantityForNoAmmunition = game.settings.get(
      CONSTANTS.MODULE_ID,
      "doNotIncreaseWeightByQuantityForNoAmmunition"
    );
    //const doNotApplyWeightForEquippedArmor = game.settings.get(CONSTANTS.MODULE_ID, "doNotApplyWeightForEquippedArmor");
    const applyWeightMultiplierForEquippedArmor = game.settings.get(
      CONSTANTS.MODULE_ID,
      "applyWeightMultiplierForEquippedArmor"
    );
    const doNotApplyWeightForEquippedArmor = String(applyWeightMultiplierForEquippedArmor) === "0";

    const useStrValueInsteadStrModOnBulk = game.settings.get(CONSTANTS.MODULE_ID, "useStrValueInsteadStrModOnBulk");
    const useEquippedUnequippedItemCollectionFeature = game.settings.get(
      CONSTANTS.MODULE_ID,
      "useEquippedUnequippedItemCollectionFeature"
    );
    if (!enableVarianEncumbranceWeightBulkOnActorFlag) {
      return actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.DATA_BULK) || {};
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

        const isEquipped = item.system.equipped ? true : false;
        const isProficient = item.system.proficient ? item.system.proficient : false;

        let backpackManager = retrieveBackPackManagerItem(item);
        if (backpackManager) {
          // Does the weight of the items in the container carry over to the actor?
          const weightless = getProperty(item, "system.capacity.weightless") ?? false;
          // const backpackManagerWeight =
          // 	API.calculateBulkOnActor(backpackManager)?.totalWeight ?? itemWeight;
          const backpackManagerWeight = calculateBackPackManagerBulk(item, backpackManager, ignoreCurrency);
          itemWeight = weightless ? itemWeight : itemWeight + backpackManagerWeight;

          itemWeight = VariantEncumbranceDnd5eHelpers.manageCustomCodeFeature(item, itemWeight, true);
          itemWeight = VariantEncumbranceDnd5eHelpers.manageEquippedAndUnEquippedFeature(item, itemWeight);

          Logger.debug(
            `Is BackpackManager! Actor '${actorEntity.name}', Item '${item.name}' : Quantity = ${itemQuantity}, Weight = ${itemWeight}`
          );
          mapItemEncumbrance[item.id] = itemQuantity * itemWeight;
          if (getProperty(item, `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.ITEM.bulk}`) !== itemWeight) {
            // NOTE IS ASYNC
            item.setFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.ITEM.bulk, itemWeight);
          }
          return weight + itemQuantity * itemWeight;
        }

        Logger.debug(
          `Actor '${actorEntity.name}', Item '${item.name}' : Quantity = ${itemQuantity}, Weight = ${itemWeight}`
        );

        // let ignoreEquipmentCheck = false;

        // External modules calculation
        let ignoreQuantityCheckForItemCollection = false;
        // Start Item container check
        if (hasProperty(item, `flags.itemcollection`) && itemContainerActive) {
          itemWeight = calcBulkItemCollection(
            item,
            useEquippedUnequippedItemCollectionFeature,
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

          itemWeight = VariantEncumbranceDnd5eHelpers.manageCustomCodeFeature(item, itemWeight, true);
          itemWeight = VariantEncumbranceDnd5eHelpers.manageEquippedAndUnEquippedFeature(item, itemWeight);

          // Feature: Do Not increase weight by quantity for no ammunition item
          if (doNotIncreaseWeightByQuantityForNoAmmunition) {
            if (item.system?.consumableType !== "ammo") {
              itemQuantity = 1;
            }
          }
        }
        // Start inventory+ module is active
        if (invPlusActiveTmp) {
          // Retrieve flag 'categorys' from inventory plus module
          const inventoryPlusCategories = actorEntity.getFlag(CONSTANTS.INVENTORY_PLUS_MODULE_ID, "categorys");
          if (inventoryPlusCategories) {
            // "weapon", "equipment", "consumable", "tool", "backpack", "loot"
            let actorHasCustomCategories = false;
            for (const categoryId in inventoryPlusCategories) {
              const section = inventoryPlusCategories[categoryId];
              if (
                // This is a error from the inventory plus developer flags stay on 'item' not on the 'item'

                item.flags &&
                item.flags[CONSTANTS.INVENTORY_PLUS_MODULE_ID]?.category === categoryId
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
          Logger.debug(
            `Actor '${actorEntity.name}', Item '${item.name}', Equipped '${isEquipped}', Proficient ${isProficient} :
               1 * ${itemWeight} = ${appliedWeight} on total ${weight} => ${weight + appliedWeight}`
          );
        } else {
          appliedWeight = itemQuantity * itemWeight;
          Logger.debug(
            `Actor '${actorEntity.name}', Item '${item.name}', Equipped '${isEquipped}', Proficient ${isProficient} :
               ${itemQuantity} * ${itemWeight} = ${appliedWeight} on total ${weight} => ${weight + appliedWeight}`
          );
        }

        mapItemEncumbrance[item.id] = appliedWeight;
        if (getProperty(item, `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.ITEM.bulk}`) !== itemWeight) {
          // NOTE IS ASYNC
          item.setFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.ITEM.bulk, itemWeight);
        }
        return weight + appliedWeight;
      }, 0);

      // Start inventory+ module is active 2
      if (invPlusActiveTmp) {
        for (const [key, value] of invPlusCategoriesWeightToAdd) {
          Logger.debug(`Actor '${actorEntity.name}', Category '${key}' : ${value} => ${totalWeight + value}`);
          totalWeight = totalWeight + value;
        }
      }
      // End inventory+ module is active 2
      // END TOTAL WEIGHT

      // [Optional] add Currency Weight (for non-transformed actors)
      if (
        !ignoreCurrency &&
        game.settings.get(CONSTANTS.MODULE_ID, "enableCurrencyWeight") &&
        game.settings.get("dnd5e", "currencyWeight") &&
        actorEntity.system.currency
      ) {
        const currency = actorEntity.system.currency;
        const numCoins = Object.values(currency).reduce((val, denom) => (val += Math.max(denom, 0)), 0);

        // const currencyPerWeight = game.settings.get('dnd5e', 'metricWeightUnits')
        // ? game.settings.get(CONSTANTS.MODULE_ID, 'fakeMetricSystem')
        // 	? game.settings.get(CONSTANTS.MODULE_ID, 'currencyWeight')
        // 	: game.settings.get(CONSTANTS.MODULE_ID, 'currencyWeightMetric')
        // : game.settings.get(CONSTANTS.MODULE_ID, 'currencyWeight');
        const currencyPerWeight = game.settings.get(CONSTANTS.MODULE_ID, "currencyWeightBulk") ?? 100;
        if (currencyPerWeight == 0) {
          totalWeight += 0;
        } else {
          totalWeight += numCoins / currencyPerWeight;
        }
        Logger.debug(
          `Actor '${actorEntity.name}' : ${numCoins} / ${currencyPerWeight} = ${
            currencyPerWeight == 0 ? 0 : numCoins / currencyPerWeight
          } => ${totalWeight}`
        );
      }

      // Compute Encumbrance percentage
      totalWeight = totalWeight.toNearest(0.1);
      Logger.debug(`Actor '${actorEntity.name}' => ${totalWeight}`);

      let minimumBulk = 0;
      let inventorySlot = 0;

      const sizeOri = actorEntity.system.traits.size;
      let size = sizeOri;
      // Manage pworful build for bulk inveotry slot

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

          inventorySlot =
            6 +
            (useStrValueInsteadStrModOnBulk
              ? actorEntity.system.abilities.str.value
              : actorEntity.system.abilities.str.mod);
        } else if (size === "sm") {
          minimumBulk = 10;

          inventorySlot =
            14 +
            (useStrValueInsteadStrModOnBulk
              ? actorEntity.system.abilities.str.value
              : actorEntity.system.abilities.str.mod);
        } else if (size === "med") {
          minimumBulk = 20;

          inventorySlot =
            18 +
            (useStrValueInsteadStrModOnBulk
              ? actorEntity.system.abilities.str.value
              : actorEntity.system.abilities.str.mod);
        } else if (size === "lg") {
          minimumBulk = 40;

          inventorySlot =
            22 +
            (useStrValueInsteadStrModOnBulk
              ? actorEntity.system.abilities.str.value
              : actorEntity.system.abilities.str.mod * 2);
        } else if (size === "huge") {
          minimumBulk = 80;

          inventorySlot =
            30 +
            (useStrValueInsteadStrModOnBulk
              ? actorEntity.system.abilities.str.value
              : actorEntity.system.abilities.str.mod * 4);
        } else if (size === "grg") {
          minimumBulk = 160;

          inventorySlot =
            46 +
            (useStrValueInsteadStrModOnBulk
              ? actorEntity.system.abilities.str.value
              : actorEntity.system.abilities.str.mod * 8);
        } else {
          minimumBulk = 20;

          inventorySlot =
            18 +
            (useStrValueInsteadStrModOnBulk
              ? actorEntity.system.abilities.str.value
              : actorEntity.system.abilities.str.mod);
        }
      } else if (actorEntity.type === EncumbranceActorType.VEHICLE) {
        // const capacityCargo = actorEntity.system.attributes.capacity.cargo;
        if (size === "tiny") {
          minimumBulk = 20;

          inventorySlot = 20;
        } else if (size === "sm") {
          minimumBulk = 60;

          inventorySlot = 60;
        } else if (size === "med") {
          minimumBulk = 180;

          inventorySlot = 180;
        } else if (size === "lg") {
          minimumBulk = 540;

          inventorySlot = 540;
        } else if (size === "huge") {
          minimumBulk = 1620;

          inventorySlot = 1620;
        } else if (size === "grg") {
          minimumBulk = 4860;

          inventorySlot = 4860;
        } else {
          minimumBulk = 180;

          inventorySlot = 180;
        }
      } else {
        // Like character by default
        if (size === "tiny") {
          minimumBulk = 5;

          inventorySlot =
            6 +
            (useStrValueInsteadStrModOnBulk
              ? actorEntity.system.abilities.str.value
              : actorEntity.system.abilities.str.mod);
        } else if (size === "sm") {
          minimumBulk = 10;

          inventorySlot =
            14 +
            (useStrValueInsteadStrModOnBulk
              ? actorEntity.system.abilities.str.value
              : actorEntity.system.abilities.str.mod);
        } else if (size === "med") {
          minimumBulk = 20;

          inventorySlot =
            18 +
            (useStrValueInsteadStrModOnBulk
              ? actorEntity.system.abilities.str.value
              : actorEntity.system.abilities.str.mod);
        } else if (size === "lg") {
          minimumBulk = 40;

          inventorySlot =
            22 +
            (useStrValueInsteadStrModOnBulk
              ? actorEntity.system.abilities.str.value
              : actorEntity.system.abilities.str.mod * 2);
        } else if (size === "huge") {
          minimumBulk = 80;

          inventorySlot =
            30 +
            (useStrValueInsteadStrModOnBulk
              ? actorEntity.system.abilities.str.value
              : actorEntity.system.abilities.str.mod * 4);
        } else if (size === "grg") {
          minimumBulk = 160;

          inventorySlot =
            46 +
            (useStrValueInsteadStrModOnBulk
              ? actorEntity.system.abilities.str.value
              : actorEntity.system.abilities.str.mod * 8);
        } else {
          minimumBulk = 20;

          inventorySlot =
            18 +
            (useStrValueInsteadStrModOnBulk
              ? actorEntity.system.abilities.str.value
              : actorEntity.system.abilities.str.mod);
        }
      }

      if (inventorySlot < minimumBulk) {
        inventorySlot = minimumBulk;
      }

      let modForSize = 1; //actorEntity.system.abilities.str.value;
      if (game.settings.get(CONSTANTS.MODULE_ID, "sizeMultipliers")) {
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

        if (actorEntity.flags?.dnd5e?.powerfulBuild) {
          //jshint ignore:line
          // mod *= 2;
          modForSize = Math.min(modForSize * 2, 8);
        }
      }

      let strengthMultiplier = 1;
      if (game.settings.get(CONSTANTS.MODULE_ID, "useStrengthMultiplier")) {
        strengthMultiplier = game.settings.get("dnd5e", "metricWeightUnits")
          ? game.settings.get(CONSTANTS.MODULE_ID, "fakeMetricSystem")
            ? game.settings.get(CONSTANTS.MODULE_ID, "strengthMultiplier")
            : game.settings.get(CONSTANTS.MODULE_ID, "strengthMultiplierMetric")
          : game.settings.get(CONSTANTS.MODULE_ID, "strengthMultiplier");
      }
      const displayedUnits = game.settings.get(CONSTANTS.MODULE_ID, "unitsBulk");
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

        max = actorEntity.system.abilities.str.value * strengthMultiplier * modForSize;
        const daeValueAttributeEncumbranceMax =
          daeActive && game.settings.get(CONSTANTS.MODULE_ID, "enableDAEIntegration")
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

        const capacityCargo = actorEntity.system.attributes.capacity.cargo;
        // Compute overall encumbrance
        // const max = actorData.system.attributes.capacity.cargo;
        max = capacityCargo * strengthMultiplier * modForSize;
        const daeValueAttributeCapacityCargo =
          daeActive && game.settings.get(CONSTANTS.MODULE_ID, "enableDAEIntegration")
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

        max = actorEntity.system.abilities.str.value * strengthMultiplier * modForSize;
        const daeValueAttributeEncumbranceMax =
          daeActive && game.settings.get(CONSTANTS.MODULE_ID, "enableDAEIntegration")
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
      Logger.debug(JSON.stringify(encumbranceData));
      return encumbranceData;
    } else {
      throw new Logger.error("Something is wrong");
    }
  },

  /**
   * Adds dynamic effects for specific effects
   *
   * @param {Effect} effect - the effect to handle
   * @param {Actor5e} actor - the effected actor
   */
  addDynamicEffects: async function (effectName, actor, speedDecrease) {
    // const invMidiQol = game.modules.get(CONSTANTS.MIDI_QOL_MODULE_ID)?.active;
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
          speedDecrease > 0 ? speedDecrease : game.settings.get(CONSTANTS.MODULE_ID, "heavyWeightDecreaseBulk");
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
        throw new Logger.error("The effect name '" + effectName + "' is not recognized");
      }
    }
  },

  _bulkHeavilyEncumbered: function () {
    return new Effect({
      name: ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED,
      description: Logger.i18n("variant-encumbrance-dnd5e.effect.description.heavily_encumbered"),
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
      description: Logger.i18n("variant-encumbrance-dnd5e.effect.description.heavily_encumbered"),
      icon: "icons/svg/downgrade.svg",
      isDynamic: true,
      transfer: true,
      changes: [],
    });
  },

  _bulkOverburdenedEncumbered: function () {
    return new Effect({
      name: ENCUMBRANCE_STATE.OVERBURDENED,
      description: Logger.i18n("variant-encumbrance-dnd5e.effect.description.overburdened"),
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
      description: Logger.i18n("variant-encumbrance-dnd5e.effect.description.overburdened"),
      // icon: 'icons/svg/hazard.svg',
      icon: "icons/tools/smithing/anvil.webp",
      isDynamic: true,
      transfer: true,
      changes: [],
    });
  },

  _addEncumbranceEffects: function (effect, actor, value) {
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
      speedDecrease = game.settings.get(CONSTANTS.MODULE_ID, "heavyWeightDecreaseBulk");
    } else if (encumbranceTier === ENCUMBRANCE_TIERS.HEAVY) {
      speedDecrease = game.settings.get(CONSTANTS.MODULE_ID, "heavyWeightDecreaseBulk");
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
      effectName = Logger.i18n(effectName);
      if (!origin) {
        origin = `Actor.${actor.id}`;
      }
      effect.origin = effect.origin ? effect.origin : origin;
      effect.overlay = false;
      if (await VariantEncumbranceDnd5eHelpers.hasEffectApplied(effectName, actor)) {
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
      ceFlags[CONSTANTS.DFREDS_CONVENIENT_EFFECTS_MODULE_ID] = {};
      ceFlags[CONSTANTS.DFREDS_CONVENIENT_EFFECTS_MODULE_ID][CONSTANTS.DFREDS_CONVENIENT_EFFECTS.FLAGS.DESCRIPTION] =
        effect.description;
      ceFlags[CONSTANTS.DFREDS_CONVENIENT_EFFECTS_MODULE_ID][
        CONSTANTS.DFREDS_CONVENIENT_EFFECTS.FLAGS.IS_CONVENIENT
      ] = true;
      ceFlags[CONSTANTS.DFREDS_CONVENIENT_EFFECTS_MODULE_ID][CONSTANTS.DFREDS_CONVENIENT_EFFECTS.FLAGS.IS_DYNAMIC] =
        effect.isDynamic;
      ceFlags[CONSTANTS.DFREDS_CONVENIENT_EFFECTS_MODULE_ID][CONSTANTS.DFREDS_CONVENIENT_EFFECTS.FLAGS.IS_VIEWABLE] =
        effect.isViewable;
      ceFlags[CONSTANTS.DFREDS_CONVENIENT_EFFECTS_MODULE_ID][CONSTANTS.DFREDS_CONVENIENT_EFFECTS.FLAGS.NESTED_EFFECTS] =
        effect.nestedEffects;
      ceFlags[CONSTANTS.DFREDS_CONVENIENT_EFFECTS_MODULE_ID][CONSTANTS.DFREDS_CONVENIENT_EFFECTS.FLAGS.SUB_EFFECTS] =
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
        flags: foundry.utils.foundry.utils.mergeObject(ceFlags, effect.flags),
        icon: effect.icon, // icon

        name: effectName, // label
        origin: origin, // origin
        transfer: false,

        statuses: [`Convenient Effect: ${effectName}`],
      });

      const activeEffectsAdded = (await actor.createEmbeddedDocuments("ActiveEffect", [activeEffectData])) || [];

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
  ignoreCurrency,
  doNotIncreaseWeightByQuantityForNoAmmunition,
  { ignoreItems, ignoreTypes } = { ignoreItems: undefined, ignoreTypes: undefined }
) {
  const isEquipped = item.system?.equipped ? true : false;
  const isProficient = item.system?.proficient ? item.system?.proficient : false;
  // const doNotApplyWeightForEquippedArmor = game.settings.get(CONSTANTS.MODULE_ID, "doNotApplyWeightForEquippedArmor");
  const applyWeightMultiplierForEquippedArmor = game.settings.get(
    CONSTANTS.MODULE_ID,
    "applyWeightMultiplierForEquippedArmor"
  );

  // IF IS NOT A BACKPACK

  if (item.type !== "backpack" || !item.flags.itemcollection) {
    Logger.debug(`calcBulkItemCollection | Is not a 'backpack' and is not flagged as itemcollection`);
    let itemWeight = calcItemBulk(item, ignoreCurrency, doNotIncreaseWeightByQuantityForNoAmmunition);

    itemWeight = VariantEncumbranceDnd5eHelpers.manageCustomCodeFeature(item, itemWeight, true);
    itemWeight = VariantEncumbranceDnd5eHelpers.manageEquippedAndUnEquippedFeature(item, itemWeight);

    return itemWeight;
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

  itemWeight = VariantEncumbranceDnd5eHelpers.manageCustomCodeFeature(item, itemWeight, true);
  itemWeight = VariantEncumbranceDnd5eHelpers.manageEquippedAndUnEquippedFeature(item, itemWeight);

  return itemWeight;
}

function calcItemBulk(
  item,
  ignoreCurrency,
  doNotIncreaseWeightByQuantityForNoAmmunition,
  { ignoreItems, ignoreTypes } = { ignoreItems: undefined, ignoreTypes: undefined }
) {
  if (item.type !== "backpack" || item.items === undefined) {
    Logger.debug(
      `calcItemBulk | Is not a backpack or has not items on it => ${_calcItemBulk(
        item,
        doNotIncreaseWeightByQuantityForNoAmmunition
      )}`
    );
    return _calcItemBulk(item, doNotIncreaseWeightByQuantityForNoAmmunition);
  }

  let weight = item.items.reduce((acc, item) => {
    if (ignoreTypes?.some((name) => item.name.includes(name))) return acc;
    if (ignoreItems?.includes(item.name)) return acc;
    return acc + getItemBulk(item) * getItemQuantity(item);
  }, (item.type === "backpack" ? 0 : _calcItemBulk(item, doNotIncreaseWeightByQuantityForNoAmmunition)) ?? 0);
  // [Optional] add Currency Weight (for non-transformed actors)
  if (
    !ignoreCurrency &&
    game.settings.get(CONSTANTS.MODULE_ID, "enableCurrencyWeight") &&
    game.settings.get("dnd5e", "currencyWeight") &&
    item.system.currency
  ) {
    Logger.debug(`calcItemBulk | Check out currency = true => ${weight}`);

    const currency = item.system.currency ?? {};
    const numCoins = Object.values(currency).reduce((val, denom) => (val += Math.max(denom, 0)), 0);

    // const currencyPerWeight = game.settings.get("dnd5e", "metricWeightUnits")
    //   ? game.settings.get(CONSTANTS.MODULE_ID, "fakeMetricSystem")
    //     ? game.settings.get(CONSTANTS.MODULE_ID, "currencyWeight")
    //     : game.settings.get(CONSTANTS.MODULE_ID, "currencyWeightMetric")
    //   : game.settings.get(CONSTANTS.MODULE_ID, "currencyWeight");
    const currencyPerWeight = game.settings.get(CONSTANTS.MODULE_ID, "currencyWeightBulk") ?? 100;
    if (currencyPerWeight == 0) {
      weight = weight + 0;
    } else {
      weight = weight + numCoins / currencyPerWeight;
    }
    weight = Math.round(weight * 100000) / 100000;
    Logger.debug(
      `calcItemBulk | Backpack : ${numCoins} / ${currencyPerWeight} = ${
        currencyPerWeight == 0 ? 0 : numCoins / currencyPerWeight
      } => ${weight}`
    );
  } else {
    Logger.debug(`calcItemBulk | Check out currency = false => ${weight}`);

    const currency = item.system.currency ?? {};
    const numCoins = currency ? Object.keys(currency).reduce((val, denom) => val + currency[denom], 0) : 0;
    weight = weight + numCoins / 100;
    weight = Math.round(weight * 100000) / 100000;
    Logger.debug(`calcItemBulk | Backpack : ${numCoins} / ${50} = ${numCoins / 50} => ${weight}`);
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
