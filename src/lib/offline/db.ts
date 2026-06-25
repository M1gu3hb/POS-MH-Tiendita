/**
 * IndexedDB para el modo offline del POS. DB `pos-offline-db` v1, con 3 stores:
 *   - productos_cache   (keyPath 'id')
 *   - ventas_pendientes (keyPath 'id', autoIncrement)
 *   - config_cache      (keyPath 'negocio_id')
 *
 * Wrapper mínimo sobre la API nativa de IndexedDB (sin dependencias nuevas).
 */

const DB_NAME = 'pos-offline-db';
const DB_VERSION = 1;

export const STORE_PRODUCTOS = 'productos_cache';
export const STORE_VENTAS = 'ventas_pendientes';
export const STORE_CONFIG = 'config_cache';

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no disponible en este entorno'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PRODUCTOS)) {
        db.createObjectStore(STORE_PRODUCTOS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_VENTAS)) {
        db.createObjectStore(STORE_VENTAS, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(STORE_CONFIG)) {
        db.createObjectStore(STORE_CONFIG, { keyPath: 'negocio_id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) dbPromise = initDB();
  return dbPromise;
}

/** Ejecuta una operación sobre un store y resuelve con el resultado del request. */
export function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return getDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(storeName, mode);
        const store = tx.objectStore(storeName);
        const request = run(store);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }),
  );
}
