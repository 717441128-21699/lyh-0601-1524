import { useDispatchStore } from '@/store/dispatchStore';
import { getRobotStatusName, getRobotStatusColorClass, formatBattery } from '@/utils/format';
import { Activity, Wifi, Cpu, HardDrive, ThermometerSun, Zap } from 'lucide-react';

export function StatusBar() {
  const { robots, tasks, deliveryRecords, dailyReport, collisions } = useDispatchStore();

  const avgBattery = robots.length > 0
    ? robots.reduce((s, r) => s + r.battery, 0) / robots.length
    : 0;

  const todayDeliveries = deliveryRecords.filter((d) =>
    new Date(d.endTime).toDateString() === new Date().toDateString()
  ).length;

  const activeCollisions = collisions.filter((c) => !c.resolved).length;

  const items = [
    {
      icon: Activity,
      label: '在线机器人',
      value: `${robots.filter((r) => r.status !== 'fault').length}/${robots.length}`,
      color: 'text-cyan-400',
    },
    {
      icon: Zap,
      label: '平均电量',
      value: formatBattery(avgBattery),
      color: avgBattery >= 50 ? 'text-emerald-400' : avgBattery >= 30 ? 'text-amber-400' : 'text-red-400',
    },
    {
      icon: Cpu,
      label: '今日运输',
      value: String(todayDeliveries),
      color: 'text-violet-400',
    },
    {
      icon: HardDrive,
      label: '准时率',
      value: `${dailyReport.overallOnTimeRate}%`,
      color: 'text-blue-400',
    },
    {
      icon: ThermometerSun,
      label: '待处理任务',
      value: String(tasks.filter((t) => ['pending', 'assigned', 'picking', 'delivering', 'arrived'].includes(t.status)).length),
      color: 'text-amber-400',
    },
    {
      icon: Wifi,
      label: '避障事件',
      value: String(activeCollisions),
      color: activeCollisions > 0 ? 'text-orange-400' : 'text-slate-400',
    },
  ];

  return (
    <footer className="h-10 shrink-0 border-t border-white/5 bg-slate-950/80 backdrop-blur-xl flex items-center justify-between px-6 z-10 relative">
      <div className="flex items-center gap-6">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-2">
            <it.icon size={13} className={it.color} />
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">{it.label}</span>
            <span className={`text-xs font-mono font-semibold ${it.color}`}>{it.value}</span>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          {robots.slice(0, 8).map((r) => (
            <div
              key={r.id}
              className="group relative"
              title={`${r.code} · ${getRobotStatusName(r.status)} · ${formatBattery(r.battery)}`}
            >
              <div
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-all',
                  r.status === 'fault' ? 'bg-red-500 animate-pulse' : '',
                  r.status === 'charging' ? 'bg-emerald-500' : '',
                  (r.status === 'working' || r.status === 'delivering') ? 'bg-cyan-400 animate-pulse' : '',
                  r.status === 'idle' ? 'bg-slate-500' : '',
                  r.status === 'returning' ? 'bg-amber-400' : '',
                  r.status === 'avoiding' ? 'bg-violet-400' : ''
                )}
              />
            </div>
          ))}
        </div>
        <div className="text-[10px] text-slate-500 font-mono border-l border-white/10 pl-4">
          © 2026 MedBot Dispatch System · Build 2.4.1-stable
        </div>
      </div>
      <style>{`.StatusBar-cn { color: inherit; }`}</style>
    </footer>
  );
}

function cn(...inputs: (string | boolean | undefined | null)[]) {
  return inputs.filter(Boolean).join(' ');
}
