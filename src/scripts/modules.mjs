import { isEnabledActorType, VariantEncumbranceImpl } from "./VariantEncumbranceImpl.mjs";
import {
  EncumbranceData,
  EncumbranceMode,
  EncumbranceFlags,
  ENCUMBRANCE_TIERS,
  BULK_CATEGORIES,
  BULK_CATEGORY,
  BulkData,
  SUPPORTED_SHEET,
  EncumbranceBulkData,
} from "./VariantEncumbranceModels.mjs";
import {
  checkBulkCategory,
  convertPoundsToKg,
  debug,
  getBulkLabel,
  getItemBulk,
  getItemQuantity,
  getItemWeight,
  getWeightLabel,
  hasProperty2,
  i18n,
  i18nFormat,
  isRealNumber,
  warn,
} from "./lib/lib.mjs";
import CONSTANTS from "./constants.mjs";
import { registerSocket } from "./socket.mjs";
import API from "./api.mjs";
import { calcBulkItemCollection, VariantEncumbranceBulkImpl } from "./VariantEncumbranceBulkImpl.mjs";
import { VariantEncumbranceDnd5eHelpers } from "./lib/variant-encumbrance-dnd5e-helpers";

export let ENCUMBRANCE_STATE = {
  UNENCUMBERED: "", // "Unencumbered",
  ENCUMBERED: "", // "Encumbered",
  HEAVILY_ENCUMBERED: "", // "Heavily Encumbered",
  OVERBURDENED: "", // "Overburdened"
};

export let invPlusActive = false;
export let itemContainerActive = false;
export let dfredsConvenientEffectsActive = false;
export let invMidiQol = false;
export let dfQualityLifeActive = false;
export let daeActive = false;
export let backPackManagerActive = false;

export const initHooks = () => {
  // warn("Init Hooks processing");

  Hooks.once("socketlib.ready", registerSocket);

  // if (game.settings.get(CONSTANTS.MODULE_ID, 'debugHooks')) {
  //   for (const hook of Object.values(HOOKS)) {
  //     if (typeof hook === 'string') {
  //       Hooks.on(hook, (...args) => debug(`Hook called: ${hook}`, ...args));
  //       debug(`Registered hook: ${hook}`);
  //     } else {
  //       for (const innerHook of Object.values(hook)) {
  //         Hooks.on(innerHook, (...args) => debug(`Hook called: ${innerHook}`, ...args));
  //         debug(`Registered hook: ${innerHook}`);
  //       }
  //     }
  //   }
  // }

  // CONFIG.DND5E.encumbrance = {
  //   currencyPerWeight: {
  //     imperial: 50,
  //     metric: 110
  //   },
  //   strMultiplier: {
  //     imperial: 15,
  //     metric: 6.8
  //   },
  //   vehicleWeightMultiplier: {
  //     imperial: 2000, // 2000 lbs in an imperial ton
  //     metric: 1000 // 1000 kg in a metric ton
  //   }
  // };

  CONFIG.DND5E.encumbrance.strMultiplier.imperial = game.settings.get(CONSTANTS.MODULE_ID, "strengthMultiplier") ?? 15;

  if (game.settings.get(CONSTANTS.MODULE_ID, "fakeMetricSystem")) {
    CONFIG.DND5E.encumbrance.strMultiplier.metric = game.settings.get(CONSTANTS.MODULE_ID, "strengthMultiplier") ?? 15;
  } else {
    CONFIG.DND5E.encumbrance.strMultiplier.metric =
      game.settings.get(CONSTANTS.MODULE_ID, "strengthMultiplierMetric") ?? 6.8;
  }

  CONFIG.DND5E.encumbrance.currencyPerWeight.imperial = game.settings.get(CONSTANTS.MODULE_ID, "currencyWeight") ?? 50;

  if (game.settings.get(CONSTANTS.MODULE_ID, "fakeMetricSystem")) {
    CONFIG.DND5E.encumbrance.currencyPerWeight.metric = game.settings.get(CONSTANTS.MODULE_ID, "currencyWeight") ?? 50;
  } else {
    CONFIG.DND5E.encumbrance.currencyPerWeight.metric =
      game.settings.get(CONSTANTS.MODULE_ID, "currencyWeightMetric") ?? 110;
  }

  CONFIG.DND5E.encumbrance.vehicleWeightMultiplier.imperial =
    game.settings.get(CONSTANTS.MODULE_ID, "vehicleWeightMultiplier") ?? 2000; // 2000 lbs in an imperial ton

  if (game.settings.get(CONSTANTS.MODULE_ID, "fakeMetricSystem")) {
    CONFIG.DND5E.encumbrance.vehicleWeightMultiplier.metric =
      game.settings.get(CONSTANTS.MODULE_ID, "vehicleWeightMultiplier") ?? 2000; // 2000 lbs in an imperial ton
  } else {
    CONFIG.DND5E.encumbrance.vehicleWeightMultiplier.metric =
      game.settings.get(CONSTANTS.MODULE_ID, "vehicleWeightMultiplierMetric") ?? 1000; // 1000 kg in a metric ton
  }
  // CONFIG.debug.hooks = true; // For debugging only

  invPlusActive = game.modules.get(CONSTANTS.INVENTORY_PLUS_MODULE_ID)?.active;
  invMidiQol = game.modules.get(CONSTANTS.MIDI_QOL_MODULE_ID)?.active;
  itemContainerActive = game.modules.get(CONSTANTS.ITEM_COLLECTION_MODULE_ID)?.active;
  dfredsConvenientEffectsActive = game.modules.get(CONSTANTS.DFREDS_CONVENIENT_EFFECTS_MODULE_ID)?.active;
  dfQualityLifeActive = game.modules.get(CONSTANTS.DF_QUALITY_OF_LIFE_MODULE_ID)?.active;
  daeActive = game.modules.get(CONSTANTS.DAE_MODULE_ID)?.active;
  backPackManagerActive = game.modules.get(CONSTANTS.BACKPACK_MANAGER_MODULE_ID)?.active;
};

export const setupHooks = async () => {
  game.modules.get(CONSTANTS.MODULE_ID).api = API;

  // module specific

  //
  // libWrapper.register(
  //   CONSTANTS.MODULE_ID,
  //   'CONFIG.Item.documentClass.prototype.getEmbeddedDocument',
  //   getEmbeddedDocument,
  //   'MIXED',
  // );

  // START RMOEVED 2022-02-01
  //
  // libWrapper.register(
  //   CONSTANTS.MODULE_ID,
  //   'CONFIG.Item.documentClass.prototype.createEmbeddedDocuments',
  //   createEmbeddedDocuments,
  //   'MIXED',
  // );
  //
  // libWrapper.register(
  //   CONSTANTS.MODULE_ID,
  //   'CONFIG.Item.documentClass.prototype.deleteEmbeddedDocuments',
  //   deleteEmbeddedDocuments,
  //   'MIXED',
  // );
  //
  // libWrapper.register(
  //   CONSTANTS.MODULE_ID,
  //   'CONFIG.Item.documentClass.prototype.updateEmbeddedDocuments',
  //   updateEmbeddedDocuments,
  //   'MIXED',
  // );
  // END RMOEVED 2022-02-01

  // libWrapper.register(CONSTANTS.MODULE_ID, "CONFIG.Item.documentClass.prototype.prepareEmbeddedEntities", prepareEmbeddedEntities, "WRAPPER");

  // libWrapper.register(CONSTANTS.MODULE_ID, "CONFIG.Item.documentClass.prototype.getEmbeddedCollection", getEmbeddedCollection, "MIXED")
  // libWrapper.register(CONSTANTS.MODULE_ID, "CONFIG.Item.documentClass.prototype.prepareDerivedData", prepareDerivedData, "WRAPPER");

  // libWrapper.register(CONSTANTS.MODULE_ID, "CONFIG.Item.documentClass.prototype.actor", getActor, "OVERRIDE")

  // libWrapper.register(CONSTANTS.MODULE_ID, "CONFIG.Item.documentClass.prototype.update", _update, "MIXED")

  // libWrapper.register(CONSTANTS.MODULE_ID, "CONFIG.Item.documentClass.prototype.delete", _delete, "MIXED")

  // libWrapper.register(MODULE_ID, "CONFIG.Item.documentClass.prototype.isEmbedded", isEmbedded, "OVERRIDE")

  // libWrapper.register(CONSTANTS.MODULE_ID, "CONFIG.Item.documentClass._onCreateDocuments", _onCreateDocuments, "MIXED")

  libWrapper.register(CONSTANTS.MODULE_ID, "CONFIG.Item.documentClass.createDocuments", createDocuments, "MIXED");

  libWrapper.register(CONSTANTS.MODULE_ID, "CONFIG.Item.documentClass.deleteDocuments", deleteDocuments, "MIXED");

  libWrapper.register(CONSTANTS.MODULE_ID, "CONFIG.Item.documentClass.updateDocuments", updateDocuments, "MIXED");
};

export const readyHooks = async () => {
  // effectInterface.initialize();

  Hooks.on("renderItemSheet", (app, html, data) => {
    if (!app.object) {
      return;
    }
    const item = app.object;
    module.renderItemSheetVEWeightSystem(app, html, data.system, item);
    // ===================
    // Bulk management
    // ===================
    if (game.settings.get(CONSTANTS.MODULE_ID, "enableBulkSystem")) {
      module.renderItemSheetBulkSystem(app, html, data.system, item);
    }
    // =====================
    // End bulk management
    // =====================
  });

  ENCUMBRANCE_STATE = {
    UNENCUMBERED: i18n(CONSTANTS.MODULE_ID + ".effect.name.unencumbered"), // "Unencumbered",
    ENCUMBERED: i18n(CONSTANTS.MODULE_ID + ".effect.name.encumbered"), // "Encumbered",
    HEAVILY_ENCUMBERED: i18n(CONSTANTS.MODULE_ID + ".effect.name.heavily_encumbered"), // "Heavily Encumbered",
    OVERBURDENED: i18n(CONSTANTS.MODULE_ID + ".effect.name.overburdened"), // "Overburdened"
  };

  Hooks.on("renderActorSheet", async function (actorSheet, htmlElement, actorObject) {
    // Can't necessarily go straight to the supplied object, as it may not have the proper type if the actor is an unlinked Token actor
    const actorEntityTmp = actorObject && actorObject.type ? actorObject : actorObject.actor;
    if (isEnabledActorType(actorEntityTmp)) {
      const htmlElementEncumbranceVariant = htmlElement.find(".encumbrance").addClass("encumbrance-variant");

      let sheetClass = actorSheet.object.flags?.core?.sheetClass ?? "";
      if (!sheetClass) {
        for (const obj of SUPPORTED_SHEET) {
          if (game.modules.get(obj.moduleId)?.active && actorSheet.template.includes(obj.templateId)) {
            sheetClass = obj.name;
          }
          if (sheetClass) {
            break;
          }
        }
      }

      // ======================================================
      // CUSTOMIZE INVENTORY
      // ======================================================
      const hideStandardWeightUnits = game.settings.get(CONSTANTS.MODULE_ID, "hideStandardWeightUnits");
      const replaceStandardWeightValue = game.settings.get(CONSTANTS.MODULE_ID, "replaceStandardWeightValue");
      const isBulkEnable = game.settings.get(CONSTANTS.MODULE_ID, "enableBulkSystem");

      const listHeaders = htmlElement.find("li.items-header .item-weight");
      for (const liHeaderB of listHeaders) {
        const liHeader = $(liHeaderB);
        if (isBulkEnable) {
          if (hideStandardWeightUnits) {
            liHeader.text(`${getBulkLabel()}`);
          } else {
            liHeader.append(`<br/>${getBulkLabel()}`);
          }
        } else {
        }
      }

      const inventoryItems = [];
      const physicalItems = ["weapon", "equipment", "consumable", "tool", "backpack", "loot"];
      actorEntityTmp.items.contents.forEach((im) => {
        if (im && physicalItems.includes(im.type)) {
          inventoryItems.push(im);
        }
      });
      const encumbranceData = VariantEncumbranceImpl.calculateEncumbrance(
        actorEntityTmp,
        inventoryItems,
        false,
        invPlusActive
      );
      const encumbranceDataBulk = VariantEncumbranceBulkImpl.calculateEncumbrance(
        actorEntityTmp,
        inventoryItems,
        false,
        invPlusActive
      );
      const listItem = htmlElement.find("li.item .item-weight");
      for (const liItemB of listItem) {
        const liItem = $(liItemB);
        const itemId = liItem.parent().attr("data-item-id");
        const itemName = liItem.parent().find(".item-name h4").html().replace(/\n/g, "").trim();
        const item = inventoryItems.find((im) => {
          return im.id === itemId || im.name === itemName;
        });
        if (item) {
          const quantity = getItemQuantity(item);
          const currentText = (liItem.parent().find(".item-detail.item-weight")[0]?.innerText ?? "")
            .replace(/(\r\n|\n|\r)/gm, "")
            .trim();
          const currentTextB = currentText ? true : false;

          switch (sheetClass) {
            case "dnd5e.Tidy5eSheet": {
              if (replaceStandardWeightValue) {
                if (currentTextB) {
                  const weight =
                    encumbranceData.mapItemEncumbrance[item.id]?.toNearest(0.1) ??
                    (quantity * getItemWeight(item)).toNearest(0.1) ??
                    0;
                  const totalWeightS = `${weight} ${getWeightLabel()}`;
                  liItem.parent().find(".item-detail.item-weight").text(totalWeightS);
                }
              }
              if (isBulkEnable) {
                const bulk =
                  encumbranceDataBulk.mapItemEncumbrance[item.id]?.toNearest(0.1) ??
                  (quantity * getItemBulk(item)).toNearest(0.1) ??
                  0;
                const totalBulkS = `${bulk} ${getBulkLabel()}`;
                if (hideStandardWeightUnits) {
                  if (currentTextB) {
                    liItem.parent().find(".item-detail.item-weight").text(totalBulkS);
                  }
                } else {
                  if (currentTextB) {
                    liItem.parent().find(".item-detail.item-weight").append(`<br/>${totalBulkS}`);
                  }
                }
              }
              break;
            }
            default: {
              if (replaceStandardWeightValue) {
                if (currentTextB) {
                  const weight =
                    encumbranceData.mapItemEncumbrance[item.id]?.toNearest(0.1) ??
                    (quantity * getItemWeight(item)).toNearest(0.1) ??
                    0;
                  const totalWeightS = `${weight} ${getWeightLabel()}`;
                  liItem.parent().find(".item-detail.item-weight div").text(totalWeightS);
                }
              }
              if (isBulkEnable) {
                const bulk =
                  encumbranceDataBulk.mapItemEncumbrance[item.id]?.toNearest(0.1) ??
                  (quantity * getItemBulk(item)).toNearest(0.1) ??
                  0;
                const totalBulkS = `${bulk} ${getBulkLabel()}`;
                if (hideStandardWeightUnits) {
                  if (currentTextB) {
                    liItem.parent().find(".item-detail.item-weight div").text(totalBulkS);
                  }
                } else {
                  if (currentTextB) {
                    liItem.parent().find(".item-detail.item-weight div").append(`<br/>${totalBulkS}`);
                  }
                }
              }
              break;
            }
          }
        }
      }

      await module.renderActorSheetBulkSystem(
        actorSheet,
        htmlElement,
        actorObject,
        actorEntityTmp,
        htmlElementEncumbranceVariant,
        sheetClass
      );

      await module.renderActorSheetVariant(
        actorSheet,
        htmlElement,
        actorObject,
        actorEntityTmp,
        htmlElementEncumbranceVariant,
        sheetClass
      );

      if (game.settings.get(CONSTANTS.MODULE_ID, "hideStandardEncumbranceBar")) {
        const element = htmlElement.find(".encumbrance-variant");
        if (element && element.length > 0) {
          element[0].style.display = "none";
        }
      }
    }
  });

  Hooks.on("updateActor", async (actorEntity, update) => {
    if (!actorEntity) {
      return;
    }

    const { doTheUpdate, noActiveEffect } = VariantEncumbranceDnd5eHelpers.isAEncumbranceUpdated(actorEntity, update);

    // Do the update
    if (doTheUpdate) {
      if (noActiveEffect) {
        if (game.settings.get(CONSTANTS.MODULE_ID, "enabled")) {
          VariantEncumbranceImpl.calculateEncumbrance(actorEntity, actorEntity.items.contents, false, invPlusActive);
        }
        if (game.settings.get(CONSTANTS.MODULE_ID, "enableBulkSystem")) {
          VariantEncumbranceBulkImpl.calculateEncumbrance(
            actorEntity,
            actorEntity.items.contents,
            false,
            invPlusActive
          );
        }
      } else {
        if (game.settings.get(CONSTANTS.MODULE_ID, "enabled")) {
          await VariantEncumbranceImpl.updateEncumbrance(
            actorEntity,
            undefined,
            actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.ENABLED_AE),
            EncumbranceMode.ADD
          );
        }
        if (game.settings.get(CONSTANTS.MODULE_ID, "enableBulkSystem")) {
          await VariantEncumbranceBulkImpl.updateEncumbrance(
            actorEntity,
            undefined,
            actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.ENABLED_AE_BULK),
            EncumbranceMode.ADD
          );
        }
      }
    }
  });

  Hooks.on("getActorSheetHeaderButtons", async (app, buttons) => {
    const actorSheet = app.object.sheet;
    const actorEntity = actorSheet.actor;

    if (!actorEntity) {
      return;
    }

    const enableVarianEncumbranceOnSpecificActor = game.settings.get(
      CONSTANTS.MODULE_ID,
      "enableVarianEncumbranceOnSpecificActor"
    );
    const removeLabelButtonsSheetHeader = game.settings.get(CONSTANTS.MODULE_ID, "removeLabelButtonsSheetHeader");

    if (isEnabledActorType(actorEntity)) {
      if (enableVarianEncumbranceOnSpecificActor) {
        // ================
        // Encumbrance system
        // ================
        if (game.settings.get(CONSTANTS.MODULE_ID, "enabled")) {
          let enableVarianEncumbranceEffectsOnSpecificActorFlag = true;
          if (!hasProperty(actorEntity, `flags.${CONSTANTS.MODULE_ID}.${EncumbranceFlags.ENABLED_AE}`)) {
            await actorEntity.setFlag(
              CONSTANTS.MODULE_ID,
              EncumbranceFlags.ENABLED_AE,
              enableVarianEncumbranceEffectsOnSpecificActorFlag
            );
          } else {
            enableVarianEncumbranceEffectsOnSpecificActorFlag = actorEntity.getFlag(
              CONSTANTS.MODULE_ID,
              EncumbranceFlags.ENABLED_AE
            );
          }

          let enableVarianEncumbranceWeightOnSpecificActorFlag = true;
          if (!hasProperty(actorEntity, `flags.${CONSTANTS.MODULE_ID}.${EncumbranceFlags.ENABLED_WE}`)) {
            await actorEntity.setFlag(
              CONSTANTS.MODULE_ID,
              EncumbranceFlags.ENABLED_WE,
              enableVarianEncumbranceWeightOnSpecificActorFlag
            );
          } else {
            enableVarianEncumbranceWeightOnSpecificActorFlag = actorEntity.getFlag(
              CONSTANTS.MODULE_ID,
              EncumbranceFlags.ENABLED_WE
            );
          }

          if (game.user?.isGM) {
            let mylabel = i18n("variant-encumbrance-dnd5e.label.enableVEAndWEOnSpecificActor");
            let myicon = "fas fa-weight-hanging";
            let index = 0;

            if (enableVarianEncumbranceEffectsOnSpecificActorFlag && enableVarianEncumbranceWeightOnSpecificActorFlag) {
              mylabel = i18n("variant-encumbrance-dnd5e.label.enableVEAndWEOnSpecificActor");
              myicon = "fas fa-weight-hanging";
              index = 0;
            } else if (
              !enableVarianEncumbranceEffectsOnSpecificActorFlag &&
              enableVarianEncumbranceWeightOnSpecificActorFlag
            ) {
              mylabel = i18n("variant-encumbrance-dnd5e.label.enableWEOnSpecificActor");
              myicon = "fas fa-balance-scale-right";
              index = 1;
            } else if (
              !enableVarianEncumbranceEffectsOnSpecificActorFlag &&
              !enableVarianEncumbranceWeightOnSpecificActorFlag
            ) {
              mylabel = i18n("variant-encumbrance-dnd5e.label.disableVEAndWEOnSpecificActor");
              myicon = "fas fa-feather";
              index = 2;
            } else if (
              enableVarianEncumbranceEffectsOnSpecificActorFlag &&
              !enableVarianEncumbranceWeightOnSpecificActorFlag
            ) {
              // THIS USE CASE CAN'T BE HAPPENED WE REST TO THE STANDARD
              mylabel = i18n("variant-encumbrance-dnd5e.label.enableVEAndWEOnSpecificActor");
              myicon = "fas fa-weight-hanging";
              index = 3;
            } else {
              throw new Error("Something is wrong");
            }

            // varianEncumbranceButtons.push({
            buttons.unshift({
              icon: myicon,
              class: "enable-disable-variant-encumbrance",
              label: removeLabelButtonsSheetHeader ? "" : mylabel,
              onclick: async (ev) => {
                if (index === 0) {
                  enableVarianEncumbranceEffectsOnSpecificActorFlag = false;
                  enableVarianEncumbranceWeightOnSpecificActorFlag = true;
                  mylabel = i18n("variant-encumbrance-dnd5e.label.enableWEOnSpecificActor");
                  myicon = "fas fa-balance-scale-right";
                  index = 1;
                } else if (index === 1) {
                  enableVarianEncumbranceEffectsOnSpecificActorFlag = false;
                  enableVarianEncumbranceWeightOnSpecificActorFlag = false;
                  mylabel = i18n("variant-encumbrance-dnd5e.label.disableVEAndWEOnSpecificActor");
                  myicon = "fas fa-feather";
                  index = 2;
                } else if (index === 2) {
                  enableVarianEncumbranceEffectsOnSpecificActorFlag = true;
                  enableVarianEncumbranceWeightOnSpecificActorFlag = true;
                  mylabel = i18n("variant-encumbrance-dnd5e.label.enableVEAndWEOnSpecificActor");
                  myicon = "fas fa-weight-hanging";
                  index = 0;
                } else if (index === 3) {
                  enableVarianEncumbranceEffectsOnSpecificActorFlag = true;
                  enableVarianEncumbranceWeightOnSpecificActorFlag = true;
                  mylabel = i18n("variant-encumbrance-dnd5e.label.enableVEAndWEOnSpecificActor");
                  myicon = "fas fa-weight-hanging";
                  index = 0;
                }

                // THIS LOOP ON RENDER ACTOR ?
                await actorEntity.setFlag(
                  CONSTANTS.MODULE_ID,
                  EncumbranceFlags.ENABLED_AE,
                  enableVarianEncumbranceEffectsOnSpecificActorFlag
                );
                await actorEntity.setFlag(
                  CONSTANTS.MODULE_ID,
                  EncumbranceFlags.ENABLED_WE,
                  enableVarianEncumbranceWeightOnSpecificActorFlag
                );

                if (
                  enableVarianEncumbranceEffectsOnSpecificActorFlag &&
                  enableVarianEncumbranceWeightOnSpecificActorFlag
                ) {
                  await VariantEncumbranceImpl.updateEncumbrance(actorEntity, undefined, true, EncumbranceMode.UPDATE);
                } else if (!enableVarianEncumbranceEffectsOnSpecificActorFlag) {
                  await VariantEncumbranceImpl.manageActiveEffect(actorEntity, ENCUMBRANCE_TIERS.NONE);
                  if (enableVarianEncumbranceWeightOnSpecificActorFlag) {
                    await VariantEncumbranceImpl.updateEncumbrance(
                      actorEntity,
                      undefined,
                      false,
                      EncumbranceMode.UPDATE
                    );
                  }
                } else if (enableVarianEncumbranceWeightOnSpecificActorFlag) {
                  await VariantEncumbranceImpl.updateEncumbrance(actorEntity, undefined, false, EncumbranceMode.UPDATE);
                }

                if (removeLabelButtonsSheetHeader) {
                  mylabel = "";
                }
                ev.currentTarget.innerHTML = `<i class="${myicon}"></i>${mylabel}`;
              },
            });
          }
        }
        // ================
        // Bulk system
        // ================
        if (game.settings.get(CONSTANTS.MODULE_ID, "enableBulkSystem")) {
          let enableVarianEncumbranceEffectsBulkOnSpecificActorFlag = true;
          if (!hasProperty(actorEntity, `flags.${CONSTANTS.MODULE_ID}.${EncumbranceFlags.ENABLED_AE_BULK}`)) {
            await actorEntity.setFlag(
              CONSTANTS.MODULE_ID,
              EncumbranceFlags.ENABLED_AE_BULK,
              enableVarianEncumbranceEffectsBulkOnSpecificActorFlag
            );
          } else {
            enableVarianEncumbranceEffectsBulkOnSpecificActorFlag = actorEntity.getFlag(
              CONSTANTS.MODULE_ID,
              EncumbranceFlags.ENABLED_AE_BULK
            );
          }

          let enableVarianEncumbranceWeightBulkOnSpecificActorFlag = true;
          if (!hasProperty(actorEntity, `flags.${CONSTANTS.MODULE_ID}.${EncumbranceFlags.ENABLED_WE_BULK}`)) {
            await actorEntity.setFlag(
              CONSTANTS.MODULE_ID,
              EncumbranceFlags.ENABLED_WE_BULK,
              enableVarianEncumbranceWeightBulkOnSpecificActorFlag
            );
          } else {
            enableVarianEncumbranceWeightBulkOnSpecificActorFlag = actorEntity.getFlag(
              CONSTANTS.MODULE_ID,
              EncumbranceFlags.ENABLED_WE_BULK
            );
          }

          let mylabelBulk = i18n("variant-encumbrance-dnd5e.label.enableVEAndWEBulkOnSpecificActor");
          let myiconBulk = "fas fa-bold";
          let indexBulk = 0;

          if (
            enableVarianEncumbranceEffectsBulkOnSpecificActorFlag &&
            enableVarianEncumbranceWeightBulkOnSpecificActorFlag
          ) {
            mylabelBulk = i18n("variant-encumbrance-dnd5e.label.enableVEAndWEBulkOnSpecificActor");
            myiconBulk = "fas fa-bold";
            indexBulk = 0;
          } else if (
            !enableVarianEncumbranceEffectsBulkOnSpecificActorFlag &&
            enableVarianEncumbranceWeightBulkOnSpecificActorFlag
          ) {
            mylabelBulk = i18n("variant-encumbrance-dnd5e.label.enableWEBulkOnSpecificActor");
            myiconBulk = "fas fa-balance-scale-left";
            indexBulk = 1;
          } else if (
            !enableVarianEncumbranceEffectsBulkOnSpecificActorFlag &&
            !enableVarianEncumbranceWeightBulkOnSpecificActorFlag
          ) {
            mylabelBulk = i18n("variant-encumbrance-dnd5e.label.disableVEAndWEBulkOnSpecificActor");
            myiconBulk = "fas fa-feather-alt";
            indexBulk = 2;
          } else if (
            enableVarianEncumbranceEffectsBulkOnSpecificActorFlag &&
            !enableVarianEncumbranceWeightBulkOnSpecificActorFlag
          ) {
            // THIS USE CASE CAN'T BE HAPPENED WE REST TO THE STANDARD
            mylabelBulk = i18n("variant-encumbrance-dnd5e.label.enableVEAndWEBulkOnSpecificActor");
            myiconBulk = "fas fa-bold";
            indexBulk = 3;
          } else {
            throw new Error("Something is wrong");
          }

          // varianEncumbranceButtons.push({
          buttons.unshift({
            icon: myiconBulk,
            class: "enable-disable-variant-encumbrance-bulk",
            label: removeLabelButtonsSheetHeader ? "" : mylabelBulk,
            onclick: async (ev) => {
              if (indexBulk === 0) {
                enableVarianEncumbranceEffectsBulkOnSpecificActorFlag = false;
                enableVarianEncumbranceWeightBulkOnSpecificActorFlag = true;
                mylabelBulk = i18n("variant-encumbrance-dnd5e.label.enableWEBulkOnSpecificActor");
                myiconBulk = "fas fa-balance-scale-left";
                indexBulk = 1;
              } else if (indexBulk === 1) {
                enableVarianEncumbranceEffectsBulkOnSpecificActorFlag = false;
                enableVarianEncumbranceWeightBulkOnSpecificActorFlag = false;
                mylabelBulk = i18n("variant-encumbrance-dnd5e.label.disableVEAndWEBulkOnSpecificActor");
                myiconBulk = "fas fa-feather-alt";
                indexBulk = 2;
              } else if (indexBulk === 2) {
                enableVarianEncumbranceEffectsBulkOnSpecificActorFlag = true;
                enableVarianEncumbranceWeightBulkOnSpecificActorFlag = true;
                mylabelBulk = i18n("variant-encumbrance-dnd5e.label.enableVEAndWEBulkOnSpecificActor");
                myiconBulk = "fas fa-bold";
                indexBulk = 0;
              } else if (indexBulk === 3) {
                enableVarianEncumbranceEffectsBulkOnSpecificActorFlag = true;
                enableVarianEncumbranceWeightBulkOnSpecificActorFlag = true;
                mylabelBulk = i18n("variant-encumbrance-dnd5e.label.enableVEAndWEBulkOnSpecificActor");
                myiconBulk = "fas fa-bold";
                indexBulk = 0;
              }

              // THIS LOOP ON RENDER ACTOR ?
              await actorEntity.setFlag(
                CONSTANTS.MODULE_ID,
                EncumbranceFlags.ENABLED_AE_BULK,
                enableVarianEncumbranceEffectsBulkOnSpecificActorFlag
              );
              await actorEntity.setFlag(
                CONSTANTS.MODULE_ID,
                EncumbranceFlags.ENABLED_WE_BULK,
                enableVarianEncumbranceWeightBulkOnSpecificActorFlag
              );

              if (
                enableVarianEncumbranceEffectsBulkOnSpecificActorFlag &&
                enableVarianEncumbranceWeightBulkOnSpecificActorFlag
              ) {
                await VariantEncumbranceBulkImpl.updateEncumbrance(
                  actorEntity,
                  undefined,
                  true,
                  EncumbranceMode.UPDATE
                );
              } else if (!enableVarianEncumbranceEffectsBulkOnSpecificActorFlag) {
                await VariantEncumbranceBulkImpl.manageActiveEffect(actorEntity, ENCUMBRANCE_TIERS.NONE);
                if (enableVarianEncumbranceWeightBulkOnSpecificActorFlag) {
                  await VariantEncumbranceBulkImpl.updateEncumbrance(
                    actorEntity,
                    undefined,
                    false,
                    EncumbranceMode.UPDATE
                  );
                }
              } else if (enableVarianEncumbranceWeightBulkOnSpecificActorFlag) {
                await VariantEncumbranceBulkImpl.updateEncumbrance(
                  actorEntity,
                  undefined,
                  false,
                  EncumbranceMode.UPDATE
                );
              }

              if (removeLabelButtonsSheetHeader) {
                mylabelBulk = "";
              }
              ev.currentTarget.innerHTML = `<i class="${myiconBulk}"></i>${mylabelBulk}`;
            },
          });
        }
        //buttons.unshift(...varianEncumbranceButtons);
      } else {
        if (hasProperty(actorEntity, `flags.${CONSTANTS.MODULE_ID}.${EncumbranceFlags.ENABLED_AE}`)) {
          actorEntity.unsetFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.ENABLED_AE);
        }
        if (hasProperty(actorEntity, `flags.${CONSTANTS.MODULE_ID}.${EncumbranceFlags.ENABLED_WE}`)) {
          actorEntity.unsetFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.ENABLED_WE);
        }
        await VariantEncumbranceImpl.updateEncumbrance(actorEntity, undefined, false, EncumbranceMode.UPDATE);

        // System Bulk

        if (hasProperty(actorEntity, `flags.${CONSTANTS.MODULE_ID}.${EncumbranceFlags.ENABLED_AE_BULK}`)) {
          actorEntity.unsetFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.ENABLED_AE_BULK);
        }
        if (hasProperty(actorEntity, `flags.${CONSTANTS.MODULE_ID}.${EncumbranceFlags.ENABLED_WE_BULK}`)) {
          actorEntity.unsetFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.ENABLED_WE_BULK);
        }
        await VariantEncumbranceBulkImpl.updateEncumbrance(actorEntity, undefined, false, EncumbranceMode.UPDATE);
      }
    }
  });
};

export async function createEmbeddedDocuments(wrapped, embeddedName, data, context) {
  const actorEntity = this.actor;
  if (isEnabledActorType(actorEntity) && actorEntity.sheet?.rendered) {
    if (game.settings.get(CONSTANTS.MODULE_ID, "enabled")) {
      await VariantEncumbranceImpl.updateEncumbrance(
        actorEntity,
        data,
        actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.ENABLED_AE),
        EncumbranceMode.ADD
      );
    }
    if (game.settings.get(CONSTANTS.MODULE_ID, "enableBulkSystem")) {
      await VariantEncumbranceBulkImpl.updateEncumbrance(
        actorEntity,
        data,
        actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.ENABLED_AE_BULK),
        EncumbranceMode.ADD
      );
    }
  }
  return wrapped(embeddedName, data, context);
}

export async function deleteEmbeddedDocuments(wrapped, embeddedName, ids = [], options = {}) {
  const actorEntity = this.actor;
  if (isEnabledActorType(actorEntity) && actorEntity.sheet?.rendered) {
    if (game.settings.get(CONSTANTS.MODULE_ID, "enabled")) {
      await VariantEncumbranceImpl.updateEncumbrance(
        actorEntity,
        ids,
        actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.ENABLED_AE),
        EncumbranceMode.DELETE
      );
    }
    if (game.settings.get(CONSTANTS.MODULE_ID, "enableBulkSystem")) {
      await VariantEncumbranceBulkImpl.updateEncumbrance(
        actorEntity,
        ids,
        actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.ENABLED_AE_BULK),
        EncumbranceMode.DELETE
      );
    }
  }
  return wrapped(embeddedName, ids, options);
}

export async function updateEmbeddedDocuments(wrapped, embeddedName, data, options) {
  const actorEntity = this.actor;
  if (isEnabledActorType(actorEntity) && actorEntity.sheet?.rendered) {
    if (game.settings.get(CONSTANTS.MODULE_ID, "enabled")) {
      await VariantEncumbranceImpl.updateEncumbrance(
        actorEntity,
        data,
        actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.ENABLED_AE),
        EncumbranceMode.UPDATE
      );
    }
    if (game.settings.get(CONSTANTS.MODULE_ID, "enableBulkSystem")) {
      await VariantEncumbranceImpl.updateEncumbrance(
        actorEntity,
        data,
        actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.ENABLED_AE_BULK),
        EncumbranceMode.UPDATE
      );
    }
  }
  return wrapped(embeddedName, data, options);
}
// START REMOVED 2022-01-29
export async function createDocuments(wrapped, data, context = { parent: {}, pack: {}, options: {} }) {
  const { parent, pack, options } = context;
  const actorEntity = parent;
  if (isEnabledActorType(actorEntity) && actorEntity.sheet?.rendered) {
    if (game.settings.get(CONSTANTS.MODULE_ID, "enabled")) {
      await VariantEncumbranceImpl.updateEncumbrance(
        actorEntity,
        data,
        actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.ENABLED_AE),
        EncumbranceMode.ADD
      );
    }
    if (game.settings.get(CONSTANTS.MODULE_ID, "enableBulkSystem")) {
      await VariantEncumbranceBulkImpl.updateEncumbrance(
        actorEntity,
        data,
        actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.ENABLED_AE_BULK),
        EncumbranceMode.ADD
      );
    }
  }
  return wrapped(data, context);
}

export async function updateDocuments(wrapped, updates = [], context = { parent: {}, pack: {}, options: {} }) {
  const { parent, pack, options } = context;
  const actorEntity = parent;

  const update = updates ? updates[0] : undefined;
  const { doTheUpdate, noActiveEffect } = VariantEncumbranceDnd5eHelpers.isAEncumbranceUpdated(actorEntity, update);
  if (doTheUpdate && actorEntity.sheet?.rendered) {
    // if (
    //   hasProperty2(update, `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.ITEM.veweight}`) ||
    //   hasProperty2(update, `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.ITEM.bulk}`)
    // ) {
    //   return wrapped(updates, context);
    // }
    // if (isEnabledActorType(actorEntity) && actorEntity.sheet?.rendered) {
    if (noActiveEffect) {
      if (game.settings.get(CONSTANTS.MODULE_ID, "enabled")) {
        VariantEncumbranceImpl.calculateEncumbrance(actorEntity, actorEntity.items.contents, false, invPlusActive);
      }
      if (game.settings.get(CONSTANTS.MODULE_ID, "enableBulkSystem")) {
        VariantEncumbranceBulkImpl.calculateEncumbrance(actorEntity, actorEntity.items.contents, false, invPlusActive);
      }
    } else {
      if (game.settings.get(CONSTANTS.MODULE_ID, "enabled")) {
        await VariantEncumbranceImpl.updateEncumbrance(
          actorEntity,
          updates,
          actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.ENABLED_AE),
          EncumbranceMode.ADD
        );
      }
      if (game.settings.get(CONSTANTS.MODULE_ID, "enableBulkSystem")) {
        await VariantEncumbranceBulkImpl.updateEncumbrance(
          actorEntity,
          updates,
          actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.ENABLED_AE_BULK),
          EncumbranceMode.ADD
        );
      }
    }
  }
  return wrapped(updates, context);
}

export async function deleteDocuments(wrapped, ids = [], context = { parent: {}, pack: {}, options: {} }) {
  const { parent, pack, options } = context;
  const actorEntity = parent;
  if (isEnabledActorType(actorEntity) && actorEntity.sheet?.rendered) {
    if (game.settings.get(CONSTANTS.MODULE_ID, "enabled")) {
      await VariantEncumbranceImpl.updateEncumbrance(
        actorEntity,
        ids,
        actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.ENABLED_AE),
        EncumbranceMode.DELETE
      );
    }
    if (game.settings.get(CONSTANTS.MODULE_ID, "enableBulkSystem")) {
      await VariantEncumbranceBulkImpl.updateEncumbrance(
        actorEntity,
        ids,
        actorEntity.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.ENABLED_AE_BULK),
        EncumbranceMode.DELETE
      );
    }
  }
  return wrapped(ids, context);
}
// END REMOVED 2022-01-29

const module = {
  async renderActorSheetVariant(
    actorSheet,
    htmlElement,
    actorObject,
    actorEntityTmp,
    htmlElementEncumbranceVariant,
    sheetClass
  ) {
    if (game.settings.get(CONSTANTS.MODULE_ID, "enabled")) {
      // ===============================
      // CUSTOMIZE ENCUMBRANCE VARIANT
      // =============================

      htmlElementEncumbranceVariant.find(".encumbrance-breakpoint").each(function (el) {
        $(this).addClass("encumbrance-breakpoint-variant");
      });
      htmlElementEncumbranceVariant.find(".encumbrance-breakpoint-label").each(function (el) {
        $(this).addClass("encumbrance-breakpoint-label-variant");
      });

      let encumbranceElements;
      if (htmlElement[0]?.tagName === "FORM" && htmlElement[0]?.id === "") {
        encumbranceElements = htmlElementEncumbranceVariant[0]?.children;
      } else {
        encumbranceElements = htmlElementEncumbranceVariant[0]?.children;
      }

      //if (actorObject.isCharacter || actorObject.isVehicle) {
      // const actorEntity = game.actors?.get(actorObject.actor._id);
      // Do no touch the true actor again

      let encumbranceData;
      // if (hasProperty(actorObject, `flags.${CONSTANTS.MODULE_ID}.${EncumbranceFlags.DATA}`)) {
      //   encumbranceData = getProperty(actorObject,`flags.${CONSTANTS.MODULE_ID}.${EncumbranceFlags.DATA}`);
      // }
      if (!encumbranceData) {
        // const itemsCurrent = actorEntity.items.contents;//actorObject.items;// STRANGE BUG actorEntity.items.contents
        // const actorEntityCurrent = <ActorData>actorObject.actor; // STRANGE BUG game.actors?.get(actorObject.actor._id);
        // STRANGE BEHAVIOUR
        if (actorObject.actor?.flags) {
          // mergeObject(<any>actorEntity.flags, <any>actorObject.actor.flags);
          setProperty(actorEntityTmp, "flags", actorObject.actor.flags);
        }
        // if (actorObject.system) {
        // 	// mergeObject(<any>actorEntity.system, <any>actorObject.system);
        // 	setProperty(actorEntityTmp, "system", actorObject.system);
        // }
        // mergeObject(actorEntity.items, actorObject.items);
        let itemsToCheck = [];
        // if (actorObject.items && actorObject.items instanceof Array) {
        //   for (const itemM of actorEntityTmp.items.contents) {
        //     const itemToMerge = <ItemData>actorObject.items.find((zData) => {
        //       return z._id === itemM.id;
        //     });
        //     const newItem = <any>duplicate(itemM);
        //     if (itemToMerge) {
        //       mergeObject(newItem.system, itemToMerge);
        //     }
        //     itemsToCheck.push(newItem);
        //   }
        // } else {
        itemsToCheck = actorEntityTmp.items.contents;
        // }

        encumbranceData = VariantEncumbranceImpl.calculateEncumbrance(
          actorEntityTmp,
          itemsToCheck,
          false,
          invPlusActive
        );
        // TODO THIS LAUNCH A ERROR ON THE SEMAPHORE SYNCHRONIZE...
        // if (actorEntityTmp.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.ENABLED_AE)) {
        // 	await VariantEncumbranceImpl.manageActiveEffect(actorEntityTmp, encumbranceData.encumbranceTier);
        // }
      }

      const displayedUnits = encumbranceData.unit;
      // TODO MADE BETTER CODE
      if (
        !encumbranceElements &&
        ((game.modules.get("compact-beyond-5e-sheet")?.active &&
          actorSheet.template.includes("compact-beyond-5e-sheet")) ||
          (game.modules.get("dndbeyond-character-sheet")?.active &&
            actorSheet.template.includes("dndbeyond-character-sheet")))
      ) {
        const encumbranceElementsTmp = htmlElement.find(".encumberance")[0]?.children;

        encumbranceElementsTmp[0].textContent =
          "Weight Carried: " +
          Math.round(encumbranceData.totalWeightToDisplay * 100000) / 100000 +
          " " +
          displayedUnits;

        encumbranceElementsTmp[1].textContent = "Max: " + encumbranceData.heavyMax + " " + displayedUnits;
        // TODO visual integration with compact-beyond-5e-sheet
        //const div = document.createElement('div');
        //div.classList.add('encumbrance');
        /*
        const div = htmlElement.find('.encumberance')[0];

        const span1 = document.createElement('span');
        span1.classList.add('encumbrance-bar');

        const span2 = document.createElement('span');
        span2.classList.add('encumbrance-label');

        const icon1 = document.createElement('icon');
        icon1.classList.add('encumbrance-breakpoint');
        icon1.classList.add('encumbrance-33');
        icon1.classList.add('arrow-up');

        const icon2 = document.createElement('icon');
        icon2.classList.add('encumbrance-breakpoint');
        icon2.classList.add('encumbrance-33');
        icon2.classList.add('arrow-down');

        const icon3 = document.createElement('icon');
        icon3.classList.add('encumbrance-breakpoint');
        icon3.classList.add('encumbrance-66');
        icon3.classList.add('arrow-up');

        const icon4 = document.createElement('icon');
        icon4.classList.add('encumbrance-breakpoint');
        icon4.classList.add('encumbrance-66');
        icon4.classList.add('arrow-down');

        div.appendChild(span1)
        div.appendChild(span2)
        div.appendChild(icon1)
        div.appendChild(icon2)
        div.appendChild(icon3)
        div.appendChild(icon4)

        encumbranceElements = htmlElement.find('.encumberance')[0]?.children;
        */
        /*
        <div class="encumbrance ">
              <span class="encumbrance-bar" style="width:36.166666666666664%"></span>
              <span class="encumbrance-label">108.5 / 300</span>
              <i class="encumbrance-breakpoint encumbrance-33 arrow-up"></i>
              <i class="encumbrance-breakpoint encumbrance-33 arrow-down"></i>
              <i class="encumbrance-breakpoint encumbrance-66 arrow-up"></i>
              <i class="encumbrance-breakpoint encumbrance-66 arrow-down"></i>
        </div>
        */
      }

      if (encumbranceElements) {
        encumbranceElements[2].style.left = (encumbranceData.lightMax / encumbranceData.heavyMax) * 100 + "%";
        encumbranceElements[3].style.left = (encumbranceData.lightMax / encumbranceData.heavyMax) * 100 + "%";
        encumbranceElements[4].style.left = (encumbranceData.mediumMax / encumbranceData.heavyMax) * 100 + "%";
        encumbranceElements[5].style.left = (encumbranceData.mediumMax / encumbranceData.heavyMax) * 100 + "%";
        encumbranceElements[0].style.cssText =
          "width: " +
          Math.min(Math.max((encumbranceData.totalWeightToDisplay / encumbranceData.heavyMax) * 100, 0), 99.8) +
          "%;";

        encumbranceElements[1].textContent =
          Math.round(encumbranceData.totalWeightToDisplay * 100000) / 100000 +
          "/" +
          encumbranceData.heavyMax +
          " " +
          displayedUnits;

        encumbranceElements[0].classList.remove("medium");
        encumbranceElements[0].classList.remove("heavy");
        encumbranceElements[0].classList.remove("max");

        if (encumbranceData.encumbranceTier === ENCUMBRANCE_TIERS.LIGHT) {
          encumbranceElements[0].classList.add("medium");
        }
        if (encumbranceData.encumbranceTier === ENCUMBRANCE_TIERS.HEAVY) {
          encumbranceElements[0].classList.add("heavy");
        }
        if (encumbranceData.encumbranceTier === ENCUMBRANCE_TIERS.MAX) {
          encumbranceElements[0].classList.add("max");
        }

        if (game.settings.get(CONSTANTS.MODULE_ID, "enableBulkSystem")) {
          htmlElementEncumbranceVariant
            .find(".encumbrance-breakpoint-variant.encumbrance-33.arrow-up")
            .parent()
            .css("margin-bottom", "4px");
        } else {
          htmlElementEncumbranceVariant
            .find(".encumbrance-breakpoint-variant.encumbrance-33.arrow-up")
            .parent()
            .css("margin-bottom", "14px");
        }
        htmlElementEncumbranceVariant
          .find(".encumbrance-breakpoint-variant.encumbrance-33.arrow-up")
          .append(`<div class="encumbrance-breakpoint-label-variant VELabel">${encumbranceData.lightMax}<div>`);
        htmlElementEncumbranceVariant
          .find(".encumbrance-breakpoint.encumbrance-66.arrow-up")
          .append(`<div class="encumbrance-breakpoint-label-variant VELabel">${encumbranceData.mediumMax}<div>`);
        encumbranceElements[1].insertAdjacentHTML(
          "afterend",
          `<span class="VELabel" style="right:0%">${encumbranceData.heavyMax}</span>`
        );
        encumbranceElements[1].insertAdjacentHTML("afterend", `<span class="VELabel">0</span>`);
      }
    }
  },
  async renderActorSheetBulkSystem(
    actorSheet,
    htmlElement,
    actorObject,
    actorEntityTmp,
    encumbranceElement,
    sheetClass
  ) {
    if (game.settings.get(CONSTANTS.MODULE_ID, "enableBulkSystem")) {
      // ===============================
      // CUSTOMIZE ENCUMBRANCE
      // ===============================

      $(encumbranceElement)
        .clone()
        .removeClass("encumbrance-variant")
        .addClass("encumbrance-bulk")
        .appendTo(encumbranceElement.parent());

      // htmlElement.find('.encumbrance-bulk').css('margin-bottom', '16px');
      // htmlElement.find('.encumbrance-bulk')[0].style.marginBottom = '16px';

      const htmlElementEncumbranceBulk = htmlElement.find(".encumbrance-bulk");

      htmlElementEncumbranceBulk.find(".encumbrance-breakpoint").each(function (el) {
        $(el).addClass("encumbrance-breakpoint-bulk").removeClass("encumbrance-breakpoint-variant");
      });
      htmlElementEncumbranceBulk.find(".encumbrance-breakpoint-label").each(function (el) {
        $(el).addClass("encumbrance-breakpoint-label-bulk").removeClass("encumbrance-breakpoint-label-variant");
      });

      let encumbranceElementsBulk;
      if (htmlElementEncumbranceBulk[0]?.tagName === "FORM" && htmlElementEncumbranceBulk[0]?.id === "") {
        encumbranceElementsBulk = htmlElementEncumbranceBulk[0]?.children;
      } else {
        encumbranceElementsBulk = htmlElementEncumbranceBulk[0]?.children;
      }

      let encumbranceDataBulk;
      // if (hasProperty(actorObject, `flags.${CONSTANTS.MODULE_ID}.${EncumbranceFlags.DATA_BULK}`)) {
      //   encumbranceDataBulk = getProperty(actorObject,`flags.${CONSTANTS.MODULE_ID}.${EncumbranceFlags.DATA_BULK}`);
      // }
      if (!encumbranceDataBulk) {
        // const itemsCurrent = actorEntity.items.contents;//actorObject.items;// STRANGE BUG actorEntity.items.contents
        // const actorEntityCurrent = <ActorData>actorObject.actor; // STRANGE BUG game.actors?.get(actorObject.actor._id);
        // STRANGE BEHAVIOUR
        if (actorObject.actor?.flags) {
          // mergeObject(<any>actorEntity.flags, <any>actorObject.actor.flags);
          setProperty(actorEntityTmp, "flags", actorObject.actor.flags);
        }
        // if (actorObject.system) {
        // 	// mergeObject(<any>actorEntity.system, <any>actorObject.system);
        // 	setProperty(actorEntityTmp, "system", actorObject.system);
        // }
        // mergeObject(actorEntity.items, actorObject.items);
        let itemsToCheck = [];
        // if (actorObject.items && actorObject.items instanceof Array) {
        //   for (const itemM of actorEntityTmp.items.contents) {
        //     const itemToMerge = <ItemData>actorObject.items.find((zData) => {
        //       return z._id === itemM.id;
        //     });
        //     const newItem = <any>duplicate(itemM);
        //     if (itemToMerge) {
        //       mergeObject(newItem.system, itemToMerge);
        //     }
        //     itemsToCheck.push(newItem);
        //   }
        // } else {
        itemsToCheck = actorEntityTmp.items.contents;
        // }

        encumbranceDataBulk = VariantEncumbranceBulkImpl.calculateEncumbrance(
          actorEntityTmp,
          itemsToCheck,
          false,
          invPlusActive
        );

        // TODO THIS LAUNCH A ERROR ON THE SEMAPHORE SYNCHRONIZE...
        // if (actorEntityTmp.getFlag(CONSTANTS.MODULE_ID, EncumbranceFlags.ENABLED_AE_BULK)) {
        // 	await VariantEncumbranceBulkImpl.manageActiveEffect(actorEntityTmp, encumbranceDataBulk.encumbranceTier);
        // }
      }

      const displayedUnitsBulk = encumbranceDataBulk.unit ?? game.settings.get(CONSTANTS.MODULE_ID, "unitsBulk");

      if (
        !encumbranceElementsBulk &&
        ((game.modules.get("compact-beyond-5e-sheet")?.active &&
          actorSheet.template.includes("compact-beyond-5e-sheet")) ||
          (game.modules.get("dndbeyond-character-sheet")?.active &&
            actorSheet.template.includes("dndbeyond-character-sheet")))
      ) {
        const encumbranceElementsTmp = htmlElementEncumbranceBulk[0]?.children;

        encumbranceElementsTmp[0].textContent =
          "Bulk Carried: " +
          Math.round(encumbranceDataBulk.totalWeightToDisplay * 100000) / 100000 +
          " " +
          displayedUnitsBulk;

        encumbranceElementsTmp[1].textContent = "Max: " + encumbranceDataBulk.heavyMax + " " + displayedUnitsBulk;
        // TODO visual integration with compact-beyond-5e-sheet
      }

      if (encumbranceElementsBulk) {
        encumbranceElementsBulk[2].style.left =
          (encumbranceDataBulk.lightMax / encumbranceDataBulk.heavyMax) * 100 + "%";
        encumbranceElementsBulk[3].style.left =
          (encumbranceDataBulk.lightMax / encumbranceDataBulk.heavyMax) * 100 + "%";
        encumbranceElementsBulk[4].style.left =
          (encumbranceDataBulk.mediumMax / encumbranceDataBulk.heavyMax) * 100 + "%";
        encumbranceElementsBulk[5].style.left =
          (encumbranceDataBulk.mediumMax / encumbranceDataBulk.heavyMax) * 100 + "%";
        encumbranceElementsBulk[0].style.cssText =
          "width: " +
          Math.min(Math.max((encumbranceDataBulk.totalWeightToDisplay / encumbranceDataBulk.heavyMax) * 100, 0), 99.8) +
          "%;";

        encumbranceElementsBulk[1].textContent =
          Math.round(encumbranceDataBulk.totalWeightToDisplay * 100000) / 100000 +
          "/" +
          encumbranceDataBulk.heavyMax +
          " " +
          displayedUnitsBulk;

        encumbranceElementsBulk[0].classList.remove("medium");
        encumbranceElementsBulk[0].classList.remove("heavy");

        if (encumbranceDataBulk.encumbranceTier === ENCUMBRANCE_TIERS.LIGHT) {
          encumbranceElementsBulk[0].classList.add("medium");
        }
        if (encumbranceDataBulk.encumbranceTier === ENCUMBRANCE_TIERS.HEAVY) {
          encumbranceElementsBulk[0].classList.add("heavy");
        }
        if (encumbranceDataBulk.encumbranceTier === ENCUMBRANCE_TIERS.MAX) {
          encumbranceElementsBulk[0].classList.add("max");
        }

        // htmlElementEncumbranceBulk
        //   .find('.encumbrance-breakpoint-bulk.encumbrance-33.arrow-up').parent().css('margin-bottom', '4px');
        // htmlElementEncumbranceBulk
        //   .find('.encumbrance-breakpoint-bulk.encumbrance-33.arrow-up')
        //   .append(`<div class="encumbrance-breakpoint-label-bulk VELabel">${encumbranceDataBulk.lightMax}<div>`);

        htmlElementEncumbranceBulk
          .find(".encumbrance-breakpoint-bulk.encumbrance-66.arrow-up")
          .html(`<div class="encumbrance-breakpoint-label-bulk VELabel">${encumbranceDataBulk.mediumMax}<div>`);

        $(encumbranceElementsBulk)
          .parent()
          .find(".encumbrance-breakpoint.encumbrance-33.arrow-up.encumbrance-breakpoint-bulk")[0].style.display =
          "none";
        $(encumbranceElementsBulk)
          .parent()
          .find(".encumbrance-breakpoint.encumbrance-33.arrow-down.encumbrance-breakpoint-bulk")[0].style.display =
          "none";

        $(encumbranceElementsBulk)
          .find(".encumbrance-breakpoint-bulk.encumbrance-66.arrow-up")
          .append(`<div class="encumbrance-breakpoint-label-bulk VELabel">${encumbranceDataBulk.mediumMax}<div>`);

        encumbranceElementsBulk[1].insertAdjacentHTML(
          "afterend",
          `<span class="VELabel" style="right:0%">${encumbranceDataBulk.heavyMax}</span>`
        );
        encumbranceElementsBulk[1].insertAdjacentHTML("afterend", `<span class="VELabel">0</span>`);
      }
    }
  },
  renderItemSheetBulkSystem(app, html, data, itemTmp) {
    // Size
    const item = app.object;
    const options = [];
    // options.push(
    //   `<option data-image="icons/svg/mystery-man.svg" value="">${i18n(`${CONSTANTS.MODULE_ID}.default`)}</option>`,
    // );
    const weight = data.weight ?? 0;
    let suggestedBulkWeight = 0;
    const suggestedBulk = checkBulkCategory(weight, item);
    if (suggestedBulk) {
      suggestedBulkWeight = suggestedBulk.bulk;
    }
    // NOTE: we use the parent no the data
    let bulk = getProperty(item, `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.ITEM.bulk}`) ?? 0;
    if (bulk <= 0 && game.settings.get(CONSTANTS.MODULE_ID, "automaticApplySuggestedBulk")) {
      bulk = suggestedBulkWeight;
    }

    const suggestedBulkValueS = i18nFormat("variant-encumbrance-dnd5e.label.bulk.suggestedValue", {
      suggestedBulkWeight: suggestedBulkWeight,
    });

    let bulkLabel = i18n("variant-encumbrance-dnd5e.label.bulk.VEBulk");

    html
      .find(".item-properties") // <div class="item-properties">
      // .closest('item-weight').after(
      .append(
        `
        <div class="form-group" style="color:red">
          <label style="color:red">${bulkLabel}</label>
          <input style="color:red" type="text" name="flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.ITEM.bulk}" value="${bulk}" data-dtype="Number"/>
          <p class="notes">${suggestedBulkValueS}</p>
        </div>
        `
      );
  },
  renderItemSheetVEWeightSystem(app, html, data, itemTmp) {
    // Size
    const item = app.object;
    const options = [];
    // options.push(
    //   `<option data-image="icons/svg/mystery-man.svg" value="">${i18n(`${CONSTANTS.MODULE_ID}.default`)}</option>`,
    // );
    const veweight =
      getProperty(item, `flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.ITEM.veweight}`) ?? data.weight ?? 0;

    let veweightLabel = i18n("variant-encumbrance-dnd5e.label.veweight.VEWeight");

    html
      .find(".item-properties") // <div class="item-properties">
      // .closest('item-weight').after(
      .append(
        `
        <div class="form-group" style="color:red">
          <label style="color:red">${veweightLabel}</label>
          <input style="color:red" type="text" readonly name="flags.${CONSTANTS.MODULE_ID}.${CONSTANTS.FLAGS.ITEM.veweight}" value="${veweight}" data-dtype="Number"/>
          <p class="notes"></p>
        </div>
        `
      );
  },
};
