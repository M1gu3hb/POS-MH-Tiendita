'use client';

import { useTheme } from '@/hooks/useTheme';

export default function CategoriaTabs({
  categorias,
  selectedCategoriaId,
  onSelectCategoria,
}) {
  const { theme } = useTheme();

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide w-full shrink-0 select-none">
      {/* Botón "Todas" */}
      <button
        onClick={() => onSelectCategoria(null)}
        className={`h-10 px-4 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 transition-all ${
          selectedCategoriaId === null
            ? 'skeu-btn-primary'
            : 'skeu-btn-ghost text-muted-foreground hover:text-foreground'
        }`}
      >
        Todas
      </button>

      {/* Botones de categoría */}
      {categorias.map((cat) => {
        const isActive = selectedCategoriaId === cat.id;
        
        // Estilo personalizado sutil usando el color de la categoría si existe
        const customStyle = {};
        if (cat.color) {
          if (isActive) {
            customStyle.borderColor = cat.color;
            customStyle.boxShadow = `0 1px 0 rgba(255, 255, 255, 0.15) inset, 0 0 6px ${cat.color}`;
          } else {
            customStyle.borderColor = `${cat.color}40`; // Borde muy sutil (25% opacidad)
          }
        }

        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategoria(cat.id)}
            style={customStyle}
            className={`h-10 px-4 rounded-xl flex items-center gap-2 font-bold text-sm shrink-0 transition-all ${
              isActive
                ? 'skeu-btn-primary'
                : 'skeu-btn-ghost text-muted-foreground hover:text-foreground'
            }`}
          >
            {cat.color && (
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm border border-black/10"
                style={{ backgroundColor: cat.color }}
              />
            )}
            <span>{cat.nombre}</span>
          </button>
        );
      })}
    </div>
  );
}
