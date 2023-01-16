// Import JavaScript modules
import {
	EncumbranceActorType,
	EncumbranceBulkData,
	EncumbranceDnd5e,
	EncumbranceFlags,
	EncumbranceMode,
	ENCUMBRANCE_TIERS,
} from "./VariantEncumbranceModels";
import Effect from "./effects/effect";
import {
	ENCUMBRANCE_STATE,
	invMidiQol,
	invPlusActive,
	daeActive,
	dfQualityLifeActive,
	aemlApi,
	itemContainerActive,
} from "./modules";
import CONSTANTS from "./constants";
import {
	debug,
	error,
	i18n,
	isGMConnected,
	is_real_number,
	retrieveAttributeCapacityCargo,
	retrieveAttributeEncumbranceMax,
} from "./lib/lib";
import API from "./api";
import type { EffectChangeData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/effectChangeData";
import type { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/module.mjs";

/* ------------------------------------ */
/* Constants         					*/
/* ------------------------------------ */

export const VariantEncumbranceBulkImpl = {
	updateEncumbrance: async function (
		actorEntity: Actor,
		updatedItems: any[] | undefined,
		updatedEffect: boolean,
		mode?: EncumbranceMode
	): Promise<void> {
		if (updatedItems && updatedItems.length > 0) {
			for (let i = 0; i < updatedItems.length; i++) {
				const updatedItem: any = updatedItems ? (<any[]>updatedItems)[i] : undefined;
				await VariantEncumbranceBulkImpl._updateEncumbranceInternal(
					actorEntity,
					updatedItem,
					updatedEffect,
					mode
				);
			}
		} else {
			await VariantEncumbranceBulkImpl._updateEncumbranceInternal(actorEntity, undefined, updatedEffect, mode);
		}
	},

	_updateEncumbranceInternal: async function (
		actorEntity: Actor,
		updatedItem: any | undefined,
		updatedEffect?: boolean,
		mode?: EncumbranceMode
	): Promise<void> {
		if (updatedItem) {
			let itemID: any;
			if (typeof updatedItem === "string" || updatedItem instanceof String) {
				itemID = <string>updatedItem;
			} else {
				itemID = updatedItem?.id ? updatedItem?.id : updatedItem._id;
			}
			let itemCurrent: Item | undefined = itemID ? <Item>actorEntity.items.get(itemID) : undefined;
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
						//@ts-ignore
						mergeObject(<ItemData>itemCurrent.system, updatedItem);
					} catch (e: any) {
						error(e?.message);
					}
				}
				updatedItem = itemCurrent;
			}
		}

		const currentItemId = updatedItem?.id ? updatedItem?.id : updatedItem?._id;
		const inventoryItems: Item[] = [];
		const isAlreadyInActor = <Item>actorEntity.items?.find((itemTmp: Item) => itemTmp.id === currentItemId);
		const physicalItems = ["weapon", "equipment", "consumable", "tool", "backpack", "loot"];
		actorEntity.items.contents.forEach((im: Item) => {
			if (im && physicalItems.includes(im.type)) {
				if (im.id === currentItemId) {
					if (mode === EncumbranceMode.DELETE) {
						// setProperty(im, 'system.bulk', 0);
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
				if (mode === EncumbranceMode.DELETE) {
					// setProperty(im, 'system.bulk', 0);
				} else {
					inventoryItems.push(im);
				}
			}
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
	},

	calculateEncumbranceWithEffect: async function (
		actorEntity: Actor,
		// veItemData: VariantEncumbranceItemData | null,
		inventoryItems: Item[],
		ignoreCurrency: boolean,
		invPlusActive: boolean
	): Promise<EncumbranceBulkData> {
		const encumbranceDataBulk = VariantEncumbranceBulkImpl.calculateEncumbrance(
			actorEntity,
			inventoryItems,
			ignoreCurrency,
			invPlusActive
		);

		// SEEM NOT NECESSARY Add pre check for encumbrance tier
		if (<boolean>game.settings.get(CONSTANTS.MODULE_NAME, "enablePreCheckEncumbranceTier")) {
			if (hasProperty(actorEntity, `flags.${CONSTANTS.FLAG}.${EncumbranceFlags.DATA_BULK}`)) {
				const encumbranceDataCurrent = <EncumbranceBulkData>(
					actorEntity.getFlag(CONSTANTS.FLAG, EncumbranceFlags.DATA_BULK)
				);
				if (encumbranceDataCurrent.encumbranceTier === encumbranceDataBulk.encumbranceTier) {
					//We ignore all the AE check
					await actorEntity.setFlag(CONSTANTS.FLAG, EncumbranceFlags.DATA_BULK, encumbranceDataBulk);
					return encumbranceDataBulk;
				}
			}
		}

		const enableVarianEncumbranceEffectsOnActorFlag = <boolean>(
			actorEntity.getFlag(CONSTANTS.FLAG, EncumbranceFlags.ENABLED_AE_BULK)
		);
		if (enableVarianEncumbranceEffectsOnActorFlag) {
			await VariantEncumbranceBulkImpl.manageActiveEffect(actorEntity, encumbranceDataBulk.encumbranceTier);
		}
		await actorEntity.setFlag(CONSTANTS.FLAG, EncumbranceFlags.DATA_BULK, encumbranceDataBulk);

		return encumbranceDataBulk;
	},

	manageActiveEffect: async function (actorEntity: Actor, encumbranceTier: number) {
		let effectEntityPresent: ActiveEffect | undefined;

		for (const effectEntity of actorEntity.effects) {
			//@ts-ignore
			const effectNameToSet = effectEntity.label;

			//const effectIsApplied = await VariantEncumbranceBulkImpl.hasEffectAppliedFromId(effectEntity, actorEntity);

			// Remove AE with empty a label but with flag of variant encumbrance ???
			if (!effectNameToSet && hasProperty(effectEntity, `flags.${CONSTANTS.FLAG}`)) {
				await VariantEncumbranceBulkImpl.removeEffectFromId(effectEntity, actorEntity);
				continue;
			}

			if (!effectNameToSet) {
				continue;
			}

			// Remove all encumbrance effect renamed from the player
			if (
				// encumbranceData.encumbranceTier &&
				//@ts-ignore
				effectEntity.flags &&
				hasProperty(effectEntity, `flags.${CONSTANTS.FLAG}`) &&
				effectNameToSet !== ENCUMBRANCE_STATE.UNENCUMBERED &&
				effectNameToSet !== ENCUMBRANCE_STATE.ENCUMBERED &&
				effectNameToSet !== ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED &&
				effectNameToSet !== ENCUMBRANCE_STATE.OVERBURDENED
			) {
				await VariantEncumbranceBulkImpl.removeEffectFromId(effectEntity, actorEntity);
				continue;
			}

			// Remove Old settings
			//@ts-ignore
			if (effectEntity.flags && hasProperty(effectEntity, `flags.VariantEncumbrance`)) {
				await VariantEncumbranceBulkImpl.removeEffectFromId(effectEntity, actorEntity);
				continue;
			}

			// Ignore all non encumbrance effect renamed from the player (again)
			if (
				!hasProperty(effectEntity, `flags.${CONSTANTS.FLAG}`) &&
				effectNameToSet !== ENCUMBRANCE_STATE.UNENCUMBERED &&
				effectNameToSet !== ENCUMBRANCE_STATE.ENCUMBERED &&
				effectNameToSet !== ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED &&
				effectNameToSet !== ENCUMBRANCE_STATE.OVERBURDENED
			) {
				continue;
			}

			// Remove encumbrance effect with same name used in this module
			if (
				!hasProperty(effectEntity, `flags.${CONSTANTS.FLAG}`) &&
				(effectNameToSet === ENCUMBRANCE_STATE.UNENCUMBERED ||
					effectNameToSet === ENCUMBRANCE_STATE.ENCUMBERED ||
					effectNameToSet === ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED ||
					effectNameToSet === ENCUMBRANCE_STATE.OVERBURDENED)
			) {
				await VariantEncumbranceBulkImpl.removeEffectFromId(effectEntity, actorEntity);
				continue;
			}

			if (
				hasProperty(effectEntity, `flags.${CONSTANTS.FLAG}`) &&
				(effectNameToSet === ENCUMBRANCE_STATE.UNENCUMBERED ||
					effectNameToSet === ENCUMBRANCE_STATE.ENCUMBERED ||
					effectNameToSet === ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED ||
					effectNameToSet === ENCUMBRANCE_STATE.OVERBURDENED)
			) {
				if (!effectEntityPresent) {
					effectEntityPresent = effectEntity;
				} else {
					await VariantEncumbranceBulkImpl.removeEffectFromId(effectEntityPresent, actorEntity);
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

		if (!game.settings.get(CONSTANTS.MODULE_NAME, "useVariantEncumbrance")) {
			effectName = ENCUMBRANCE_STATE.UNENCUMBERED;
		}

		if (effectName && effectName !== "") {
			//@ts-ignore
			if (effectName === effectEntityPresent?.label) {
				// Skip if name is the same and the active effect is already present.
			} else {
				if (effectName === ENCUMBRANCE_STATE.UNENCUMBERED) {
					if (effectEntityPresent?.id) {
						const effectIsApplied1 = await VariantEncumbranceBulkImpl.hasEffectAppliedFromId(
							effectEntityPresent,
							actorEntity
						);
						if (effectIsApplied1) {
							await VariantEncumbranceBulkImpl.removeEffectFromId(
								<ActiveEffect>effectEntityPresent,
								actorEntity
							);
						}
					}
				} else {
					if (effectEntityPresent?.id) {
						const effectIsApplied2 = await VariantEncumbranceBulkImpl.hasEffectAppliedFromId(
							effectEntityPresent,
							actorEntity
						);
						if (effectIsApplied2) {
							await VariantEncumbranceBulkImpl.removeEffectFromId(
								<ActiveEffect>effectEntityPresent,
								actorEntity
							);
						}
					}
					const effectIsApplied3 = await VariantEncumbranceBulkImpl.hasEffectApplied(effectName, actorEntity);
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
	 * @returns {{max: number, value: number, pct: number}}  An object describing the character's encumbrance level
	 * @private
	 */
	calculateEncumbrance: function (
		actorEntity: Actor,
		// veItemData: VariantEncumbranceItemData | null,
		inventoryItems: Item[],
		ignoreCurrency: boolean,
		invPlusActiveTmp: boolean
	): EncumbranceBulkData {
		const enableVarianEncumbranceWeightBulkOnActorFlag = <boolean>(
			actorEntity.getFlag(CONSTANTS.FLAG, EncumbranceFlags.ENABLED_WE_BULK)
		);
		const useStandardWeightCalculation = game.settings.get(CONSTANTS.MODULE_NAME, "useStandardWeightCalculation");
		const doNotIncreaseWeightByQuantityForNoAmmunition = <boolean>(
			game.settings.get(CONSTANTS.MODULE_NAME, "doNotIncreaseWeightByQuantityForNoAmmunition")
		);
		const doNotApplyWeightForEquippedArmor = <boolean>(
			game.settings.get(CONSTANTS.MODULE_NAME, "doNotApplyWeightForEquippedArmor")
		);
		const useStrValueInsteadStrModOnBulk = <boolean>(
			game.settings.get(CONSTANTS.MODULE_NAME, "useStrValueInsteadStrModOnBulk")
		);
		const useEquippedUnequippedItemCollectionFeature = <boolean>(
			game.settings.get(CONSTANTS.MODULE_NAME, "useEquippedUnequippedItemCollectionFeature")
		);
		if (!enableVarianEncumbranceWeightBulkOnActorFlag) {
			return <EncumbranceBulkData>actorEntity.getFlag(CONSTANTS.FLAG, EncumbranceFlags.DATA_BULK) || {};
		} else if (enableVarianEncumbranceWeightBulkOnActorFlag) {
			const invPlusCategoriesWeightToAdd = new Map<string, number>();

			// START TOTAL WEIGHT
			// Get the total weight from items
			const physicalItems = ["weapon", "equipment", "consumable", "tool", "backpack", "loot"];
			// let totalWeight: number = actorEntity.items.reduce((weight, item) => {
			let totalWeight: number = inventoryItems.reduce((weight, item) => {
				if (!physicalItems.includes(item.type)) {
					return weight;
				}

				let itemQuantity: number =
					//@ts-ignore
					is_real_number(item.system.quantity) ? item.system.quantity : 0;

				let itemWeight: number =
					//@ts-ignore
					is_real_number(item.system.bulk) ? item.system.bulk : 0;

				debug(
					`Actor '${actorEntity.name}, Item '${item.name}' : Quantity = ${itemQuantity}, Weight = ${itemWeight}`
				);

				let ignoreEquipmentCheck = false;

				// External modules calculation

				// Start Item container check
				if (
					hasProperty(item, `flags.itemcollection`) &&
					itemContainerActive
				) {
					const weightless = getProperty(item, "system.capacity.weightless") ?? false;
					if (weightless) {
						itemWeight = getProperty(item, "system.bulk");
					} else {
						// itemWeight = calcItemWeight(item) + getProperty(item, 'flags.itemcollection.bagWeight');
						// MOD 4535992 Removed variant encumbrance take care of this
						itemWeight = calcBulk(
							item,
							useEquippedUnequippedItemCollectionFeature,
							doNotApplyWeightForEquippedArmor,
							ignoreCurrency
						);
						//@ts-ignore
						if (useEquippedUnequippedItemCollectionFeature) {
							ignoreEquipmentCheck = true;
						}
					}
				}
				// End Item container check
				// Start inventory+ module is active
				if (invPlusActiveTmp) {
					// Retrieve flag 'categorys' from inventory plus module
					const inventoryPlusCategories = <any[]>(
						actorEntity.getFlag(CONSTANTS.INVENTORY_PLUS_MODULE_NAME, "categorys")
					);
					if (inventoryPlusCategories) {
						// "weapon", "equipment", "consumable", "tool", "backpack", "loot"
						let actorHasCustomCategories = false;
						for (const categoryId in inventoryPlusCategories) {
							const section = inventoryPlusCategories[categoryId];
							if (
								// This is a error from the inventory plus developer flags stay on 'item' not on the 'item'
								//@ts-ignore
								item.flags &&
								//@ts-ignore
								item.flags[CONSTANTS.INVENTORY_PLUS_MODULE_NAME]?.category === categoryId
							) {
								// Ignore weight
								if (section?.ignoreBulk === true) {
									itemWeight = 0;
									ignoreEquipmentCheck = true;
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
										ignoreEquipmentCheck = true;
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

				// Feature: Do Not increase weight by quantity for no ammunition item
				if (doNotIncreaseWeightByQuantityForNoAmmunition) {
					//@ts-ignore
					if (item.system?.consumableType !== "ammo") {
						itemQuantity = 1;
					}
				}

				let appliedWeight = itemQuantity * itemWeight;
				if (ignoreEquipmentCheck) {
					debug(
						`Actor '${actorEntity.name}, Item '${item.name}' :
               ${itemQuantity} * ${itemWeight} = ${appliedWeight} on total ${weight} => ${weight + appliedWeight}`
					);
					return weight + appliedWeight;
				}
				const isEquipped: boolean =
					//@ts-ignore
					item.system.equipped ? true : false;
				if (isEquipped) {
					const isProficient: boolean =
						//@ts-ignore
						item.system.proficient ? true : false;
					if (isProficient) {
						appliedWeight *= <number>game.settings.get(CONSTANTS.MODULE_NAME, "profEquippedMultiplier");
					} else {
						appliedWeight *= <number>game.settings.get(CONSTANTS.MODULE_NAME, "equippedMultiplier");
					}
					const itemArmorTypes = ["clothing", "light", "medium", "heavy", "natural"];
					//@ts-ignore
					if (doNotApplyWeightForEquippedArmor && itemArmorTypes.includes(item.system.armor?.type)) {
						appliedWeight = 0;
					}
				} else {
					appliedWeight *= <number>game.settings.get(CONSTANTS.MODULE_NAME, "unequippedMultiplier");
				}
				debug(
					`Actor '${actorEntity.name}, Item '${item.name}', Equipped '${isEquipped}' :
            ${itemQuantity} * ${itemWeight} = ${appliedWeight} on total ${weight} => ${weight + appliedWeight}`
				);
				return weight + appliedWeight;
			}, 0);

			// Start inventory+ module is active 2
			if (invPlusActiveTmp) {
				for (const [key, value] of invPlusCategoriesWeightToAdd) {
					debug(`Actor '${actorEntity.name}', Category '${key}' : ${value} => ${totalWeight + value}`);
					totalWeight = totalWeight + value;
				}
			}
			// End inventory+ module is active 2
			// END TOTAL WEIGHT

			// ON BULK SYSTEM THERE ISN'T [Optional] add Currency Weight (for non-transformed actors)
			/*
			//@ts-ignore
			if (!ignoreCurrency && game.settings.get(CONSTANTS.MODULE_NAME, 'enableCurrencyWeight') && game.settings.get('dnd5e', 'currencyWeight') && actorEntity.system.currency) {
				//@ts-ignore
				const currency = actorEntity.system.currency;
				const numCoins = <number>(
				Object.values(currency).reduce((val: any, denom: any) => (val += Math.max(denom, 0)), 0)
				);

				const currencyPerWeight = game.settings.get('dnd5e', 'metricWeightUnits')
				? game.settings.get(CONSTANTS.MODULE_NAME, 'fakeMetricSystem')
					? <number>game.settings.get(CONSTANTS.MODULE_NAME, 'currencyWeight')
					: <number>game.settings.get(CONSTANTS.MODULE_NAME, 'currencyWeightMetric')
				: <number>game.settings.get(CONSTANTS.MODULE_NAME, 'currencyWeight');
				totalWeight += numCoins / currencyPerWeight;
				debug(
				`Actor '${actorEntity.name}' : ${numCoins} / ${currencyPerWeight} = ${numCoins / currencyPerWeight} => ${totalWeight}`,
				);
			}
			*/
			// Compute Encumbrance percentage
			totalWeight = totalWeight.toNearest(0.1);
			debug(`Actor '${actorEntity.name}' => ${totalWeight}`);

			let minimumBulk = 0;
			let inventorySlot = 0;

			//@ts-ignore
			const sizeOri = actorEntity.system.traits.size;
			let size = sizeOri;
			// Manage pworful build for bulk inveotry slot
			//@ts-ignore
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
					//@ts-ignore
					inventorySlot =
						6 +
						(useStrValueInsteadStrModOnBulk
							? //@ts-ignore
							  actorEntity.system.abilities.str.value
							: //@ts-ignore
							  actorEntity.system.abilities.str.mod);
				} else if (size === "sm") {
					minimumBulk = 10;
					//@ts-ignore
					inventorySlot =
						14 +
						(useStrValueInsteadStrModOnBulk
							? //@ts-ignore
							  actorEntity.system.abilities.str.value
							: //@ts-ignore
							  actorEntity.system.abilities.str.mod);
				} else if (size === "med") {
					minimumBulk = 20;
					//@ts-ignore
					inventorySlot =
						18 +
						(useStrValueInsteadStrModOnBulk
							? //@ts-ignore
							  actorEntity.system.abilities.str.value
							: //@ts-ignore
							  actorEntity.system.abilities.str.mod);
				} else if (size === "lg") {
					minimumBulk = 40;
					//@ts-ignore
					inventorySlot =
						22 +
						(useStrValueInsteadStrModOnBulk
							? //@ts-ignore
							  actorEntity.system.abilities.str.value
							: //@ts-ignore
							  actorEntity.system.abilities.str.mod * 2);
				} else if (size === "huge") {
					minimumBulk = 80;
					//@ts-ignore
					inventorySlot =
						30 +
						(useStrValueInsteadStrModOnBulk
							? //@ts-ignore
							  actorEntity.system.abilities.str.value
							: //@ts-ignore
							  actorEntity.system.abilities.str.mod * 4);
				} else if (size === "grg") {
					minimumBulk = 160;
					//@ts-ignore
					inventorySlot =
						46 +
						(useStrValueInsteadStrModOnBulk
							? //@ts-ignore
							  actorEntity.system.abilities.str.value
							: //@ts-ignore
							  actorEntity.system.abilities.str.mod * 8);
				} else {
					minimumBulk = 20;
					//@ts-ignore
					inventorySlot =
						18 +
						(useStrValueInsteadStrModOnBulk
							? //@ts-ignore
							  actorEntity.system.abilities.str.value
							: //@ts-ignore
							  actorEntity.system.abilities.str.mod);
				}
			} else if (actorEntity.type === EncumbranceActorType.VEHICLE) {
				//@ts-ignore
				// const capacityCargo = <number>actorEntity.system.attributes.capacity.cargo;
				if (size === "tiny") {
					minimumBulk = 20;
					//@ts-ignore
					inventorySlot = 20;
				} else if (size === "sm") {
					minimumBulk = 60;
					//@ts-ignore
					inventorySlot = 60;
				} else if (size === "med") {
					minimumBulk = 180;
					//@ts-ignore
					inventorySlot = 180;
				} else if (size === "lg") {
					minimumBulk = 540;
					//@ts-ignore
					inventorySlot = 540;
				} else if (size === "huge") {
					minimumBulk = 1620;
					//@ts-ignore
					inventorySlot = 1620;
				} else if (size === "grg") {
					minimumBulk = 4860;
					//@ts-ignore
					inventorySlot = 4860;
				} else {
					minimumBulk = 180;
					//@ts-ignore
					inventorySlot = 180;
				}
			} else {
				// Like character by default
				if (size === "tiny") {
					minimumBulk = 5;
					//@ts-ignore
					inventorySlot =
						6 +
						(useStrValueInsteadStrModOnBulk
							? //@ts-ignore
							  actorEntity.system.abilities.str.value
							: //@ts-ignore
							  actorEntity.system.abilities.str.mod);
				} else if (size === "sm") {
					minimumBulk = 10;
					//@ts-ignore
					inventorySlot =
						14 +
						(useStrValueInsteadStrModOnBulk
							? //@ts-ignore
							  actorEntity.system.abilities.str.value
							: //@ts-ignore
							  actorEntity.system.abilities.str.mod);
				} else if (size === "med") {
					minimumBulk = 20;
					//@ts-ignore
					inventorySlot =
						18 +
						(useStrValueInsteadStrModOnBulk
							? //@ts-ignore
							  actorEntity.system.abilities.str.value
							: //@ts-ignore
							  actorEntity.system.abilities.str.mod);
				} else if (size === "lg") {
					minimumBulk = 40;
					//@ts-ignore
					inventorySlot =
						22 +
						(useStrValueInsteadStrModOnBulk
							? //@ts-ignore
							  actorEntity.system.abilities.str.value
							: //@ts-ignore
							  actorEntity.system.abilities.str.mod * 2);
				} else if (size === "huge") {
					minimumBulk = 80;
					//@ts-ignore
					inventorySlot =
						30 +
						(useStrValueInsteadStrModOnBulk
							? //@ts-ignore
							  actorEntity.system.abilities.str.value
							: //@ts-ignore
							  actorEntity.system.abilities.str.mod * 4);
				} else if (size === "grg") {
					minimumBulk = 160;
					//@ts-ignore
					inventorySlot =
						46 +
						(useStrValueInsteadStrModOnBulk
							? //@ts-ignore
							  actorEntity.system.abilities.str.value
							: //@ts-ignore
							  actorEntity.system.abilities.str.mod * 8);
				} else {
					minimumBulk = 20;
					//@ts-ignore
					inventorySlot =
						18 +
						(useStrValueInsteadStrModOnBulk
							? //@ts-ignore
							  actorEntity.system.abilities.str.value
							: //@ts-ignore
							  actorEntity.system.abilities.str.mod);
				}
			}

			if (inventorySlot < minimumBulk) {
				inventorySlot = minimumBulk;
			}

			let modForSize = 1; //actorEntity.system.abilities.str.value;
			if (game.settings.get(CONSTANTS.MODULE_NAME, "sizeMultipliers")) {
				//@ts-ignore
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
				//@ts-ignore
				if (actorEntity.flags?.dnd5e?.powerfulBuild) {
					//jshint ignore:line
					// mod *= 2;
					modForSize = Math.min(modForSize * 2, 8);
				}
			}
			let strengthMultiplier = 1;
			if (game.settings.get(CONSTANTS.MODULE_NAME, "useStrengthMultiplier")) {
				strengthMultiplier = game.settings.get("dnd5e", "metricWeightUnits")
					? game.settings.get(CONSTANTS.MODULE_NAME, "fakeMetricSystem")
						? <number>game.settings.get(CONSTANTS.MODULE_NAME, "strengthMultiplier")
						: <number>game.settings.get(CONSTANTS.MODULE_NAME, "strengthMultiplierMetric")
					: <number>game.settings.get(CONSTANTS.MODULE_NAME, "strengthMultiplier");
			}
			const displayedUnits = <string>game.settings.get(CONSTANTS.MODULE_NAME, "unitsBulk");
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
				//@ts-ignore
				max = actorEntity.system.abilities.str.value * strengthMultiplier * modForSize;
				const daeValueAttributeEncumbranceMax =
					daeActive && game.settings.get(CONSTANTS.MODULE_NAME, "enableDAEIntegration")
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
				//@ts-ignore
				const capacityCargo = <number>actorEntity.system.attributes.capacity.cargo;
				// Compute overall encumbrance
				// const max = actorData.system.attributes.capacity.cargo;
				max = capacityCargo * strengthMultiplier * modForSize;
				const daeValueAttributeCapacityCargo =
					daeActive && game.settings.get(CONSTANTS.MODULE_NAME, "enableDAEIntegration")
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
				//@ts-ignore
				max = actorEntity.system.abilities.str.value * strengthMultiplier * modForSize;
				const daeValueAttributeEncumbranceMax =
					daeActive && game.settings.get(CONSTANTS.MODULE_NAME, "enableDAEIntegration")
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

			//@ts-ignore
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
			};
			debug(JSON.stringify(encumbranceData));
			return encumbranceData;
		} else {
			throw new Error("Something is wrong");
		}
	},

	/**
	 * Adds dynamic effects for specific effects
	 *
	 * @param {Effect} effect - the effect to handle
	 * @param {Actor5e} actor - the effected actor
	 */
	addDynamicEffects: async function (
		effectName: string,
		actor: Actor,
		speedDecrease: number
	): Promise<Effect | null> {
		// const invMidiQol = <boolean>game.modules.get(CONSTANTS.MIDI_QOL_MODULE_NAME)?.active;
		switch (effectName.toLowerCase()) {
			case ENCUMBRANCE_STATE.ENCUMBERED.toLowerCase():
			case ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED.toLowerCase(): {
				let effect: Effect;
				if (invMidiQol) {
					effect = VariantEncumbranceBulkImpl._bulkHeavilyEncumbered();
				} else {
					effect = VariantEncumbranceBulkImpl._bulkHeavilyEncumberedNoMidi();
				}
				const speedDecreased =
					speedDecrease > 0
						? speedDecrease
						: <number>game.settings.get(CONSTANTS.MODULE_NAME, "heavyWeightDecreaseBulk");
				VariantEncumbranceBulkImpl._addEncumbranceEffects(effect, actor, speedDecreased);
				return effect;
			}
			case ENCUMBRANCE_STATE.UNENCUMBERED.toLowerCase(): {
				return null;
			}
			case ENCUMBRANCE_STATE.OVERBURDENED.toLowerCase(): {
				let effect: Effect;
				if (invMidiQol) {
					effect = VariantEncumbranceBulkImpl._bulkOverburdenedEncumbered();
				} else {
					effect = VariantEncumbranceBulkImpl._bulkOverburdenedEncumberedNoMidi();
				}
				VariantEncumbranceBulkImpl._addEncumbranceEffectsOverburdened(effect);
				return effect;
			}
			default: {
				throw new Error("The effect name '" + effectName + "' is not recognized");
			}
		}
	},

	_bulkHeavilyEncumbered: function (): Effect {
		return new Effect({
			name: ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED,
			description: i18n("variant-encumbrance-dnd5e.effect.description.heavily_encumbered"),
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

	_bulkHeavilyEncumberedNoMidi: function (): Effect {
		return new Effect({
			name: ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED,
			description: i18n("variant-encumbrance-dnd5e.effect.description.heavily_encumbered"),
			icon: "icons/svg/downgrade.svg",
			isDynamic: true,
			transfer: true,
			changes: [],
		});
	},

	_bulkOverburdenedEncumbered: function (): Effect {
		return new Effect({
			name: ENCUMBRANCE_STATE.OVERBURDENED,
			description: i18n("variant-encumbrance-dnd5e.effect.description.overburdened"),
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

	_bulkOverburdenedEncumberedNoMidi: function (): Effect {
		return new Effect({
			name: ENCUMBRANCE_STATE.OVERBURDENED,
			description: i18n("variant-encumbrance-dnd5e.effect.description.overburdened"),
			// icon: 'icons/svg/hazard.svg',
			icon: "icons/tools/smithing/anvil.webp",
			isDynamic: true,
			transfer: true,
			changes: [],
		});
	},

	_addEncumbranceEffects: function (effect: Effect, actor: Actor, value: number) {
		//@ts-ignore
		const movement = actor.system.attributes.movement;
		// if (!daeActive) {
		effect.changes.push(<EffectChangeData>{
			key: "system.attributes.movement.burrow",
			mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
			value: `${movement.burrow * value}`,
		});

		effect.changes.push(<EffectChangeData>{
			key: "system.attributes.movement.climb",
			mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
			value: `${movement.climb * value}`,
		});

		effect.changes.push(<EffectChangeData>{
			key: "system.attributes.movement.fly",
			mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
			value: `${movement.fly * value}`,
		});

		effect.changes.push(<EffectChangeData>{
			key: "system.attributes.movement.swim",
			mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
			value: `${movement.swim * value}`,
		});

		effect.changes.push(<EffectChangeData>{
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

	_addEncumbranceEffectsOverburdened: function (effect: Effect) {
		// const movement = actor.system.attributes.movement;
		// if (!daeActive) {
		effect.changes.push(<EffectChangeData>{
			key: "system.attributes.movement.burrow",
			mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
			value: "0",
		});

		effect.changes.push(<EffectChangeData>{
			key: "system.attributes.movement.climb",
			mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
			value: "0",
		});

		effect.changes.push(<EffectChangeData>{
			key: "system.attributes.movement.fly",
			mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
			value: "0",
		});

		effect.changes.push(<EffectChangeData>{
			key: "system.attributes.movement.swim",
			mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE,
			value: "0",
		});

		effect.changes.push(<EffectChangeData>{
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
	 * Checks to see if any of the current active effects applied to the actor
	 * with the given UUID match the effect name and are a convenient effect
	 *
	 * @param {string} effectName - the name of the effect to check
	 * @param {string} uuid - the uuid of the actor to see if the effect is
	 * applied to
	 * @returns {boolean} true if the effect is applied, false otherwise
	 */
	async hasEffectApplied(effectName: string, actor: Actor): Promise<boolean | undefined> {
		return await aemlApi.hasEffectAppliedOnActor(<string>actor.id, effectName, true);
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
	async hasEffectAppliedFromId(effect: ActiveEffect, actor: Actor): Promise<boolean | undefined> {
		return await aemlApi.hasEffectAppliedFromIdOnActor(<string>actor.id, <string>effect.id, true);
	},

	/**
	 * Removes the effect with the provided name from an actor matching the
	 * provided UUID
	 *
	 * @param {string} effectName - the name of the effect to remove
	 * @param {string} uuid - the uuid of the actor to remove the effect from
	 */
	async removeEffect(effectName: string, actor: Actor) {
		return await aemlApi.removeEffectOnActor(<string>actor.id, effectName);
	},

	/**
	 * Removes the effect with the provided name from an actor matching the
	 * provided UUID
	 *
	 * @param {string} effectName - the name of the effect to remove
	 * @param {string} uuid - the uuid of the actor to remove the effect from
	 */
	async removeEffectFromId(effectToRemove: ActiveEffect, actor: Actor) {
		return await aemlApi.removeEffectFromIdOnActor(<string>actor.id, <string>effectToRemove.id);
	},

	/**
	 * Adds the effect with the provided name to an actor matching the provided
	 * UUID
	 *
	 * @param {string} effectName - the name of the effect to add
	 * @param {string} uuid - the uuid of the actor to add the effect to
	 */
	async addEffect(
		effectName: string,
		actor: Actor,
		origin: string,
		encumbranceTier: number
	): Promise<ActiveEffect | undefined> {
		let speedDecrease: number | null = 1;
		if (encumbranceTier === ENCUMBRANCE_TIERS.NONE) {
			speedDecrease = 1;
		} else if (encumbranceTier === ENCUMBRANCE_TIERS.LIGHT) {
			speedDecrease = <number>game.settings.get(CONSTANTS.MODULE_NAME, "heavyWeightDecreaseBulk");
		} else if (encumbranceTier === ENCUMBRANCE_TIERS.HEAVY) {
			speedDecrease = <number>game.settings.get(CONSTANTS.MODULE_NAME, "heavyWeightDecreaseBulk");
		} else if (encumbranceTier === ENCUMBRANCE_TIERS.MAX) {
			speedDecrease = null;
		}
		// let effect = VariantEncumbranceBulkImpl.findEffectByName(effectName, actor.id);
		//const actor = await VariantEncumbranceBulkImpl._foundryHelpers.getActorByUuid(uuid);
		// if (effect.isDynamic) {
		const effect = <Effect>(
			await VariantEncumbranceBulkImpl.addDynamicEffects(effectName, actor, <number>speedDecrease)
		);
		// }
		if (effect) {
			effect.flags = {
				"variant-encumbrance-dnd5e": {
					tier: encumbranceTier,
				},
			};
			effect.isTemporary = true;
			return await aemlApi.addEffectOnActor(<string>actor.id, effectName, effect);
		}
		return undefined;
	},
};

// ===========================
// Item Collection/Container SUPPORT
// ===========================

export function calcBulk(
	item: Item,
	useEquippedUnequippedItemCollectionFeature: boolean,
	doNotApplyWeightForEquippedArmor: boolean,
	ignoreCurrency: boolean,
	{ ignoreItems, ignoreTypes } = { ignoreItems: undefined, ignoreTypes: undefined }
) {
	//@ts-ignore
	if (item.type !== "backpack" || !item.flags.itemcollection) {
		return calcItemBulk(item, ignoreCurrency);
	}
	// MOD 4535992 Removed variant encumbrance take care of this
	// if (this.parent instanceof Actor && (!this.system.equipped && this.system.capacity.weightlessUnequipped)) return 0;
	// const weightless = getProperty(this, "system.capacity.weightless") ?? false;
	// if (weightless) return getProperty(this, "flags.itemcollection.bagWeight") || 0;
	const isEquipped: boolean =
		//@ts-ignore
		item.system.equipped ? true : false;
	//@ts-ignore
	if (useEquippedUnequippedItemCollectionFeature && !isEquipped && item.system?.capacity?.weightlessUnequipped) {
		return 0;
	}
	const itemArmorTypes = ["clothing", "light", "medium", "heavy", "natural"];
	//@ts-ignore
	if (isEquipped && doNotApplyWeightForEquippedArmor && itemArmorTypes.includes(item.system.armor?.type)) {
		return 0;
	}
	// END MOD 4535992
	const weightless = getProperty(item, "system.capacity.weightless") ?? false;
	if (weightless) {
		return getProperty(item, "system.bulk") ?? 0;
	}
	return calcItemBulk(item, ignoreCurrency, { ignoreItems, ignoreTypes }) + (getProperty(item, "system.bulk") ?? 0);
}

function calcItemBulk(
	item: Item,
	ignoreCurrency: boolean,
	{ ignoreItems, ignoreTypes } = { ignoreItems: undefined, ignoreTypes: undefined }
) {
	//@ts-ignore
	if (item.type !== "backpack" || item.items === undefined) {
		return _calcItemBulk(item);
	}
	//@ts-ignore
	let weight = item.items.reduce((acc, item) => {
		//@ts-ignore
		if (ignoreTypes?.some((name) => item.name.includes(name))) return acc;
		//@ts-ignore
		if (ignoreItems?.includes(item.name)) return acc;
		//@ts-ignore
		return acc + (item.system.bulk ?? 0); // TODO convert this in a static method ???
	}, (item.type === "backpack" ? 0 : _calcItemBulk(item)) ?? 0);
	// [Optional] add Currency Weight (for non-transformed actors)
	if (
		!ignoreCurrency &&
		game.settings.get(CONSTANTS.MODULE_NAME, "enableCurrencyWeight") &&
		game.settings.get("dnd5e", "currencyWeight") &&
		//@ts-ignore
		item.system.currency
	) {
		//@ts-ignore
		const currency = item.system.currency ?? {};
		const numCoins = <number>(
			Object.values(currency).reduce((val: any, denom: any) => (val += Math.max(denom, 0)), 0)
		);

		const currencyPerWeight = game.settings.get("dnd5e", "metricWeightUnits")
			? game.settings.get(CONSTANTS.MODULE_NAME, "fakeMetricSystem")
				? <number>game.settings.get(CONSTANTS.MODULE_NAME, "currencyWeight")
				: <number>game.settings.get(CONSTANTS.MODULE_NAME, "currencyWeightMetric")
			: <number>game.settings.get(CONSTANTS.MODULE_NAME, "currencyWeight");

		weight = Math.round(weight + numCoins / currencyPerWeight);
	} else {
		//@ts-ignore
		const currency = item.system.currency ?? {};
		const numCoins = currency ? Object.keys(currency).reduce((val, denom) => val + currency[denom], 0) : 0;
		weight = Math.round(weight + numCoins / 50);
	}
	return weight;
}

function _calcItemBulk(item: Item) {
	// const quantity = item.system.quantity || 1;
	// const weight = item.system.bulk || 0;
	const quantity: number =
		//@ts-ignore
		is_real_number(item.system.quantity) ? item.system.quantity : 0;
	const weight: number =
		//@ts-ignore
		is_real_number(item.system.bulk) ? item.system.bulk : 0;
	return Math.round(weight * quantity * 100) / 100;
}
