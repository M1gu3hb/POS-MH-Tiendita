'use client';
import { Skeleton } from '@/components/ui/skeleton';

export default function StatCard({ title, value, icon: Icon, trend, isLoading = false, accent = 'blue' }) {
  const accentMap = {
    blue:   { bg: 'bg-blue-500/10 dark:bg-blue-500/15',   icon: 'text-blue-500',   ring: 'shadow-blue-500/10',  top: 'from-blue-500/8' },
    green:  { bg: 'bg-green-500/10 dark:bg-green-500/15', icon: 'text-green-500',  ring: 'shadow-green-500/10', top: 'from-green-500/8' },
    amber:  { bg: 'bg-amber-500/10 dark:bg-amber-500/15', icon: 'text-amber-500',  ring: 'shadow-amber-500/10', top: 'from-amber-500/8' },
    purple: { bg: 'bg-purple-500/10 dark:bg-purple-500/15',icon: 'text-purple-500',ring: 'shadow-purple-500/10',top: 'from-purple-500/8' },
    red:    { bg: 'bg-red-500/10 dark:bg-red-500/15',     icon: 'text-red-500',    ring: 'shadow-red-500/10',   top: 'from-red-500/8' },
    cyan:   { bg: 'bg-cyan-500/10 dark:bg-cyan-500/15',   icon: 'text-cyan-500',   ring: 'shadow-cyan-500/10',  top: 'from-cyan-500/8' },
  };
  const a = accentMap[accent] || accentMap.blue;

  return (
    <div className={`skeu-card relative overflow-hidden transition-all duration-200 hover:translate-y-[-1px] hover:shadow-xl ${a.ring} p-4`}>
      {/* top highlight gradient */}
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r ${a.top} via-transparent to-transparent opacity-60`} />
      <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl ${a.top} to-transparent rounded-bl-full opacity-60`} />

      <div className="flex items-start justify-between relative">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{title}</p>
          {isLoading ? (
            <Skeleton className="h-7 w-24 mt-2" />
          ) : (
            <p className="text-2xl font-bold mt-1 truncate text-foreground">{value}</p>
          )}
          {trend && !isLoading && (
            <p className="text-xs text-muted-foreground mt-1">{trend}</p>
          )}
        </div>
        {Icon && (
          <div className={`h-10 w-10 rounded-xl ${a.bg} flex items-center justify-center flex-shrink-0 ml-3 skeu-input`}>
            <Icon className={`h-5 w-5 ${a.icon}`} />
          </div>
        )}
      </div>
    </div>
  );
}