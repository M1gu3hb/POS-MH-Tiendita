import { useEffect, useState } from 'react';

/**
 * Devuelve true si el ancho de pantalla es menor a 1024px (mobile + tablet).
 * Sigue el breakpoint `lg` de Tailwind.
 */
export function useIsTabletOrMobile() {
  const [isSmall, setIsSmall] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia('(max-width: 1023px)');
    const onChange = () => setIsSmall(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);

  return isSmall;
}