import { useState, useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import dayjs from 'dayjs';
import {
  CalendarDays,
  TrendingUp,
  Package,
  Clock,
  Zap,
  Bot,
  AlertTriangle,
  ChevronDown,
  BarChart3,
  Activity,
} from 'lucide-react';
import { DataCard } from '@/components/ui/DataCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { cn, roundTo, randomRange } from '@/utils/format';
import { createInitialDailyReport } from '@/utils/mock';
import type { DailyReport, DailyReportRobotStats } from '@/types';

type DateRangeKey = 'today' | 'week' | 'month' | 'custom';

const dateRanges: { key: DateRangeKey; label: string }[] = [
  { key: 'today', label: '今日' },
  { key: 'week', label: '本周' },
  { key: 'month', label: '本月' },
  { key: 'custom', label: '自定义' },
];

const chartTheme = {
  cyan: '#06B6D4',
  blue: '#3B82F6',
  violet: '#8B5CF6',
  emerald: '#10B981',
  amber: '#F59E0B',
  red: '#EF4444',
  pink: '#EC4899',
  orange: '#F97316',
};

const pieColors = [chartTheme.cyan, chartTheme.violet, chartTheme.amber, chartTheme.emerald, chartTheme.red];

const generate7DayTrend = () => {
  return Array.from({ length: 7 }, (_, i) => {
    const date = dayjs().subtract(6 - i, 'day');
    return {
      date: date.format('MM/DD'),
      准时率: roundTo(randomRange(88, 98, 1), 1),
      目标: 95,
    };
  });
};

const generateBatteryTrend = () => {
  return Array.from({ length: 7 }, (_, i) => {
    const date = dayjs().subtract(6 - i, 'day');
    return {
      date: date.format('MM/DD'),
      消耗: roundTo(randomRange(900, 1400, 0), 0),
      回充: roundTo(randomRange(750, 1200, 0), 0),
    };
  });
};

const heatmapColors = [
  { threshold: 0, color: 'rgba(255,255,255,0.02)' },
  { threshold: 3, color: 'rgba(6,182,212,0.15)' },
  { threshold: 6, color: 'rgba(6,182,212,0.3)' },
  { threshold: 10, color: 'rgba(59,130,246,0.45)' },
  { threshold: 14, color: 'rgba(139,92,246,0.6)' },
  { threshold: 999, color: 'rgba(236,72,153,0.75)' },
];

const getHeatmapColor = (count: number) => {
  for (const h of heatmapColors) {
    if (count <= h.threshold) return h.color;
  }
  return heatmapColors[heatmapColors.length - 1].color;
};

const ChartCard = ({
  title,
  subtitle,
  children,
  right,
  className,
}: {
  title: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
  className?: string;
}) => (
  <div className={cn('glass rounded-xl p-5 card-hover', className)}>
    <div className="flex items-start justify-between mb-4">
      <div>
        <h3 className="text-white font-semibold flex items-center gap-2">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
    <div className="w-full">{children}</div>
  </div>
);

const customTooltipStyle = {
  backgroundColor: 'rgba(15, 23, 42, 0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '10px',
  boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
  color: '#e2e8f0',
  fontSize: '12px',
};

export default function ReportCenter() {
  const [dateRange, setDateRange] = useState<DateRangeKey>('today');
  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [customStart, setCustomStart] = useState(dayjs().subtract(7, 'day').format('YYYY-MM-DD'));
  const [customEnd, setCustomEnd] = useState(dayjs().format('YYYY-MM-DD'));

  const report = useMemo<DailyReport>(() => createInitialDailyReport(), []);
  const onTimeTrend = useMemo(() => generate7DayTrend(), []);
  const batteryTrend = useMemo(() => generateBatteryTrend(), []);

  const robotBarData = useMemo(
    () =>
      report.robots.map((r) => ({
        name: r.robotCode,
        运输量: r.deliveryCount,
        准时送达: Math.round(r.deliveryCount * (r.onTimeRate / 100)),
      })),
    [report.robots]
  );

  const pieData = useMemo(
    () => report.faultDistribution.map((f) => ({ name: f.type, value: f.count })),
    [report.faultDistribution]
  );

  const totalDeliveriesMult = dateRange === 'today' ? 1 : dateRange === 'week' ? 6.5 : dateRange === 'month' ? 28 : 8;

  const statsCards = [
    {
      title: '总运输量',
      value: Math.round(report.totalDeliveries * totalDeliveriesMult).toLocaleString(),
      icon: <Package size={22} />,
      color: 'cyan' as const,
      trend: { value: 12.5, label: '环比' },
      footer: <span className="text-xs text-slate-400">日均 {report.totalDeliveries} 次</span>,
    },
    {
      title: '整体准时率',
      value: `${report.overallOnTimeRate}%`,
      icon: <TrendingUp size={22} />,
      color: 'green' as const,
      trend: { value: 2.1, label: '提升' },
      footer: <span className="text-xs text-slate-400">目标 95% · {report.overallOnTimeRate >= 95 ? '✓ 达标' : '接近目标'}</span>,
    },
    {
      title: '平均运输时长',
      value: `${report.avgDeliveryTime} 分`,
      icon: <Clock size={22} />,
      color: 'violet' as const,
      trend: { value: -8.3, label: '优化' },
      footer: <span className="text-xs text-slate-400">历史最优 12.8 分钟</span>,
    },
    {
      title: '电量消耗',
      value: `${Math.round(report.totalBatteryConsumption * totalDeliveriesMult)} Ah`,
      icon: <Zap size={22} />,
      color: 'amber' as const,
      trend: { value: -3.2, label: '节省' },
      footer: <span className="text-xs text-slate-400">单次平均 {Math.round(report.totalBatteryConsumption / Math.max(report.totalDeliveries, 1))} Ah</span>,
    },
    {
      title: '在线机器人',
      value: `${report.robots.length - 1}/${report.robots.length}`,
      icon: <Bot size={22} />,
      color: 'blue' as const,
      footer: <span className="text-xs text-slate-400">利用率 {Math.round(((report.robots.length - 1) / report.robots.length) * 100)}%</span>,
    },
    {
      title: '故障发生率',
      value: `${(
        (report.robots.reduce((s, r) => s + r.faultCount, 0) / Math.max(report.totalDeliveries, 1)) *
        100
      ).toFixed(2)}%`,
      icon: <AlertTriangle size={22} />,
      color: 'red' as const,
      trend: { value: -15.6, label: '下降' },
      footer: (
        <span className="text-xs text-slate-400">
          共 {report.robots.reduce((s, r) => s + r.faultCount, 0)} 起 · MTBF 128h
        </span>
      ),
    },
  ];

  return (
    <div className="h-full w-full overflow-y-auto p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="text-cyan-400" size={28} />
            数据可视化报表
          </h1>
          <p className="text-sm text-slate-400 mt-1">多维度机器人运营数据统计与趋势分析</p>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowDateDropdown(!showDateDropdown)}
            className="flex items-center gap-2.5 px-4 py-2.5 glass rounded-xl text-sm hover:border-cyan-500/30 transition-all"
          >
            <CalendarDays size={16} className="text-cyan-400" />
            <span className="text-slate-200">
              {dateRange === 'custom'
                ? `${customStart} ~ ${customEnd}`
                : dateRanges.find((d) => d.key === dateRange)?.label}
            </span>
            <ChevronDown size={14} className={cn('text-slate-400 transition-transform', showDateDropdown && 'rotate-180')} />
          </button>
          {showDateDropdown && (
            <div className="absolute right-0 top-full mt-2 w-72 glass-strong rounded-xl p-3 z-50 shadow-2xl border border-white/10">
              <div className="grid grid-cols-3 gap-1.5 mb-3">
                {dateRanges.map((d) => (
                  <button
                    key={d.key}
                    onClick={() => setDateRange(d.key)}
                    className={cn(
                      'px-3 py-2 text-sm rounded-lg border transition-all',
                      dateRange === d.key
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                        : 'bg-white/5 text-slate-300 border-white/5 hover:border-white/10'
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              {dateRange === 'custom' && (
                <div className="space-y-2 border-t border-white/5 pt-3">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">开始日期</label>
                    <input
                      type="date"
                      value={customStart}
                      onChange={(e) => setCustomStart(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-1">结束日期</label>
                    <input
                      type="date"
                      value={customEnd}
                      onChange={(e) => setCustomEnd(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        {statsCards.map((s, i) => (
          <DataCard key={i} {...s} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <ChartCard
          title={<><BarChart3 size={16} className="text-cyan-400" />各机器人运输量对比</>}
          subtitle="按运输次数降序排列"
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={robotBarData} barGap={4} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip contentStyle={customTooltipStyle} cursor={{ fill: 'rgba(6,182,212,0.05)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                <Bar dataKey="运输量" fill={chartTheme.cyan} radius={[6, 6, 0, 0]} />
                <Bar dataKey="准时送达" fill={chartTheme.emerald} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title={<><Activity size={16} className="text-emerald-400" />准时率 7 天趋势</>}
          subtitle="目标值 95%"
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={onTimeTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="onTimeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartTheme.emerald} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={chartTheme.emerald} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} domain={[80, 100]} />
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
                <Line
                  type="monotone"
                  dataKey="准时率"
                  stroke={chartTheme.emerald}
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: chartTheme.emerald, stroke: '#0a0f1c', strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="目标"
                  stroke={chartTheme.amber}
                  strokeWidth={1.5}
                  strokeDasharray="5 5"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <ChartCard
          title={<><AlertTriangle size={16} className="text-amber-400" />故障类型分布</>}
          subtitle="按故障数量统计"
        >
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                  dataKey="value"
                  stroke="rgba(10,15,28,1)"
                  strokeWidth={2}
                >
                  {pieData.map((_, idx) => (
                    <Cell key={`cell-${idx}`} fill={pieColors[idx % pieColors.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={customTooltipStyle} />
                <Legend
                  iconType="circle"
                  wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                  layout="vertical"
                  verticalAlign="middle"
                  align="right"
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title={<><Clock size={16} className="text-violet-400" />24 小时运输高峰热力图</>}
          subtitle="色阶越深表示运输量越大"
          className="xl:col-span-2"
        >
          <div className="h-72 flex flex-col justify-between">
            <div className="grid grid-cols-12 gap-1.5">
              {report.peakHours.map((h) => (
                <div key={h.hour} className="group relative">
                  <div
                    className="aspect-square rounded-md transition-all cursor-pointer hover:scale-110 border border-white/5"
                    style={{ backgroundColor: getHeatmapColor(h.count) }}
                  />
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 font-mono">
                    {String(h.hour).padStart(2, '0')}
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="px-2 py-1 rounded-lg text-[10px] bg-slate-900/95 border border-white/10 whitespace-nowrap text-slate-200">
                      {h.hour}:00-{h.hour + 1}:00 · {h.count} 次
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-12 gap-1.5 mt-4">
              {report.peakHours.slice(12).map((h) => (
                <div key={h.hour} className="group relative">
                  <div
                    className="aspect-square rounded-md transition-all cursor-pointer hover:scale-110 border border-white/5"
                    style={{ backgroundColor: getHeatmapColor(h.count) }}
                  />
                  <div className="absolute -top-1 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 font-mono">
                    {String(h.hour).padStart(2, '0')}
                  </div>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    <div className="px-2 py-1 rounded-lg text-[10px] bg-slate-900/95 border border-white/10 whitespace-nowrap text-slate-200">
                      {h.hour}:00-{h.hour + 1}:00 · {h.count} 次
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/5">
              <div className="flex items-center gap-3 text-[10px] text-slate-500">
                <span>低</span>
                {heatmapColors.slice(1).map((c, i) => (
                  <div
                    key={i}
                    className="w-8 h-2.5 rounded-sm"
                    style={{ backgroundColor: c.color }}
                  />
                ))}
                <span>高</span>
              </div>
              <div className="text-[10px] text-slate-500">
                高峰时段：08:00-11:00 · 14:00-17:00
              </div>
            </div>
          </div>
        </ChartCard>
      </div>

      <ChartCard
        title={<><Zap size={16} className="text-amber-400" />电量消耗 7 天趋势</>}
        subtitle="整体能量使用与回充情况"
      >
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={batteryTrend} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="consumeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartTheme.amber} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={chartTheme.amber} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="chargeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartTheme.blue} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartTheme.blue} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={customTooltipStyle} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }} />
              <Area
                type="monotone"
                dataKey="消耗"
                stroke={chartTheme.amber}
                strokeWidth={2}
                fill="url(#consumeGrad)"
              />
              <Area
                type="monotone"
                dataKey="回充"
                stroke={chartTheme.blue}
                strokeWidth={2}
                fill="url(#chargeGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard
        title={<><Bot size={16} className="text-blue-400" />各机器人明细统计</>}
        subtitle="点击列标题可排序"
      >
        <div className="overflow-x-auto rounded-xl border border-white/5">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-4 py-3 text-left font-medium">机器人</th>
                <th className="px-4 py-3 text-right font-medium">运输次数</th>
                <th className="px-4 py-3 text-right font-medium">准时率</th>
                <th className="px-4 py-3 text-right font-medium">平均时长</th>
                <th className="px-4 py-3 text-right font-medium">电量消耗</th>
                <th className="px-4 py-3 text-right font-medium">充电次数</th>
                <th className="px-4 py-3 text-right font-medium">故障次数</th>
                <th className="px-4 py-3 text-right font-medium">行驶里程</th>
                <th className="px-4 py-3 text-center font-medium">状态</th>
              </tr>
            </thead>
            <tbody>
              {report.robots.map((r: DailyReportRobotStats) => {
                const hasIssue = r.faultCount > 1 || r.onTimeRate < 90;
                return (
                  <tr
                    key={r.robotCode}
                    className="border-t border-white/5 hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                          <Bot size={15} className="text-cyan-400" />
                        </div>
                        <span className="text-white font-medium font-mono">{r.robotCode}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-200">{r.deliveryCount}</td>
                    <td className="px-4 py-3.5 text-right">
                      <span
                        className={cn(
                          'font-mono font-medium',
                          r.onTimeRate >= 95 ? 'text-emerald-400' : r.onTimeRate >= 90 ? 'text-cyan-400' : 'text-amber-400'
                        )}
                      >
                        {r.onTimeRate}%
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-300">{r.avgDeliveryTime} 分</td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-300">{r.batteryConsumption} Ah</td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-400">{r.chargeCount}</td>
                    <td className="px-4 py-3.5 text-right">
                      <span
                        className={cn(
                          'font-mono font-medium',
                          r.faultCount === 0 ? 'text-emerald-400' : r.faultCount === 1 ? 'text-amber-400' : 'text-red-400'
                        )}
                      >
                        {r.faultCount}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-right font-mono text-slate-300">{r.totalMileage} km</td>
                    <td className="px-4 py-3.5 text-center">
                      {hasIssue ? (
                        <StatusBadge variant="fault" status="major" size="sm" />
                      ) : (
                        <StatusBadge variant="robot" status="working" size="sm" />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </ChartCard>
    </div>
  );
}
