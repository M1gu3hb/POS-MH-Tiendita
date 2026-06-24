'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/AuthContext';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/';
  const { signInWithPassword, signInWithMagicLink } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingLink, setIsSendingLink] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    const { error } = await signInWithPassword(email, password);
    setIsSubmitting(false);
    if (error) {
      toast.error('No se pudo iniciar sesión', { description: error });
      return;
    }
    toast.success('Sesión iniciada');
    router.replace(redirectTo);
  };

  const handleMagicLink = async () => {
    if (!email) {
      toast.error('Escribe tu correo para enviarte el enlace');
      return;
    }
    setIsSendingLink(true);
    const { error } = await signInWithMagicLink(email);
    setIsSendingLink(false);
    if (error) {
      toast.error('No se pudo enviar el enlace', { description: error });
      return;
    }
    toast.success('Revisa tu correo', {
      description: 'Te enviamos un enlace mágico para entrar.',
    });
  };

  return (
    <div className="skeu-card p-8">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-foreground">POS MH Tiendita</h1>
        <p className="text-sm text-muted-foreground mt-1">Inicia sesión para entrar al punto de venta.</p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="email" className="text-sm font-medium text-foreground">
            Correo
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="skeu-input w-full rounded-md bg-card px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
            placeholder="tu@correo.com"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="text-sm font-medium text-foreground">
            Contraseña
          </label>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="skeu-input w-full rounded-md bg-card px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="skeu-btn-primary w-full rounded-md px-4 py-2.5 font-semibold disabled:opacity-60"
        >
          {isSubmitting ? 'Entrando…' : 'Entrar'}
        </button>
      </form>

      <div className="my-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">o</span>
        <span className="h-px flex-1 bg-border" />
      </div>

      <button
        type="button"
        onClick={handleMagicLink}
        disabled={isSendingLink}
        className="skeu-btn-ghost w-full rounded-md px-4 py-2.5 font-medium text-foreground disabled:opacity-60"
      >
        {isSendingLink ? 'Enviando…' : 'Enviarme un enlace mágico'}
      </button>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿No tienes cuenta?{' '}
        <Link href="/register" className="font-semibold text-primary hover:underline">
          Crea tu negocio
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="skeu-card p-8 text-center text-muted-foreground">Cargando…</div>}>
      <LoginForm />
    </Suspense>
  );
}
