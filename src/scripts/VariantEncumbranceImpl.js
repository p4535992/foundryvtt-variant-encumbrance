// Import JavaScript modules
import {
  EncumbranceActorType,
  EncumbranceData,
  EncumbranceDnd5e,
  EncumbranceFlags,
  EncumbranceMode,
  ENCUMBRANCE_TIERS,
} from "./VariantEncumbranceModels.js";
import Effect from "./effects/effect.js";
import {
  daeActive,
  dfQualityLifeActive,
  ENCUMBRANCE_STATE,
  invMidiQol,
  invPlusActive,
  itemContainerActive,
} from "./modules.js";
import CONSTANTS from "./constants.js";
import {
  isGMConnected,
  isRealNumber,
  retrieveAttributeEncumbranceMax,
  retrieveAttributeCapacityCargo,
  getItemQuantity,
  getItemWeight,
  retrieveBackPackManagerItem,
  calculateBackPackManagerWeight,
} from "./lib/lib.js";
import API from "./api.js";
import { VariantEncumbranceDnd5eHelpers } from "./lib/variant-encumbrance-dnd5e-helpers";
import Logger from "./lib/Logger";

/* ------------------------------------ */
/* Constants         					*/
/* ------------------------------------ */

export const VariantEncumbranceImpl = {
  updateEncumbrance: async function (actorEntity, updatedItems, updatedEffect, mode = undefined) {
    if (updatedItems && updatedItems.length > 0) {
      for (let i = 0; i < updatedItems.length; i++) {
        const updatedItem = updatedItems ? updatedItems[i] : undefined;
        await VariantEncumbranceImpl._updateEncumbranceInternal(actorEntity, updatedItem, updatedEffect, mode);
      }
    } else {
      await VariantEncumbranceImpl._updateEncumbranceInternal(actorEntity, undefined, updatedEffect, mode);
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
      await VariantEncumbranceImpl.calculateEncumbranceWithEffect(actorEntity, inventoryItems, false, invPlusActive);
    } else {
      VariantEncumbranceImpl.calculateEncumbrance(actorEntity, inventoryItems, false, invPlusActive);
    }

    // Finalize some flag (maybe to remove...)

    const burrow = hasProperty(actorEntity, `flags.${CONSTANTS.MODULE_ID}.${EncumbranceFlags.BURROW}`)
      ? actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.BURROW)
      : {};
    const climb = hasProperty(actorEntity, `flags.${CONSTANTS.MODULE_ID}.${EncumbranceFlags.CLIMB}`)
      ? actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.CLIMB)
      : {};
    const fly = hasProperty(actorEntity, `flags.${CONSTANTS.MODULE_ID}.${EncumbranceFlags.FLY}`)
      ? actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.FLY)
      : {};
    const swim = hasProperty(actorEntity, `flags.${CONSTANTS.MODULE_ID}.${EncumbranceFlags.SWIM}`)
      ? actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.SWIM)
      : {};
    const walk = hasProperty(actorEntity, `flags.${CONSTANTS.MODULE_ID}.${EncumbranceFlags.WALK}`)
      ? actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.WALK)
      : {};

    if (burrow !== actorEntity.system.attributes.movement.burrow) {
      await actorEntity.setFlag(
        CONSTANTS.MODULE_ID,
        EncumbranceFlags.BURROW,

        actorEntity.system.attributes.movement.burrow
      );
    }

    if (climb !== actorEntity.system.attributes.movement.climb) {
      await actorEntity.setFlag(
        CONSTANTS.MODULE_ID,
        EncumbranceFlags.CLIMB,

        actorEntity.system.attributes.movement.climb
      );
    }

    if (fly !== actorEntity.system.attributes.movement.fly) {
      await actorEntity.setFlag(
        CONSTANTS.MODULE_ID,
        EncumbranceFlags.FLY,

        actorEntity.system.attributes.movement.fly
      );
    }

    if (swim !== actorEntity.system.attributes.movement.swim) {
      await actorEntity.setFlag(
        CONSTANTS.MODULE_ID,
        EncumbranceFlags.SWIM,

        actorEntity.system.attributes.movement.swim
      );
    }

    if (walk !== actorEntity.system.attributes.movement.walk) {
      await actorEntity.setFlag(
        CONSTANTS.MODULE_ID,
        EncumbranceFlags.WALK,

        actorEntity.system.attributes.movement.walk
      );
    }
  },

  calculateEncumbranceWithEffect: async function (
    actorEntity,
    // veItemData: VariantEncumbranceItemData | null,
    inventoryItems,
    ignoreCurrency,
    invPlusActive
  ) {
    const encumbranceData = VariantEncumbranceImpl.calculateEncumbrance(
      actorEntity,
      inventoryItems,
      ignoreCurrency,
      invPlusActive
    );

    // SEEM NOT NECESSARY Add pre check for encumbrance tier
    if (game.settings.get(CONSTANTS.MODULE_ID, "enablePreCheckEncumbranceTier")) {
      if (hasProperty(actorEntity, `flags.${CONSTANTS.MODULE_ID}.${EncumbranceFlags.DATA}`)) {
        const encumbranceDataCurrent = actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.DATA);
        if (encumbranceDataCurrent.encumbranceTier === encumbranceData.encumbranceTier) {
          //We ignore all the AE check
          await actorEntity.setFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.DATA, encumbranceData);
          return encumbranceData;
        }
      }
    }

    const enableVarianEncumbranceEffectsOnActorFlag = actorEntity.getFlag(
      CONSTANTS.MODULE_ID,
      EncumbranceFlags.ENABLED_AE
    );
    if (enableVarianEncumbranceEffectsOnActorFlag) {
      await VariantEncumbranceImpl.manageActiveEffect(actorEntity, encumbranceData.encumbranceTier);
    }
    await actorEntity.setFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.DATA, encumbranceData);
    return encumbranceData;
  },

  manageActiveEffect: async function (actorEntity, encumbranceTier) {
    let effectEntityPresent;

    for (const effectEntity of actorEntity.effects) {
      const effectNameToSet = effectEntity.name || effectEntity.label;

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
            await VariantEncumbranceImpl.addEffect(effectName, actorEntity, origin, encumbranceTier);
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
    const enableVarianEncumbranceWeightOnActorFlag = actorEntity.getFlag(
      CONSTANTS.MODULE_ID,
      EncumbranceFlags.ENABLED_WE
    );
    const useStandardWeightCalculation = game.settings.get(CONSTANTS.MODULE_ID, "useStandardWeightCalculation");
    const doNotIncreaseWeightByQuantityForNoAmmunition = game.settings.get(
      CONSTANTS.MODULE_ID,
      "doNotIncreaseWeightByQuantityForNoAmmunition"
    );
    const useEquippedUnequippedItemCollectionFeature = game.settings.get(
      CONSTANTS.MODULE_ID,
      "useEquippedUnequippedItemCollectionFeature"
    );
    if (!enableVarianEncumbranceWeightOnActorFlag && !useStandardWeightCalculation) {
      // if (hasProperty(actorEntity, `flags.${CONSTANTS.MODULE_ID}.${EncumbranceFlags.DATA}`)) {
      //   return actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.DATA);
      // } else {
      // Inventory encumbrance STANDARD
      const dataEncumbrance = _standardActorWeightCalculation(actorEntity) ?? actorEntity.system.attributes.encumbrance;
      return dataEncumbrance;
      // }
    } else if (!enableVarianEncumbranceWeightOnActorFlag && useStandardWeightCalculation) {
      // Inventory encumbrance STANDARD
      const dataEncumbrance = _standardActorWeightCalculation(actorEntity) ?? actorEntity.system.attributes.encumbrance;
      return dataEncumbrance;
    } else if (enableVarianEncumbranceWeightOnActorFlag && useStandardWeightCalculation) {
      // Inventory encumbrance STANDARD
      const dataEncumbrance = _standardActorWeightCalculation(actorEntity) ?? actorEntity.system.attributes.encumbrance;
      return dataEncumbrance;
    } else if (enableVarianEncumbranceWeightOnActorFlag && !useStandardWeightCalculation) {
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
        let itemWeight = getItemWeight(item);

        const isEquipped = item.system.equipped ? true : false;
        const isProficient = item.system.proficient ? item.system.proficient : false;

        let backpackManager = retrieveBackPackManagerItem(item);
        if (backpackManager) {
          // Does the weight of the items in the container carry over to the actor?
          const weightless = getProperty(item, "system.capacity.weightless") ?? false;
          // const backpackManagerWeight =
          // 	API.calculateWeightOnActor(backpackManager)?.totalWeight ?? itemWeight;
          const backpackManagerWeight = calculateBackPackManagerWeight(item, backpackManager, ignoreCurrency);
          itemWeight = weightless ? itemWeight : itemWeight + backpackManagerWeight;

          itemWeight = VariantEncumbranceDnd5eHelpers.manageCustomCodeFeature(item, itemWeight, false);
          itemWeight = VariantEncumbranceDnd5eHelpers.manageEquippedAndUnEquippedFeature(item, itemWeight);

          Logger.debug(
            `Is BackpackManager! Actor '${actorEntity.name}', Item '${item.name}' : Quantity = ${itemQuantity}, Weight = ${itemWeight}`
          );
          mapItemEncumbrance[item.id] = itemQuantity * itemWeight;
          if (getProperty(item, `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.ITEM.veweight}`) !== itemWeight) {
            // NOTE IS ASYNC
            item.setFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.ITEM.veweight, itemWeight);
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
          itemWeight = calcWeightItemCollection(
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

          itemWeight = VariantEncumbranceDnd5eHelpers.manageCustomCodeFeature(item, itemWeight, false);
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
                if (section?.ignoreWeight === true) {
                  itemWeight = 0;
                  // ignoreEquipmentCheck = true;
                }
                // EXIT FOR
                actorHasCustomCategories = true;
              }

              // Inherent weight
              if (Number(section?.ownWeight) > 0) {
                if (!invPlusCategoriesWeightToAdd.has(categoryId)) {
                  invPlusCategoriesWeightToAdd.set(categoryId, Number(section.ownWeight));
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
                  if (section?.ignoreWeight === true) {
                    itemWeight = 0;
                    // ignoreEquipmentCheck = true;
                  }
                  // Inherent weight
                  if (Number(section?.ownWeight) > 0) {
                    if (!invPlusCategoriesWeightToAdd.has(categoryId)) {
                      invPlusCategoriesWeightToAdd.set(categoryId, Number(section.ownWeight));
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
        if (getProperty(item, `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.ITEM.veweight}`) !== itemWeight) {
          // NOTE IS ASYNC
          item.setFlag(CONSTANTS.MODULE_ID, CONSTANTS.FLAGS.ITEM.veweight, itemWeight);
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

        const currencyPerWeight = game.settings.get("dnd5e", "metricWeightUnits")
          ? game.settings.get(CONSTANTS.MODULE_ID, "fakeMetricSystem")
            ? game.settings.get(CONSTANTS.MODULE_ID, "currencyWeight")
            : game.settings.get(CONSTANTS.MODULE_ID, "currencyWeightMetric")
          : game.settings.get(CONSTANTS.MODULE_ID, "currencyWeight");
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

      let speedDecrease = 0;

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

      let displayedUnits = game.settings.get("dnd5e", "metricWeightUnits")
        ? game.settings.get(CONSTANTS.MODULE_ID, "unitsMetric")
        : game.settings.get(CONSTANTS.MODULE_ID, "units");

      const lightMultiplier = game.settings.get("dnd5e", "metricWeightUnits")
        ? game.settings.get(CONSTANTS.MODULE_ID, "fakeMetricSystem")
          ? game.settings.get(CONSTANTS.MODULE_ID, "lightMultiplier")
          : game.settings.get(CONSTANTS.MODULE_ID, "lightMultiplierMetric")
        : game.settings.get(CONSTANTS.MODULE_ID, "lightMultiplier");
      let lightMax = lightMultiplier; // lightMultiplier * strengthScore;

      const mediumMultiplier = game.settings.get("dnd5e", "metricWeightUnits")
        ? game.settings.get(CONSTANTS.MODULE_ID, "fakeMetricSystem")
          ? game.settings.get(CONSTANTS.MODULE_ID, "mediumMultiplier")
          : game.settings.get(CONSTANTS.MODULE_ID, "mediumMultiplierMetric")
        : game.settings.get(CONSTANTS.MODULE_ID, "mediumMultiplier");
      let mediumMax = mediumMultiplier; // mediumMultiplier * strengthScore;

      const heavyMultiplier = game.settings.get("dnd5e", "metricWeightUnits")
        ? game.settings.get(CONSTANTS.MODULE_ID, "fakeMetricSystem")
          ? game.settings.get(CONSTANTS.MODULE_ID, "heavyMultiplier")
          : game.settings.get(CONSTANTS.MODULE_ID, "heavyMultiplierMetric")
        : game.settings.get(CONSTANTS.MODULE_ID, "heavyMultiplier");
      let heavyMax = heavyMultiplier; // heavyMultiplier * strengthScore;

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

        const strengthScore = max; // actorEntity.system.abilities.str.value * strengthMultiplier * modForSize;

        // lightMax = lightMultiplier * strengthScore;
        // mediumMax = mediumMultiplier * strengthScore;
        // heavyMax = heavyMultiplier * strengthScore;
        lightMax = lightMultiplier * strengthScore;
        if (daeValueAttributeEncumbranceMax && daeValueAttributeEncumbranceMax > 0) {
          lightMax = lightMax / 3;
        }
        // const daeValueAttributeEncumbranceMaxLightMax =
        //   daeActive && game.settings.get(CONSTANTS.MODULE_ID, 'enableDAEIntegration')
        //     ? retrieveAttributeEncumbranceMax(actorEntity, lightMax)
        //     : 0;
        // if (daeValueAttributeEncumbranceMaxLightMax && daeValueAttributeEncumbranceMaxLightMax > 0) {
        //   lightMax = daeValueAttributeEncumbranceMaxLightMax;
        // }
        mediumMax = mediumMultiplier * strengthScore;
        if (daeValueAttributeEncumbranceMax && daeValueAttributeEncumbranceMax > 0) {
          mediumMax = mediumMax / 3;
        }
        // const daeValueAttributeEncumbranceMaxMediumMax =
        //   daeActive && game.settings.get(CONSTANTS.MODULE_ID, 'enableDAEIntegration')
        //     ? retrieveAttributeEncumbranceMax(actorEntity, mediumMax)
        //     : 0;
        // if (daeValueAttributeEncumbranceMaxMediumMax && daeValueAttributeEncumbranceMaxMediumMax > 0) {
        //   mediumMax = daeValueAttributeEncumbranceMaxMediumMax;
        // }
        heavyMax = heavyMultiplier * strengthScore;
        if (daeValueAttributeEncumbranceMax && daeValueAttributeEncumbranceMax > 0) {
          heavyMax = heavyMax / 3;
        }
        // const daeValueAttributeEncumbranceMaxHeavyMax =
        //   daeActive && game.settings.get(CONSTANTS.MODULE_ID, 'enableDAEIntegration')
        //     ? retrieveAttributeEncumbranceMax(actorEntity, heavyMax)
        //     : 0;
        // if (daeValueAttributeEncumbranceMaxHeavyMax && daeValueAttributeEncumbranceMaxHeavyMax > 0) {
        //   heavyMax = daeValueAttributeEncumbranceMaxHeavyMax;
        // }
      } else if (actorEntity.type === EncumbranceActorType.VEHICLE) {
        // ===============================
        // VEHICLE
        // ===============================
        // MOD 4535992 FROM 2000 to 1 SO I REMOVED ???
        /*
				const vehicleWeightMultiplier = game.settings.get('dnd5e', 'metricWeightUnits')
				? (game.settings.get(CONSTANTS.MODULE_ID, 'fakeMetricSystem')
					? game.settings.get(CONSTANTS.MODULE_ID, 'vehicleWeightMultiplier')
					:game.settings.get(CONSTANTS.MODULE_ID, 'vehicleWeightMultiplierMetric')
				)
				: game.settings.get(CONSTANTS.MODULE_ID, 'vehicleWeightMultiplier');

				// Vehicle weights are an order of magnitude greater.

				totalWeight /= vehicleWeightMultiplier;
				*/
        // TODO
        //totalWeight /= this.document.getFlag(SETTINGS.MOD_NAME, 'unit') || vehicleWeightMultiplier;

        // Integration with DragonFlagon Quality of Life, Vehicle Cargo Capacity Unit Feature
        if (dfQualityLifeActive && actorEntity.getFlag(CONSTANTS.DF_QUALITY_OF_LIFE_MODULE_ID, `unit`)) {
          const dfVehicleUnit = actorEntity.getFlag(CONSTANTS.DF_QUALITY_OF_LIFE_MODULE_ID, `unit`);
          switch (dfVehicleUnit) {
            case 2240:
              totalWeight /= dfVehicleUnit;
              displayedUnits = "L.Ton";
              break;
            case 2000:
              totalWeight /= dfVehicleUnit;
              displayedUnits = "S.Ton";
              break;
            case 1:
              totalWeight /= dfVehicleUnit;
              displayedUnits = "lbs";
              break;
          }
        } else if (dfQualityLifeActive && actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.DATA)) {
          const encumbranceData = actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.DATA);
          const dfVehicleUnitLabel = encumbranceData.unit;
          switch (dfVehicleUnitLabel) {
            case "L.Ton":
              totalWeight /= 2240;
              displayedUnits = "L.Ton";
              break;
            case "S.Ton":
              totalWeight /= 2000;
              displayedUnits = "S.Ton";
              break;
            case "lbs":
              totalWeight /= 1;
              displayedUnits = "lbs";
              break;
            default:
              totalWeight /= 1;
              displayedUnits = "lbs";
              break;
          }
        }

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

        const strengthScore = max; // capacityCargo * strengthMultiplier * modForSize;

        // Manage vehicle specific case
        // lightMax = lightMultiplier * capacityCargo * strengthMultiplier * modForSize;
        // mediumMax = mediumMultiplier * capacityCargo * strengthMultiplier * modForSize;
        // heavyMax = heavyMultiplier * capacityCargo * strengthMultiplier * modForSize;

        // lightMax = capacityCargo * strengthMultiplier * modForSize * 0.33;
        // mediumMax = capacityCargo * strengthMultiplier * modForSize * 0.66;
        // heavyMax = capacityCargo * strengthMultiplier * modForSize;

        lightMax = strengthScore * 0.33;
        // const daeValueAttributeCapacityCargoLightMax =
        //   daeActive && game.settings.get(CONSTANTS.MODULE_ID, 'enableDAEIntegration')
        //     ? retrieveAttributeCapacityCargo(actorEntity, lightMax)
        //     : 0;
        // if (daeValueAttributeCapacityCargoLightMax && daeValueAttributeCapacityCargoLightMax > 0) {
        //   lightMax = daeValueAttributeCapacityCargoLightMax;
        // }
        mediumMax = strengthScore * 0.66;
        // const daeValueAttributeCapacityCargoMediumMax =
        //   daeActive && game.settings.get(CONSTANTS.MODULE_ID, 'enableDAEIntegration')
        //     ? retrieveAttributeCapacityCargo(actorEntity, mediumMax)
        //     : 0;
        // if (daeValueAttributeCapacityCargoMediumMax && daeValueAttributeCapacityCargoMediumMax > 0) {
        //   mediumMax = daeValueAttributeCapacityCargoMediumMax;
        // }
        heavyMax = strengthScore;
        // const daeValueAttributeCapacityCargoHeavyMax =
        //   daeActive && game.settings.get(CONSTANTS.MODULE_ID, 'enableDAEIntegration')
        //     ? retrieveAttributeCapacityCargo(actorEntity, heavyMax)
        //     : 0;
        // if (daeValueAttributeCapacityCargoHeavyMax && daeValueAttributeCapacityCargoHeavyMax > 0) {
        //   heavyMax = daeValueAttributeCapacityCargoHeavyMax;
        // }
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

        const strengthScore = max; // actorEntity.system.abilities.str.value * strengthMultiplier * modForSize;

        // lightMax = lightMultiplier * strengthScore;
        // mediumMax = mediumMultiplier * strengthScore;
        // heavyMax = heavyMultiplier * strengthScore;

        lightMax = lightMultiplier * strengthScore;
        if (daeValueAttributeEncumbranceMax && daeValueAttributeEncumbranceMax > 0) {
          lightMax = lightMax / 3;
        }
        // const daeValueAttributeEncumbranceMaxLightMax =
        //   daeActive && game.settings.get(CONSTANTS.MODULE_ID, 'enableDAEIntegration')
        //     ? retrieveAttributeEncumbranceMax(actorEntity, lightMax)
        //     : 0;
        // if (daeValueAttributeEncumbranceMaxLightMax && daeValueAttributeEncumbranceMaxLightMax > 0) {
        //   lightMax = daeValueAttributeEncumbranceMaxLightMax;
        // }
        mediumMax = mediumMultiplier * strengthScore;
        if (daeValueAttributeEncumbranceMax && daeValueAttributeEncumbranceMax > 0) {
          mediumMax = mediumMax / 3;
        }
        // const daeValueAttributeEncumbranceMaxMediumMax =
        //   daeActive && game.settings.get(CONSTANTS.MODULE_ID, 'enableDAEIntegration')
        //     ? retrieveAttributeEncumbranceMax(actorEntity, mediumMax)
        //     : 0;
        // if (daeValueAttributeEncumbranceMaxMediumMax && daeValueAttributeEncumbranceMaxMediumMax > 0) {
        //   mediumMax = daeValueAttributeEncumbranceMaxMediumMax;
        // }
        heavyMax = heavyMultiplier * strengthScore;
        if (daeValueAttributeEncumbranceMax && daeValueAttributeEncumbranceMax > 0) {
          heavyMax = heavyMax / 3;
        }
        // const daeValueAttributeEncumbranceMaxHeavyMax =
        //   daeActive && game.settings.get(CONSTANTS.MODULE_ID, 'enableDAEIntegration')
        //     ? retrieveAttributeEncumbranceMax(actorEntity, heavyMax)
        //     : 0;
        // if (daeValueAttributeEncumbranceMaxHeavyMax && daeValueAttributeEncumbranceMaxHeavyMax > 0) {
        //   heavyMax = daeValueAttributeEncumbranceMaxHeavyMax;
        // }
      }

      let encumbranceTier = ENCUMBRANCE_TIERS.NONE;
      if (totalWeight > lightMax && totalWeight <= mediumMax) {
        speedDecrease = game.settings.get("dnd5e", "metricWeightUnits")
          ? game.settings.get(CONSTANTS.MODULE_ID, "lightWeightDecreaseMetric")
          : game.settings.get(CONSTANTS.MODULE_ID, "lightWeightDecrease");
        encumbranceTier = ENCUMBRANCE_TIERS.LIGHT;
      }
      if (totalWeight > mediumMax && totalWeight <= heavyMax) {
        speedDecrease = game.settings.get("dnd5e", "metricWeightUnits")
          ? game.settings.get(CONSTANTS.MODULE_ID, "heavyWeightDecreaseMetric")
          : game.settings.get(CONSTANTS.MODULE_ID, "heavyWeightDecrease");
        encumbranceTier = ENCUMBRANCE_TIERS.HEAVY;
      }
      if (totalWeight > heavyMax) {
        encumbranceTier = ENCUMBRANCE_TIERS.MAX;
      }

      // Inventory encumbrance
      // actorEntity.system.attributes.encumbrance = { value: totalWeight.toNearest(0.1), max, pct, encumbered: pct > (200/3) };
      const dataEncumbrance = {
        value: totalWeightOriginal.toNearest(0.1),
        max: max.toNearest(0.1),
        pct: pct,
        encumbered: encumbranceTier !== ENCUMBRANCE_TIERS.NONE,
      };

      // ==========================================================================================
      // THIS IS IMPORTANT WE FORCE THE CORE ENCUMBRANCE TO BE SYNCHRONIZED WITH THE CALCULATION
      // ===============================================================================

      //(actorEntity.system.attributes.encumbrance) = dataEncumbrance;
      setProperty(actorEntity, `system.attributes.encumbrance`, dataEncumbrance);

      const encumbranceData = {
        totalWeight: totalWeightOriginal.toNearest(0.1),
        totalWeightToDisplay: totalWeight.toNearest(0.1),
        lightMax: lightMax.toNearest(0.1),
        mediumMax: mediumMax.toNearest(0.1),
        heavyMax: heavyMax.toNearest(0.1),
        // totalMax: max,
        encumbranceTier: encumbranceTier,
        speedDecrease: speedDecrease,
        unit: displayedUnits,
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
      case ENCUMBRANCE_STATE.ENCUMBERED.toLowerCase(): {
        const effect = VariantEncumbranceImpl._encumbered();
        const speedDecreased =
          speedDecrease > 0 ? speedDecrease : game.settings.get("dnd5e", "metricWeightUnits") ? 3 : 10;
        VariantEncumbranceImpl._addEncumbranceEffects(effect, actor, speedDecreased);
        return effect;
      }
      case ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED.toLowerCase(): {
        let effect;
        if (invMidiQol) {
          effect = VariantEncumbranceImpl._heavilyEncumbered();
        } else {
          effect = VariantEncumbranceImpl._heavilyEncumberedNoMidi();
        }
        const speedDecreased =
          speedDecrease > 0 ? speedDecrease : game.settings.get("dnd5e", "metricWeightUnits") ? 6 : 20;
        VariantEncumbranceImpl._addEncumbranceEffects(effect, actor, speedDecreased);
        return effect;
      }
      case ENCUMBRANCE_STATE.UNENCUMBERED.toLowerCase(): {
        return null;
      }
      case ENCUMBRANCE_STATE.OVERBURDENED.toLowerCase(): {
        let effect;
        if (invMidiQol) {
          effect = VariantEncumbranceImpl._overburdenedEncumbered();
        } else {
          effect = VariantEncumbranceImpl._overburdenedEncumberedNoMidi();
        }
        VariantEncumbranceImpl._addEncumbranceEffectsOverburdened(effect);
        return effect;
      }
      default: {
        throw new Logger.error("The effect name '" + effectName + "' is not recognized");
      }
    }
  },

  _encumbered: function () {
    return new Effect({
      name: ENCUMBRANCE_STATE.ENCUMBERED,
      description: Logger.i18n("variant-encumbrance-dnd5e.effect.description.encumbered"),
      icon: "icons/svg/down.svg",
      isDynamic: true,
      transfer: true,
    });
  },

  _heavilyEncumbered: function () {
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

  _heavilyEncumberedNoMidi: function () {
    return new Effect({
      name: ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED,
      description: Logger.i18n("variant-encumbrance-dnd5e.effect.description.heavily_encumbered"),
      icon: "icons/svg/downgrade.svg",
      isDynamic: true,
      transfer: true,
      changes: [],
    });
  },

  _overburdenedEncumbered: function () {
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

  _overburdenedEncumberedNoMidi: function () {
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
      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      value: movement.burrow > value ? `-${value}` : `-${movement.burrow}`,
    });

    effect.changes.push({
      key: "system.attributes.movement.climb",
      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      value: movement.climb > value ? `-${value}` : `-${movement.climb}`,
    });

    effect.changes.push({
      key: "system.attributes.movement.fly",
      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      value: movement.fly > value ? `-${value}` : `-${movement.fly}`,
    });

    effect.changes.push({
      key: "system.attributes.movement.swim",
      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      value: movement.swim > value ? `-${value}` : `-${movement.swim}`,
    });

    effect.changes.push({
      key: "system.attributes.movement.walk",
      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      value: movement.walk > value ? `-${value}` : `-${movement.walk}`,
    });
    // THIS IS THE DAE SOLUTION
    // } else {
    //   effect.changes.push({
    //     key: 'system.attributes.movement.all',
    //     mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
    //     value: value ? `-${value}` : `-0`,
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
  },

  /**
   * Adds the effect with the provided name to an actor matching the provided
   * UUID
   *
   * @param {string} effectName - the name of the effect to add
   * @param {string} uuid - the uuid of the actor to add the effect to
   */
  async addEffect(effectName, actor, origin, encumbranceTier) {
    let speedDecrease = 0;
    if (encumbranceTier === ENCUMBRANCE_TIERS.NONE) {
      speedDecrease = 0;
    } else if (encumbranceTier === ENCUMBRANCE_TIERS.LIGHT) {
      speedDecrease = game.settings.get("dnd5e", "metricWeightUnits")
        ? game.settings.get(CONSTANTS.MODULE_ID, "lightWeightDecreaseMetric")
        : game.settings.get(CONSTANTS.MODULE_ID, "lightWeightDecrease");
    } else if (encumbranceTier === ENCUMBRANCE_TIERS.HEAVY) {
      speedDecrease = game.settings.get("dnd5e", "metricWeightUnits")
        ? game.settings.get(CONSTANTS.MODULE_ID, "heavyWeightDecreaseMetric")
        : game.settings.get(CONSTANTS.MODULE_ID, "heavyWeightDecrease");
    } else if (encumbranceTier === ENCUMBRANCE_TIERS.MAX) {
      speedDecrease = null;
    }
    const effect = await VariantEncumbranceImpl.addDynamicEffects(effectName, actor, speedDecrease);
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
        flags: foundry.utils.mergeObject(ceFlags, effect.flags),
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

export const isEnabledActorType = function (actorEntity) {
  const useVarianEncumbranceWithSpecificType = game.settings.get(
    CONSTANTS.MODULE_ID,
    "useVarianEncumbranceWithSpecificType"
  )
    ? String(game.settings.get(CONSTANTS.MODULE_ID, "useVarianEncumbranceWithSpecificType")).split(",")
    : [];
  if (
    actorEntity &&
    useVarianEncumbranceWithSpecificType.length > 0 &&
    useVarianEncumbranceWithSpecificType.includes(actorEntity?.type)
  ) {
    return true;
  }
  return false;
};

// ===========================
// Item Collection/Container SUPPORT
// ===========================

export function calcWeightItemCollection(
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
    Logger.debug(`calcWeightItemCollection | Is not a 'backpack' and is not flagged as itemcollection`);
    let itemWeight = calcItemWeight(item, ignoreCurrency, doNotIncreaseWeightByQuantityForNoAmmunition);

    itemWeight = VariantEncumbranceDnd5eHelpers.manageCustomCodeFeature(item, itemWeight, false);
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
  let itemWeight = getItemWeight(item) || 0;

  if (useEquippedUnequippedItemCollectionFeature && !isEquipped && item.flags?.itemcollection?.weightlessUnequipped) {
    return 0;
  }
  // END MOD 4535992
  const weightless = getProperty(item, "system.capacity.weightless") ?? false;
  if (weightless) {
    itemWeight = getProperty(item, "flags.itemcollection.bagWeight") ?? 0;
  } else {
    itemWeight =
      calcItemWeight(item, ignoreCurrency, doNotIncreaseWeightByQuantityForNoAmmunition, { ignoreItems, ignoreTypes }) +
      (getProperty(item, "flags.itemcollection.bagWeight") ?? 0);
  }

  itemWeight = VariantEncumbranceDnd5eHelpers.manageCustomCodeFeature(item, itemWeight, false);
  itemWeight = VariantEncumbranceDnd5eHelpers.manageEquippedAndUnEquippedFeature(item, itemWeight);

  return itemWeight;
}

function calcItemWeight(
  item,
  ignoreCurrency,
  doNotIncreaseWeightByQuantityForNoAmmunition,
  { ignoreItems, ignoreTypes } = { ignoreItems: undefined, ignoreTypes: undefined }
) {
  if (item.type !== "backpack" || item.items === undefined) {
    Logger.debug(
      `calcItemWeight | Is not a backpack or has not items on it => ${_calcItemWeight(
        item,
        doNotIncreaseWeightByQuantityForNoAmmunition
      )}`
    );
    return _calcItemWeight(item, doNotIncreaseWeightByQuantityForNoAmmunition);
  }
  let weight = item.items.reduce((acc, item) => {
    if (ignoreTypes?.some((name) => item.name.includes(name))) return acc;
    if (ignoreItems?.includes(item.name)) return acc;
    return acc + getItemWeight(item) * getItemQuantity(item);
  }, (item.type === "backpack" ? 0 : _calcItemWeight(item, doNotIncreaseWeightByQuantityForNoAmmunition)) || 0);
  // [Optional] add Currency Weight (for non-transformed actors)
  if (
    !ignoreCurrency &&
    game.settings.get(CONSTANTS.MODULE_ID, "enableCurrencyWeight") &&
    game.settings.get("dnd5e", "currencyWeight") &&
    item.system.currency
  ) {
    Logger.debug(`calcItemWeight | Check out currency = true => ${weight}`);

    const currency = item.system.currency ?? {};
    const numCoins = Object.values(currency).reduce((val, denom) => (val += Math.max(denom, 0)), 0);

    const currencyPerWeight = game.settings.get("dnd5e", "metricWeightUnits")
      ? game.settings.get(CONSTANTS.MODULE_ID, "fakeMetricSystem")
        ? game.settings.get(CONSTANTS.MODULE_ID, "currencyWeight")
        : game.settings.get(CONSTANTS.MODULE_ID, "currencyWeightMetric")
      : game.settings.get(CONSTANTS.MODULE_ID, "currencyWeight");
    if (currencyPerWeight == 0) {
      weight = weight + 0;
    } else {
      weight = weight + numCoins / currencyPerWeight;
    }
    weight = Math.round(weight * 100000) / 100000;
    Logger.debug(
      `calcItemWeight | Backpack : ${numCoins} / ${currencyPerWeight} = ${
        currencyPerWeight == 0 ? 0 : numCoins / currencyPerWeight
      } => ${weight}`
    );
  } else {
    Logger.debug(`calcItemWeight | Check out currency = false => ${weight}`);

    const currency = item.system.currency ?? {};
    const numCoins = currency ? Object.keys(currency).reduce((val, denom) => val + currency[denom], 0) : 0;
    weight = weight + numCoins / 50;
    weight = Math.round(weight * 100000) / 100000;
    Logger.debug(`calcItemWeight | Backpack : ${numCoins} / ${50} = ${numCoins / 50} => ${weight}`);
  }
  return weight;
}

function _calcItemWeight(item, doNotIncreaseWeightByQuantityForNoAmmunition) {
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
  const weight = getItemWeight(item);
  return Math.round(weight * quantity * 100000) / 100000;
}

// ============================
// STANDARD SYSTEM CALCULATION SUPPORT
// ============================

function _standardActorWeightCalculation(actorEntity) {
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

  let displayedUnits = game.settings.get("dnd5e", "metricWeightUnits")
    ? game.settings.get(CONSTANTS.MODULE_ID, "unitsMetric")
    : game.settings.get(CONSTANTS.MODULE_ID, "units");

  // const strengthScore = actorEntity.system.abilities.str.value * modForSize;

  const lightMultiplier = game.settings.get("dnd5e", "metricWeightUnits")
    ? game.settings.get(CONSTANTS.MODULE_ID, "fakeMetricSystem")
      ? game.settings.get(CONSTANTS.MODULE_ID, "lightMultiplier")
      : game.settings.get(CONSTANTS.MODULE_ID, "lightMultiplierMetric")
    : game.settings.get(CONSTANTS.MODULE_ID, "lightMultiplier");
  let lightMax = lightMultiplier; // lightMultiplier * strengthScore;

  const mediumMultiplier = game.settings.get("dnd5e", "metricWeightUnits")
    ? game.settings.get(CONSTANTS.MODULE_ID, "fakeMetricSystem")
      ? game.settings.get(CONSTANTS.MODULE_ID, "mediumMultiplier")
      : game.settings.get(CONSTANTS.MODULE_ID, "mediumMultiplierMetric")
    : game.settings.get(CONSTANTS.MODULE_ID, "mediumMultiplier");
  let mediumMax = mediumMultiplier; // mediumMultiplier * strengthScore;

  const heavyMultiplier = game.settings.get("dnd5e", "metricWeightUnits")
    ? game.settings.get(CONSTANTS.MODULE_ID, "fakeMetricSystem")
      ? game.settings.get(CONSTANTS.MODULE_ID, "heavyMultiplier")
      : game.settings.get(CONSTANTS.MODULE_ID, "heavyMultiplierMetric")
    : game.settings.get(CONSTANTS.MODULE_ID, "heavyMultiplier");
  let heavyMax = heavyMultiplier; // heavyMultiplier * strengthScore;

  let dataEncumbrance;
  if (actorEntity.type === EncumbranceActorType.CHARACTER) {
    dataEncumbrance = _standardCharacterWeightCalculation(actorEntity);

    let max = actorEntity.system.abilities.str.value * strengthMultiplier * modForSize;
    const daeValueAttributeEncumbranceMax =
      daeActive && game.settings.get(CONSTANTS.MODULE_ID, "enableDAEIntegration")
        ? retrieveAttributeEncumbranceMax(actorEntity, max)
        : 0;
    if (daeValueAttributeEncumbranceMax && daeValueAttributeEncumbranceMax > 0) {
      max = daeValueAttributeEncumbranceMax;
    }

    const strengthScore = max; // actorEntity.system.abilities.str.value * strengthMultiplier * modForSize;

    // lightMax = lightMultiplier * strengthScore;
    // mediumMax = mediumMultiplier * strengthScore;
    // heavyMax = heavyMultiplier * strengthScore;
    lightMax = lightMultiplier * strengthScore;
    if (daeValueAttributeEncumbranceMax && daeValueAttributeEncumbranceMax > 0) {
      lightMax = lightMax / 3;
    }
    // const daeValueAttributeEncumbranceMaxLightMax =
    //   daeActive && game.settings.get(CONSTANTS.MODULE_ID, 'enableDAEIntegration')
    //     ? retrieveAttributeEncumbranceMax(actorEntity, lightMax)
    //     : 0;
    // if (daeValueAttributeEncumbranceMaxLightMax && daeValueAttributeEncumbranceMaxLightMax > 0) {
    //   lightMax = daeValueAttributeEncumbranceMaxLightMax;
    // }
    mediumMax = mediumMultiplier * strengthScore;
    if (daeValueAttributeEncumbranceMax && daeValueAttributeEncumbranceMax > 0) {
      mediumMax = mediumMax / 3;
    }
    // const daeValueAttributeEncumbranceMaxMediumMax =
    //   daeActive && game.settings.get(CONSTANTS.MODULE_ID, 'enableDAEIntegration')
    //     ? retrieveAttributeEncumbranceMax(actorEntity, mediumMax)
    //     : 0;
    // if (daeValueAttributeEncumbranceMaxMediumMax && daeValueAttributeEncumbranceMaxMediumMax > 0) {
    //   mediumMax = daeValueAttributeEncumbranceMaxMediumMax;
    // }
    heavyMax = heavyMultiplier * strengthScore;
    if (daeValueAttributeEncumbranceMax && daeValueAttributeEncumbranceMax > 0) {
      heavyMax = heavyMax / 3;
    }
    // const daeValueAttributeEncumbranceMaxHeavyMax =
    //   daeActive && game.settings.get(CONSTANTS.MODULE_ID, 'enableDAEIntegration')
    //     ? retrieveAttributeEncumbranceMax(actorEntity, heavyMax)
    //     : 0;
    // if (daeValueAttributeEncumbranceMaxHeavyMax && daeValueAttributeEncumbranceMaxHeavyMax > 0) {
    //   heavyMax = daeValueAttributeEncumbranceMaxHeavyMax;
    // }
  } else if (actorEntity.type === EncumbranceActorType.VEHICLE) {
    dataEncumbrance = _standardVehicleWeightCalculation(actorEntity);
    // Integration with DragonFlagon Quality of Life, Vehicle Cargo Capacity Unit Feature
    if (dfQualityLifeActive && actorEntity.getFlag(CONSTANTS.DF_QUALITY_OF_LIFE_MODULE_ID, `unit`)) {
      const dfVehicleUnit = actorEntity.getFlag(CONSTANTS.DF_QUALITY_OF_LIFE_MODULE_ID, `unit`);
      switch (dfVehicleUnit) {
        case 2240:
          dataEncumbrance.value /= dfVehicleUnit;
          displayedUnits = "L.Ton";
          break;
        case 2000:
          dataEncumbrance.value /= dfVehicleUnit;
          displayedUnits = "S.Ton";
          break;
        case 1:
          dataEncumbrance.value /= dfVehicleUnit;
          displayedUnits = "lbs";
          break;
      }
    } else if (dfQualityLifeActive && actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.DATA)) {
      const encumbranceData = actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.DATA);
      const dfVehicleUnitLabel = encumbranceData.unit;
      switch (dfVehicleUnitLabel) {
        case "L.Ton":
          dataEncumbrance.value /= 2240;
          displayedUnits = "L.Ton";
          break;
        case "S.Ton":
          dataEncumbrance.value /= 2000;
          displayedUnits = "S.Ton";
          break;
        case "lbs":
          dataEncumbrance.value /= 1;
          displayedUnits = "lbs";
          break;
        default:
          dataEncumbrance.value /= 1;
          displayedUnits = "lbs";
          break;
      }
    }

    const capacityCargo = actorEntity.system.attributes.capacity.cargo;

    const strengthScore = capacityCargo * strengthMultiplier * modForSize;

    // Manage vehicle specific case
    // lightMax = lightMultiplier * capacityCargo * strengthMultiplier * modForSize;
    // mediumMax = mediumMultiplier * capacityCargo * strengthMultiplier * modForSize;
    // heavyMax = heavyMultiplier * capacityCargo * strengthMultiplier * modForSize;

    // lightMax = capacityCargo * strengthMultiplier * modForSize * 0.33;
    // mediumMax = capacityCargo * strengthMultiplier * modForSize * 0.66;
    // heavyMax = capacityCargo * strengthMultiplier * modForSize;

    lightMax = strengthScore * 0.33;
    // const daeValueAttributeCapacityCargoLightMax =
    //   daeActive && game.settings.get(CONSTANTS.MODULE_ID, 'enableDAEIntegration')
    //     ? retrieveAttributeCapacityCargo(actorEntity, lightMax)
    //     : 0;
    // if (daeValueAttributeCapacityCargoLightMax && daeValueAttributeCapacityCargoLightMax > 0) {
    //   lightMax = daeValueAttributeCapacityCargoLightMax;
    // }
    mediumMax = strengthScore * 0.66;
    // const daeValueAttributeCapacityCargoMediumMax =
    //   daeActive && game.settings.get(CONSTANTS.MODULE_ID, 'enableDAEIntegration')
    //     ? retrieveAttributeCapacityCargo(actorEntity, mediumMax)
    //     : 0;
    // if (daeValueAttributeCapacityCargoMediumMax && daeValueAttributeCapacityCargoMediumMax > 0) {
    //   mediumMax = daeValueAttributeCapacityCargoMediumMax;
    // }
    heavyMax = strengthScore;
    // const daeValueAttributeCapacityCargoHeavyMax =
    //   daeActive && game.settings.get(CONSTANTS.MODULE_ID, 'enableDAEIntegration')
    //     ? retrieveAttributeCapacityCargo(actorEntity, heavyMax)
    //     : 0;
    // if (daeValueAttributeCapacityCargoHeavyMax && daeValueAttributeCapacityCargoHeavyMax > 0) {
    //   heavyMax = daeValueAttributeCapacityCargoHeavyMax;
    // }
    lightMax;
  } else {
    dataEncumbrance = _standardCharacterWeightCalculation(actorEntity);

    let max = actorEntity.system.abilities.str.value * strengthMultiplier * modForSize;
    const daeValueAttributeEncumbranceMax =
      daeActive && game.settings.get(CONSTANTS.MODULE_ID, "enableDAEIntegration")
        ? retrieveAttributeEncumbranceMax(actorEntity, max)
        : 0;
    if (daeValueAttributeEncumbranceMax && daeValueAttributeEncumbranceMax > 0) {
      max = daeValueAttributeEncumbranceMax;
    }

    const strengthScore = max; // actorEntity.system.abilities.str.value * strengthMultiplier * modForSize;

    // lightMax = lightMultiplier * strengthScore;
    // mediumMax = mediumMultiplier * strengthScore;
    // heavyMax = heavyMultiplier * strengthScore;
    lightMax = lightMultiplier * strengthScore;
    if (daeValueAttributeEncumbranceMax && daeValueAttributeEncumbranceMax > 0) {
      lightMax = lightMax / 3;
    }
    // const daeValueAttributeEncumbranceMaxLightMax =
    //   daeActive && game.settings.get(CONSTANTS.MODULE_ID, 'enableDAEIntegration')
    //     ? retrieveAttributeEncumbranceMax(actorEntity, lightMax)
    //     : 0;
    // if (daeValueAttributeEncumbranceMaxLightMax && daeValueAttributeEncumbranceMaxLightMax > 0) {
    //   lightMax = daeValueAttributeEncumbranceMaxLightMax;
    // }
    mediumMax = mediumMultiplier * strengthScore;
    if (daeValueAttributeEncumbranceMax && daeValueAttributeEncumbranceMax > 0) {
      mediumMax = mediumMax / 3;
    }
    // const daeValueAttributeEncumbranceMaxMediumMax =
    //   daeActive && game.settings.get(CONSTANTS.MODULE_ID, 'enableDAEIntegration')
    //     ? retrieveAttributeEncumbranceMax(actorEntity, mediumMax)
    //     : 0;
    // if (daeValueAttributeEncumbranceMaxMediumMax && daeValueAttributeEncumbranceMaxMediumMax > 0) {
    //   mediumMax = daeValueAttributeEncumbranceMaxMediumMax;
    // }
    heavyMax = heavyMultiplier * strengthScore;
    if (daeValueAttributeEncumbranceMax && daeValueAttributeEncumbranceMax > 0) {
      heavyMax = heavyMax / 3;
    }
    // const daeValueAttributeEncumbranceMaxHeavyMax =
    //   daeActive && game.settings.get(CONSTANTS.MODULE_ID, 'enableDAEIntegration')
    //     ? retrieveAttributeEncumbranceMax(actorEntity, heavyMax)
    //     : 0;
    // if (daeValueAttributeEncumbranceMaxHeavyMax && daeValueAttributeEncumbranceMaxHeavyMax > 0) {
    //   heavyMax = daeValueAttributeEncumbranceMaxHeavyMax;
    // }
  }

  let encumbranceTier = ENCUMBRANCE_TIERS.NONE;
  const totalWeight = dataEncumbrance.value;
  // const max = dataEncumbrance.max;

  if (dataEncumbrance.encumbered) {
    if (totalWeight > lightMax && totalWeight <= mediumMax) {
      encumbranceTier = ENCUMBRANCE_TIERS.LIGHT;
    }
    if (totalWeight > mediumMax && totalWeight <= heavyMax) {
      encumbranceTier = ENCUMBRANCE_TIERS.HEAVY;
    }
    if (totalWeight > heavyMax) {
      encumbranceTier = ENCUMBRANCE_TIERS.MAX;
    }
  }

  return {
    totalWeight: totalWeight.toNearest(0.1),
    totalWeightToDisplay: totalWeight.toNearest(0.1),
    lightMax: lightMax.toNearest(0.1),
    mediumMax: mediumMax.toNearest(0.1),
    heavyMax: heavyMax.toNearest(0.1),
    // totalMax: max,
    encumbranceTier: encumbranceTier,
    speedDecrease: 0,
    unit: displayedUnits,
    encumbrance: dataEncumbrance,
    mapItemEncumbrance: {},
  };
}

function _standardCharacterWeightCalculation(actorEntity) {
  // actorEntity._prepareEncumbrance();

  const encumbrance = actorEntity.system.attributes.encumbrance;
  return encumbrance;
}

function _standardVehicleWeightCalculation(actorEntity) {
  // Classify items owned by the vehicle and compute total cargo weight
  let totalWeight = 0;
  for (const item of actorEntity.items) {
    // actorEntity._prepareCrewedItem(item);

    // Handle cargo explicitly

    const isCargo = item.flags.dnd5e?.vehicleCargo === true;
    if (isCargo) {
      // totalWeight += getItemWeight(item) * getItemQuantity(item);
      // cargo.cargo.items.push(item);
      // continue;
      const quantity = getItemQuantity(item);
      const weight = getItemWeight(item);

      totalWeight += Math.round(weight * quantity * 100000) / 100000;

      // actorEntity._prepareEncumbrance();

      const encumbrance = actorEntity.system.attributes.encumbrance;
      return encumbrance;
    }

    // Handle non-cargo item types
    switch (item.type) {
      case "weapon": {
        // features.weapons.items.push(item);
        break;
      }
      case "equipment": {
        // features.equipment.items.push(item);
        break;
      }
      case "feat": {
        // const act = item.system.activation;
        // if ( !act.type || (act.type === "none") ) features.passive.items.push(item);
        // else if (act.type === "reaction") features.reactions.items.push(item);
        // else features.actions.items.push(item);
        break;
      }
      default: {
        // totalWeight += getItemWeight(item) * getItemQuantity(item);
        // cargo.cargo.items.push(item);
        const quantity = getItemQuantity(item);
        const weight = getItemWeight(item);

        totalWeight += Math.round(weight * quantity * 100000) / 100000;
      }
    }
  }

  // Update the rendering context data
  // context.features = Object.values(features);
  // context.cargo = Object.values(cargo);
  // context.system.attributes.encumbrance = actorEntity._prepareEncumbrance();

  // actorEntity._prepareEncumbrance();

  const encumbrance = actorEntity.system.attributes.encumbrance;
  return encumbrance;
}
