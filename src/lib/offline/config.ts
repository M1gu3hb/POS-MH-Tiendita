import { withStore, STORE_CONFIG } from '@/lib/offline/db';
import type { ConfiguracionNegocio } from '@/lib/db/types';

/** Cache de la configuración del negocio para usarla sin conexión. */

export async function cacheConfig(config: ConfiguracionNegocio): Promise<void> {
  if (!config || !config.negocio_id) return;
  await withStore<IDBValidKey>(STORE_CONFIG, 'readwrite', (s) => s.put(config));
}

export async function getConfigOffline(): Promise<ConfiguracionNegocio | null> {
  const all = await withStore<ConfiguracionNegocio[]>(STORE_CONFIG, 'readonly', (s) => s.getAll());
  return all && all.length > 0 ? all[0] : null;
}
