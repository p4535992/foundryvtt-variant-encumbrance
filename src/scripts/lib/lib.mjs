import { BULK_CATEGORY, BulkData, EncumbranceActorType } from "./../VariantEncumbranceModels.mjs";
import CONSTANTS from "../constants.mjs";
import { calcBulkItemCollection } from "../VariantEncumbranceBulkImpl.mjs";
import { backPackManagerActive, itemContainerActive } from "../modules.mjs";
import { calcWeightItemCollection } from "../VariantEncumbranceImpl.mjs";
import API from "../api.mjs";
import Logger from "./Logger.js";

// =============================
// Module Generic function
// =============================

export async function getToken(documentUuid) {
  const document = await fromUuid(documentUuid);

  return document?.token ?? document;
}

export function getOwnedTokens(priorityToControlledIfGM) {
  const gm = game.user?.isGM;
  if (gm) {
    if (priorityToControlledIfGM) {
      const arr = canvas.tokens?.controlled;
      if (arr && arr.length > 0) {
        return arr;
      } else {
        return canvas.tokens?.placeables;
      }
    } else {
      return canvas.tokens?.placeables;
    }
  }
  if (priorityToControlledIfGM) {
    const arr = canvas.tokens?.controlled;
    if (arr && arr.length > 0) {
      return arr;
    }
  }
  let ownedTokens = canvas.tokens?.placeables.filter((token) => token.isOwner && (!token.document.hidden || gm));
  if (ownedTokens.length === 0 || !canvas.tokens?.controlled[0]) {
    ownedTokens = canvas.tokens?.placeables.filter(
      (token) => (token.observer || token.isOwner) && (!token.document.hidden || gm)
    );
  }
  return ownedTokens;
}

export function isUUID(inId) {
  return typeof inId === "string" && (inId.match(/\./g) || []).length && !inId.endsWith(".");
}

export function getUuid(target) {
  // If it's an actor, get its TokenDocument
  // If it's a token, get its Document
  // If it's a TokenDocument, just use it
  // Otherwise fail
  const document = getDocument(target);
  return document?.uuid ?? false;
}

export function getDocument(target) {
  if (target instanceof foundry.abstract.Document) return target;
  return target?.document;
}

export function isRealNumber(inNumber) {
  return !isNaN(inNumber) && typeof inNumber === "number" && isFinite(inNumber);
}

export function isGMConnected() {
  return !!Array.from(game.users).find((user) => user.isGM && user.active);
}

export function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isActiveGM(user) {
  return user.active && user.isGM;
}

export function getActiveGMs() {
  return game.users?.filter(isActiveGM);
}

export function isResponsibleGM() {
  if (!game.user?.isGM) return false;
  return !getActiveGMs()?.some((other) => other.id < game.user?.id);
}

export function firstGM() {
  return game.users?.find((u) => u.isGM && u.active);
}

export function isFirstGM() {
  return game.user?.id === firstGM()?.id;
}

export function firstOwner(doc) {
  /* null docs could mean an empty lookup, null docs are not owned by anyone */
  if (!doc) return undefined;
  const permissionObject = (doc instanceof TokenDocument ? doc.actor?.permission : doc.permission) ?? {};
  const playerOwners = Object.entries(permissionObject)
    .filter(([id, level]) => !game.users?.get(id)?.isGM && game.users?.get(id)?.active && level === 3)
    .map(([id, level]) => id);

  if (playerOwners.length > 0) {
    return game.users?.get(playerOwners[0]);
  }

  /* if no online player owns this actor, fall back to first GM */
  return firstGM();
}

/* Players first, then GM */
export function isFirstOwner(doc) {
  return game.user?.id === firstOwner(doc)?.id;
}

// =========================================================================================

export function cleanUpString(stringToCleanUp) {
  // regex expression to match all non-alphanumeric characters in string
  const regex = /[^A-Za-z0-9]/g;
  if (stringToCleanUp) {
    return Logger.i18n(stringToCleanUp).replace(regex, "").toLowerCase();
  } else {
    return stringToCleanUp;
  }
}

export function isStringEquals(stringToCheck1, stringToCheck2, startsWith = false) {
  if (stringToCheck1 && stringToCheck2) {
    const s1 = cleanUpString(stringToCheck1) ?? "";
    const s2 = cleanUpString(stringToCheck2) ?? "";
    if (startsWith) {
      return s1.startsWith(s2) || s2.startsWith(s1);
    } else {
      return s1 === s2;
    }
  } else {
    return stringToCheck1 === stringToCheck2;
  }
}

// /**
//  * The duplicate function of foundry keep converting my string value to "0"
//  * i don't know why this methos is a brute force solution for avoid that problem
//  */
// export function duplicateExtended(obj) {
//   try {
//
//     if (structuredClone) {
//
//       return structuredClone(obj);
//     } else {
//       // Shallow copy
//       // const newObject = jQuery.extend({}, oldObject);
//       // Deep copy
//       // const newObject = jQuery.extend(true, {}, oldObject);
//       return jQuery.extend(true, {}, obj);
//     }
//   } catch (e) {
//     return duplicate(obj);
//   }
// }

// /**
//  *
//  * @param obj Little helper for loop enum element on typescript
//  * @href https://www.petermorlion.com/iterating-a-typescript-enum/
//  * @returns
//  */
// export function enumKeys(obj) {
//   return Object.keys(obj).filter((k) => Number.isNaN(+k));
// }

// /**
//  * @href https://stackoverflow.com/questions/7146217/merge-2-arrays-of-objects
//  * @param target
//  * @param source
//  * @param prop
//  */
// export function mergeByProperty(target, source, prop) {
//   for (const sourceElement of source) {
//     const targetElement = target.find((targetElement) => {
//       return sourceElement[prop] === targetElement[prop];
//     });
//     targetElement ? Object.assign(targetElement, sourceElement) : target.push(sourceElement);
//   }
//   return target;
// }

// =============================
// Module specific function
// =============================

export function convertPoundsToKg(valNum) {
  return valNum / 2.20462262;
}

export function convertKgToPounds(valNum) {
  return valNum * 2.20462262;
}

export function checkBulkCategory(weight, item) {
  let bulkRef = weight ?? 0;
  if (item && hasProperty(item, `flags.itemcollection`) && itemContainerActive) {
    const useEquippedUnequippedItemCollectionFeature = game.settings.get(
      CONSTANTS.MODULE_ID,
      "useEquippedUnequippedItemCollectionFeature"
    );
    const doNotIncreaseWeightByQuantityForNoAmmunition = game.settings.get(
      CONSTANTS.MODULE_ID,
      "doNotIncreaseWeightByQuantityForNoAmmunition"
    );
    // TODO IS OK TO DO THIS FOR ITEM CONTAINER ????
    // bulkRef = calcWeightItemCollection(item, useEquippedUnequippedItemCollectionFeature, false, doNotIncreaseWeightByQuantityForNoAmmunition);
    // if (game.settings.get("dnd5e", "metricWeightUnits")) {
    // 	bulkRef = bulkRef <= 0 ? 0 : convertPoundsToKg(bulkRef);
    // }
    bulkRef = calcBulkItemCollection(
      item,
      useEquippedUnequippedItemCollectionFeature,
      false,
      doNotIncreaseWeightByQuantityForNoAmmunition
    );
  }
  if (bulkRef <= 0) {
    return BULK_CATEGORY.NONE;
  } else if (bulkRef <= 2) {
    return BULK_CATEGORY.TINY;
  } else if (bulkRef > 2 && bulkRef <= 5) {
    return BULK_CATEGORY.SMALL;
  } else if (bulkRef > 5 && bulkRef <= 10) {
    return BULK_CATEGORY.SMALL;
  } else if (bulkRef > 10 && bulkRef <= 35) {
    return BULK_CATEGORY.LARGE;
  } else if (bulkRef > 35 && bulkRef <= 70) {
    return BULK_CATEGORY.X_LARGE;
  } else if (bulkRef > 70) {
    return BULK_CATEGORY.XX_LARGE;
  } else {
    return BULK_CATEGORY.XX_LARGE;
  }
}

export function retrieveAttributeEncumbranceMax(actorEntity, standardValueN) {
  // const standardValueS = getProperty(actor, 'system.attributes.encumbrance.max');
  // let standardValueN = 0;
  // try {
  //   standardValueN = Number(standardValueS);
  // } catch (e) {
  //   standardValueN = 0;
  // }
  const daeValue = retrieveActiveEffectDataChangeByKey(actorEntity, "system.attributes.encumbrance.max");
  try {
    if (daeValue) {
      const valueN = Number(daeValue.value);
      if (daeValue.mode === CONST.ACTIVE_EFFECT_MODES.ADD) {
        return standardValueN + valueN;
      } else if (daeValue.mode === CONST.ACTIVE_EFFECT_MODES.DOWNGRADE) {
        return standardValueN - valueN;
      } else if (daeValue.mode === CONST.ACTIVE_EFFECT_MODES.MULTIPLY) {
        return standardValueN * valueN;
      } else if (
        daeValue.mode === CONST.ACTIVE_EFFECT_MODES.CUSTOM ||
        daeValue.mode === CONST.ACTIVE_EFFECT_MODES.OVERRIDE ||
        daeValue.mode === CONST.ACTIVE_EFFECT_MODES.UPGRADE
      ) {
        return valueN;
      } else {
        Logger.warn(`Can't parse the mode value ${daeValue.mode} for 'data.attributes.encumbrance.max'`);
        return 0;
      }
    } else {
      return 0;
    }
  } catch (e) {
    Logger.warn(`Can't parse the value ${daeValue} for 'data.attributes.encumbrance.max'`);
    return 0;
  }
}

export function retrieveAttributeCapacityCargo(actor, standardValueN) {
  // const standardValueS = getProperty(actor, 'system.attributes.capacity.cargo');
  // let standardValueN = 0;
  // try {
  //   standardValueN = Number(standardValueS);
  // } catch (e) {
  //   standardValueN = 0;
  // }
  const daeValue = retrieveActiveEffectDataChangeByKey(actor, "system.attributes.capacity.cargo");
  try {
    if (daeValue) {
      const valueN = Number(daeValue.value);
      if (daeValue.mode === CONST.ACTIVE_EFFECT_MODES.ADD) {
        return standardValueN + valueN;
      } else if (daeValue.mode === CONST.ACTIVE_EFFECT_MODES.DOWNGRADE) {
        return standardValueN - valueN;
      } else if (daeValue.mode === CONST.ACTIVE_EFFECT_MODES.MULTIPLY) {
        return standardValueN * valueN;
      } else if (
        daeValue.mode === CONST.ACTIVE_EFFECT_MODES.CUSTOM ||
        daeValue.mode === CONST.ACTIVE_EFFECT_MODES.OVERRIDE ||
        daeValue.mode === CONST.ACTIVE_EFFECT_MODES.UPGRADE
      ) {
        return valueN;
      } else {
        Logger.warn(`Can't parse the mode value ${daeValue.mode} for 'system.attributes.capacity.cargo'`);
        return 0;
      }
    } else {
      return 0;
    }
  } catch (e) {
    Logger.warn(`Can't parse the value ${daeValue} for 'system.attributes.capacity.cargo'`);
    return 0;
  }
}

export function retrieveActiveEffectDataChangeByKey(actor, key) {
  if (!actor) {
    return undefined;
  }
  if (actor.documentName !== "Actor") {
    return undefined;
  }
  const isPlayerOwned = actor.token?.isOwner;
  if (!game.user?.isGM && !isPlayerOwned) {
    return undefined;
  }
  // let sourceToken = actor.token?.object;
  // if (!sourceToken) {
  //   sourceToken = canvas.tokens?.placeables.find((t) => {
  //     return t.actor?.id === actor.id;
  //   });
  // }
  // if (!sourceToken) {
  //   return;
  // }

  let valueDefault = undefined;
  const actorEffects = actor?.effects;
  for (const aef of actorEffects) {
    if (aef.disabled) {
      continue;
    }

    const c = retrieveActiveEffectDataChangeByKeyFromActiveEffect(actor, key, aef.changes);
    if (c && c.value) {
      valueDefault = c;
      break;
    }
  }
  return valueDefault;
}

export function retrieveActiveEffectDataChangeByKeyFromActiveEffect(actor, activeEffectDataChangeKey, effectChanges) {
  const effectEntityChanges = effectChanges.sort((a, b) => a.priority - b.priority);
  const atcvEffectChangeData = effectEntityChanges.find((aee) => {
    if (aee.key === activeEffectDataChangeKey && aee.value) {
      return aee;
    }
    return false;
  });
  if (!atcvEffectChangeData || !atcvEffectChangeData.value) {
    return undefined;
  }
  let myvalue = "";
  if (
    (atcvEffectChangeData.value && String(atcvEffectChangeData.value).includes("data.")) ||
    (atcvEffectChangeData.value && String(atcvEffectChangeData.value).includes("system."))
  ) {
    // Retrieve the formula.
    const formula = atcvEffectChangeData.value.replace(/data\./g, "@");
    // Replace shorthand.
    // formula = formula
    //   .replace(/@abil\./g, '@abilities.')
    //   .replace(/@attr\./g, '@attributes.');
    // Roll the dice!
    // Build the roll.
    const data = actor ? actor.getRollData() : {};
    const roll = new Roll(formula, data);
    // Roll the dice.
    let myresult = "";
    //roll.roll();
    try {
      // TODO Roll#evaluate is becoming asynchronous. In the short term you may pass async=true or async=false
      // to evaluation options to nominate your preferred behavior.
      roll.evaluate({ async: false });
      //await roll.evaluate({async: true});
      myresult = roll.total ? String(roll.total) : roll.result;
    } catch (e) {
      const evalValue = eval(roll.result);
      myresult = evalValue ? String(evalValue) : "";
    }
    myvalue = myresult;
  } else if (atcvEffectChangeData.value && String(atcvEffectChangeData.value).includes("@")) {
    // Retrieve the formula.
    const formula = atcvEffectChangeData.value;
    // Replace shorthand.
    // formula = formula
    //   .replace(/@abil\./g, '@abilities.')
    //   .replace(/@attr\./g, '@attributes.');
    // Roll the dice!
    // Build the roll.
    const data = actor ? actor.getRollData() : {};
    const roll = new Roll(formula, data);
    // Roll the dice.
    let myresult = "";
    //roll.roll();
    try {
      // TODO Roll#evaluate is becoming asynchronous. In the short term you may pass async=true or async=false
      // to evaluation options to nominate your preferred behavior.
      roll.evaluate({ async: false });
      //await roll.evaluate({async: true});
      myresult = roll.total ? String(roll.total) : roll.result;
    } catch (e) {
      const evalValue = eval(roll.result);
      myresult = evalValue ? String(evalValue) : "";
    }
    myvalue = myresult;
  } else {
    try {
      const evalValue = eval(atcvEffectChangeData.value);
      myvalue = evalValue ? String(evalValue) : "";
    } catch (e) {
      myvalue = atcvEffectChangeData.value;
    }
  }
  return {
    key: atcvEffectChangeData.key,
    value: myvalue,
    mode: atcvEffectChangeData.mode,
    priority: atcvEffectChangeData.priority,
  };
}

export function getItemWeight(item) {
  const itemWeight = isRealNumber(item.system.weight) ? item.system.weight : 0;
  return itemWeight ?? 0;
}

export function getItemQuantity(item) {
  const itemQuantity = isRealNumber(item.system.quantity) ? item.system.quantity : 0;
  return itemQuantity ?? 0;
}

export function getItemBulk(item) {
  const itemBulk = getProperty(item, `flags.${CONSTANTS.MODULE_ID}.bulk`);
  const itemWeightBulk = isRealNumber(itemBulk) ? itemBulk : 0;
  return itemWeightBulk ?? 0;
}

export function getBulkLabel() {
  const bulkLabelI18n = Logger.i18n("variant-encumbrance-dnd5e.label.bulk.Bulk");
  const displayedUnits = game.settings.get(CONSTANTS.MODULE_ID, "unitsBulk");
  const bulkLabel = capitalizeFirstLetter(displayedUnits ?? bulkLabelI18n);
  return bulkLabel;
}

export function getWeightLabel() {
  const displayedUnits = game.settings.get("dnd5e", "metricWeightUnits")
    ? game.settings.get(CONSTANTS.MODULE_ID, "unitsMetric")
    : game.settings.get(CONSTANTS.MODULE_ID, "units");
  const weightLabel = capitalizeFirstLetter(displayedUnits);
  return weightLabel;
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/* Whether this is a valid item to put in a backpack. */
export function isValidBackPackManagerItem(item) {
  if (!backPackManagerActive) {
    return false;
  }
  if (game.system.id === "dnd5e") {
    if (["class", "subclass", "feat", "spell", "background", "race"].includes(item.type)) {
      return false;
    }
    if (item.system.quantity < 1) {
      return false;
    }
    if (item.type !== "backpack") {
      return true;
    }
  }

  // it must not be setup with this module:
  const uuid = item.getFlag(CONSTANTS.BACKPACK_MANAGER_MODULE_ID, "containerActorUuid");
  if (!uuid) {
    return true;
  }

  const backpack = fromUuidSync(uuid);
  if (!backpack) {
    return true;
  }
  // if for some ungodly reason, you put yourself in yourself:
  if (backpack === item.parent) {
    return true;
  }
  return false;
}

/* Whether this is a valid item to put in a backpack. */
export function retrieveBackPackManagerItem(item) {
  if (!backPackManagerActive || !item) {
    return undefined;
  }
  if (!hasProperty(item, `flags.${CONSTANTS.BACKPACK_MANAGER_MODULE_ID}.containerActorUuid`)) {
    return undefined;
  }

  // it must not be setup with this module:
  const uuid = getProperty(item, `flags.${CONSTANTS.BACKPACK_MANAGER_MODULE_ID}.containerActorUuid`);
  if (!uuid) {
    return undefined;
  }

  const backpack = fromUuidSync(uuid);
  if (!backpack) {
    Logger.warn(`No backpack (Actor) is been found with uuid:${uuid} on item: ${item.name}`);
    return undefined;
  }
  // if for some ungodly reason, you put yourself in yourself:
  if (backpack === item.parent) {
    Logger.warn(
      `No backpack (Actor) is been evaluate with uuid:${uuid} on item: ${item.name} if for some ungodly reason, you put yourself in yourself`
    );
    return undefined;
  }
  return backpack;
}

// The items stowed on the Backpack Actor.
export function stowedItemBackPackManager(bag) {
  return bag.items
    .filter((item) => {
      return isValidBackPackManagerItem(item);
    })
    .sort((a, b) => {
      return a.name.localeCompare(b.name);
    });
}

// // The items held on the Actor.
// export function itemItemBackPackManager(bag) {
// 	return this.actor.items
// 		.filter((item) => {
// 			return isValidBackPackManagerItem(item);
// 		})
// 		.sort((a, b) => {
// 			return a.name.localeCompare(b.name);
// 		});
// }

export function calculateBackPackManagerWeight(item, bag, ignoreCurrency) {
  const data = {};
  const stowed = stowedItemBackPackManager(bag);

  const type = item.system.capacity.type;
  if (type === "weight") {
    const backpackManagerWeight =
      API.calculateWeightOnActorWithItems(bag, stowed, ignoreCurrency)?.totalWeight ?? getItemWeight(item);
    data.bagValue = backpackManagerWeight;
  } else if (type === "items") {
    data.bagValue = stowed.reduce((acc, item) => {
      return acc + getItemQuantity(item);
    }, 0);
  }

  return data.bagValue;
}

export function calculateBackPackManagerBulk(item, bag, ignoreCurrency) {
  const data = {};
  const stowed = stowedItemBackPackManager(bag);

  const type = item.system.capacity.type;
  if (type === "weight") {
    const backpackManagerBulk =
      API.calculateBulkOnActorWithItems(bag, stowed, ignoreCurrency)?.totalWeight ?? getItemBulk(item);
    data.bagValue = backpackManagerBulk;
  } else if (type === "items") {
    data.bagValue = stowed.reduce((acc, item) => {
      return acc + getItemQuantity(item);
    }, 0);
  }

  return data.bagValue;
}
