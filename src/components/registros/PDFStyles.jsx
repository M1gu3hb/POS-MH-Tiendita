'use client';
// Estilos compartidos para vista previa e impresión de PDFs.
// Se inyectan tanto dentro del modal (preview) como en la ventana window.open() (print).
// IMPORTANTE: scoped a .printable-doc para no afectar al resto de la app.

export const PDF_STYLES = `
.printable-doc {
  font-family: Arial, Helvetica, sans-serif;
  font-size: 12px;
  color: #111827 !important;
  background: #ffffff !important;
  line-height: 1.4;
}
.printable-doc * {
  box-sizing: border-box;
  color: inherit;
}
.printable-doc h1 {
  font-size: 20px;
  font-weight: 700;
  margin: 0 0 4px 0;
  color: #111827 !important;
}
.printable-doc h2 {
  font-size: 14px;
  font-weight: 700;
  margin: 18px 0 8px 0;
  padding-bottom: 4px;
  border-bottom: 1px solid #d1d5db;
  color: #111827 !important;
}
.printable-doc h3 {
  font-size: 12px;
  font-weight: 700;
  margin: 14px 0 6px 0;
  color: #111827 !important;
}
.printable-doc p {
  margin: 0 0 6px 0;
}
.printable-doc table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 10px;
  font-size: 11px;
}
.printable-doc th {
  background: #f3f4f6 !important;
  text-align: left;
  padding: 6px 8px;
  font-size: 11px;
  border: 1px solid #d1d5db;
  font-weight: 700;
  color: #111827 !important;
}
.printable-doc td {
  padding: 5px 8px;
  border: 1px solid #e5e7eb;
  font-size: 11px;
  color: #111827 !important;
}
.printable-doc .right { text-align: right; }
.printable-doc .center { text-align: center; }
.printable-doc .green { color: #16a34a !important; }
.printable-doc .red { color: #dc2626 !important; }
.printable-doc .bold { font-weight: 700; }

.printable-doc .kpi-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 10px;
}
.printable-doc .kpi {
  border: 1px solid #d1d5db;
  padding: 10px;
  border-radius: 4px;
  background: #ffffff;
}
.printable-doc .kpi-label {
  font-size: 10px;
  color: #6b7280 !important;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.printable-doc .kpi-val {
  font-size: 16px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.printable-doc .note {
  font-size: 10px;
  color: #6b7280 !important;
  border: 1px solid #d1d5db;
  padding: 10px;
  border-radius: 4px;
  margin-top: 16px;
  background: #f9fafb;
}
.printable-doc .pdf-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.printable-doc .pdf-header img {
  height: 48px;
  width: 48px;
  object-fit: contain;
  border-radius: 6px;
}
.printable-doc .pdf-meta {
  font-size: 11px;
  color: #6b7280 !important;
  margin-bottom: 12px;
}

@media (max-width: 640px) {
  .printable-doc .kpi-grid { grid-template-columns: repeat(2, 1fr); }
}

/* Impresión carta para reportes. NO afecta tickets 80mm (que viven en index.css). */
@media print {
  @page { size: letter; margin: 12mm; }
  html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; }
  .pdf-modal-overlay, .pdf-toolbar, .no-print { display: none !important; }
  .printable-doc {
    display: block !important;
    background: #fff !important;
    color: #111 !important;
    box-shadow: none !important;
    border: none !important;
    border-radius: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 auto !important;
    padding: 0 !important;
  }
  table { page-break-inside: auto; }
  tr { page-break-inside: avoid; page-break-after: auto; }
  thead { display: table-header-group; }
}
`;

export default function PDFStyles() {
  return <style dangerouslySetInnerHTML={{ __html: PDF_STYLES }} />;
}