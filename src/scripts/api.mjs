import { VariantEncumbranceImpl } from "./VariantEncumbranceImpl.mjs";
import CONSTANTS from "./constants.mjs";
import Effect from "./effects/effect.mjs";
import { checkBulkCategory, error, isStringEquals, warn } from "./lib/lib.mjs";
import { VariantEncumbranceBulkImpl } from "./VariantEncumbranceBulkImpl.mjs";
import { invPlusActive } from "./modules.mjs";

const API = {
  async calculateWeightOnActorFromIdArr(...inAttributes) {
    if (!Array.isArray(inAttributes)) {
      throw error("calculateWeightOnActorFromIdArr | inAttributes must be of type array");
    }
    const [actorIdOrName] = inAttributes;
    return this.calculateWeightOnActorFromId(actorIdOrName);
  },

  calculateWeightOnActorFromId(actorIdOrName) {
    const actor = game.actors?.contents.find((actorEntity) => {
      return isStringEquals(actorEntity.id, actorIdOrName) || isStringEquals(actorEntity.name, actorIdOrName);
    });
    if (!actor) {
      warn(`No actor found for reference '${actorIdOrName}'`);
      return;
    }
    return this.calculateWeightOnActor(actor);
  },

  async calculateWeightOnTokenFromIdArr(...inAttributes) {
    if (!Array.isArray(inAttributes)) {
      throw error("calculateWeightOnTokenFromIdArr | inAttributes must be of type array");
    }
    const [tokenIdOrName] = inAttributes;
    return this.calculateWeightOnTokenFromId(tokenIdOrName);
  },

  calculateWeightOnTokenFromId(tokenIdOrName) {
    const token = canvas.tokens?.placeables.find((tokenEntity) => {
      return isStringEquals(tokenEntity.id, tokenIdOrName) || isStringEquals(tokenEntity.name, tokenIdOrName);
    });
    if (!token) {
      warn(`No token found for reference '${tokenIdOrName}'`);
      return;
    }
    const actor = token.actor;
    if (!actor) {
      warn(`No actor found for reference '${tokenIdOrName}'`);
      return;
    }
    return this.calculateWeightOnActor(actor);
  },

  async calculateWeightOnActorArr(...inAttributes) {
    if (!Array.isArray(inAttributes)) {
      throw error("calculateWeightOnActorArr | inAttributes must be of type array");
    }
    const [actorIdOrName] = inAttributes;
    const actor = game.actors?.contents.find((actorEntity) => {
      return isStringEquals(actorEntity.id, actorIdOrName) || isStringEquals(actorEntity.name, actorIdOrName);
    });
    return this.calculateWeightOnActor(actor);
  },

  calculateWeightOnActor(actor) {
    if (!actor) {
      warn(`No actor is been passed`);
      return;
    }
    const physicalItems = ["weapon", "equipment", "consumable", "tool", "backpack", "loot"];
    const inventoryItems = [];
    actor.items.contents.forEach((im) => {
      if (im && physicalItems.includes(im.type)) {
        inventoryItems.push(im);
      }
    });
    const encumbranceData = VariantEncumbranceImpl.calculateEncumbrance(actor, inventoryItems, false, invPlusActive);
    return encumbranceData;
  },

  // ====================================================

  async calculateBulkOnActorFromIdArr(...inAttributes) {
    if (!Array.isArray(inAttributes)) {
      throw error("calculateBulkOnActorFromIdArr | inAttributes must be of type array");
    }
    const [actorIdOrName] = inAttributes;
    return this.calculateBulkOnActorFromId(actorIdOrName);
  },

  calculateBulkOnActorFromId(actorIdOrName) {
    const actor = game.actors?.contents.find((actorEntity) => {
      return isStringEquals(actorEntity.id, actorIdOrName) || isStringEquals(actorEntity.name, actorIdOrName);
    });
    if (!actor) {
      warn(`No actor found for reference '${actorIdOrName}'`);
      return;
    }
    return this.calculateBulkOnActor(actor);
  },

  async calculateBulkOnTokenFromIdArr(...inAttributes) {
    if (!Array.isArray(inAttributes)) {
      throw error("calculateBulkOnTokenFromIdArr | inAttributes must be of type array");
    }
    const [tokenIdOrName] = inAttributes;
    return this.calculateBulkOnTokenFromId(tokenIdOrName);
  },

  calculateBulkOnTokenFromId(tokenIdOrName) {
    const token = canvas.tokens?.placeables.find((tokenEntity) => {
      return isStringEquals(tokenEntity.id, tokenIdOrName) || isStringEquals(tokenEntity.name, tokenIdOrName);
    });
    if (!token) {
      warn(`No token found for reference '${tokenIdOrName}'`);
      return;
    }
    const actor = token.actor;
    if (!actor) {
      warn(`No actor found for reference '${tokenIdOrName}'`);
      return;
    }
    return this.calculateBulkOnActor(actor);
  },

  async calculateBulkOnActorArr(...inAttributes) {
    if (!Array.isArray(inAttributes)) {
      throw error("calculateBulkOnActorArr | inAttributes must be of type array");
    }
    const [actorIdOrName] = inAttributes;
    const actor = game.actors?.contents.find((actorEntity) => {
      return isStringEquals(actorEntity.id, actorIdOrName) || isStringEquals(actorEntity.name, actorIdOrName);
    });
    return this.calculateBulkOnActor(actor);
  },

  calculateBulkOnActor(actor) {
    if (!actor) {
      warn(`No actor is been passed`);
      return;
    }
    const physicalItems = ["weapon", "equipment", "consumable", "tool", "backpack", "loot"];
    const inventoryItems = [];
    actor.items.contents.forEach((im) => {
      if (im && physicalItems.includes(im.type)) {
        inventoryItems.push(im);
      }
    });
    const encumbranceData = VariantEncumbranceBulkImpl.calculateEncumbrance(
      actor,
      inventoryItems,
      false,
      invPlusActive
    );
    return encumbranceData;
  },

  // ====================================================

  calculateWeightOnActorWithItems(actor, items, ignoreCurrency = true) {
    if (!actor) {
      warn(`No actor is been passed`);
      return;
    }
    const encumbranceData = VariantEncumbranceImpl.calculateEncumbrance(actor, items, ignoreCurrency, invPlusActive);
    return encumbranceData;
  },

  calculateBulkOnActorWithItems(actor, items, ignoreCurrency = true) {
    if (!actor) {
      warn(`No actor is been passed`);
      return;
    }
    const encumbranceData = VariantEncumbranceBulkImpl.calculateEncumbrance(
      actor,
      items,
      ignoreCurrency,
      invPlusActive
    );
    return encumbranceData;
  },

  convertLbToBulk(weight, item) {
    return checkBulkCategory(weight, item).bulk;
  },

  calculateWeightOnActorWithItemsNoInventoryPlus(actor, items, ignoreCurrency = true) {
    if (!actor) {
      warn(`No actor is been passed`);
      return;
    }
    const encumbranceData = VariantEncumbranceImpl.calculateEncumbrance(actor, items, ignoreCurrency, false);
    return encumbranceData;
  },

  calculateBulkOnActorWithItemsNoInventoryPlus(actor, items, ignoreCurrency = true) {
    if (!actor) {
      warn(`No actor is been passed`);
      return;
    }
    const encumbranceData = VariantEncumbranceBulkImpl.calculateEncumbrance(actor, items, ignoreCurrency, false);
    return encumbranceData;
  },
};

export default API;
