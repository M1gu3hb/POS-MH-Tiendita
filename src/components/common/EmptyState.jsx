'use client';
import { PackageOpen } from 'lucide-react';

export default function EmptyState({ icon: Icon = PackageOpen, title = 'Sin datos', description = '' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
        <Icon className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-foreground font-semibold text-lg">{title}</p>
      {description && <p className="text-muted-foreground text-sm mt-1 max-w-sm">{description}</p>}
    </div>
  );
}