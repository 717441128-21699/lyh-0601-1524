import { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Battery,
  MapPin,
  Calendar,
  Gauge,
  Package,
  Truck,
  Play,
  Pause,
  FastForward,
  Rewind,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Wrench,
  Activity,
  Clock,
  Zap,
  ChevronRight,
  Inbox,
} from 'lucide-react';
import dayjs from 'dayjs';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { DataCard } from '@/components/ui/DataCard';
import Empty from '@/components/Empty';
import { useDispatchStore } from '@/store/dispatchStore';
import { cn, getAreaName, getBatteryColor, formatDateTime, formatDuration, formatMileage, formatDate, formatWeight } from '@/utils/format';
import { AREAS, AREA_ORDER } from '@/utils/constants';
import type { DeliveryRecord, Robot, Task } from '@/types';

interface TrajectoryPoint {
  x: number;
  y: number;
  area: string;
  time: string;
}

function SemicircleGauge({ value }: { value: number }) {
  const size = 220;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2 + 10;
  const circumference = Math.PI * radius;
  const pct = Math.min(100, Math.max(0, value));
  const offset = circumference * (1 - pct / 100);
  const color = getBatteryColor(value);

  const marks = [0, 25, 50, 75, 100];

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size / 2 + 30 }}>
      <svg width={size} height={size / 2 + 30} className="overflow-visible">
        <defs>
          <linearGradient id="semi-gauge-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#EF4444" />
            <stop offset="35%" stopColor="#F59E0B" />
            <stop offset="75%" stopColor="#10B981" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
          <filter id="semi-glow">
            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="#1e293b"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
        <path
          d={`M ${cx - radius} ${cy} A ${radius} ${radius} 0 0 1 ${cx + radius} ${cy}`}
          fill="none"
          stroke="url(#semi-gauge-grad)"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          filter="url(#semi-glow)"
          className="transition-all duration-1000 ease-out"
          style={{ transformOrigin: cx + 'px ' + cy + 'px' }}
        />
        {marks.map((m, i) => {
          const angle = Math.PI * (1 - m / 100);
          const x1 = cx + Math.cos(angle) * (radius + 6);
          const y1 = cy - Math.sin(angle) * (radius + 6);
          const x2 = cx + Math.cos(angle) * (radius + 14);
          const y2 = cy - Math.sin(angle) * (radius + 14);
          const lx = cx + Math.cos(angle) * (radius + 24);
          const ly = cy - Math.sin(angle) * (radius + 24);
          return (
            <g key={m}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
              <text
                x={lx}
                y={ly}
                fill="#64748b"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {m}
              </text>
            </g>
          );
        })}
        <circle
          cx={cx + Math.cos(Math.PI * (1 - pct / 100)) * radius}
          cy={cy - Math.sin(Math.PI * (1 - pct / 100)) * radius}
          r={8}
          fill={color}
          filter="url(#semi-glow)"
          className="transition-all duration-1000 ease-out"
        />
        <circle
          cx={cx + Math.cos(Math.PI * (1 - pct / 100)) * radius}
          cy={cy - Math.sin(Math.PI * (1 - pct / 100)) * radius}
          r={3}
          fill="#fff"
        />
      </svg>
      <div className="absolute flex flex-col items-center" style={{ bottom: 5 }}>
        <span
          className="font-bold leading-none"
          style={{
            color,
            fontSize: 44,
            fontFamily: 'JetBrains Mono, monospace',
            textShadow: `0 0 20px ${color}66`,
          }}
        >
          {Math.round(pct)}%
        </span>
        <span className="text-[11px] text-slate-500 uppercase tracking-widest mt-1">剩余电量</span>
      </div>
    </div>
  );
}

function CurrentTaskCard({ task }: { task: Task | null }) {
  if (!task) {
    return (
      <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-center">
        <Inbox size={28} className="mx-auto text-slate-600 mb-2 opacity-50" />
        <p className="text-sm text-slate-500">当前无执行任务</p>
        <p className="text-xs text-slate-600 mt-1">机器人处于待机状态</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl bg-gradient-to-br from-violet-500/10 via-slate-900/50 to-blue-500/10 border border-violet-500/20 overflow-hidden">
      <div className="px-4 py-3 border-b border-white/5 bg-violet-500/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck size={14} className="text-violet-400" />
          <span className="text-xs font-semibold text-violet-300 uppercase tracking-wider">当前任务</span>
        </div>
        <span className="text-[10px] font-mono text-slate-500">{task.code}</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 flex-wrap">
          <StatusBadge variant="priority" level={task.priority} size="sm" />
          <StatusBadge variant="task-type" status={task.type} size="sm" />
          <StatusBadge variant="task" status={task.status} size="sm" pulse />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="flex-1 flex items-center gap-1.5">
            <StatusBadge variant="area" status={task.origin} size="sm" />
          </div>
          <ChevronRight size={14} className="text-slate-600 shrink-0" />
          <div className="flex-1 flex items-center gap-1.5 justify-end">
            <StatusBadge variant="area" status={task.destination} size="sm" />
          </div>
        </div>
        <div className="rounded-lg bg-black/20 border border-white/5 p-3 space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">运输物品</span>
            <span className="text-slate-200 font-medium truncate ml-2">{task.cargo.name}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">重量</span>
            <span className="text-slate-300 font-mono">{formatWeight(task.cargo.weight)}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-500">创建时间</span>
            <span className="text-slate-300 font-mono">{formatDateTime(task.createTime)}</span>
          </div>
          {task.cargo.isNarcotic && (
            <div className="flex items-center gap-1.5 pt-1.5 mt-1.5 border-t border-white/5">
              <AlertCircle size={11} className="text-red-400" />
              <span className="text-[11px] text-red-400">
                毒麻药品 · 等级 {task.cargo.narcoticLevel} · 需审批
              </span>
            </div>
          )}
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-slate-500">运输进度</span>
            <span className="font-mono text-violet-300">{Math.round(task.routeProgress * 100)}%</span>
          </div>
          <div className="relative h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-500 transition-all duration-500"
              style={{ width: `${task.routeProgress * 100}%` }}
            />
            <div
              className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_1.5s_infinite]"
              style={{ left: `${Math.max(0, task.routeProgress * 100 - 8)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function TrajectoryTimeline({ records }: { records: DeliveryRecord[] }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [progress, setProgress] = useState(0);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const trajectoryPoints: TrajectoryPoint[] = useMemo(() => {
    const points: TrajectoryPoint[] = [];
    const now = dayjs();
    const startOfDay = now.startOf('day');

    AREA_ORDER.forEach((area, idx) => {
      const cfg = AREAS[area];
      const baseX = 40 + idx * (520 / AREA_ORDER.length);
      const baseY = 120 + Math.sin(idx * 1.2) * 40;
      const areaRecords = records.filter((r) => r.origin === area || r.destination === area);

      if (areaRecords.length > 0) {
        areaRecords.slice(0, 3).forEach((r, rIdx) => {
          const hourOffset = dayjs(r.startTime).diff(startOfDay, 'hour') + rIdx * 0.5;
          points.push({
            x: baseX + (rIdx % 2 === 0 ? -10 : 10),
            y: baseY - Math.min(hourOffset * 3, 80) + rIdx * 5,
            area,
            time: r.startTime,
          });
        });
      } else {
        points.push({
          x: baseX,
          y: baseY,
          area,
          time: startOfDay.add(8 + idx * 2, 'hour').toISOString(),
        });
      }
    });

    points.sort((a, b) => dayjs(a.time).valueOf() - dayjs(b.time).valueOf());
    return points.slice(0, 12);
  }, [records]);

  useEffect(() => {
    if (!isPlaying || trajectoryPoints.length < 2) return;

    const animate = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const delta = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      setProgress((prev) => {
        const next = prev + delta * 0.08 * speed;
        if (next >= 1) {
          setIsPlaying(false);
          return 1;
        }
        return next;
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = 0;
    };
  }, [isPlaying, speed, trajectoryPoints.length]);

  useEffect(() => {
    if (!isPlaying) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTimeRef.current = 0;
    }
  }, [isPlaying]);

  const currentIdx = Math.min(
    Math.floor(progress * (trajectoryPoints.length - 1)),
    trajectoryPoints.length - 1
  );
  const localT = trajectoryPoints.length > 1
    ? progress * (trajectoryPoints.length - 1) - currentIdx
    : 0;

  const currentPoint = trajectoryPoints[currentIdx];
  const nextPoint = trajectoryPoints[Math.min(currentIdx + 1, trajectoryPoints.length - 1)];

  const botX = currentPoint && nextPoint
    ? currentPoint.x + (nextPoint.x - currentPoint.x) * localT
    : trajectoryPoints[0]?.x ?? 0;
  const botY = currentPoint && nextPoint
    ? currentPoint.y + (nextPoint.y - currentPoint.y) * localT
    : trajectoryPoints[0]?.y ?? 0;

  const pathD = trajectoryPoints.length > 1
    ? trajectoryPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    : '';

  if (records.length === 0 || trajectoryPoints.length < 2) {
    return (
      <div className="h-[280px] flex flex-col items-center justify-center">
        <Activity size={32} className="text-slate-700 mb-2 opacity-50" />
        <p className="text-sm text-slate-500">暂无今日轨迹数据</p>
        <p className="text-xs text-slate-600 mt-1">机器人今日尚未执行运输任务</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative rounded-xl bg-gradient-to-br from-slate-900/80 to-slate-950/80 border border-white/5 overflow-hidden">
        <svg viewBox="0 0 600 220" className="w-full h-[220px]">
          <defs>
            <linearGradient id="traj-path" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#3B82F6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#8B5CF6" stopOpacity="0.8" />
            </linearGradient>
            <filter id="traj-glow">
              <feGaussianBlur stdDeviation="2" />
            </filter>
          </defs>

          {[50, 100, 150].map((y) => (
            <line
              key={y}
              x1="20"
              y1={y}
              x2="580"
              y2={y}
              stroke="#1e293b"
              strokeWidth="1"
              strokeDasharray="2 4"
            />
          ))}

          {AREA_ORDER.map((area, idx) => {
            const cfg = AREAS[area];
            const x = 40 + idx * (520 / AREA_ORDER.length);
            return (
              <g key={area}>
                <line x1={x} y1="30" x2={x} y2="200" stroke="#1e293b" strokeWidth="1" strokeDasharray="2 4" />
                <circle cx={x} cy={120 + Math.sin(idx * 1.2) * 40} r="18" fill={cfg.color + '15'} stroke={cfg.color + '44'} strokeWidth="1" />
                <text x={x} y={210} fill="#64748b" fontSize="9" textAnchor="middle" fontFamily="JetBrains Mono, monospace">
                  {cfg.nameCn}
                </text>
                <circle cx={x} cy={120 + Math.sin(idx * 1.2) * 40} r="4" fill={cfg.color + '88'} />
              </g>
            );
          })}

          <path d={pathD} fill="none" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          <path
            d={pathD}
            fill="none"
            stroke="url(#traj-path)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="1000"
            strokeDashoffset={1000 * (1 - progress)}
            filter="url(#traj-glow)"
            className="transition-[stroke-dashoffset] duration-75"
          />

          {trajectoryPoints.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={i <= currentIdx ? 4 : 2.5}
              fill={i <= currentIdx ? '#06B6D4' : '#334155'}
              opacity={i <= currentIdx ? 1 : 0.5}
            >
              <title>{`${getAreaName(p.area as any)} - ${formatDateTime(p.time)}`}</title>
            </circle>
          ))}

          <g transform={`translate(${botX}, ${botY})`}>
            <circle r="12" fill="#06B6D4" opacity="0.2" className="animate-ping" />
            <circle r="8" fill="#06B6D4" opacity="0.4" />
            <circle r="5" fill="#22D3EE" stroke="#fff" strokeWidth="1.5" />
          </g>
        </svg>

        {currentPoint && (
          <div className="absolute top-3 right-3 rounded-lg bg-slate-900/90 border border-white/10 px-3 py-2 backdrop-blur">
            <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">当前位置</div>
            <div className="flex items-center gap-1.5">
              <StatusBadge variant="area" status={currentPoint.area as any} size="sm" />
            </div>
            <div className="text-[10px] font-mono text-slate-500 mt-1">
              {dayjs(currentPoint.time).format('HH:mm')} · 点 {currentIdx + 1}/{trajectoryPoints.length}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-800/50 border border-white/5">
          <button
            onClick={() => {
              setProgress(0);
              setIsPlaying(false);
            }}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <Rewind size={14} />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={cn(
              'p-2.5 rounded-lg transition-all',
              isPlaying
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10'
            )}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button
            onClick={() => {
              setProgress(1);
              setIsPlaying(false);
            }}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all"
          >
            <FastForward size={14} />
          </button>
        </div>

        <div className="flex-1 relative h-2 rounded-full bg-slate-800 overflow-hidden cursor-pointer group"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left;
            setProgress(Math.min(1, Math.max(0, x / rect.width)));
          }}
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 transition-all duration-200"
            style={{ width: `${progress * 100}%` }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-lg shadow-cyan-500/30 border-2 border-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progress * 100}% - 7px)` }}
          />
        </div>

        <div className="flex items-center gap-1 p-0.5 rounded-lg bg-slate-800/50 border border-white/5">
          {[0.5, 1, 2, 4].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={cn(
                'px-2.5 py-1 rounded-md text-[10px] font-mono font-bold transition-all',
                speed === s
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-500 hover:text-slate-300'
              )}
            >
              {s}x
            </button>
          ))}
        </div>

        <span className="text-[10px] font-mono text-slate-500 min-w-[72px] text-right">
          {Math.round(progress * 100)}%
        </span>
      </div>
    </div>
  );
}

function DeliveryRecordsTable({ records }: { records: DeliveryRecord[] }) {
  if (records.length === 0) {
    return (
      <div className="py-16">
        <Empty
          title="暂无运输记录"
          description="该机器人今日尚未完成运输任务"
          icon={<Package size={32} />}
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/5 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800/40 border-b border-white/5">
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                任务编号
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                起止时间
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                路线
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                运输物品
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                时长
              </th>
              <th className="text-left px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                签收人
              </th>
              <th className="text-center px-4 py-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                状态
              </th>
            </tr>
          </thead>
          <tbody>
            {records.map((r, idx) => (
              <tr
                key={r.id}
                className={cn(
                  'border-b border-white/5 transition-colors hover:bg-white/[0.02]',
                  idx === records.length - 1 && 'border-b-0'
                )}
              >
                <td className="px-4 py-3">
                  <span className="text-xs font-mono text-slate-300">{r.taskCode}</span>
                  {r.isNarcotic && (
                    <span className="ml-2 inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30">
                      毒麻
                    </span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="text-[11px] text-slate-400 font-mono space-y-0.5">
                    <div>起 {dayjs(r.startTime).format('HH:mm:ss')}</div>
                    <div>止 {dayjs(r.endTime).format('HH:mm:ss')}</div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5">
                    <StatusBadge variant="area" status={r.origin} size="sm" />
                    <ChevronRight size={10} className="text-slate-600 shrink-0" />
                    <StatusBadge variant="area" status={r.destination} size="sm" />
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-slate-200 truncate block max-w-[160px]">{r.cargoName}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs font-mono text-slate-300">{formatDuration(r.durationMinutes)}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-xs text-slate-300">{r.signer ?? '-'}</span>
                </td>
                <td className="px-4 py-3 text-center">
                  {r.onTime ? (
                    <span className="inline-flex items-center gap-1 text-[11px] text-emerald-400">
                      <CheckCircle size={12} />
                      准时
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[11px] text-amber-400">
                      <Clock size={12} />
                      延迟
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function RobotDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { robots, tasks, deliveryRecords, faultOrders } = useDispatchStore();

  const robot: Robot | undefined = useMemo(() => robots.find((r) => r.id === id), [robots, id]);

  const todayRecords = useMemo(() => {
    if (!robot) return [] as DeliveryRecord[];
    const today = dayjs().format('YYYY-MM-DD');
    return deliveryRecords.filter(
      (r) => r.robotId === robot.id && dayjs(r.endTime).format('YYYY-MM-DD') === today
    );
  }, [deliveryRecords, robot]);

  const currentTask = useMemo(() => {
    if (!robot || !robot.currentTaskId) return null;
    return tasks.find((t) => t.id === robot.currentTaskId) ?? null;
  }, [tasks, robot]);

  const todayFaults = useMemo(() => {
    if (!robot) return [];
    const today = dayjs().format('YYYY-MM-DD');
    return faultOrders.filter(
      (f) => f.robotId === robot.id && dayjs(f.createTime).format('YYYY-MM-DD') === today
    );
  }, [faultOrders, robot]);

  const stats = useMemo(() => {
    const onTime = todayRecords.filter((r) => r.onTime).length;
    const totalTime = todayRecords.reduce((sum, r) => sum + r.durationMinutes, 0);
    return {
      deliveries: todayRecords.length,
      onTimeRate: todayRecords.length > 0 ? Math.round((onTime / todayRecords.length) * 100) : 0,
      totalTime,
      faults: todayFaults.length,
    };
  }, [todayRecords, todayFaults]);

  if (!robot) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle size={48} className="mx-auto text-slate-600 mb-4" />
          <h2 className="text-xl font-semibold text-slate-300 mb-2">机器人不存在</h2>
          <p className="text-sm text-slate-500 mb-6">未找到编号对应的机器人设备</p>
          <button
            onClick={() => navigate('/robots')}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/20 transition-all"
          >
            <ArrowLeft size={16} />
            返回列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/robots')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5 transition-all"
            >
              <ArrowLeft size={16} />
              <span className="text-sm">返回列表</span>
            </button>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/30 flex items-center justify-center relative">
                <Activity size={24} className="text-cyan-400" />
                {robot.status === 'fault' && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-slate-900 animate-ping" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1
                    className="text-2xl font-bold text-white tracking-wide"
                    style={{ fontFamily: 'JetBrains Mono, monospace' }}
                  >
                    {robot.code}
                  </h1>
                  <StatusBadge variant="robot" status={robot.status} pulse size="md" />
                </div>
                <p className="text-sm text-slate-500 mt-0.5">
                  {robot.model} · 投用于 {formatDate(robot.deployDate)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-white/5 backdrop-blur-xl p-5">
              <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-1.5">
                <Zap size={12} className="text-cyan-400" />
                实时状态
              </h2>
              <div className="flex justify-center mb-2">
                <SemicircleGauge value={robot.battery} />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-2">
                <DataCard
                  title="累计里程"
                  value={formatMileage(robot.totalMileage)}
                  icon={<Gauge size={14} />}
                  color="green"
                  className="!p-3"
                />
                <DataCard
                  title="累计运输"
                  value={robot.totalDeliveries}
                  icon={<Package size={14} />}
                  color="blue"
                  className="!p-3"
                />
              </div>
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-white/5 backdrop-blur-xl p-5 space-y-4">
              <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={12} className="text-violet-400" />
                位置信息
              </h2>
              <div className="rounded-xl bg-black/20 border border-white/5 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">所在区域</span>
                  <StatusBadge variant="area" status={robot.position.area} size="sm" />
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/5">
                  <div className="text-center">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">X 坐标</div>
                    <div className="text-sm font-mono text-slate-300">{robot.position.x.toFixed(2)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Y 坐标</div>
                    <div className="text-sm font-mono text-slate-300">{robot.position.y.toFixed(2)}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-0.5">Z 坐标</div>
                    <div className="text-sm font-mono text-slate-300">{robot.position.z.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            </div>

            <CurrentTaskCard task={currentTask} />

            <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-white/5 backdrop-blur-xl p-5 space-y-3">
              <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Wrench size={12} className="text-amber-400" />
                维护信息
              </h2>
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Calendar size={12} />
                    上次维护
                  </span>
                  <span className="text-slate-300 font-mono">{formatDate(robot.lastMaintenance)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <Battery size={12} />
                    电池健康度
                  </span>
                  <span className="text-emerald-400 font-mono">良好</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 flex items-center gap-1.5">
                    <AlertCircle size={12} />
                    今日故障
                  </span>
                  <span className={cn('font-mono', stats.faults > 0 ? 'text-red-400' : 'text-slate-400')}>
                    {stats.faults} 次
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <DataCard
                title="今日运输"
                value={stats.deliveries}
                icon={<Package size={16} />}
                color="blue"
                className="!p-4"
              />
              <DataCard
                title="准时率"
                value={`${stats.onTimeRate}%`}
                icon={<CheckCircle size={16} />}
                color="green"
                className="!p-4"
              />
              <DataCard
                title="总工时"
                value={formatDuration(stats.totalTime)}
                icon={<Clock size={16} />}
                color="violet"
                className="!p-4"
              />
              <DataCard
                title="今日故障"
                value={stats.faults}
                icon={<AlertTriangle size={16} />}
                color={stats.faults > 0 ? 'red' : 'cyan'}
                className="!p-4"
              />
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-white/5 backdrop-blur-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity size={12} className="text-cyan-400" />
                  24小时运动轨迹
                </h2>
                <span className="text-[10px] text-slate-600 font-mono">
                  {todayRecords.length > 0 ? `${todayRecords.length} 条记录` : ''}
                </span>
              </div>
              <TrajectoryTimeline records={todayRecords} />
            </div>

            <div className="rounded-2xl bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-white/5 backdrop-blur-xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck size={12} className="text-blue-400" />
                  当日运输记录
                </h2>
                <span className="text-[10px] text-slate-600 font-mono">
                  共 {todayRecords.length} 条
                </span>
              </div>
              <DeliveryRecordsTable records={todayRecords} />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(400%); }
        }
      `}</style>
    </div>
  );
}
