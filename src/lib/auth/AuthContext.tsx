'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/db/supabase';
import { getUsuarioByAuthId } from '@/lib/db/usuarios';
import type { Rol, Usuario } from '@/lib/db/types';

/**
 * Contexto de autenticación basado en Supabase Auth.
 * Reemplaza el AuthContext acoplado a Base44.
 *
 * Expone tanto el usuario de Supabase Auth (`authUser`) como el perfil de
 * negocio (`usuario`: negocio_id, rol, nombre_visible), que es lo que el
 * resto del POS necesita para el aislamiento multi-tenant.
 */

interface AuthResult {
  error: string | null;
}

interface AuthContextValue {
  authUser: User | null;
  usuario: Usuario | null;
  negocioId: string | null;
  rol: Rol | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  signInWithPassword: (email: string, password: string) => Promise<AuthResult>;
  signInWithMagicLink: (email: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
  refreshUsuario: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'Ocurrió un error inesperado.';
}

/** Limpia solo preferencias locales de UI (prefijo pos-mh-), nunca datos de negocio. */
function clearLocalUiPrefs(): void {
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
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authUser, setAuthUser] = useState<User | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUsuario = useCallback(async (user: User | null) => {
    if (!user) {
      setUsuario(null);
      return;
    }
    try {
      const perfil = await getUsuarioByAuthId(user.id);
      setUsuario(perfil);
    } catch {
      // RLS o perfil aún no creado: dejamos usuario en null; la UI puede
      // mostrar el error de "usuario no registrado" si corresponde.
      setUsuario(null);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!active) return;
      setAuthUser(user);
      await loadUsuario(user);
      if (active) setIsLoading(false);
    };

    void init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: string, session: Session | null) => {
      const user = session?.user ?? null;
      setAuthUser(user);
      void loadUsuario(user);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [loadUsuario]);

  const signInWithPassword = useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error: error ? error.message : null };
      } catch (error: unknown) {
        return { error: getErrorMessage(error) };
      }
    },
    [],
  );

  const signInWithMagicLink = useCallback(async (email: string): Promise<AuthResult> => {
    try {
      const emailRedirectTo =
        typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo },
      });
      return { error: error ? error.message : null };
    } catch (error: unknown) {
      return { error: getErrorMessage(error) };
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    clearLocalUiPrefs();
    setAuthUser(null);
    setUsuario(null);
  }, []);

  const refreshUsuario = useCallback(async () => {
    await loadUsuario(authUser);
  }, [authUser, loadUsuario]);

  const value = useMemo<AuthContextValue>(
    () => ({
      authUser,
      usuario,
      negocioId: usuario?.negocio_id ?? null,
      rol: usuario?.rol ?? null,
      isLoading,
      isAuthenticated: Boolean(authUser),
      signInWithPassword,
      signInWithMagicLink,
      signOut,
      refreshUsuario,
    }),
    [authUser, usuario, isLoading, signInWithPassword, signInWithMagicLink, signOut, refreshUsuario],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
