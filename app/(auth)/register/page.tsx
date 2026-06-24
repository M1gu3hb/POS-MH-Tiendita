'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useAuth } from '@/lib/auth/AuthContext';

interface RegisterResponse {
  success?: boolean;
  negocio_id?: string;
  error?: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const { signInWithPassword } = useAuth();

  const [nombreNegocio, setNombreNegocio] = useState('');
  const [nombreVisible, setNombreVisible] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/negocio/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          nombre_negocio: nombreNegocio,
          nombre_visible: nombreVisible,
        }),
      });
      const data: RegisterResponse = await res.json();

      if (!res.ok || !data.success) {
        toast.error('No se pudo crear la cuenta', { description: data.error });
        return;
      }

      // Iniciar sesión automáticamente tras el alta. Esperamos a que
      // signInWithPassword resuelva (la cookie de sesión ya queda escrita).
      const { error } = await signInWithPassword(email, password);
      if (error) {
        toast.success('Cuenta creada', { description: 'Inicia sesión para continuar.' });
        router.replace('/login');
        return;
      }
      toast.success('¡Negocio creado!', { description: 'Bienvenido a tu punto de venta.' });
      // router.refresh() invalida el Router Cache de Next: descarta la RSC de '/'
      // que se prefetcheó estando deslogueado (un redirect a /login del middleware),
      // de modo que la navegación pida '/' de nuevo al servidor ya con la sesión.
      // Sin esto el dashboard rebota a /login pese al sign-in correcto.
      router.refresh();
      router.replace('/');
    } catch {
      toast.error('Error de red', { description: 'Inténtalo de nuevo.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="skeu-card p-8">
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-foreground">Crea tu negocio</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configura tu punto de venta en menos de un minuto.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="nombre_negocio" className="text-sm font-medium text-foreground">
            Nombre del negocio
          </label>
          <input
            id="nombre_negocio"
            type="text"
            required
            value={nombreNegocio}
            onChange={(e) => setNombreNegocio(e.target.value)}
            className="skeu-input w-full rounded-md bg-card px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
            placeholder="Abarrotes Don Pancho"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="nombre_visible" className="text-sm font-medium text-foreground">
            Tu nombre
          </label>
          <input
            id="nombre_visible"
            type="text"
            required
            value={nombreVisible}
            onChange={(e) => setNombreVisible(e.target.value)}
            className="skeu-input w-full rounded-md bg-card px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
            placeholder="Francisco"
          />
        </div>

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
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="skeu-input w-full rounded-md bg-card px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
            placeholder="Mínimo 8 caracteres"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="skeu-btn-primary w-full rounded-md px-4 py-2.5 font-semibold disabled:opacity-60"
        >
          {isSubmitting ? 'Creando tu negocio…' : 'Crear negocio'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        ¿Ya tienes cuenta?{' '}
        <Link href="/login" className="font-semibold text-primary hover:underline">
          Inicia sesión
        </Link>
      </p>
    </div>
  );
}
