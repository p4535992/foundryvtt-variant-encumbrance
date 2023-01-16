// Import JavaScript modules
import {
	EncumbranceActorType,
	// EncumbranceActorType,
	EncumbranceData,
	EncumbranceDnd5e,
	EncumbranceFlags,
	EncumbranceMode,
	ENCUMBRANCE_TIERS,
} from "./VariantEncumbranceModels";
import Effect from "./effects/effect";
import {
	daeActive,
	dfQualityLifeActive,
	ENCUMBRANCE_STATE,
	invMidiQol,
	invPlusActive,
	itemContainerActive,
} from "./modules";
import CONSTANTS from "./constants";
import {
	debug,
	error,
	i18n,
	isGMConnected,
	is_real_number,
	retrieveAttributeEncumbranceMax,
	retrieveAttributeCapacityCargo,
} from "./lib/lib";
import API from "./api";
import type { EffectChangeData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/effectChangeData";
import type { ItemData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/module.mjs";
import { aemlApi } from "./modules";

/* ------------------------------------ */
/* Constants         					*/
/* ------------------------------------ */

export const VariantEncumbranceImpl = {
	updateEncumbrance: async function (
		actorEntity: Actor,
		updatedItems: any[] | undefined,
		updatedEffect: boolean,
		mode?: EncumbranceMode
	): Promise<void> {
		if (updatedItems && updatedItems.length > 0) {
			for (let i = 0; i < updatedItems.length; i++) {
				const updatedItem: any = updatedItems ? (<any[]>updatedItems)[i] : undefined;
				await VariantEncumbranceImpl._updateEncumbranceInternal(actorEntity, updatedItem, updatedEffect, mode);
			}
		} else {
			await VariantEncumbranceImpl._updateEncumbranceInternal(actorEntity, undefined, updatedEffect, mode);
		}
	},

	_updateEncumbranceInternal: async function (
		actorEntity: Actor,
		updatedItem: any | undefined,
		updatedEffect?: boolean,
		mode?: EncumbranceMode
	): Promise<void> {
		// Remove old flags
		if (hasProperty(actorEntity, `flags.${CONSTANTS.FLAG}.weight`)) {
			await actorEntity.unsetFlag(CONSTANTS.FLAG, "weight");
		}
		if (hasProperty(actorEntity, `flags.${CONSTANTS.FLAG}.VariantEncumbrance`)) {
			await actorEntity.unsetFlag(CONSTANTS.FLAG, "VariantEncumbrance");
		}
		if (hasProperty(actorEntity, "flags.VariantEncumbrance")) {
			await actorEntity.unsetFlag(CONSTANTS.FLAG, "VariantEncumbrance");
		}

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
						// setProperty(im, 'system.weight', 0);
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
					// setProperty(im, 'system.weight', 0);
				} else {
					inventoryItems.push(im);
				}
			}
		}

		const burrow = hasProperty(actorEntity, `flags.${CONSTANTS.FLAG}.${EncumbranceFlags.BURROW}`)
			? actorEntity.getFlag(CONSTANTS.FLAG, EncumbranceFlags.BURROW)
			: {};
		const climb = hasProperty(actorEntity, `flags.${CONSTANTS.FLAG}.${EncumbranceFlags.CLIMB}`)
			? actorEntity.getFlag(CONSTANTS.FLAG, EncumbranceFlags.CLIMB)
			: {};
		const fly = hasProperty(actorEntity, `flags.${CONSTANTS.FLAG}.${EncumbranceFlags.FLY}`)
			? actorEntity.getFlag(CONSTANTS.FLAG, EncumbranceFlags.FLY)
			: {};
		const swim = hasProperty(actorEntity, `flags.${CONSTANTS.FLAG}.${EncumbranceFlags.SWIM}`)
			? actorEntity.getFlag(CONSTANTS.FLAG, EncumbranceFlags.SWIM)
			: {};
		const walk = hasProperty(actorEntity, `flags.${CONSTANTS.FLAG}.${EncumbranceFlags.WALK}`)
			? actorEntity.getFlag(CONSTANTS.FLAG, EncumbranceFlags.WALK)
			: {};

		//@ts-ignore
		if (burrow !== actorEntity.system.attributes.movement.burrow) {
			await actorEntity.setFlag(
				CONSTANTS.FLAG,
				EncumbranceFlags.BURROW,
				//@ts-ignore
				actorEntity.system.attributes.movement.burrow
			);
		}
		//@ts-ignore
		if (climb !== actorEntity.system.attributes.movement.climb) {
			await actorEntity.setFlag(
				CONSTANTS.FLAG,
				EncumbranceFlags.CLIMB,
				//@ts-ignore
				actorEntity.system.attributes.movement.climb
			);
		}
		//@ts-ignore
		if (fly !== actorEntity.system.attributes.movement.fly) {
			await actorEntity.setFlag(
				CONSTANTS.FLAG,
				EncumbranceFlags.FLY,
				//@ts-ignore
				actorEntity.system.attributes.movement.fly
			);
		}
		//@ts-ignore
		if (swim !== actorEntity.system.attributes.movement.swim) {
			await actorEntity.setFlag(
				CONSTANTS.FLAG,
				EncumbranceFlags.SWIM,
				//@ts-ignore
				actorEntity.system.attributes.movement.swim
			);
		}
		//@ts-ignore
		if (walk !== actorEntity.system.attributes.movement.walk) {
			await actorEntity.setFlag(
				CONSTANTS.FLAG,
				EncumbranceFlags.WALK,
				//@ts-ignore
				actorEntity.system.attributes.movement.walk
			);
		}
		if (updatedEffect) {
			await VariantEncumbranceImpl.calculateEncumbranceWithEffect(
				actorEntity,
				inventoryItems,
				false,
				invPlusActive
			);
		} else {
			VariantEncumbranceImpl.calculateEncumbrance(actorEntity, inventoryItems, false, invPlusActive);
		}
	},

	calculateEncumbranceWithEffect: async function (
		actorEntity: Actor,
		// veItemData: VariantEncumbranceItemData | null,
		inventoryItems: Item[],
		ignoreCurrency: boolean,
		invPlusActive: boolean
	): Promise<EncumbranceData> {
		const encumbranceData = VariantEncumbranceImpl.calculateEncumbrance(
			actorEntity,
			inventoryItems,
			ignoreCurrency,
			invPlusActive
		);

		// SEEM NOT NECESSARY Add pre check for encumbrance tier
		if (<boolean>game.settings.get(CONSTANTS.MODULE_NAME, "enablePreCheckEncumbranceTier")) {
			if (hasProperty(actorEntity, `flags.${CONSTANTS.FLAG}.${EncumbranceFlags.DATA}`)) {
				const encumbranceDataCurrent = <EncumbranceData>(
					actorEntity.getFlag(CONSTANTS.FLAG, EncumbranceFlags.DATA)
				);
				if (encumbranceDataCurrent.encumbranceTier === encumbranceData.encumbranceTier) {
					//We ignore all the AE check
					await actorEntity.setFlag(CONSTANTS.FLAG, EncumbranceFlags.DATA, encumbranceData);
					return encumbranceData;
				}
			}
		}

		const enableVarianEncumbranceEffectsOnActorFlag = <boolean>(
			actorEntity.getFlag(CONSTANTS.FLAG, EncumbranceFlags.ENABLED_AE)
		);
		if (enableVarianEncumbranceEffectsOnActorFlag) {
			await VariantEncumbranceImpl.manageActiveEffect(actorEntity, encumbranceData.encumbranceTier);
		}
		await actorEntity.setFlag(CONSTANTS.FLAG, EncumbranceFlags.DATA, encumbranceData);
		return encumbranceData;
	},

	manageActiveEffect: async function (actorEntity: Actor, encumbranceTier: number) {
		let effectEntityPresent: ActiveEffect | undefined;

		for (const effectEntity of actorEntity.effects) {
			//@ts-ignore
			const effectNameToSet = effectEntity.label;

			//const effectIsApplied = await VariantEncumbranceImpl.hasEffectAppliedFromId(effectEntity, actorEntity);

			// Remove AE with empty a label but with flag of variant encumbrance ???
			if (!effectNameToSet && hasProperty(effectEntity, `flags.${CONSTANTS.FLAG}`)) {
				await VariantEncumbranceImpl.removeEffectFromId(effectEntity, actorEntity);
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
				await VariantEncumbranceImpl.removeEffectFromId(effectEntity, actorEntity);
				continue;
			}

			// Remove Old settings
			//@ts-ignore
			if (effectEntity.flags && hasProperty(effectEntity, `flags.VariantEncumbrance`)) {
				await VariantEncumbranceImpl.removeEffectFromId(effectEntity, actorEntity);
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
				await VariantEncumbranceImpl.removeEffectFromId(effectEntity, actorEntity);
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
					await VariantEncumbranceImpl.removeEffectFromId(effectEntityPresent, actorEntity);
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
						const effectIsApplied1 = await VariantEncumbranceImpl.hasEffectAppliedFromId(
							effectEntityPresent,
							actorEntity
						);
						if (effectIsApplied1) {
							await VariantEncumbranceImpl.removeEffectFromId(
								<ActiveEffect>effectEntityPresent,
								actorEntity
							);
						}
					}
				} else {
					if (effectEntityPresent?.id) {
						const effectIsApplied2 = await VariantEncumbranceImpl.hasEffectAppliedFromId(
							effectEntityPresent,
							actorEntity
						);
						if (effectIsApplied2) {
							await VariantEncumbranceImpl.removeEffectFromId(
								<ActiveEffect>effectEntityPresent,
								actorEntity
							);
						}
					}
					const effectIsApplied3 = await VariantEncumbranceImpl.hasEffectApplied(effectName, actorEntity);
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
	 * @returns {{max: number, value: number, pct: number}}  An object describing the character's encumbrance level
	 * @private
	 */
	calculateEncumbrance: function (
		actorEntity: Actor,
		// veItemData: VariantEncumbranceItemData | null,
		inventoryItems: Item[],
		ignoreCurrency: boolean,
		invPlusActiveTmp: boolean
	): EncumbranceData {
		const enableVarianEncumbranceWeightOnActorFlag = <boolean>(
			actorEntity.getFlag(CONSTANTS.FLAG, EncumbranceFlags.ENABLED_WE)
		);
		const useStandardWeightCalculation = game.settings.get(CONSTANTS.MODULE_NAME, "useStandardWeightCalculation");
		const doNotIncreaseWeightByQuantityForNoAmmunition = <boolean>(
			game.settings.get(CONSTANTS.MODULE_NAME, "doNotIncreaseWeightByQuantityForNoAmmunition")
		);
		const doNotApplyWeightForEquippedArmor = <boolean>(
			game.settings.get(CONSTANTS.MODULE_NAME, "doNotApplyWeightForEquippedArmor")
		);
		const useEquippedUnequippedItemCollectionFeature = <boolean>(
			game.settings.get(CONSTANTS.MODULE_NAME, "useEquippedUnequippedItemCollectionFeature")
		);
		if (!enableVarianEncumbranceWeightOnActorFlag && !useStandardWeightCalculation) {
			// if (hasProperty(actorEntity, `flags.${CONSTANTS.FLAG}.${EncumbranceFlags.DATA}`)) {
			//   return <EncumbranceData>actorEntity.getFlag(CONSTANTS.FLAG, EncumbranceFlags.DATA);
			// } else {
			// Inventory encumbrance STANDARD
			const dataEncumbrance =
				//@ts-ignore
				_standardActorWeightCalculation(actorEntity) ?? actorEntity.system.attributes.encumbrance;
			return dataEncumbrance;
			// }
		} else if (!enableVarianEncumbranceWeightOnActorFlag && useStandardWeightCalculation) {
			// Inventory encumbrance STANDARD
			const dataEncumbrance =
				//@ts-ignore
				_standardActorWeightCalculation(actorEntity) ?? actorEntity.system.attributes.encumbrance;
			return dataEncumbrance;
		} else if (enableVarianEncumbranceWeightOnActorFlag && useStandardWeightCalculation) {
			// Inventory encumbrance STANDARD
			const dataEncumbrance =
				//@ts-ignore
				_standardActorWeightCalculation(actorEntity) ?? actorEntity.system.attributes.encumbrance;
			return dataEncumbrance;
		} else if (enableVarianEncumbranceWeightOnActorFlag && !useStandardWeightCalculation) {
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
					is_real_number(item.system.weight) ? item.system.weight : 0;

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
						itemWeight = getProperty(item, "flags.itemcollection.bagWeight") || 0;
					} else {
						// itemWeight = calcItemWeight(item) + getProperty(item, 'flags.itemcollection.bagWeight');
						// MOD 4535992 Removed variant encumbrance take care of this
						itemWeight = calcWeight(
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
								if (section?.ignoreWeight === true) {
									itemWeight = 0;
									ignoreEquipmentCheck = true;
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
						item.system.proficient ? item.system.proficient : false;
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

			// [Optional] add Currency Weight (for non-transformed actors)
			if (
				!ignoreCurrency &&
				game.settings.get(CONSTANTS.MODULE_NAME, "enableCurrencyWeight") &&
				game.settings.get("dnd5e", "currencyWeight") &&
				//@ts-ignore
				actorEntity.system.currency
			) {
				//@ts-ignore
				const currency = actorEntity.system.currency;
				const numCoins = <number>(
					Object.values(currency).reduce((val: any, denom: any) => (val += Math.max(denom, 0)), 0)
				);

				const currencyPerWeight = game.settings.get("dnd5e", "metricWeightUnits")
					? game.settings.get(CONSTANTS.MODULE_NAME, "fakeMetricSystem")
						? <number>game.settings.get(CONSTANTS.MODULE_NAME, "currencyWeight")
						: <number>game.settings.get(CONSTANTS.MODULE_NAME, "currencyWeightMetric")
					: <number>game.settings.get(CONSTANTS.MODULE_NAME, "currencyWeight");
				totalWeight += numCoins / currencyPerWeight;
				debug(
					`Actor '${actorEntity.name}' : ${numCoins} / ${currencyPerWeight} = ${
						numCoins / currencyPerWeight
					} => ${totalWeight}`
				);
			}

			// Compute Encumbrance percentage
			totalWeight = totalWeight.toNearest(0.1);
			debug(`Actor '${actorEntity.name}' => ${totalWeight}`);

			let speedDecrease = 0;

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

			let displayedUnits = game.settings.get("dnd5e", "metricWeightUnits")
				? <string>game.settings.get(CONSTANTS.MODULE_NAME, "unitsMetric")
				: <string>game.settings.get(CONSTANTS.MODULE_NAME, "units");

			const lightMultiplier = game.settings.get("dnd5e", "metricWeightUnits")
				? game.settings.get(CONSTANTS.MODULE_NAME, "fakeMetricSystem")
					? <number>game.settings.get(CONSTANTS.MODULE_NAME, "lightMultiplier")
					: <number>game.settings.get(CONSTANTS.MODULE_NAME, "lightMultiplierMetric")
				: <number>game.settings.get(CONSTANTS.MODULE_NAME, "lightMultiplier");
			let lightMax = lightMultiplier; // lightMultiplier * strengthScore;

			const mediumMultiplier = game.settings.get("dnd5e", "metricWeightUnits")
				? game.settings.get(CONSTANTS.MODULE_NAME, "fakeMetricSystem")
					? <number>game.settings.get(CONSTANTS.MODULE_NAME, "mediumMultiplier")
					: <number>game.settings.get(CONSTANTS.MODULE_NAME, "mediumMultiplierMetric")
				: <number>game.settings.get(CONSTANTS.MODULE_NAME, "mediumMultiplier");
			let mediumMax = mediumMultiplier; // mediumMultiplier * strengthScore;

			const heavyMultiplier = game.settings.get("dnd5e", "metricWeightUnits")
				? game.settings.get(CONSTANTS.MODULE_NAME, "fakeMetricSystem")
					? <number>game.settings.get(CONSTANTS.MODULE_NAME, "heavyMultiplier")
					: <number>game.settings.get(CONSTANTS.MODULE_NAME, "heavyMultiplierMetric")
				: <number>game.settings.get(CONSTANTS.MODULE_NAME, "heavyMultiplier");
			let heavyMax = heavyMultiplier; // heavyMultiplier * strengthScore;

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
				//@ts-ignore
				const strengthScore = max; // actorEntity.system.abilities.str.value * strengthMultiplier * modForSize;

				// lightMax = lightMultiplier * strengthScore;
				// mediumMax = mediumMultiplier * strengthScore;
				// heavyMax = heavyMultiplier * strengthScore;
				lightMax = lightMultiplier * strengthScore;
				if (daeValueAttributeEncumbranceMax && daeValueAttributeEncumbranceMax > 0) {
					lightMax = lightMax / 3;
				}
				// const daeValueAttributeEncumbranceMaxLightMax =
				//   daeActive && game.settings.get(CONSTANTS.MODULE_NAME, 'enableDAEIntegration')
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
				//   daeActive && game.settings.get(CONSTANTS.MODULE_NAME, 'enableDAEIntegration')
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
				//   daeActive && game.settings.get(CONSTANTS.MODULE_NAME, 'enableDAEIntegration')
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
				} else if (dfQualityLifeActive && actorEntity.getFlag(CONSTANTS.MODULE_NAME, EncumbranceFlags.DATA)) {
					const encumbranceData = <EncumbranceData>(
						actorEntity.getFlag(CONSTANTS.MODULE_NAME, EncumbranceFlags.DATA)
					);
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
				//@ts-ignore
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
				//   daeActive && game.settings.get(CONSTANTS.MODULE_NAME, 'enableDAEIntegration')
				//     ? retrieveAttributeCapacityCargo(actorEntity, lightMax)
				//     : 0;
				// if (daeValueAttributeCapacityCargoLightMax && daeValueAttributeCapacityCargoLightMax > 0) {
				//   lightMax = daeValueAttributeCapacityCargoLightMax;
				// }
				mediumMax = strengthScore * 0.66;
				// const daeValueAttributeCapacityCargoMediumMax =
				//   daeActive && game.settings.get(CONSTANTS.MODULE_NAME, 'enableDAEIntegration')
				//     ? retrieveAttributeCapacityCargo(actorEntity, mediumMax)
				//     : 0;
				// if (daeValueAttributeCapacityCargoMediumMax && daeValueAttributeCapacityCargoMediumMax > 0) {
				//   mediumMax = daeValueAttributeCapacityCargoMediumMax;
				// }
				heavyMax = strengthScore;
				// const daeValueAttributeCapacityCargoHeavyMax =
				//   daeActive && game.settings.get(CONSTANTS.MODULE_NAME, 'enableDAEIntegration')
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
				//@ts-ignore
				const strengthScore = max; // actorEntity.system.abilities.str.value * strengthMultiplier * modForSize;

				// lightMax = lightMultiplier * strengthScore;
				// mediumMax = mediumMultiplier * strengthScore;
				// heavyMax = heavyMultiplier * strengthScore;

				lightMax = lightMultiplier * strengthScore;
				if (daeValueAttributeEncumbranceMax && daeValueAttributeEncumbranceMax > 0) {
					lightMax = lightMax / 3;
				}
				// const daeValueAttributeEncumbranceMaxLightMax =
				//   daeActive && game.settings.get(CONSTANTS.MODULE_NAME, 'enableDAEIntegration')
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
				//   daeActive && game.settings.get(CONSTANTS.MODULE_NAME, 'enableDAEIntegration')
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
				//   daeActive && game.settings.get(CONSTANTS.MODULE_NAME, 'enableDAEIntegration')
				//     ? retrieveAttributeEncumbranceMax(actorEntity, heavyMax)
				//     : 0;
				// if (daeValueAttributeEncumbranceMaxHeavyMax && daeValueAttributeEncumbranceMaxHeavyMax > 0) {
				//   heavyMax = daeValueAttributeEncumbranceMaxHeavyMax;
				// }
			}

			let encumbranceTier = ENCUMBRANCE_TIERS.NONE;
			if (totalWeight > lightMax && totalWeight <= mediumMax) {
				speedDecrease = game.settings.get("dnd5e", "metricWeightUnits")
					? <number>game.settings.get(CONSTANTS.MODULE_NAME, "lightWeightDecreaseMetric")
					: <number>game.settings.get(CONSTANTS.MODULE_NAME, "lightWeightDecrease");
				encumbranceTier = ENCUMBRANCE_TIERS.LIGHT;
			}
			if (totalWeight > mediumMax && totalWeight <= heavyMax) {
				speedDecrease = game.settings.get("dnd5e", "metricWeightUnits")
					? <number>game.settings.get(CONSTANTS.MODULE_NAME, "heavyWeightDecreaseMetric")
					: <number>game.settings.get(CONSTANTS.MODULE_NAME, "heavyWeightDecrease");
				encumbranceTier = ENCUMBRANCE_TIERS.HEAVY;
			}
			if (totalWeight > heavyMax) {
				encumbranceTier = ENCUMBRANCE_TIERS.MAX;
			}

			// Inventory encumbrance
			// actorEntity.system.attributes.encumbrance = { value: totalWeight.toNearest(0.1), max, pct, encumbered: pct > (200/3) };
			const dataEncumbrance: EncumbranceDnd5e = {
				value: totalWeightOriginal.toNearest(0.1),
				max: max.toNearest(0.1),
				pct: pct,
				encumbered: encumbranceTier !== ENCUMBRANCE_TIERS.NONE,
			};

			// ==========================================================================================
			// THIS IS IMPORTANT WE FORCE THE CORE ENCUMBRANCE TO BE SYNCHRONIZED WITH THE CALCULATION
			// ===============================================================================
			//@ts-ignore
			//(<EncumbranceDnd5e>actorEntity.system.attributes.encumbrance) = dataEncumbrance;
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
			case ENCUMBRANCE_STATE.ENCUMBERED.toLowerCase(): {
				const effect = VariantEncumbranceImpl._encumbered();
				const speedDecreased =
					speedDecrease > 0 ? speedDecrease : game.settings.get("dnd5e", "metricWeightUnits") ? 3 : 10;
				VariantEncumbranceImpl._addEncumbranceEffects(effect, actor, speedDecreased);
				return effect;
			}
			case ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED.toLowerCase(): {
				let effect: Effect;
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
				let effect: Effect;
				if (invMidiQol) {
					effect = VariantEncumbranceImpl._overburdenedEncumbered();
				} else {
					effect = VariantEncumbranceImpl._overburdenedEncumberedNoMidi();
				}
				VariantEncumbranceImpl._addEncumbranceEffectsOverburdened(effect);
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
			description: i18n("variant-encumbrance-dnd5e.effect.description.encumbered"),
			icon: "icons/svg/down.svg",
			isDynamic: true,
			transfer: true,
		});
	},

	_heavilyEncumbered: function (): Effect {
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

	_heavilyEncumberedNoMidi: function (): Effect {
		return new Effect({
			name: ENCUMBRANCE_STATE.HEAVILY_ENCUMBERED,
			description: i18n("variant-encumbrance-dnd5e.effect.description.heavily_encumbered"),
			icon: "icons/svg/downgrade.svg",
			isDynamic: true,
			transfer: true,
			changes: [],
		});
	},

	_overburdenedEncumbered: function (): Effect {
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

	_overburdenedEncumberedNoMidi: function (): Effect {
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
			mode: CONST.ACTIVE_EFFECT_MODES.ADD,
			value: movement.burrow > value ? `-${value}` : `-${movement.burrow}`,
		});

		effect.changes.push(<EffectChangeData>{
			key: "system.attributes.movement.climb",
			mode: CONST.ACTIVE_EFFECT_MODES.ADD,
			value: movement.climb > value ? `-${value}` : `-${movement.climb}`,
		});

		effect.changes.push(<EffectChangeData>{
			key: "system.attributes.movement.fly",
			mode: CONST.ACTIVE_EFFECT_MODES.ADD,
			value: movement.fly > value ? `-${value}` : `-${movement.fly}`,
		});

		effect.changes.push(<EffectChangeData>{
			key: "system.attributes.movement.swim",
			mode: CONST.ACTIVE_EFFECT_MODES.ADD,
			value: movement.swim > value ? `-${value}` : `-${movement.swim}`,
		});

		effect.changes.push(<EffectChangeData>{
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
		let speedDecrease: number | null = 0;
		if (encumbranceTier === ENCUMBRANCE_TIERS.NONE) {
			speedDecrease = 0;
		} else if (encumbranceTier === ENCUMBRANCE_TIERS.LIGHT) {
			speedDecrease = game.settings.get("dnd5e", "metricWeightUnits")
				? <number>game.settings.get(CONSTANTS.MODULE_NAME, "lightWeightDecreaseMetric")
				: <number>game.settings.get(CONSTANTS.MODULE_NAME, "lightWeightDecrease");
		} else if (encumbranceTier === ENCUMBRANCE_TIERS.HEAVY) {
			speedDecrease = game.settings.get("dnd5e", "metricWeightUnits")
				? <number>game.settings.get(CONSTANTS.MODULE_NAME, "heavyWeightDecreaseMetric")
				: <number>game.settings.get(CONSTANTS.MODULE_NAME, "heavyWeightDecrease");
		} else if (encumbranceTier === ENCUMBRANCE_TIERS.MAX) {
			speedDecrease = null;
		}
		// let effect = VariantEncumbranceImpl.findEffectByName(effectName, actor.id);
		//const actor = await VariantEncumbranceImpl._foundryHelpers.getActorByUuid(uuid);
		// if (effect.isDynamic) {
		const effect = <Effect>await VariantEncumbranceImpl.addDynamicEffects(effectName, actor, <number>speedDecrease);
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

export const isEnabledActorType = function (actorEntity: Actor): boolean {
	const useVarianEncumbranceWithSpecificType: string[] = game.settings.get(
		CONSTANTS.MODULE_NAME,
		"useVarianEncumbranceWithSpecificType"
	)
		? String(game.settings.get(CONSTANTS.MODULE_NAME, "useVarianEncumbranceWithSpecificType")).split(",")
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

export function calcWeight(
	item: Item,
	useEquippedUnequippedItemCollectionFeature: boolean,
	doNotApplyWeightForEquippedArmor: boolean,
	ignoreCurrency: boolean,
	{ ignoreItems, ignoreTypes } = { ignoreItems: undefined, ignoreTypes: undefined }
) {
	//@ts-ignore
	if (item.type !== "backpack" || !item.flags.itemcollection) {
		return calcItemWeight(item, ignoreCurrency);
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
        const currentItemWeight = calcItemWeight(item, ignoreCurrency, { ignoreItems, ignoreTypes }) +
		(getProperty(item, "flags.itemcollection.bagWeight") || 0)
        const applyWeightMultiplierForEquippedArmorClothing = <number>(
            game.settings.get(CONSTANTS.MODULE_NAME, "applyWeightMultiplierForEquippedArmorClothing") || 0
        );
        const applyWeightMultiplierForEquippedArmorLight = <number>(
            game.settings.get(CONSTANTS.MODULE_NAME, "applyWeightMultiplierForEquippedArmorLight") || 0
        );
        const applyWeightMultiplierForEquippedArmorMedium = <number>(
            game.settings.get(CONSTANTS.MODULE_NAME, "applyWeightMultiplierForEquippedArmorMedium") || 0
        );
        const applyWeightMultiplierForEquippedArmorHeavy = <number>(
            game.settings.get(CONSTANTS.MODULE_NAME, "applyWeightMultiplierForEquippedArmorHeavy") || 0
        );
        const applyWeightMultiplierForEquippedArmorNatural = <number>(
            game.settings.get(CONSTANTS.MODULE_NAME, "applyWeightMultiplierForEquippedArmorNatural") || 0
        );
        //@ts-ignore
        if(item.system.armor?.type === "clothing"){
            return currentItemWeight * applyWeightMultiplierForEquippedArmorClothing;
        }
        //@ts-ignore
        else if(item.system.armor?.type === "light"){
            return currentItemWeight * applyWeightMultiplierForEquippedArmorLight;
        }
        //@ts-ignore
        else if(item.system.armor?.type === "medium"){
            return currentItemWeight * applyWeightMultiplierForEquippedArmorMedium;
        }
        //@ts-ignore
        else if(item.system.armor?.type === "heavy"){
            return currentItemWeight * applyWeightMultiplierForEquippedArmorHeavy;
        }
        //@ts-ignore
        else if(item.system.armor?.type === "natural"){
            return currentItemWeight * applyWeightMultiplierForEquippedArmorNatural;
        }
        else {
            return 0;
        }
	}
	// END MOD 4535992
	const weightless = getProperty(item, "system.capacity.weightless") ?? false;
	if (weightless) {
		return getProperty(item, "flags.itemcollection.bagWeight") || 0;
	}
	return (
		calcItemWeight(item, ignoreCurrency, { ignoreItems, ignoreTypes }) +
		(getProperty(item, "flags.itemcollection.bagWeight") || 0)
	);
}

function calcItemWeight(
	item: Item,
	ignoreCurrency: boolean,
	{ ignoreItems, ignoreTypes } = { ignoreItems: undefined, ignoreTypes: undefined }
) {
	//@ts-ignore
	if (item.type !== "backpack" || item.items === undefined) {
		return _calcItemWeight(item);
	}
	//@ts-ignore
	let weight = item.items.reduce((acc, item) => {
		//@ts-ignore
		if (ignoreTypes?.some((name) => item.name.includes(name))) return acc;
		//@ts-ignore
		if (ignoreItems?.includes(item.name)) return acc;
		return acc + (item.calcWeight() || 0); // TODO convert this in a static method ???
	}, (item.type === "backpack" ? 0 : _calcItemWeight(item)) || 0);
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

function _calcItemWeight(item: Item) {
	// const quantity = item.system.quantity || 1;
	// const weight = item.system.weight || 0;
	const quantity: number =
		//@ts-ignore
		is_real_number(item.system.quantity) ? item.system.quantity : 0;
	const weight: number =
		//@ts-ignore
		is_real_number(item.system.weight) ? item.system.weight : 0;
	return Math.round(weight * quantity * 100) / 100;
}

// ============================
// STANDARD SYSTEM CALCULATION SUPPORT
// ============================

function _standardActorWeightCalculation(actorEntity: Actor): EncumbranceData {
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

	let displayedUnits = game.settings.get("dnd5e", "metricWeightUnits")
		? <string>game.settings.get(CONSTANTS.MODULE_NAME, "unitsMetric")
		: <string>game.settings.get(CONSTANTS.MODULE_NAME, "units");

	// const strengthScore = actorEntity.system.abilities.str.value * modForSize;

	const lightMultiplier = game.settings.get("dnd5e", "metricWeightUnits")
		? game.settings.get(CONSTANTS.MODULE_NAME, "fakeMetricSystem")
			? <number>game.settings.get(CONSTANTS.MODULE_NAME, "lightMultiplier")
			: <number>game.settings.get(CONSTANTS.MODULE_NAME, "lightMultiplierMetric")
		: <number>game.settings.get(CONSTANTS.MODULE_NAME, "lightMultiplier");
	let lightMax = lightMultiplier; // lightMultiplier * strengthScore;

	const mediumMultiplier = game.settings.get("dnd5e", "metricWeightUnits")
		? game.settings.get(CONSTANTS.MODULE_NAME, "fakeMetricSystem")
			? <number>game.settings.get(CONSTANTS.MODULE_NAME, "mediumMultiplier")
			: <number>game.settings.get(CONSTANTS.MODULE_NAME, "mediumMultiplierMetric")
		: <number>game.settings.get(CONSTANTS.MODULE_NAME, "mediumMultiplier");
	let mediumMax = mediumMultiplier; // mediumMultiplier * strengthScore;

	const heavyMultiplier = game.settings.get("dnd5e", "metricWeightUnits")
		? game.settings.get(CONSTANTS.MODULE_NAME, "fakeMetricSystem")
			? <number>game.settings.get(CONSTANTS.MODULE_NAME, "heavyMultiplier")
			: <number>game.settings.get(CONSTANTS.MODULE_NAME, "heavyMultiplierMetric")
		: <number>game.settings.get(CONSTANTS.MODULE_NAME, "heavyMultiplier");
	let heavyMax = heavyMultiplier; // heavyMultiplier * strengthScore;

	let dataEncumbrance: EncumbranceDnd5e;
	if (actorEntity.type === EncumbranceActorType.CHARACTER) {
		dataEncumbrance = _standardCharacterWeightCalculation(actorEntity);
		//@ts-ignore
		let max = actorEntity.system.abilities.str.value * strengthMultiplier * modForSize;
		const daeValueAttributeEncumbranceMax =
			daeActive && game.settings.get(CONSTANTS.MODULE_NAME, "enableDAEIntegration")
				? retrieveAttributeEncumbranceMax(actorEntity, max)
				: 0;
		if (daeValueAttributeEncumbranceMax && daeValueAttributeEncumbranceMax > 0) {
			max = daeValueAttributeEncumbranceMax;
		}
		//@ts-ignore
		const strengthScore = max; // actorEntity.system.abilities.str.value * strengthMultiplier * modForSize;

		// lightMax = lightMultiplier * strengthScore;
		// mediumMax = mediumMultiplier * strengthScore;
		// heavyMax = heavyMultiplier * strengthScore;
		lightMax = lightMultiplier * strengthScore;
		if (daeValueAttributeEncumbranceMax && daeValueAttributeEncumbranceMax > 0) {
			lightMax = lightMax / 3;
		}
		// const daeValueAttributeEncumbranceMaxLightMax =
		//   daeActive && game.settings.get(CONSTANTS.MODULE_NAME, 'enableDAEIntegration')
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
		//   daeActive && game.settings.get(CONSTANTS.MODULE_NAME, 'enableDAEIntegration')
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
		//   daeActive && game.settings.get(CONSTANTS.MODULE_NAME, 'enableDAEIntegration')
		//     ? retrieveAttributeEncumbranceMax(actorEntity, heavyMax)
		//     : 0;
		// if (daeValueAttributeEncumbranceMaxHeavyMax && daeValueAttributeEncumbranceMaxHeavyMax > 0) {
		//   heavyMax = daeValueAttributeEncumbranceMaxHeavyMax;
		// }
	} else if (actorEntity.type === EncumbranceActorType.VEHICLE) {
		dataEncumbrance = _standardVehicleWeightCalculation(actorEntity);
		// Integration with DragonFlagon Quality of Life, Vehicle Cargo Capacity Unit Feature
		if (dfQualityLifeActive && actorEntity.getFlag(CONSTANTS.DF_QUALITY_OF_LIFE_MODULE_NAME, `unit`)) {
			const dfVehicleUnit = actorEntity.getFlag(CONSTANTS.DF_QUALITY_OF_LIFE_MODULE_NAME, `unit`);
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
		} else if (dfQualityLifeActive && actorEntity.getFlag(CONSTANTS.MODULE_NAME, EncumbranceFlags.DATA)) {
			const encumbranceData = <EncumbranceData>actorEntity.getFlag(CONSTANTS.MODULE_NAME, EncumbranceFlags.DATA);
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
		//@ts-ignore
		const capacityCargo = <number>actorEntity.system.attributes.capacity.cargo;
		//@ts-ignore
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
		//   daeActive && game.settings.get(CONSTANTS.MODULE_NAME, 'enableDAEIntegration')
		//     ? retrieveAttributeCapacityCargo(actorEntity, lightMax)
		//     : 0;
		// if (daeValueAttributeCapacityCargoLightMax && daeValueAttributeCapacityCargoLightMax > 0) {
		//   lightMax = daeValueAttributeCapacityCargoLightMax;
		// }
		mediumMax = strengthScore * 0.66;
		// const daeValueAttributeCapacityCargoMediumMax =
		//   daeActive && game.settings.get(CONSTANTS.MODULE_NAME, 'enableDAEIntegration')
		//     ? retrieveAttributeCapacityCargo(actorEntity, mediumMax)
		//     : 0;
		// if (daeValueAttributeCapacityCargoMediumMax && daeValueAttributeCapacityCargoMediumMax > 0) {
		//   mediumMax = daeValueAttributeCapacityCargoMediumMax;
		// }
		heavyMax = strengthScore;
		// const daeValueAttributeCapacityCargoHeavyMax =
		//   daeActive && game.settings.get(CONSTANTS.MODULE_NAME, 'enableDAEIntegration')
		//     ? retrieveAttributeCapacityCargo(actorEntity, heavyMax)
		//     : 0;
		// if (daeValueAttributeCapacityCargoHeavyMax && daeValueAttributeCapacityCargoHeavyMax > 0) {
		//   heavyMax = daeValueAttributeCapacityCargoHeavyMax;
		// }
		lightMax;
	} else {
		dataEncumbrance = _standardCharacterWeightCalculation(actorEntity);

		//@ts-ignore
		let max = actorEntity.system.abilities.str.value * strengthMultiplier * modForSize;
		const daeValueAttributeEncumbranceMax =
			daeActive && game.settings.get(CONSTANTS.MODULE_NAME, "enableDAEIntegration")
				? retrieveAttributeEncumbranceMax(actorEntity, max)
				: 0;
		if (daeValueAttributeEncumbranceMax && daeValueAttributeEncumbranceMax > 0) {
			max = daeValueAttributeEncumbranceMax;
		}

		//@ts-ignore
		const strengthScore = max; // actorEntity.system.abilities.str.value * strengthMultiplier * modForSize;

		// lightMax = lightMultiplier * strengthScore;
		// mediumMax = mediumMultiplier * strengthScore;
		// heavyMax = heavyMultiplier * strengthScore;
		lightMax = lightMultiplier * strengthScore;
		if (daeValueAttributeEncumbranceMax && daeValueAttributeEncumbranceMax > 0) {
			lightMax = lightMax / 3;
		}
		// const daeValueAttributeEncumbranceMaxLightMax =
		//   daeActive && game.settings.get(CONSTANTS.MODULE_NAME, 'enableDAEIntegration')
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
		//   daeActive && game.settings.get(CONSTANTS.MODULE_NAME, 'enableDAEIntegration')
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
		//   daeActive && game.settings.get(CONSTANTS.MODULE_NAME, 'enableDAEIntegration')
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
	};
}

function _standardCharacterWeightCalculation(actorEntity: Actor): EncumbranceDnd5e {
	//@ts-ignore
	// actorEntity._prepareEncumbrance();
	//@ts-ignore
	const encumbrance = <EncumbranceDnd5e>actorEntity.system.attributes.encumbrance;
	return encumbrance;
}

function _standardVehicleWeightCalculation(actorEntity: Actor): EncumbranceDnd5e {
	// Classify items owned by the vehicle and compute total cargo weight
	let totalWeight = 0;
	for (const item of actorEntity.items) {
		//@ts-ignore
		// actorEntity._prepareCrewedItem(item);

		// Handle cargo explicitly
		//@ts-ignore
		const isCargo = item.flags.dnd5e?.vehicleCargo === true;
		if (isCargo) {
			// totalWeight += (item.system.weight || 0) * item.system.quantity;
			// cargo.cargo.items.push(item);
			// continue;
			const quantity =
				//@ts-ignore
				is_real_number(item.system.quantity) ? item.system.quantity : 0;
			const weight =
				//@ts-ignore
				is_real_number(item.system.weight) ? item.system.weight : 0;
			//@ts-ignore
			totalWeight += weight * quantity;
			//@ts-ignore
			// actorEntity._prepareEncumbrance();
			//@ts-ignore
			const encumbrance = <EncumbranceDnd5e>actorEntity.system.attributes.encumbrance;
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
				// totalWeight += (item.system.weight || 0) * item.system.quantity;
				// cargo.cargo.items.push(item);
				const quantity =
					//@ts-ignore
					is_real_number(item.system.quantity) ? item.system.quantity : 0;
				const weight =
					//@ts-ignore
					is_real_number(item.system.weight) ? item.system.weight : 0;
				totalWeight += weight * quantity;
			}
		}
	}

	// Update the rendering context data
	// context.features = Object.values(features);
	// context.cargo = Object.values(cargo);
	// context.system.attributes.encumbrance = actorEntity._prepareEncumbrance();

	//@ts-ignore
	// actorEntity._prepareEncumbrance();
	//@ts-ignore
	const encumbrance = <EncumbranceDnd5e>actorEntity.system.attributes.encumbrance;
	return encumbrance;
}
