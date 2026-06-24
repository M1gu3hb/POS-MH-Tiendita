import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


// SSR-safe: `window` no existe durante el render en servidor (Next.js).
export const isIframe = typeof window !== 'undefined' && window.self !== window.top;
