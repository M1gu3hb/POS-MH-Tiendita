'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/AuthContext';
import { updateNombreVisible } from '@/lib/db/usuarios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  UserCircle, Mail, ShieldCheck, LogOut, FileText, Trash2, ExternalLink,
  AlertTriangle, Info, Loader2, MessageCircle, Phone, Clock, ShieldAlert,
  Volume2, VolumeX, Save,
} from 'lucide-react';
import { clearLocalPOSData } from '@/hooks/useUserScopedStorage';
import { LEGAL_CONFIG, buildWhatsAppLink, buildSupportMailto } from '@/utils/legalConfig';
import { useSoundEnabled } from '@/hooks/useSoundEnabled';
import { playScanSuccess } from '@/utils/audioFeedback';
import SuscripcionCard from '@/components/cuenta/SuscripcionCard';

export default function CuentaPage() {
  const router = useRouter();
  const { authUser, usuario, signOut, refreshUsuario } = useAuth();
  const queryClient = useQueryClient();
  const { enabled: soundEnabled, setEnabled: setSoundEnabledState } = useSoundEnabled();

  const [nombreVisible, setNombreVisible] = useState('');
  const [savingNombre, setSavingNombre] = useState(false);

  useEffect(() => {
    setNombreVisible(usuario?.nombre_visible || '');
  }, [usuario?.nombre_visible]);

  const handleSaveNombreVisible = async () => {
    const value = (nombreVisible || '').trim();
    if (!authUser) return;
    setSavingNombre(true);
    try {
      await updateNombreVisible(authUser.id, value);
      await refreshUsuario();
      toast.success('Nombre visible guardado.');
    } catch {
      toast.error('No se pudo guardar el nombre visible.');
    } finally {
      setSavingNombre(false);
    }
  };

  const handleToggleSound = (next) => {
    setSoundEnabledState(next);
    if (next) setTimeout(() => playScanSuccess(), 50);
  };

  const handleLogout = async () => {
    clearLocalPOSData();
    queryClient.clear();
    await signOut();
    router.push('/login');
  };

  // El borrado masivo de datos del negocio se hará server-side (cascade por
  // negocio_id con service role). Pendiente — ver docs/BUGS_PENDING.md.
  const handleDeleteAllData = () => {
    toast.info('La eliminación de datos se procesará desde soporte por ahora.', {
      description: 'Implementación server-side pendiente.',
    });
  };

  const waLink = buildWhatsAppLink(`Hola, necesito ayuda con ${LEGAL_CONFIG.appName}. Mi correo es ${authUser?.email || '(sin correo)'}.`);
  const mailLink = buildSupportMailto(`Soporte ${LEGAL_CONFIG.appName}`, `Hola, necesito ayuda con ${LEGAL_CONFIG.appName}.\n\nMi correo: ${authUser?.email || ''}\n\nDescribe tu problema aquí:`);
  const waChangeEmail = buildWhatsAppLink(`Hola, quiero solicitar cambio de correo / transferencia de cuenta en ${LEGAL_CONFIG.appName}. Mi correo actual es ${authUser?.email || '(sin correo)'}.`);
  const mailChangeEmail = buildSupportMailto(`Cambio de correo - ${LEGAL_CONFIG.appName}`, `Hola, quiero solicitar cambio de correo / transferencia de cuenta.\n\nMi correo actual: ${authUser?.email || ''}\nNuevo correo deseado: \n\nMotivo: `);
  const changeEmailHref = waChangeEmail || mailChangeEmail || null;
  const waDelete = buildWhatsAppLink(`Hola, quiero solicitar la eliminación de mi cuenta en ${LEGAL_CONFIG.appName}. Mi correo es ${authUser?.email || '(sin correo)'}.`);
  const mailDelete = buildSupportMailto(`Solicitud eliminación de cuenta - ${LEGAL_CONFIG.appName}`, `Hola, quiero solicitar la eliminación de mi cuenta.\n\nMi correo: ${authUser?.email || ''}`);
  const accountDeletionHref = LEGAL_CONFIG.accountDeletionUrl || waDelete || mailDelete || null;

  const Row = ({ icon, label, value, mono = false }) => (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">{icon}</div>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <span className={`text-sm font-semibold text-foreground truncate ${mono ? 'font-mono text-xs' : ''}`}>{value || '—'}</span>
    </div>
  );

  const LinkRow = ({ label, href }) => {
    if (!href) {
      return (
        <div className="flex items-center justify-between p-3 rounded-lg border border-dashed border-border bg-muted/30">
          <span className="text-sm font-medium text-muted-foreground">{label}</span>
          <span className="text-[11px] text-muted-foreground italic">Pendiente de configurar</span>
        </div>
      );
    }
    return (
      <a href={href} target={href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors">
        <span className="text-sm font-medium text-foreground">{label}</span>
        <ExternalLink className="h-4 w-4 text-muted-foreground" />
      </a>
    );
  };

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 max-w-2xl mx-auto pb-24 lg:pb-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <UserCircle className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Cuenta</h1>
          <p className="text-xs text-muted-foreground">Tu información, soporte y privacidad</p>
        </div>
      </div>

      <div className="skeu-panel p-5">
        <h2 className="font-bold text-foreground mb-2 text-sm uppercase tracking-wide flex items-center gap-2">
          <UserCircle className="h-4 w-4 text-primary" /> Perfil
        </h2>
        <Row icon={<Mail className="h-4 w-4 text-primary" />} label="Correo de acceso" value={authUser?.email} />
        <Row icon={<ShieldCheck className="h-4 w-4 text-primary" />} label="Rol" value={usuario?.rol || 'cajero'} />

        <div className="mt-4 pt-4 border-t border-border">
          <Label htmlFor="nombre-visible" className="text-sm font-semibold text-foreground">Nombre visible / cajero</Label>
          <p className="text-[11px] text-muted-foreground mb-2">Este nombre aparece en tickets, cortes de caja y reportes. No se usa para iniciar sesión.</p>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input id="nombre-visible" value={nombreVisible} onChange={(e) => setNombreVisible(e.target.value)} placeholder="Ej. Don José / Cajero principal" maxLength={60} disabled={savingNombre} className="flex-1" />
            <Button onClick={handleSaveNombreVisible} disabled={savingNombre || (nombreVisible || '').trim() === (usuario?.nombre_visible || '').trim()} className="skeu-btn-primary">
              {savingNombre ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
              Guardar
            </Button>
          </div>
        </div>

        <div className="mt-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 flex gap-2">
          <ShieldAlert className="h-4 w-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-[12px] text-amber-900 dark:text-amber-200 leading-snug">
            Este correo pertenece a tu cuenta de inicio de sesión. Si necesitas cambiarlo, contacta soporte para solicitar transferencia de datos a otra cuenta.
          </p>
        </div>

        {changeEmailHref && (
          <a href={changeEmailHref} target={changeEmailHref.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="mt-2 inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg border border-border text-sm font-semibold hover:bg-secondary/50 transition-colors w-full sm:w-auto">
            <Mail className="h-4 w-4" /> Solicitar cambio de correo
          </a>
        )}
      </div>

      <SuscripcionCard />

      <div className="skeu-panel p-5">
        <h2 className="font-bold text-foreground mb-3 text-sm uppercase tracking-wide flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" /> Soporte
        </h2>
        <div className="space-y-2 mb-3">
          <Row icon={<Phone className="h-4 w-4 text-primary" />} label="Teléfono / WhatsApp" value={LEGAL_CONFIG.supportPhone} mono />
          <Row icon={<Mail className="h-4 w-4 text-primary" />} label="Correo" value={LEGAL_CONFIG.supportEmailVerified ? LEGAL_CONFIG.supportEmail : 'Pendiente'} />
          <Row icon={<Clock className="h-4 w-4 text-primary" />} label="Horario" value={LEGAL_CONFIG.supportHours} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {waLink ? (
            <a href={waLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 h-11 rounded-lg bg-green-600 hover:bg-green-700 text-white font-bold text-sm transition-colors">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          ) : (
            <a href={`tel:${LEGAL_CONFIG.supportPhone}`} className="inline-flex items-center justify-center gap-2 h-11 rounded-lg border border-border bg-card hover:bg-secondary/50 text-foreground font-bold text-sm transition-colors">
              <Phone className="h-4 w-4" /> Llamar
            </a>
          )}
          {mailLink && (
            <a href={mailLink} className="inline-flex items-center justify-center gap-2 h-11 rounded-lg border border-border bg-card hover:bg-secondary/50 text-foreground font-bold text-sm transition-colors">
              <Mail className="h-4 w-4" /> Enviar correo
            </a>
          )}
        </div>
      </div>

      <div className="skeu-panel p-5">
        <h2 className="font-bold text-foreground mb-3 text-sm uppercase tracking-wide flex items-center gap-2">
          {soundEnabled ? <Volume2 className="h-4 w-4 text-primary" /> : <VolumeX className="h-4 w-4 text-primary" />}
          Preferencias
        </h2>
        <div className="flex items-center justify-between py-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Sonidos del sistema</p>
            <p className="text-xs text-muted-foreground mt-0.5">Beep corto al escanear, error y venta cobrada. Se guarda en este dispositivo.</p>
          </div>
          <Switch checked={soundEnabled} onCheckedChange={handleToggleSound} />
        </div>
      </div>

      <div className="skeu-panel p-5">
        <h2 className="font-bold text-foreground mb-3 text-sm uppercase tracking-wide flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" /> Sesión
        </h2>
        <p className="text-sm text-muted-foreground mb-3">Al cerrar sesión se limpiará el carrito local y los datos guardados en este dispositivo.</p>
        <Button onClick={handleLogout} className="skeu-btn-danger w-full sm:w-auto">
          <LogOut className="h-4 w-4 mr-1" /> Cerrar sesión
        </Button>
      </div>

      <div className="skeu-panel p-5">
        <h2 className="font-bold text-foreground mb-3 text-sm uppercase tracking-wide flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" /> Privacidad y términos
        </h2>
        <div className="space-y-2">
          <LinkRow label="Política de privacidad" href={LEGAL_CONFIG.privacyPolicyUrl} />
          <LinkRow label="Términos y condiciones" href={LEGAL_CONFIG.termsUrl} />
          <LinkRow label="Solicitar eliminación de cuenta" href={accountDeletionHref} />
        </div>
      </div>

      <div className="skeu-panel p-5 border-2 border-red-500/30">
        <h2 className="font-bold text-red-600 dark:text-red-400 mb-2 text-sm uppercase tracking-wide flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> Zona peligrosa
        </h2>
        <div>
          <p className="text-sm font-semibold text-foreground mb-1">Eliminar mis datos del POS</p>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            Esto elimina productos, ventas, cortes, reportes, compras, gastos, inventario, carritos y configuración asociados a esta cuenta.
          </p>
          <Button onClick={handleDeleteAllData} variant="outline" className="border-red-500/50 text-red-600 dark:text-red-400 hover:bg-red-500/10 w-full sm:w-auto">
            <Trash2 className="h-4 w-4 mr-1" /> Eliminar mis datos del POS
          </Button>
        </div>
      </div>

      <div className="text-center text-xs text-muted-foreground py-2">{LEGAL_CONFIG.appName} — v{LEGAL_CONFIG.version}</div>
    </div>
  );
}
