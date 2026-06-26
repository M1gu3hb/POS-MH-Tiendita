'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/AuthContext';
import { useConfig } from '@/hooks/useConfig';
import {
  getCombos,
  crearCombo,
  actualizarCombo,
  eliminarCombo,
  toggleCombo,
} from '@/lib/db/combos';
import { formatMoney } from '@/utils/currency';
import ComboDialog from './ComboDialog';
import LoadingState from '@/components/common/LoadingState';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit2, Trash2, Tag, Calendar, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { useGatedAction } from '@/hooks/useGatedAction';

export default function CombosManager() {
  const { negocioId } = useAuth();
  const { config } = useConfig();
  const queryClient = useQueryClient();
  const gated = useGatedAction();
  const sym = config?.simbolo_moneda || '$';

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCombo, setSelectedCombo] = useState(null);
  const [saving, setSaving] = useState(false);

  // Cargar combos
  const { data: combos = [], isLoading } = useQuery({
    queryKey: ['combos-all', negocioId],
    queryFn: () => getCombos(negocioId),
    enabled: !!negocioId,
  });

  const handleSave = async (data) => {
    if (!gated.ensureAccess()) return;
    setSaving(true);
    try {
      if (selectedCombo) {
        await actualizarCombo(selectedCombo.id, data);
        toast.success('Combo actualizado correctamente');
      } else {
        await crearCombo(negocioId, data);
        toast.success('Combo creado correctamente');
      }
      queryClient.invalidateQueries({ queryKey: ['combos-all'] });
      setDialogOpen(false);
      setSelectedCombo(null);
    } catch (err) {
      toast.error('Error al guardar el combo: ' + (err?.message || ''));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (comboId, currentActive) => {
    if (!gated.ensureAccess()) return;
    try {
      await toggleCombo(comboId, !currentActive);
      toast.success(
        currentActive ? 'Combo desactivado' : 'Combo activado'
      );
      queryClient.invalidateQueries({ queryKey: ['combos-all'] });
    } catch (err) {
      toast.error('Error al cambiar estado del combo');
    }
  };

  const handleDelete = async (comboId) => {
    if (!gated.ensureAccess()) return;
    if (window.confirm('¿Estás seguro de que deseas eliminar este combo?')) {
      try {
        await eliminarCombo(comboId);
        toast.success('Combo eliminado');
        queryClient.invalidateQueries({ queryKey: ['combos-all'] });
      } catch (err) {
        toast.error('Error al eliminar combo');
      }
    }
  };

  // Formatear rango de fechas
  const formatDates = (inicio, fin) => {
    if (!inicio && !fin) return 'Vigencia permanente';
    
    const options = { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' };
    const dateStr = (d) => new Date(d).toLocaleDateString('es-MX', options);

    if (inicio && fin) {
      return `Del ${dateStr(inicio)} al ${dateStr(fin)}`;
    }
    if (inicio) {
      return `Desde el ${dateStr(inicio)}`;
    }
    return `Hasta el ${dateStr(fin)}`;
  };

  // Comprobar si el combo está actualmente vigente
  const isVigente = (inicio, fin) => {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    if (inicio) {
      const dInicio = new Date(inicio);
      dInicio.setHours(0, 0, 0, 0);
      if (hoy < dInicio) return false;
    }
    if (fin) {
      const dFin = new Date(fin);
      dFin.setHours(23, 59, 59, 999);
      if (hoy > dFin) return false;
    }
    return true;
  };

  return (
    <div className="space-y-4">
      {/* Botón superior de Nuevo Combo */}
      <div className="flex justify-end">
        <Button
          onClick={gated(() => {
            setSelectedCombo(null);
            setDialogOpen(true);
          })}
          className="bg-primary hover:bg-primary/90 font-bold"
        >
          <Plus className="h-4 w-4 mr-1" /> Nuevo Combo
        </Button>
      </div>

      {isLoading ? (
        <LoadingState rows={6} />
      ) : combos.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="Sin combos ni promociones"
          description="Los combos te permiten agrupar productos con un precio de descuento especial."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {combos.map((combo) => {
            const sumNormal = (combo.combo_productos || []).reduce(
              (s, cp) => s + (cp.productos?.precio_venta || 0) * cp.cantidad,
              0
            );
            const savings = sumNormal - combo.precio_combo;
            const vigente = isVigente(combo.fecha_inicio, combo.fecha_fin);

            return (
              <div
                key={combo.id}
                className="flex flex-col p-5 rounded-2xl border border-border bg-card shadow-sm space-y-4 relative group"
              >
                {/* Cabecera del item */}
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-base text-foreground truncate">
                      {combo.nombre}
                    </h3>
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      <span className={!vigente && combo.activo ? 'text-amber-500 font-medium' : ''}>
                        {formatDates(combo.fecha_inicio, combo.fecha_fin)}
                        {!vigente && combo.activo && ' (Fuera de fecha)'}
                      </span>
                    </div>
                  </div>
                  
                  {/* Interruptor Activo/Inactivo */}
                  <div className="flex items-center shrink-0">
                    <Switch
                      checked={combo.activo}
                      onCheckedChange={() => handleToggleActive(combo.id, combo.activo)}
                      aria-label="Activar/Desactivar combo"
                    />
                  </div>
                </div>

                {/* Lista de productos incluidos */}
                <div className="bg-muted/30 rounded-xl p-3 space-y-2 border border-border/50 flex-1">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider mb-1">
                    Productos Incluidos
                  </p>
                  {(combo.combo_productos || []).map((cp) => (
                    <div
                      key={cp.id}
                      className="flex justify-between items-center text-xs text-foreground"
                    >
                      <span className="truncate pr-2 font-medium">
                        {cp.cantidad}x {cp.productos?.nombre || 'Producto'}
                      </span>
                      <span className="tabular-nums text-muted-foreground shrink-0">
                        {formatMoney((cp.productos?.precio_venta || 0) * cp.cantidad, sym)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Precios y Ahorro */}
                <div className="flex justify-between items-end pt-2 border-t border-border/60">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-muted-foreground uppercase font-bold">
                      Precio Combo
                    </span>
                    <span className="text-xl font-black text-primary tabular-nums">
                      {formatMoney(combo.precio_combo, sym)}
                    </span>
                  </div>
                  
                  {savings > 0 && (
                    <div className="flex flex-col text-right">
                      <span className="text-[10px] text-muted-foreground uppercase font-bold">
                        Ahorro Cliente
                      </span>
                      <span className="text-sm font-bold text-green-600 dark:text-green-400 tabular-nums">
                        -{formatMoney(savings, sym)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Acciones del item (Editar/Eliminar) */}
                <div className="flex gap-2 justify-end pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedCombo(combo);
                      setDialogOpen(true);
                    }}
                    className="h-8 text-xs font-bold"
                  >
                    <Edit2 className="h-3.5 w-3.5 mr-1" /> Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(combo.id)}
                    className="h-8 text-xs font-bold text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Diálogo de Creación / Edición */}
      <ComboDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setSelectedCombo(null);
        }}
        onSave={handleSave}
        combo={selectedCombo}
        loading={saving}
        sym={sym}
      />
    </div>
  );
}
