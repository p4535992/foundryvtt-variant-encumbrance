import { isEmptyObject } from "jquery";
import { VariantEncumbranceImpl, calcWeightItemCollection } from "../VariantEncumbranceImpl.js";
import CONSTANTS from "../constants.js";
import {
    calculateBackPackManagerBulk,
    calculateBackPackManagerWeight,
    getItemBulk,
    getItemQuantity,
    getItemWeight,
    isRealNumber,
    retrieveBackPackManagerItem,
} from "./lib.js";
import { invPlusActive } from "../main.js";
import { getPropertyPatched, hasPropertyPatched } from "./foundryvtt-utils-patched";
import Logger from "./Logger";
import { EncumbranceFlags, EncumbranceMode } from "../VariantEncumbranceModels.js";
import { VariantEncumbranceBulkImpl } from "../VariantEncumbranceBulkImpl.js";

export class VariantEncumbranceDnd5eHelpers {
    static isEnabledActorType(actorEntity) {
        const useVarianEncumbranceWithSpecificType = game.settings.get(
            CONSTANTS.MODULE_ID,
            "useVarianEncumbranceWithSpecificType",
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
    }

    static prepareInventoryItemsFromUpdate(actorEntity, updatedItem, updatedEffect, mode) {
        if (
            hasPropertyPatched(updatedItem || {}, `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.ITEM.veweight}`) ||
            hasPropertyPatched(updatedItem || {}, `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.ITEM.bulk}`)
        ) {
            return;
        }

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

                        itemCurrent = foundry.utils.expandObject(itemCurrent);

                        foundry.utils.mergeObject(itemCurrent.system, updatedItem);
                    } catch (e) {
                        Logger.error(e?.message);
                        return [];
                    }
                }
                updatedItem = itemCurrent;
            }
        }

        const currentItemId = updatedItem?.id ? updatedItem?.id : updatedItem?._id;
        const inventoryItems = [];
        const isAlreadyInActor = actorEntity.items?.find((itemTmp) => itemTmp.id === currentItemId);
        const physicalItems = ["weapon", "equipment", "consumable", "tool", "backpack", "loot", "container"];
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
        return inventoryItems;
    }

    static manageCustomCodeFeature(item, itemWeight, isBulk) {
        const actor = item.parent;
        let options = {};

        let typeOfWeight = "veweight";
        if (isBulk) {
            typeOfWeight = "bulk";
        }

        Hooks.call(`${CONSTANTS.MODULE_ID}.customizeItemWeight`, actor, item, itemWeight, typeOfWeight, options);
        let customizedItemWeightFromHook = options.veweight;
        let customizedItemBulkFromHook = options.bulk;
        if (isBulk && isRealNumber(customizedItemBulkFromHook)) {
            return customizedItemBulkFromHook;
        } else if (isRealNumber(customizedItemWeightFromHook)) {
            return customizedItemWeightFromHook;
        } else {
            return itemWeight;
        }
    }

    static manageEquippedAndUnEquippedFeature(item, itemWeight) {
        const disableEquippedUnequippedProficientWeightManagement = game.settings.get(
            CONSTANTS.MODULE_ID,
            "disableEquippedUnequippedProficientWeightManagement",
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
            "applyWeightMultiplierForEquippedArmor",
        );
        const applyWeightMultiplierForEquippedArmorClothing = game.settings.get(
            CONSTANTS.MODULE_ID,
            "applyWeightMultiplierForEquippedArmorClothing",
        );
        const applyWeightMultiplierForEquippedArmorLight = game.settings.get(
            CONSTANTS.MODULE_ID,
            "applyWeightMultiplierForEquippedArmorLight",
        );
        const applyWeightMultiplierForEquippedArmorMedium = game.settings.get(
            CONSTANTS.MODULE_ID,
            "applyWeightMultiplierForEquippedArmorMedium",
        );
        const applyWeightMultiplierForEquippedArmorHeavy = game.settings.get(
            CONSTANTS.MODULE_ID,
            "applyWeightMultiplierForEquippedArmorHeavy",
        );
        const applyWeightMultiplierForEquippedArmorNatural = game.settings.get(
            CONSTANTS.MODULE_ID,
            "applyWeightMultiplierForEquippedArmorNatural",
        );

        const applyWeightMultiplierForProficientArmor = game.settings.get(
            CONSTANTS.MODULE_ID,
            "applyWeightMultiplierForProficientArmor",
        );
        const applyWeightMultiplierForProficientArmorClothing = game.settings.get(
            CONSTANTS.MODULE_ID,
            "applyWeightMultiplierForProficientArmorClothing",
        );
        const applyWeightMultiplierForProficientArmorLight = game.settings.get(
            CONSTANTS.MODULE_ID,
            "applyWeightMultiplierForProficientArmorLight",
        );
        const applyWeightMultiplierForProficientArmorMedium = game.settings.get(
            CONSTANTS.MODULE_ID,
            "applyWeightMultiplierForProficientArmorMedium",
        );
        const applyWeightMultiplierForProficientArmorHeavy = game.settings.get(
            CONSTANTS.MODULE_ID,
            "applyWeightMultiplierForProficientArmorHeavy",
        );
        const applyWeightMultiplierForProficientArmorNatural = game.settings.get(
            CONSTANTS.MODULE_ID,
            "applyWeightMultiplierForProficientArmorNatural",
        );

        const applyWeightMultiplierForEquippedWeapon = game.settings.get(
            CONSTANTS.MODULE_ID,
            "applyWeightMultiplierForEquippedWeapon",
        );

        const applyWeightMultiplierForProficientWeapon = game.settings.get(
            CONSTANTS.MODULE_ID,
            "applyWeightMultiplierForProficientWeapon",
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
                `manageEquippedAndUnEquippedFeature | LOOT | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
            );
        }
        // ==============================
        // If is equipped and is a weapon
        // ==============================
        else if (isEquipped && isWeapon) {
            Logger.debug(
                `manageEquippedAndUnEquippedFeature | 20 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
            );
            // If the homebrew feature equipped is enabled
            if (applyWeightMultiplierForEquippedWeapon > 0) {
                if (isProficient) {
                    // If the homebrew feature proficient is enabled
                    if (applyWeightMultiplierForProficientWeapon > 0) {
                        Logger.debug(
                            `manageEquippedAndUnEquippedFeature | 21 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`,
                        );
                        itemWeight *= applyWeightMultiplierForProficientWeapon;
                    } else if (applyWeightMultiplierForProficientWeapon === 0) {
                        Logger.debug(
                            `manageEquippedAndUnEquippedFeature | 22 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`,
                        );
                        itemWeight *= 0;
                    } else {
                        Logger.debug(
                            `manageEquippedAndUnEquippedFeature | 23 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`,
                        );
                        itemWeight *= profEquippedMultiplier;
                    }
                } else {
                    Logger.debug(
                        `manageEquippedAndUnEquippedFeature | 24 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`,
                    );
                    itemWeight *= applyWeightMultiplierForEquippedWeapon;
                }
            } else if (applyWeightMultiplierForEquippedWeapon === 0) {
                Logger.debug(
                    `manageEquippedAndUnEquippedFeature | 25 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`,
                );
                if (isProficient) {
                    Logger.debug(
                        `manageEquippedAndUnEquippedFeature | 26 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`,
                    );
                    // If the homebrew feature proficient is enabled
                    if (applyWeightMultiplierForProficientWeapon > 0) {
                        Logger.debug(
                            `manageEquippedAndUnEquippedFeature | 26.1 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`,
                        );
                        itemWeight *= applyWeightMultiplierForProficientWeapon;
                    } else if (applyWeightMultiplierForProficientWeapon === 0) {
                        Logger.debug(
                            `manageEquippedAndUnEquippedFeature | 27 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`,
                        );
                        itemWeight *= 0;
                    } else {
                        Logger.debug(
                            `manageEquippedAndUnEquippedFeature | 28 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`,
                        );
                        itemWeight *= profEquippedMultiplier;
                    }
                } else {
                    Logger.debug(
                        `manageEquippedAndUnEquippedFeature | 29 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`,
                    );
                    itemWeight *= 0;
                }
            } else {
                Logger.debug(
                    `manageEquippedAndUnEquippedFeature | 30 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`,
                );
                if (isProficient) {
                    Logger.debug(
                        `manageEquippedAndUnEquippedFeature | 31 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`,
                    );
                    // If the homebrew feature proficient is enabled
                    if (applyWeightMultiplierForProficientWeapon > 0) {
                        Logger.debug(
                            `manageEquippedAndUnEquippedFeature | 31.1 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`,
                        );
                        itemWeight *= applyWeightMultiplierForProficientWeapon;
                    } else if (applyWeightMultiplierForProficientWeapon === 0) {
                        Logger.debug(
                            `manageEquippedAndUnEquippedFeature | 32.6 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`,
                        );
                        itemWeight *= 0;
                    } else {
                        Logger.debug(
                            `manageEquippedAndUnEquippedFeature | 33 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`,
                        );
                        itemWeight *= profEquippedMultiplier;
                    }
                } else {
                    Logger.debug(
                        `manageEquippedAndUnEquippedFeature | 34 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Weapon = ${isWeapon}, Weapon = ${isWeapon}`,
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
                `manageEquippedAndUnEquippedFeature | 0 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
            );
            // If the homebrew feature equipped is enabled
            if (applyWeightMultiplierForEquippedArmor > 0) {
                if (isProficient) {
                    // If the homebrew feature proficient is enabled
                    if (applyWeightMultiplierForProficientArmor > 0) {
                        Logger.debug(
                            `manageEquippedAndUnEquippedFeature | 1 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                        );
                        itemWeight *= applyWeightMultiplierForProficientArmor;
                    } else if (applyWeightMultiplierForProficientArmor === 0) {
                        Logger.debug(
                            `manageEquippedAndUnEquippedFeature | 2 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                        );
                        if (item.system.armor?.type === "clothing") {
                            Logger.debug(
                                `manageEquippedAndUnEquippedFeature | 2.1 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                            );
                            itemWeight *= applyWeightMultiplierForProficientArmorClothing;
                        } else if (item.system.armor?.type === "light") {
                            Logger.debug(
                                `manageEquippedAndUnEquippedFeature | 2.2 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                            );
                            itemWeight *= applyWeightMultiplierForProficientArmorLight;
                        } else if (item.system.armor?.type === "medium") {
                            Logger.debug(
                                `manageEquippedAndUnEquippedFeature | 2.3 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                            );
                            itemWeight *= applyWeightMultiplierForProficientArmorMedium;
                        } else if (item.system.armor?.type === "heavy") {
                            Logger.debug(
                                `manageEquippedAndUnEquippedFeature | 2.4 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                            );
                            itemWeight *= applyWeightMultiplierForProficientArmorHeavy;
                        } else if (item.system.armor?.type === "natural") {
                            Logger.debug(
                                `manageEquippedAndUnEquippedFeature | 2.5 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                            );
                            itemWeight *= applyWeightMultiplierForProficientArmorNatural;
                        } else {
                            Logger.debug(
                                `manageEquippedAndUnEquippedFeature | 2.6 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                            );
                            itemWeight *= 0;
                        }
                    } else {
                        Logger.debug(
                            `manageEquippedAndUnEquippedFeature | 3 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                        );
                        itemWeight *= profEquippedMultiplier;
                    }
                } else {
                    Logger.debug(
                        `manageEquippedAndUnEquippedFeature | 4 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                    );
                    itemWeight *= applyWeightMultiplierForEquippedArmor;
                }
            } else if (applyWeightMultiplierForEquippedArmor === 0) {
                Logger.debug(
                    `manageEquippedAndUnEquippedFeature | 5 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                );
                if (isProficient) {
                    Logger.debug(
                        `manageEquippedAndUnEquippedFeature | 6 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                    );
                    // If the homebrew feature proficient is enabled
                    if (applyWeightMultiplierForProficientArmor > 0) {
                        Logger.debug(
                            `manageEquippedAndUnEquippedFeature | 6.1 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                        );
                        itemWeight *= applyWeightMultiplierForProficientArmor;
                    } else if (applyWeightMultiplierForProficientArmor === 0) {
                        Logger.debug(
                            `manageEquippedAndUnEquippedFeature | 7 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                        );
                        if (item.system.armor?.type === "clothing") {
                            Logger.debug(
                                `manageEquippedAndUnEquippedFeature | 7.1 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                            );
                            itemWeight *= applyWeightMultiplierForProficientArmorClothing;
                        } else if (item.system.armor?.type === "light") {
                            Logger.debug(
                                `manageEquippedAndUnEquippedFeature | 7.2 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                            );
                            itemWeight *= applyWeightMultiplierForProficientArmorLight;
                        } else if (item.system.armor?.type === "medium") {
                            Logger.debug(
                                `manageEquippedAndUnEquippedFeature | 7.3 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                            );
                            itemWeight *= applyWeightMultiplierForProficientArmorMedium;
                        } else if (item.system.armor?.type === "heavy") {
                            Logger.debug(
                                `manageEquippedAndUnEquippedFeature | 7.4 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                            );
                            itemWeight *= applyWeightMultiplierForProficientArmorHeavy;
                        } else if (item.system.armor?.type === "natural") {
                            Logger.debug(
                                `manageEquippedAndUnEquippedFeature | 7.5 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                            );
                            itemWeight *= applyWeightMultiplierForProficientArmorNatural;
                        } else {
                            Logger.debug(
                                `manageEquippedAndUnEquippedFeature | 7.6 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                            );
                            itemWeight *= 0;
                        }
                    } else {
                        Logger.debug(
                            `manageEquippedAndUnEquippedFeature | 8 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                        );
                        itemWeight *= profEquippedMultiplier;
                    }
                } else {
                    Logger.debug(
                        `manageEquippedAndUnEquippedFeature | 9 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                    );
                    if (item.system.armor?.type === "clothing") {
                        Logger.debug(
                            `manageEquippedAndUnEquippedFeature | 9.1 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                        );
                        itemWeight *= applyWeightMultiplierForEquippedArmorClothing;
                    } else if (item.system.armor?.type === "light") {
                        Logger.debug(
                            `manageEquippedAndUnEquippedFeature | 9.2 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                        );
                        itemWeight *= applyWeightMultiplierForEquippedArmorLight;
                    } else if (item.system.armor?.type === "medium") {
                        Logger.debug(
                            `manageEquippedAndUnEquippedFeature | 9.3 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                        );
                        itemWeight *= applyWeightMultiplierForEquippedArmorMedium;
                    } else if (item.system.armor?.type === "heavy") {
                        Logger.debug(
                            `manageEquippedAndUnEquippedFeature | 9.4 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                        );
                        itemWeight *= applyWeightMultiplierForEquippedArmorHeavy;
                    } else if (item.system.armor?.type === "natural") {
                        Logger.debug(
                            `manageEquippedAndUnEquippedFeature | 9.5 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                        );
                        itemWeight *= applyWeightMultiplierForEquippedArmorNatural;
                    } else {
                        Logger.debug(
                            `manageEquippedAndUnEquippedFeature | 9.6 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                        );
                        itemWeight *= 0;
                    }
                }
            } else {
                Logger.debug(
                    `manageEquippedAndUnEquippedFeature | 10 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                );
                if (isProficient) {
                    Logger.debug(
                        `manageEquippedAndUnEquippedFeature | 11 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                    );
                    // If the homebrew feature proficient is enabled
                    if (applyWeightMultiplierForProficientArmor > 0) {
                        Logger.debug(
                            `manageEquippedAndUnEquippedFeature | 11.1 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                        );
                        itemWeight *= applyWeightMultiplierForProficientArmor;
                    } else if (applyWeightMultiplierForProficientArmor === 0) {
                        Logger.debug(
                            `manageEquippedAndUnEquippedFeature | 12 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                        );
                        if (item.system.armor?.type === "clothing") {
                            Logger.debug(
                                `manageEquippedAndUnEquippedFeature | 12.1 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                            );
                            itemWeight *= applyWeightMultiplierForProficientArmorClothing;
                        } else if (item.system.armor?.type === "light") {
                            Logger.debug(
                                `manageEquippedAndUnEquippedFeature | 12.2 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                            );
                            itemWeight *= applyWeightMultiplierForProficientArmorLight;
                        } else if (item.system.armor?.type === "medium") {
                            Logger.debug(
                                `manageEquippedAndUnEquippedFeature | 12.3 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                            );
                            itemWeight *= applyWeightMultiplierForProficientArmorMedium;
                        } else if (item.system.armor?.type === "heavy") {
                            Logger.debug(
                                `manageEquippedAndUnEquippedFeature | 12.4 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                            );
                            itemWeight *= applyWeightMultiplierForProficientArmorHeavy;
                        } else if (item.system.armor?.type === "natural") {
                            Logger.debug(
                                `manageEquippedAndUnEquippedFeature | 12.5 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                            );
                            itemWeight *= applyWeightMultiplierForProficientArmorNatural;
                        } else {
                            Logger.debug(
                                `manageEquippedAndUnEquippedFeature | 12.6 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                            );
                            itemWeight *= 0;
                        }
                    } else {
                        Logger.debug(
                            `manageEquippedAndUnEquippedFeature | 13 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                        );
                        itemWeight *= profEquippedMultiplier;
                    }
                } else {
                    Logger.debug(
                        `manageEquippedAndUnEquippedFeature | 14 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
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
                    `manageEquippedAndUnEquippedFeature | 13 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                );
                itemWeight *= profEquippedMultiplier;
            } else {
                Logger.debug(
                    `manageEquippedAndUnEquippedFeature | 14 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
                );
                itemWeight *= equippedMultiplier;
            }
        }
        // ==============================
        // If is unequipped
        // ==============================
        else {
            Logger.debug(
                `manageEquippedAndUnEquippedFeature | 19 | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon}`,
            );
            itemWeight *= unequippedMultiplier;
        }
        Logger.debug(
            `manageEquippedAndUnEquippedFeature | FINAL | Equipped = ${isEquipped}, Proficient = ${isProficient}, Armor = ${isArmor}, Weapon = ${isWeapon} : ${itemWeightOri} => ${itemWeight}`,
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

            Logger.debug(
                `Is BackpackManager! Item '${item.name}' : Quantity = ${itemQuantity}, Weight = ${itemWeight}`,
            );
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
                doNotIncreaseWeightByQuantityForNoAmmunition,
            );
            ignoreQuantityCheckForItemCollection = true;
        }
        // End Item container check
        else {
            // Does the weight of the items in the container carry over to the actor?
            if (item.type === "container") {
                const currencyWeight = item.system.currencyWeight || 0;
                const contentsWeightNoCurrency = item.system.contentsWeight - currencyWeight || 0;
                const contentsWeightWithCurrency = item.system.contentsWeight || 0;
                const totalWeight = item.system.totalWeight || 0;
                const onlyContainerWeight = totalWeight - item.system.contentsWeight || 0;
                const containerWeight = ignoreCurrency ? contentsWeightNoCurrency : contentsWeightWithCurrency;
                const weightless = getProperty(item, "system.capacity.weightless") ?? false;
                itemWeight = weightless ? itemWeight : itemWeight + containerWeight;
            }
            s;

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
           1 * ${itemWeight} = ${appliedWeight}`,
            );
        } else {
            appliedWeight = itemQuantity * itemWeight;
            Logger.debug(
                `Item '${item.name}', Equipped '${isEquipped}', Proficient ${isProficient} :
           ${itemQuantity} * ${itemWeight} = ${appliedWeight}`,
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

            Logger.debug(
                `Is BackpackManager! Item '${item.name}' : Quantity = ${itemQuantity}, Weight = ${itemWeight}`,
            );
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
                doNotIncreaseWeightByQuantityForNoAmmunition,
            );
            ignoreQuantityCheckForItemCollection = true;
        }
        // End Item container check
        else {
            // Does the weight of the items in the container carry over to the actor?
            if (item.type === "container") {
                const currencyWeight = item.system.currencyWeight || 0;
                const contentsWeightNoCurrency = item.system.contentsWeight - currencyWeight || 0;
                const contentsWeightWithCurrency = item.system.contentsWeight || 0;
                const totalWeight = item.system.totalWeight || 0;
                const onlyContainerWeight = totalWeight - item.system.contentsWeight || 0;
                const containerWeight = ignoreCurrency ? contentsWeightNoCurrency : contentsWeightWithCurrency;
                const weightless = getProperty(item, "system.capacity.weightless") ?? false;
                itemWeight = weightless ? itemWeight : itemWeight + containerWeight;
            }

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
           1 * ${itemWeight} = ${appliedWeight}`,
            );
        } else {
            appliedWeight = itemQuantity * itemWeight;
            Logger.debug(
                `Item '${item.name}', Equipped '${isEquipped}', Proficient ${isProficient} :
           ${itemQuantity} * ${itemWeight} = ${appliedWeight}`,
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
            Logger.debug(`isAEncumbranceUpdated | The update contains key is empty`);
        } else if (VariantEncumbranceDnd5eHelpers.isEnabledActorType(actorEntity)) {
            //  && actorEntity.sheet?.rendered
            const physicalItems = ["weapon", "equipment", "consumable", "tool", "backpack", "loot", "container"];
            // if (
            //   hasPropertyPatched(update, `system.type`) &&
            //   !physicalItems.includes(getPropertyPatched(update, `system.type`)?.value)
            // ) {
            //   Logger.debug(
            //     `isAEncumbranceUpdated | The update contains key 'system.type' => ${getPropertyPatched(
            //       update,
            //       `system.type`
            //     )}`
            //   );
            //   return {
            //     doTheUpdate: false,
            //     noActiveEffect: true,
            //   };
            // }
            if (hasPropertyPatched(update, `type`) && !physicalItems.includes(getPropertyPatched(update, `type`))) {
                Logger.debug(
                    `isAEncumbranceUpdated | The update contains key 'type' => ${getPropertyPatched(update, `type`)}`,
                );
                return {
                    doTheUpdate: false,
                    noActiveEffect: true,
                };
            }

            // foundry.utils.mergeObject(itemCurrent.system, updatedItem);
            // For our purpose we filter only the equipped action
            if (hasPropertyPatched(update, `system.quantity`)) {
                doTheUpdate = true;
                noActiveEffect = false;
                Logger.debug(
                    `isAEncumbranceUpdated | The update contains key 'system.quantity' => ${getPropertyPatched(
                        update,
                        `system.quantity`,
                    )}`,
                );
            }
            // For our purpose we filter only the equipped action
            if (hasPropertyPatched(update, `system.weight`)) {
                doTheUpdate = true;
                noActiveEffect = false;
                Logger.debug(
                    `isAEncumbranceUpdated | The update contains key 'system.weight' => ${getPropertyPatched(
                        update,
                        `system.weight`,
                    )}`,
                );
            }
            // For our purpose we filter only the equipped action
            if (hasPropertyPatched(update, `system.equipped`)) {
                doTheUpdate = true;
                noActiveEffect = false;
                Logger.debug(
                    `isAEncumbranceUpdated | The update contains key 'system.equipped' => ${getPropertyPatched(
                        update,
                        `system.equipped`,
                    )}`,
                );
            }
            // For our purpose we filter only the proficient action
            if (hasPropertyPatched(update, `system.proficient`)) {
                doTheUpdate = true;
                noActiveEffect = false;
                Logger.debug(
                    `isAEncumbranceUpdated | The update contains key 'system.proficient' => ${getPropertyPatched(
                        update,
                        `system.proficient`,
                    )}`,
                );
            }
            // For our purpose we filter only the STR modifier action
            //if (update?.system?.abilities?.str) {
            if (hasPropertyPatched(update, `system.abilities.str`)) {
                if (
                    actorEntity.system.abilities.str.value !== getPropertyPatched(update, `system.abilities.str.value`)
                ) {
                    actorEntity.system.abilities.str.value = getPropertyPatched(update, `system.abilities.str.value`);
                }
                doTheUpdate = true;
                noActiveEffect = false;
                Logger.debug(
                    `isAEncumbranceUpdated | The update contains key 'system.abilities.str' => ${getPropertyPatched(
                        update,
                        `system.abilities.str`,
                    )}`,
                );
            }
            // For our purpose we filter only the CURRENCY modifier action
            if (hasPropertyPatched(update, `system.currency`)) {
                doTheUpdate = true;
                noActiveEffect = false;
                Logger.debug(
                    `isAEncumbranceUpdated | The update contains key 'system.currency' => ${getPropertyPatched(
                        update,
                        `system.currency`,
                    )}`,
                );
            }
            // For our purpose we filter only the inventory-plus modifier action
            if (invPlusActive && hasPropertyPatched(update, `flags.${CONSTANTS.INVENTORY_PLUS_MODULE_ID}`)) {
                doTheUpdate = true;
                noActiveEffect = false;
                Logger.debug(
                    `isAEncumbranceUpdated | The update contains key 'flags.${
                        CONSTANTS.INVENTORY_PLUS_MODULE_ID
                    }' => ${getPropertyPatched(update, `flags.${CONSTANTS.INVENTORY_PLUS_MODULE_ID}`)}`,
                );
            }
            // Check change on the cargo property of vehicle
            if (hasPropertyPatched(update, `system.attributes.capacity.cargo`)) {
                doTheUpdate = true;
                noActiveEffect = true;
                Logger.debug(
                    `isAEncumbranceUpdated | The update contains key 'system.attributes.capacity.cargo' => ${getPropertyPatched(
                        update,
                        `system.attributes.capacity.cargo`,
                    )}`,
                );
            }
            // Check if the update is about some item flag
            if (hasPropertyPatched(update, `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.ITEM.veweight}`)) {
                doTheUpdate = false;
                noActiveEffect = true;
                Logger.debug(
                    `isAEncumbranceUpdated | The update contains key 'flags.${CONSTANTS.MODULE_ID}.${
                        CONSTANTS.FLAGS.ITEM.veweight
                    }' => ${getPropertyPatched(update, `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.ITEM.veweight}`)}`,
                );
            }
            if (hasPropertyPatched(update, `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.ITEM.bulk}`)) {
                doTheUpdate = false;
                noActiveEffect = true;
                Logger.debug(
                    `isAEncumbranceUpdated | The update contains key 'flags.${CONSTANTS.MODULE_ID}.${
                        CONSTANTS.FLAGS.ITEM.bulk
                    }' => ${getPropertyPatched(update, `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.ITEM.bulk}`)}`,
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

    // ==============================
    // EFFECT UTILITIES
    // ================================

    /**
     * Checks to see if any of the current active effects applied to the actor
     * with the given UUID match the effect name and are a convenient effect
     *
     * @param {string} effectName - the name of the effect to check
     * @param {string} uuid - the uuid of the actor to see if the effect is
     * applied to
     * @returns {boolean} true if the effect is applied, false otherwise
     */
    static async hasEffectApplied(effectName, actor) {
        return await actor?.effects?.some((e) => (e?.name == effectName || e?.label == effectName) && !e?.disabled);
    }

    /**
     * Checks to see if any of the current active effects applied to the actor
     * with the given UUID match the effect name and are a convenient effect
     *
     * @param {string} effectName - the name of the effect to check
     * @param {string} uuid - the uuid of the actor to see if the effect is
     * applied to
     * @returns {boolean} true if the effect is applied, false otherwise
     */
    static async hasEffectAppliedFromId(effect, actor) {
        return await actor?.effects?.some((e) => e?.id == effect.id);
    }

    /**
     * Removes the effect with the provided name from an actor matching the
     * provided UUID
     *
     * @param {string} effectName - the name of the effect to remove
     * @param {string} uuid - the uuid of the actor to remove the effect from
     */
    static async removeEffect(effectName, actor) {
        if (effectName) effectName = Logger.i18n(effectName);
        const actorEffects = actor?.effects || [];
        const effectToRemove = actorEffects.find((e) => e?.label === effectName || e?.name === effectName);
        if (!effectToRemove || !effectToRemove.id) return undefined;
        const activeEffectsRemoved = (await actor.deleteEmbeddedDocuments("ActiveEffect", [effectToRemove.id])) || [];
        return activeEffectsRemoved[0];
    }

    /**
     * Removes the effect with the provided name from an actor matching the
     * provided UUID
     *
     * @param {string} effectName - the name of the effect to remove
     * @param {string} uuid - the uuid of the actor to remove the effect from
     */
    static async removeEffectFromId(effect, actor) {
        if (effect.id) {
            const effectToRemove = (actor?.effects || []).find((e) => e.id === effect.id);
            if (!effectToRemove || !effectToRemove.id) return undefined;
            const activeEffectsRemoved =
                (await actor.deleteEmbeddedDocuments("ActiveEffect", [effectToRemove.id])) || [];
            return activeEffectsRemoved[0];
        }
        return undefined;
    }

    static async manageCreateDocumentItem(actorEntity, update, data) {
        const { doTheUpdate, noActiveEffect } = VariantEncumbranceDnd5eHelpers.isAEncumbranceUpdated(
            actorEntity,
            update,
        );
        if (doTheUpdate && actorEntity.sheet?.rendered) {
            // if (
            //   hasPropertyPatched(update, `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.ITEM.veweight}`) ||
            //   hasPropertyPatched(update, `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.ITEM.bulk}`)
            // ) {
            //   return wrapped(updates, context);
            // }
            // if (VariantEncumbranceDnd5eHelpers.isEnabledActorType(actorEntity) && actorEntity.sheet?.rendered) {
            if (noActiveEffect) {
                if (game.settings.get(CONSTANTS.MODULE_ID, "enabled")) {
                    VariantEncumbranceImpl.calculateEncumbrance(
                        actorEntity,
                        actorEntity.items.contents,
                        false,
                        invPlusActive,
                    );
                }
                if (game.settings.get(CONSTANTS.MODULE_ID, "enableBulkSystem")) {
                    VariantEncumbranceBulkImpl.calculateEncumbrance(
                        actorEntity,
                        actorEntity.items.contents,
                        false,
                        invPlusActive,
                    );
                }
            } else {
                const dataToCheck = data;
                dataToCheck.system = foundry.utils.mergeObject(data.system, update.system);
                if (game.settings.get(CONSTANTS.MODULE_ID, "enabled")) {
                    await VariantEncumbranceImpl.updateEncumbrance(
                        actorEntity,
                        dataToCheck,
                        actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.ENABLED_AE),
                        EncumbranceMode.ADD,
                    );
                }
                if (game.settings.get(CONSTANTS.MODULE_ID, "enableBulkSystem")) {
                    await VariantEncumbranceBulkImpl.updateEncumbrance(
                        actorEntity,
                        dataToCheck,
                        actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.ENABLED_AE_BULK),
                        EncumbranceMode.ADD,
                    );
                }
            }
        }
    }

    static async manageUpdateDocumentItem(actorEntity, update, data) {
        const { doTheUpdate, noActiveEffect } = VariantEncumbranceDnd5eHelpers.isAEncumbranceUpdated(
            actorEntity,
            update,
        );
        if (doTheUpdate && actorEntity.sheet?.rendered) {
            // if (
            //   hasPropertyPatched(update, `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.ITEM.veweight}`) ||
            //   hasPropertyPatched(update, `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.ITEM.bulk}`)
            // ) {
            //   return wrapped(updates, context);
            // }
            // if (VariantEncumbranceDnd5eHelpers.isEnabledActorType(actorEntity) && actorEntity.sheet?.rendered) {
            if (noActiveEffect) {
                if (game.settings.get(CONSTANTS.MODULE_ID, "enabled")) {
                    VariantEncumbranceImpl.calculateEncumbrance(
                        actorEntity,
                        actorEntity.items.contents,
                        false,
                        invPlusActive,
                    );
                }
                if (game.settings.get(CONSTANTS.MODULE_ID, "enableBulkSystem")) {
                    VariantEncumbranceBulkImpl.calculateEncumbrance(
                        actorEntity,
                        actorEntity.items.contents,
                        false,
                        invPlusActive,
                    );
                }
            } else {
                const dataToCheck = data;
                dataToCheck.system = foundry.utils.mergeObject(data.system, update.system);
                if (game.settings.get(CONSTANTS.MODULE_ID, "enabled")) {
                    await VariantEncumbranceImpl.updateEncumbrance(
                        actorEntity,
                        dataToCheck,
                        actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.ENABLED_AE),
                        EncumbranceMode.UPDATE,
                    );
                }
                if (game.settings.get(CONSTANTS.MODULE_ID, "enableBulkSystem")) {
                    await VariantEncumbranceBulkImpl.updateEncumbrance(
                        actorEntity,
                        dataToCheck,
                        actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.ENABLED_AE_BULK),
                        EncumbranceMode.UPDATE,
                    );
                }
            }
        }
    }

    static async manageDeleteDocumentItem(actorEntity, update, data) {
        const { doTheUpdate, noActiveEffect } = VariantEncumbranceDnd5eHelpers.isAEncumbranceUpdated(
            actorEntity,
            update,
        );
        if (doTheUpdate && actorEntity.sheet?.rendered) {
            const dataToCheck = data;
            dataToCheck.system = foundry.utils.mergeObject(data.system, update.system);
            if (game.settings.get(CONSTANTS.MODULE_ID, "enabled")) {
                await VariantEncumbranceImpl.updateEncumbrance(
                    actorEntity,
                    dataToCheck,
                    actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.ENABLED_AE),
                    EncumbranceMode.DELETE,
                );
            }
            if (game.settings.get(CONSTANTS.MODULE_ID, "enableBulkSystem")) {
                await VariantEncumbranceBulkImpl.updateEncumbrance(
                    actorEntity,
                    dataToCheck,
                    actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.ENABLED_AE_BULK),
                    EncumbranceMode.DELETE,
                );
            }
        }
        // }
    }
}
