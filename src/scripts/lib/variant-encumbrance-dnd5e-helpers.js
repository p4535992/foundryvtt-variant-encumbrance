import CONSTANTS from "../constants.mjs";
import { debug } from "./lib.mjs";

export class VariantEncumbranceDnd5eHelpers {
  static manageEquippedAndUnEquippedFeature(item, itemWeight) {
    const isEquipped = item.system.equipped ? true : false;
    const isProficient = item.system.proficient ? item.system.proficient : false;

    // const doNotApplyWeightForEquippedArmor = game.settings.get(CONSTANTS.MODULE_ID, "doNotApplyWeightForEquippedArmor");
    const applyWeightMultiplierForEquippedArmor = game.settings.get(
      CONSTANTS.MODULE_ID,
      "applyWeightMultiplierForEquippedArmor"
    );
    const doNotApplyWeightForEquippedArmor = String(applyWeightMultiplierForEquippedArmor) === "0";

    const itemArmorTypes = ["clothing", "light", "medium", "heavy", "natural"];

    if (isEquipped && !doNotApplyWeightForEquippedArmor && itemArmorTypes.includes(item.system.armor?.type)) {
      debug(
        `manageEquippedAndUnEquippedFeature | 1 | Is not a 'backpack' and is not flagged as itemcollection | Equipped = true, doNotApplyWeightForEquippedArmor = false, Armor Type = true (${item.system.armor?.type})`
      );
      if (applyWeightMultiplierForEquippedArmor > 0) {
        itemWeight *= applyWeightMultiplierForEquippedArmor;
        debug(
          `manageEquippedAndUnEquippedFeature | 1.1 | Is not a 'backpack' and is not flagged as itemcollection | Equipped = true, doNotApplyWeightForEquippedArmor = false, Armor Type = true (${item.system.armor?.type})`
        );
      } else {
        if (isProficient) {
          debug(
            `manageEquippedAndUnEquippedFeature | 1.2 | Equipped = true, Proficient = true : ${itemWeight} => ${
              itemWeight * game.settings.get(CONSTANTS.MODULE_ID, "profEquippedMultiplier")
            }`
          );
          itemWeight *= game.settings.get(CONSTANTS.MODULE_ID, "profEquippedMultiplier");
        } else {
          debug(
            `manageEquippedAndUnEquippedFeature | 1.3 | Equipped = false, Proficient = false : ${itemWeight} => ${
              itemWeight * game.settings.get(CONSTANTS.MODULE_ID, "equippedMultiplier")
            }`
          );
          itemWeight *= game.settings.get(CONSTANTS.MODULE_ID, "equippedMultiplier");
        }
      }
    } else if (isEquipped && doNotApplyWeightForEquippedArmor && itemArmorTypes.includes(item.system.armor?.type)) {
      debug(
        `manageEquippedAndUnEquippedFeature | 2 | Is not a 'backpack' and is not flagged as itemcollection | Equipped = true, doNotApplyWeightForEquippedArmor = true, Armor Type = true (${item.system.armor?.type})`
      );
      const applyWeightMultiplierForEquippedArmorClothing =
        game.settings.get(CONSTANTS.MODULE_ID, "applyWeightMultiplierForEquippedArmorClothing") || 0;
      const applyWeightMultiplierForEquippedArmorLight =
        game.settings.get(CONSTANTS.MODULE_ID, "applyWeightMultiplierForEquippedArmorLight") || 0;
      const applyWeightMultiplierForEquippedArmorMedium =
        game.settings.get(CONSTANTS.MODULE_ID, "applyWeightMultiplierForEquippedArmorMedium") || 0;
      const applyWeightMultiplierForEquippedArmorHeavy =
        game.settings.get(CONSTANTS.MODULE_ID, "applyWeightMultiplierForEquippedArmorHeavy") || 0;
      const applyWeightMultiplierForEquippedArmorNatural =
        game.settings.get(CONSTANTS.MODULE_ID, "applyWeightMultiplierForEquippedArmorNatural") || 0;

      if (item.system.armor?.type === "clothing") {
        debug(
          `manageEquippedAndUnEquippedFeature | 2.1 | applyWeightMultiplierForEquippedArmorClothing with value ${applyWeightMultiplierForEquippedArmorClothing} : ${itemWeight} => ${
            itemWeight * applyWeightMultiplierForEquippedArmorClothing
          }`
        );
        itemWeight *= applyWeightMultiplierForEquippedArmorClothing;
      } else if (item.system.armor?.type === "light") {
        debug(
          `manageEquippedAndUnEquippedFeature | 2.2 | applyWeightMultiplierForEquippedArmorLight  with value ${applyWeightMultiplierForEquippedArmorLight} :${itemWeight} => ${
            itemWeight * applyWeightMultiplierForEquippedArmorLight
          }`
        );
        itemWeight *= applyWeightMultiplierForEquippedArmorLight;
      } else if (item.system.armor?.type === "medium") {
        debug(
          `manageEquippedAndUnEquippedFeature | 2.3 | applyWeightMultiplierForEquippedArmorMedium with value ${applyWeightMultiplierForEquippedArmorMedium} : ${itemWeight} => ${
            itemWeight * applyWeightMultiplierForEquippedArmorMedium
          }`
        );
        itemWeight *= applyWeightMultiplierForEquippedArmorMedium;
      } else if (item.system.armor?.type === "heavy") {
        debug(
          `manageEquippedAndUnEquippedFeature | 2.4 | applyWeightMultiplierForEquippedArmorArmorHeavy with value ${applyWeightMultiplierForEquippedArmorHeavy} : ${itemWeight} => ${
            itemWeight * applyWeightMultiplierForEquippedArmorHeavy
          }`
        );
        itemWeight *= applyWeightMultiplierForEquippedArmorHeavy;
      } else if (item.system.armor?.type === "natural") {
        debug(
          `manageEquippedAndUnEquippedFeature | 2.5 | applyWeightMultiplierForEquippedArmorNatural with value ${applyWeightMultiplierForEquippedArmorNatural} : ${itemWeight} => ${
            itemWeight * applyWeightMultiplierForEquippedArmorNatural
          }`
        );
        itemWeight *= applyWeightMultiplierForEquippedArmorNatural;
      } else {
        debug(
          `manageEquippedAndUnEquippedFeature | 2.6 | doNotApplyWeightForEquippedArmor with value ${0} : ${itemWeight} => ${0}`
        );
        itemWeight *= 0;
      }
    }
    // if is a loot ignore any equipped or unequipped
    else if (item.type === "loot") {
      // DO NOTHING
      debug(
        `manageEquippedAndUnEquippedFeature | 3 | Equipped = false, Proficient = false : ${itemWeight} => ${itemWeight}`
      );
    }
    //
    else if (isEquipped) {
      if (isProficient) {
        debug(
          `manageEquippedAndUnEquippedFeature | 4.1 | Equipped = true, Proficient = true : ${itemWeight} => ${
            itemWeight * game.settings.get(CONSTANTS.MODULE_ID, "profEquippedMultiplier")
          }`
        );
        itemWeight *= game.settings.get(CONSTANTS.MODULE_ID, "profEquippedMultiplier");
      } else {
        debug(
          `manageEquippedAndUnEquippedFeature | 4.2 | Equipped = false, Proficient = false : ${itemWeight} => ${
            itemWeight * game.settings.get(CONSTANTS.MODULE_ID, "equippedMultiplier")
          }`
        );
        itemWeight *= game.settings.get(CONSTANTS.MODULE_ID, "equippedMultiplier");
      }
    } else {
      debug(
        `manageEquippedAndUnEquippedFeature | 4.3 | Equipped = false, Proficient = false : ${itemWeight} => ${
          itemWeight * game.settings.get(CONSTANTS.MODULE_ID, "unequippedMultiplier")
        }`
      );
      itemWeight *= game.settings.get(CONSTANTS.MODULE_ID, "unequippedMultiplier");
    }

    return itemWeight;
  }
}
