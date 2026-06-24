/**
 * Genera y descarga un PDF real desde un elemento del DOM.
 *
 * Usa html2canvas para rasterizar el HTML y jsPDF para empaquetarlo en
 * un PDF formato carta. Multi-página si el contenido excede una hoja.
 *
 * NO imprime, NO abre diálogo de impresión.
 *
 * @param {HTMLElement} element - nodo .printable-doc a convertir.
 * @param {string} filename - nombre del archivo (sin extensión, se añade .pdf).
 * @returns {Promise<boolean>} true si descargó, false en error.
 */
export async function downloadPdfFromElement({ element, filename }) {
  if (!element) return false;
  try {
    // Imports dinámicos para no inflar bundle inicial.
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
      import('html2canvas'),
      import('jspdf'),
    ]);

    // Render a canvas de alta resolución
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });

    // Carta: 215.9mm x 279.4mm. Margen interno 12mm.
    const pdf = new jsPDF({ unit: 'mm', format: 'letter', orientation: 'portrait' });
    const pageWidthMm = pdf.internal.pageSize.getWidth();   // 215.9
    const pageHeightMm = pdf.internal.pageSize.getHeight(); // 279.4
    const marginMm = 12;
    const usableW = pageWidthMm - marginMm * 2;
    const usableH = pageHeightMm - marginMm * 2;

    // Convertir px -> mm proporcionalmente
    const imgW = usableW;
    const imgH = (canvas.height * imgW) / canvas.width;

    if (imgH <= usableH) {
      // Cabe en una sola página
      pdf.addImage(canvas, 'PNG', marginMm, marginMm, imgW, imgH, undefined, 'FAST');
    } else {
      // Multi-página: ir desplazando la imagen verticalmente
      let heightLeft = imgH;
      let position = marginMm;
      pdf.addImage(canvas, 'PNG', marginMm, position, imgW, imgH, undefined, 'FAST');
      heightLeft -= usableH;
      while (heightLeft > 0) {
        position = marginMm - (imgH - heightLeft);
        pdf.addPage();
        pdf.addImage(canvas, 'PNG', marginMm, position, imgW, imgH, undefined, 'FAST');
        heightLeft -= usableH;
      }
    }

    const finalName = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;
    pdf.save(finalName);
    return true;
  } catch (err) {
    console.warn('[downloadPdfFromElement] error:', err);
    return false;
  }
}

/** Slug seguro para nombre de archivo basado en fecha. */
export function pdfFilename(prefix, date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  return `${prefix}-${y}-${m}-${d}-${h}${min}.pdf`;
}