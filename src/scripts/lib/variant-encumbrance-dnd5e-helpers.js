import CONSTANTS from "../constants.mjs";
import { debug } from "./lib.mjs";

export class VariantEncumbranceDnd5eHelpers {
  static manageEquippedAndUnEquippedFeature(item, itemWeight) {
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

    //const doNotApplyWeightForEquippedArmor = String(applyWeightMultiplierForEquippedArmor) === "0";
    //const doNotApplyWeightForProficientArmor = String(applyWeightMultiplierForProficientArmor) === "0";

    const itemArmorTypes = ["clothing", "light", "medium", "heavy", "natural"];
    const isArmor = itemArmorTypes.includes(item.system.armor?.type);
    const isWeapon = false; // TODO

    // ==============================
    // if is a loot ignore any equipped or unequipped
    // ==============================
    if (item.type === "loot") {
      // DO NOTHING
      debug(
        `manageEquippedAndUnEquippedFeature | LOOT | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
      );
    }
    // ==============================
    // If is equipped and is a armor
    // ==============================
    else if (isEquipped && itemArmorTypes.includes(item.system.armor?.type)) {
      debug(
        `manageEquippedAndUnEquippedFeature | 0 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
      );
      // If the homebrew feature equipped is enabled
      if (applyWeightMultiplierForEquippedArmor > 0) {
        if (isProficient) {
          // If the homebrew feature proficient is enabled
          if (applyWeightMultiplierForProficientArmor > 0) {
            debug(
              `manageEquippedAndUnEquippedFeature | 1 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
            );
            itemWeight *= applyWeightMultiplierForProficientArmor;
          } else if (applyWeightMultiplierForProficientArmor === 0) {
            debug(
              `manageEquippedAndUnEquippedFeature | 2 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
            );
            if (item.system.armor?.type === "clothing") {
              debug(
                `manageEquippedAndUnEquippedFeature | 2.1 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= applyWeightMultiplierForProficientArmorClothing;
            } else if (item.system.armor?.type === "light") {
              debug(
                `manageEquippedAndUnEquippedFeature | 2.2 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= applyWeightMultiplierForProficientArmorLight;
            } else if (item.system.armor?.type === "medium") {
              debug(
                `manageEquippedAndUnEquippedFeature | 2.3 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= applyWeightMultiplierForProficientArmorMedium;
            } else if (item.system.armor?.type === "heavy") {
              debug(
                `manageEquippedAndUnEquippedFeature | 2.4 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= applyWeightMultiplierForProficientArmorHeavy;
            } else if (item.system.armor?.type === "natural") {
              debug(
                `manageEquippedAndUnEquippedFeature | 2.5 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= applyWeightMultiplierForProficientArmorNatural;
            } else {
              debug(
                `manageEquippedAndUnEquippedFeature | 2.6 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= 0;
            }
          } else {
            debug(
              `manageEquippedAndUnEquippedFeature | 3 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
            );
            itemWeight *= profEquippedMultiplier;
          }
        } else {
          debug(
            `manageEquippedAndUnEquippedFeature | 4 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
          );
          itemWeight *= applyWeightMultiplierForEquippedArmor;
        }
      } else if (applyWeightMultiplierForEquippedArmor === 0) {
        debug(
          `manageEquippedAndUnEquippedFeature | 5 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
        );
        if (isProficient) {
          debug(
            `manageEquippedAndUnEquippedFeature | 6 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
          );
          // If the homebrew feature proficient is enabled
          if (applyWeightMultiplierForProficientArmor > 0) {
            debug(
              `manageEquippedAndUnEquippedFeature | 6.1 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
            );
            itemWeight *= applyWeightMultiplierForProficientArmor;
          } else if (applyWeightMultiplierForProficientArmor === 0) {
            debug(
              `manageEquippedAndUnEquippedFeature | 7 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
            );
            if (item.system.armor?.type === "clothing") {
              debug(
                `manageEquippedAndUnEquippedFeature | 7.1 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= applyWeightMultiplierForProficientArmorClothing;
            } else if (item.system.armor?.type === "light") {
              debug(
                `manageEquippedAndUnEquippedFeature | 7.2 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= applyWeightMultiplierForProficientArmorLight;
            } else if (item.system.armor?.type === "medium") {
              debug(
                `manageEquippedAndUnEquippedFeature | 7.3 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= applyWeightMultiplierForProficientArmorMedium;
            } else if (item.system.armor?.type === "heavy") {
              debug(
                `manageEquippedAndUnEquippedFeature | 7.4 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= applyWeightMultiplierForProficientArmorHeavy;
            } else if (item.system.armor?.type === "natural") {
              debug(
                `manageEquippedAndUnEquippedFeature | 7.5 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= applyWeightMultiplierForProficientArmorNatural;
            } else {
              debug(
                `manageEquippedAndUnEquippedFeature | 7.6 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= 0;
            }
          } else {
            debug(
              `manageEquippedAndUnEquippedFeature | 8 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
            );
            itemWeight *= profEquippedMultiplier;
          }
        } else {
          debug(
            `manageEquippedAndUnEquippedFeature | 9 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
          );
          if (item.system.armor?.type === "clothing") {
            debug(
              `manageEquippedAndUnEquippedFeature | 9.1 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
            );
            itemWeight *= applyWeightMultiplierForEquippedArmorClothing;
          } else if (item.system.armor?.type === "light") {
            debug(
              `manageEquippedAndUnEquippedFeature | 9.2 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
            );
            itemWeight *= applyWeightMultiplierForEquippedArmorLight;
          } else if (item.system.armor?.type === "medium") {
            debug(
              `manageEquippedAndUnEquippedFeature | 9.3 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
            );
            itemWeight *= applyWeightMultiplierForEquippedArmorMedium;
          } else if (item.system.armor?.type === "heavy") {
            debug(
              `manageEquippedAndUnEquippedFeature | 9.4 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
            );
            itemWeight *= applyWeightMultiplierForEquippedArmorHeavy;
          } else if (item.system.armor?.type === "natural") {
            debug(
              `manageEquippedAndUnEquippedFeature | 9.5 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
            );
            itemWeight *= applyWeightMultiplierForEquippedArmorNatural;
          } else {
            debug(
              `manageEquippedAndUnEquippedFeature | 9.6 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
            );
            itemWeight *= 0;
          }
        }
      } else {
        debug(
          `manageEquippedAndUnEquippedFeature | 10 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
        );
        if (isProficient) {
          debug(
            `manageEquippedAndUnEquippedFeature | 11 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
          );
          // If the homebrew feature proficient is enabled
          if (applyWeightMultiplierForProficientArmor > 0) {
            debug(
              `manageEquippedAndUnEquippedFeature | 11.1 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
            );
            itemWeight *= applyWeightMultiplierForProficientArmor;
          } else if (applyWeightMultiplierForProficientArmor === 0) {
            debug(
              `manageEquippedAndUnEquippedFeature | 12 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
            );
            if (item.system.armor?.type === "clothing") {
              debug(
                `manageEquippedAndUnEquippedFeature | 12.1 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= applyWeightMultiplierForProficientArmorClothing;
            } else if (item.system.armor?.type === "light") {
              debug(
                `manageEquippedAndUnEquippedFeature | 12.2 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= applyWeightMultiplierForProficientArmorLight;
            } else if (item.system.armor?.type === "medium") {
              debug(
                `manageEquippedAndUnEquippedFeature | 12.3 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= applyWeightMultiplierForProficientArmorMedium;
            } else if (item.system.armor?.type === "heavy") {
              debug(
                `manageEquippedAndUnEquippedFeature | 12.4 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= applyWeightMultiplierForProficientArmorHeavy;
            } else if (item.system.armor?.type === "natural") {
              debug(
                `manageEquippedAndUnEquippedFeature | 12.5 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= applyWeightMultiplierForProficientArmorNatural;
            } else {
              debug(
                `manageEquippedAndUnEquippedFeature | 12.6 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
              );
              itemWeight *= 0;
            }
          } else {
            debug(
              `manageEquippedAndUnEquippedFeature | 13 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
            );
            itemWeight *= profEquippedMultiplier;
          }
        } else {
          debug(
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
        debug(
          `manageEquippedAndUnEquippedFeature | 13 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
        );
        itemWeight *= profEquippedMultiplier;
      } else {
        debug(
          `manageEquippedAndUnEquippedFeature | 14 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
        );
        itemWeight *= equippedMultiplier;
      }
    }
    // ==============================
    // If is unequipped
    // ==============================
    else {
      debug(
        `manageEquippedAndUnEquippedFeature | 19 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`
      );
      itemWeight *= unequippedMultiplier;
    }
    debug(
      `manageEquippedAndUnEquippedFeature | FINAL | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon} : ${itemWeightOri} => ${itemWeight}`
    );
    return itemWeight;
  }
}
