/**
 * A helper function which tests whether an object has a property or nested property given a string key.
 * The method also supports arrays if the provided key is an integer index of the array.
 * The string key supports the notation a.b.c which would return true if object[a][b][c] exists
 * @href https://github.com/foundryvtt/foundryvtt/issues/10359
 * @param {object} object   The object to traverse
 * @param {string} key      An object property with notation a.b.c
 * @returns {boolean}       An indicator for whether the property exists
 */
export function hasPropertyPatched(object, key) {
  if (!key) return false;
  let target = object;
  // MOD 4535992
  const tk = getType(target[key]);
  if (tk !== "null" && tk !== "undefined") return true;
  // END MOD 4535992
  for (let p of key.split(".")) {
    const t = getType(target);
    if (!(t === "Object" || t === "Array")) return false;
    if (p in target) target = target[p];
    else return false;
  }
  return true;
}

/**
 * A helper function which searches through an object to retrieve a value by a string key.
 * The method also supports arrays if the provided key is an integer index of the array.
 * The string key supports the notation a.b.c which would return object[a][b][c]
 * @href https://github.com/foundryvtt/foundryvtt/issues/10359
 * @param {object} object   The object to traverse
 * @param {string} key      An object property with notation a.b.c
 * @return {*}              The value of the found property
 */
export function getPropertyPatched(object, key) {
  if (!key) return undefined;
  let target = object;
  // MOD 4535992
  const tk = getType(target[key]);
  if (tk !== "null" && tk !== "undefined") return target[key];
  // END MOD 4535992
  for (let p of key.split(".")) {
    const t = getType(target);
    if (!(t === "Object" || t === "Array")) return undefined;
    if (p in target) target = target[p];
    else return undefined;
  }
  return target;
}
