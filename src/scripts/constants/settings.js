import { SYSTEMS } from "../systems";

const SETTINGS = {
  // Client settings

  // Module Settings

  // "enabled",
  // "useVarianEncumbranceWithSpecificType"
  // "fakeMetricSystem"
  // "lightMultiplier"
  // "lightMultiplierMetric"
  // "mediumMultiplier"
  // "mediumMultiplierMetric"
  // "heavyMultiplier"
  // "heavyMultiplierMetric"
  // "useStrengthMultiplier"
  // "strengthMultiplier"
  // "strengthMultiplierMetric"
  // "useVariantEncumbrance"
  // "unequippedMultiplier"
  // "equippedMultiplier"
  // "profEquippedMultiplier"
  // "enableCurrencyWeight"
  // "currencyWeight"
  // "currencyWeightMetric"
  // "vehicleWeightMultiplier"
  // "vehicleWeightMultiplierMetric"
  // "sizeMultipliers"
  // "units"
  // "unitsMetric"
  // "lightWeightDecrease"
  // "lightWeightDecreaseMetric"
  // "heavyWeightDecrease"
  // "heavyWeightDecreaseMetric"
  // "enablePreCheckEncumbranceTier"
  // "enableVarianEncumbranceOnSpecificActor"
  // "removeLabelButtonsSheetHeader"
  // "useStandardWeightCalculation"
  // "useEquippedUnequippedItemCollectionFeature"
  // "enableDAEIntegration"
  // "replaceStandardWeightValue"

  // // ======================================================
  // // BULK SYSTEM
  // // ======================================================

  // "enableBulkSystem"
  // "unitsBulk"
  // "heavyWeightDecreaseBulk"
  // "automaticApplySuggestedBulk"
  // "currencyWeightBulk"
  // "hideStandardEncumbranceBar"
  // "hideStandardWeightUnits"

  // // ======================================================
  // // Homebrew Rule
  // // ======================================================

  // "doNotIncreaseWeightByQuantityForNoAmmunition"
  // "doNotApplyWeightForEquippedArmor"
  // "applyWeightMultiplierForEquippedArmorClothing"
  // "applyWeightMultiplierForEquippedArmorLight"
  // "applyWeightMultiplierForEquippedArmorMedium"
  // "applyWeightMultiplierForEquippedArmorHeavy"
  // "applyWeightMultiplierForEquippedArmorNatural"
  // "applyWeightMultiplierForEquippedContainer"
  // "useStrValueInsteadStrModOnBulk"

  // // =============================================================================================================

  ENABLED: "enabled",
  USE_VARIAN_ENCUMBRANCE_WITH_SPECIFIC_TYPE: "useVarianEncumbranceWithSpecificType",
  FAKE_METRIC_SYSTEM: "fakeMetricSystem",
  LIGHT_MULTIPLIER: "lightMultiplier",
  LIGHT_MULTIPLIER_METRIC: "lightMultiplierMetric",
  MEDIUM_MULTIPLIER: "mediumMultiplier",
  MEDIUM_MULTIPLIER_METRIC: "mediumMultiplierMetric",
  HEAVY_MULTIPLIER: "heavyMultiplier",
  HEAVY_MULTIPLIER_METRIC: "heavyMultiplierMetric",
  USE_STRENGTH_MULTIPLIER: "useStrengthMultiplier",
  STRENGTH_MULTIPLIER: "strengthMultiplier",
  STRENGTH_MULTIPLIER_METRIC: "strengthMultiplierMetric",
  USE_VARIANT_ENCUMBRANCE: "useVariantEncumbrance",
  UNEQUIPPED_MULTIPLIER: "unequippedMultiplier",
  EQUIPPED_MULTIPLIER: "equippedMultiplier",
  PROF_EQUIPPED_MULTIPLIER: "profEquippedMultiplier",
  ENABLE_CURRENCY_WEIGHT: "enableCurrencyWeight",
  CURRENCY_WEIGHT: "currencyWeight",
  CURRENCY_WEIGHT_METRIC: "currencyWeightMetric",
  VEHICLE_WEIGHT_MULTIPLIER: "vehicleWeightMultiplier",
  VEHICLE_WEIGHT_MULTIPLIER_METRIC: "vehicleWeightMultiplierMetric",
  SIZE_MULTIPLIERS: "sizeMultipliers",
  UNITS: "units",
  UNITS_METRIC: "unitsMetric",
  LIGHT_WEIGHT_DECREASE: "lightWeightDecrease",
  LIGHT_WEIGHT_DECREASE_METRIC: "lightWeightDecreaseMetric",
  HEAVY_WEIGHT_DECREASE: "heavyWeightDecrease",
  HEAVY_WEIGHT_DECREASE_METRIC: "heavyWeightDecreaseMetric",
  ENABLE_PRE_CHECK_ENCUMBRANCE_TIER: "enablePreCheckEncumbranceTier",
  ENABLE_VARIAN_ENCUMBRANCE_ON_SPECIFIC_ACTOR: "enableVarianEncumbranceOnSpecificActor",
  REMOVE_LABEL_BUTTONS_SHEET_HEADER: "removeLabelButtonsSheetHeader",
  USE_STANDARD_WEIGHT_CALCULATION: "useStandardWeightCalculation",
  USE_EQUIPPED_UNEQUIPPED_ITEM_COLLECTION_FEATURE: "useEquippedUnequippedItemCollectionFeature",
  ENABLE_DAE_INTEGRATION: "enableDAEIntegration",
  REPLACE_STANDARD_WEIGHT_VALUE: "replaceStandardWeightValue",

  // ======================================================
  // BULK SYSTEM
  // ======================================================

  ENABLE_BULK_SYSTEM: "enableBulkSystem",
  UNITS_BULK: "unitsBulk",
  HEAVY_WEIGHT_DECREASE_BULK: "heavyWeightDecreaseBulk",
  AUTOMATIC_APPLY_SUGGESTED_BULK: "automaticApplySuggestedBulk",
  CURRENCY_WEIGHT_BULK: "currencyWeightBulk",
  HIDE_STANDARD_ENCUMBRANCE_BAR: "hideStandardEncumbranceBar",
  HIDE_STANDARD_WEIGHT_UNITS: "hideStandardWeightUnits",

  // ======================================================
  // Homebrew Rule
  // ======================================================

  DO_NOT_INCREASE_WEIGHT_BY_QUANTITY_FOR_NO_AMMUNITION: "doNotIncreaseWeightByQuantityForNoAmmunition",
  DO_NOT_APPLY_WEIGHT_FOR_EQUIPPED_ARMOR: "doNotApplyWeightForEquippedArmor",
  APPLY_WEIGHT_MULTIPLIER_FOR_EQUIPPED_ARMOR_CLOTHING: "applyWeightMultiplierForEquippedArmorClothing",
  APPLY_WEIGHT_MULTIPLIER_FOR_EQUIPPED_ARMOR_LIGHT: "applyWeightMultiplierForEquippedArmorLight",
  APPLY_WEIGHT_MULTIPLIER_FOR_EQUIPPED_ARMOR_MEDIUM: "applyWeightMultiplierForEquippedArmorMedium",
  APPLY_WEIGHT_MULTIPLIER_FOR_EQUIPPED_ARMOR_HEAVY: "applyWeightMultiplierForEquippedArmorHeavy",
  APPLY_WEIGHT_MULTIPLIER_FOR_EQUIPPED_ARMOR_NATURAL: "applyWeightMultiplierForEquippedArmorNatural",
  APPLY_WEIGHT_MULTIPLIER_FOR_EQUIPPED_CONTAINER: "applyWeightMultiplierForEquippedContainer",
  USE_STR_VALUE_INSTEAD_STR_MOD_ON_BULK: "useStrValueInsteadStrModOnBulk",

  // // =============================================================================================================

  DEBUG: "debug",

  // Style settings

  // System Settings

  // Hidden settings
  SYSTEM_FOUND: "systemFound",
  SYSTEM_NOT_FOUND_WARNING_SHOWN: "systemNotFoundWarningShown",
  SYSTEM_VERSION: "systemVersion",

  // GET_DEFAULT() {
  //   return foundry.utils.deepClone(SETTINGS.DEFAULTS());
  // },

  // GET_SYSTEM_DEFAULTS() {
  //   return Object.fromEntries(
  //     Object.entries(SETTINGS.GET_DEFAULT()).filter((entry) => {
  //       return entry[1].system;
  //     })
  //   );
  // },

  // DEFAULTS: () => ({
  //   // TODO
  // }),
};

export default SETTINGS;
