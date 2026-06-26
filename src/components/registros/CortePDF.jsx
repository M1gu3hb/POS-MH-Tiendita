'use client';
import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/utils/currency';
import { X, Printer, Download, Loader2 } from 'lucide-react';
import PDFStyles, { PDF_STYLES } from './PDFStyles';
import { downloadPdfFromElement, pdfFilename } from '@/lib/downloadPdfReport';
import { downloadHtmlReport, reportFilename } from '@/lib/downloadHtmlReport';
import { useNegocio } from '@/hooks/useNegocio';
import { toast } from 'sonner';

/**
 * Preview e impresión/descarga del Corte de Caja.
 *
 * Props:
 *  - corte, config, sym, onClose
 *  - autoDownload (bool): si true, descarga el archivo automáticamente al montar.
 *    Útil cuando se abre justo después de cerrar caja.
 */
export default function CortePDF({ corte, config, sym, onClose, autoDownload = false }) {
  const printRef = useRef(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  // El nombre del negocio vive en `negocios.nombre` (no en configuracion_negocio).
  const { negocio } = useNegocio();

  // Cerrar con tecla Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Descarga automática si autoDownload=true
  useEffect(() => {
    if (!autoDownload) return;
    const t = setTimeout(() => { handleDownloadPdf(); }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoDownload]);

  // Imprimir: abre diálogo nativo, NO descarga.
  const handlePrint = () => {
    const content = printRef.current?.innerHTML || '';
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Corte de Caja — ${corte.cajero_nombre || ''}</title><style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { background:#fff; }
      ${PDF_STYLES}
    </style></head><body><div class="printable-doc">${content}</div></body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  // Descarga PDF real (jspdf + html2canvas). NO imprime.
  const handleDownloadPdf = async () => {
    if (generatingPdf) return;
    setGeneratingPdf(true);
    try {
      const filename = pdfFilename('corte-caja', corte.fecha_cierre ? new Date(corte.fecha_cierre) : new Date());
      const ok = await downloadPdfFromElement({ element: printRef.current, filename });
      if (!ok) {
        toast.error('No se pudo generar PDF. Descargando archivo HTML como respaldo.');
        const content = printRef.current?.innerHTML || '';
        downloadHtmlReport({
          filename: reportFilename('corte-caja', corte.fecha_cierre ? new Date(corte.fecha_cierre) : new Date()),
          title: `Corte de Caja — ${corte.cajero_nombre || ''}`,
          contentHtml: content,
          extraCss: PDF_STYLES,
        });
      }
    } finally {
      setGeneratingPdf(false);
    }
  };

  const fmtDate = (d) => d ? new Date(d).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' }) : '-';
  const f = (v) => formatMoney(v, sym);
  const costoVenta = corte.utilidad_bruta !== undefined ? (corte.total_ventas - corte.utilidad_bruta) : 0;

  return (
    <div
      className="pdf-modal-overlay fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-hidden"
      onClick={onClose}
    >
      <PDFStyles />
      <div
        className="bg-gray-100 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar — botones separados */}
        <div className="pdf-toolbar no-print flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-gray-800 text-white flex-shrink-0">
          <h2 className="font-bold text-sm sm:text-lg truncate pr-2">Corte de Caja — {corte.cajero_nombre}</h2>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleDownloadPdf} disabled={generatingPdf} className="bg-blue-600 hover:bg-blue-700 text-white h-9 disabled:opacity-60" title="Descargar PDF">
              {generatingPdf ? <Loader2 className="h-4 w-4 sm:mr-1.5 animate-spin" /> : <Download className="h-4 w-4 sm:mr-1.5" />}
              <span className="hidden sm:inline">{generatingPdf ? 'Generando…' : 'Descargar PDF'}</span>
            </Button>
            <Button size="sm" onClick={handlePrint} className="bg-green-600 hover:bg-green-700 text-white h-9" title="Imprimir">
              <Printer className="h-4 w-4 sm:mr-1.5" /> <span className="hidden sm:inline">Imprimir</span>
            </Button>
            <Button size="sm" onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white h-9">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Preview area */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6 bg-gray-100 flex items-start justify-center">
          <div
            className="bg-white shadow-lg w-full"
            style={{ maxWidth: '850px', borderRadius: 6, padding: 32 }}
          >
            <div ref={printRef} className="printable-doc">
              {/* Header */}
              <div className="pdf-header">
                {config?.logo_url && <img src={config.logo_url} alt="" />}
                <div>
                  <h1>{negocio?.nombre || config?.nombre_negocio || 'Negocio'}</h1>
                  {config?.direccion && <p style={{ fontSize: 11, color: '#6b7280' }}>{config.direccion}</p>}
                  {config?.telefono && <p style={{ fontSize: 11, color: '#6b7280' }}>Tel: {config.telefono}</p>}
                </div>
              </div>

              <h2>Corte de Caja</h2>
              <table style={{ marginBottom: 16 }}>
                <tbody>
                  <tr><td>Cajero</td><td className="bold">{corte.cajero_nombre}</td></tr>
                  <tr><td>Apertura</td><td>{fmtDate(corte.fecha_apertura)}</td></tr>
                  <tr><td>Cierre</td><td>{fmtDate(corte.fecha_cierre)}</td></tr>
                  <tr><td>Fondo inicial</td><td>{f(corte.fondo_inicial)}</td></tr>
                  <tr><td>Número de ventas</td><td>{corte.numero_ventas || 0}</td></tr>
                </tbody>
              </table>

              <h2>Resumen financiero</h2>
              <table>
                <tbody>
                  <tr><td>Ventas totales</td><td className="right bold">{f(corte.total_ventas)}</td></tr>
                  <tr><td>Efectivo</td><td className="right">{f(corte.total_efectivo)}</td></tr>
                  <tr><td>Tarjeta</td><td className="right">{f(corte.total_tarjeta)}</td></tr>
                  <tr><td>Transferencia</td><td className="right">{f(corte.total_transferencia)}</td></tr>
                  <tr><td>Costo de venta (snapshot)</td><td className="right">{f(costoVenta)}</td></tr>
                  <tr><td>Utilidad bruta</td><td className="right bold green">{f(corte.utilidad_bruta)}</td></tr>
                  <tr><td>Gastos operativos</td><td className="right red">{f(corte.total_gastos)}</td></tr>
                  <tr><td className="bold">Utilidad neta estimada</td><td className={`right bold ${(corte.utilidad_neta_estimada||0)>=0?'green':'red'}`}>{f(corte.utilidad_neta_estimada)}</td></tr>
                </tbody>
              </table>

              <h2>Arqueo de caja</h2>
              <table>
                <tbody>
                  <tr><td>Fondo inicial registrado</td><td className="right">{f(corte.fondo_inicial)}</td></tr>
                  <tr><td>Efectivo esperado</td><td className="right">{f(corte.efectivo_esperado)}</td></tr>
                  <tr><td>Efectivo contado físicamente</td><td className="right bold">{f(corte.efectivo_contado)}</td></tr>
                  <tr>
                    <td>Diferencia</td>
                    <td className={`right bold ${(corte.diferencia||0)>=0?'green':'red'}`}>
                      {(corte.diferencia||0)>=0?'+':''}{f(corte.diferencia)} {(corte.diferencia||0)>0?'(sobrante)':(corte.diferencia||0)<0?'(faltante)':'(cuadra)'}
                    </td>
                  </tr>
                  <tr><td>Efectivo que se deja en caja</td><td className="right">{f(corte.efectivo_dejado_en_caja)}</td></tr>
                  <tr><td>Efectivo retirado físicamente</td><td className="right bold">{f(corte.efectivo_retirado)}</td></tr>
                </tbody>
              </table>
              <p className="pdf-meta" style={{ marginTop: 4 }}>
                * El “efectivo retirado” es solo registro físico de movimiento de caja. No es gasto, ingreso ni afecta utilidad.
              </p>

              {corte.notas && (
                <div style={{ marginTop: 12, padding: 10, border: '1px solid #d1d5db', borderRadius: 4, background: '#f9fafb' }}>
                  <strong>Observaciones:</strong> {corte.notas}
                </div>
              )}

              <div className="note">
                ⚠️ Reporte interno de control financiero. No sustituye facturación, CFDI, contabilidad formal ni declaraciones fiscales.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}