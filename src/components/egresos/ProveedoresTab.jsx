'use client';

import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/auth/AuthContext';
import { getProveedores, createProveedor, updateProveedor, deleteProveedor } from '@/lib/db/proveedores';
import LoadingState from '@/components/common/LoadingState';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Users, Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const emptyForm = () => ({ nombre: '', contacto: '', telefono: '', whatsapp: '', correo: '', notas: '', activo: true });

export default function ProveedoresTab() {
  const { negocioId } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(emptyForm());

  const { data: proveedores = [], isLoading } = useQuery({
    queryKey: ['proveedores', negocioId],
    queryFn: () => getProveedores(negocioId),
    enabled: !!negocioId,
    placeholderData: (prev) => prev,
  });

  const handleOpenDialog = (proveedor = null) => {
    if (proveedor) {
      setEditingId(proveedor.id);
      setFormData({
        nombre: proveedor.nombre || '',
        contacto: proveedor.contacto || '',
        telefono: proveedor.telefono || '',
        whatsapp: proveedor.whatsapp || '',
        correo: proveedor.correo || '',
        notas: proveedor.notas || '',
        activo: proveedor.activo !== false,
      });
    } else {
      setEditingId(null);
      setFormData(emptyForm());
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.nombre.trim()) {
      toast.error('El nombre es requerido');
      return;
    }
    try {
      if (editingId) {
        await updateProveedor(editingId, formData);
        toast.success('Proveedor actualizado');
      } else {
        await createProveedor({ ...formData, negocio_id: negocioId });
        toast.success('Proveedor creado');
      }
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
      setDialogOpen(false);
    } catch {
      toast.error('Error al guardar proveedor');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este proveedor?')) return;
    try {
      await deleteProveedor(id);
      toast.success('Proveedor eliminado');
      queryClient.invalidateQueries({ queryKey: ['proveedores'] });
    } catch {
      toast.error('Error al eliminar');
    }
  };

  if (isLoading && proveedores.length === 0) return <LoadingState rows={4} type="list" />;

  return (
    <div>
      <div className="mb-4">
        <Button onClick={() => handleOpenDialog()} className="skeu-btn-primary">
          <Plus className="h-4 w-4 mr-1" /> Nuevo Proveedor
        </Button>
      </div>

      {proveedores.length === 0 ? (
        <EmptyState icon={Users} title="Sin proveedores" description="Registra tu primer proveedor" />
      ) : (
        <div className="skeu-panel overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Nombre</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Contacto</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">Teléfono</th>
                <th className="text-left px-3 py-3 font-medium text-muted-foreground">WhatsApp</th>
                <th className="text-center px-3 py-3 font-medium text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {proveedores.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3 text-foreground font-medium">{p.nombre}</td>
                  <td className="px-3 py-3 text-foreground">{p.contacto || '-'}</td>
                  <td className="px-3 py-3 text-foreground">{p.telefono || '-'}</td>
                  <td className="px-3 py-3 text-foreground">{p.whatsapp || '-'}</td>
                  <td className="px-3 py-3 text-center flex gap-2 justify-center">
                    <Button size="icon" variant="ghost" onClick={() => handleOpenDialog(p)} className="h-8 w-8">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(p.id)} className="h-8 w-8 text-destructive">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? 'Editar Proveedor' : 'Nuevo Proveedor'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>Nombre *</Label><Input value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} /></div>
            <div><Label>Contacto</Label><Input value={formData.contacto || ''} onChange={(e) => setFormData({ ...formData, contacto: e.target.value })} /></div>
            <div><Label>Teléfono</Label><Input value={formData.telefono || ''} onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} /></div>
            <div><Label>WhatsApp</Label><Input value={formData.whatsapp || ''} onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })} /></div>
            <div><Label>Correo</Label><Input type="email" value={formData.correo || ''} onChange={(e) => setFormData({ ...formData, correo: e.target.value })} /></div>
            <div><Label>Notas</Label><Textarea value={formData.notas || ''} onChange={(e) => setFormData({ ...formData, notas: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} className="skeu-btn-primary">Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
