'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/AuthContext';
import { useConfig } from '@/hooks/useConfig';
import { useFiado } from '@/hooks/useFiado';
import { getMovimientos } from '@/lib/db/fiado';
import { formatMoney } from '@/utils/currency';
import { UserPlus, ArrowDownCircle, X } from 'lucide-react';
import { toast } from 'sonner';

function getErrorMessage(err: unknown): string | undefined {
  return err instanceof Error ? err.message : undefined;
}

export default function FiadoPage() {
  const { rol, negocioId } = useAuth();
  const { config } = useConfig();
  const sym = config?.simbolo_moneda || '$';
  const { clientes, isLoading, crearCliente, abonar } = useFiado();
  const esDueno = rol === 'dueno';

  const [tab, setTab] = useState<'clientes' | 'resumen'>('clientes');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [nuevoOpen, setNuevoOpen] = useState(false);
  const [abonoOpen, setAbonoOpen] = useState(false);

  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [notas, setNotas] = useState('');
  const [savingCliente, setSavingCliente] = useState(false);

  const [montoAbono, setMontoAbono] = useState('');
  const [savingAbono, setSavingAbono] = useState(false);
  const [liquidarOpen, setLiquidarOpen] = useState(false);
  const [savingLiquidar, setSavingLiquidar] = useState(false);

  const selectedCliente = clientes.find((c) => c.id === selectedId) || null;

  const { data: movimientos = [] } = useQuery({
    queryKey: ['fiado-movimientos', selectedId],
    queryFn: () => getMovimientos(selectedId as string, negocioId as string),
    enabled: !!selectedId && !!negocioId,
  });

  const totalPendiente = clientes.reduce((s, c) => s + Number(c.saldo_pendiente || 0), 0);
  const clientesPorSaldo = [...clientes].sort(
    (a, b) => Number(b.saldo_pendiente) - Number(a.saldo_pendiente),
  );

  const saldoClass = (saldo: number) => (Number(saldo) > 0 ? 'text-red-500' : 'text-green-500');

  const handleCrearCliente = async () => {
    if (!nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    setSavingCliente(true);
    try {
      const nuevo = await crearCliente({
        nombre: nombre.trim(),
        telefono: telefono.trim() || null,
        notas: notas.trim() || null,
      });
      toast.success('Cliente creado');
      setNuevoOpen(false);
      setNombre('');
      setTelefono('');
      setNotas('');
      setSelectedId(nuevo.id);
    } catch (err) {
      toast.error('No se pudo crear el cliente', { description: getErrorMessage(err) });
    } finally {
      setSavingCliente(false);
    }
  };

  const handleAbono = async () => {
    const monto = parseFloat(montoAbono);
    if (!selectedId || !monto || monto <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    setSavingAbono(true);
    try {
      await abonar(selectedId, monto);
      toast.success('Abono registrado');
      setAbonoOpen(false);
      setMontoAbono('');
    } catch (err) {
      toast.error('No se pudo registrar el abono', { description: getErrorMessage(err) });
    } finally {
      setSavingAbono(false);
    }
  };

  const handleLiquidar = async () => {
    if (!selectedId || !selectedCliente || Number(selectedCliente.saldo_pendiente) <= 0) return;
    setSavingLiquidar(true);
    try {
      await abonar(selectedId, Number(selectedCliente.saldo_pendiente));
      toast.success('Saldo liquidado');
      setLiquidarOpen(false);
    } catch (err) {
      toast.error('No se pudo liquidar', { description: getErrorMessage(err) });
    } finally {
      setSavingLiquidar(false);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Fiado</h1>
        {tab === 'clientes' && (
          <button
            onClick={() => setNuevoOpen(true)}
            className="skeu-btn-primary h-10 px-4 rounded-xl font-bold text-sm flex items-center gap-1.5"
          >
            <UserPlus className="h-4 w-4" /> Nuevo cliente
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        <button
          onClick={() => setTab('clientes')}
          className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab === 'clientes' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
        >
          Clientes
        </button>
        {esDueno && (
          <button
            onClick={() => setTab('resumen')}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab === 'resumen' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'}`}
          >
            Resumen
          </button>
        )}
      </div>

      {/* TAB CLIENTES */}
      {tab === 'clientes' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Lista de clientes */}
          <div className="skeu-card p-3">
            {isLoading ? (
              <p className="text-sm text-muted-foreground py-4 text-center">Cargando…</p>
            ) : clientes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center italic">
                Aún no hay clientes de fiado. Crea el primero.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {clientes.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => setSelectedId(c.id)}
                      className={`w-full text-left py-2.5 px-2 rounded-lg flex items-center justify-between gap-2 transition-colors ${selectedId === c.id ? 'bg-muted' : 'hover:bg-muted/50'}`}
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-foreground truncate">{c.nombre}</span>
                        {c.telefono && <span className="block text-xs text-muted-foreground">{c.telefono}</span>}
                      </span>
                      <span className={`text-sm font-bold tabular-nums ${saldoClass(c.saldo_pendiente)}`}>
                        {formatMoney(c.saldo_pendiente, sym)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Panel del cliente seleccionado */}
          <div className="skeu-card p-4">
            {!selectedCliente ? (
              <p className="text-sm text-muted-foreground py-8 text-center italic">
                Selecciona un cliente para ver su historial.
              </p>
            ) : (
              <>
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-bold text-foreground truncate">{selectedCliente.nombre}</h2>
                    {selectedCliente.telefono && (
                      <p className="text-xs text-muted-foreground">{selectedCliente.telefono}</p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-muted-foreground">Saldo</p>
                    <p className={`text-xl font-black tabular-nums ${saldoClass(selectedCliente.saldo_pendiente)}`}>
                      {formatMoney(selectedCliente.saldo_pendiente, sym)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    onClick={() => setAbonoOpen(true)}
                    className="skeu-btn-primary h-10 rounded-xl font-bold text-sm flex items-center justify-center gap-1.5"
                  >
                    <ArrowDownCircle className="h-4 w-4" /> Abonar
                  </button>
                  <button
                    onClick={() => setLiquidarOpen(true)}
                    disabled={Number(selectedCliente.saldo_pendiente) <= 0}
                    className="skeu-btn-ghost h-10 rounded-xl font-bold text-sm text-foreground flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    Liquidar todo
                  </button>
                </div>

                <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-1">Historial</h3>
                {movimientos.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2 italic">Sin movimientos.</p>
                ) : (
                  <ul className="divide-y divide-border max-h-80 overflow-y-auto">
                    {movimientos.map((m) => (
                      <li key={m.id} className="py-2 flex items-center justify-between gap-2 text-sm">
                        <span className="min-w-0">
                          <span className="block text-foreground">
                            {m.tipo === 'cargo' ? 'Cargo' : 'Abono'}
                            {m.descripcion ? ` — ${m.descripcion}` : ''}
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {new Date(m.created_at).toLocaleString('es-MX', { dateStyle: 'short', timeStyle: 'short' })}
                          </span>
                        </span>
                        <span className={`font-bold tabular-nums ${m.tipo === 'cargo' ? 'text-red-500' : 'text-green-500'}`}>
                          {m.tipo === 'cargo' ? '+' : '−'}{formatMoney(m.monto, sym)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* TAB RESUMEN (solo dueño) */}
      {tab === 'resumen' && esDueno && (
        <div className="space-y-4">
          <div className="skeu-card p-5 flex items-center justify-between">
            <span className="text-sm font-semibold text-muted-foreground">Saldo pendiente total</span>
            <span className={`text-2xl font-black tabular-nums ${saldoClass(totalPendiente)}`}>
              {formatMoney(totalPendiente, sym)}
            </span>
          </div>
          <div className="skeu-card p-3">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wide mb-2 px-2">
              Clientes por saldo
            </h3>
            {clientesPorSaldo.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2 px-2 italic">Sin clientes.</p>
            ) : (
              <ul className="divide-y divide-border">
                {clientesPorSaldo.map((c) => (
                  <li key={c.id} className="py-2.5 px-2 flex items-center justify-between gap-2 text-sm">
                    <span className="text-foreground truncate">{c.nombre}</span>
                    <span className={`font-bold tabular-nums ${saldoClass(c.saldo_pendiente)}`}>
                      {formatMoney(c.saldo_pendiente, sym)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Modal: Nuevo cliente */}
      {nuevoOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setNuevoOpen(false)}>
          <div className="skeu-card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Nuevo cliente</h2>
              <button onClick={() => setNuevoOpen(false)} aria-label="Cerrar" className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Nombre *</label>
                <input
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="skeu-input w-full rounded-md bg-card px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Nombre del cliente"
                  autoFocus
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Teléfono</label>
                <input
                  value={telefono}
                  onChange={(e) => setTelefono(e.target.value)}
                  className="skeu-input w-full rounded-md bg-card px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Opcional"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">Notas</label>
                <input
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  className="skeu-input w-full rounded-md bg-card px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Opcional"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setNuevoOpen(false)} className="skeu-btn-ghost flex-1 h-10 rounded-xl font-bold text-sm text-foreground">Cancelar</button>
              <button onClick={handleCrearCliente} disabled={!nombre.trim() || savingCliente} className="skeu-btn-primary flex-1 h-10 rounded-xl font-bold text-sm disabled:opacity-50">
                {savingCliente ? 'Guardando…' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Registrar abono */}
      {abonoOpen && selectedCliente && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setAbonoOpen(false)}>
          <div className="skeu-card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Registrar abono</h2>
              <button onClick={() => setAbonoOpen(false)} aria-label="Cerrar" className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground mb-1">
              {selectedCliente.nombre} · saldo {formatMoney(selectedCliente.saldo_pendiente, sym)}
            </p>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">Monto del abono</label>
              <input
                type="number"
                value={montoAbono}
                onChange={(e) => setMontoAbono(e.target.value)}
                className="skeu-input w-full rounded-md bg-card px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-ring"
                placeholder="0.00"
                autoFocus
              />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setAbonoOpen(false)} className="skeu-btn-ghost flex-1 h-10 rounded-xl font-bold text-sm text-foreground">Cancelar</button>
              <button onClick={handleAbono} disabled={savingAbono} className="skeu-btn-primary flex-1 h-10 rounded-xl font-bold text-sm disabled:opacity-50">
                {savingAbono ? 'Guardando…' : 'Registrar abono'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Liquidar todo */}
      {liquidarOpen && selectedCliente && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setLiquidarOpen(false)}>
          <div className="skeu-card w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-foreground mb-2">Liquidar todo</h2>
            <p className="text-sm text-muted-foreground mb-4">
              ¿Registrar el abono completo de {formatMoney(selectedCliente.saldo_pendiente, sym)} para {selectedCliente.nombre}? Su saldo quedará en $0.
            </p>
            <div className="flex gap-2">
              <button onClick={() => setLiquidarOpen(false)} className="skeu-btn-ghost flex-1 h-10 rounded-xl font-bold text-sm text-foreground">Cancelar</button>
              <button onClick={handleLiquidar} disabled={savingLiquidar} className="skeu-btn-primary flex-1 h-10 rounded-xl font-bold text-sm disabled:opacity-50">
                {savingLiquidar ? 'Liquidando…' : 'Liquidar todo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
