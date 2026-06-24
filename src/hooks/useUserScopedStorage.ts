'use client';

import { useAuth } from '@/lib/auth/AuthContext';

/**
 * Clave de localStorage con scope al usuario actual, para no mezclar
 * preferencias de UI entre cuentas en el mismo navegador.
 * Migrado: usa `authUser.email` de Supabase Auth en vez del user de Base44.
 */
export function useUserScopedKey(baseKey: string): string | null {
  const { authUser } = useAuth();
  const email = authUser?.email;
  if (!email || !baseKey) return null;
  return `${baseKey}::${email}`;
}

/** Limpia todas las claves pos-mh- del almacenamiento local (logout / cambio de cuenta). */
export function clearLocalPOSData(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const k = localStorage.key(i);
      if (k && k.startsWith('pos-mh-')) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* noop */
  }
  try {
    sessionStorage.clear();
  } catch {
    /* noop */
  }
}
