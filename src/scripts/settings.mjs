import API from "./api.mjs";
import CONSTANTS from "./constants.mjs";
import { i18n } from "./lib/lib.mjs";

export const registerSettings = function () {
  game.settings.registerMenu(CONSTANTS.MODULE_ID, "resetAllSettings", {
    name: `${CONSTANTS.MODULE_ID}.setting.reset.name`,
    hint: `${CONSTANTS.MODULE_ID}.setting.reset.hint`,
    icon: "fas fa-coins",
    type: ResetSettingsDialog,
    restricted: true,
  });

  // Removed on 0.6.5
  game.settings.register(CONSTANTS.MODULE_ID, "enabled", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.enabled.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.enabled.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "useVarianEncumbranceWithSpecificType", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.useVarianEncumbranceWithSpecificType.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.useVarianEncumbranceWithSpecificType.hint"),
    scope: "world",
    config: true,
    type: String,
    default: "character,vehicle",
  });

  game.settings.register(CONSTANTS.MODULE_ID, "fakeMetricSystem", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.fakeMetricSystem.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.fakeMetricSystem.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "lightMultiplier", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.lightMultiplier.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.lightMultiplier.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 5,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "lightMultiplierMetric", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.lightMultiplierMetric.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.lightMultiplierMetric.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 2.5,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "mediumMultiplier", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.mediumMultiplier.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.mediumMultiplier.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 10,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "mediumMultiplierMetric", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.mediumMultiplierMetric.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.mediumMultiplierMetric.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 5,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "heavyMultiplier", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.heavyMultiplier.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.heavyMultiplier.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 15,
    onChange: (value) => {
      // NOT NECESSARY WE USE THE VALUE ON THE SETTING
      // DND5E.encumbrance.strMultiplier = value;
    },
  });

  game.settings.register(CONSTANTS.MODULE_ID, "heavyMultiplierMetric", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.heavyMultiplierMetric.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.heavyMultiplierMetric.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 7.5,
    onChange: (value) => {
      // NOT NECESSARY WE USE THE VALUE ON THE SETTING
      // DND5E.encumbrance.strMultiplier = value;
    },
  });

  game.settings.register(CONSTANTS.MODULE_ID, "useStrengthMultiplier", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.useStrengthMultiplier.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.useStrengthMultiplier.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "strengthMultiplier", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.strengthMultiplier.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.strengthMultiplier.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 15,
    onChange: (value) => {
      // NOT NECESSARY WE USE THE VALUE ON THE SETTING
      // DND5E.encumbrance.strMultiplier = value;
    },
  });

  game.settings.register(CONSTANTS.MODULE_ID, "strengthMultiplierMetric", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.strengthMultiplierMetric.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.strengthMultiplierMetric.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 7.5,
    onChange: (value) => {
      // NOT NECESSARY WE USE THE VALUE ON THE SETTING
      // DND5E.encumbrance.strMultiplier = value;
    },
  });

  game.settings.register(CONSTANTS.MODULE_ID, "useVariantEncumbrance", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.useVariantEncumbrance.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.useVariantEncumbrance.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "unequippedMultiplier", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.unequippedMultiplier.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.unequippedMultiplier.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 1,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "equippedMultiplier", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.equippedMultiplier.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.equippedMultiplier.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 1,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "profEquippedMultiplier", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.profEquippedMultiplier.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.profEquippedMultiplier.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 1,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "enableCurrencyWeight", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.enableCurrencyWeight.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.enableCurrencyWeight.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "currencyWeight", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.currencyWeight.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.currencyWeight.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 50,
    onChange: (value) => {
      // NOT NECESSARY WE USE THE VALUE ON THE SETTING
      // DND5E.encumbrance.currencyPerWeight = value;
    },
  });

  game.settings.register(CONSTANTS.MODULE_ID, "currencyWeightMetric", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.currencyWeightMetric.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.currencyWeightMetric.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 110,
    onChange: (value) => {
      // NOT NECESSARY WE USE THE VALUE ON THE SETTING
      // DND5E.encumbrance.currencyPerWeight = value;
    },
  });

  game.settings.register(CONSTANTS.MODULE_ID, "vehicleWeightMultiplier", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.vehicleWeightMultiplier.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.vehicleWeightMultiplier.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 2000,
    onChange: (value) => {
      // NOT NECESSARY WE USE THE VALUE ON THE SETTING
      // DND5E.encumbrance.currencyPerWeight = value;
    },
  });

  game.settings.register(CONSTANTS.MODULE_ID, "vehicleWeightMultiplierMetric", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.vehicleWeightMultiplierMetric.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.vehicleWeightMultiplierMetric.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 1000,
    onChange: (value) => {
      // NOT NECESSARY WE USE THE VALUE ON THE SETTING
      // DND5E.encumbrance.currencyPerWeight = value;
    },
  });

  game.settings.register(CONSTANTS.MODULE_ID, "sizeMultipliers", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.sizeMultipliers.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.sizeMultipliers.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "units", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.units.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.units.hint"),
    scope: "world",
    config: true,
    type: String,
    default: "lbs.",
  });

  game.settings.register(CONSTANTS.MODULE_ID, "unitsMetric", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.unitsMetric.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.unitsMetric.hint"),
    scope: "world",
    config: true,
    type: String,
    default: "kg.",
  });

  game.settings.register(CONSTANTS.MODULE_ID, "lightWeightDecrease", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.lightWeightDecrease.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.lightWeightDecrease.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 10,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "lightWeightDecreaseMetric", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.lightWeightDecreaseMetric.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.lightWeightDecreaseMetric.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 3,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "heavyWeightDecrease", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.heavyWeightDecrease.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.heavyWeightDecrease.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 20,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "heavyWeightDecreaseMetric", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.heavyWeightDecreaseMetric.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.heavyWeightDecreaseMetric.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 6,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "enablePreCheckEncumbranceTier", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.enablePreCheckEncumbranceTier.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.enablePreCheckEncumbranceTier.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "enableVarianEncumbranceOnSpecificActor", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.enableVarianEncumbranceOnSpecificActor.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.enableVarianEncumbranceOnSpecificActor.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "removeLabelButtonsSheetHeader", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.removeLabelButtonsSheetHeader.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.removeLabelButtonsSheetHeader.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "useStandardWeightCalculation", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.useStandardWeightCalculation.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.useStandardWeightCalculation.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "useEquippedUnequippedItemCollectionFeature", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.useEquippedUnequippedItemCollectionFeature.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.useEquippedUnequippedItemCollectionFeature.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "enableDAEIntegration", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.enableDAEIntegration.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.enableDAEIntegration.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "replaceStandardWeightValue", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.replaceStandardWeightValue.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.replaceStandardWeightValue.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: true,
  });

  // ======================================================
  // BULK SYSTEM
  // ======================================================

  game.settings.register(CONSTANTS.MODULE_ID, "enableBulkSystem", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.enableBulkSystem.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.enableBulkSystem.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "unitsBulk", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.unitsBulk.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.unitsBulk.hint"),
    scope: "world",
    config: true,
    type: String,
    default: "bulk",
  });

  game.settings.register(CONSTANTS.MODULE_ID, "heavyWeightDecreaseBulk", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.heavyWeightDecreaseBulk.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.heavyWeightDecreaseBulk.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 0.5,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "automaticApplySuggestedBulk", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.automaticApplySuggestedBulk.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.automaticApplySuggestedBulk.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "currencyWeightBulk", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.currencyWeightBulk.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.currencyWeightBulk.hint"),
    scope: "world",
    config: true,
    type: Number,
    default: 100,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "hideStandardEncumbranceBar", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.hideStandardEncumbranceBar.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.hideStandardEncumbranceBar.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "hideStandardWeightUnits", {
    name: i18n(CONSTANTS.MODULE_ID + ".setting.hideStandardWeightUnits.name"),
    hint: i18n(CONSTANTS.MODULE_ID + ".setting.hideStandardWeightUnits.hint"),
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
  });

  // ======================================================
  // Homebrew Rule
  // ======================================================

  game.settings.register(CONSTANTS.MODULE_ID, "doNotIncreaseWeightByQuantityForNoAmmunition", {
    name: `${CONSTANTS.MODULE_ID}.setting.doNotIncreaseWeightByQuantityForNoAmmunition.name`,
    hint: `${CONSTANTS.MODULE_ID}.setting.doNotIncreaseWeightByQuantityForNoAmmunition.hint`,
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
  });
  // Setting nascosto (DEPRECATED)
  game.settings.register(CONSTANTS.MODULE_ID, "doNotApplyWeightForEquippedArmor", {
    name: `${CONSTANTS.MODULE_ID}.setting.doNotApplyWeightForEquippedArmor.name`,
    hint: `${CONSTANTS.MODULE_ID}.setting.doNotApplyWeightForEquippedArmor.hint`,
    scope: "world",
    config: false,
    default: false,
    type: Boolean,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "applyWeightMultiplierForEquippedArmor", {
    name: `${CONSTANTS.MODULE_ID}.setting.applyWeightMultiplierForEquippedArmor.name`,
    hint: `${CONSTANTS.MODULE_ID}.setting.applyWeightMultiplierForEquippedArmor.hint`,
    scope: "world",
    config: true,
    default: -1,
    type: Number,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "applyWeightMultiplierForEquippedArmorClothing", {
    name: `${CONSTANTS.MODULE_ID}.setting.applyWeightMultiplierForEquippedArmorClothing.name`,
    hint: `${CONSTANTS.MODULE_ID}.setting.applyWeightMultiplierForEquippedArmorClothing.hint`,
    scope: "world",
    config: true,
    default: 0,
    type: Number,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "applyWeightMultiplierForEquippedArmorLight", {
    name: `${CONSTANTS.MODULE_ID}.setting.applyWeightMultiplierForEquippedArmorLight.name`,
    hint: `${CONSTANTS.MODULE_ID}.setting.applyWeightMultiplierForEquippedArmorLight.hint`,
    scope: "world",
    config: true,
    default: 0,
    type: Number,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "applyWeightMultiplierForEquippedArmorMedium", {
    name: `${CONSTANTS.MODULE_ID}.setting.applyWeightMultiplierForEquippedArmorMedium.name`,
    hint: `${CONSTANTS.MODULE_ID}.setting.applyWeightMultiplierForEquippedArmorMedium.hint`,
    scope: "world",
    config: true,
    default: 0,
    type: Number,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "applyWeightMultiplierForEquippedArmorHeavy", {
    name: `${CONSTANTS.MODULE_ID}.setting.applyWeightMultiplierForEquippedArmorHeavy.name`,
    hint: `${CONSTANTS.MODULE_ID}.setting.applyWeightMultiplierForEquippedArmorHeavy.hint`,
    scope: "world",
    config: true,
    default: 0,
    type: Number,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "applyWeightMultiplierForEquippedArmorNatural", {
    name: `${CONSTANTS.MODULE_ID}.setting.applyWeightMultiplierForEquippedArmorNatural.name`,
    hint: `${CONSTANTS.MODULE_ID}.setting.applyWeightMultiplierForEquippedArmorNatural.hint`,
    scope: "world",
    config: true,
    default: 0,
    type: Number,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "applyWeightMultiplierForProficientArmor", {
    name: `${CONSTANTS.MODULE_ID}.setting.applyWeightMultiplierForProficientArmor.name`,
    hint: `${CONSTANTS.MODULE_ID}.setting.applyWeightMultiplierForProficientArmor.hint`,
    scope: "world",
    config: true,
    default: -1,
    type: Number,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "applyWeightMultiplierForProficientArmorClothing", {
    name: `${CONSTANTS.MODULE_ID}.setting.applyWeightMultiplierForProficientArmorClothing.name`,
    hint: `${CONSTANTS.MODULE_ID}.setting.applyWeightMultiplierForProficientArmorClothing.hint`,
    scope: "world",
    config: true,
    default: 0,
    type: Number,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "applyWeightMultiplierForProficientArmorLight", {
    name: `${CONSTANTS.MODULE_ID}.setting.applyWeightMultiplierForProficientArmorLight.name`,
    hint: `${CONSTANTS.MODULE_ID}.setting.applyWeightMultiplierForProficientArmorLight.hint`,
    scope: "world",
    config: true,
    default: 0,
    type: Number,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "applyWeightMultiplierForProficientArmorMedium", {
    name: `${CONSTANTS.MODULE_ID}.setting.applyWeightMultiplierForProficientArmorMedium.name`,
    hint: `${CONSTANTS.MODULE_ID}.setting.applyWeightMultiplierForProficientArmorMedium.hint`,
    scope: "world",
    config: true,
    default: 0,
    type: Number,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "applyWeightMultiplierForProficientArmorHeavy", {
    name: `${CONSTANTS.MODULE_ID}.setting.applyWeightMultiplierForProficientArmorHeavy.name`,
    hint: `${CONSTANTS.MODULE_ID}.setting.applyWeightMultiplierForProficientArmorHeavy.hint`,
    scope: "world",
    config: true,
    default: 0,
    type: Number,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "applyWeightMultiplierForProficientArmorNatural", {
    name: `${CONSTANTS.MODULE_ID}.setting.applyWeightMultiplierForProficientArmorNatural.name`,
    hint: `${CONSTANTS.MODULE_ID}.setting.applyWeightMultiplierForProficientArmorNatural.hint`,
    scope: "world",
    config: true,
    default: 0,
    type: Number,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "applyWeightMultiplierForEquippedWeapon", {
    name: `${CONSTANTS.MODULE_ID}.setting.applyWeightMultiplierForEquippedWeapon.name`,
    hint: `${CONSTANTS.MODULE_ID}.setting.applyWeightMultiplierForEquippedWeapon.hint`,
    scope: "world",
    config: true,
    default: -1,
    type: Number,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "applyWeightMultiplierForProficientWeapon", {
    name: `${CONSTANTS.MODULE_ID}.setting.applyWeightMultiplierForProficientWeapon.name`,
    hint: `${CONSTANTS.MODULE_ID}.setting.applyWeightMultiplierForProficientWeapon.hint`,
    scope: "world",
    config: true,
    default: -1,
    type: Number,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "applyWeightMultiplierForEquippedContainer", {
    name: `${CONSTANTS.MODULE_ID}.setting.applyWeightMultiplierForEquippedContainer.name`,
    hint: `${CONSTANTS.MODULE_ID}.setting.applyWeightMultiplierForEquippedContainer.hint`,
    scope: "world",
    config: true,
    default: -1,
    type: Number,
  });

  game.settings.register(CONSTANTS.MODULE_ID, "useStrValueInsteadStrModOnBulk", {
    name: `${CONSTANTS.MODULE_ID}.setting.useStrValueInsteadStrModOnBulk.name`,
    hint: `${CONSTANTS.MODULE_ID}.setting.useStrValueInsteadStrModOnBulk.hint`,
    scope: "world",
    config: true,
    default: false,
    type: Boolean,
  });

  // =============================================================================================================

  game.settings.register(CONSTANTS.MODULE_ID, "debug", {
    name: `${CONSTANTS.MODULE_ID}.setting.debug.name`,
    hint: `${CONSTANTS.MODULE_ID}.setting.debug.hint`,
    scope: "client",
    config: true,
    default: false,
    type: Boolean,
  });
};

class ResetSettingsDialog extends FormApplication {
  constructor(...args) {
    super(...args);

    return new Dialog({
      title: game.i18n.localize(`${CONSTANTS.MODULE_ID}.dialogs.resetsettings.title`),
      content:
        '<p style="margin-bottom:1rem;">' +
        game.i18n.localize(`${CONSTANTS.MODULE_ID}.dialogs.resetsettings.content`) +
        "</p>",
      buttons: {
        confirm: {
          icon: '<i class="fas fa-check"></i>',
          label: game.i18n.localize(`${CONSTANTS.MODULE_ID}.dialogs.resetsettings.confirm`),
          callback: async () => {
            const worldSettings = game.settings.storage
              ?.get("world")
              ?.filter((setting) => setting.key.startsWith(`${CONSTANTS.MODULE_ID}.`));
            for (let setting of worldSettings) {
              console.log(`Reset setting '${setting.key}'`);
              await setting.delete();
            }
            //window.location.reload();
          },
        },
        cancel: {
          icon: '<i class="fas fa-times"></i>',
          label: game.i18n.localize(`${CONSTANTS.MODULE_ID}.dialogs.resetsettings.cancel`),
        },
      },
      default: "cancel",
    });
  }

  async _updateObject(event, formData) {
    // do nothing
  }
}
