import { cn } from '@/utils/format';
import type { RobotStatus, TaskStatus, FaultLevel, TaskType, AreaType } from '@/types';
import {
  getRobotStatusName,
  getRobotStatusColorClass,
  getRobotStatusDotColor,
  getTaskStatusName,
  getTaskStatusColor,
  getTaskTypeName,
  getTaskTypeColor,
  getAreaName,
  getAreaColor,
} from '@/utils/format';

interface StatusBadgeProps {
  variant?: 'robot' | 'task' | 'task-type' | 'fault' | 'area' | 'priority';
  status?: string;
  level?: number;
  pulse?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export function StatusBadge({
  variant = 'robot',
  status = 'idle',
  level,
  pulse = false,
  size = 'md',
  className,
}: StatusBadgeProps) {
  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5';

  if (variant === 'robot') {
    const s = status as RobotStatus;
    const dot = getRobotStatusDotColor(s);
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full border font-medium',
          'bg-white/5 backdrop-blur',
          sizeClass,
          getRobotStatusColorClass(s),
          s === 'fault' ? 'border-red-500/40' : s === 'charging' ? 'border-emerald-500/40' : 'border-white/10',
          className
        )}
      >
        <span
          className={cn('w-1.5 h-1.5 rounded-full', pulse && s === 'fault' ? 'animate-ping absolute' : '')}
          style={{ backgroundColor: dot }}
        />
        {pulse && s === 'fault' && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: dot }} />}
        {getRobotStatusName(s)}
      </span>
    );
  }

  if (variant === 'task') {
    const s = status as TaskStatus;
    const color = getTaskStatusColor(s);
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full border font-medium',
          'bg-white/5 backdrop-blur',
          sizeClass,
          className
        )}
        style={{ color, borderColor: `${color}55` }}
      >
        <span
          className={cn('w-1.5 h-1.5 rounded-full', pulse ? 'animate-pulse' : '')}
          style={{ backgroundColor: color }}
        />
        {getTaskStatusName(s)}
      </span>
    );
  }

  if (variant === 'task-type') {
    const s = status as TaskType;
    const color = getTaskTypeColor(s);
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full font-medium',
          'bg-white/5 backdrop-blur border',
          sizeClass,
          className
        )}
        style={{ color, borderColor: `${color}55` }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        {getTaskTypeName(s)}
      </span>
    );
  }

  if (variant === 'fault') {
    const s = status as FaultLevel;
    const map: Record<FaultLevel, { color: string; name: string }> = {
      critical: { color: '#DC2626', name: '严重' },
      major: { color: '#F59E0B', name: '重要' },
      minor: { color: '#3B82F6', name: '轻微' },
    };
    const info = map[s];
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full font-medium border',
          sizeClass,
          s === 'critical' ? 'animate-pulse' : '',
          className
        )}
        style={{ color: info.color, backgroundColor: `${info.color}15`, borderColor: `${info.color}55` }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: info.color }} />
        {info.name}
      </span>
    );
  }

  if (variant === 'area') {
    const s = status as AreaType;
    const color = getAreaColor(s);
    return (
      <span
        className={cn('inline-flex items-center rounded-full font-medium border bg-white/5 backdrop-blur', sizeClass, className)}
        style={{ color, borderColor: `${color}55` }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        {getAreaName(s)}
      </span>
    );
  }

  if (variant === 'priority') {
    const lv = level ?? Number(status);
    const map: Record<number, { color: string; name: string }> = {
      1: { color: '#DC2626', name: '高' },
      2: { color: '#F59E0B', name: '中' },
      3: { color: '#6B7280', name: '普通' },
    };
    const info = map[lv] ?? map[3];
    return (
      <span
        className={cn(
          'inline-flex items-center rounded-full font-medium border',
          sizeClass,
          className
        )}
        style={{ color: info.color, backgroundColor: `${info.color}15`, borderColor: `${info.color}55` }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: info.color }} />
        P{lv} · {info.name}
      </span>
    );
  }

  return null;
}
