/**
 * Configuración legal centralizada del SaaS POS MH Tiendita.
 *
 * Reglas:
 *  - Estos valores pertenecen al SaaS (desarrollador), NO al negocio del cliente.
 *  - Para cambiar URLs en producción, edita SOLO este archivo y publica.
 *  - Si una URL está vacía (""), la UI mostrará "Pendiente de configurar".
 *  - NUNCA usar URLs genéricas de terceros (iubenda.com, etc) en producción.
 */
export const LEGAL_CONFIG = {
  appName: 'POS MH Tiendita',
  version: '1.0.0',

  // --- Soporte ---
  // TODO: Validar si 552311898953 puede usarse como WhatsApp.
  // Formato esperado para wa.me: solo dígitos con código de país (52 = México).
  // 552311898953 = 12 dígitos => formato candidato para México móvil.
  supportPhone: '552311898953',
  // El número parece válido como WhatsApp México; si NO se confirma,
  // cambiar `supportWhatsappEnabled` a false y la UI usará tel: en su lugar.
  supportWhatsappEnabled: true,

  // TODO: Reemplazar por correo real antes de producción.
  supportEmail: 'soporte@posmh.app',
  supportEmailVerified: false, // false => UI muestra aviso "pendiente de configurar"

  supportHours: 'Lun a Sáb · 9:00 a 19:00 (CDMX)',

  // --- Documentos legales del SaaS ---
  // Si están vacíos, los botones se muestran como "Pendiente de configurar"
  // y NO se abren enlaces genéricos.
  privacyPolicyUrl: '',
  termsUrl: '',
  accountDeletionUrl: '',
};

/** Construye link wa.me con texto precargado. Devuelve null si WhatsApp no está habilitado. */
export function buildWhatsAppLink(text = 'Hola, necesito ayuda con POS MH Tiendita') {
  if (!LEGAL_CONFIG.supportWhatsappEnabled || !LEGAL_CONFIG.supportPhone) return null;
  const digits = String(LEGAL_CONFIG.supportPhone).replace(/\D/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** Construye link mailto a soporte. Devuelve null si el correo aún no está verificado. */
export function buildSupportMailto(subject = 'Soporte POS MH Tiendita', body = '') {
  if (!LEGAL_CONFIG.supportEmail || !LEGAL_CONFIG.supportEmailVerified) return null;
  const params = new URLSearchParams();
  if (subject) params.set('subject', subject);
  if (body) params.set('body', body);
  return `mailto:${LEGAL_CONFIG.supportEmail}?${params.toString()}`;
}