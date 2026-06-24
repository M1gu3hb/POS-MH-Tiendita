'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PackageX, Plus, ScanLine, Search, Keyboard, X } from 'lucide-react';

/**
 * Modal cuando un código escaneado/escrito no existe en el catálogo.
 *
 * Props:
 *  - open, codigo
 *  - onCrear()            → crear producto nuevo con el código precargado
 *  - onAsignarExistente() → abrir buscador y reasignar el código a un producto existente
 *  - onReintentar()       → reabrir scanner
 *  - onManual()           → reabrir scanner en modo manual (móvil)  [opcional]
 *  - onCancelar()
 */
export default function ProductoNoEncontradoDialog({
  open,
  codigo,
  onCrear,
  onAsignarExistente,
  onReintentar,
  onManual,
  onCancelar,
}) {
  const [busy] = useState(false);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancelar()}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageX className="h-5 w-5 text-amber-500" />
            Producto no encontrado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="bg-muted/50 rounded-lg p-3 border border-border">
            <p className="text-xs text-muted-foreground mb-1">Código escaneado:</p>
            <p className="font-mono font-bold text-base break-all text-foreground">{codigo}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Este código no está asignado a ningún producto. Puede que el producto no exista o que haya sido registrado con un código incompleto o incorrecto.
          </p>
        </div>

        <div className="grid gap-2 pt-2">
          <Button
            onClick={onCrear}
            disabled={busy}
            className="w-full h-12 bg-primary justify-start text-left font-bold"
          >
            <Plus className="h-5 w-5 mr-2 flex-shrink-0" />
            <div className="flex flex-col items-start">
              <span>Crear producto nuevo</span>
              <span className="text-[10px] font-normal opacity-80">Registrar con este código</span>
            </div>
          </Button>

          {onAsignarExistente && (
            <Button
              onClick={onAsignarExistente}
              disabled={busy}
              variant="outline"
              className="w-full h-12 justify-start text-left"
            >
              <Search className="h-5 w-5 mr-2 flex-shrink-0" />
              <div className="flex flex-col items-start">
                <span className="font-semibold">Buscar producto existente</span>
                <span className="text-[10px] font-normal text-muted-foreground">Asignar este código al producto correcto</span>
              </div>
            </Button>
          )}

          <Button
            onClick={onReintentar}
            disabled={busy}
            variant="outline"
            className="w-full h-11 justify-start text-left"
          >
            <ScanLine className="h-5 w-5 mr-2 flex-shrink-0" />
            <span>Escanear otra vez</span>
          </Button>

          {onManual && (
            <Button
              onClick={onManual}
              disabled={busy}
              variant="outline"
              className="w-full h-11 justify-start text-left"
            >
              <Keyboard className="h-5 w-5 mr-2 flex-shrink-0" />
              <span>Ingresar código manualmente</span>
            </Button>
          )}

          <Button
            onClick={onCancelar}
            disabled={busy}
            variant="ghost"
            className="w-full h-10 text-muted-foreground"
          >
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}