const CONSTANTS = {
	MODULE_NAME: "variant-encumbrance-dnd5e",
	PATH: `modules/variant-encumbrance-dnd5e/`,
	FLAG: "variant-encumbrance-dnd5e",
	INVENTORY_PLUS_MODULE_NAME: "inventory-plus",
	MIDI_QOL_MODULE_NAME: "midi-qol",
	ITEM_COLLECTION_MODULE_NAME: "itemcollection",
	DFREDS_CONVENIENT_EFFECTS_MODULE_NAME: "dfreds-convenient-effects",
	DF_QUALITY_OF_LIFE_MODULE_NAME: "df-qol",
	DAE_MODULE_NAME: "dae",
	BACKPACK_MANAGER_MODULE_NAME: "backpack-manager",
	DFREDS_CONVENIENT_EFFECTS: {
		FLAGS : {
			DESCRIPTION: "description",
			IS_CONVENIENT: "isConvenient",
			IS_DYNAMIC: "isDynamic",
			IS_VIEWABLE: "isViewable",
			NESTED_EFFECTS: "nestedEffects",
			SUB_EFFECTS: "subEffects"
		},
		COLORS : {
			COLD_FIRE: "#389888",
			FIRE: "#f98026",
			WHITE: "#ffffff",
			MOON_TOUCHED: "#f4f1c9"
		},
		SECONDS : {
			IN_ONE_ROUND: CONFIG.time.roundTime || 6,
			IN_ONE_MINUTE: 60,
			IN_TEN_MINUTES: 600,
			IN_ONE_HOUR: 3600,
			IN_SIX_HOURS: 21600,
			IN_EIGHT_HOURS: 28800,
			IN_ONE_DAY: 86400,
			IN_ONE_WEEK: 604800
		},
		SIZES_ORDERED : ["tiny", "sm", "med", "lg", "huge", "grg"]
	}
};

CONSTANTS.PATH = `modules/${CONSTANTS.MODULE_NAME}/`;

export default CONSTANTS;
