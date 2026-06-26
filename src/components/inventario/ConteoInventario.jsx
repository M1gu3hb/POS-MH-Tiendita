'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { iniciarConteo, guardarConteo } from '@/lib/db/inventario';
import { formatMoney } from '@/utils/currency';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertTriangle, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Modo conteo/arqueo de inventario. El tendero cuenta físicamente y el sistema
 * compara contra el stock que debería haber → detecta faltantes (robo hormiga / merma).
 * Conteo a ciegas por defecto (no muestra el stock del sistema) para un conteo honesto;
 * con toggle para hacerlo visible. NO ajusta el stock al guardar (solo reporta).
 */
export default function ConteoInventario({ open, onClose, negocioId, usuarioNombre, sym = '$', onSaved }) {
  const [counts, setCounts] = useState({});
  const [showSistema, setShowSistema] = useState(false);
  const [search, setSearch] = useState('');
  const [fase, setFase] = useState('contando'); // 'contando' | 'resultado'
  const [resultado, setResultado] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: productos = [], isLoading } = useQuery({
    queryKey: ['conteo-productos', negocioId],
    queryFn: () => iniciarConteo(negocioId),
    enabled: open && !!negocioId,
  });

  const filtrados = useMemo(() => {
    const q = search.toLowerCase().trim();
    return q ? productos.filter((p) => p.nombre?.toLowerCase().includes(q)) : productos;
  }, [productos, search]);

  const contados = Object.values(counts).filter((v) => v !== undefined && v !== '').length;

  const reset = () => {
    setCounts({});
    setShowSistema(false);
    setSearch('');
    setFase('contando');
    setResultado(null);
  };

  const cerrar = () => {
    reset();
    onClose();
  };

  const handleFinalizar = async () => {
    const detalles = productos
      .filter((p) => counts[p.id] !== undefined && counts[p.id] !== '')
      .map((p) => ({ producto_id: p.id, stock_contado: Math.round(parseFloat(counts[p.id]) || 0) }));

    if (detalles.length === 0) {
      toast.error('Cuenta al menos un producto antes de finalizar');
      return;
    }

    // Resultado para mostrar (cálculo local con el stock del momento del conteo).
    const lineas = detalles
      .map((d) => {
        const p = productos.find((x) => x.id === d.producto_id);
        const sistema = Math.round(p?.stock_sistema || 0);
        const diferencia = d.stock_contado - sistema;
        const valor = diferencia * (p?.costo_unitario || 0);
        return { nombre: p?.nombre || '', sistema, contado: d.stock_contado, diferencia, valor };
      })
      .filter((l) => l.diferencia !== 0)
      .sort((a, b) => a.valor - b.valor);
    const valorFaltantes = lineas.filter((l) => l.diferencia < 0).reduce((s, l) => s + l.valor, 0);

    setSaving(true);
    try {
      await guardarConteo(negocioId, { usuarioNombre, detalles });
      setResultado({ lineas, valorFaltantes, totalContados: detalles.length });
      setFase('resultado');
      if (onSaved) onSaved();
    } catch (err) {
      toast.error('No se pudo guardar el conteo', { description: err?.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) cerrar(); }}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{fase === 'contando' ? 'Conteo de inventario' : 'Resultado del conteo'}</DialogTitle>
        </DialogHeader>

        {fase === 'contando' ? (
          <>
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar producto…" className="flex-1 min-w-[160px]" />
              <div className="flex items-center gap-2">
                <Switch id="show-sistema" checked={showSistema} onCheckedChange={setShowSistema} />
                <Label htmlFor="show-sistema" className="text-xs text-muted-foreground cursor-pointer">Mostrar stock del sistema</Label>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              {showSistema
                ? 'El stock del sistema es visible.'
                : 'Conteo a ciegas (recomendado): el stock del sistema está oculto para que el conteo sea honesto.'}
            </p>

            <div className="flex-1 overflow-y-auto -mx-1 px-1 min-h-[200px]">
              {isLoading ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Cargando productos…</p>
              ) : filtrados.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center italic">Sin productos.</p>
              ) : (
                <ul className="divide-y divide-border">
                  {filtrados.map((p) => (
                    <li key={p.id} className="py-2 flex items-center gap-3">
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-foreground truncate">{p.nombre}</span>
                        {showSistema && <span className="block text-xs text-muted-foreground">Sistema: {Math.round(p.stock_sistema)}</span>}
                      </span>
                      <Input
                        type="number"
                        inputMode="numeric"
                        value={counts[p.id] ?? ''}
                        onChange={(e) => setCounts((c) => ({ ...c, [p.id]: e.target.value }))}
                        placeholder="0"
                        className="w-24 h-11 text-center text-lg font-bold"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <span className="text-xs text-muted-foreground mr-auto self-center">{contados} producto(s) contado(s)</span>
              <Button variant="outline" onClick={cerrar}>Cancelar</Button>
              <Button onClick={handleFinalizar} disabled={saving || contados === 0} className="bg-primary">
                {saving ? 'Guardando…' : 'Finalizar conteo'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto min-h-[160px]">
              {resultado?.lineas.length === 0 ? (
                <div className="py-8 text-center">
                  <ClipboardCheck className="h-12 w-12 mx-auto text-green-500 mb-2" />
                  <p className="text-base font-bold text-foreground">¡Todo cuadra!</p>
                  <p className="text-sm text-muted-foreground">No se detectaron diferencias en {resultado?.totalContados} producto(s) contado(s).</p>
                </div>
              ) : (
                <>
                  {resultado?.valorFaltantes < 0 && (
                    <div className="flex items-start gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 mb-3">
                      <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <p className="text-sm font-semibold text-red-600 dark:text-red-400">
                        Posible merma o robo detectado. Faltante total: {formatMoney(Math.abs(resultado.valorFaltantes), sym)}
                      </p>
                    </div>
                  )}
                  <ul className="divide-y divide-border">
                    {resultado?.lineas.map((l, i) => (
                      <li key={i} className="py-2 flex items-center justify-between gap-3 text-sm">
                        <span className="min-w-0">
                          <span className="block font-semibold text-foreground truncate">{l.nombre}</span>
                          <span className="block text-xs text-muted-foreground">
                            sistema {l.sistema}, contaste {l.contado}, {l.diferencia < 0 ? `faltan ${Math.abs(l.diferencia)}` : `sobran ${l.diferencia}`}
                          </span>
                        </span>
                        <span className={`font-bold tabular-nums whitespace-nowrap ${l.diferencia < 0 ? 'text-red-500' : 'text-green-600 dark:text-green-400'}`}>
                          {l.valor < 0 ? '−' : '+'}{formatMoney(Math.abs(l.valor), sym)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <p className="text-xs text-muted-foreground text-center">El conteo se guardó. El stock NO se ajustó automáticamente (es decisión del dueño).</p>
            <DialogFooter>
              <Button onClick={cerrar} className="bg-primary">Cerrar</Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
