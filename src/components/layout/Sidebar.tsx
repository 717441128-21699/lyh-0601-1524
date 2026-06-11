import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Bot,
  ClipboardList,
  PlusCircle,
  ScanLine,
  AlertOctagon,
  BarChart3,
  FileSpreadsheet,
} from 'lucide-react';
import { cn } from '@/utils/format';

const menuItems = [
  { path: '/', label: '3D调度总览', icon: LayoutDashboard, end: true },
  { path: '/robots', label: '机器人管理', icon: Bot },
  { path: '/tasks', label: '任务中心', icon: ClipboardList },
  { path: '/tasks/create', label: '新建任务', icon: PlusCircle },
  { path: '/scan', label: '扫码签收', icon: ScanLine },
  { path: '/faults', label: '故障告警', icon: AlertOctagon },
  { path: '/reports', label: '数据报表', icon: BarChart3 },
  { path: '/reports/export', label: '日报导出', icon: FileSpreadsheet },
];

export function Sidebar() {
  return (
    <aside className="w-56 shrink-0 border-r border-white/5 bg-slate-950/60 backdrop-blur-xl flex flex-col z-10">
      <div className="flex-1 py-5 px-3 space-y-1 overflow-y-auto custom-scrollbar">
        <div className="px-3 mb-4">
          <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
            功能导航
          </p>
        </div>
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200',
                'border border-transparent',
                isActive
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/10 border-cyan-500/30 text-cyan-300 shadow-lg shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 hover:border-white/5'
              )
            }
          >
            <item.icon
              size={18}
              className={cn(
                'shrink-0 transition-transform duration-200 group-hover:scale-110',
                'text-current'
              )}
            />
            <span className="font-medium">{item.label}</span>
          </NavLink>
        ))}

        <div className="mt-8 pt-5 border-t border-white/5">
          <div className="px-3 mb-4">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
              快捷统计
            </p>
          </div>
          <div className="mx-2 p-3 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-emerald-400 uppercase tracking-wider">
                系统健康度
              </span>
              <span className="text-xs font-bold text-emerald-300 font-mono">98.6%</span>
            </div>
            <div className="h-1.5 rounded-full bg-emerald-900/50 overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 animate-pulse"
                style={{ width: '98.6%' }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="p-3 border-t border-white/5">
        <div className="px-2 py-2 rounded-lg bg-white/5 border border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-white">管</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white truncate">系统管理员</div>
              <div className="text-[10px] text-slate-500 truncate">admin@hospital.cn</div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
