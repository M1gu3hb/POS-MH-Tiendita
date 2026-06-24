'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { getProductos } from '@/lib/db/productos';
import { getVentas } from '@/lib/db/ventas';
import { getCortes } from '@/lib/db/caja';
import { getGastos } from '@/lib/db/egresos';
import { getCompras } from '@/lib/db/egresos';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Database, Download, FileJson, FileSpreadsheet, Package, ShoppingCart,
  ClipboardList, Receipt, Warehouse, Truck, Info, Loader2, ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  downloadCSV, downloadJSON,
  COLUMNS_PRODUCTOS, COLUMNS_VENTAS, COLUMNS_CORTES,
  COLUMNS_GASTOS, COLUMNS_COMPRAS, COLUMNS_INVENTARIO,
} from '@/utils/exportData';

// Migrado: cada "entity" se resuelve contra el repositorio correspondiente.
const EXPORTABLES = [
  { key: 'productos', label: 'Productos', description: 'Catálogo completo con precios, costos y stock.', icon: Package, color: 'bg-blue-500/10 text-blue-500', entity: 'Producto', columns: COLUMNS_PRODUCTOS, filename: 'productos', limit: 2000 },
  { key: 'inventario', label: 'Inventario', description: 'Resumen de stock actual por producto.', icon: Warehouse, color: 'bg-amber-500/10 text-amber-500', entity: 'Producto', columns: COLUMNS_INVENTARIO, filename: 'inventario', limit: 2000 },
  { key: 'ventas', label: 'Ventas', description: 'Todas las ventas (pagadas, abiertas y canceladas).', icon: ShoppingCart, color: 'bg-green-500/10 text-green-500', entity: 'Venta', columns: COLUMNS_VENTAS, filename: 'ventas', limit: 2000 },
  { key: 'cortes', label: 'Cortes de caja', description: 'Resumen de cada corte con totales y diferencia.', icon: ClipboardList, color: 'bg-purple-500/10 text-purple-500', entity: 'CorteCaja', columns: COLUMNS_CORTES, filename: 'cortes_caja', limit: 500 },
  { key: 'gastos', label: 'Gastos operativos', description: 'Registro de gastos del negocio.', icon: Receipt, color: 'bg-red-500/10 text-red-500', entity: 'GastoOperativo', columns: COLUMNS_GASTOS, filename: 'gastos', limit: 2000 },
  { key: 'compras', label: 'Compras de mercancía', description: 'Compras realizadas a proveedores.', icon: Truck, color: 'bg-indigo-500/10 text-indigo-500', entity: 'CompraMercancia', columns: COLUMNS_COMPRAS, filename: 'compras', limit: 2000 },
];

export default function BaseDatosTab() {
  const { negocioId } = useAuth();
  const [busyKey, setBusyKey] = useState(null);

  const fetchEntity = async (entity, limit) => {
    switch (entity) {
      case 'Producto': return getProductos(negocioId);
      case 'Venta': return getVentas(negocioId, { limit });
      case 'CorteCaja': return getCortes(negocioId, limit);
      case 'GastoOperativo': return getGastos(negocioId, { limit });
      case 'CompraMercancia': return getCompras(negocioId, limit);
      default: return [];
    }
  };

  const handleExport = async (item, format) => {
    const key = `${item.key}-${format}`;
    setBusyKey(key);
    try {
      const rows = await fetchEntity(item.entity, item.limit);
      if (!rows || rows.length === 0) {
        toast.warning(`No hay ${item.label.toLowerCase()} para exportar`);
        return;
      }
      if (format === 'csv') downloadCSV(rows, item.filename, item.columns);
      else downloadJSON(rows, item.filename);
      toast.success(`${item.label} exportado (${rows.length} registros)`);
    } catch {
      toast.error('No se pudo exportar. Intenta de nuevo.');
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="skeu-panel p-5">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <Database className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-foreground text-base">Base de datos y respaldos</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Tus datos viven dentro del POS de forma segura. Aquí puedes descargar copias en
              formato CSV (abrir en Excel/Google Sheets) o JSON (respaldo técnico).
            </p>
          </div>
        </div>
      </div>

      <div className="skeu-card p-4 flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground leading-relaxed">
          <p className="text-foreground font-semibold mb-1">Datos privados por cuenta</p>
          Cada exportación contiene únicamente la información de este negocio. No se mezcla con
          datos de otros negocios ni se sube a ningún servicio externo. La descarga ocurre 100%
          en tu dispositivo.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {EXPORTABLES.map((item) => {
          const Icon = item.icon;
          const isBusyCSV = busyKey === `${item.key}-csv`;
          const isBusyJSON = busyKey === `${item.key}-json`;
          return (
            <div key={item.key} className="skeu-card p-4 flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className={`h-10 w-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-foreground text-sm">{item.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{item.description}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="skeu-btn-ghost h-9" onClick={() => handleExport(item, 'csv')} disabled={!!busyKey}>
                  {isBusyCSV ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileSpreadsheet className="h-3.5 w-3.5" />}
                  <span className="ml-1 text-xs font-semibold">CSV</span>
                </Button>
                <Button variant="outline" size="sm" className="skeu-btn-ghost h-9" onClick={() => handleExport(item, 'json')} disabled={!!busyKey}>
                  {isBusyJSON ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileJson className="h-3.5 w-3.5" />}
                  <span className="ml-1 text-xs font-semibold">JSON</span>
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="skeu-card p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-muted-foreground leading-relaxed flex-1">
          <p className="text-foreground font-semibold mb-1">Conexión con Google Drive y Google Sheets</p>
          La sincronización automática con Google Drive y Google Sheets está pendiente.
          Por ahora puedes descargar las exportaciones aquí y subirlas manualmente a tu Drive.
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge variant="outline" className="text-[10px]">Google Drive — próximamente</Badge>
            <Badge variant="outline" className="text-[10px]">Google Sheets — próximamente</Badge>
          </div>
        </div>
      </div>

      <div className="skeu-card p-4">
        <p className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
          <Download className="h-4 w-4 text-primary" /> Cómo usar tus exportaciones
        </p>
        <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal pl-5">
          <li>Elige la sección que quieras respaldar (productos, ventas, etc.).</li>
          <li>Descarga el archivo CSV para abrirlo en Excel o Google Sheets.</li>
          <li>Usa JSON solo si necesitas un respaldo técnico exacto.</li>
          <li>Guarda los archivos en tu Drive, USB o disco con regularidad.</li>
          <li>Los PDFs de cortes y reportes se siguen descargando desde Registros.</li>
        </ol>
      </div>
    </div>
  );
}
