'use client';
/**
 * Tooltip reutilizable para gráficas Recharts que respeta dark/light mode.
 * Uso: <Tooltip content={<ChartTooltip sym={sym} />} />
 */
import { formatMoney } from '@/utils/currency';

export default function ChartTooltip({ active, payload, label, sym = '$', formatter }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div
      style={{
        background: 'hsl(var(--popover))',
        border: '1px solid hsl(var(--border))',
        borderRadius: '8px',
        padding: '8px 12px',
        boxShadow: '0 6px 16px rgba(0,0,0,0.25)',
        color: 'hsl(var(--popover-foreground))',
        fontSize: '12px',
        minWidth: '120px',
      }}
    >
      {label && (
        <p
          style={{
            fontWeight: 700,
            marginBottom: '4px',
            color: 'hsl(var(--foreground))',
            fontSize: '11px',
          }}
        >
          {label}
        </p>
      )}
      {payload.map((entry, idx) => {
        const name = entry.name || entry.payload?.name || '';
        const raw = entry.value;
        const value = formatter ? formatter(raw) : formatMoney(raw, sym);
        return (
          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: idx > 0 ? '2px' : 0 }}>
            <span
              style={{
                display: 'inline-block',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                background: entry.color || entry.payload?.fill || 'hsl(var(--primary))',
              }}
            />
            <span style={{ color: 'hsl(var(--muted-foreground))', flex: 1 }}>{name}</span>
            <span style={{ fontWeight: 700, color: 'hsl(var(--foreground))', fontVariantNumeric: 'tabular-nums' }}>
              {value}
            </span>
          </div>
        );
      })}
    </div>
  );
}