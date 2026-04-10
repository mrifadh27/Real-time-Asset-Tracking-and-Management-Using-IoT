/**
 * src/config/firebase.js
 * Firebase initialisation — exports the database reference and helpers.
 */

const FB_CONFIG = {
  apiKey:      'AIzaSyAZiSKitF5KYCam6Lzmdc4pPlczLUQmQ_A',
  authDomain:  'realtime-asset-tracking-e00df.firebaseapp.com',
  databaseURL: 'https://realtime-asset-tracking-e00df-default-rtdb.asia-southeast1.firebasedatabase.app/',
  projectId:   'realtime-asset-tracking-e00df',
};

/* global firebase */
if (!window.firebase.apps?.length) {
  window.firebase.initializeApp(FB_CONFIG);
}

export const db = window.firebase.database();

/**
 * Subscribe to a realtime path.
 * @param {string}   path
 * @param {Function} onValue
 * @param {Function} [onError]
 * @returns {Function} unsubscribe
 */
export function subscribe(path, onValue, onError) {
  const ref = db.ref(path);
  ref.on('value', onValue, onError || console.error);
  return () => ref.off('value', onValue);
}

/**
 * Push a record to a path (non-blocking, returns Promise).
 * @param {string} path
 * @param {Object} data
 */
export function pushRecord(path, data) {
  return db.ref(path).push(data).catch(e => console.warn('[FB push]', e));
}

/**
 * Batch-update a path.
 * @param {string} path
 * @param {Object} updates
 */
export function batchUpdate(path, updates) {
  return db.ref(path).update(updates).catch(e => console.warn('[FB batch]', e));
}
