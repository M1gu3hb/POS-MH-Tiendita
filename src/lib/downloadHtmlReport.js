/**
 * Descarga un HTML imprimible como archivo .html.
 * Sirve para “Guardar archivo” sin abrir el diálogo de imprimir.
 *
 * Notas:
 *  - El archivo descargado abre en cualquier navegador, se ve como el PDF y
 *    el usuario puede guardarlo como PDF desde el navegador si quiere.
 *  - Esto evita depender de jsPDF binario para no inflar bundle.
 */
export function downloadHtmlReport({ filename, title, contentHtml, extraCss = '' }) {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8" />
<title>${escapeHtml(title || filename)}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background:#fff; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #111; }
  ${extraCss}
</style>
</head>
<body>
<div class="printable-doc">${contentHtml}</div>
</body>
</html>`;
  try {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.endsWith('.html') ? filename : `${filename}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch (err) {
    console.warn('[downloadHtmlReport] error:', err);
    return false;
  }
}

function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
}

/** Slug seguro para nombre de archivo basado en fecha. */
export function reportFilename(prefix, date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${prefix}-${y}-${m}-${d}-${h}${min}.html`;
}