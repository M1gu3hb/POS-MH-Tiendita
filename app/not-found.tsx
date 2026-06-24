import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="skeu-card max-w-md w-full p-8 text-center">
        <h1 className="text-3xl font-black text-foreground">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">No encontramos esta página.</p>
        <Link href="/" className="skeu-btn-primary mt-6 inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-semibold">
          Ir al inicio
        </Link>
      </div>
    </main>
  );
}
