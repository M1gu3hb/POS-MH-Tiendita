'use client';

// Re-export del hook de autenticación para la ruta de import que indica el
// prompt (sección 6). La implementación vive en AuthContext.tsx.
export { useAuth } from '@/lib/auth/AuthContext';
