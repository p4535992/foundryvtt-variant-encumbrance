// Import JavaScript modules
import {
  EncumbranceActorType,
  // EncumbranceActorType,
  EncumbranceBulkData,
  EncumbranceDnd5e,
  EncumbranceFlags,
  EncumbranceMode,
  ENCUMBRANCE_TIERS,
  VariantEncumbranceItemData,
} from './VariantEncumbranceModels';
import Effect from './effects/effect';
import {
  dfQualityLifeActive,
  dfredsConvenientEffectsActive,
  ENCUMBRANCE_STATE,
  invMidiQol,
  invPlusActive,
  daeActive,
} from './modules';
import {
  ActorData,
  ItemData,
} from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/module.mjs';
import EffectInterface from './effects/effect-interface';
import { canvas, game } from './settings';
import CONSTANTS from './constants';
import { error, i18n, isGMConnected } from './lib/lib';
import API from './api';
import EffectHandler from './effects/effect-handler';
import { EffectChangeData } from '@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/effectChangeData';

/* ------------------------------------ */
/* Constants         					*/
/* ------------------------------------ */

export const VariantEncumbranceBulkImpl = {
  updateEncumbrance: async function (
    actorEntity: Actor,
    updatedItems: any[] | undefined,
    updatedEffect?: ActiveEffect | undefined,
    mode?: EncumbranceMode,
  ): Promise<void> {
    if (updatedItems && updatedItems.length > 0) {
      for (let i = 0; i < updatedItems.length; i++) {
        const updatedItem: any = updatedItems ? (<any[]>updatedItems)[i] : undefined;
        await VariantEncumbranceBulkImpl._updateEncumbranceInternal(actorEntity, updatedItem, updatedEffect, mode);
      }
    } else {
      await VariantEncumbranceBulkImpl._updateEncumbranceInternal(actorEntity, undefined, updatedEffect, mode);
    }
  },

  _updateEncumbranceInternal: async function (
    actorEntity: Actor,
    updatedItem: any | undefined,
    updatedEffect?: ActiveEffect | undefined,
    mode?: EncumbranceMode,
  ): Promise<void> {

    if (updatedItem) {
      let itemID: any;
      if (typeof updatedItem === 'string' || updatedItem instanceof String) {
        itemID = <string>updatedItem;
      } else {
        itemID = updatedItem?.id ? updatedItem?.id : updatedItem._id;
      }
      let itemCurrent: Item | undefined = itemID ? <Item>actorEntity.items.get(itemID) : undefined;
      if (!itemCurrent && (updatedItem.id || updatedItem._id)) {
        itemCurrent = updatedItem;
      }
      if (itemCurrent?.type == 'feat' || itemCurrent?.type == 'spell') {
        return;
      }

      if (itemCurrent) {
        if (typeof updatedItem === 'string' || updatedItem instanceof String) {
          // Do nothing
        } else {
          // On update operations, the actorEntity's items have not been updated.
          // Override the entry for this item using the updatedItem data.
          try {
            mergeObject(<ItemData>itemCurrent.data, updatedItem);
          } catch (e) {
            error(e?.message);
          }
        }
        updatedItem = itemCurrent;
      }
    }

    const currentItemId = updatedItem?.id
      ? updatedItem?.id
      : updatedItem?.data?._id
      ? updatedItem?.data?._id
      : updatedItem?._id;
    const inventoryItems: Item[] = [];
    const isAlreadyInActor = <Item>actorEntity.items?.find((itemTmp: Item) => itemTmp.id === currentItemId);
    const physicalItems = ['weapon', 'equipment', 'consumable', 'tool', 'backpack', 'loot'];
    actorEntity.data.items.contents.forEach((im: Item) => {
      if (im && physicalItems.includes(im.type)) {
        if (im.id === currentItemId) {
          if (mode == EncumbranceMode.DELETE) {
            // setProperty(im, 'data.data.bulk', 0);
          } else {
            inventoryItems.push(im);
          }
        } else {
          inventoryItems.push(im);
        }
      }
    });
    if (!isAlreadyInActor) {
      const im = <Item>game.items?.find((itemTmp: Item) => itemTmp.id === currentItemId);
      if (im && physicalItems.includes(im.type)) {
        if (mode == EncumbranceMode.DELETE) {
          // setProperty(im, 'data.data.bulk', 0);
        } else {
          inventoryItems.push(im);
        }
      }
    }

    const encumbrancedataBulk = <EncumbranceBulkData>await actorEntity.getFlag(CONSTANTS.FLAG, EncumbranceFlags.BULK);

    const encumbranceDataBulk = VariantEncumbranceBulkImpl.calculateEncumbrance(actorEntity, inventoryItems);



    const enableVarianEncumbranceEffectsOnActorFlag = <boolean>(
      actorEntity.getFlag(CONSTANTS.FLAG, EncumbranceFlags.ENABLED_AE_BULK)
    );
    if (enableVarianEncumbranceEffectsOnActorFlag) {
      VariantEncumbranceBulkImpl.manageActiveEffect(actorEntity, encumbranceData.encumbranceTier);
    }
  },

  manageActiveEffect: async function (actorEntity: Actor, encumbranceTier: number) {
    let effectEntityPresent: ActiveEffect | undefined;

    for (const effectEntity of actorEntity.effects) {
      const effectNameToSet = effectEntity.name ? effectEntity.name : effectEntity.data.label;

      //const effectIsApplied = await VariantEncumbranceBulkImpl.hasEffectAppliedFromId(effectEntity, actorEntity);

      // Remove AE with empty a label but with flag of variant encumbrance ???
      if (!effectNameToSet && hasProperty(effectEntity.data, `flags.${CONSTANTS.FLAG}`)) {
        await VariantEncumbranceBulkImpl.removeEffectFromId(effectEntity, actorEntity);
        continue;
      }

      if (!effectNameToSet) {
        continue;
      }

      // Remove all encumbrance effect renamed from the player
      if (
        // encumbranceData.encumbranceTier &&
        effectEntity.data.flags &&
        hasProperty(effectEntity.data, `flags.${CONSTANTS.FLAG}`) &&
        effectNameToSet != ENCUMBRANCE_STATE.UNENCUMBERED &&
        effectNameToSet != ENCUMBRANCE_STATE.ENCUMBERED &&
        effectNameToSet != ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED &&
        effectNameToSet != ENCUMBRANCE_STATE.OVERBURDENED
      ) {
        await VariantEncumbranceBulkImpl.removeEffectFromId(effectEntity, actorEntity);
        continue;
      }

      // Remove Old settings
      if (effectEntity.data.flags && hasProperty(effectEntity.data, `flags.VariantEncumbrance`)) {
        await VariantEncumbranceBulkImpl.removeEffectFromId(effectEntity, actorEntity);
        continue;
      }

      // Ignore all non encumbrance effect renamed from the player (again)
      if (
        !hasProperty(effectEntity.data, `flags.${CONSTANTS.FLAG}`) &&
        effectNameToSet != ENCUMBRANCE_STATE.UNENCUMBERED &&
        effectNameToSet != ENCUMBRANCE_STATE.ENCUMBERED &&
        effectNameToSet != ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED &&
        effectNameToSet != ENCUMBRANCE_STATE.OVERBURDENED
      ) {
        continue;
      }

      // Remove encumbrance effect with same name used in this module
      if (
        !hasProperty(effectEntity.data, `flags.${CONSTANTS.FLAG}`) &&
        (effectNameToSet === ENCUMBRANCE_STATE.UNENCUMBERED ||
          effectNameToSet === ENCUMBRANCE_STATE.ENCUMBERED ||
          effectNameToSet === ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED ||
          effectNameToSet === ENCUMBRANCE_STATE.OVERBURDENED)
      ) {
        await VariantEncumbranceBulkImpl.removeEffectFromId(effectEntity, actorEntity);
        continue;
      }

      if (
        hasProperty(effectEntity.data, `flags.${CONSTANTS.FLAG}`) &&
        (effectNameToSet === ENCUMBRANCE_STATE.UNENCUMBERED ||
          effectNameToSet === ENCUMBRANCE_STATE.ENCUMBERED ||
          effectNameToSet === ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED ||
          effectNameToSet === ENCUMBRANCE_STATE.OVERBURDENED)
      ) {
        if (!effectEntityPresent) {
          effectEntityPresent = effectEntity;
        } else {
          await VariantEncumbranceBulkImpl.removeEffectFromId(effectEntity, actorEntity);
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

    if (!game.settings.get(CONSTANTS.MODULE_NAME, 'useVariantEncumbrance')) {
      effectName = ENCUMBRANCE_STATE.UNENCUMBERED;
    }

    if (effectName && effectName != '') {
      if (effectName === effectEntityPresent?.data.label) {
        // Skip if name is the same and the active effect is already present.
      } else {
        if (effectName == ENCUMBRANCE_STATE.UNENCUMBERED) {
          if (effectEntityPresent?.id) {
            const effectIsApplied1 = await VariantEncumbranceBulkImpl.hasEffectAppliedFromId(
              effectEntityPresent,
              actorEntity,
            );
            if (effectIsApplied1) {
              await VariantEncumbranceBulkImpl.removeEffectFromId(<ActiveEffect>effectEntityPresent, actorEntity);
            }
          }
        } else {
          if (effectEntityPresent?.id) {
            const effectIsApplied2 = await VariantEncumbranceBulkImpl.hasEffectAppliedFromId(
              effectEntityPresent,
              actorEntity,
            );
            if (effectIsApplied2) {
              await VariantEncumbranceBulkImpl.removeEffectFromId(<ActiveEffect>effectEntityPresent, actorEntity);
            }
          }
          const effectIsApplied3 = await VariantEncumbranceBulkImpl.hasEffectApplied(effectName, actorEntity);
          if (!effectIsApplied3) {
            const origin = `Actor.${actorEntity.data._id}`;
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
   * @returns {{max: number, value: number, pct: number}}  An object describing the character's encumbrance level
   * @private
   */
  calculateEncumbrance: function (
    actorEntity: Actor,
    // veItemData: VariantEncumbranceItemData | null,
    inventoryItems: Item[],
    // mode?: EncumbranceMode,
  ): EncumbranceBulkData {
    const enableVarianEncumbranceWeightBulkOnActorFlag = <boolean>(
      actorEntity.getFlag(CONSTANTS.FLAG, EncumbranceFlags.ENABLED_WE_BULK)
    );
    if (!enableVarianEncumbranceWeightBulkOnActorFlag) {
      return <EncumbranceBulkData>actorEntity.getFlag(CONSTANTS.FLAG, EncumbranceFlags.BULK) || {};
    } else if (enableVarianEncumbranceWeightBulkOnActorFlag) {
      const invPlusCategoriesWeightToAdd = new Map<string, number>();

      // START TOTAL WEIGHT
      // Get the total weight from items
      const physicalItems = ['weapon', 'equipment', 'consumable', 'tool', 'backpack', 'loot'];
      // let totalWeight: number = actorEntity.data.items.reduce((weight, item) => {
      let totalWeight: number = inventoryItems.reduce((weight, item) => {
        if (!physicalItems.includes(item.type)) {
          return weight;
        }

        const itemQuantity =
          //@ts-ignore
          (item.data.quantity && item.data.quantity != item.data.data?.quantity
            ? //@ts-ignore
              item.data.quantity
            : //@ts-ignore
              item.data.data?.quantity) || 0;

        let itemWeight =
          //@ts-ignore
          (item.data.bulk && item.data.bulk != item.data.data?.bulk
            ? //@ts-ignore
              item.data.bulk
            : //@ts-ignore
              item.data.data?.bulk) || 0;

        let ignoreEquipmentCheck = false;

        // External modules calculation

        // Start Item container check
        if (
          getProperty(item, 'data.flags.itemcollection.bagWeight') != null &&
          getProperty(item, 'data.flags.itemcollection.bagWeight') != undefined
        ) {
          const weightless = getProperty(item, 'data.data.capacity.weightless') ?? false;
          if (weightless) {
            itemWeight = getProperty(item, 'data.flags.itemcollection.bagWeight');
          } else {
            // itemWeight = calcItemWeight(item) + getProperty(item, 'data.flags.itemcollection.bagWeight');
            // MOD 4535992 Removed variant encumbrance take care of this
            const useEquippedUnequippedItemCollectionFeature = <boolean>(
              game.settings.get(CONSTANTS.MODULE_NAME, 'useEquippedUnequippedItemCollectionFeature')
            );
            itemWeight = calcWeight(item, useEquippedUnequippedItemCollectionFeature);
            //@ts-ignore
            if (useEquippedUnequippedItemCollectionFeature) {
              ignoreEquipmentCheck = true;
            }
          }
        }
        // End Item container check
        // Start inventory+ module is active
        if (invPlusActive) {
          // Retrieve flag 'categorys' from inventory plus module
          const inventoryPlusCategories = <any[]>actorEntity.getFlag(CONSTANTS.INVENTORY_PLUS_MODULE_NAME, 'categorys');
          if (inventoryPlusCategories) {
            // "weapon", "equipment", "consumable", "tool", "backpack", "loot"
            let actorHasCustomCategories = false;
            for (const categoryId in inventoryPlusCategories) {
              if (
                // This is a error from the inventory plus developer flags stay on 'item.data' not on the 'item'
                //@ts-ignore
                (item.flags &&
                  //@ts-ignore
                  item.flags[CONSTANTS.INVENTORY_PLUS_MODULE_NAME]?.category === categoryId) ||
                (item.data?.flags &&
                  //@ts-ignore
                  item.data?.flags[CONSTANTS.INVENTORY_PLUS_MODULE_NAME]?.category === categoryId) ||
                //@ts-ignore
                (item.data?.data?.flags &&
                  //@ts-ignore
                  item.data?.data?.flags[CONSTANTS.INVENTORY_PLUS_MODULE_NAME]?.category === categoryId)
              ) {
                const section = inventoryPlusCategories[categoryId];
                // Ignore weight
                if (section?.ignoreWeight == true) {
                  itemWeight = 0;
                  ignoreEquipmentCheck = true;
                }
                // Inherent weight
                if (Number(section?.ownWeight) > 0) {
                  if (!invPlusCategoriesWeightToAdd.has(categoryId)) {
                    invPlusCategoriesWeightToAdd.set(categoryId, Number(section.ownWeight));
                  }
                }
                // EXIT FOR
                actorHasCustomCategories = true;
                break;
              }
            }
            if (!actorHasCustomCategories) {
              for (const categoryId in inventoryPlusCategories) {
                if (item.type === categoryId) {
                  const section = inventoryPlusCategories[categoryId];
                  // Ignore weight
                  if (section?.ignoreWeight == true) {
                    itemWeight = 0;
                    ignoreEquipmentCheck = true;
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

        let appliedWeight = itemQuantity * itemWeight;
        if (ignoreEquipmentCheck) {
          return weight + appliedWeight;
        }
        const isEquipped: boolean =
          //@ts-ignore
          (item.data.equipped && item.data.equipped != item.data.data?.equipped
            ? //@ts-ignore
              item.data.equipped
            : //@ts-ignore
              item.data.data?.equipped) || false;
        if (isEquipped) {
          const isProficient: boolean =
            //@ts-ignore
            (item.data.proficient && item.data.proficient != item.data.data?.proficient
              ? //@ts-ignore
                item.data.proficient
              : //@ts-ignore
                item.data.data?.proficient) || false;
          if (isProficient) {
            appliedWeight *= <number>game.settings.get(CONSTANTS.MODULE_NAME, 'profEquippedMultiplier');
          } else {
            appliedWeight *= <number>game.settings.get(CONSTANTS.MODULE_NAME, 'equippedMultiplier');
          }
        } else {
          appliedWeight *= <number>game.settings.get(CONSTANTS.MODULE_NAME, 'unequippedMultiplier');
        }
        return weight + appliedWeight;
      }, 0);

      // Start inventory+ module is active 2
      if (invPlusActive) {
        for (const [key, value] of invPlusCategoriesWeightToAdd) {
          totalWeight = totalWeight + value;
        }
      }
      // End inventory+ module is active 2
      // END TOTAL WEIGHT

      // [Optional] add Currency Weight (for non-transformed actors)
      //@ts-ignore
      if (game.settings.get('dnd5e', 'currencyWeight') && actorEntity.data.data.currency) {
        //@ts-ignore
        const currency = actorEntity.data.data.currency;
        const numCoins = <number>(
          Object.values(currency).reduce((val: any, denom: any) => (val += Math.max(denom, 0)), 0)
        );

        const currencyPerWeight = game.settings.get('dnd5e', 'metricWeightUnits')
          ? game.settings.get(CONSTANTS.MODULE_NAME, 'fakeMetricSystem')
            ? <number>game.settings.get(CONSTANTS.MODULE_NAME, 'currencyWeight')
            : <number>game.settings.get(CONSTANTS.MODULE_NAME, 'currencyWeightMetric')
          : <number>game.settings.get(CONSTANTS.MODULE_NAME, 'currencyWeight');

        totalWeight += numCoins / currencyPerWeight;
      }

      // Compute Encumbrance percentage
      totalWeight = totalWeight.toNearest(0.1);

      let speedDecrease = 0;

      let modForSize = 1; //actorEntity.data.data.abilities.str.value;
      if (game.settings.get(CONSTANTS.MODULE_NAME, 'sizeMultipliers')) {
        //@ts-ignore
        const size = actorEntity.data.data.traits.size;
        if (size === 'tiny') {
          modForSize *= 0.5;
        } else if (size === 'sm') {
          modForSize *= 1;
        } else if (size === 'med') {
          modForSize *= 1;
        } else if (size === 'lg') {
          modForSize *= 2;
        } else if (size === 'huge') {
          modForSize *= 4;
        } else if (size === 'grg') {
          modForSize *= 8;
        } else {
          modForSize *= 1;
        }
        // Powerful build support
        //@ts-ignore
        if (actorEntity.data?.flags?.dnd5e?.powerfulBuild) {
          //jshint ignore:line
          // mod *= 2;
          modForSize = Math.min(modForSize * 2, 8);
        }
      }

      let strengthMultiplier = 1;
      if (game.settings.get(CONSTANTS.MODULE_NAME, 'useStrengthMultiplier')) {
        strengthMultiplier = game.settings.get('dnd5e', 'metricWeightUnits')
          ? game.settings.get(CONSTANTS.MODULE_NAME, 'fakeMetricSystem')
            ? <number>game.settings.get(CONSTANTS.MODULE_NAME, 'strengthMultiplier')
            : <number>game.settings.get(CONSTANTS.MODULE_NAME, 'strengthMultiplierMetric')
          : <number>game.settings.get(CONSTANTS.MODULE_NAME, 'strengthMultiplier');
      }

      let displayedUnits = game.settings.get('dnd5e', 'metricWeightUnits')
        ? <string>game.settings.get(CONSTANTS.MODULE_NAME, 'unitsMetric')
        : <string>game.settings.get(CONSTANTS.MODULE_NAME, 'units');

      const lightMultiplier = game.settings.get('dnd5e', 'metricWeightUnits')
        ? game.settings.get(CONSTANTS.MODULE_NAME, 'fakeMetricSystem')
          ? <number>game.settings.get(CONSTANTS.MODULE_NAME, 'lightMultiplier')
          : <number>game.settings.get(CONSTANTS.MODULE_NAME, 'lightMultiplierMetric')
        : <number>game.settings.get(CONSTANTS.MODULE_NAME, 'lightMultiplier');
      let lightMax = lightMultiplier; // lightMultiplier * strengthScore;

      const mediumMultiplier = game.settings.get('dnd5e', 'metricWeightUnits')
        ? game.settings.get(CONSTANTS.MODULE_NAME, 'fakeMetricSystem')
          ? <number>game.settings.get(CONSTANTS.MODULE_NAME, 'mediumMultiplier')
          : <number>game.settings.get(CONSTANTS.MODULE_NAME, 'mediumMultiplierMetric')
        : <number>game.settings.get(CONSTANTS.MODULE_NAME, 'mediumMultiplier');
      let mediumMax = mediumMultiplier; // mediumMultiplier * strengthScore;

      const heavyMultiplier = game.settings.get('dnd5e', 'metricWeightUnits')
        ? game.settings.get(CONSTANTS.MODULE_NAME, 'fakeMetricSystem')
          ? <number>game.settings.get(CONSTANTS.MODULE_NAME, 'heavyMultiplier')
          : <number>game.settings.get(CONSTANTS.MODULE_NAME, 'heavyMultiplierMetric')
        : <number>game.settings.get(CONSTANTS.MODULE_NAME, 'heavyMultiplier');
      let heavyMax = heavyMultiplier; // heavyMultiplier * strengthScore;

      let max = 0;
      let pct = 0;
      const totalWeightOriginal = totalWeight;

      if (actorEntity.type == EncumbranceActorType.CHARACTER) {
        // ==================
        // CHARACTER
        // ==================
        // const max = (actorEntity.data.data.abilities.str.value * strengthMultiplier * modForSize).toNearest(0.1);
        //@ts-ignore
        max = actorEntity.data.data.abilities.str.value * strengthMultiplier * modForSize;
        pct = Math.clamped((totalWeight * 100) / max, 0, 100);
        //@ts-ignore
        const strengthScore = actorEntity.data.data.abilities.str.value * strengthMultiplier * modForSize;
        lightMax = lightMultiplier * strengthScore;
        mediumMax = mediumMultiplier * strengthScore;
        heavyMax = heavyMultiplier * strengthScore;
      } else if (actorEntity.type == EncumbranceActorType.VEHICLE) {
        // ===============================
        // VEHICLE
        // ===============================
        // MOD 4535992 FROM 2000 to 1 SO I REMOVED ???
        /*
        const vehicleWeightMultiplier = game.settings.get('dnd5e', 'metricWeightUnits')
          ? (game.settings.get(CONSTANTS.MODULE_NAME, 'fakeMetricSystem')
            ? <number>game.settings.get(CONSTANTS.MODULE_NAME, 'vehicleWeightMultiplier')
            :<number>game.settings.get(CONSTANTS.MODULE_NAME, 'vehicleWeightMultiplierMetric')
          )
          : <number>game.settings.get(CONSTANTS.MODULE_NAME, 'vehicleWeightMultiplier');

        // Vehicle weights are an order of magnitude greater.

        totalWeight /= vehicleWeightMultiplier;
        */
        // TODO
        //totalWeight /= <number>this.document.getFlag(SETTINGS.MOD_NAME, 'unit') || vehicleWeightMultiplier;

        // Integration with DragonFlagon Quality of Life, Vehicle Cargo Capacity Unit Feature
        if (dfQualityLifeActive && actorEntity.getFlag(CONSTANTS.DF_QUALITY_OF_LIFE_MODULE_NAME, `unit`)) {
          const dfVehicleUnit = actorEntity.getFlag(CONSTANTS.DF_QUALITY_OF_LIFE_MODULE_NAME, `unit`);
          switch (dfVehicleUnit) {
            case 2240:
              totalWeight /= dfVehicleUnit;
              displayedUnits = 'L.Ton';
              break;
            case 2000:
              totalWeight /= dfVehicleUnit;
              displayedUnits = 'S.Ton';
              break;
            case 1:
              totalWeight /= dfVehicleUnit;
              displayedUnits = 'lbs';
              break;
          }
        } else if (dfQualityLifeActive && actorEntity.getFlag(CONSTANTS.MODULE_NAME, EncumbranceFlags.DATA)) {
          const encumbranceData = <EncumbranceBulkData>actorEntity.getFlag(CONSTANTS.MODULE_NAME, EncumbranceFlags.DATA);
          const dfVehicleUnitLabel = encumbranceData.unit;
          switch (dfVehicleUnitLabel) {
            case 'L.Ton':
              totalWeight /= 2240;
              displayedUnits = 'L.Ton';
              break;
            case 'S.Ton':
              totalWeight /= 2000;
              displayedUnits = 'S.Ton';
              break;
            case 'lbs':
              totalWeight /= 1;
              displayedUnits = 'lbs';
              break;
            default:
              totalWeight /= 1;
              displayedUnits = 'lbs';
              break;
          }
        }
        //@ts-ignore
        const capacityCargo = <number>actorEntity.data.data.attributes.capacity.cargo;
        // Compute overall encumbrance
        // const max = actorData.data.attributes.capacity.cargo;
        max = capacityCargo * strengthMultiplier * modForSize;
        pct = Math.clamped((totalWeightOriginal * 100) / max, 0, 100);
        // Manage vehicle specific case
        // lightMax = lightMultiplier * capacityCargo * strengthMultiplier * modForSize;
        // mediumMax = mediumMultiplier * capacityCargo * strengthMultiplier * modForSize;
        // heavyMax = heavyMultiplier * capacityCargo * strengthMultiplier * modForSize;
        lightMax = capacityCargo * strengthMultiplier * modForSize * 0.33;
        mediumMax = capacityCargo * strengthMultiplier * modForSize * 0.66;
        heavyMax = capacityCargo * strengthMultiplier * modForSize;
      } else {
        // ===========================
        // NO CHARACTER, NO VEHICLE (BY DEFAULT THE CHARACTER)
        // ===========================
        // const max = (actorEntity.data.data.abilities.str.value * strengthMultiplier * modForSize).toNearest(0.1);
        //@ts-ignore
        max = actorEntity.data.data.abilities.str.value * strengthMultiplier * modForSize;
        pct = Math.clamped((totalWeight * 100) / max, 0, 100);
        //@ts-ignore
        const strengthScore = actorEntity.data.data.abilities.str.value * strengthMultiplier * modForSize;
        lightMax = lightMultiplier * strengthScore;
        mediumMax = mediumMultiplier * strengthScore;
        heavyMax = heavyMultiplier * strengthScore;
      }

      let encumbranceTier = ENCUMBRANCE_TIERS.NONE;
      // if (totalWeight > lightMax && totalWeight <= mediumMax) {
      //   speedDecrease = <number>game.settings.get(CONSTANTS.MODULE_NAME, 'lightWeightDecreaseBulk');
      //   encumbranceTier = ENCUMBRANCE_TIERS.LIGHT;
      // }
      // if (totalWeight > mediumMax && totalWeight <= heavyMax) {
      //   speedDecrease = <number>game.settings.get(CONSTANTS.MODULE_NAME, 'heavyWeightDecreaseBulk')
      //   encumbranceTier = ENCUMBRANCE_TIERS.HEAVY;
      // }
      // if (totalWeight > heavyMax) {
      //   encumbranceTier = ENCUMBRANCE_TIERS.MAX;
      // }
      if (totalWeight > lightMax && totalWeight <= heavyMax) {
        speedDecrease = <number>game.settings.get(CONSTANTS.MODULE_NAME, 'lightWeightDecreaseBulk');
        encumbranceTier = ENCUMBRANCE_TIERS.LIGHT;
      }
      if (totalWeight > heavyMax) {
        encumbranceTier = ENCUMBRANCE_TIERS.MAX;
      }

      // Inventory encumbrance
      // actorEntity.data.data.attributes.encumbrance = { value: totalWeight.toNearest(0.1), max, pct, encumbered: pct > (200/3) };
      //@ts-ignore
      (<EncumbranceDnd5e>actorEntity.data.data.attributes.encumbrance) = {
        value: totalWeightOriginal.toNearest(0.1),
        max: max.toNearest(0.1),
        pct,
        encumbered: encumbranceTier != ENCUMBRANCE_TIERS.NONE,
      };

      return {
        totalWeight: totalWeightOriginal.toNearest(0.1),
        totalWeightToDisplay: totalWeight.toNearest(0.1),
        lightMax: lightMax.toNearest(0.1),
        mediumMax: mediumMax.toNearest(0.1),
        heavyMax: heavyMax.toNearest(0.1),
        // totalMax: max,
        encumbranceTier: encumbranceTier,
        speedDecrease: speedDecrease,
        unit: displayedUnits,
      };
    } else {
      throw new Error('Something is wrong');
    }
  },

  /**
   * Adds dynamic effects for specific effects
   *
   * @param {Effect} effect - the effect to handle
   * @param {Actor5e} actor - the effected actor
   */
  addDynamicEffects: async function (effectName: string, actor: Actor, speedDecrease: number): Promise<Effect | null> {
    // const invMidiQol = <boolean>game.modules.get(CONSTANTS.MIDI_QOL_MODULE_NAME)?.active;
    switch (effectName.toLowerCase()) {
      case ENCUMBRANCE_STATE.ENCUMBERED.toLowerCase(): {
        const effect = VariantEncumbranceBulkImpl._encumbered();
        const speedDecreased =
          speedDecrease > 0 ? speedDecrease : game.settings.get('dnd5e', 'metricWeightUnits') ? 3 : 10;
        VariantEncumbranceBulkImpl._addEncumbranceEffects(effect, actor, speedDecreased);
        return effect;
      }
      case ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED.toLowerCase(): {
        let effect: Effect;
        if (invMidiQol) {
          effect = VariantEncumbranceBulkImpl._heavilyEncumbered();
        } else {
          effect = VariantEncumbranceBulkImpl._heavilyEncumberedNoMidi();
        }
        const speedDecreased =
          speedDecrease > 0 ? speedDecrease : game.settings.get('dnd5e', 'metricWeightUnits') ? 6 : 20;
        VariantEncumbranceBulkImpl._addEncumbranceEffects(effect, actor, speedDecreased);
        return effect;
      }
      case ENCUMBRANCE_STATE.UNENCUMBERED.toLowerCase(): {
        return null;
      }
      case ENCUMBRANCE_STATE.OVERBURDENED.toLowerCase(): {
        let effect: Effect;
        if (invMidiQol) {
          effect = VariantEncumbranceBulkImpl._overburdenedEncumbered();
        } else {
          effect = VariantEncumbranceBulkImpl._overburdenedEncumberedNoMidi();
        }
        VariantEncumbranceBulkImpl._addEncumbranceEffectsOverburdened(effect, actor);
        return effect;
      }
      default: {
        throw new Error("The effect name '" + effectName + "' is not recognized");
      }
    }
  },

  _encumbered: function (): Effect {
    return new Effect({
      name: ENCUMBRANCE_STATE.ENCUMBERED,
      description: i18n('variant-encumbrance-dnd5e.effect.description.encumbered'),
      icon: 'icons/svg/down.svg',
      isDynamic: true,
      transfer: true,
    });
  },

  _heavilyEncumbered: function (): Effect {
    return new Effect({
      name: ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED,
      description: i18n('variant-encumbrance-dnd5e.effect.description.heavily_encumbered'),
      icon: 'icons/svg/downgrade.svg',
      isDynamic: true,
      transfer: true,
      changes: [
        {
          key: 'flags.midi-qol.disadvantage.attack.all',
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: '1',
        },
        {
          key: 'flags.midi-qol.disadvantage.ability.save.str',
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: '1',
        },
        {
          key: 'flags.midi-qol.disadvantage.ability.save.dex',
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: '1',
        },
        {
          key: 'flags.midi-qol.disadvantage.ability.save.con',
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: '1',
        },
      ],
    });
  },

  _heavilyEncumberedNoMidi: function (): Effect {
    return new Effect({
      name: ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED,
      description: i18n('variant-encumbrance-dnd5e.effect.description.heavily_encumbered'),
      icon: 'icons/svg/downgrade.svg',
      isDynamic: true,
      transfer: true,
      changes: [],
    });
  },

  _overburdenedEncumbered: function (): Effect {
    return new Effect({
      name: ENCUMBRANCE_STATE.OVERBURDENED,
      description: i18n('variant-encumbrance-dnd5e.effect.description.overburdened'),
      // icon: 'icons/svg/hazard.svg',
      icon: 'icons/tools/smithing/anvil.webp',
      isDynamic: true,
      transfer: true,
      changes: [
        {
          key: 'flags.midi-qol.disadvantage.attack.all',
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: '1',
        },
        {
          key: 'flags.midi-qol.disadvantage.ability.save.str',
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: '1',
        },
        {
          key: 'flags.midi-qol.disadvantage.ability.save.dex',
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: '1',
        },
        {
          key: 'flags.midi-qol.disadvantage.ability.save.con',
          mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
          value: '1',
        },
      ],
    });
  },

  _overburdenedEncumberedNoMidi: function (): Effect {
    return new Effect({
      name: ENCUMBRANCE_STATE.OVERBURDENED,
      description: i18n('variant-encumbrance-dnd5e.effect.description.overburdened'),
      // icon: 'icons/svg/hazard.svg',
      icon: 'icons/tools/smithing/anvil.webp',
      isDynamic: true,
      transfer: true,
      changes: [],
    });
  },

  _addEncumbranceEffects: function (effect: Effect, actor: Actor, value: number) {
    //@ts-ignore
    const movement = actor.data.data.attributes.movement;
    // if (!daeActive) {
    effect.changes.push(<EffectChangeData>{
      key: 'data.attributes.movement.burrow',
      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      value: movement.burrow > value ? `-${value}` : `-${movement.burrow}`,
    });

    effect.changes.push(<EffectChangeData>{
      key: 'data.attributes.movement.climb',
      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      value: movement.climb > value ? `-${value}` : `-${movement.climb}`,
    });

    effect.changes.push(<EffectChangeData>{
      key: 'data.attributes.movement.fly',
      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      value: movement.fly > value ? `-${value}` : `-${movement.fly}`,
    });

    effect.changes.push(<EffectChangeData>{
      key: 'data.attributes.movement.swim',
      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      value: movement.swim > value ? `-${value}` : `-${movement.swim}`,
    });

    effect.changes.push(<EffectChangeData>{
      key: 'data.attributes.movement.walk',
      mode: CONST.ACTIVE_EFFECT_MODES.ADD,
      value: movement.walk > value ? `-${value}` : `-${movement.walk}`,
    });
    // THIS IS THE DAE SOLUTION
    // } else {
    //   effect.changes.push({
    //     key: 'data.attributes.movement.all',
    //     mode: CONST.ACTIVE_EFFECT_MODES.CUSTOM,
    //     value: value ? `-${value}` : `-0`,
    //     priority: 5,
    //   });
    // }
  },

  _addEncumbranceEffectsOverburdened: function (effect: Effect, actor: Actor) {
    // const movement = actor.data.data.attributes.movement;
    // if (!daeActive) {
    effect.changes.push(<EffectChangeData>{
      key: 'data.attributes.movement.burrow',
      mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
      value: '0',
    });

    effect.changes.push(<EffectChangeData>{
      key: 'data.attributes.movement.climb',
      mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
      value: '0',
    });

    effect.changes.push(<EffectChangeData>{
      key: 'data.attributes.movement.fly',
      mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
      value: '0',
    });

    effect.changes.push(<EffectChangeData>{
      key: 'data.attributes.movement.swim',
      mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
      value: '0',
    });

    effect.changes.push(<EffectChangeData>{
      key: 'data.attributes.movement.walk',
      mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
      value: '0',
    });
    // THIS IS THE DAE SOLUTION
    // } else {
    //   effect.changes.push({
    //     key: 'data.attributes.movement.all',
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
  async hasEffectApplied(effectName: string, actor: Actor): Promise<boolean> {
    if (game.settings.get(CONSTANTS.MODULE_NAME, 'doNotUseSocketLibFeature') || !isGMConnected()) {
      return await (<EffectHandler>(<any>API.effectInterface)._effectHandler).hasEffectAppliedOnActor(
        effectName,
        <string>actor.id,
        true,
      );
    } else {
      return await API.hasEffectAppliedOnActor(<string>actor.id, effectName, true);
    }
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
  async hasEffectAppliedFromId(effect: ActiveEffect, actor: Actor): Promise<boolean> {
    if (game.settings.get(CONSTANTS.MODULE_NAME, 'doNotUseSocketLibFeature') || !isGMConnected()) {
      return await (<EffectHandler>(<any>API.effectInterface)._effectHandler).hasEffectAppliedFromIdOnActor(
        <string>effect.id,
        <string>actor.id,
        true,
      );
    } else {
      return await API.hasEffectAppliedFromIdOnActor(<string>actor.id, <string>effect.id, true);
    }
  },

  /**
   * Removes the effect with the provided name from an actor matching the
   * provided UUID
   *
   * @param {string} effectName - the name of the effect to remove
   * @param {string} uuid - the uuid of the actor to remove the effect from
   */
  async removeEffect(effectName: string, actor: Actor) {
    if (game.settings.get(CONSTANTS.MODULE_NAME, 'doNotUseSocketLibFeature') || !isGMConnected()) {
      return await (<EffectHandler>(<any>API.effectInterface)._effectHandler).removeEffectOnActor(
        effectName,
        <string>actor.id,
      );
    } else {
      return await API.removeEffectOnActor(<string>actor.id, effectName);
    }
  },

  /**
   * Removes the effect with the provided name from an actor matching the
   * provided UUID
   *
   * @param {string} effectName - the name of the effect to remove
   * @param {string} uuid - the uuid of the actor to remove the effect from
   */
  async removeEffectFromId(effectToRemove: ActiveEffect, actor: Actor) {
    if (game.settings.get(CONSTANTS.MODULE_NAME, 'doNotUseSocketLibFeature') || !isGMConnected()) {
      return await (<EffectHandler>(<any>API.effectInterface)._effectHandler).removeEffectFromIdOnActor(
        <string>effectToRemove.id,
        <string>actor.id,
      );
    } else {
      return await API.removeEffectFromIdOnActor(<string>actor.id, <string>effectToRemove.id);
    }
  },

  /**
   * Adds the effect with the provided name to an actor matching the provided
   * UUID
   *
   * @param {string} effectName - the name of the effect to add
   * @param {string} uuid - the uuid of the actor to add the effect to
   */
  async addEffect(effectName: string, actor: Actor, origin: string, encumbranceTier: number) {
    let speedDecrease: number | null = 0;
    if (encumbranceTier == ENCUMBRANCE_TIERS.NONE) {
      speedDecrease = 0;
    } else if (encumbranceTier == ENCUMBRANCE_TIERS.LIGHT) {
      speedDecrease = game.settings.get('dnd5e', 'metricWeightUnits')
        ? <number>game.settings.get(CONSTANTS.MODULE_NAME, 'lightWeightDecreaseMetric')
        : <number>game.settings.get(CONSTANTS.MODULE_NAME, 'lightWeightDecrease');
    } else if (encumbranceTier == ENCUMBRANCE_TIERS.HEAVY) {
      speedDecrease = game.settings.get('dnd5e', 'metricWeightUnits')
        ? <number>game.settings.get(CONSTANTS.MODULE_NAME, 'heavyWeightDecreaseMetric')
        : <number>game.settings.get(CONSTANTS.MODULE_NAME, 'heavyWeightDecrease');
    } else if (encumbranceTier == ENCUMBRANCE_TIERS.MAX) {
      speedDecrease = null;
    }
    // let effect = VariantEncumbranceBulkImpl.findEffectByName(effectName, actor.id);
    //const actor = await VariantEncumbranceBulkImpl._foundryHelpers.getActorByUuid(uuid);
    // if (effect.isDynamic) {
    const effect = <Effect>await VariantEncumbranceBulkImpl.addDynamicEffects(effectName, actor, <number>speedDecrease);
    // }
    if (effect) {
      effect.flags = {
        'variant-encumbrance-dnd5e': {
          tier: encumbranceTier,
        },
      };
      effect.isTemporary = true;
      if (game.settings.get(CONSTANTS.MODULE_NAME, 'doNotUseSocketLibFeature') || !isGMConnected()) {
        return await (<EffectHandler>(<any>API.effectInterface)._effectHandler).addEffectOnActor(
          effectName,
          <string>actor.id,
          '',
          false,
          effect,
        );
      } else {
        return await API.addEffectOnActor(<string>actor.id, effectName, effect);
      }
    }
  },
};

export const isEnabledActorType = function (actorEntity: Actor): boolean {
  const useVarianEncumbranceWithSpecificType: string[] = game.settings.get(
    CONSTANTS.MODULE_NAME,
    'useVarianEncumbranceWithSpecificType',
  )
    ? String(game.settings.get(CONSTANTS.MODULE_NAME, 'useVarianEncumbranceWithSpecificType')).split(',')
    : [];
  if (
    actorEntity &&
    useVarianEncumbranceWithSpecificType.length > 0 &&
    useVarianEncumbranceWithSpecificType.includes(<string>actorEntity?.type)
  ) {
    return true;
  }
  return false;
};

// ===========================
// Item Collection/Container SUPPORT
// ===========================

function calcWeight(
  item: Item,
  useEquippedUnequippedItemCollectionFeature: boolean,
  { ignoreItems, ignoreTypes } = { ignoreItems: undefined, ignoreTypes: undefined },
) {
  if (item.type !== 'backpack' || !item.data.flags.itemcollection) return calcItemWeight(item);
  // if (item.parent instanceof Actor && !item.data.data.equipped) return 0;
  // MOD 4535992 Removed variant encumbrance take care of this
  // const useEquippedUnequippedItemCollectionFeature = game.settings.get(
  //   CONSTANTS.MODULE_NAME,
  //   'useEquippedUnequippedItemCollectionFeature',
  // );
  const isEquipped: boolean =
    //@ts-ignore
    (item.data.equipped && item.data.equipped != item.data.data?.equipped
      ? //@ts-ignore
        item.data.equipped
      : //@ts-ignore
        item.data.data?.equipped) || false;
  //@ts-ignore
  if (useEquippedUnequippedItemCollectionFeature && !isEquipped) {
    return 0;
  }
  // END MOD 4535992
  const weightless = getProperty(item, 'data.data.capacity.weightless') ?? false;
  if (weightless) return getProperty(item, 'data.flags.itemcollection.bagWeight') ?? 0;
  return (
    calcItemWeight(item, { ignoreItems, ignoreTypes }) + (getProperty(item, 'data.flags.itemcollection.bagWeight') ?? 0)
  );
}

function calcItemWeight(item: Item, { ignoreItems, ignoreTypes } = { ignoreItems: undefined, ignoreTypes: undefined }) {
  //@ts-ignore
  if (item.type !== 'backpack' || item.items === undefined) return _calcItemWeight(item);
  //@ts-ignore
  let weight = item.items.reduce((acc, item) => {
    //@ts-ignore
    if (ignoreTypes?.some((name) => item.name.includes(name))) return acc;
    //@ts-ignore
    if (ignoreItems?.includes(item.name)) return acc;
    return acc + (item.calcWeight() ?? 0);
  }, (item.type === 'backpack' ? 0 : _calcItemWeight(item)) ?? 0);
  // [Optional] add Currency Weight (for non-transformed actors)
  //@ts-ignore
  if (game.settings.get('dnd5e', 'currencyWeight') && item.data.data.currency) {
    //@ts-ignore
    const currency = item.data.data.currency ?? {};
    const numCoins = <number>Object.values(currency).reduce((val: any, denom: any) => (val += Math.max(denom, 0)), 0);

    const currencyPerWeight = game.settings.get('dnd5e', 'metricWeightUnits')
      ? game.settings.get(CONSTANTS.MODULE_NAME, 'fakeMetricSystem')
        ? <number>game.settings.get(CONSTANTS.MODULE_NAME, 'currencyWeight')
        : <number>game.settings.get(CONSTANTS.MODULE_NAME, 'currencyWeightMetric')
      : <number>game.settings.get(CONSTANTS.MODULE_NAME, 'currencyWeight');

    weight = Math.round(weight + numCoins / currencyPerWeight);
  } else {
    //@ts-ignore
    const currency = item.data.data.currency ?? {};
    const numCoins = currency ? Object.keys(currency).reduce((val, denom) => val + currency[denom], 0) : 0;
    weight = Math.round(weight + numCoins / 50);
  }
  return weight;
}

function _calcItemWeight(item: Item) {
  // const quantity = item.data.data.quantity || 1;
  // const weight = item.data.data.bulk || 0;
  const quantity =
    //@ts-ignore
    (item.data.quantity && item.data.quantity != item.data.data?.quantity
      ? //@ts-ignore
        item.data.quantity
      : //@ts-ignore
        item.data.data?.quantity) || 0;
  const weight =
    //@ts-ignore
    (item.data.bulk && item.data.bulk != item.data.data?.bulk
      ? //@ts-ignore
        item.data.bulk
      : //@ts-ignore
        item.data.data?.bulk) || 0;
  return Math.round(weight * quantity * 100) / 100;
}
