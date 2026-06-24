import { NextResponse } from 'next/server';
import { getServerAuthContext } from '@/lib/auth/server';
import { createServerSupabase } from '@/lib/db/supabase-server';

/**
 * POST /api/storage/upload — reemplaza `integrations.Core.UploadFile`.
 * Sube un archivo (multipart/form-data, campo `file`) a Supabase Storage en una
 * ruta aislada por negocio y devuelve la URL pública.
 *
 * Requiere un bucket público `negocio-assets` (ver README / docs/BUGS_PENDING.md).
 */

const BUCKET = 'negocio-assets';
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: Request): Promise<NextResponse> {
  const ctx = await getServerAuthContext();
  if (!ctx || !ctx.negocioId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Archivo requerido (campo "file")' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'El archivo supera el límite de 5 MB' }, { status: 413 });
  }

  const supabase = createServerSupabase();
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  // Ruta acotada por negocio: `<negocio_id>/logo.<ext>`. El primer segmento de la
  // ruta es el negocio_id, que es lo que valida la política de escritura del
  // bucket (005_storage_policy.sql, (storage.foldername(name))[1] = get_negocio_id()).
  // Nombre fijo `logo` → upsert para permitir reemplazar el logo existente.
  const path = `${ctx.negocioId}/logo.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path });
}
