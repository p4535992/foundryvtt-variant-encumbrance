import Effect from "./effect.mjs";

export class ActiveEffectManagerLibApi {
	effectInterface;

	_defaultStatusEffectNames;

	statusEffectNames;

	async addStatusEffect(name);

	async removeStatusEffect(name);

	async resetStatusEffects();

	async isStatusEffect(name);

	// ======================
	// Effect Management
	// ======================

	async removeEffectArr(...inAttributes);

	async toggleEffectArr(...inAttributes);

	async addEffectArr(...inAttributes);

	async hasEffectAppliedArr(...inAttributes);

	async hasEffectAppliedOnActorArr(...inAttributes);

	async hasEffectAppliedFromIdOnActorArr(...inAttributes);

	async addEffectOnActorArr(...inAttributes);

	async removeEffectOnActorArr(...inAttributes);

	async removeEffectFromIdOnActorArr(...inAttributes);

	async toggleEffectFromIdOnActorArr(...inAttributes);

	async findEffectByNameOnActorArr(...inAttributes);

	async findEffectByIdOnActorArr(...inAttributes);

	async hasEffectAppliedOnTokenArr(...inAttributes);

	async hasEffectAppliedFromIdOnTokenArr(...inAttributes);

	async addEffectOnTokenArr(...inAttributes);

	async removeEffectOnTokenArr(...inAttributes);

	async removeEffectFromIdOnTokenArr(...inAttributes);

	async removeEffectFromIdOnTokenMultipleArr(...inAttributes);

	async toggleEffectFromIdOnTokenArr(...inAttributes);

	async toggleEffectFromDataOnTokenArr(...inAttributes);

	async findEffectByNameOnTokenArr(...inAttributes);

	async findEffectByIdOnTokenArr(...inAttributes);

	async addActiveEffectOnTokenArr(...inAttributes);

	async updateEffectFromIdOnTokenArr(...inAttributes);

	async updateEffectFromNameOnTokenArr(...inAttributes);

	async updateActiveEffectFromIdOnTokenArr(...inAttributes);

	async updateActiveEffectFromNameOnTokenArr(...inAttributes);

	async onManageActiveEffectFromEffectIdArr(...inAttributes);

	async onManageActiveEffectFromEffectArr(...inAttributes);

	async onManageActiveEffectFromActiveEffectArr(...inAttributes);

	// ======================
	// Effect Actor Management
	// ======================

	async addEffectOnActor(actorId, effectName, effect);

	async findEffectByNameOnActor(actorId, effectName);

	async findEffectByIdOnActor(actorId, effectId);

	async hasEffectAppliedOnActor(
		actorId,
		effectName,
		includeDisabled
	);

	async hasEffectAppliedFromIdOnActor(
		actorId,
		effectId,
		includeDisabled
	);

	async toggleEffectFromIdOnActor(
		actorId,
		effectId,
		alwaysDelete = false,
		forceEnabled = false,
		forceDisabled = false,
		overlay = false
	);

	async addActiveEffectOnActor(actorId, activeEffectData);

	async removeEffectOnActor(actorId, effectName);

	async removeEffectFromIdOnActor(actorId, effectId);

	// ======================
	// Effect Token Management
	// ======================

	async addEffectOnToken(tokenId, effectName, effect);

	async findEffectByNameOnToken(tokenId, effectName);

	async findEffectByIdOnToken(tokenId, effectId);

	async hasEffectAppliedOnToken(
		tokenId,
		effectName,
		includeDisabled
	);

	async hasEffectAppliedFromIdOnToken(
		tokenId,
		effectId,
		includeDisabled
	);

	async toggleEffectFromIdOnToken(
		tokenId,
		effectId,
		alwaysDelete = false,
		forceEnabled = false,
		forceDisabled = false,
		overlay = false
	);

	async toggleEffectFromDataOnToken(
		tokenId,
		effect,
		alwaysDelete = false,
		forceEnabled = false,
		forceDisabled = false,
		overlay = false
	);

	async addActiveEffectOnToken(tokenId, activeEffectData);

	async removeEffectOnToken(tokenId, effectName);

	async removeEffectFromIdOnToken(tokenId, effectId);

	async removeEffectFromIdOnTokenMultiple(tokenId, effectIds);

	async updateEffectFromIdOnToken(
		tokenId,
		effectId,
		origin,
		overlay,
		effectUpdated
	);

	async updateEffectFromNameOnToken(
		tokenId,
		effectName,
		origin,
		overlay,
		effectUpdated
	);

	async updateActiveEffectFromIdOnToken(
		tokenId,
		effectId,
		origin,
		overlay,
		effectUpdated
	);

	async updateActiveEffectFromNameOnToken(
		tokenId,
		effectName,
		origin,
		overlay,
		effectUpdated
	);

	// ======================
	// Effect Generic Management
	// ======================

	async onManageActiveEffectFromEffectId(
		effectActions,
		owner,
		effectId,
		alwaysDelete = false,
		forceEnabled = false,
		forceDisabled = false,
		isTemporary = false,
		isDisabled = false
	);

	async onManageActiveEffectFromEffect(
		effectActions,
		owner,
		effect,
		alwaysDelete = false,
		forceEnabled = false,
		forceDisabled = false,
		isTemporary = false,
		isDisabled = false
	);

	async onManageActiveEffectFromActiveEffect(
		effectActions,
		owner,
		activeEffect,
		alwaysDelete = false,
		forceEnabled = false,
		forceDisabled = false,
		isTemporary = false,
		isDisabled = false
	);

	// ======================
	// SUPPORT 2022-09-11
	// ======================

	async buildDefault(
		id,
		name,
		icon,
		isPassive,
		changes,
		atlChanges,
		tokenMagicChanges,
		atcvChanges
	);

	async isDuplicateEffectChange(aeKey, arrChanges);

	async _handleIntegrations(effect);

	async convertActiveEffectToEffect(effect);

	async convertActiveEffectDataPropertiesToActiveEffect(
		p,
		isPassive
	);

	async convertToActiveEffectData(effect);

	async convertToActiveEffect(effect);

	async retrieveChangesOrderedByPriorityFromAE(effectEntity);

	async prepareOriginForToken(tokenOrTokenId);

	async prepareOriginForActor(actorOrActorId);

	async prepareOriginFromEntity(entity);

	async convertToATLEffect(
		//lockRotation,
		sightEnabled,
		dimSight,
		brightSight,
		sightAngle,
		sightVisionMode, //e.g. 'darkvision'

		dimLight,
		brightLight,
		lightColor,
		lightAlpha,
		lightAngle,

		lightColoration,
		lightLuminosity,
		lightGradual,
		lightSaturation,
		lightContrast,
		lightShadows,

		lightAnimationType,
		lightAnimationSpeed,
		lightAnimationIntensity,
		lightAnimationReverse,

		// applyAsAtlEffect, // rimosso
		effectName,
		effectIcon,
		duration,

		// vision = false,
		// id,
		// name,
		height,
		width,
		scale,
		alpha
	);
}

export class EffectInterfaceApi {
	async initialize(moduleName);

	async toggleEffect(
		effectName,
		overlay,
		uuids,
		withSocket = false
	);

	async hasEffectApplied(effectName, uuid, withSocket = false);

	async removeEffect(effectName, uuid, withSocket = false);

	async addEffect(
		effectName,
		effectData,
		uuid,
		origin,
		overlay,
		metadata,
		withSocket = false
	);

	async addEffectWith(
		effectData,
		uuid,
		origin,
		overlay,
		metadata,
		withSocket = false
	);

	// ============================================================
	// Additional feature for retrocompatibility
	// ============================================================

	// ====================================================================
	// ACTOR MANAGEMENT
	// ====================================================================

	async hasEffectAppliedOnActor(effectName, uuid, includeDisabled, withSocket = false);

	async hasEffectAppliedFromIdOnActor(
		effectId,
		uuid,
		includeDisabled,
		withSocket = false
	);

	async removeEffectOnActor(effectName, uuid, withSocket = false);

	async removeEffectFromIdOnActor(effectId, uuid, withSocket = false);

	async addEffectOnActor(
		effectName,
		uuid,
		effect,
		withSocket = false
	);

	async toggleEffectFromIdOnActor(
		effectId,
		uuid,
		alwaysDelete = false,
		forceEnabled = false,
		forceDisabled = false,
		overlay = false,
		withSocket = false
	);

	async addActiveEffectOnActor(
		uuid,
		activeEffectData,
		withSocket = false
	);

	async findEffectByNameOnActor(effectName, uuid, withSocket = false);

	async findEffectByIdOnActor(effectId, uuid, withSocket = false);

	// ====================================================================
	// TOKEN MANAGEMENT
	// ====================================================================

	async hasEffectAppliedOnToken(effectName, uuid, includeDisabled, withSocket = false);

	async hasEffectAppliedFromIdOnToken(
		effectId,
		uuid,
		includeDisabled,
		withSocket = false
	);

	async removeEffectOnToken(effectName, uuid, withSocket = false);

	async removeEffectFromIdOnToken(effectId, uuid, withSocket = false);

	async removeEffectFromIdOnTokenMultiple(
		effectIds,
		uuid,
		withSocket = false
	);

	async addEffectOnToken(
		effectName,
		uuid,
		effect,
		withSocket = false
	);

	async toggleEffectFromIdOnToken(
		effectId,
		uuid,
		alwaysDelete = false,
		forceEnabled = false,
		forceDisabled = false,
		overlay = false,
		withSocket = false
	);

	async toggleEffectFromDataOnToken(
		effect,
		uuid,
		alwaysDelete = false,
		forceEnabled = false,
		forceDisabled = false,
		overlay = false,
		withSocket = false
	);

	async addActiveEffectOnToken(
		uuid,
		activeEffectData,
		withSocket = false
	);

	async findEffectByNameOnToken(effectName, uuid, withSocket = false);

	async findEffectByIdOnToken(effectId, uuid, withSocket = false);

	async updateEffectFromIdOnToken(
		effectId,
		uuid,
		origin,
		overlay,
		effectUpdated,
		withSocket = false
	);

	async updateEffectFromNameOnToken(
		effectName,
		uuid,
		origin,
		overlay,
		effectUpdated,
		withSocket = false
	);

	async updateActiveEffectFromIdOnToken(
		effectId,
		uuid,
		origin,
		overlay,
		effectUpdated,
		withSocket = false
	);

	async updateActiveEffectFromNameOnToken(
		effectName,
		uuid,
		origin,
		overlay,
		effectUpdated,
		withSocket = false
	);

	// ==================================================================

	async onManageActiveEffectFromEffectId(
		effectActions,
		owner,
		effectId,
		alwaysDelete = false,
		forceEnabled = false,
		forceDisabled = false,
		isTemporary = false,
		isDisabled = false,
		withSocket = false
	);

	async onManageActiveEffectFromEffect(
		effectActions,
		owner,
		effect,
		alwaysDelete = false,
		forceEnabled = false,
		forceDisabled = false,
		isTemporary = false,
		isDisabled = false,
		withSocket = false
	);

	async onManageActiveEffectFromActiveEffect(
		effectActions,
		owner,
		activeEffect,
		alwaysDelete = false,
		forceEnabled = false,
		forceDisabled = false,
		isTemporary = false,
		isDisabled = false,
		withSocket = false
	);
}
