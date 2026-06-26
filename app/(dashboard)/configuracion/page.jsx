'use client';

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import QRCode from 'qrcode';
import { useAuth } from '@/lib/auth/AuthContext';
import { getConfiguracion, updateConfiguracion } from '@/lib/db/configuracion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Save, Upload } from 'lucide-react';
import BaseDatosTab from '@/components/configuracion/BaseDatosTab';
import { useBascula } from '@/hooks/useBascula';

// Nota: el nombre del negocio vive en la tabla `negocios`, no en
// `configuracion_negocio`; por eso ya no se edita aquí (ver docs/BUGS_PENDING.md).
export default function ConfiguracionPage() {
  const { negocioId } = useAuth();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [savingQr, setSavingQr] = useState(false);
  const [savingHardware, setSavingHardware] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  const { data: config } = useQuery({
    queryKey: ['config-negocio', negocioId],
    queryFn: () => getConfiguracion(negocioId),
    enabled: !!negocioId,
  });

  const [form, setForm] = useState({});

  useEffect(() => {
    if (config) {
      setForm({
        logo_url: config.logo_url || '',
        direccion: config.direccion || '',
        telefono: config.telefono || '',
        whatsapp: config.whatsapp || '',
        correo: config.correo || '',
        moneda: config.moneda || 'MXN',
        simbolo_moneda: config.simbolo_moneda || '$',
        mensaje_ticket: config.mensaje_ticket || '¡Gracias por su compra!',
        color_primario: config.color_primario || '#2563eb',
        color_secundario: config.color_secundario || '#1e40af',
        permitir_venta_sin_stock: config.permitir_venta_sin_stock || false,
        activar_mayoreo: config.activar_mayoreo || false,
        activar_descuentos: config.activar_descuentos !== false,
        vista_cliente_activa: config.vista_cliente_activa !== false,
        abrir_caja_obligatorio: config.abrir_caja_obligatorio !== false,
        iva_porcentaje: config.iva_porcentaje || 0,
        mostrar_logo_ticket: config.mostrar_logo_ticket !== false,
        qr_url: config.qr_url || '',
        escaner_fisico_activo: config.escaner_fisico_activo || false,
        bascula_activa: config.bascula_activa || false,
      });
    }
  }, [config]);

  const bascula = useBascula(form);

  useEffect(() => {
    const url = form.qr_url?.trim();
    let cancelled = false;
    if (!url) {
      setQrDataUrl('');
      return () => { cancelled = true; };
    }
    QRCode.toDataURL(url, { width: 150, margin: 1 })
      .then((dataUrl) => {
        if (!cancelled) setQrDataUrl(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('');
      });
    return () => { cancelled = true; };
  }, [form.qr_url]);

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await updateConfiguracion(negocioId, form);
      queryClient.invalidateQueries({ queryKey: ['config-negocio'] });
      toast.success('Configuración guardada');
    } catch {
      toast.error('Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/storage/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || 'upload failed');
      setForm((prev) => ({ ...prev, logo_url: data.url }));
      toast.success('Logo cargado');
    } catch {
      toast.error('Error al cargar imagen');
    }
  };

  const handleSaveQr = async () => {
    if (!config) return;
    setSavingQr(true);
    try {
      await updateConfiguracion(negocioId, { qr_url: form.qr_url?.trim() || null });
      queryClient.invalidateQueries({ queryKey: ['config-negocio'] });
      toast.success('URL de QR guardada');
    } catch {
      toast.error('Error al guardar URL');
    } finally {
      setSavingQr(false);
    }
  };

  const handleHardwareToggle = async (field, value) => {
    const valorAnterior = form[field] || false;
    update(field, value);

    if (!config) return;

    setSavingHardware(true);
    try {
      await updateConfiguracion(negocioId, { [field]: value });
      queryClient.invalidateQueries({ queryKey: ['config-negocio'] });
      toast.success('Configuración de hardware guardada');
    } catch {
      update(field, valorAnterior);
      toast.error('Error al guardar hardware');
    } finally {
      setSavingHardware(false);
    }
  };

  const handleConectarBascula = async () => {
    try {
      await bascula.conectar();
      toast.success('Báscula conectada');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al conectar báscula');
    }
  };

  const update = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">Configuración</h1>
        <Button onClick={handleSave} disabled={saving} className="bg-primary">
          <Save className="h-4 w-4 mr-1" /> {saving ? 'Guardando...' : 'Guardar'}
        </Button>
      </div>

      <Tabs defaultValue="identidad">
        <div className="overflow-x-auto -mx-4 md:mx-0 px-4 md:px-0 pb-1" style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}>
          <TabsList className="inline-flex w-max gap-1">
            <TabsTrigger value="identidad">Identidad</TabsTrigger>
            <TabsTrigger value="operacion">Operación</TabsTrigger>
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
            <TabsTrigger value="hardware">Hardware</TabsTrigger>
            <TabsTrigger value="visual">Visual</TabsTrigger>
            <TabsTrigger value="basedatos">Base de datos</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="identidad" className="mt-4 space-y-4">
          <div className="skeu-panel p-5 space-y-4">
            <div>
              <Label>Logo</Label>
              <div className="flex items-center gap-4 mt-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {form.logo_url && <img src={form.logo_url} alt="Logo" className="h-16 w-16 rounded-xl object-contain bg-muted" />}
                <label className="flex items-center gap-2 px-4 py-2 rounded-lg border border-border bg-muted hover:bg-muted/80 cursor-pointer transition-colors text-sm">
                  <Upload className="h-4 w-4" /> Cambiar logo
                  <input type="file" accept="image/*" onChange={handleLogoUpload} className="hidden" />
                </label>
              </div>
            </div>
            <div>
              <Label>Dirección</Label>
              <Input value={form.direccion || ''} onChange={(e) => update('direccion', e.target.value)} className="mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Teléfono</Label>
                <Input value={form.telefono || ''} onChange={(e) => update('telefono', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>WhatsApp</Label>
                <Input value={form.whatsapp || ''} onChange={(e) => update('whatsapp', e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>Correo</Label>
              <Input value={form.correo || ''} onChange={(e) => update('correo', e.target.value)} className="mt-1" />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="operacion" className="mt-4 space-y-4">
          <div className="skeu-panel p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Moneda</Label>
                <Input value={form.moneda || ''} onChange={(e) => update('moneda', e.target.value)} className="mt-1" />
              </div>
              <div>
                <Label>Símbolo</Label>
                <Input value={form.simbolo_moneda || ''} onChange={(e) => update('simbolo_moneda', e.target.value)} className="mt-1" />
              </div>
            </div>
            <div>
              <Label>IVA (%)</Label>
              <Input type="number" value={form.iva_porcentaje || 0} onChange={(e) => update('iva_porcentaje', parseFloat(e.target.value) || 0)} className="mt-1" />
            </div>
            <div className="space-y-3">
              {[
                ['permitir_venta_sin_stock', 'Permitir venta sin stock'],
                ['activar_mayoreo', 'Activar precios de mayoreo'],
                ['activar_descuentos', 'Activar descuentos'],
                ['vista_cliente_activa', 'Activar vista cliente'],
                ['abrir_caja_obligatorio', 'Abrir caja obligatorio para vender'],
              ].map(([key, label]) => (
                <div key={key} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <Label className="text-sm">{label}</Label>
                  <Switch checked={form[key] || false} onCheckedChange={(v) => update(key, v)} />
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tickets" className="mt-4 space-y-4">
          <div className="skeu-panel p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Label>Mostrar logo en ticket</Label>
              <Switch checked={form.mostrar_logo_ticket || false} onCheckedChange={(v) => update('mostrar_logo_ticket', v)} />
            </div>
            <div>
              <Label>Mensaje final del ticket</Label>
              <Input value={form.mensaje_ticket || ''} onChange={(e) => update('mensaje_ticket', e.target.value)} className="mt-1" />
            </div>
            <div className="pt-3 border-t border-border">
              <h2 className="font-bold text-foreground text-sm mb-3">Código QR del negocio</h2>
              <Label>URL de tu página (Facebook, Instagram, sitio web...)</Label>
              <div className="flex flex-col sm:flex-row gap-2 mt-1">
                <Input
                  value={form.qr_url || ''}
                  onChange={(e) => update('qr_url', e.target.value)}
                  placeholder="https://facebook.com/mi-tienda"
                  className="flex-1"
                />
                <Button type="button" onClick={handleSaveQr} disabled={savingQr} className="bg-primary">
                  {savingQr ? 'Guardando...' : 'Guardar URL'}
                </Button>
              </div>
              {form.qr_url && qrDataUrl && (
                <div className="mt-3 flex items-center justify-center sm:justify-start">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrDataUrl} alt="Código QR del negocio" className="h-[150px] w-[150px] rounded-lg bg-white p-2 border border-border" />
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="hardware" className="mt-4 space-y-4">
          <div className="skeu-panel p-5 space-y-5">
            <div>
              <h2 className="font-bold text-foreground text-sm">Hardware</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Dispositivos conectados para agilizar la venta en tienda.
              </p>
            </div>

            <div className="flex items-start justify-between gap-4 py-3 border-b border-border">
              <div>
                <Label className="text-sm">Escáner físico (USB/Bluetooth)</Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Si tienes un lector de código de barras conectado, actívalo para escanear productos directamente.
                </p>
              </div>
              <Switch
                checked={form.escaner_fisico_activo || false}
                disabled={savingHardware}
                onCheckedChange={(value) => handleHardwareToggle('escaner_fisico_activo', value)}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <Label className="text-sm">Báscula conectada</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Para vender productos por peso. Requiere báscula con conexión USB y navegador Chrome o Edge.
                  </p>
                </div>
                <Switch
                  checked={form.bascula_activa || false}
                  disabled={savingHardware}
                  onCheckedChange={(value) => handleHardwareToggle('bascula_activa', value)}
                />
              </div>

              {form.bascula_activa && (
                <div className="rounded-lg border border-border bg-muted/50 p-3 space-y-3">
                  {!bascula.soportada && (
                    <p className="text-xs text-destructive">
                      Tu navegador no soporta conexión de báscula. Usa Chrome o Edge.
                    </p>
                  )}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <Button
                      type="button"
                      onClick={handleConectarBascula}
                      disabled={!bascula.soportada || bascula.conectada}
                      className="bg-primary"
                    >
                      Conectar báscula
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      {bascula.conectada ? 'Báscula conectada' : 'Báscula no conectada'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="visual" className="mt-4 space-y-4">
          <div className="skeu-panel p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Color primario</Label>
                <div className="flex gap-2 mt-1">
                  <input type="color" value={form.color_primario || '#2563eb'} onChange={(e) => update('color_primario', e.target.value)} className="h-10 w-12 rounded-lg cursor-pointer border border-border" />
                  <Input value={form.color_primario || ''} onChange={(e) => update('color_primario', e.target.value)} className="skeu-input" />
                </div>
              </div>
              <div>
                <Label>Color secundario</Label>
                <div className="flex gap-2 mt-1">
                  <input type="color" value={form.color_secundario || '#1e40af'} onChange={(e) => update('color_secundario', e.target.value)} className="h-10 w-12 rounded-lg cursor-pointer border border-border" />
                  <Input value={form.color_secundario || ''} onChange={(e) => update('color_secundario', e.target.value)} className="skeu-input" />
                </div>
              </div>
            </div>
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Estilo visual: <strong>Premium Skeuomorphic</strong> — Activo en toda la interfaz.
                Los tickets y documentos imprimibles siempre son blancos independientemente del estilo.
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="basedatos" className="mt-4">
          <BaseDatosTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
