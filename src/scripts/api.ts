import { VariantEncumbranceImpl } from "./VariantEncumbranceImpl";
import CONSTANTS from "./constants";
import type Effect from "./effects/effect";
import { checkBulkCategory, error, isStringEquals, warn } from "./lib/lib";
import type { ActiveEffectData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/module.mjs";
import type { EncumbranceBulkData, EncumbranceData } from "./VariantEncumbranceModels";
import { VariantEncumbranceBulkImpl } from "./VariantEncumbranceBulkImpl";
import { invPlusActive } from "./modules";

const API = {
	async calculateWeightOnActorFromIdArr(...inAttributes: any[]): Promise<EncumbranceData | undefined> {
		if (!Array.isArray(inAttributes)) {
			throw error("calculateWeightOnActorFromIdArr | inAttributes must be of type array");
		}
		const [actorIdOrName] = inAttributes;
		return this.calculateWeightOnActorFromId(actorIdOrName);
	},

	calculateWeightOnActorFromId(actorIdOrName: string): EncumbranceData | undefined {
		const actor = game.actors?.contents.find((a) => {
			return isStringEquals(a.id, actorIdOrName) || isStringEquals(<string>a.name, actorIdOrName);
		});
		if (!actor) {
			warn(`No actor found for reference '${actorIdOrName}'`);
			return;
		}
		return this.calculateWeightOnActor(actor);
	},

	async calculateWeightOnTokenFromIdArr(...inAttributes: any[]): Promise<EncumbranceData | undefined> {
		if (!Array.isArray(inAttributes)) {
			throw error("calculateWeightOnTokenFromIdArr | inAttributes must be of type array");
		}
		const [tokenIdOrName] = inAttributes;
		return this.calculateWeightOnTokenFromId(tokenIdOrName);
	},

	calculateWeightOnTokenFromId(tokenIdOrName: string): EncumbranceData | undefined {
		const token = canvas.tokens?.placeables.find((a) => {
			return isStringEquals(a.id, tokenIdOrName) || isStringEquals(a.name, tokenIdOrName);
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

	async calculateWeightOnActorArr(...inAttributes: any[]): Promise<EncumbranceData | undefined> {
		if (!Array.isArray(inAttributes)) {
			throw error("calculateWeightOnActorArr | inAttributes must be of type array");
		}
		const [actor] = inAttributes;
		return this.calculateWeightOnActor(actor);
	},

	calculateWeightOnActor(actor: Actor): EncumbranceData | undefined {
		if (!actor) {
			warn(`No actor is been passed`);
			return;
		}
		const physicalItems = ["weapon", "equipment", "consumable", "tool", "backpack", "loot"];
		const inventoryItems: Item[] = [];
		actor.data.items.contents.forEach((im: Item) => {
			if (im && physicalItems.includes(im.type)) {
				inventoryItems.push(im);
			}
		});
		const encumbranceData = VariantEncumbranceImpl.calculateEncumbrance(
			actor,
			inventoryItems,
			false,
			invPlusActive
		);
		return encumbranceData;
	},

	// ====================================================

	async calculateBulkOnActorFromIdArr(...inAttributes: any[]): Promise<EncumbranceData | undefined> {
		if (!Array.isArray(inAttributes)) {
			throw error("calculateBulkOnActorFromIdArr | inAttributes must be of type array");
		}
		const [actorIdOrName] = inAttributes;
		return this.calculateBulkOnActorFromId(actorIdOrName);
	},

	calculateBulkOnActorFromId(actorIdOrName: string): EncumbranceData | undefined {
		const actor = game.actors?.contents.find((a) => {
			return isStringEquals(a.id, actorIdOrName) || isStringEquals(<string>a.name, actorIdOrName);
		});
		if (!actor) {
			warn(`No actor found for reference '${actorIdOrName}'`);
			return;
		}
		return this.calculateBulkOnActor(actor);
	},

	async calculateBulkOnTokenFromIdArr(...inAttributes: any[]): Promise<EncumbranceData | undefined> {
		if (!Array.isArray(inAttributes)) {
			throw error("calculateBulkOnTokenFromIdArr | inAttributes must be of type array");
		}
		const [tokenIdOrName] = inAttributes;
		return this.calculateBulkOnTokenFromId(tokenIdOrName);
	},

	calculateBulkOnTokenFromId(tokenIdOrName: string): EncumbranceData | undefined {
		const token = canvas.tokens?.placeables.find((a) => {
			return isStringEquals(a.id, tokenIdOrName) || isStringEquals(a.name, tokenIdOrName);
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

	async calculateBulkOnActorArr(...inAttributes: any[]): Promise<EncumbranceData | undefined> {
		if (!Array.isArray(inAttributes)) {
			throw error("calculateBulkOnActorArr | inAttributes must be of type array");
		}
		const [actor] = inAttributes;
		return this.calculateBulkOnActor(actor);
	},

	calculateBulkOnActor(actor: Actor): EncumbranceData | undefined {
		if (!actor) {
			warn(`No actor is been passed`);
			return;
		}
		const physicalItems = ["weapon", "equipment", "consumable", "tool", "backpack", "loot"];
		const inventoryItems: Item[] = [];
		actor.data.items.contents.forEach((im: Item) => {
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

	calculateWeightOnActorWithItems(actor: Actor, items: Item[]): EncumbranceData | undefined {
		if (!actor) {
			warn(`No actor is been passed`);
			return;
		}
		const encumbranceData = VariantEncumbranceImpl.calculateEncumbrance(actor, items, true, invPlusActive);
		return encumbranceData;
	},

	calculateBulkOnActorWithItems(actor: Actor, items: Item[]): EncumbranceBulkData | undefined {
		if (!actor) {
			warn(`No actor is been passed`);
			return;
		}
		const encumbranceData = VariantEncumbranceBulkImpl.calculateEncumbrance(actor, items, true, invPlusActive);
		return encumbranceData;
	},

	convertLbToBulk(weight: number): number {
		return checkBulkCategory(weight).bulk;
	},

	calculateWeightOnActorWithItemsNoInventoryPlus(actor: Actor, items: Item[]): EncumbranceData | undefined {
		if (!actor) {
			warn(`No actor is been passed`);
			return;
		}
		const encumbranceData = VariantEncumbranceImpl.calculateEncumbrance(actor, items, true, false);
		return encumbranceData;
	},

	calculateBulkOnActorWithItemsNoInventoryPlus(actor: Actor, items: Item[]): EncumbranceBulkData | undefined {
		if (!actor) {
			warn(`No actor is been passed`);
			return;
		}
		const encumbranceData = VariantEncumbranceBulkImpl.calculateEncumbrance(actor, items, true, false);
		return encumbranceData;
	},
};

export default API;
