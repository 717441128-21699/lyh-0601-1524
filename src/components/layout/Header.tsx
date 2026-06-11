import { Activity, Bell, Search, Settings, User, Play, Pause, FastForward, Rewind } from 'lucide-react';
import { useDispatchStore } from '@/store/dispatchStore';
import { cn, formatTime } from '@/utils/format';
import dayjs from 'dayjs';
import { useState, useEffect } from 'react';

export function Header() {
  const { isSimulating, simulationSpeed, toggleSimulation, setSimulationSpeed, tasks, robots, faultOrders } =
    useDispatchStore();
  const [now, setNow] = useState(dayjs());

  useEffect(() => {
    const t = setInterval(() => setNow(dayjs()), 1000);
    return () => clearInterval(t);
  }, []);

  const pendingTasks = tasks.filter((t) => t.status === 'pending' || t.status === 'assigned').length;
  const faultCount = faultOrders.filter((f) => f.status !== 'resolved').length;
  const workingCount = robots.filter((r) => r.status === 'working' || r.status === 'delivering').length;

  return (
    <header className="h-16 border-b border-white/5 bg-slate-950/80 backdrop-blur-xl flex items-center justify-between px-6 shrink-0 z-20 relative">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Activity size={22} className="text-white" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-slate-950 animate-pulse" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight leading-none">
              MedBot Dispatch
            </h1>
            <p className="text-[10px] text-slate-500 mt-0.5 uppercase tracking-[0.15em]">
              医院智能物流调度平台 v2.4
            </p>
          </div>
        </div>

        <div className="flex items-center gap-5 pl-6 border-l border-white/5">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-xs text-cyan-300 font-medium">{workingCount}</span>
            <span className="text-[10px] text-cyan-400/60">运行中</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
            <span className="w-2 h-2 rounded-full bg-violet-400" />
            <span className="text-xs text-violet-300 font-medium">{pendingTasks}</span>
            <span className="text-[10px] text-violet-400/60">待处理任务</span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20">
            <span
              className={cn(
                'w-2 h-2 rounded-full bg-red-400',
                faultCount > 0 && 'animate-pulse'
              )}
            />
            <span className="text-xs text-red-300 font-medium">{faultCount}</span>
            <span className="text-[10px] text-red-400/60">活跃告警</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/10 mr-2">
          <button
            onClick={() => setSimulationSpeed(Math.max(0.5, simulationSpeed - 0.5))}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="减速"
          >
            <Rewind size={14} />
          </button>
          <button
            onClick={toggleSimulation}
            className={cn(
              'w-10 h-8 rounded-lg flex items-center justify-center transition-colors',
              isSimulating
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'
            )}
            title={isSimulating ? '暂停模拟' : '开始模拟'}
          >
            {isSimulating ? <Pause size={14} /> : <Play size={14} />}
          </button>
          <button
            onClick={() => setSimulationSpeed(Math.min(5, simulationSpeed + 0.5))}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            title="加速"
          >
            <FastForward size={14} />
          </button>
          <div className="px-2 text-[10px] font-mono text-slate-500 border-l border-white/10 ml-1">
            {simulationSpeed.toFixed(1)}x
          </div>
        </div>

        <div className="hidden md:flex items-center gap-2 text-right mr-4">
          <div>
            <div className="text-sm font-mono font-semibold text-white">{now.format('HH:mm:ss')}</div>
            <div className="text-[10px] text-slate-500">{now.format('YYYY年MM月DD日 dddd')}</div>
          </div>
        </div>

        <button className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 transition-colors">
          <Search size={16} />
        </button>
        <button className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 transition-colors relative">
          <Bell size={16} />
          {faultCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-ping" />
          )}
        </button>
        <button className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 border border-white/10 transition-colors">
          <Settings size={16} />
        </button>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center border border-white/10 shadow-lg shadow-violet-500/30">
          <User size={16} className="text-white" />
        </div>
      </div>
    </header>
  );
}
