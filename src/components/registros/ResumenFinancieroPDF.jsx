'use client';
import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/utils/currency';
import { X, Printer, Download, Loader2 } from 'lucide-react';
import PDFStyles, { PDF_STYLES } from './PDFStyles';
import { downloadPdfFromElement, pdfFilename } from '@/lib/downloadPdfReport';
import { downloadHtmlReport, reportFilename } from '@/lib/downloadHtmlReport';
import { toast } from 'sonner';

export default function ResumenFinancieroPDF({
  config, periodo, start, end,
  totalVentas, costoVenta, utilidadBruta,
  totalGastos, totalCompras, utilidadNeta,
  totalEfectivo, totalTarjeta, totalTransferencia,
  numVentas, productosVendidos = [],
  gastosFiltrados = [], comprasFiltradas = [], cortesFiltrados = [],
  sym, onClose,
}) {
  const printRef = useRef(null);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  // Cerrar con tecla Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Imprimir: abre diálogo nativo, NO descarga.
  const handlePrint = () => {
    const content = printRef.current?.innerHTML || '';
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Reporte Financiero — ${periodo}</title><style>
      * { margin:0; padding:0; box-sizing:border-box; }
      body { background:#fff; }
      ${PDF_STYLES}
    </style></head><body><div class="printable-doc">${content}</div></body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 400);
  };

  // Descarga PDF real. NO imprime.
  const handleDownloadPdf = async () => {
    if (generatingPdf) return;
    setGeneratingPdf(true);
    try {
      const slug = `reporte-financiero-${(periodo || '').toLowerCase().replace(/\s+/g, '-')}`;
      const filename = pdfFilename(slug);
      const ok = await downloadPdfFromElement({ element: printRef.current, filename });
      if (!ok) {
        toast.error('No se pudo generar PDF. Descargando archivo HTML como respaldo.');
        downloadHtmlReport({
          filename: reportFilename(slug),
          title: `Reporte Financiero — ${periodo}`,
          contentHtml: printRef.current?.innerHTML || '',
          extraCss: PDF_STYLES,
        });
      }
    } finally {
      setGeneratingPdf(false);
    }
  };

  const now = new Date().toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' });

  return (
    <div
      className="pdf-modal-overlay fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 overflow-hidden"
      onClick={onClose}
    >
      <PDFStyles />
      <div
        className="bg-gray-100 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Toolbar */}
        <div className="pdf-toolbar no-print flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-gray-800 text-white flex-shrink-0">
          <h2 className="font-bold text-sm sm:text-lg truncate pr-2">Reporte Financiero — {periodo}</h2>
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

        {/* Preview area - fondo gris */}
        <div className="overflow-y-auto flex-1 p-6 bg-gray-100 flex items-start justify-center">
          {/* Hoja blanca tipo carta */}
          <div
            className="bg-white shadow-lg w-full"
            style={{ maxWidth: '850px', borderRadius: 6, padding: 32 }}
          >
            <div ref={printRef} className="printable-doc">
              {/* Header */}
              <div className="pdf-header">
                {config?.logo_url && <img src={config.logo_url} alt="" />}
                <div>
                  <h1>{config?.nombre_negocio || 'Negocio'}</h1>
                  {config?.direccion && <p style={{ fontSize: 11, color: '#6b7280' }}>{config.direccion}</p>}
                  {config?.telefono && <p style={{ fontSize: 11, color: '#6b7280' }}>Tel: {config.telefono}</p>}
                </div>
              </div>

              <h2>Reporte Financiero Interno</h2>
              <p className="pdf-meta">
                Periodo: <strong>{periodo}</strong> &nbsp;|&nbsp; {start} al {end} &nbsp;|&nbsp; Generado: {now}
              </p>

              {/* KPIs */}
              <h3>Resumen financiero</h3>
              <div className="kpi-grid">
                <div className="kpi"><div className="kpi-label">Ingresos por ventas</div><div className="kpi-val">{formatMoney(totalVentas, sym)}</div></div>
                <div className="kpi"><div className="kpi-label">Costo de venta</div><div className="kpi-val">{formatMoney(costoVenta, sym)}</div></div>
                <div className="kpi"><div className="kpi-label">Utilidad bruta</div><div className="kpi-val green">{formatMoney(utilidadBruta, sym)}</div></div>
                <div className="kpi"><div className="kpi-label">Gastos operativos</div><div className="kpi-val red">{formatMoney(totalGastos, sym)}</div></div>
                <div className="kpi"><div className="kpi-label">Compras de mercancía</div><div className="kpi-val">{formatMoney(totalCompras, sym)}</div></div>
                <div className="kpi"><div className="kpi-label">Utilidad neta estimada</div><div className="kpi-val" style={{ color: utilidadNeta >= 0 ? '#16a34a' : '#dc2626' }}>{formatMoney(utilidadNeta, sym)}</div></div>
              </div>

              <h3>Métodos de cobro</h3>
              <table>
                <thead><tr><th>Método</th><th className="right">Monto</th></tr></thead>
                <tbody>
                  <tr><td>Efectivo</td><td className="right">{formatMoney(totalEfectivo, sym)}</td></tr>
                  <tr><td>Tarjeta</td><td className="right">{formatMoney(totalTarjeta, sym)}</td></tr>
                  <tr><td>Transferencia</td><td className="right">{formatMoney(totalTransferencia, sym)}</td></tr>
                  <tr><td className="bold">Total</td><td className="right bold">{formatMoney(totalVentas, sym)}</td></tr>
                </tbody>
              </table>
              <p className="pdf-meta">Número de ventas: {numVentas}</p>

              {/* Productos vendidos */}
              {productosVendidos.length > 0 && (
                <>
                  <h3>Productos vendidos</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Producto</th>
                        <th className="center">Cantidad</th>
                        <th className="right">Importe</th>
                        <th className="right">Costo est.</th>
                        <th className="right">Utilidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {productosVendidos.slice(0, 50).map((p, i) => (
                        <tr key={i}>
                          <td>{p.nombre}</td>
                          <td className="center">{p.cantidad}</td>
                          <td className="right">{formatMoney(p.importe, sym)}</td>
                          <td className="right">{formatMoney(p.costo, sym)}</td>
                          <td className={`right bold ${(p.importe - p.costo) >= 0 ? 'green' : 'red'}`}>{formatMoney(p.importe - p.costo, sym)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
              )}

              {/* Gastos operativos */}
              {gastosFiltrados.length > 0 && (
                <>
                  <h3>Gastos operativos del periodo</h3>
                  <table>
                    <thead><tr><th>Fecha</th><th>Concepto</th><th>Categoría</th><th className="right">Monto</th></tr></thead>
                    <tbody>
                      {gastosFiltrados.map((g, i) => (
                        <tr key={i}>
                          <td>{g.fecha}</td><td>{g.concepto}</td><td>{g.categoria}</td><td className="right red">{formatMoney(g.monto, sym)}</td>
                        </tr>
                      ))}
                      <tr><td className="bold" colSpan={3}>Total</td><td className="right bold red">{formatMoney(gastosFiltrados.reduce((s,g)=>s+(g.monto||0),0), sym)}</td></tr>
                    </tbody>
                  </table>
                </>
              )}

              {/* Compras */}
              {comprasFiltradas.length > 0 && (
                <>
                  <h3>Compras de mercancía del periodo</h3>
                  <table>
                    <thead><tr><th>Fecha</th><th>Proveedor</th><th>Método pago</th><th className="right">Total</th></tr></thead>
                    <tbody>
                      {comprasFiltradas.map((c, i) => (
                        <tr key={i}>
                          <td>{c.fecha}</td><td>{c.proveedor_nombre || 'Sin proveedor'}</td><td>{c.metodo_pago}</td><td className="right">{formatMoney(c.total, sym)}</td>
                        </tr>
                      ))}
                      <tr><td className="bold" colSpan={3}>Total</td><td className="right bold">{formatMoney(comprasFiltradas.reduce((s,c)=>s+(c.total||0),0), sym)}</td></tr>
                    </tbody>
                  </table>
                </>
              )}

              {/* Cortes */}
              {cortesFiltrados.length > 0 && (
                <>
                  <h3>Cortes de caja del periodo</h3>
                  <table>
                    <thead><tr><th>Cajero</th><th>Apertura</th><th>Cierre</th><th className="right">Ventas</th><th className="right">Diferencia</th><th className="right">Ut. Neta</th></tr></thead>
                    <tbody>
                      {cortesFiltrados.map((c, i) => (
                        <tr key={i}>
                          <td>{c.cajero_nombre}</td>
                          <td>{c.fecha_apertura ? new Date(c.fecha_apertura).toLocaleString('es-MX',{dateStyle:'short',timeStyle:'short'}) : ''}</td>
                          <td>{c.fecha_cierre ? new Date(c.fecha_cierre).toLocaleString('es-MX',{dateStyle:'short',timeStyle:'short'}) : ''}</td>
                          <td className="right">{formatMoney(c.total_ventas, sym)}</td>
                          <td className={`right ${(c.diferencia||0)>=0?'green':'red'}`}>{formatMoney(c.diferencia, sym)}</td>
                          <td className="right bold">{formatMoney(c.utilidad_neta_estimada, sym)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </>
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