import Logger from "../lib/Logger";

/**
 * Data class for defining an effect
 */
export default class Effect {
    // END ADDED FROM 4535992
    constructor({
        customId = "",
        name = "",
        label = "",
        description = "",
        icon = "icons/svg/aura.svg",
        tint = "",
        seconds = NaN,
        rounds = NaN,
        turns = NaN,
        isDynamic = false,
        isViewable = true,
        isDisabled = false, // ADDED FROM 4535992
        isTemporary = false, // ADDED FROM 4535992
        isSuppressed = false, // ADDED FROM 4535992
        flags = {},
        changes = [],
        atlChanges = [],
        tokenMagicChanges = [],
        nestedEffects = [],
        subEffects = [],
        // ADDED FROM 4535992
        transfer = false,
        atcvChanges = [],
        dae = {},
        overlay = false,
        // END ADDED FROM 4535992
    }) {
        this.icon = "icons/svg/aura.svg";
        this.isDynamic = false;
        this.isViewable = true;
        this.changes = [];
        this.atlChanges = [];
        this.tokenMagicChanges = [];
        this.nestedEffects = [];
        this.subEffects = [];
        this.transfer = false;
        this.atcvChanges = [];
        this.overlay = false;
        // Optional
        this.origin = "";
        this.customId = customId;
        this.name = name;
        this.label = label;
        this.description = description;
        this.icon = icon;
        this.tint = tint;
        this.seconds = seconds;
        this.rounds = rounds;
        this.turns = turns;
        this.isDynamic = isDynamic;
        this.isViewable = isViewable;
        this.flags = flags;
        this.changes = changes;
        this.atlChanges = atlChanges;
        this.tokenMagicChanges = tokenMagicChanges;
        this.nestedEffects = nestedEffects;
        this.subEffects = subEffects;
        this.transfer = transfer;
        // 4535992 ADDED
        this.atcvChanges = atcvChanges;
        this.dae = dae || {};
        // This are not effect data
        this.isDisabled = isDisabled;
        this.isTemporary = isTemporary;
        this.isSuppressed = isSuppressed;
        this.overlay = overlay;
    }
    /**
     * Converts the effect data to an active effect data object
     *
     * @param {object} params - the params to use for conversion
     * @param {string} params.origin - the origin to add to the effect
     * @param {boolean} params.overlay - whether the effect is an overlay or not
     * @returns {object} The active effect data object for this effect
     */
    convertToActiveEffectData({ origin = "", overlay = false } = {}) {
        if (is_real_number(this.seconds)) {
            this.isTemporary = true;
        }
        if (is_real_number(this.rounds)) {
            this.isTemporary = true;
        }
        if (is_real_number(this.turns)) {
            this.isTemporary = true;
        }
        const isPassive = !this.isTemporary;
        const currentDae = this._isEmptyObject(this.dae) ? this.flags.dae : this.dae;
        const convenientDescription = this.description
            ? Logger.i18n(this.description) ?? "Applies custom effects"
            : this.description;
        return {
            id: this._id,
            // name: Logger.i18n(this.name),
            label: Logger.i18n(this.label),
            description: Logger.i18n(this.description),
            icon: this.icon,
            tint: this.tint,
            duration: this._getDurationData(),
            flags: foundry.utils.mergeObject(this.flags, {
                core: {
                    statusId: isPassive ? undefined : this._id,
                    overlay: overlay ? overlay : this.overlay ? this.overlay : false, // MOD 4535992
                },
                [Constants.MODULE_ID]: {
                    [Constants.FLAGS.DESCRIPTION]: convenientDescription,
                    [Constants.FLAGS.IS_CONVENIENT]: true,
                    [Constants.FLAGS.IS_DYNAMIC]: this.isDynamic,
                    [Constants.FLAGS.IS_VIEWABLE]: this.isViewable,
                    [Constants.FLAGS.NESTED_EFFECTS]: this.nestedEffects,
                    [Constants.FLAGS.SUB_EFFECTS]: this.subEffects,
                },
                dae: this._isEmptyObject(currentDae)
                    ? isPassive
                        ? { stackable: false, specialDuration: [], transfer: true }
                        : {}
                    : currentDae,
            }),
            origin: origin ? origin : this.origin ? this.origin : "",
            transfer: isPassive ? false : this.transfer,
            //changes: this.changes, // MOD 4535992
            changes: this._handleIntegrations(),
            // 4535992 these are not under data
            // isDisabled: this.isDisabled ?? false,
            // isTemporary: this.isTemporary ?? false,
            // isSuppressed: this.isSuppressed ?? false,
        };
    }
    /**
     * Converts the effect data to an active effect data object
     *
     * @param {object} params - the params to use for conversion
     * @param {string} params.origin - the origin to add to the effect
     * @param {boolean} params.overlay - whether the effect is an overlay or not
     * @returns {object} The active effect data object for this effect
     */
    convertToActiveEffect() {
        const changes = this._handleIntegrations();
        const flags = {};
        const label = this.label ? this.label : this.name;
        const description = this.description;
        const isDynamic = this.isDynamic;
        const isViewable = this.isViewable;
        const nestedEffects = this.nestedEffects;
        const subEffects = this.subEffects;
        const icon = this.icon;
        const rounds = this.rounds;
        const seconds = this.seconds;
        const turns = this.turns;
        let ceFlags = {
            core: {
                statusId: `Convenient Effect: ${label}`,
            },
        };
        ceFlags[Constants.MODULE_ID] = {};
        ceFlags[Constants.MODULE_ID][Constants.FLAGS.DESCRIPTION] = description;
        ceFlags[Constants.MODULE_ID][Constants.FLAGS.IS_CONVENIENT] = true;
        ceFlags[Constants.MODULE_ID][Constants.FLAGS.IS_DYNAMIC] = isDynamic;
        ceFlags[Constants.MODULE_ID][Constants.FLAGS.IS_VIEWABLE] = isViewable;
        ceFlags[Constants.MODULE_ID][Constants.FLAGS.NESTED_EFFECTS] = nestedEffects;
        ceFlags[Constants.MODULE_ID][Constants.FLAGS.SUB_EFFECTS] = subEffects;
        let duration = {
            rounds: rounds ?? seconds / CONFIG.time.roundTime,
            seconds: seconds,
            startRound: game.combat?.round,
            startTime: game.time.worldTime,
            startTurn: game.combat?.turn,
            turns: turns,
        };
        let effect = new CONFIG.ActiveEffect.documentClass({
            changes,
            disabled: false,
            duration,
            flags: foundry.utils.mergeObject(ceFlags, flags),
            icon,
            label,
            origin,
            transfer: false,
        });
        return effect;
    }
    /**
     * Converts the Effect into an object
     *
     * @returns {object} the object representation of this effect
     */
    convertToObject() {
        return deepClone({ ...this });
    }
    get _id() {
        const label = this.label ? this.label : this.name;
        return `Convenient Effect: ${label}`;
    }
    _getDurationData() {
        // let duration = {
        // 	rounds: this._getCombatRounds() ?? <number>this._getCombatRounds() / CONFIG.time.roundTime,
        // 	seconds: this._getSeconds(),
        // 	startRound: game.combat?.round,
        // 	startTime: game.time.worldTime,
        // 	startTurn: game.combat?.turn,
        // 	turns: !is_real_number(this.turns) ? undefined : this.turns
        // };
        const isPassive = !this.isTemporary;
        if (game.combat) {
            if (isPassive) {
                return {
                    startTime: game.time.worldTime,
                    startRound: 0,
                    startTurn: 0,
                };
            } else {
                return {
                    startRound: game.combat.round,
                    rounds: this._getCombatRounds(),
                    turns: !is_real_number(this.turns) ? undefined : this.turns,
                };
            }
        } else {
            if (isPassive) {
                return {
                    startTime: game.time.worldTime,
                    startRound: 0,
                    startTurn: 0,
                };
            } else {
                return {
                    startTime: game.time.worldTime,
                    seconds: this._getSeconds(),
                };
            }
        }
    }
    _getCombatRounds() {
        if (this.rounds) {
            return this.rounds;
        }
        if (this.seconds) {
            return this.seconds / Constants.SECONDS.IN_ONE_ROUND;
        }
        return undefined;
    }
    _getSeconds() {
        if (this.seconds) {
            return this.seconds;
        }
        if (this.rounds) {
            return this.rounds * Constants.SECONDS.IN_ONE_ROUND;
        }
        return undefined;
    }
    // =============================================
    isDuplicateEffectChange(aeKey, arrChanges) {
        let isDuplicate = false;
        for (const aec of arrChanges) {
            if (isStringEquals(aec.key, aeKey)) {
                isDuplicate = true;
                break;
            }
        }
        return isDuplicate;
    }
    _handleIntegrations() {
        const arrChanges = [];
        for (const change of this?.changes) {
            if (!change.value) {
                change.value = "";
            }
            arrChanges.push(change);
        }
        if (this.atlChanges.length > 0) {
            for (const atlChange of this.atlChanges) {
                if (arrChanges.filter((e) => e.key === atlChange.key).length <= 0) {
                    if (!this.isDuplicateEffectChange(atlChange.key, arrChanges)) {
                        if (!atlChange.value) {
                            atlChange.value = "";
                        }
                        arrChanges.push(atlChange);
                    }
                }
            }
        }
        if (this.tokenMagicChanges.length > 0) {
            for (const tokenMagicChange of this.tokenMagicChanges) {
                if (arrChanges.filter((e) => e.key === tokenMagicChange.key).length <= 0) {
                    if (!this.isDuplicateEffectChange(tokenMagicChange.key, arrChanges)) {
                        if (!tokenMagicChange.value) {
                            tokenMagicChange.value = "";
                        }
                        arrChanges.push(tokenMagicChange);
                    }
                }
            }
        }
        if (this.atcvChanges.length > 0) {
            for (const atcvChange of this.atcvChanges) {
                if (arrChanges.filter((e) => e.key === atcvChange.key).length <= 0) {
                    if (!this.isDuplicateEffectChange(atcvChange.key, arrChanges)) {
                        if (!atcvChange.value) {
                            atcvChange.value = "";
                        }
                        arrChanges.push(atcvChange);
                    }
                }
            }
        }
        /*
  if (this.atlChanges.length > 0) {
    arrChanges.push(...this.atlChanges);
  }

  if (this.tokenMagicChanges.length > 0) {
    arrChanges.push(...this.tokenMagicChanges);
  }

  if (this.atcvChanges.length > 0) {
    arrChanges.push(...this.atcvChanges);
  }
  */
        return arrChanges;
    }
    _isEmptyObject(obj) {
        // because Object.keys(new Date()).length === 0;
        // we have to do some additional check
        if (obj === null || obj === undefined) {
            return true;
        }
        const result =
            obj && // null and undefined check
            Object.keys(obj).length === 0; // || Object.getPrototypeOf(obj) === Object.prototype);
        return result;
    }
}
// =========================
// FLAGS SUPPORT
// =========================
/**
 * Contains any constants for the application
 */
export class Constants {}
Constants.MODULE_ID = "dfreds-convenient-effects";
Constants.FLAGS = {
    DESCRIPTION: "description",
    IS_CONVENIENT: "isConvenient",
    IS_DYNAMIC: "isDynamic",
    IS_VIEWABLE: "isViewable",
    NESTED_EFFECTS: "nestedEffects",
    SUB_EFFECTS: "subEffects",
};
Constants.COLORS = {
    COLD_FIRE: "#389888",
    FIRE: "#f98026",
    WHITE: "#ffffff",
    MOON_TOUCHED: "#f4f1c9",
};
Constants.SECONDS = {
    IN_ONE_ROUND: CONFIG.time.roundTime || 6,
    IN_ONE_MINUTE: 60,
    IN_TEN_MINUTES: 600,
    IN_ONE_HOUR: 3600,
    IN_SIX_HOURS: 21600,
    IN_EIGHT_HOURS: 28800,
    IN_ONE_DAY: 86400,
    IN_ONE_WEEK: 604800,
};
Constants.SIZES_ORDERED = ["tiny", "sm", "med", "lg", "huge", "grg"];
// ===========================
// UTILITIES
// ===========================
function cleanUpString(stringToCleanUp) {
    // regex expression to match all non-alphanumeric characters in string
    const regex = /[^A-Za-z0-9]/g;
    if (stringToCleanUp) {
        return Logger.i18n(stringToCleanUp).replace(regex, "").toLowerCase();
    } else {
        return stringToCleanUp;
    }
}
function isStringEquals(stringToCheck1, stringToCheck2, startsWith = false) {
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
function is_real_number(inNumber) {
    return !isNaN(inNumber) && typeof inNumber === "number" && isFinite(inNumber);
}
const i18n = (key) => {
    return game.i18n.localize(key)?.trim();
};
