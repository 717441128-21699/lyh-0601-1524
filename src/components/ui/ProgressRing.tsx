import { cn } from '@/utils/format';

interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
  className?: string;
  showValue?: boolean;
  counterClockwise?: boolean;
}

export function ProgressRing({
  value,
  max = 100,
  size = 80,
  strokeWidth = 6,
  color = '#0EA5E9',
  trackColor = '#1E293B',
  label,
  sublabel,
  className,
  showValue = true,
  counterClockwise = false,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  const offset = counterClockwise
    ? circumference * (1 - pct / 100)
    : circumference * (pct / 100);

  const gradientId = `ring-grad-${Math.random().toString(36).slice(2, 8)}`;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={trackColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - offset}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
          style={{ filter: `drop-shadow(0 0 4px ${color}88)` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {showValue && (
          <span
            className="font-bold leading-none"
            style={{
              color,
              fontSize: size * 0.22,
              fontFamily: 'JetBrains Mono, monospace',
            }}
          >
            {Math.round(pct)}%
          </span>
        )}
        {label && (
          <span className="text-[9px] text-slate-400 mt-0.5 uppercase tracking-wider">
            {label}
          </span>
        )}
        {sublabel && <span className="text-[8px] text-slate-500">{sublabel}</span>}
      </div>
    </div>
  );
}
