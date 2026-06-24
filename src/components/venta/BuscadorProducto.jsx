'use client';
import { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { normalizeBarcode, compareBarcodes } from '@/utils/barcodeUtils';
import { resolveProductByBarcode } from '@/lib/productLookup';

export default function BuscadorProducto({ productos, onSelect, onNotFound }) {
  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  const q = query.toLowerCase().trim();
  const filtered = q.length > 0
    ? productos.filter(p => {
        return (
          p.nombre?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          (p.codigo_barras && normalizeBarcode(p.codigo_barras).includes(normalizeBarcode(query))) ||
          p.categoria_nombre?.toLowerCase().includes(q)
        );
      }).slice(0, 10)
    : [];

  useEffect(() => {
    const handleClick = (e) => {
      if (resultsRef.current && !resultsRef.current.contains(e.target) && !inputRef.current?.contains(e.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSelect = (producto) => {
    onSelect(producto);
    setQuery('');
    setShowResults(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const raw = query.trim();
      if (!raw) return;
      // 1) Match por código de barras (local + backend si hace falta)
      const byCode = await resolveProductByBarcode(raw, productos);
      if (byCode.status === 'found') {
        handleSelect(byCode.producto);
        return;
      }
      if (byCode.status === 'duplicate') {
        onNotFound?.(normalizeBarcode(raw));
        return;
      }
      // 2) Match exacto por SKU
      const exactSku = productos.find(p => p.sku && compareBarcodes(p.sku, raw));
      if (exactSku) {
        handleSelect(exactSku);
        return;
      }
      // 3) Una sola coincidencia textual
      if (filtered.length === 1) {
        handleSelect(filtered[0]);
        return;
      }
      // 4) Si parece código → notificar "no encontrado"
      if (onNotFound && /^[A-Za-z0-9-]{4,}$/.test(raw)) {
        onNotFound(normalizeBarcode(raw));
        setQuery('');
      }
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowResults(true); }}
          onFocus={() => setShowResults(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar producto, SKU o código de barras..."
          className="pl-10 h-12 text-base bg-card border-border"
          autoComplete="off"
        />
      </div>
      {showResults && filtered.length > 0 && (
        <div ref={resultsRef} className="absolute top-full left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-xl z-50 max-h-72 overflow-y-auto">
          {filtered.map(p => (
            <button
              key={p.id}
              onClick={() => handleSelect(p)}
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted transition-colors text-left border-b border-border last:border-0"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm text-foreground truncate">{p.nombre}</p>
                <p className="text-xs text-muted-foreground">{p.sku} · {p.categoria_nombre || 'Sin categoría'}</p>
              </div>
              <div className="text-right ml-3 flex-shrink-0">
                <p className="font-bold text-sm text-primary">${p.precio_venta?.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Stock: {p.stock_actual}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}