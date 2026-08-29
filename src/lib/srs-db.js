/**
 * IndexedDB persistence for spaced-repetition cards.
 *
 * Follows the raw-IndexedDB pattern of `progress.js` rather than pulling in a
 * wrapper, so the two progress stores behave identically — including the
 * synchronous-throw catch that Safari private browsing needs.
 *
 * This lives in its own database rather than extending `chess-progress-db`.
 * That store holds tutorial/quiz completion under a different lifecycle, and
 * keeping SRS separate means no upgrade path can damage existing progress.
 *
 * Card shape is owned by `srs.js` — see `createCard()`.
 */

const SRS_DB_NAME = "chess-srs-db";
const SRS_DB_VERSION = 1;
const SRS_STORE_NAME = "cards";

const openSrsDB = () =>
  new Promise((resolve, reject) => {
    try {
      const request = indexedDB.open(SRS_DB_NAME, SRS_DB_VERSION);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      request.onupgradeneeded = (e) => {
        const database = e.target.result;
        if (!database.objectStoreNames.contains(SRS_STORE_NAME)) {
          const store = database.createObjectStore(SRS_STORE_NAME, {
            keyPath: "itemId",
          });
          // Lets the session builder query the due queue without a full scan.
          store.createIndex("due", "due", { unique: false });
        }
      };
    } catch (error) {
      // Safari private browsing (and similar) throw synchronously here
      // instead of going through request.onerror.
      reject(error);
    }
  });

const runRequest = (mode, work) =>
  openSrsDB().then(
    (database) =>
      new Promise((resolve, reject) => {
        const tx = database.transaction(SRS_STORE_NAME, mode);
        const request = work(tx.objectStore(SRS_STORE_NAME));
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );

// ── Public API ─────────────────────────────────────────────────────────────

/**
 * Every stored card.
 * @returns {Promise<object[]>} all SRS cards
 */
export const getAllCards = () =>
  runRequest("readonly", (store) => store.getAll()).then(
    (cards) => cards ?? [],
  );

/**
 * One card by curriculum item id.
 * @param {string} itemId curriculum item id
 * @returns {Promise<object|null>} the card, or null when never reviewed
 */
export const getCard = (itemId) =>
  runRequest("readonly", (store) => store.get(itemId)).then(
    (card) => card ?? null,
  );

/**
 * Insert or replace a card.
 * @param {object} card an SRS card
 * @returns {Promise<*>} the stored key
 */
export const putCard = (card) =>
  runRequest("readwrite", (store) => store.put(card));

/**
 * Insert or replace many cards in a single transaction.
 * @param {object[]} cards SRS cards
 * @returns {Promise<void>} resolves once the transaction commits
 */
export const putCards = (cards) =>
  openSrsDB().then(
    (database) =>
      new Promise((resolve, reject) => {
        const tx = database.transaction(SRS_STORE_NAME, "readwrite");
        const store = tx.objectStore(SRS_STORE_NAME);
        for (const card of cards) store.put(card);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      }),
  );

/**
 * Delete all stored cards. Resets every scheduled review.
 * @returns {Promise<void>} resolves once cleared
 */
export const clearCards = () =>
  runRequest("readwrite", (store) => store.clear()).then(() => undefined);
