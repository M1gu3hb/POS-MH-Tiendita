'use client';
import { useRef, useState } from 'react';
import { ScanLine, Camera } from 'lucide-react';
import { Input } from '@/components/ui/input';
import BarcodeScanner from '@/components/barcode/BarcodeScanner';
import { normalizeBarcode } from '@/utils/barcodeUtils';

/**
 * Input dedicado para escaneo (lector USB en desktop / cámara en móvil).
 * - Enter dispara onScan(code).
 * - Botón cámara abre BarcodeScanner.
 * - El input se limpia y mantiene foco automáticamente.
 */
export default function ScanBarcodeInput({ onScan, continuous = false, autoFocus = false, placeholder }) {
  const [value, setValue] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const inputRef = useRef(null);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = normalizeBarcode(value);
      if (!code) return;
      onScan(code);
      setValue('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleCameraDetected = (code) => {
    onScan(normalizeBarcode(code));
  };

  return (
    <>
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            ref={inputRef}
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || 'Escanea con lector USB o escribe el código...'}
            autoFocus={autoFocus}
            autoComplete="off"
            className="pl-10 h-12 text-base bg-card border-border"
          />
        </div>
        <button
          type="button"
          onClick={() => setScannerOpen(true)}
          className="skeu-btn-primary h-12 px-4 rounded-xl flex items-center gap-2 font-bold text-sm flex-shrink-0"
          title="Escanear con cámara"
        >
          <Camera className="h-5 w-5" />
          <span className="hidden sm:inline">Cámara</span>
        </button>
      </div>

      <BarcodeScanner
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleCameraDetected}
        continuous={continuous}
        title="Escanear producto"
      />
    </>
  );
}