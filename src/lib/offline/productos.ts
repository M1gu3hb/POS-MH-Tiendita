import { getDB, withStore, STORE_PRODUCTOS } from '@/lib/offline/db';
import type { Producto } from '@/lib/db/types';

/** Cache de productos para búsqueda offline (por nombre o código de barras). */

export async function cacheProductos(productos: Producto[]): Promise<void> {
  if (!productos || productos.length === 0) return;
  const db = await getDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_PRODUCTOS, 'readwrite');
    const store = tx.objectStore(STORE_PRODUCTOS);
    productos.forEach((p) => store.put(p));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getProductoOffline(id: string): Promise<Producto | null> {
  const result = await withStore<Producto | undefined>(STORE_PRODUCTOS, 'readonly', (s) => s.get(id));
  return result ?? null;
}

export async function buscarProductoOffline(query: string): Promise<Producto[]> {
  const all = (await withStore<Producto[]>(STORE_PRODUCTOS, 'readonly', (s) => s.getAll())) ?? [];
  const q = (query || '').trim().toLowerCase();
  if (!q) return all;
  return all.filter((p) => {
    const nombre = (p.nombre || '').toLowerCase();
    const codigo = (p.codigo_barras || '').toLowerCase();
    return nombre.includes(q) || codigo.includes(q);
  });
}
