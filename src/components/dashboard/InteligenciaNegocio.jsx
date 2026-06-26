'use client';

import { useQuery } from '@tanstack/react-query';
import { getQueConvieneSurtir, getComparativaDias, getPrediccionQuiebre } from '@/lib/db/inteligencia';
import { formatMoney } from '@/utils/currency';
import { Sparkles, TrendingDown, PackageSearch, ArrowUpRight, ArrowDownRight, Clock } from 'lucide-react';

/**
 * Sección "Inteligencia del negocio" del dashboard. Tres análisis sobre datos
 * existentes (sin IA externa): qué conviene surtir, cómo vas hoy vs. la semana
 * pasada, y qué se va a acabar pronto. Se monta solo para rol 'dueno' (el
 * gating vive en el dashboard, igual que el resumen del día).
 */
export default function InteligenciaNegocio({ negocioId, sym = '$' }) {
  const { data: surtir, isLoading: surtirLoading } = useQuery({
    queryKey: ['inteligencia-surtir', negocioId],
    queryFn: () => getQueConvieneSurtir(negocioId),
    enabled: !!negocioId,
    staleTime: 1000 * 60 * 5,
  });

  const { data: comparativa, isLoading: compLoading } = useQuery({
    queryKey: ['inteligencia-comparativa', negocioId],
    queryFn: () => getComparativaDias(negocioId),
    enabled: !!negocioId,
    staleTime: 1000 * 60 * 2,
  });

  const { data: quiebre, isLoading: quiebreLoading } = useQuery({
    queryKey: ['inteligencia-quiebre', negocioId],
    queryFn: () => getPrediccionQuiebre(negocioId),
    enabled: !!negocioId,
    staleTime: 1000 * 60 * 5,
  });

  const arriba = (comparativa?.porcentaje ?? 0) >= 0;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-4 w-4 text-primary" />
        </div>
        <h2 className="text-lg font-bold text-foreground">Inteligencia del negocio</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Bloque 1 — Qué te conviene surtir */}
        <div className="skeu-panel p-5">
          <div className="flex items-center gap-2 mb-3">
            <PackageSearch className="h-4 w-4 text-blue-500" />
            <h3 className="font-semibold text-sm text-foreground">Qué te conviene surtir</h3>
          </div>

          {surtirLoading ? (
            <Cargando texto="Analizando ventas…" />
          ) : !surtir || surtir.sinDatos ? (
            <p className="text-muted-foreground text-sm py-4 text-center">{surtir?.mensaje || 'Sin datos suficientes todavía.'}</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-green-600 dark:text-green-400 mb-1.5">Surte más</p>
                {surtir.surteMas.length > 0 ? (
                  <ul className="divide-y divide-border">
                    {surtir.surteMas.map((p) => (
                      <li key={p.producto_id} className="py-1.5 flex items-center justify-between gap-2 text-sm">
                        <span className="text-foreground truncate">{p.nombre}</span>
                        <span className="flex items-center gap-3 shrink-0 text-xs">
                          <span className="text-muted-foreground tabular-nums">{p.unidades} u</span>
                          <span className="font-bold tabular-nums text-green-600 dark:text-green-400">{formatMoney(p.ganancia, sym)}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-xs italic">Sin ventas en 30 días.</p>
                )}
              </div>

              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">Considera dejar de surtir</p>
                {surtir.dejarDeSurtir.length > 0 ? (
                  <ul className="flex flex-wrap gap-1.5">
                    {surtir.dejarDeSurtir.map((p) => (
                      <li key={p.producto_id} className="text-xs px-2 py-1 rounded-md bg-muted text-muted-foreground truncate max-w-[140px]">
                        {p.nombre}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-muted-foreground text-xs italic">Todos tus productos tuvieron ventas. 👍</p>
                )}
                <p className="text-[10px] text-muted-foreground mt-1.5">Productos activos sin ventas en los últimos 30 días.</p>
              </div>
            </div>
          )}
        </div>

        {/* Bloque 2 — ¿Cómo vas hoy? */}
        <div className="skeu-panel p-5">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="h-4 w-4 text-purple-500" />
            <h3 className="font-semibold text-sm text-foreground">¿Cómo vas hoy?</h3>
          </div>

          {compLoading ? (
            <Cargando texto="Comparando días…" />
          ) : !comparativa || !comparativa.hayDatos ? (
            <p className="text-muted-foreground text-sm py-4 text-center">Aún no hay ventas para comparar.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">Hoy</p>
                  <p className="text-2xl font-black tabular-nums text-foreground">{formatMoney(comparativa.totalHoy, sym)}</p>
                </div>
                {comparativa.porcentaje !== null && (
                  <span className={`flex items-center gap-1 text-sm font-bold tabular-nums ${arriba ? 'text-green-600 dark:text-green-400' : 'text-red-500'}`}>
                    {arriba ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />}
                    {arriba ? '+' : ''}{comparativa.porcentaje}%
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                <span className="text-muted-foreground">Mismo día semana pasada</span>
                <span className="font-semibold tabular-nums text-foreground">{formatMoney(comparativa.totalSemanaPasada, sym)}</span>
              </div>
              {comparativa.porcentaje === null && (
                <p className="text-[11px] text-muted-foreground">No hubo ventas ese día la semana pasada para comparar.</p>
              )}
            </div>
          )}
        </div>

        {/* Bloque 3 — Se te van a acabar */}
        <div className="skeu-panel p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingDown className="h-4 w-4 text-red-500" />
            <h3 className="font-semibold text-sm text-foreground">Se te van a acabar</h3>
          </div>

          {quiebreLoading ? (
            <Cargando texto="Calculando ritmo de venta…" />
          ) : !quiebre || quiebre.length === 0 ? (
            <p className="text-muted-foreground text-sm py-4 text-center">✓ Nada en riesgo de agotarse pronto.</p>
          ) : (
            <ul className="divide-y divide-border max-h-56 overflow-y-auto">
              {quiebre.map((p) => (
                <li key={p.producto_id} className="py-2 flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0">
                    <span className="block text-foreground truncate">{p.nombre}</span>
                    <span className="block text-[11px] text-muted-foreground">Stock {p.stock_actual} · {p.velocidad_diaria} u/día</span>
                  </span>
                  <span className={`shrink-0 font-bold tabular-nums text-xs px-2 py-1 rounded-md ${p.dias_restantes <= 2 ? 'bg-red-500/10 text-red-500' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'}`}>
                    {p.dias_restantes === 0 ? 'hoy' : `${p.dias_restantes} día${p.dias_restantes === 1 ? '' : 's'}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function Cargando({ texto }) {
  return (
    <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
      <span className="inline-block h-4 w-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin mr-2" />
      {texto}
    </div>
  );
}
