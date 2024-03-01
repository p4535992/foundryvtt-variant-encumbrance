import { VariantEncumbranceImpl } from "./VariantEncumbranceImpl.js";
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
} from "./VariantEncumbranceModels.js";
import {
  checkBulkCategory,
  convertPoundsToKg,
  getBulkLabel,
  getItemBulk,
  getItemQuantity,
  getItemWeight,
  getWeightLabel,
  isRealNumber,
} from "./lib/lib.js";
import CONSTANTS from "./constants.js";
import { registerSocket } from "./socket.js";
import API from "./api.js";
import { VariantEncumbranceBulkImpl } from "./VariantEncumbranceBulkImpl.js";
import { VariantEncumbranceDnd5eHelpers } from "./lib/variant-encumbrance-dnd5e-helpers.js";
import Logger from "./lib/Logger.js";

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
  // Logger.warn("Init Hooks processing");

  Hooks.once("socketlib.ready", registerSocket);

  // if (game.settings.get(CONSTANTS.MODULE_ID, 'debugHooks')) {
  //   for (const hook of Object.values(HOOKS)) {
  //     if (typeof hook === 'string') {
  //       Hooks.on(hook, (...args) => Logger.debug(`Hook called: ${hook}`, ...args));
  //       Logger.debug(`Registered hook: ${hook}`);
  //     } else {
  //       for (const innerHook of Object.values(hook)) {
  //         Hooks.on(innerHook, (...args) => Logger.debug(`Hook called: ${innerHook}`, ...args));
  //         Logger.debug(`Registered hook: ${innerHook}`);
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
  //     metric: 7.5
  //   },
  //   vehicleWeightMultiplier: {
  //     imperial: 2000, // 2000 lbs in an imperial ton
  //     metric: 1000 // 1000 kg in a metric ton
  //   }
  // };

  if (parseInt(game.system.version) >= 3) {
    CONFIG.DND5E.encumbrance.threshold.maximum.imperial =
      game.settings.get(CONSTANTS.MODULE_ID, "strengthMultiplier") ?? 15;

    if (game.settings.get(CONSTANTS.MODULE_ID, "fakeMetricSystem")) {
      CONFIG.DND5E.encumbrance.threshold.maximum.metric =
        game.settings.get(CONSTANTS.MODULE_ID, "strengthMultiplier") ?? 15;
    } else {
      CONFIG.DND5E.encumbrance.threshold.maximum.metric =
        game.settings.get(CONSTANTS.MODULE_ID, "strengthMultiplierMetric") ?? 7.5;
    }
  } else {
    CONFIG.DND5E.encumbrance.strMultiplier.imperial =
      game.settings.get(CONSTANTS.MODULE_ID, "strengthMultiplier") ?? 15;

    if (game.settings.get(CONSTANTS.MODULE_ID, "fakeMetricSystem")) {
      CONFIG.DND5E.encumbrance.strMultiplier.metric =
        game.settings.get(CONSTANTS.MODULE_ID, "strengthMultiplier") ?? 15;
    } else {
      CONFIG.DND5E.encumbrance.strMultiplier.metric =
        game.settings.get(CONSTANTS.MODULE_ID, "strengthMultiplierMetric") ?? 7.5;
    }
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
  // START RMOEVED 2023-02-01
  // libWrapper.register(CONSTANTS.MODULE_ID, "CONFIG.Item.documentClass.prototype.prepareEmbeddedEntities", prepareEmbeddedEntities, "WRAPPER");

  // libWrapper.register(CONSTANTS.MODULE_ID, "CONFIG.Item.documentClass.prototype.getEmbeddedCollection", getEmbeddedCollection, "MIXED")
  // libWrapper.register(CONSTANTS.MODULE_ID, "CONFIG.Item.documentClass.prototype.prepareDerivedData", prepareDerivedData, "WRAPPER");

  // libWrapper.register(CONSTANTS.MODULE_ID, "CONFIG.Item.documentClass.prototype.actor", getActor, "OVERRIDE")

  // libWrapper.register(CONSTANTS.MODULE_ID, "CONFIG.Item.documentClass.prototype.update", _update, "MIXED")

  // libWrapper.register(CONSTANTS.MODULE_ID, "CONFIG.Item.documentClass.prototype.delete", _delete, "MIXED")

  // libWrapper.register(MODULE_ID, "CONFIG.Item.documentClass.prototype.isEmbedded", isEmbedded, "OVERRIDE")

  // libWrapper.register(CONSTANTS.MODULE_ID, "CONFIG.Item.documentClass._onCreateDocuments", _onCreateDocuments, "MIXED")
  // END RMOEVED 2023-02-01
  // START REMOVED 2024-02-04
  // libWrapper.register(CONSTANTS.MODULE_ID, "CONFIG.Item.documentClass.createDocuments", createDocuments, "MIXED");

  // libWrapper.register(CONSTANTS.MODULE_ID, "CONFIG.Item.documentClass.deleteDocuments", deleteDocuments, "MIXED");

  // libWrapper.register(CONSTANTS.MODULE_ID, "CONFIG.Item.documentClass.updateDocuments", updateDocuments, "MIXED");
  // END REMOVED 2024-02-01
};

export const readyHooks = async () => {
  // effectInterface.initialize();

  Hooks.on("renderItemSheet", (app, html, data) => {
    if (!app.object) {
      return;
    }
    const item = app.object;
    VariantEncumbranceImpl.renderItemSheet(app, html, data.system, item);
    if (game.settings.get(CONSTANTS.MODULE_ID, "enableBulkSystem")) {
      VariantEncumbranceBulkImpl.renderItemSheet(app, html, data.system, item);
    }
  });

  ENCUMBRANCE_STATE = {
    UNENCUMBERED: Logger.i18n(CONSTANTS.MODULE_ID + ".effect.name.unencumbered"), // "Unencumbered",
    ENCUMBERED: Logger.i18n(CONSTANTS.MODULE_ID + ".effect.name.encumbered"), // "Encumbered",
    HEAVILY_ENCUMBERED: Logger.i18n(CONSTANTS.MODULE_ID + ".effect.name.heavily_encumbered"), // "Heavily Encumbered",
    OVERBURDENED: Logger.i18n(CONSTANTS.MODULE_ID + ".effect.name.overburdened"), // "Overburdened"
  };

  Hooks.on("renderActorSheet", async function (actorSheet, htmlElement, actorObject) {
    // Can't necessarily go straight to the supplied object, as it may not have the proper type if the actor is an unlinked Token actor
    const actorEntityTmp = actorObject && actorObject.type ? actorObject : actorObject.actor;
    if (VariantEncumbranceDnd5eHelpers.isEnabledActorType(actorEntityTmp)) {
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
                if (currentTextB && encumbranceData.mapItemEncumbrance) {
                  const weight =
                    encumbranceData.mapItemEncumbrance[item.id]?.toNearest(0.1) ??
                    (quantity * getItemWeight(item)).toNearest(0.1) ??
                    0;
                  const totalWeightS = `${weight} ${getWeightLabel()}`;
                  liItem.parent().find(".item-detail.item-weight").text(totalWeightS);
                }
              }
              if (isBulkEnable && encumbranceDataBulk.mapItemEncumbrance) {
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
              if (replaceStandardWeightValue && encumbranceData.mapItemEncumbrance) {
                if (currentTextB) {
                  const weight =
                    encumbranceData.mapItemEncumbrance[item.id]?.toNearest(0.1) ??
                    (quantity * getItemWeight(item)).toNearest(0.1) ??
                    0;
                  const totalWeightS = `${weight} ${getWeightLabel()}`;
                  liItem.parent().find(".item-detail.item-weight div").text(totalWeightS);
                }
              }
              if (isBulkEnable && encumbranceDataBulk.mapItemEncumbrance) {
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

      if (game.settings.get(CONSTANTS.MODULE_ID, "enableBulkSystem")) {
        await VariantEncumbranceBulkImpl.renderActorSheet(
          actorSheet,
          htmlElement,
          actorObject,
          actorEntityTmp,
          htmlElementEncumbranceVariant,
          sheetClass
        );
      }

      await VariantEncumbranceImpl.renderActorSheet(
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

    if (VariantEncumbranceDnd5eHelpers.isEnabledActorType(actorEntity)) {
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
            let mylabel = Logger.i18n("variant-encumbrance-dnd5e.label.enableVEAndWEOnSpecificActor");
            let myicon = "fas fa-weight-hanging";
            let index = 0;

            if (enableVarianEncumbranceEffectsOnSpecificActorFlag && enableVarianEncumbranceWeightOnSpecificActorFlag) {
              mylabel = Logger.i18n("variant-encumbrance-dnd5e.label.enableVEAndWEOnSpecificActor");
              myicon = "fas fa-weight-hanging";
              index = 0;
            } else if (
              !enableVarianEncumbranceEffectsOnSpecificActorFlag &&
              enableVarianEncumbranceWeightOnSpecificActorFlag
            ) {
              mylabel = Logger.i18n("variant-encumbrance-dnd5e.label.enableWEOnSpecificActor");
              myicon = "fas fa-balance-scale-right";
              index = 1;
            } else if (
              !enableVarianEncumbranceEffectsOnSpecificActorFlag &&
              !enableVarianEncumbranceWeightOnSpecificActorFlag
            ) {
              mylabel = Logger.i18n("variant-encumbrance-dnd5e.label.disableVEAndWEOnSpecificActor");
              myicon = "fas fa-feather";
              index = 2;
            } else if (
              enableVarianEncumbranceEffectsOnSpecificActorFlag &&
              !enableVarianEncumbranceWeightOnSpecificActorFlag
            ) {
              // THIS USE CASE CAN'T BE HAPPENED WE REST TO THE STANDARD
              mylabel = Logger.i18n("variant-encumbrance-dnd5e.label.enableVEAndWEOnSpecificActor");
              myicon = "fas fa-weight-hanging";
              index = 3;
            } else {
              throw new Logger.error("Something is wrong");
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
                  mylabel = Logger.i18n("variant-encumbrance-dnd5e.label.enableWEOnSpecificActor");
                  myicon = "fas fa-balance-scale-right";
                  index = 1;
                } else if (index === 1) {
                  enableVarianEncumbranceEffectsOnSpecificActorFlag = false;
                  enableVarianEncumbranceWeightOnSpecificActorFlag = false;
                  mylabel = Logger.i18n("variant-encumbrance-dnd5e.label.disableVEAndWEOnSpecificActor");
                  myicon = "fas fa-feather";
                  index = 2;
                } else if (index === 2) {
                  enableVarianEncumbranceEffectsOnSpecificActorFlag = true;
                  enableVarianEncumbranceWeightOnSpecificActorFlag = true;
                  mylabel = Logger.i18n("variant-encumbrance-dnd5e.label.enableVEAndWEOnSpecificActor");
                  myicon = "fas fa-weight-hanging";
                  index = 0;
                } else if (index === 3) {
                  enableVarianEncumbranceEffectsOnSpecificActorFlag = true;
                  enableVarianEncumbranceWeightOnSpecificActorFlag = true;
                  mylabel = Logger.i18n("variant-encumbrance-dnd5e.label.enableVEAndWEOnSpecificActor");
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

          let mylabelBulk = Logger.i18n("variant-encumbrance-dnd5e.label.enableVEAndWEBulkOnSpecificActor");
          let myiconBulk = "fas fa-bold";
          let indexBulk = 0;

          if (
            enableVarianEncumbranceEffectsBulkOnSpecificActorFlag &&
            enableVarianEncumbranceWeightBulkOnSpecificActorFlag
          ) {
            mylabelBulk = Logger.i18n("variant-encumbrance-dnd5e.label.enableVEAndWEBulkOnSpecificActor");
            myiconBulk = "fas fa-bold";
            indexBulk = 0;
          } else if (
            !enableVarianEncumbranceEffectsBulkOnSpecificActorFlag &&
            enableVarianEncumbranceWeightBulkOnSpecificActorFlag
          ) {
            mylabelBulk = Logger.i18n("variant-encumbrance-dnd5e.label.enableWEBulkOnSpecificActor");
            myiconBulk = "fas fa-balance-scale-left";
            indexBulk = 1;
          } else if (
            !enableVarianEncumbranceEffectsBulkOnSpecificActorFlag &&
            !enableVarianEncumbranceWeightBulkOnSpecificActorFlag
          ) {
            mylabelBulk = Logger.i18n("variant-encumbrance-dnd5e.label.disableVEAndWEBulkOnSpecificActor");
            myiconBulk = "fas fa-feather-alt";
            indexBulk = 2;
          } else if (
            enableVarianEncumbranceEffectsBulkOnSpecificActorFlag &&
            !enableVarianEncumbranceWeightBulkOnSpecificActorFlag
          ) {
            // THIS USE CASE CAN'T BE HAPPENED WE REST TO THE STANDARD
            mylabelBulk = Logger.i18n("variant-encumbrance-dnd5e.label.enableVEAndWEBulkOnSpecificActor");
            myiconBulk = "fas fa-bold";
            indexBulk = 3;
          } else {
            throw new Logger.error("Something is wrong");
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
                mylabelBulk = Logger.i18n("variant-encumbrance-dnd5e.label.enableWEBulkOnSpecificActor");
                myiconBulk = "fas fa-balance-scale-left";
                indexBulk = 1;
              } else if (indexBulk === 1) {
                enableVarianEncumbranceEffectsBulkOnSpecificActorFlag = false;
                enableVarianEncumbranceWeightBulkOnSpecificActorFlag = false;
                mylabelBulk = Logger.i18n("variant-encumbrance-dnd5e.label.disableVEAndWEBulkOnSpecificActor");
                myiconBulk = "fas fa-feather-alt";
                indexBulk = 2;
              } else if (indexBulk === 2) {
                enableVarianEncumbranceEffectsBulkOnSpecificActorFlag = true;
                enableVarianEncumbranceWeightBulkOnSpecificActorFlag = true;
                mylabelBulk = Logger.i18n("variant-encumbrance-dnd5e.label.enableVEAndWEBulkOnSpecificActor");
                myiconBulk = "fas fa-bold";
                indexBulk = 0;
              } else if (indexBulk === 3) {
                enableVarianEncumbranceEffectsBulkOnSpecificActorFlag = true;
                enableVarianEncumbranceWeightBulkOnSpecificActorFlag = true;
                mylabelBulk = Logger.i18n("variant-encumbrance-dnd5e.label.enableVEAndWEBulkOnSpecificActor");
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
/*
export async function createEmbeddedDocuments(wrapped, embeddedName, data, context) {
  const actorEntity = this.actor;
  if (VariantEncumbranceDnd5eHelpers.isEnabledActorType(actorEntity) && actorEntity.sheet?.rendered) {
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
  if (VariantEncumbranceDnd5eHelpers.isEnabledActorType(actorEntity) && actorEntity.sheet?.rendered) {
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
  if (VariantEncumbranceDnd5eHelpers.isEnabledActorType(actorEntity) && actorEntity.sheet?.rendered) {
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
*/
// START REMOVED 2024-02-02
/*
export async function createDocuments(wrapped, ...args) {
  const [data, context = { parent: {}, pack: {}, options: {} }] = args;
  Logger.debug("createDocuments", data, context);
  const { parent, pack, options } = context;
  const actorEntity = parent;
  if (!actorEntity) {
    return;
  }
  const updateData = data;
  const prepareData = this;
  VariantEncumbranceDnd5eHelpers.manageCreateDocumentItem(actorEntity, updateData, prepareData);

  return wrapped(...args);
  // return wrapped.apply(this, args);
}

export async function updateDocuments(wrapped, ...args) {
  const [updates = [], context = { parent: {}, pack: {}, options: {} }] = args;
  Logger.debug("updateDocuments", updates, context);
  const { parent, pack, options } = context;
  const actorEntity = parent;
  if (!actorEntity) {
    return;
  }
  const updateData = updates ? updates[0] : undefined;
  const prepareData = this;
  VariantEncumbranceDnd5eHelpers.manageUpdateDocumentItem(actorEntity, updateData, prepareData);

  return wrapped(...args);
  // return wrapped.apply(this, args);
}

export async function deleteDocuments(wrapped, ...args) {
  const [ids = [], context = { parent: {}, pack: {}, options: {} }] = args;
  Logger.debug("deleteDocuments", ids, context);
  const { parent, pack, options } = context;
  const actorEntity = parent;
  if (!actorEntity) {
    return;
  }
  const updateData = undefined;
  const prepareData = this;
  VariantEncumbranceDnd5eHelpers.manageDeleteDocumentItem(actorEntity, updateData, prepareData);

  return wrapped(...args);
  // return wrapped.apply(this, args);
}
*/
// END REMOVED 2024-02-02

Hooks.on("preCreateItem", async (item, data, options, userId) => {
  const actorEntity = item.parent;
  if (!actorEntity) {
    return;
  }
  const updateData = data;
  const prepareData = item;
  VariantEncumbranceDnd5eHelpers.manageCreateDocumentItem(actorEntity, updateData, prepareData);
});

Hooks.on("preUpdateItem", async (item, changes, options, userId) => {
  const actorEntity = item.parent;
  if (!actorEntity) {
    return;
  }
  const updateData = changes;
  const prepareData = item;
  VariantEncumbranceDnd5eHelpers.manageUpdateDocumentItem(actorEntity, updateData, prepareData);
});

Hooks.on("preDeleteItem", async (item, options, userId) => {
  const actorEntity = item.parent;
  if (!actorEntity) {
    return;
  }
  const updateData = undefined;
  const prepareData = item;
  VariantEncumbranceDnd5eHelpers.manageDeleteDocumentItem(actorEntity, updateData, prepareData);
});

// Hooks.on("createItem", async (item, options, userId) => {
//   const actorEntity = item.parent;
//   if (!actorEntity) {
//     return;
//   }
//   const updateData = options;
//   const prepareData = item;
//   VariantEncumbranceDnd5eHelpers.manageCreateDocumentItem(actorEntity, updateData, prepareData);
// });

// Hooks.on("updateItem", async (item, change, options, userId) => {
//   const actorEntity = item.parent;
//   if (!actorEntity) {
//     return;
//   }
//   const updateData = change;
//   const prepareData = item;
//   VariantEncumbranceDnd5eHelpers.manageUpdateDocumentItem(actorEntity, updateData, prepareData);
// });

// Hooks.on("deleteItem", async (item, options, userId) => {
//   const actorEntity = item.parent;
//   if (!actorEntity) {
//     return;
//   }
//   const updateData = change;
//   const prepareData = item;
//   VariantEncumbranceDnd5eHelpers.manageDeleteDocumentItem(actorEntity, updateData, prepareData);
// });
