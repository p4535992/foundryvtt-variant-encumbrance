import CONSTANTS from "./constants.mjs";
import API from "./api.mjs";
import Logger from "./lib/Logger";

// export const SOCKET_HANDLERS = {
// 	/**
// 	 * Generic sockets
// 	 */
// 	CALL_HOOK: "callHook",

// 	/**
// 	 * Variant Encumbrance sockets
// 	 */

// 	/**
// 	 * UI sockets
// 	 */

// 	/**
// 	 * Item & attribute sockets
// 	 */
// };

export let variantEncumbranceSocket;

export function registerSocket() {
  Logger.debug("Registered variantEncumbranceSocket");
  if (variantEncumbranceSocket) {
    return variantEncumbranceSocket;
  }

  variantEncumbranceSocket = socketlib.registerModule(CONSTANTS.MODULE_ID);

  // variantEncumbranceSocket.register(SOCKET_HANDLERS.ON_RENDER_TOKEN_CONFIG, (...args) =>
  //   API._onRenderTokenConfig(...args),
  // );

  // =========================================================
  variantEncumbranceSocket.register("calculateWeightOnActorFromId", (...args) =>
    API.calculateWeightOnActorFromIdArr(...args)
  );
  variantEncumbranceSocket.register("calculateWeightOnTokenFromId", (...args) =>
    API.calculateWeightOnTokenFromIdArr(...args)
  );
  variantEncumbranceSocket.register("calculateWeightOnActor", (...args) => API.calculateWeightOnActorArr(...args));

  game.modules.get(CONSTANTS.MODULE_ID).socket = variantEncumbranceSocket;
  return variantEncumbranceSocket;
}

// async function callHook(inHookName, ...args) {
// 	const newArgs: any[] = [];
// 	for (let arg of args) {
// 		if (typeof arg === "string") {
// 			const testArg = await fromUuid(arg);
// 			if (testArg) {
// 				arg = testArg;
// 			}
// 		}
// 		newArgs.push(arg);
// 	}
// 	return Hooks.callAll(inHookName, ...newArgs);
// }
