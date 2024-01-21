import { isEmptyObject } from "jquery";
import { calcWeightItemCollection, isEnabledActorType } from "../VariantEncumbranceImpl.mjs";
import CONSTANTS from "../constants.mjs";
import {
  calculateBackPackManagerBulk,
  calculateBackPackManagerWeight,
  getItemBulk,
  getItemQuantity,
  getItemWeight,
  retrieveBackPackManagerItem,
} from "./lib.mjs";
import { invPlusActive } from "../modules.mjs";
import { getPropertyPatched, hasPropertyPatched } from "./foundryvtt-utils-patched";
import Logger from "./Logger";

export class VariantEncumbranceDnd5eHelpers {
  static manageCustomCodeFeature(item, itemWeight) {}
  static manageEquippedAndUnEquippedFeature(item, itemWeight) {
    const disableEquippedUnequippedProficientWeightManagement = game.settings.get(
      CONSTANTS.MODULE_ID,
      "disableEquippedUnequippedProficientWeightManagement"
    );
    if (disableEquippedUnequippedProficientWeightManagement) {
      Logger.debug(`manageEquippedAndUnEquippedFeature | DISABLE`);
      return itemWeight;
    }
    const itemWeightOri = itemWeight;
    const isEquipped = item.system.equipped ? true : false;
    const isProficient = item.system.proficient === 1 ? true : false;

    const profEquippedMultiplier = game.settings.get(CONSTANTS.MODULE_ID, "profEquippedMultiplier");
    const equippedMultiplier = game.settings.get(CONSTANTS.MODULE_ID, "equippedMultiplier");
    const unequippedMultiplier = game.settings.get(CONSTANTS.MODULE_ID, "unequippedMultiplier");

    const applyWeightMultiplierForEquippedArmor = game.settings.get(
      CONSTANTS.MODULE_ID,
      "applyWeightMultiplierForEquippedArmor"
    );
    const applyWeightMultiplierForEquippedArmorClothing = game.settings.get(
      CONSTANTS.MODULE_ID,
      "applyWeightMultiplierForEquippedArmorClothing"
    );
    const applyWeightMultiplierForEquippedArmorLight = game.settings.get(
      CONSTANTS.MODULE_ID,
      "applyWeightMultiplierForEquippedArmorLight"
    );
    const applyWeightMultiplierForEquippedArmorMedium = game.settings.get(
      CONSTANTS.MODULE_ID,
      "applyWeightMultiplierForEquippedArmorMedium"
    );
    const applyWeightMultiplierForEquippedArmorHeavy = game.settings.get(
      CONSTANTS.MODULE_ID,
      "applyWeightMultiplierForEquippedArmorHeavy"
    );
    const applyWeightMultiplierForEquippedArmorNatural = game.settings.get(
      CONSTANTS.MODULE_ID,
      "applyWeightMultiplierForEquippedArmorNatural"
    );

    const applyWeightMultiplierForProficientArmor = game.settings.get(
      CONSTANTS.MODULE_ID,
      "applyWeightMultiplierForProficientArmor"
    );
    const applyWeightMultiplierForProficientArmorClothing = game.settings.get(
      CONSTANTS.MODULE_ID,
      "applyWeightMultiplierForProficientArmorClothing"
    );
    const applyWeightMultiplierForProficientArmorLight = game.settings.get(
      CONSTANTS.MODULE_ID,
      "applyWeightMultiplierForProficientArmorLight"
    );
    const applyWeightMultiplierForProficientArmorMedium = game.settings.get(
      CONSTANTS.MODULE_ID,
      "applyWeightMultiplierForProficientArmorMedium"
    );
    const applyWeightMultiplierForProficientArmorHeavy = game.settings.get(
      CONSTANTS.MODULE_ID,
      "applyWeightMultiplierForProficientArmorHeavy"
    );
    const applyWeightMultiplierForProficientArmorNatural = game.settings.get(
      CONSTANTS.MODULE_ID,
      "applyWeightMultiplierForProficientArmorNatural"
    );

    const applyWeightMultiplierForEquippedWeapon = game.settings.get(
      CONSTANTS.MODULE_ID,
      "applyWeightMultiplierForEquippedWeapon"
    );

    const applyWeightMultiplierForProficientWeapon = game.settings.get(
      CONSTANTS.MODULE_ID,
      "applyWeightMultiplierForProficientWeapon"
    );

    //const doNotApplyWeightForEquippedArmor = String(applyWeightMultiplierForEquippedArmor) === "0";
    //const doNotApplyWeightForProficientArmor = String(applyWeightMultiplierForProficientArmor) === "0";

    const itemArmorTypes = ["clothing", "light", "medium", "heavy", "natural"];
    const isArmor = itemArmorTypes.includes(item.system.armor?.type);
    const isWeapon = item.type === "weapon";

    // ==============================
    // if is a loot ignore any equipped or unequipped
    // ==============================
    if (item.type === "loot") {
      // DO NOTHING
      Logger.debug(
        `manageEquippedAndUnEquippedFeature | LOOT | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
      );
    }
    // ==============================
    // If is equipped and is a weapon
    // ==============================
    else if (isEquipped && isWeapon) {
      Logger.debug(
        `manageEquippedAndUnEquippedFeature | 20 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
      );
      // If the homebrew feature equipped is enabled
      if (applyWeightMultiplierForEquippedWeapon > 0) {
        if (isProficient) {
          // If the homebrew feature proficient is enabled
          if (applyWeightMultiplierForProficientWeapon > 0) {
            Logger.debug(
              `manageEquippedAndUnEquippedFeature | 21 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`
            );
            itemWeight *= applyWeightMultiplierForProficientWeapon;
          } else if (applyWeightMultiplierForProficientWeapon === 0) {
            Logger.debug(
              `manageEquippedAndUnEquippedFeature | 22 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`
            );
            itemWeight *= 0;
          } else {
            Logger.debug(
              `manageEquippedAndUnEquippedFeature | 23 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`
            );
            itemWeight *= profEquippedMultiplier;
          }
        } else {
          Logger.debug(
            `manageEquippedAndUnEquippedFeature | 24 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`
          );
          itemWeight *= applyWeightMultiplierForEquippedWeapon;
        }
      } else if (applyWeightMultiplierForEquippedWeapon === 0) {
        Logger.debug(
          `manageEquippedAndUnEquippedFeature | 25 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`
        );
        if (isProficient) {
          Logger.debug(
            `manageEquippedAndUnEquippedFeature | 26 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`
          );
          // If the homebrew feature proficient is enabled
          if (applyWeightMultiplierForProficientWeapon > 0) {
            Logger.debug(
              `manageEquippedAndUnEquippedFeature | 26.1 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`
            );
            itemWeight *= applyWeightMultiplierForProficientWeapon;
          } else if (applyWeightMultiplierForProficientWeapon === 0) {
            Logger.debug(
              `manageEquippedAndUnEquippedFeature | 27 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`
            );
            itemWeight *= 0;
          } else {
            Logger.debug(
              `manageEquippedAndUnEquippedFeature | 28 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`
            );
            itemWeight *= profEquippedMultiplier;
          }
        } else {
          Logger.debug(
            `manageEquippedAndUnEquippedFeature | 29 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`
          );
          itemWeight *= 0;
        }
      } else {
        Logger.debug(
          `manageEquippedAndUnEquippedFeature | 30 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`
        );
        if (isProficient) {
          Logger.debug(
            `manageEquippedAndUnEquippedFeature | 31 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`
          );
          // If the homebrew feature proficient is enabled
          if (applyWeightMultiplierForProficientWeapon > 0) {
            Logger.debug(
              `manageEquippedAndUnEquippedFeature | 31.1 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`
            );
            itemWeight *= applyWeightMultiplierForProficientWeapon;
          } else if (applyWeightMultiplierForProficientWeapon === 0) {
            Logger.debug(
              `manageEquippedAndUnEquippedFeature | 32.6 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`
            );
            itemWeight *= 0;
          } else {
            Logger.debug(
              `manageEquippedAndUnEquippedFeature | 33 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`
            );
            itemWeight *= profEquippedMultiplier;
          }
        } else {
          Logger.debug(
            `manageEquippedAndUnEquippedFeature | 34 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`
          );
          itemWeight *= equippedMultiplier;
        }
      }
    }
    // ==============================
    // If is equipped and is a armor
    // ==============================
    else if (isEquipped && isArmor) {
      Logger.debug(
        `manageEquippedAndUnEquippedFeature | 0 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
      );
      // If the homebrew feature equipped is enabled
      if (applyWeightMultiplierForEquippedArmor > 0) {
        if (isProficient) {
          // If the homebrew feature proficient is enabled
          if (applyWeightMultiplierForProficientArmor > 0) {
            Logger.debug(
              `manageEquippedAndUnEquippedFeature | 1 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
            );
            itemWeight *= applyWeightMultiplierForProficientArmor;
          } else if (applyWeightMultiplierForProficientArmor === 0) {
            Logger.debug(
              `manageEquippedAndUnEquippedFeature | 2 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
            );
            if (item.system.armor?.type === "clothing") {
              Logger.debug(
                `manageEquippedAndUnEquippedFeature | 2.1 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= applyWeightMultiplierForProficientArmorClothing;
            } else if (item.system.armor?.type === "light") {
              Logger.debug(
                `manageEquippedAndUnEquippedFeature | 2.2 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= applyWeightMultiplierForProficientArmorLight;
            } else if (item.system.armor?.type === "medium") {
              Logger.debug(
                `manageEquippedAndUnEquippedFeature | 2.3 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= applyWeightMultiplierForProficientArmorMedium;
            } else if (item.system.armor?.type === "heavy") {
              Logger.debug(
                `manageEquippedAndUnEquippedFeature | 2.4 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= applyWeightMultiplierForProficientArmorHeavy;
            } else if (item.system.armor?.type === "natural") {
              Logger.debug(
                `manageEquippedAndUnEquippedFeature | 2.5 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= applyWeightMultiplierForProficientArmorNatural;
            } else {
              Logger.debug(
                `manageEquippedAndUnEquippedFeature | 2.6 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= 0;
            }
          } else {
            Logger.debug(
              `manageEquippedAndUnEquippedFeature | 3 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
            );
            itemWeight *= profEquippedMultiplier;
          }
        } else {
          Logger.debug(
            `manageEquippedAndUnEquippedFeature | 4 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
          );
          itemWeight *= applyWeightMultiplierForEquippedArmor;
        }
      } else if (applyWeightMultiplierForEquippedArmor === 0) {
        Logger.debug(
          `manageEquippedAndUnEquippedFeature | 5 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
        );
        if (isProficient) {
          Logger.debug(
            `manageEquippedAndUnEquippedFeature | 6 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
          );
          // If the homebrew feature proficient is enabled
          if (applyWeightMultiplierForProficientArmor > 0) {
            Logger.debug(
              `manageEquippedAndUnEquippedFeature | 6.1 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
            );
            itemWeight *= applyWeightMultiplierForProficientArmor;
          } else if (applyWeightMultiplierForProficientArmor === 0) {
            Logger.debug(
              `manageEquippedAndUnEquippedFeature | 7 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
            );
            if (item.system.armor?.type === "clothing") {
              Logger.debug(
                `manageEquippedAndUnEquippedFeature | 7.1 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= applyWeightMultiplierForProficientArmorClothing;
            } else if (item.system.armor?.type === "light") {
              Logger.debug(
                `manageEquippedAndUnEquippedFeature | 7.2 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= applyWeightMultiplierForProficientArmorLight;
            } else if (item.system.armor?.type === "medium") {
              Logger.debug(
                `manageEquippedAndUnEquippedFeature | 7.3 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= applyWeightMultiplierForProficientArmorMedium;
            } else if (item.system.armor?.type === "heavy") {
              Logger.debug(
                `manageEquippedAndUnEquippedFeature | 7.4 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= applyWeightMultiplierForProficientArmorHeavy;
            } else if (item.system.armor?.type === "natural") {
              Logger.debug(
                `manageEquippedAndUnEquippedFeature | 7.5 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= applyWeightMultiplierForProficientArmorNatural;
            } else {
              Logger.debug(
                `manageEquippedAndUnEquippedFeature | 7.6 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= 0;
            }
          } else {
            Logger.debug(
              `manageEquippedAndUnEquippedFeature | 8 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
            );
            itemWeight *= profEquippedMultiplier;
          }
        } else {
          Logger.debug(
            `manageEquippedAndUnEquippedFeature | 9 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
          );
          if (item.system.armor?.type === "clothing") {
            Logger.debug(
              `manageEquippedAndUnEquippedFeature | 9.1 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
            );
            itemWeight *= applyWeightMultiplierForEquippedArmorClothing;
          } else if (item.system.armor?.type === "light") {
            Logger.debug(
              `manageEquippedAndUnEquippedFeature | 9.2 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
            );
            itemWeight *= applyWeightMultiplierForEquippedArmorLight;
          } else if (item.system.armor?.type === "medium") {
            Logger.debug(
              `manageEquippedAndUnEquippedFeature | 9.3 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
            );
            itemWeight *= applyWeightMultiplierForEquippedArmorMedium;
          } else if (item.system.armor?.type === "heavy") {
            Logger.debug(
              `manageEquippedAndUnEquippedFeature | 9.4 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
            );
            itemWeight *= applyWeightMultiplierForEquippedArmorHeavy;
          } else if (item.system.armor?.type === "natural") {
            Logger.debug(
              `manageEquippedAndUnEquippedFeature | 9.5 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
            );
            itemWeight *= applyWeightMultiplierForEquippedArmorNatural;
          } else {
            Logger.debug(
              `manageEquippedAndUnEquippedFeature | 9.6 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
            );
            itemWeight *= 0;
          }
        }
      } else {
        Logger.debug(
          `manageEquippedAndUnEquippedFeature | 10 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
        );
        if (isProficient) {
          Logger.debug(
            `manageEquippedAndUnEquippedFeature | 11 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
          );
          // If the homebrew feature proficient is enabled
          if (applyWeightMultiplierForProficientArmor > 0) {
            Logger.debug(
              `manageEquippedAndUnEquippedFeature | 11.1 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
            );
            itemWeight *= applyWeightMultiplierForProficientArmor;
          } else if (applyWeightMultiplierForProficientArmor === 0) {
            Logger.debug(
              `manageEquippedAndUnEquippedFeature | 12 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
            );
            if (item.system.armor?.type === "clothing") {
              Logger.debug(
                `manageEquippedAndUnEquippedFeature | 12.1 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= applyWeightMultiplierForProficientArmorClothing;
            } else if (item.system.armor?.type === "light") {
              Logger.debug(
                `manageEquippedAndUnEquippedFeature | 12.2 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= applyWeightMultiplierForProficientArmorLight;
            } else if (item.system.armor?.type === "medium") {
              Logger.debug(
                `manageEquippedAndUnEquippedFeature | 12.3 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= applyWeightMultiplierForProficientArmorMedium;
            } else if (item.system.armor?.type === "heavy") {
              Logger.debug(
                `manageEquippedAndUnEquippedFeature | 12.4 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= applyWeightMultiplierForProficientArmorHeavy;
            } else if (item.system.armor?.type === "natural") {
              Logger.debug(
                `manageEquippedAndUnEquippedFeature | 12.5 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= applyWeightMultiplierForProficientArmorNatural;
            } else {
              Logger.debug(
                `manageEquippedAndUnEquippedFeature | 12.6 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= 0;
            }
          } else {
            Logger.debug(
              `manageEquippedAndUnEquippedFeature | 13 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
            );
            itemWeight *= profEquippedMultiplier;
          }
        } else {
          Logger.debug(
            `manageEquippedAndUnEquippedFeature | 14 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
          );
          itemWeight *= equippedMultiplier;
        }
      }
    }
    // ==============================
    // If is equipped
    // ==============================
    else if (isEquipped) {
      if (isProficient) {
        Logger.debug(
          `manageEquippedAndUnEquippedFeature | 13 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
        );
        itemWeight *= profEquippedMultiplier;
      } else {
        Logger.debug(
          `manageEquippedAndUnEquippedFeature | 14 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
        );
        itemWeight *= equippedMultiplier;
      }
    }
    // ==============================
    // If is unequipped
    // ==============================
    else {
      Logger.debug(
        `manageEquippedAndUnEquippedFeature | 19 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
      );
      itemWeight *= unequippedMultiplier;
    }
    Logger.debug(
      `manageEquippedAndUnEquippedFeature | FINAL | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon} : ${itemWeightOri} => ${itemWeight}`
    );
    return itemWeight;
  }

  static manageItemWeight(item) {
    let itemQuantity = getItemQuantity(item);
    let itemWeight = getItemWeight(item);

    const isEquipped = item.system.equipped ? true : false;
    const isProficient = item.system.proficient === 1 ? true : false;

    let backpackManager = retrieveBackPackManagerItem(item);
    if (backpackManager) {
      // Does the weight of the items in the container carry over to the actor?
      const weightless = getProperty(item, "system.capacity.weightless") ?? false;
      // const backpackManagerWeight =
      // 	API.calculateWeightOnActor(backpackManager)?.totalWeight ?? itemWeight;
      const backpackManagerWeight = calculateBackPackManagerWeight(item, backpackManager, ignoreCurrency);
      itemWeight = weightless ? itemWeight : itemWeight + backpackManagerWeight;

      itemWeight = VariantEncumbranceDnd5eHelpers.manageEquippedAndUnEquippedFeature(item, itemWeight);

      Logger.debug(`Is BackpackManager! Item '${item.name}' : Quantity = ${itemQuantity}, Weight = ${itemWeight}`);
      // mapItemEncumbrance[item.id] = itemQuantity * itemWeight;
      // return itemQuantity * itemWeight;
      return itemWeight;
    }

    Logger.debug(`Item '${item.name}' : Quantity = ${itemQuantity}, Weight = ${itemWeight}`);

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
            // if (!invPlusCategoriesWeightToAdd.has(categoryId)) {
            //   invPlusCategoriesWeightToAdd.set(categoryId, Number(section.ownWeight));
            // }
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
                // if (!invPlusCategoriesWeightToAdd.has(categoryId)) {
                //   invPlusCategoriesWeightToAdd.set(categoryId, Number(section.ownWeight));
                // }
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
        `Item '${item.name}', Equipped '${isEquipped}', Proficient ${isProficient} :
           1 * ${itemWeight} = ${appliedWeight}`
      );
    } else {
      appliedWeight = itemQuantity * itemWeight;
      Logger.debug(
        `Item '${item.name}', Equipped '${isEquipped}', Proficient ${isProficient} :
           ${itemQuantity} * ${itemWeight} = ${appliedWeight}`
      );
    }
    // mapItemEncumbrance[item.id] = appliedWeight;
    // return weight + appliedWeight;
    return itemWeight;
  }

  static manageItemBulk(item) {
    let itemQuantity = getItemQuantity(item);
    let itemWeight = getItemBulk(item);

    const isEquipped = item.system.equipped ? true : false;
    const isProficient = item.system.proficient === 1 ? true : false;

    let backpackManager = retrieveBackPackManagerItem(item);
    if (backpackManager) {
      // Does the weight of the items in the container carry over to the actor?
      const weightless = getProperty(item, "system.capacity.weightless") ?? false;
      // const backpackManagerWeight =
      // 	API.calculateBulkOnActor(backpackManager)?.totalWeight ?? itemWeight;
      const backpackManagerWeight = calculateBackPackManagerBulk(item, backpackManager, ignoreCurrency);
      itemWeight = weightless ? itemWeight : itemWeight + backpackManagerWeight;

      itemWeight = VariantEncumbranceDnd5eHelpers.manageEquippedAndUnEquippedFeature(item, itemWeight);

      Logger.debug(`Is BackpackManager! Item '${item.name}' : Quantity = ${itemQuantity}, Weight = ${itemWeight}`);
      // mapItemEncumbrance[item.id] = itemQuantity * itemWeight;
      // return itemQuantity * itemWeight;
      return itemWeight;
    }

    Logger.debug(`Item '${item.name}' : Quantity = ${itemQuantity}, Weight = ${itemWeight}`);

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
            // if (!invPlusCategoriesWeightToAdd.has(categoryId)) {
            //   invPlusCategoriesWeightToAdd.set(categoryId, section.ownBulk);
            // }
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
                // if (!invPlusCategoriesWeightToAdd.has(categoryId)) {
                //   invPlusCategoriesWeightToAdd.set(categoryId, section.ownBulk);
                // }
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
        `Item '${item.name}', Equipped '${isEquipped}', Proficient ${isProficient} :
           1 * ${itemWeight} = ${appliedWeight}`
      );
    } else {
      appliedWeight = itemQuantity * itemWeight;
      Logger.debug(
        `Item '${item.name}', Equipped '${isEquipped}', Proficient ${isProficient} :
           ${itemQuantity} * ${itemWeight} = ${appliedWeight}`
      );
    }

    // mapItemEncumbrance[item.id] = appliedWeight;
    // return appliedWeight;
    return itemWeight;
  }

  /**
   *
   * @param {Actor} actorEntity
   * @param {Object} update
   * @returns {{doTheUpdate:boolean, noActiveEffect:boolean}}
   */
  static isAEncumbranceUpdated(actorEntity, update) {
    //  && actorEntity.sheet?.rendered
    if (!actorEntity) {
      return {
        doTheUpdate: false,
        noActiveEffect: true,
      };
    }

    let doTheUpdate = false;
    let noActiveEffect = false;
    if (isEmptyObject(update)) {
      // DO NOTHING
    } else if (isEnabledActorType(actorEntity)) {
      //  && actorEntity.sheet?.rendered

      // mergeObject(itemCurrent.system, updatedItem);
      // For our purpose we filter only the equipped action
      if (hasPropertyPatched(update, `system.quantity`)) {
        doTheUpdate = true;
        noActiveEffect = false;
        Logger.debug(
          `isAEncumbranceUpdated | The update contains key 'system.quantity' => ${getPropertyPatched(
            update,
            `system.quantity`
          )}`
        );
      }
      // For our purpose we filter only the equipped action
      if (hasPropertyPatched(update, `system.weight`)) {
        doTheUpdate = true;
        noActiveEffect = false;
        Logger.debug(
          `isAEncumbranceUpdated | The update contains key 'system.weight' => ${getPropertyPatched(
            update,
            `system.weight`
          )}`
        );
      }
      // For our purpose we filter only the equipped action
      if (hasPropertyPatched(update, `system.equipped`)) {
        doTheUpdate = true;
        noActiveEffect = false;
        Logger.debug(
          `isAEncumbranceUpdated | The update contains key 'system.equipped' => ${getPropertyPatched(
            update,
            `system.equipped`
          )}`
        );
      }
      // For our purpose we filter only the proficient action
      if (hasPropertyPatched(update, `system.proficient`)) {
        doTheUpdate = true;
        noActiveEffect = false;
        Logger.debug(
          `isAEncumbranceUpdated | The update contains key 'system.proficient' => ${getPropertyPatched(
            update,
            `system.proficient`
          )}`
        );
      }
      // For our purpose we filter only the STR modifier action
      //if (update?.system?.abilities?.str) {
      if (hasPropertyPatched(update, `system.abilities.str`)) {
        if (actorEntity.system.abilities.str.value !== getPropertyPatched(update, `system.abilities.str.value`)) {
          actorEntity.system.abilities.str.value = getPropertyPatched(update, `system.abilities.str.value`);
        }
        doTheUpdate = true;
        noActiveEffect = false;
        Logger.debug(
          `isAEncumbranceUpdated | The update contains key 'system.abilities.str' => ${getPropertyPatched(
            update,
            `system.abilities.str`
          )}`
        );
      }
      // For our purpose we filter only the CURRENCY modifier action
      if (hasPropertyPatched(update, `system.currency`)) {
        doTheUpdate = true;
        noActiveEffect = false;
        Logger.debug(
          `isAEncumbranceUpdated | The update contains key 'system.currency' => ${getPropertyPatched(
            update,
            `system.currency`
          )}`
        );
      }
      // For our purpose we filter only the inventory-plus modifier action
      if (invPlusActive && hasPropertyPatched(update, `flags.${CONSTANTS.INVENTORY_PLUS_MODULE_ID}`)) {
        doTheUpdate = true;
        noActiveEffect = false;
        Logger.debug(
          `isAEncumbranceUpdated | The update contains key 'flags.${
            CONSTANTS.INVENTORY_PLUS_MODULE_ID
          }' => ${getPropertyPatched(update, `flags.${CONSTANTS.INVENTORY_PLUS_MODULE_ID}`)}`
        );
      }
      // Check change on the cargo property of vehicle
      if (hasPropertyPatched(update, `system.attributes.capacity.cargo`)) {
        doTheUpdate = true;
        noActiveEffect = true;
        Logger.debug(
          `isAEncumbranceUpdated | The update contains key 'system.attributes.capacity.cargo' => ${getPropertyPatched(
            update,
            `system.attributes.capacity.cargo`
          )}`
        );
      }
      // Check if the update is about some item flag
      if (hasPropertyPatched(update, `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.ITEM.veweight}`)) {
        doTheUpdate = false;
        noActiveEffect = true;
        Logger.debug(
          `isAEncumbranceUpdated | The update contains key 'flags.${CONSTANTS.MODULE_ID}.${
            CONSTANTS.FLAGS.ITEM.veweight
          }' => ${getPropertyPatched(update, `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.ITEM.veweight}`)}`
        );
      }
      if (hasPropertyPatched(update, `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.ITEM.bulk}`)) {
        doTheUpdate = false;
        noActiveEffect = true;
        Logger.debug(
          `isAEncumbranceUpdated | The update contains key 'flags.${CONSTANTS.MODULE_ID}.${
            CONSTANTS.FLAGS.ITEM.bulk
          }' => ${getPropertyPatched(update, `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.ITEM.bulk}`)}`
        );
      }
    } else {
      doTheUpdate = false;
      noActiveEffect = true;
    }

    return {
      doTheUpdate: doTheUpdate,
      noActiveEffect: noActiveEffect,
    };
  }
}
