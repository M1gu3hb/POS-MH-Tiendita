import { supabase } from '@/lib/db/supabase';

/**
 * Inteligencia del negocio: análisis sobre datos que YA existen (ventas,
 * detalle_ventas, productos). Sin IA externa — solo lectura y cálculo.
 *
 * Convención de fechas: se filtra `detalle_ventas.created_at` (timestamp de
 * inserción del renglón ≈ momento de la venta), igual que `getTopProductos`.
 * Las cabeceras (`ventas`) sí permiten filtrar por `estado='pagada'`.
 * Limitación menor: la agregación por producto incluye renglones de ventas
 * canceladas (raras en una tiendita; la cancelación es un evento poco común).
 */

const MS_DIA = 86_400_000;
const DIAS_SURTIR = 30;
const DIAS_VELOCIDAD = 14;
const DIAS_QUIEBRE_ALERTA = 5;
const TOP_SURTIR = 5;
const MAX_DEJAR_DE_SURTIR = 12;

const round2 = (n: number): number => Number(n.toFixed(2));

interface DetalleRow {
  producto_id: string | null;
  producto_nombre: string;
  cantidad: number;
  utilidad_snapshot: number;
  created_at: string;
}

// ── TAREA 1 — Qué me conviene surtir ─────────────────────────

export interface ProductoSurtir {
  producto_id: string;
  nombre: string;
  unidades: number;
  ganancia: number;
}

export interface QueConvieneSurtir {
  sinDatos: boolean;
  mensaje?: string;
  surteMas: ProductoSurtir[];
  dejarDeSurtir: Array<{ producto_id: string; nombre: string }>;
}

export async function getQueConvieneSurtir(negocioId: string): Promise<QueConvieneSurtir> {
  const desde = new Date(Date.now() - DIAS_SURTIR * MS_DIA).toISOString();

  const { data: detalles, error } = await supabase
    .from('detalle_ventas')
    .select('producto_id, producto_nombre, cantidad, utilidad_snapshot, created_at')
    .eq('negocio_id', negocioId)
    .gte('created_at', desde)
    .returns<DetalleRow[]>();
  if (error) throw error;

  const { data: productos, error: pErr } = await supabase
    .from('productos')
    .select('id, nombre')
    .eq('negocio_id', negocioId)
    .eq('activo', true)
    .returns<{ id: string; nombre: string }[]>();
  if (pErr) throw pErr;

  const filas = detalles ?? [];
  if (filas.length === 0) {
    return {
      sinDatos: true,
      mensaje: 'Aún no hay ventas suficientes para analizar. Vuelve después de unos días de ventas.',
      surteMas: [],
      dejarDeSurtir: [],
    };
  }

  const agg = new Map<string, { nombre: string; unidades: number; ganancia: number }>();
  for (const d of filas) {
    if (!d.producto_id) continue;
    const cur = agg.get(d.producto_id) ?? { nombre: d.producto_nombre, unidades: 0, ganancia: 0 };
    cur.unidades += Number(d.cantidad || 0);
    cur.ganancia += Number(d.utilidad_snapshot || 0);
    agg.set(d.producto_id, cur);
  }

  const surteMas: ProductoSurtir[] = [...agg.entries()]
    .map(([producto_id, v]) => ({ producto_id, nombre: v.nombre, unidades: v.unidades, ganancia: round2(v.ganancia) }))
    .sort((a, b) => b.ganancia - a.ganancia || b.unidades - a.unidades)
    .slice(0, TOP_SURTIR);

  const vendidos = new Set(agg.keys());
  const dejarDeSurtir = (productos ?? [])
    .filter((p) => !vendidos.has(p.id))
    .slice(0, MAX_DEJAR_DE_SURTIR)
    .map((p) => ({ producto_id: p.id, nombre: p.nombre }));

  return { sinDatos: false, surteMas, dejarDeSurtir };
}

// ── TAREA 2 — Comparativa de días ────────────────────────────

export interface ComparativaDias {
  hayDatos: boolean;
  totalHoy: number;
  totalSemanaPasada: number;
  /** % de diferencia hoy vs mismo día semana pasada. null si no se puede calcular (semana pasada = 0). */
  porcentaje: number | null;
}

async function sumVentasRango(negocioId: string, desdeIso: string, hastaIso?: string): Promise<number> {
  let query = supabase
    .from('ventas')
    .select('total')
    .eq('negocio_id', negocioId)
    .eq('estado', 'pagada')
    .gte('fecha', desdeIso);
  if (hastaIso) query = query.lt('fecha', hastaIso);

  const { data, error } = await query.returns<{ total: number }[]>();
  if (error) throw error;
  return (data ?? []).reduce((s, v) => s + Number(v.total || 0), 0);
}

export async function getComparativaDias(negocioId: string): Promise<ComparativaDias> {
  const inicioHoy = new Date();
  inicioHoy.setHours(0, 0, 0, 0);

  const inicioSemPasada = new Date(inicioHoy);
  inicioSemPasada.setDate(inicioSemPasada.getDate() - 7);
  const finSemPasada = new Date(inicioHoy);
  finSemPasada.setDate(finSemPasada.getDate() - 6); // arranque del día siguiente al mismo día de la semana pasada

  const totalHoy = await sumVentasRango(negocioId, inicioHoy.toISOString());
  const totalSemanaPasada = await sumVentasRango(negocioId, inicioSemPasada.toISOString(), finSemPasada.toISOString());

  const porcentaje = totalSemanaPasada > 0
    ? Number((((totalHoy - totalSemanaPasada) / totalSemanaPasada) * 100).toFixed(1))
    : null;

  return {
    hayDatos: totalHoy > 0 || totalSemanaPasada > 0,
    totalHoy: round2(totalHoy),
    totalSemanaPasada: round2(totalSemanaPasada),
    porcentaje,
  };
}

// ── TAREA 3 — Predicción de quiebre de stock ─────────────────

export interface ProductoQuiebre {
  producto_id: string;
  nombre: string;
  stock_actual: number;
  velocidad_diaria: number;
  dias_restantes: number;
}

export async function getPrediccionQuiebre(negocioId: string): Promise<ProductoQuiebre[]> {
  const desde = new Date(Date.now() - DIAS_VELOCIDAD * MS_DIA).toISOString();

  const { data: detalles, error } = await supabase
    .from('detalle_ventas')
    .select('producto_id, cantidad, created_at')
    .eq('negocio_id', negocioId)
    .gte('created_at', desde)
    .returns<{ producto_id: string | null; cantidad: number; created_at: string }[]>();
  if (error) throw error;

  const unidades = new Map<string, number>();
  for (const d of detalles ?? []) {
    if (!d.producto_id) continue;
    unidades.set(d.producto_id, (unidades.get(d.producto_id) ?? 0) + Number(d.cantidad || 0));
  }
  if (unidades.size === 0) return [];

  const ids = [...unidades.keys()];
  const { data: productos, error: pErr } = await supabase
    .from('productos')
    .select('id, nombre, stock_actual')
    .eq('negocio_id', negocioId)
    .in('id', ids)
    .returns<{ id: string; nombre: string; stock_actual: number | null }[]>();
  if (pErr) throw pErr;

  const resultado: ProductoQuiebre[] = [];
  for (const p of productos ?? []) {
    const totalVendido = unidades.get(p.id) ?? 0;
    const velocidad = totalVendido / DIAS_VELOCIDAD;
    if (velocidad <= 0) continue; // ignora productos sin ventas
    const stock = Number(p.stock_actual ?? 0);
    const dias = velocidad > 0 ? stock / velocidad : Infinity;
    if (dias <= DIAS_QUIEBRE_ALERTA) {
      resultado.push({
        producto_id: p.id,
        nombre: p.nombre,
        stock_actual: stock,
        velocidad_diaria: round2(velocidad),
        dias_restantes: Math.max(0, Math.floor(dias)),
      });
    }
  }

  return resultado.sort((a, b) => a.dias_restantes - b.dias_restantes);
}
