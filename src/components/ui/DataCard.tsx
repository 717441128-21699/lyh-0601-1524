import { ReactNode } from 'react';
import { cn } from '@/utils/format';

interface DataCardProps {
  title?: string;
  value?: string | number;
  icon?: ReactNode;
  trend?: { value: number; label: string };
  color?: 'blue' | 'green' | 'amber' | 'red' | 'violet' | 'cyan';
  children?: ReactNode;
  className?: string;
  footer?: ReactNode;
}

const colorMap: Record<string, { bg: string; border: string; text: string; glow: string }> = {
  blue: {
    bg: 'from-blue-500/10 to-blue-500/5',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    glow: 'shadow-blue-500/10',
  },
  green: {
    bg: 'from-emerald-500/10 to-emerald-500/5',
    border: 'border-emerald-500/30',
    text: 'text-emerald-400',
    glow: 'shadow-emerald-500/10',
  },
  amber: {
    bg: 'from-amber-500/10 to-amber-500/5',
    border: 'border-amber-500/30',
    text: 'text-amber-400',
    glow: 'shadow-amber-500/10',
  },
  red: {
    bg: 'from-red-500/10 to-red-500/5',
    border: 'border-red-500/30',
    text: 'text-red-400',
    glow: 'shadow-red-500/10',
  },
  violet: {
    bg: 'from-violet-500/10 to-violet-500/5',
    border: 'border-violet-500/30',
    text: 'text-violet-400',
    glow: 'shadow-violet-500/10',
  },
  cyan: {
    bg: 'from-cyan-500/10 to-cyan-500/5',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    glow: 'shadow-cyan-500/10',
  },
};

export function DataCard({
  title,
  value,
  icon,
  trend,
  color = 'blue',
  children,
  className,
  footer,
}: DataCardProps) {
  const c = colorMap[color] ?? colorMap.blue;
  return (
    <div
      className={cn(
        'relative rounded-xl border backdrop-blur-xl overflow-hidden transition-all duration-300',
        'bg-gradient-to-br hover:scale-[1.02]',
        c.bg,
        c.border,
        `shadow-lg ${c.glow}`,
        className
      )}
    >
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3">
            {icon && (
              <div
                className={cn(
                  'w-10 h-10 rounded-lg flex items-center justify-center',
                  'bg-white/5 border border-white/10',
                  c.text
                )}
              >
                {icon}
              </div>
            )}
            {title && (
              <div>
                <div className="text-xs text-slate-400 uppercase tracking-wider">{title}</div>
              </div>
            )}
          </div>
          {trend && (
            <div
              className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                trend.value >= 0
                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  : 'bg-red-500/15 text-red-400 border border-red-500/30'
              )}
            >
              {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
            </div>
          )}
        </div>
        {value !== undefined && (
          <div className={cn('text-3xl font-bold mb-1', c.text)} style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {value}
          </div>
        )}
        {children}
      </div>
      {footer && (
        <div className="border-t border-white/5 px-4 py-2.5 bg-black/10">
          {footer}
        </div>
      )}
    </div>
  );
}
