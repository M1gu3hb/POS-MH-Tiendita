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
const PRODUCT_FOLDER = 'productos';
const PRODUCT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PRODUCT_MAX_BYTES = 2 * 1024 * 1024;

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
  const folder = form.get('folder');
  const isProductImage = folder === PRODUCT_FOLDER;
  if (isProductImage && !PRODUCT_IMAGE_TYPES.includes(file.type)) {
    return NextResponse.json({ error: 'Formato no permitido. Usa JPG, PNG o WebP.' }, { status: 415 });
  }
  if (isProductImage && file.size > PRODUCT_MAX_BYTES) {
    return NextResponse.json({ error: 'La imagen no debe superar 2MB.' }, { status: 413 });
  }
  if (!isProductImage && file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'El archivo supera el límite de 5 MB' }, { status: 413 });
  }

  const supabase = createServerSupabase();
  const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
  // Ruta acotada por negocio: logos usan nombre fijo; productos usan archivo único.
  const path = isProductImage
    ? `${ctx.negocioId}/${PRODUCT_FOLDER}/${Date.now()}.${ext}`
    : `${ctx.negocioId}/logo.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: !isProductImage,
    contentType: file.type || undefined,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path });
}
