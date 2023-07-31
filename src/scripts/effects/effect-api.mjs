import type { EffectChangeData } from "@league-of-foundry-developers/foundry-vtt-types/src/foundry/common/data/data.mjs/effectChangeData";
import type { PropertiesToSource } from "@league-of-foundry-developers/foundry-vtt-types/src/types/helperTypes";
import type Effect from "./effect.mjs";

export interface ActiveEffectManagerLibApi {
	effectInterface: EffectInterfaceApi;

	get _defaultStatusEffectNames();

	get statusEffectNames(): string[];

	addStatusEffect(name: string): Promise<void>;

	removeStatusEffect(name: string): Promise<void>;

	resetStatusEffects(): Promise<void>;

	isStatusEffect(name: string): Promise<void>;

	// ======================
	// Effect Management
	// ======================

	removeEffectArr(...inAttributes: any[]): Promise<ActiveEffect | undefined>;

	toggleEffectArr(...inAttributes: any[]): Promise<boolean | undefined>;

	addEffectArr(...inAttributes: any[]): Promise<ActiveEffect | undefined>;

	hasEffectAppliedArr(...inAttributes: any[]): Promise<boolean>;

	hasEffectAppliedOnActorArr(...inAttributes: any[]): Promise<boolean>;

	hasEffectAppliedFromIdOnActorArr(...inAttributes: any[]): Promise<boolean>;

	addEffectOnActorArr(...inAttributes: any[]): Promise<ActiveEffect | undefined>;

	removeEffectOnActorArr(...inAttributes: any[]): Promise<ActiveEffect | undefined>;

	removeEffectFromIdOnActorArr(...inAttributes: any[]): Promise<ActiveEffect | undefined>;

	toggleEffectFromIdOnActorArr(...inAttributes: any[]): Promise<boolean | undefined>;

	findEffectByNameOnActorArr(...inAttributes: any[]): Promise<ActiveEffect | undefined>;

	findEffectByIdOnActorArr(...inAttributes: any[]): Promise<ActiveEffect | undefined>;

	hasEffectAppliedOnTokenArr(...inAttributes: any[]): Promise<boolean | undefined>;

	hasEffectAppliedFromIdOnTokenArr(...inAttributes: any[]): Promise<boolean | undefined>;

	addEffectOnTokenArr(...inAttributes: any[]): Promise<ActiveEffect | undefined>;

	removeEffectOnTokenArr(...inAttributes: any[]): Promise<ActiveEffect | undefined>;

	removeEffectFromIdOnTokenArr(...inAttributes: any[]): Promise<ActiveEffect | undefined>;

	removeEffectFromIdOnTokenMultipleArr(...inAttributes: any[]): Promise<ActiveEffect | undefined>;

	toggleEffectFromIdOnTokenArr(...inAttributes: any[]): Promise<boolean | undefined>;

	toggleEffectFromDataOnTokenArr(...inAttributes: any[]): Promise<boolean | undefined>;

	findEffectByNameOnTokenArr(...inAttributes: any[]): Promise<ActiveEffect | undefined>;

	findEffectByIdOnTokenArr(...inAttributes: any[]): Promise<ActiveEffect | undefined>;

	addActiveEffectOnTokenArr(...inAttributes: any[]): Promise<ActiveEffect | undefined>;

	updateEffectFromIdOnTokenArr(...inAttributes: any[]): Promise<boolean | undefined>;

	updateEffectFromNameOnTokenArr(...inAttributes: any[]): Promise<boolean | undefined>;

	updateActiveEffectFromIdOnTokenArr(...inAttributes: any[]): Promise<boolean | undefined>;

	updateActiveEffectFromNameOnTokenArr(...inAttributes: any[]): Promise<boolean | undefined>;

	onManageActiveEffectFromEffectIdArr(...inAttributes: any[]): Promise<Item | ActiveEffect | boolean | undefined>;

	onManageActiveEffectFromEffectArr(...inAttributes: any[]): Promise<Item | ActiveEffect | boolean | undefined>;

	onManageActiveEffectFromActiveEffectArr(...inAttributes: any[]): Promise<Item | ActiveEffect | boolean | undefined>;

	// ======================
	// Effect Actor Management
	// ======================

	addEffectOnActor(actorId: string, effectName: string, effect: Effect): Promise<ActiveEffect | undefined>;

	findEffectByNameOnActor(actorId: string, effectName: string): Promise<ActiveEffect | undefined>;

	findEffectByIdOnActor(actorId: string, effectId: string): Promise<ActiveEffect | undefined>;

	hasEffectAppliedOnActor(
		actorId: string,
		effectName: string,
		includeDisabled: boolean
	): Promise<boolean | undefined>;

	hasEffectAppliedFromIdOnActor(
		actorId: string,
		effectId: string,
		includeDisabled: boolean
	): Promise<boolean | undefined>;

	toggleEffectFromIdOnActor(
		actorId: string,
		effectId: string,
		alwaysDelete?: boolean | undefined,
		forceEnabled?: boolean | undefined,
		forceDisabled?: boolean | undefined,
		overlay?: boolean | undefined
	): Promise<boolean | undefined>;

	addActiveEffectOnActor(actorId: string, activeEffectData: ActiveEffect): Promise<ActiveEffect | undefined>;

	removeEffectOnActor(actorId: string, effectName: string): Promise<ActiveEffect | undefined>;

	removeEffectFromIdOnActor(actorId: string, effectId: string): Promise<ActiveEffect | undefined>;

	// ======================
	// Effect Token Management
	// ======================

	addEffectOnToken(tokenId: string, effectName: string, effect: Effect): Promise<ActiveEffect | undefined>;

	findEffectByNameOnToken(tokenId: string, effectName: string): Promise<ActiveEffect | undefined>;

	findEffectByIdOnToken(tokenId: string, effectId: string): Promise<ActiveEffect | undefined>;

	hasEffectAppliedOnToken(
		tokenId: string,
		effectName: string,
		includeDisabled: boolean
	): Promise<boolean | undefined>;

	hasEffectAppliedFromIdOnToken(
		tokenId: string,
		effectId: string,
		includeDisabled: boolean
	): Promise<boolean | undefined>;

	toggleEffectFromIdOnToken(
		tokenId: string,
		effectId: string,
		alwaysDelete?: boolean | undefined,
		forceEnabled?: boolean | undefined,
		forceDisabled?: boolean | undefined,
		overlay?: boolean | undefined
	): Promise<boolean | undefined>;

	toggleEffectFromDataOnToken(
		tokenId: string,
		effect: Effect,
		alwaysDelete?: boolean | undefined,
		forceEnabled?: boolean | undefined,
		forceDisabled?: boolean | undefined,
		overlay?: boolean | undefined
	): Promise<boolean | undefined>;

	addActiveEffectOnToken(tokenId: string, activeEffectData: ActiveEffect): Promise<ActiveEffect | undefined>;

	removeEffectOnToken(tokenId: string, effectName: string): Promise<ActiveEffect | undefined>;

	removeEffectFromIdOnToken(tokenId: string, effectId: string): Promise<ActiveEffect | undefined>;

	removeEffectFromIdOnTokenMultiple(tokenId: string, effectIds: string[]): Promise<ActiveEffect | undefined>;

	updateEffectFromIdOnToken(
		tokenId: string,
		effectId: string,
		origin: string,
		overlay: boolean,
		effectUpdated: Effect
	): Promise<boolean | undefined>;

	updateEffectFromNameOnToken(
		tokenId: string,
		effectName: string,
		origin: string,
		overlay: boolean,
		effectUpdated: Effect
	): Promise<boolean | undefined>;

	updateActiveEffectFromIdOnToken(
		tokenId: string,
		effectId: string,
		origin: string,
		overlay: boolean,
		effectUpdated: ActiveEffect
	): Promise<boolean | undefined>;

	updateActiveEffectFromNameOnToken(
		tokenId: string,
		effectName: string,
		origin: string,
		overlay: boolean,
		effectUpdated: ActiveEffect
	): Promise<boolean | undefined>;

	// ======================
	// Effect Generic Management
	// ======================

	onManageActiveEffectFromEffectId(
		effectActions:
			| {
					create: "create";
					edit: "edit";
					delete: "delete";
					toggle: "toggle";
					update: "update";
			  }
			| string,
		owner: Actor | Item,
		effectId: string,
		alwaysDelete?: boolean | undefined,
		forceEnabled?: boolean | undefined,
		forceDisabled?: boolean | undefined,
		isTemporary?: boolean | undefined,
		isDisabled?: boolean
	): Promise<Item | ActiveEffect | boolean | undefined>;

	onManageActiveEffectFromEffect(
		effectActions:
			| {
					create: "create";
					edit: "edit";
					delete: "delete";
					toggle: "toggle";
					update: "update";
			  }
			| string,
		owner: Actor | Item,
		effect: Effect,
		alwaysDelete?: boolean | undefined,
		forceEnabled?: boolean | undefined,
		forceDisabled?: boolean | undefined,
		isTemporary?: boolean | undefined,
		isDisabled?: boolean | undefined
	): Promise<Item | ActiveEffect | boolean | undefined>;

	onManageActiveEffectFromActiveEffect(
		effectActions:
			| {
					create: "create";
					edit: "edit";
					delete: "delete";
					toggle: "toggle";
					update: "update";
			  }
			| string,
		owner: Actor | Item,
		activeEffect: ActiveEffect | null | undefined,
		alwaysDelete?: boolean | undefined,
		forceEnabled?: boolean | undefined,
		forceDisabled?: boolean | undefined,
		isTemporary?: boolean | undefined,
		isDisabled?: boolean | undefined
	): Promise<Item | ActiveEffect | boolean | undefined>;

	// ======================
	// SUPPORT 2022-09-11
	// ======================

	buildDefault(
		id: string,
		name: string,
		icon: string,
		isPassive: boolean,
		changes: EffectChangeData[],
		atlChanges: EffectChangeData[],
		tokenMagicChanges: EffectChangeData[],
		atcvChanges: EffectChangeData[]
	): Promise<Effect>;

	isDuplicateEffectChange(aeKey: string, arrChanges: EffectChangeData[]): Promise<boolean>;

	_handleIntegrations(effect: Effect): Promise<EffectChangeData[]>;

	convertActiveEffectToEffect(effect: ActiveEffect): Promise<Effect>;

	convertActiveEffectDataPropertiesToActiveEffect(
		p: PropertiesToSource<any>,
		isPassive: boolean
	): Promise<ActiveEffect>;

	convertToActiveEffectData(effect: Effect): Promise<Record<string, unknown>>;

	convertToActiveEffect(effect: Effect): ActiveEffect;

	retrieveChangesOrderedByPriorityFromAE(effectEntity: ActiveEffect): Promise<EffectChangeData[]>;

	prepareOriginForToken(tokenOrTokenId: Token | string): Promise<string>;

	prepareOriginForActor(actorOrActorId: Actor | string): Promise<string>;

	prepareOriginFromEntity(entity: string | ActiveEffect | Actor | Item | Token): Promise<string>;

	convertToATLEffect(
		//lockRotation: boolean,
		sightEnabled: boolean,
		dimSight: number,
		brightSight: number,
		sightAngle: number,
		sightVisionMode: string, //e.g. 'darkvision'

		dimLight: number,
		brightLight: number,
		lightColor: string,
		lightAlpha: number,
		lightAngle: number,

		lightColoration: number | null,
		lightLuminosity: number | null,
		lightGradual: boolean | null,
		lightSaturation: number | null,
		lightContrast: number | null,
		lightShadows: number | null,

		lightAnimationType: string | null,
		lightAnimationSpeed: number | null,
		lightAnimationIntensity: number | null,
		lightAnimationReverse: boolean | null,

		// applyAsAtlEffect, // rimosso
		effectName: string | null,
		effectIcon: string | null,
		duration: number | null,

		// vision = false,
		// id: string | null,
		// name: string | null,
		height: number | null,
		width: number | null,
		scale: number | null,
		alpha: number | null
	): Promise<Effect>;
}

interface EffectInterfaceApi {
	initialize(moduleName: string): void;

	toggleEffect(
		effectName: string,
		overlay: boolean,
		uuids: string[],
		withSocket?: boolean
	): Promise<boolean | undefined>;

	hasEffectApplied(effectName: string, uuid: string, withSocket?: boolean): boolean;

	removeEffect(effectName: string, uuid: string, withSocket?: boolean): Promise<ActiveEffect | undefined>;

	addEffect(
		effectName: string,
		effectData: Effect,
		uuid: string,
		origin: string,
		overlay: boolean,
		metadata: any,
		withSocket?: boolean
	): Promise<ActiveEffect | undefined>;

	addEffectWith(
		effectData: Effect,
		uuid: string,
		origin: string,
		overlay: boolean,
		metadata: any,
		withSocket?: boolean
	): Promise<ActiveEffect | undefined>;

	// ============================================================
	// Additional feature for retrocompatibility
	// ============================================================

	// ====================================================================
	// ACTOR MANAGEMENT
	// ====================================================================

	hasEffectAppliedOnActor(effectName: string, uuid: string, includeDisabled: boolean, withSocket?: boolean): boolean;

	hasEffectAppliedFromIdOnActor(
		effectId: string,
		uuid: string,
		includeDisabled: boolean,
		withSocket?: boolean
	): boolean;

	removeEffectOnActor(effectName: string, uuid: string, withSocket?: boolean): Promise<ActiveEffect | undefined>;

	removeEffectFromIdOnActor(effectId: string, uuid: string, withSocket?: boolean): Promise<ActiveEffect | undefined>;

	addEffectOnActor(
		effectName: string,
		uuid: string,
		effect: Effect,
		withSocket?: boolean
	): Promise<ActiveEffect | undefined>;

	toggleEffectFromIdOnActor(
		effectId: string,
		uuid: string,
		alwaysDelete?: boolean | undefined,
		forceEnabled?: boolean | undefined,
		forceDisabled?: boolean | undefined,
		overlay?: boolean | undefined,
		withSocket?: boolean
	): Promise<boolean | undefined>;

	addActiveEffectOnActor(
		uuid: string,
		activeEffectData: ActiveEffect,
		withSocket?: boolean
	): Promise<ActiveEffect | undefined>;

	findEffectByNameOnActor(effectName: string, uuid: string, withSocket?: boolean): Promise<ActiveEffect | undefined>;

	findEffectByIdOnActor(effectId: string, uuid: string, withSocket?: boolean): Promise<ActiveEffect | undefined>;

	// ====================================================================
	// TOKEN MANAGEMENT
	// ====================================================================

	hasEffectAppliedOnToken(effectName: string, uuid: string, includeDisabled: boolean, withSocket?: boolean): boolean;

	hasEffectAppliedFromIdOnToken(
		effectId: string,
		uuid: string,
		includeDisabled: boolean,
		withSocket?: boolean
	): boolean;

	removeEffectOnToken(effectName: string, uuid: string, withSocket?: boolean): Promise<ActiveEffect | undefined>;

	removeEffectFromIdOnToken(effectId: string, uuid: string, withSocket?: boolean): Promise<ActiveEffect | undefined>;

	removeEffectFromIdOnTokenMultiple(
		effectIds: string[],
		uuid: string,
		withSocket?: boolean
	): Promise<ActiveEffect | undefined>;

	addEffectOnToken(
		effectName: string,
		uuid: string,
		effect: Effect,
		withSocket?: boolean
	): Promise<ActiveEffect | undefined>;

	toggleEffectFromIdOnToken(
		effectId: string,
		uuid: string,
		alwaysDelete?: boolean | undefined,
		forceEnabled?: boolean | undefined,
		forceDisabled?: boolean | undefined,
		overlay?: boolean | undefined,
		withSocket?: boolean
	): Promise<boolean | undefined>;

	toggleEffectFromDataOnToken(
		effect: Effect,
		uuid: string,
		alwaysDelete?: boolean | undefined,
		forceEnabled?: boolean | undefined,
		forceDisabled?: boolean | undefined,
		overlay?: boolean | undefined,
		withSocket?: boolean
	): Promise<boolean | undefined>;

	addActiveEffectOnToken(
		uuid: string,
		activeEffectData: ActiveEffect,
		withSocket?: boolean
	): Promise<ActiveEffect | undefined>;

	findEffectByNameOnToken(effectName: string, uuid: string, withSocket?: boolean): Promise<ActiveEffect | undefined>;

	findEffectByIdOnToken(effectId: string, uuid: string, withSocket?: boolean): Promise<ActiveEffect | undefined>;

	updateEffectFromIdOnToken(
		effectId: string,
		uuid: string,
		origin: string,
		overlay: boolean,
		effectUpdated: Effect,
		withSocket?: boolean
	): Promise<boolean | undefined>;

	updateEffectFromNameOnToken(
		effectName: string,
		uuid: string,
		origin: string,
		overlay: boolean,
		effectUpdated: Effect,
		withSocket?: boolean
	): Promise<boolean | undefined>;

	updateActiveEffectFromIdOnToken(
		effectId: string,
		uuid: string,
		origin: string,
		overlay: boolean,
		effectUpdated: ActiveEffect,
		withSocket?: boolean
	): Promise<boolean | undefined>;

	updateActiveEffectFromNameOnToken(
		effectName: string,
		uuid: string,
		origin: string,
		overlay: boolean,
		effectUpdated: ActiveEffect,
		withSocket?: boolean
	): Promise<boolean | undefined>;

	// ==================================================================

	onManageActiveEffectFromEffectId(
		effectActions:
			| {
					create: "create";
					edit: "edit";
					delete: "delete";
					toggle: "toggle";
					update: "update";
			  }
			| string,
		owner: Actor | Item,
		effectId: string,
		alwaysDelete?: boolean | undefined,
		forceEnabled?: boolean | undefined,
		forceDisabled?: boolean | undefined,
		isTemporary?: boolean | undefined,
		isDisabled?: boolean | undefined,
		withSocket?: boolean | undefined
	): Promise<Item | ActiveEffect | boolean | undefined>;

	onManageActiveEffectFromEffect(
		effectActions:
			| {
					create: "create";
					edit: "edit";
					delete: "delete";
					toggle: "toggle";
					update: "update";
			  }
			| string,
		owner: Actor | Item,
		effect: Effect,
		alwaysDelete?: boolean | undefined,
		forceEnabled?: boolean | undefined,
		forceDisabled?: boolean | undefined,
		isTemporary?: boolean | undefined,
		isDisabled?: boolean | undefined,
		withSocket?: boolean | undefined
	): Promise<Item | ActiveEffect | boolean | undefined>;

	onManageActiveEffectFromActiveEffect(
		effectActions:
			| {
					create: "create";
					edit: "edit";
					delete: "delete";
					toggle: "toggle";
					update: "update";
			  }
			| string,
		owner: Actor | Item,
		activeEffect: ActiveEffect | null | undefined,
		alwaysDelete?: boolean | undefined,
		forceEnabled?: boolean | undefined,
		forceDisabled?: boolean | undefined,
		isTemporary?: boolean | undefined,
		isDisabled?: boolean | undefined,
		withSocket?: boolean | undefined
	): Promise<Item | ActiveEffect | boolean | undefined>;
}
