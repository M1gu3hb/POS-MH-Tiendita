'use client';

import Link from 'next/link';
import { Construction } from 'lucide-react';

interface EnMigracionProps {
  titulo: string;
  /** Descripción de qué hará esta pantalla cuando se complete su port. */
  descripcion?: string;
}

/**
 * Marcador de pantalla "en migración". Las capas de datos (src/lib/db/*),
 * auth y API ya están listas; el cuerpo de cada página se porta sobre ellas.
 * Ver docs/NEXT_STEPS.md para el plan por pantalla.
 */
export default function EnMigracion({ titulo, descripcion }: EnMigracionProps) {
  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="skeu-card max-w-md w-full p-8 text-center">
        <div className="mx-auto mb-4 h-14 w-14 rounded-2xl flex items-center justify-center bg-accent text-accent-foreground">
          <Construction className="h-7 w-7" />
        </div>
        <h1 className="text-xl font-bold text-foreground">{titulo}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {descripcion ??
            'Esta pantalla está en proceso de migración a Next.js + Supabase. La capa de datos, autenticación y API ya están listas.'}
        </p>
        <Link
          href="/"
          className="skeu-btn-ghost mt-6 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium text-foreground"
        >
          Volver al inicio
        </Link>
      </div>
    </div>
  );
}
