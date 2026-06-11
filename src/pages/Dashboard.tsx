import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bot,
  Truck,
  Clock,
  AlertTriangle,
  Eye,
  EyeOff,
  Grid3X3,
  MapPin,
  RotateCcw,
  Layers,
  User,
  ChevronRight,
  Battery,
  Activity,
  Zap,
  Search,
} from 'lucide-react';
import dayjs from 'dayjs';
import { HospitalScene } from '@/components/three3d/HospitalScene';
import { DataCard } from '@/components/ui/DataCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Timeline, TimelineItem } from '@/components/ui/Timeline';
import { useDispatchStore } from '@/store/dispatchStore';
import { useSceneStore, ViewMode } from '@/store/sceneStore';
import { cn, getAreaName, getBatteryColor, getBatteryColorClass } from '@/utils/format';
import type { Robot, Task, TaskStatus } from '@/types';

const viewButtons: { mode: ViewMode; label: string; icon: typeof Eye }[] = [
  { mode: 'overview', label: '鸟瞰', icon: Eye },
  { mode: 'follow', label: '跟随', icon: User },
  { mode: 'first_person', label: '第一人', icon: Activity },
];

function ViewToggle() {
  const { viewMode, setViewMode } = useSceneStore();
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex gap-1.5 p-1.5 rounded-xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-xl shadow-black/30">
      {viewButtons.map(({ mode, label, icon: Icon }) => (
        <button
          key={mode}
          onClick={() => setViewMode(mode)}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200',
            viewMode === mode
              ? 'bg-gradient-to-r from-cyan-500/30 to-blue-500/30 text-cyan-300 border border-cyan-500/40 shadow-inner shadow-cyan-500/10'
              : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
          )}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  );
}

function SceneControls() {
  const { showPaths, showLabels, showGrid, autoRotate, togglePaths, toggleLabels, toggleGrid, toggleAutoRotate } =
    useSceneStore();

  const toggles = [
    { key: 'paths', label: '路径', active: showPaths, onToggle: togglePaths, icon: Layers },
    { key: 'labels', label: '标签', active: showLabels, onToggle: toggleLabels, icon: MapPin },
    { key: 'grid', label: '网格', active: showGrid, onToggle: toggleGrid, icon: Grid3X3 },
    { key: 'rotate', label: '旋转', active: autoRotate, onToggle: toggleAutoRotate, icon: RotateCcw },
  ];

  return (
    <div className="absolute top-4 left-4 z-10 flex flex-col gap-1.5 p-2 rounded-xl bg-slate-900/80 border border-white/10 backdrop-blur-xl shadow-xl shadow-black/30">
      {toggles.map(({ key, label, active, onToggle, icon: Icon }) => (
        <button
          key={key}
          onClick={onToggle}
          className={cn(
            'flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 w-[96px]',
            active
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'
          )}
        >
          {active ? <Icon size={13} /> : <Icon size={13} className="opacity-50" />}
          <span className="flex-1 text-left">{label}</span>
          <span
            className={cn(
              'w-3.5 h-2 rounded-full transition-colors relative',
              active ? 'bg-emerald-500' : 'bg-slate-700'
            )}
          >
            <span
              className={cn(
                'absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full transition-all',
                active ? 'left-[14px] bg-white' : 'left-[1px] bg-slate-500'
              )}
            />
          </span>
        </button>
      ))}
    </div>
  );
}

function RobotCard({ robot, selected, onClick }: { robot: Robot; selected: boolean; onClick: () => void }) {
  const batteryColor = getBatteryColor(robot.battery);
  return (
    <button
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-3 p-2.5 rounded-xl transition-all duration-200 text-left w-full',
        'border backdrop-blur-sm group',
        selected
          ? 'bg-cyan-500/10 border-cyan-500/40 shadow-lg shadow-cyan-500/10 scale-[1.01]'
          : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-white/10'
      )}
    >
      <div className="relative shrink-0">
        <ProgressRing
          value={robot.battery}
          size={44}
          strokeWidth={4}
          color={batteryColor}
          trackColor="#1e293b"
          showValue={false}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <Bot size={16} className={getBatteryColorClass(robot.battery)} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span
            className="text-sm font-bold text-white tracking-wide"
            style={{ fontFamily: 'JetBrains Mono, monospace' }}
          >
            {robot.code}
          </span>
          <StatusBadge variant="robot" status={robot.status} size="sm" pulse />
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-500">
          <span className={cn('flex items-center gap-0.5', getBatteryColorClass(robot.battery))}>
            <Battery size={10} />
            {Math.round(robot.battery)}%
          </span>
          <span className="text-slate-600">·</span>
          <span className="truncate">{getAreaName(robot.position.area)}</span>
        </div>
      </div>
      <ChevronRight
        size={14}
        className={cn(
          'shrink-0 transition-all duration-200',
          selected ? 'text-cyan-400 translate-x-0' : 'text-slate-600 -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
        )}
      />
    </button>
  );
}

function TaskTimeoutBadge({ task }: { task: Task }) {
  const diffMin = dayjs(task.dueTime).diff(dayjs(), 'minute');
  const isUrgent = diffMin < 10;
  const isOverdue = diffMin < 0;

  if (task.status === 'arrived') {
    const arrivedDiff = dayjs().diff(dayjs(task.estimatedArrival ?? task.dueTime), 'minute');
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-md border',
          arrivedDiff > 10
            ? 'text-red-400 bg-red-500/10 border-red-500/30 animate-pulse'
            : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
        )}
      >
        <Clock size={9} />
        已等 {Math.max(0, arrivedDiff)}分
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded-md border',
        isOverdue
          ? 'text-red-400 bg-red-500/10 border-red-500/30'
          : isUrgent
          ? 'text-amber-400 bg-amber-500/10 border-amber-500/30'
          : 'text-slate-400 bg-white/5 border-white/10'
      )}
    >
      <Clock size={9} />
      {isOverdue ? `超时 ${Math.abs(diffMin)}分` : `${diffMin}分`}
    </span>
  );
}

function TaskRow({ task, selected, onClick }: { task: Task; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full flex items-center gap-3 p-2.5 rounded-lg transition-all duration-200 text-left group',
        'border',
        selected
          ? 'bg-violet-500/8 border-violet-500/30'
          : 'bg-white/[0.02] border-transparent hover:bg-white/[0.04] hover:border-white/5'
      )}
    >
      <div className="flex flex-col items-center gap-1 shrink-0">
        <StatusBadge variant="priority" level={task.priority} size="sm" />
        <div className="text-[9px] font-mono text-slate-600">{task.code.slice(-4)}</div>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-1">
          <StatusBadge variant="task-type" status={task.type} size="sm" />
          <StatusBadge variant="task" status={task.status} size="sm" pulse />
          <div className="ml-auto">
            <TaskTimeoutBadge task={task} />
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <StatusBadge variant="area" status={task.origin} size="sm" />
          <ChevronRight size={10} className="text-slate-600 shrink-0" />
          <StatusBadge variant="area" status={task.destination} size="sm" />
        </div>
        <div className="mt-1 text-[10px] text-slate-600 truncate">
          <span className="text-slate-500">物品：</span>
          {task.cargo.name}
          {task.cargo.isNarcotic && (
            <span className="ml-1 text-red-400">⚠ 毒麻</span>
          )}
        </div>
      </div>
    </button>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const {
    robots,
    tasks,
    logs,
    faultOrders,
    deliveryRecords,
    dailyReport,
    selectedRobotId,
    selectedTaskId,
    setSelectedRobot,
    setSelectedTask,
  } = useDispatchStore();
  const { setFollowRobot } = useSceneStore();

  const todayDeliveries = useMemo(() => {
    const today = dayjs().format('YYYY-MM-DD');
    return deliveryRecords.filter((r) => dayjs(r.endTime).format('YYYY-MM-DD') === today).length;
  }, [deliveryRecords]);

  const activeFaults = useMemo(
    () => faultOrders.filter((f) => f.status !== 'resolved').length,
    [faultOrders]
  );

  const onTimeRate = dailyReport.overallOnTimeRate;

  const taskGroups = useMemo(() => {
    const pending = tasks.filter((t) => t.status === 'pending' || t.status === 'transferred');
    const executing = tasks.filter((t) =>
      ['assigned', 'picking', 'delivering'].includes(t.status)
    );
    const arrived = tasks.filter((t) => t.status === 'arrived');
    return { pending, executing, arrived };
  }, [tasks]);

  const timelineItems: TimelineItem[] = useMemo(
    () =>
      logs.slice(0, 20).map((log) => ({
        id: log.id,
        timestamp: log.timestamp,
        type:
          log.type === 'fault'
            ? log.level === 'error'
              ? 'error'
              : 'warning'
            : log.type === 'task'
            ? log.level === 'success'
              ? 'success'
              : log.level === 'warning'
              ? 'warning'
              : 'task'
            : log.level === 'success'
            ? 'success'
            : 'system',
        title: log.message,
      })),
    [logs]
  );

  const handleRobotClick = (id: string) => {
    const newSelected = selectedRobotId === id ? null : id;
    setSelectedRobot(newSelected);
    setFollowRobot(newSelected);
  };

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 overflow-hidden flex">
      <div className="flex-1 relative min-w-0">
        <HospitalScene />
        <SceneControls />
        <ViewToggle />
        <div className="absolute bottom-4 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900/80 border border-white/10 backdrop-blur-xl pointer-events-auto">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-slate-400">系统运行中 · 连接</span>
            <span className="text-xs font-mono text-emerald-400">{robots.length}</span>
            <span className="text-xs text-slate-400">台机器人</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono pointer-events-auto px-3 py-1.5 rounded-lg bg-slate-900/60 border border-white/5 backdrop-blur">
            <span>LAT {dayjs().format('HH:mm:ss')}</span>
            <span className="text-slate-700">|</span>
            <span>FPS 60</span>
            <span className="text-slate-700">|</span>
            <span>GPU OK</span>
          </div>
        </div>
      </div>

      <div className="w-[460px] shrink-0 flex flex-col bg-gradient-to-b from-slate-900/95 to-slate-950/95 border-l border-white/5 backdrop-blur-sm overflow-hidden">
        <div className="p-4 border-b border-white/5 bg-slate-900/50">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-300 via-blue-300 to-violet-300 bg-clip-text text-transparent">
                智能调度中心
              </h1>
              <p className="text-[11px] text-slate-500 mt-0.5">Hospital Robot Dispatch System v2.0</p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => navigate('/robots')}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10 transition-all"
              >
                <Search size={12} />
                机器人
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <DataCard
              title="总机器人"
              value={robots.length}
              icon={<Bot size={18} />}
              color="cyan"
              trend={{ value: 0, label: '在线' }}
              className="!p-3"
            />
            <DataCard
              title="今日运输"
              value={todayDeliveries}
              icon={<Truck size={18} />}
              color="blue"
              trend={{ value: 12, label: '较昨日' }}
              className="!p-3"
            />
            <DataCard
              title="准时率"
              value={`${onTimeRate}%`}
              icon={<Clock size={18} />}
              color="green"
              trend={{ value: 2.3, label: '周环比' }}
              className="!p-3"
            />
            <DataCard
              title="活跃故障"
              value={activeFaults}
              icon={<AlertTriangle size={18} />}
              color={activeFaults > 0 ? 'red' : 'violet'}
              trend={activeFaults > 0 ? { value: -1, label: '待处理' } : undefined}
              className="!p-3"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-4 space-y-4">
            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap size={12} className="text-cyan-400" />
                  机器人集群 <span className="text-slate-600 font-normal normal-case">({robots.length})</span>
                </h2>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {robots.map((robot) => (
                  <RobotCard
                    key={robot.id}
                    robot={robot}
                    selected={selectedRobotId === robot.id}
                    onClick={() => handleRobotClick(robot.id)}
                  />
                ))}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck size={12} className="text-violet-400" />
                  任务调度
                </h2>
              </div>
              <div className="space-y-2">
                {(['pending', 'executing', 'arrived'] as const).map((groupKey) => {
                  const group = taskGroups[groupKey];
                  const groupLabel = groupKey === 'pending' ? '待分配' : groupKey === 'executing' ? '执行中' : '已到达';
                  const groupCount = group.length;
                  return (
                    <div key={groupKey}>
                      <div className="flex items-center justify-between px-1 mb-1.5">
                        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">
                          {groupLabel}
                        </span>
                        <span className="text-[10px] font-mono text-slate-600">{groupCount}</span>
                      </div>
                      <div className="space-y-1">
                        {group.length === 0 ? (
                          <div className="text-center py-3 text-[11px] text-slate-600 rounded-lg bg-white/[0.02] border border-dashed border-white/5">
                            暂无{groupLabel}任务
                          </div>
                        ) : (
                          group.map((task) => (
                            <TaskRow
                              key={task.id}
                              task={task}
                              selected={selectedTaskId === task.id}
                              onClick={() => setSelectedTask(selectedTaskId === task.id ? null : task.id)}
                            />
                          ))
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity size={12} className="text-emerald-400" />
                  调度日志
                </h2>
                <span className="text-[10px] text-slate-600 font-mono">实时</span>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/[0.02] p-3">
                <Timeline items={timelineItems} maxHeight="260px" />
              </div>
            </section>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 3px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.15); }
      `}</style>
    </div>
  );
}
