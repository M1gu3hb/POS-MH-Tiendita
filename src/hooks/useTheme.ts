'use client';

import { useEffect, useState } from 'react';
import { useTheme as useNextTheme } from 'next-themes';

/**
 * Wrapper sobre next-themes que conserva la API del hook original
 * (`{ theme, toggleTheme, setTheme }`) usada por AppLayout y ThemeToggle.
 * Unifica el sistema de tema en next-themes (montado en Providers) y evita
 * el doble manejo de la clase `.dark`.
 */
export function useTheme() {
  const { theme, setTheme, resolvedTheme } = useNextTheme();
  // Evita desajustes de hidratación: hasta montar, reporta 'light'.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const current = mounted ? resolvedTheme ?? theme ?? 'light' : 'light';
  const toggleTheme = () => setTheme(current === 'dark' ? 'light' : 'dark');

  return { theme: current, setTheme, toggleTheme };
}
