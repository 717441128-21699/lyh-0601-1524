import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Search,
  Filter,
  ArrowLeft,
  Battery,
  MapPin,
  Gauge,
  Calendar,
  ChevronRight,
  X,
  Zap,
  Package,
  Wrench,
} from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ProgressRing } from '@/components/ui/ProgressRing';
import Empty from '@/components/Empty';
import { useDispatchStore } from '@/store/dispatchStore';
import { cn, getAreaName, getBatteryColor, getBatteryColorClass, formatMileage, formatDate } from '@/utils/format';
import type { Robot, RobotStatus } from '@/types';
import { ROBOT_STATUS_LABELS } from '@/utils/constants';

type FilterStatus = 'all' | RobotStatus | 'delivering';

const statusOptions: { value: FilterStatus; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'idle', label: '待机' },
  { value: 'working', label: '工作' },
  { value: 'delivering', label: '运输' },
  { value: 'charging', label: '充电' },
  { value: 'returning', label: '返航' },
  { value: 'avoiding', label: '避让' },
  { value: 'fault', label: '故障' },
];

function RobotModelPlaceholder({ model }: { model: string }) {
  return (
    <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-br from-slate-800/80 via-slate-900 to-slate-800/50 border border-white/5">
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 bg-cyan-500/10 blur-2xl rounded-full scale-150" />
          <div className="relative flex flex-col items-center gap-2">
            <div className="w-16 h-12 rounded-lg bg-gradient-to-b from-slate-600 to-slate-700 border border-white/10 shadow-lg shadow-black/30 relative overflow-hidden">
              <div className="absolute top-1 left-1/2 -translate-x-1/2 w-10 h-2 rounded-sm bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 opacity-80 shadow-md shadow-cyan-500/50" />
              <div className="absolute bottom-1 left-1 w-2 h-2 rounded-full bg-emerald-400 shadow-md shadow-emerald-500/50 animate-pulse" />
              <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-emerald-400 shadow-md shadow-emerald-500/50 animate-pulse" />
              <div className="absolute inset-x-2 top-4 h-5 rounded bg-gradient-to-br from-slate-700 to-slate-800 border border-white/5" />
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 border border-white/10 shadow-inner" />
              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-slate-500 to-slate-600 border border-white/10 shadow-inner" />
            </div>
          </div>
        </div>
      </div>
      <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/40 backdrop-blur border border-white/10">
        <span className="text-[9px] font-mono text-slate-400">{model.split('-')[0]}</span>
      </div>
      <div className="absolute bottom-2 left-2 right-2 h-8 rounded-lg bg-black/30 backdrop-blur-sm border border-white/5 flex items-center justify-center gap-2">
        <div className="flex items-center gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[9px] text-slate-300 font-mono">ONLINE</span>
        </div>
        <div className="w-px h-3 bg-white/10" />
        <span className="text-[9px] text-slate-400 font-mono">v2.4.1</span>
      </div>
    </div>
  );
}

function RobotInfoCard({ robot, onClick }: { robot: Robot; onClick: () => void }) {
  const batteryColor = getBatteryColor(robot.battery);
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative w-full text-left rounded-2xl p-4 transition-all duration-300',
        'bg-gradient-to-br from-slate-900/80 to-slate-900/40 border border-white/5',
        'backdrop-blur-sm hover:border-cyan-500/30 hover:shadow-xl hover:shadow-cyan-500/5 hover:-translate-y-1'
      )}
    >
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-cyan-500/5 via-transparent to-violet-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="relative space-y-3.5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/10 border border-cyan-500/20 flex items-center justify-center">
                <Bot size={18} className="text-cyan-400" />
              </div>
              {robot.status === 'fault' && (
                <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border-2 border-slate-900 animate-ping" />
              )}
            </div>
            <div>
              <div
                className="text-base font-bold text-white tracking-wide"
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                {robot.code}
              </div>
              <div className="text-[10px] text-slate-500">{robot.model}</div>
            </div>
          </div>
          <StatusBadge variant="robot" status={robot.status} pulse size="sm" />
        </div>

        <RobotModelPlaceholder model={robot.model} />

        <div className="flex items-center gap-3">
          <div className="shrink-0">
            <ProgressRing
              value={robot.battery}
              size={56}
              strokeWidth={5}
              color={batteryColor}
              trackColor="#1e293b"
              label="电量"
            />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 flex items-center gap-1">
                <MapPin size={11} />
                当前位置
              </span>
            </div>
            <div className="text-xs text-slate-300 font-medium truncate">{getAreaName(robot.position.area)}</div>
            <div className="flex items-center justify-between text-[10px] font-mono text-slate-600">
              <span>X: {robot.position.x.toFixed(1)}</span>
              <span>Z: {robot.position.z.toFixed(1)}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/5">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Gauge size={11} className="text-emerald-400" />
              <span className="text-[10px] text-slate-500">里程</span>
            </div>
            <div className="text-xs font-bold text-emerald-300 font-mono">{formatMileage(robot.totalMileage)}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Package size={11} className="text-blue-400" />
              <span className="text-[10px] text-slate-500">运输</span>
            </div>
            <div className="text-xs font-bold text-blue-300 font-mono">{robot.totalDeliveries}</div>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-0.5">
              <Calendar size={11} className="text-violet-400" />
              <span className="text-[10px] text-slate-500">投用</span>
            </div>
            <div className="text-xs font-bold text-violet-300 font-mono">{formatDate(robot.deployDate).slice(5)}</div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-1.5">
            <Wrench size={11} className="text-slate-600" />
            <span className="text-[10px] text-slate-600">
              上次维护：{formatDate(robot.lastMaintenance)}
            </span>
          </div>
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium transition-all',
              'text-slate-500 group-hover:text-cyan-400'
            )}
          >
            查看详情
            <ChevronRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </div>
        </div>
      </div>
    </button>
  );
}

export default function RobotList() {
  const navigate = useNavigate();
  const { robots } = useDispatchStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [batteryMin, setBatteryMin] = useState(0);
  const [batteryMax, setBatteryMax] = useState(100);
  const [showFilters, setShowFilters] = useState(false);

  const filteredRobots = useMemo(() => {
    return robots.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (r.battery < batteryMin || r.battery > batteryMax) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        if (
          !r.code.toLowerCase().includes(q) &&
          !r.model.toLowerCase().includes(q) &&
          !getAreaName(r.position.area).includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  }, [robots, statusFilter, batteryMin, batteryMax, searchQuery]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { all: robots.length };
    robots.forEach((r) => {
      counts[r.status] = (counts[r.status] ?? 0) + 1;
    });
    return counts;
  }, [robots]);

  const activeFilterCount =
    (statusFilter !== 'all' ? 1 : 0) +
    (batteryMin > 0 || batteryMax < 100 ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  const resetFilters = () => {
    setStatusFilter('all');
    setBatteryMin(0);
    setBatteryMax(100);
    setSearchQuery('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="max-w-[1400px] mx-auto px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5 transition-all"
            >
              <ArrowLeft size={16} />
              <span className="text-sm">返回调度</span>
            </button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">
                机器人管理
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                共 {robots.length} 台设备 · 在线 {robots.filter((r) => r.status !== 'fault').length} 台
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-xl border text-sm transition-all',
                activeFilterCount > 0 || showFilters
                  ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                  : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:bg-white/10'
              )}
            >
              <Filter size={15} />
              筛选
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-900 text-[10px] font-bold flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="rounded-2xl bg-slate-900/50 border border-white/5 backdrop-blur-xl p-4 mb-5 space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[260px] max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="搜索机器人编号、型号、位置..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-800/50 border border-white/5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/40 focus:bg-slate-800/80 transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-800/30 border border-white/5 overflow-x-auto">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setStatusFilter(opt.value)}
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                    statusFilter === opt.value
                      ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/30 shadow-inner'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  )}
                >
                  {opt.label}
                  <span
                    className={cn(
                      'text-[10px] font-mono px-1.5 py-0.5 rounded-md',
                      statusFilter === opt.value ? 'bg-cyan-500/20 text-cyan-200' : 'bg-white/5 text-slate-500'
                    )}
                  >
                    {statusCounts[opt.value] ?? 0}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {showFilters && (
            <div className="pt-4 border-t border-white/5 space-y-3 animate-[fadeIn_0.2s_ease-out]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                      <Battery size={12} />
                      电量范围筛选
                    </label>
                    <span className="text-xs font-mono text-slate-500">
                      {batteryMin}% ~ {batteryMax}%
                    </span>
                  </div>
                  <div className="flex items-center gap-3 px-2">
                    <div className="flex-1 relative h-2">
                      <div className="absolute inset-y-0 left-0 right-0 rounded-full bg-slate-800" />
                      <div
                        className="absolute inset-y-0 rounded-full bg-gradient-to-r from-emerald-500 via-amber-500 to-red-500"
                        style={{
                          left: `${batteryMin}%`,
                          right: `${100 - batteryMax}%`,
                        }}
                      />
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={batteryMin}
                        onChange={(e) => setBatteryMin(Math.min(Number(e.target.value), batteryMax))}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer"
                      />
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={batteryMax}
                        onChange={(e) => setBatteryMax(Math.max(Number(e.target.value), batteryMin))}
                        className="absolute inset-0 w-full opacity-0 cursor-pointer"
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-cyan-500 shadow-lg shadow-cyan-500/30 -ml-2"
                        style={{ left: `${batteryMin}%` }}
                      />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white border-2 border-cyan-500 shadow-lg shadow-cyan-500/30 -ml-2"
                        style={{ left: `${batteryMax}%` }}
                      />
                    </div>
                    <button
                      onClick={resetFilters}
                      className="text-xs px-3 py-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-red-500/10 hover:text-red-300 border border-white/5 transition-all"
                    >
                      重置
                    </button>
                  </div>
                  <div className="flex items-center justify-between px-1 text-[10px] font-mono text-slate-600">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                    <Zap size={12} />
                    状态分布概览
                  </label>
                  <div className="flex items-end gap-1.5 h-16 px-1">
                    {(Object.keys(ROBOT_STATUS_LABELS) as RobotStatus[]).map((status) => {
                      const count = statusCounts[status] ?? 0;
                      const height = robots.length > 0 ? (count / robots.length) * 100 : 0;
                      const color = ROBOT_STATUS_LABELS[status]?.dotColor ?? '#64748b';
                      return (
                        <button
                          key={status}
                          onClick={() => setStatusFilter(status)}
                          className="flex-1 min-w-0 group relative"
                          title={`${ROBOT_STATUS_LABELS[status]?.name ?? status}: ${count}台`}
                        >
                          <div
                            className={cn(
                              'w-full rounded-t-md transition-all duration-300 origin-bottom',
                              statusFilter === status
                                ? 'opacity-100 scale-y-105'
                                : 'opacity-60 group-hover:opacity-100 group-hover:scale-y-105'
                            )}
                            style={{
                              height: `${Math.max(height, 4)}%`,
                              background: `linear-gradient(to top, ${color}88, ${color}cc)`,
                              boxShadow: `0 0 8px ${color}44`,
                            }}
                          />
                          <div className="text-center mt-1.5">
                            <div
                              className="w-1.5 h-1.5 mx-auto rounded-full"
                              style={{ backgroundColor: color }}
                            />
                            <div className="text-[9px] font-mono text-slate-600 mt-0.5">{count}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {filteredRobots.length === 0 ? (
          <div className="py-24">
            <Empty
              title="未找到匹配的机器人"
              description="尝试调整筛选条件或搜索关键词"
              action={{ label: '重置筛选', onClick: resetFilters }}
            />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-500">
                找到 <span className="text-slate-300 font-mono font-bold">{filteredRobots.length}</span> 台机器人
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredRobots.map((robot) => (
                <RobotInfoCard
                  key={robot.id}
                  robot={robot}
                  onClick={() => navigate(`/robots/${robot.id}`)}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
