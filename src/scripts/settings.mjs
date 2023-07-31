import API from "./api.mjs";
import CONSTANTS from "./constants.mjs";
import { i18n } from "./lib/lib.mjs";

export const registerSettings = function () {
	game.settings.registerMenu(CONSTANTS.MODULE_NAME, "resetAllSettings", {
		name: `${CONSTANTS.MODULE_NAME}.setting.reset.name`,
		hint: `${CONSTANTS.MODULE_NAME}.setting.reset.hint`,
		icon: "fas fa-coins",
		type: ResetSettingsDialog,
		restricted: true
	});

	// Removed on 0.6.5
	game.settings.register(CONSTANTS.MODULE_NAME, "enabled", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.enabled.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.enabled.hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "useVarianEncumbranceWithSpecificType", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.useVarianEncumbranceWithSpecificType.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.useVarianEncumbranceWithSpecificType.hint"),
		scope: "world",
		config: true,
		type: String,
		default: "character,vehicle"
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "fakeMetricSystem", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.fakeMetricSystem.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.fakeMetricSystem.hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "lightMultiplier", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.lightMultiplier.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.lightMultiplier.hint"),
		scope: "world",
		config: true,
		type: Number,
		default: 5
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "lightMultiplierMetric", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.lightMultiplierMetric.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.lightMultiplierMetric.hint"),
		scope: "world",
		config: true,
		type: Number,
		default: 2.5
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "mediumMultiplier", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.mediumMultiplier.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.mediumMultiplier.hint"),
		scope: "world",
		config: true,
		type: Number,
		default: 10
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "mediumMultiplierMetric", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.mediumMultiplierMetric.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.mediumMultiplierMetric.hint"),
		scope: "world",
		config: true,
		type: Number,
		default: 5
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "heavyMultiplier", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.heavyMultiplier.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.heavyMultiplier.hint"),
		scope: "world",
		config: true,
		type: Number,
		default: 15,
		onChange: (value) => {
			// NOT NECESSARY WE USE THE VALUE ON THE SETTING
			// DND5E.encumbrance.strMultiplier = value;
		}
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "heavyMultiplierMetric", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.heavyMultiplierMetric.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.heavyMultiplierMetric.hint"),
		scope: "world",
		config: true,
		type: Number,
		default: 7.5,
		onChange: (value) => {
			// NOT NECESSARY WE USE THE VALUE ON THE SETTING
			// DND5E.encumbrance.strMultiplier = value;
		}
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "useStrengthMultiplier", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.useStrengthMultiplier.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.useStrengthMultiplier.hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "strengthMultiplier", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.strengthMultiplier.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.strengthMultiplier.hint"),
		scope: "world",
		config: true,
		type: Number,
		default: 15,
		onChange: (value) => {
			// NOT NECESSARY WE USE THE VALUE ON THE SETTING
			// DND5E.encumbrance.strMultiplier = value;
		}
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "strengthMultiplierMetric", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.strengthMultiplierMetric.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.strengthMultiplierMetric.hint"),
		scope: "world",
		config: true,
		type: Number,
		default: 7.5,
		onChange: (value) => {
			// NOT NECESSARY WE USE THE VALUE ON THE SETTING
			// DND5E.encumbrance.strMultiplier = value;
		}
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "useVariantEncumbrance", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.useVariantEncumbrance.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.useVariantEncumbrance.hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "unequippedMultiplier", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.unequippedMultiplier.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.unequippedMultiplier.hint"),
		scope: "world",
		config: true,
		type: Number,
		default: 1
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "equippedMultiplier", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.equippedMultiplier.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.equippedMultiplier.hint"),
		scope: "world",
		config: true,
		type: Number,
		default: 1
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "profEquippedMultiplier", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.profEquippedMultiplier.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.profEquippedMultiplier.hint"),
		scope: "world",
		config: true,
		type: Number,
		default: 1
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "enableCurrencyWeight", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.enableCurrencyWeight.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.enableCurrencyWeight.hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "currencyWeight", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.currencyWeight.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.currencyWeight.hint"),
		scope: "world",
		config: true,
		type: Number,
		default: 50,
		onChange: (value) => {
			// NOT NECESSARY WE USE THE VALUE ON THE SETTING
			// DND5E.encumbrance.currencyPerWeight = value;
		}
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "currencyWeightMetric", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.currencyWeightMetric.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.currencyWeightMetric.hint"),
		scope: "world",
		config: true,
		type: Number,
		default: 110,
		onChange: (value) => {
			// NOT NECESSARY WE USE THE VALUE ON THE SETTING
			// DND5E.encumbrance.currencyPerWeight = value;
		}
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "vehicleWeightMultiplier", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.vehicleWeightMultiplier.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.vehicleWeightMultiplier.hint"),
		scope: "world",
		config: true,
		type: Number,
		default: 2000,
		onChange: (value) => {
			// NOT NECESSARY WE USE THE VALUE ON THE SETTING
			// DND5E.encumbrance.currencyPerWeight = value;
		}
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "vehicleWeightMultiplierMetric", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.vehicleWeightMultiplierMetric.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.vehicleWeightMultiplierMetric.hint"),
		scope: "world",
		config: true,
		type: Number,
		default: 1000,
		onChange: (value) => {
			// NOT NECESSARY WE USE THE VALUE ON THE SETTING
			// DND5E.encumbrance.currencyPerWeight = value;
		}
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "sizeMultipliers", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.sizeMultipliers.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.sizeMultipliers.hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "units", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.units.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.units.hint"),
		scope: "world",
		config: true,
		type: String,
		default: "lbs."
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "unitsMetric", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.unitsMetric.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.unitsMetric.hint"),
		scope: "world",
		config: true,
		type: String,
		default: "kg."
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "lightWeightDecrease", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.lightWeightDecrease.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.lightWeightDecrease.hint"),
		scope: "world",
		config: true,
		type: Number,
		default: 10
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "lightWeightDecreaseMetric", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.lightWeightDecreaseMetric.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.lightWeightDecreaseMetric.hint"),
		scope: "world",
		config: true,
		type: Number,
		default: 3
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "heavyWeightDecrease", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.heavyWeightDecrease.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.heavyWeightDecrease.hint"),
		scope: "world",
		config: true,
		type: Number,
		default: 20
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "heavyWeightDecreaseMetric", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.heavyWeightDecreaseMetric.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.heavyWeightDecreaseMetric.hint"),
		scope: "world",
		config: true,
		type: Number,
		default: 6
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "enablePreCheckEncumbranceTier", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.enablePreCheckEncumbranceTier.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.enablePreCheckEncumbranceTier.hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "enableVarianEncumbranceOnSpecificActor", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.enableVarianEncumbranceOnSpecificActor.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.enableVarianEncumbranceOnSpecificActor.hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "removeLabelButtonsSheetHeader", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.removeLabelButtonsSheetHeader.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.removeLabelButtonsSheetHeader.hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "useStandardWeightCalculation", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.useStandardWeightCalculation.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.useStandardWeightCalculation.hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "useEquippedUnequippedItemCollectionFeature", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.useEquippedUnequippedItemCollectionFeature.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.useEquippedUnequippedItemCollectionFeature.hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "enableDAEIntegration", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.enableDAEIntegration.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.enableDAEIntegration.hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "replaceStandardWeightValue", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.replaceStandardWeightValue.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.replaceStandardWeightValue.hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: true
	});

	// ======================================================
	// BULK SYSTEM
	// ======================================================

	game.settings.register(CONSTANTS.MODULE_NAME, "enableBulkSystem", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.enableBulkSystem.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.enableBulkSystem.hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "unitsBulk", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.unitsBulk.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.unitsBulk.hint"),
		scope: "world",
		config: true,
		type: String,
		default: "bulk"
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "heavyWeightDecreaseBulk", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.heavyWeightDecreaseBulk.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.heavyWeightDecreaseBulk.hint"),
		scope: "world",
		config: true,
		type: Number,
		default: 0.5
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "automaticApplySuggestedBulk", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.automaticApplySuggestedBulk.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.automaticApplySuggestedBulk.hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "hideStandardEncumbranceBar", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.hideStandardEncumbranceBar.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.hideStandardEncumbranceBar.hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "hideStandardWeightUnits", {
		name: i18n(CONSTANTS.MODULE_NAME + ".setting.hideStandardWeightUnits.name"),
		hint: i18n(CONSTANTS.MODULE_NAME + ".setting.hideStandardWeightUnits.hint"),
		scope: "world",
		config: true,
		type: Boolean,
		default: false
	});

	// ======================================================
	// Homebrew Rule
	// ======================================================

	game.settings.register(CONSTANTS.MODULE_NAME, "doNotIncreaseWeightByQuantityForNoAmmunition", {
		name: `${CONSTANTS.MODULE_NAME}.setting.doNotIncreaseWeightByQuantityForNoAmmunition.name`,
		hint: `${CONSTANTS.MODULE_NAME}.setting.doNotIncreaseWeightByQuantityForNoAmmunition.hint`,
		scope: "world",
		config: true,
		default: false,
		type: Boolean
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "doNotApplyWeightForEquippedArmor", {
		name: `${CONSTANTS.MODULE_NAME}.setting.doNotApplyWeightForEquippedArmor.name`,
		hint: `${CONSTANTS.MODULE_NAME}.setting.doNotApplyWeightForEquippedArmor.hint`,
		scope: "world",
		config: true,
		default: false,
		type: Boolean
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "applyWeightMultiplierForEquippedArmorClothing", {
		name: `${CONSTANTS.MODULE_NAME}.setting.applyWeightMultiplierForEquippedArmorClothing.name`,
		hint: `${CONSTANTS.MODULE_NAME}.setting.applyWeightMultiplierForEquippedArmorClothing.hint`,
		scope: "world",
		config: true,
		default: 0,
		type: Number
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "applyWeightMultiplierForEquippedArmorLight", {
		name: `${CONSTANTS.MODULE_NAME}.setting.applyWeightMultiplierForEquippedArmorLight.name`,
		hint: `${CONSTANTS.MODULE_NAME}.setting.applyWeightMultiplierForEquippedArmorLight.hint`,
		scope: "world",
		config: true,
		default: 0,
		type: Number
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "applyWeightMultiplierForEquippedArmorMedium", {
		name: `${CONSTANTS.MODULE_NAME}.setting.applyWeightMultiplierForEquippedArmorMedium.name`,
		hint: `${CONSTANTS.MODULE_NAME}.setting.applyWeightMultiplierForEquippedArmorMedium.hint`,
		scope: "world",
		config: true,
		default: 0,
		type: Number
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "applyWeightMultiplierForEquippedArmorHeavy", {
		name: `${CONSTANTS.MODULE_NAME}.setting.applyWeightMultiplierForEquippedArmorHeavy.name`,
		hint: `${CONSTANTS.MODULE_NAME}.setting.applyWeightMultiplierForEquippedArmorHeavy.hint`,
		scope: "world",
		config: true,
		default: 0,
		type: Number
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "applyWeightMultiplierForEquippedArmorNatural", {
		name: `${CONSTANTS.MODULE_NAME}.setting.applyWeightMultiplierForEquippedArmorNatural.name`,
		hint: `${CONSTANTS.MODULE_NAME}.setting.applyWeightMultiplierForEquippedArmorNatural.hint`,
		scope: "world",
		config: true,
		default: 0,
		type: Number
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "applyWeightMultiplierForEquippedContainer", {
		name: `${CONSTANTS.MODULE_NAME}.setting.applyWeightMultiplierForEquippedContainer.name`,
		hint: `${CONSTANTS.MODULE_NAME}.setting.applyWeightMultiplierForEquippedContainer.hint`,
		scope: "world",
		config: true,
		default: -1,
		type: Number
	});

	game.settings.register(CONSTANTS.MODULE_NAME, "useStrValueInsteadStrModOnBulk", {
		name: `${CONSTANTS.MODULE_NAME}.setting.useStrValueInsteadStrModOnBulk.name`,
		hint: `${CONSTANTS.MODULE_NAME}.setting.useStrValueInsteadStrModOnBulk.hint`,
		scope: "world",
		config: true,
		default: false,
		type: Boolean
	});

	// =============================================================================================================

	game.settings.register(CONSTANTS.MODULE_NAME, "debug", {
		name: `${CONSTANTS.MODULE_NAME}.setting.debug.name`,
		hint: `${CONSTANTS.MODULE_NAME}.setting.debug.hint`,
		scope: "world",
		config: true,
		default: false,
		type: Boolean
	});
};

class ResetSettingsDialog extends FormApplication {
	constructor(...args) {
		//@ts-ignore
		super(...args);
		//@ts-ignore
		return new Dialog({
			title: game.i18n.localize(`${CONSTANTS.MODULE_NAME}.dialogs.resetsettings.title`),
			content:
				'<p style="margin-bottom:1rem;">' +
				game.i18n.localize(`${CONSTANTS.MODULE_NAME}.dialogs.resetsettings.content`) +
				"</p>",
			buttons: {
				confirm: {
					icon: '<i class="fas fa-check"></i>',
					label: game.i18n.localize(`${CONSTANTS.MODULE_NAME}.dialogs.resetsettings.confirm`),
					callback: async () => {
						const worldSettings = game.settings.storage
							?.get("world")
							?.filter((setting) => setting.key.startsWith(`${CONSTANTS.MODULE_NAME}.`));
						for (let setting of worldSettings) {
							console.log(`Reset setting '${setting.key}'`);
							await setting.delete();
						}
						//window.location.reload();
					}
				},
				cancel: {
					icon: '<i class="fas fa-times"></i>',
					label: game.i18n.localize(`${CONSTANTS.MODULE_NAME}.dialogs.resetsettings.cancel`)
				}
			},
			default: "cancel"
		});
	}

	async _updateObject(event, formData) {
		// do nothing
	}
}
