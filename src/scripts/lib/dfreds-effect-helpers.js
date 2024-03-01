export class DfredsEffectHelpers {
  static async loadCustomEffects(customEffects) {
    // Check for dfred convenient effect and retrieve the effect with the specific name
    // https://github.com/DFreds/dfreds-convenient-effects/issues/110
    if (game.modules.get("dfreds-convenient-effects")?.active && game.dfreds?.effectInterface) {
      for (const effectToFoundByName of customEffects) {
        //const dfredEffect = game.dfreds.effectInterface.findEffectByName(effectToFoundByName);
        const dfredEffect = game.dfreds.effectInterface.findCustomEffectByName(effectToFoundByName);
        if (!dfredEffect) {
          //The data that is passed in are standard ActiveEffectData... i.e. from
          //canvas.tokens.controlled[0].actor.effects.get('some key').data.toObject()
          await game.dfreds.effectInterface.createNewCustomEffectsWith({
            activeEffects: [effectToFoundByName],
          });
        }
      }
    }
  }
}
