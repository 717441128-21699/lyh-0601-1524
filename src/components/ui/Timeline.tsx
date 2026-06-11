import { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, AlertTriangle, Zap } from 'lucide-react';
import { cn } from '@/utils/format';
import dayjs from 'dayjs';

export interface TimelineItem {
  id: string;
  timestamp: string;
  type?: 'info' | 'success' | 'warning' | 'error' | 'task' | 'system';
  title: string;
  description?: string;
  icon?: ReactNode;
  relatedId?: string;
  onClick?: () => void;
}

const typeConfig: Record<string, { color: string; bg: string; border: string; icon: ReactNode }> = {
  info: { color: 'text-cyan-400', bg: 'bg-cyan-500/15', border: 'border-cyan-500/40', icon: <Info size={14} /> },
  success: { color: 'text-emerald-400', bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', icon: <CheckCircle2 size={14} /> },
  warning: { color: 'text-amber-400', bg: 'bg-amber-500/15', border: 'border-amber-500/40', icon: <AlertTriangle size={14} /> },
  error: { color: 'text-red-400', bg: 'bg-red-500/15', border: 'border-red-500/40', icon: <AlertCircle size={14} /> },
  task: { color: 'text-violet-400', bg: 'bg-violet-500/15', border: 'border-violet-500/40', icon: <Zap size={14} /> },
  system: { color: 'text-slate-400', bg: 'bg-slate-500/15', border: 'border-slate-500/40', icon: <Info size={14} /> },
};

export function Timeline({ items, maxHeight }: { items: TimelineItem[]; maxHeight?: string }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <Info size={24} className="mb-2 opacity-40" />
        <p className="text-sm">暂无日志记录</p>
      </div>
    );
  }

  return (
    <div
      className={cn('space-y-3 overflow-y-auto pr-1 custom-scrollbar')}
      style={{ maxHeight }}
    >
      {items.map((item, idx) => {
        const cfg = typeConfig[item.type ?? 'info'] ?? typeConfig.info;
        const isLast = idx === items.length - 1;
        return (
          <div
            key={item.id}
            className={cn(
              'relative pl-6 group cursor-pointer',
              item.onClick && 'hover:bg-white/3 -mx-2 px-8 py-1 rounded-lg'
            )}
            onClick={item.onClick}
          >
            {!isLast && (
              <div
                className={cn(
                  'absolute left-[11px] top-5 w-px h-[calc(100%+4px)]',
                  'bg-gradient-to-b from-white/10 to-transparent'
                )}
              />
            )}
            <div
              className={cn(
                'absolute left-0 top-0 w-6 h-6 rounded-full flex items-center justify-center',
                'border transition-all group-hover:scale-110',
                cfg.bg,
                cfg.border,
                cfg.color
              )}
            >
              {item.icon ?? cfg.icon}
            </div>
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className={cn('text-sm font-medium', cfg.color)}>{item.title}</p>
                {item.description && (
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{item.description}</p>
                )}
              </div>
              <span className="text-[10px] text-slate-500 font-mono whitespace-nowrap shrink-0 pt-0.5">
                {dayjs(item.timestamp).format('HH:mm:ss')}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
