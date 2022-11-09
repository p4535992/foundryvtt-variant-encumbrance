import CONSTANTS from "./constants";
import API from "./api";
import { debug } from "./lib/lib";
import { setSocket } from "../VariantEncumbrance";

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
	debug("Registered variantEncumbranceSocket");
	if (variantEncumbranceSocket) {
		return variantEncumbranceSocket;
	}
	//@ts-ignore
	variantEncumbranceSocket = socketlib.registerModule(CONSTANTS.MODULE_NAME);

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

	setSocket(variantEncumbranceSocket);
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