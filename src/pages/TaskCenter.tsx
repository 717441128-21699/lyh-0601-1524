import { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  Calendar,
  Package,
  AlertTriangle,
  MapPin,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Plus,
  Trash2,
  UserCheck,
  ArrowRightLeft,
  ArrowRight,
  GripVertical,
  X,
  Download,
  Eye,
  RotateCcw,
} from 'lucide-react';
import dayjs from 'dayjs';
import { useDispatchStore } from '@/store/dispatchStore';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Modal } from '@/components/ui/Modal';
import { Timeline } from '@/components/ui/Timeline';
import type { TimelineItem } from '@/components/ui/Timeline';
import { cn } from '@/utils/format';
import {
  AREAS,
  AREA_ORDER,
  TASK_TYPE_LABELS,
  PRIORITY_LABELS,
  LOW_BATTERY_THRESHOLD,
} from '@/utils/constants';
import {
  getAreaName,
  getAreaColor,
  formatDateTime,
  formatWeight,
  formatBarcode,
  euclideanDistance,
} from '@/utils/format';
import type { Task, TaskStatus, TaskType, AreaType } from '@/types';

type TabKey = 'all' | 'pending' | 'executing' | 'arrived' | 'completed' | 'abnormal';

const TAB_CONFIG: { key: TabKey; label: string; icon: typeof Search; statuses: TaskStatus[] }[] = [
  { key: 'all', label: '全部', icon: Package, statuses: [] },
  { key: 'pending', label: '待分配', icon: Clock, statuses: ['pending', 'transferred'] },
  { key: 'executing', label: '执行中', icon: RefreshCw, statuses: ['assigned', 'picking', 'delivering'] },
  { key: 'arrived', label: '已到达', icon: MapPin, statuses: ['arrived'] },
  { key: 'completed', label: '已完成', icon: CheckCircle2, statuses: ['confirmed'] },
  { key: 'abnormal', label: '异常', icon: AlertTriangle, statuses: ['timeout', 'cancelled'] },
];

export default function TaskCenter() {
  const { tasks, robots, assignBestRobot, cancelTask, cancelTasks, addLog } = useDispatchStore();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchModal, setBatchModal] = useState<null | 'assign' | 'cancel'>(null);
  const [assigning, setAssigning] = useState(false);

  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('');
  const [filterArea, setFilterArea] = useState<string>('');

  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const filteredTasks = useMemo(() => {
    let list = [...tasks];
    const tab = TAB_CONFIG.find((t) => t.key === activeTab)!;
    if (tab.statuses.length > 0) {
      list = list.filter((t) => tab.statuses.includes(t.status));
    }
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      list = list.filter(
        (t) =>
          t.code.toLowerCase().includes(q) ||
          t.cargo.name.toLowerCase().includes(q) ||
          t.cargo.barcode.includes(q) ||
          (t.assignedRobotId &&
            robots.find((r) => r.id === t.assignedRobotId)?.code.toLowerCase().includes(q))
      );
    }
    if (filterDateStart) {
      list = list.filter((t) => dayjs(t.createTime).isAfter(dayjs(filterDateStart).startOf('day')));
    }
    if (filterDateEnd) {
      list = list.filter((t) => dayjs(t.createTime).isBefore(dayjs(filterDateEnd).endOf('day')));
    }
    if (filterType) {
      list = list.filter((t) => t.type === filterType);
    }
    if (filterPriority) {
      list = list.filter((t) => String(t.priority) === filterPriority);
    }
    if (filterArea) {
      list = list.filter((t) => t.origin === filterArea || t.destination === filterArea);
    }
    list.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return dayjs(b.createTime).valueOf() - dayjs(a.createTime).valueOf();
    });
    return list;
  }, [tasks, activeTab, searchText, filterDateStart, filterDateEnd, filterType, filterPriority, filterArea, robots]);

  const tabCounts = useMemo(() => {
    const counts: Record<TabKey, number> = {
      all: tasks.length,
      pending: 0,
      executing: 0,
      arrived: 0,
      completed: 0,
      abnormal: 0,
    };
    tasks.forEach((t) => {
      if (['pending', 'transferred'].includes(t.status)) counts.pending++;
      if (['assigned', 'picking', 'delivering'].includes(t.status)) counts.executing++;
      if (t.status === 'arrived') counts.arrived++;
      if (t.status === 'confirmed') counts.completed++;
      if (['timeout', 'cancelled'].includes(t.status)) counts.abnormal++;
    });
    return counts;
  }, [tasks]);

  const toggleRow = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredTasks.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredTasks.map((t) => t.id)));
    }
  };

  const getCountdown = (task: Task) => {
    const due = dayjs(task.dueTime);
    const diff = due.diff(dayjs(now), 'minute');
    if (task.status === 'confirmed') return { text: '已完成', color: '#10B981' };
    if (task.status === 'cancelled') return { text: '已取消', color: '#9CA3AF' };
    if (diff < 0) {
      const overdue = Math.abs(diff);
      return { text: `超时 ${overdue}分钟`, color: '#EF4444', overdue: true };
    }
    if (diff < 10) return { text: `${diff}分钟 紧急`, color: '#F59E0B', urgent: true };
    if (diff < 30) return { text: `${diff}分钟`, color: '#F59E0B' };
    const hrs = Math.floor(diff / 60);
    const mins = diff % 60;
    return { text: hrs > 0 ? `${hrs}h${mins}m` : `${mins}分钟`, color: '#0EA5E9' };
  };

  const handleBatchAssign = async () => {
    setAssigning(true);
    const ids = Array.from(selectedIds);
    for (const id of ids) {
      const task = tasks.find((t) => t.id === id);
      if (task && ['pending', 'transferred'].includes(task.status)) {
        assignBestRobot(id);
      }
    }
    setTimeout(() => {
      setAssigning(false);
      setBatchModal(null);
      setSelectedIds(new Set());
    }, 800);
  };

  const handleBatchCancel = () => {
    const ids = Array.from(selectedIds).filter((id) => {
      const t = tasks.find((x) => x.id === id);
      return t && !['confirmed', 'cancelled'].includes(t.status);
    });
    cancelTasks(ids);
    setBatchModal(null);
    setSelectedIds(new Set());
  };

  const clearFilters = () => {
    setFilterDateStart('');
    setFilterDateEnd('');
    setFilterType('');
    setFilterPriority('');
    setFilterArea('');
  };

  const buildTimeline = (task: Task): TimelineItem[] => {
    const items: TimelineItem[] = [];
    items.push({
      id: `${task.id}-create`,
      timestamp: task.createTime,
      type: 'task',
      title: '任务创建',
      description: `物品：${task.cargo.name} | 重量：${formatWeight(task.cargo.weight)}`,
    });
    if (task.cargo.isNarcotic) {
      task.approvals
        .sort((a, b) => a.level - b.level)
        .forEach((ap) => {
          items.push({
            id: `${task.id}-ap-${ap.level}`,
            timestamp: ap.time,
            type: ap.verified ? 'success' : 'warning',
            title: `第${ap.level}级审批${ap.verified ? '通过' : '待审'}`,
            description: `${ap.approverRole}：${ap.approverName}`,
          });
        });
    }
    task.transferHistory.forEach((tr, idx) => {
      const from = robots.find((r) => r.id === tr.fromRobotId)?.code ?? '?';
      const to = tr.toRobotId ? robots.find((r) => r.id === tr.toRobotId)?.code ?? '?' : '分配中';
      items.push({
        id: `${task.id}-tr-${idx}`,
        timestamp: tr.time,
        type: 'warning',
        title: `任务转派（${tr.reason === 'low_battery' ? '低电量' : '故障'}）`,
        description: `${from} → ${to}`,
      });
    });
    if (task.assignedRobotId) {
      const robot = robots.find((r) => r.id === task.assignedRobotId);
      items.push({
        id: `${task.id}-assign`,
        timestamp: task.createTime,
        type: 'info',
        title: `已分配给 ${robot?.code ?? '机器人'}`,
        description: robot?.model,
      });
    }
    if (task.status === 'confirmed' && task.confirmTime) {
      items.push({
        id: `${task.id}-confirm`,
        timestamp: task.confirmTime,
        type: 'success',
        title: '签收完成',
        description: `签收人：${task.signer}`,
      });
    }
    return items.sort((a, b) => dayjs(a.timestamp).valueOf() - dayjs(b.timestamp).valueOf());
  };

  const selectedTasks = tasks.filter((t) => selectedIds.has(t.id));
  const canBatchAssign = selectedTasks.some((t) => ['pending', 'transferred'].includes(t.status));
  const canBatchCancel = selectedTasks.some((t) => !['confirmed', 'cancelled'].includes(t.status));

  return (
    <div className="h-full flex flex-col p-6 gap-4 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
              <Package className="text-cyan-400" size={20} />
            </div>
            任务调度中心
            <span className="text-sm font-normal text-slate-400 ml-2">
              共 {tasks.length} 个任务
            </span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 ml-13">实时调度监控与任务全生命周期管理</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 transition-colors text-sm">
            <Download size={16} />
            导出报表
          </button>
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400 transition-all shadow-lg shadow-cyan-500/25 text-sm font-medium">
            <Plus size={16} />
            新建任务
          </button>
        </div>
      </div>

      <div className="flex gap-2 shrink-0">
        {TAB_CONFIG.map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.key;
          const count = tabCounts[tab.key];
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all border',
                active
                  ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border-cyan-500/40 text-cyan-300 shadow-lg shadow-cyan-500/10'
                  : 'bg-white/5 border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/10 hover:border-white/10'
              )}
            >
              <Icon size={16} />
              {tab.label}
              <span
                className={cn(
                  'text-[10px] px-2 py-0.5 rounded-full font-mono',
                  active ? 'bg-cyan-500/30 text-cyan-200' : 'bg-white/10 text-slate-400'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="搜索任务编号、物品名称、条码或机器人编号..."
            className="w-full h-10 pl-10 pr-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/40 focus:bg-white/10 transition-all"
          />
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'flex items-center gap-2 h-10 px-4 rounded-xl text-sm border transition-all',
            showFilters
              ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
          )}
        >
          <Filter size={16} />
          高级筛选
          <ChevronDown
            size={14}
            className={cn('transition-transform', showFilters && 'rotate-180')}
          />
        </button>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-sm text-slate-400">
              已选择 <span className="text-cyan-400 font-medium">{selectedIds.size}</span> 项
            </span>
            <button
              onClick={() => setBatchModal('assign')}
              disabled={!canBatchAssign}
              className={cn(
                'flex items-center gap-1.5 h-10 px-4 rounded-xl text-sm font-medium transition-all',
                canBatchAssign
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
                  : 'bg-white/5 border border-white/10 text-slate-600 cursor-not-allowed'
              )}
            >
              <UserCheck size={16} />
              批量分配
            </button>
            <button
              onClick={() => setBatchModal('cancel')}
              disabled={!canBatchCancel}
              className={cn(
                'flex items-center gap-1.5 h-10 px-4 rounded-xl text-sm font-medium transition-all',
                canBatchCancel
                  ? 'bg-red-500/20 border border-red-500/40 text-red-300 hover:bg-red-500/30'
                  : 'bg-white/5 border border-white/10 text-slate-600 cursor-not-allowed'
              )}
            >
              <XCircle size={16} />
              批量取消
            </button>
            <button
              onClick={() => setSelectedIds(new Set())}
              className="h-10 w-10 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>

      {showFilters && (
        <div className="rounded-xl bg-white/5 border border-white/10 p-4 grid grid-cols-5 gap-4 shrink-0" style={{ animation: 'fadeIn 0.2s ease-out' }}>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">开始日期</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input
                type="date"
                value={filterDateStart}
                onChange={(e) => setFilterDateStart(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500/40 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">结束日期</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
              <input
                type="date"
                value={filterDateEnd}
                onChange={(e) => setFilterDateEnd(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500/40 transition-colors"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">物品类型</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500/40 transition-colors"
            >
              <option value="">全部类型</option>
              {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k} className="bg-slate-800">
                  {v.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">紧急程度</label>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500/40 transition-colors"
            >
              <option value="">全部级别</option>
              {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
                <option key={k} value={k} className="bg-slate-800">
                  P{k} · {v.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block">涉及区域</label>
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500/40 transition-colors"
            >
              <option value="">全部区域</option>
              {AREA_ORDER.map((a) => (
                <option key={a} value={a} className="bg-slate-800">
                  {AREAS[a].nameCn}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-5 flex justify-end">
            <button
              onClick={clearFilters}
              className="text-sm text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw size={14} />
              重置筛选条件
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden flex flex-col min-h-0">
        <div className="overflow-auto flex-1">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur border-b border-white/5">
              <tr className="text-slate-400 text-xs uppercase tracking-wider">
                <th className="w-10 px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={filteredTasks.length > 0 && selectedIds.size === filteredTasks.length}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-white/20 bg-white/5 accent-cyan-500"
                  />
                </th>
                <th className="w-10 px-3 py-3"></th>
                <th className="px-3 py-3 text-left font-medium">任务编号</th>
                <th className="px-3 py-3 text-left font-medium">类型</th>
                <th className="px-3 py-3 text-left font-medium">优先级</th>
                <th className="px-3 py-3 text-left font-medium">起点 → 终点</th>
                <th className="px-3 py-3 text-left font-medium">分配机器人</th>
                <th className="px-3 py-3 text-left font-medium">状态</th>
                <th className="px-3 py-3 text-left font-medium">倒计时</th>
                <th className="px-3 py-3 text-right font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map((task) => {
                const robot = robots.find((r) => r.id === task.assignedRobotId);
                const countdown = getCountdown(task);
                const expanded = expandedRows.has(task.id);
                const selected = selectedIds.has(task.id);
                const typeCfg = TASK_TYPE_LABELS[task.type];
                return (
                  <>
                    <tr
                      key={task.id}
                      className={cn(
                        'border-b border-white/5 transition-colors group',
                        selected ? 'bg-cyan-500/10' : 'hover:bg-white/[0.03]',
                        countdown.overdue && 'bg-red-500/[0.03]'
                      )}
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selected}
                          onChange={() => toggleSelect(task.id)}
                          className="w-4 h-4 rounded border-white/20 bg-white/5 accent-cyan-500"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => toggleRow(task.id)}
                          className="w-6 h-6 rounded-md hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                        >
                          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-mono text-white font-medium">{task.code}</div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {formatDateTime(task.createTime)}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge variant="task-type" status={task.type} size="sm" />
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge variant="priority" level={task.priority} size="sm" pulse={task.priority === 1} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          <span
                            className="text-xs px-2 py-1 rounded-md border font-medium"
                            style={{
                              color: getAreaColor(task.origin),
                              borderColor: `${getAreaColor(task.origin)}40`,
                              backgroundColor: `${getAreaColor(task.origin)}15`,
                            }}
                          >
                            {getAreaName(task.origin)}
                          </span>
                          <ArrowRight size={12} className="text-slate-600" />
                          <span
                            className="text-xs px-2 py-1 rounded-md border font-medium"
                            style={{
                              color: getAreaColor(task.destination),
                              borderColor: `${getAreaColor(task.destination)}40`,
                              backgroundColor: `${getAreaColor(task.destination)}15`,
                            }}
                          >
                            {getAreaName(task.destination)}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        {robot ? (
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                'w-7 h-7 rounded-lg border flex items-center justify-center text-[10px] font-bold font-mono',
                                robot.battery < LOW_BATTERY_THRESHOLD
                                  ? 'border-red-500/40 bg-red-500/10 text-red-400'
                                  : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400'
                              )}
                            >
                              {robot.code.slice(-3)}
                            </div>
                            <div>
                              <div className="text-white text-xs font-medium">{robot.code}</div>
                              <div className="text-[10px] text-slate-500">
                                电量 {Math.round(robot.battery)}%
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-xs flex items-center gap-1">
                            <Clock size={12} />
                            等待分配
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge
                          variant="task"
                          status={task.status}
                          size="sm"
                          pulse={['timeout', 'arrived'].includes(task.status)}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div
                          className="text-xs font-mono font-medium flex items-center gap-1.5"
                          style={{ color: countdown.color }}
                        >
                          {(countdown.urgent || countdown.overdue) && (
                            <AlertTriangle
                              size={12}
                              className={countdown.overdue ? 'animate-pulse' : ''}
                            />
                          )}
                          {countdown.text}
                        </div>
                        {task.reminderCount > 0 && (
                          <div className="text-[10px] text-red-400 mt-0.5 flex items-center gap-1">
                            <AlertTriangle size={10} />
                            已催办 {task.reminderCount} 次
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => toggleRow(task.id)}
                            className="p-1.5 rounded-md hover:bg-white/10 text-slate-400 hover:text-cyan-400 transition-colors"
                            title="查看详情"
                          >
                            <Eye size={14} />
                          </button>
                          {['pending', 'transferred'].includes(task.status) && (
                            <button
                              onClick={() => assignBestRobot(task.id)}
                              className="p-1.5 rounded-md hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400 transition-colors"
                              title="智能分配"
                            >
                              <UserCheck size={14} />
                            </button>
                          )}
                          {!['confirmed', 'cancelled'].includes(task.status) && (
                            <button
                              onClick={() => cancelTask(task.id)}
                              className="p-1.5 rounded-md hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors"
                              title="取消任务"
                            >
                              <XCircle size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {expanded && (
                      <tr key={`${task.id}-detail`} className="bg-white/[0.02]">
                        <td colSpan={10} className="px-3 pb-4">
                          <div className="ml-10 rounded-xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-900/40 p-5 grid grid-cols-12 gap-5" style={{ animation: 'fadeIn 0.2s ease-out' }}>
                            <div className="col-span-3 space-y-3">
                              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                                <Package size={14} className="text-cyan-400" />
                                物品信息
                              </h4>
                              <div className="space-y-2.5 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-slate-400">名称</span>
                                  <span className="text-white font-medium">{task.cargo.name}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">类型</span>
                                  <span className="text-white">{task.cargo.type}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">条码</span>
                                  <span className="font-mono text-cyan-300 text-xs">{formatBarcode(task.cargo.barcode)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">重量</span>
                                  <span className="text-white">{formatWeight(task.cargo.weight)}</span>
                                </div>
                                {task.cargo.isNarcotic && (
                                  <div className="rounded-lg border border-violet-500/30 bg-violet-500/10 p-2.5">
                                    <div className="text-xs text-violet-300 font-medium flex items-center gap-1.5">
                                      <AlertTriangle size={12} />
                                      毒麻药品 · 等级 {task.cargo.narcoticLevel}
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-1">需三级审批流程</div>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="col-span-3 space-y-3">
                              <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                                <MapPin size={14} className="text-emerald-400" />
                                当前位置进度
                              </h4>
                              <div className="relative pt-2">
                                <div className="flex justify-between text-[11px] text-slate-400 mb-2">
                                  <span>{getAreaName(task.origin)}</span>
                                  <span>{getAreaName(task.destination)}</span>
                                </div>
                                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-700 relative"
                                    style={{ width: `${Math.round(task.routeProgress * 100)}%` }}
                                  >
                                    <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-lg shadow-cyan-500/50 flex items-center justify-center">
                                      <div className="w-2 h-2 rounded-full bg-cyan-500" />
                                    </div>
                                  </div>
                                </div>
                                <div className="text-center mt-2">
                                  <span className="text-2xl font-bold font-mono text-cyan-300 text-glow-cyan">
                                    {Math.round(task.routeProgress * 100)}%
                                  </span>
                                  <span className="text-xs text-slate-400 ml-1">完成</span>
                                </div>
                              </div>
                              <div className="rounded-lg bg-white/5 border border-white/10 p-2.5 text-xs space-y-1.5">
                                <div className="flex justify-between">
                                  <span className="text-slate-400">创建时间</span>
                                  <span className="text-slate-200">{formatDateTime(task.createTime)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">预计到达</span>
                                  <span className="text-cyan-300">{formatDateTime(task.estimatedArrival)}</span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-slate-400">截止时间</span>
                                  <span style={{ color: countdown.overdue ? '#EF4444' : '#F8FAFC' }}>
                                    {formatDateTime(task.dueTime)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {task.transferHistory.length > 0 && (
                              <div className="col-span-3 space-y-3">
                                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                                  <ArrowRightLeft size={14} className="text-amber-400" />
                                  转移历史 ({task.transferHistory.length})
                                </h4>
                                <div className="space-y-2">
                                  {task.transferHistory.map((tr, idx) => {
                                    const from = robots.find((r) => r.id === tr.fromRobotId)?.code;
                                    const to = tr.toRobotId
                                      ? robots.find((r) => r.id === tr.toRobotId)?.code
                                      : '分配中';
                                    return (
                                      <div
                                        key={idx}
                                        className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-2.5"
                                      >
                                        <div className="flex items-center gap-2 text-xs">
                                          <GripVertical size={12} className="text-amber-400" />
                                          <span className="text-white font-medium">{from}</span>
                                          <ArrowRight size={12} className="text-slate-500" />
                                          <span className="text-white font-medium">{to}</span>
                                        </div>
                                        <div className="flex justify-between mt-1.5 text-[11px]">
                                          <span className="text-amber-300">
                                            {tr.reason === 'low_battery' ? '低电量转派' : '故障转派'}
                                          </span>
                                          <span className="text-slate-500">{formatDateTime(tr.time)}</span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            <div className={cn(task.transferHistory.length > 0 ? 'col-span-3' : 'col-span-6')} style={{ maxHeight: 260 }}>
                              <h4 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                                <CheckCircle2 size={14} className={task.cargo.isNarcotic ? 'text-violet-400' : 'text-blue-400'} />
                                {task.cargo.isNarcotic ? '审批流程 / 处理轨迹' : '处理轨迹'}
                              </h4>
                              <Timeline items={buildTimeline(task)} maxHeight="220px" />
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-20 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-500">
                      <Package size={40} className="opacity-20" />
                      <p className="text-sm">暂无符合条件的任务</p>
                      <p className="text-xs">尝试调整筛选条件或搜索关键词</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        open={batchModal === 'assign'}
        title="批量分配任务"
        size="sm"
        onClose={() => setBatchModal(null)}
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-300">
            即将为 <span className="text-cyan-400 font-medium">{selectedIds.size}</span> 个待分配任务执行智能分配，
            系统将根据距离、电量、优先级等综合评分自动选择最优机器人。
          </p>
          <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3">
            <div className="text-xs text-emerald-300 flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              可分配任务：{selectedTasks.filter((t) => ['pending', 'transferred'].includes(t.status)).length} 个
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setBatchModal(null)}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-sm transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleBatchAssign}
              disabled={assigning}
              className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-emerald-500 text-white text-sm font-medium hover:from-cyan-400 hover:to-emerald-400 transition-all disabled:opacity-60 flex items-center gap-2"
            >
              {assigning && <RefreshCw size={14} className="animate-spin" />}
              {assigning ? '分配中...' : '确认分配'}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        open={batchModal === 'cancel'}
        title="批量取消任务"
        size="sm"
        onClose={() => setBatchModal(null)}
      >
        <div className="space-y-4">
          <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-4 flex gap-3">
            <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
              <AlertTriangle className="text-red-400" size={20} />
            </div>
            <div>
              <p className="text-red-300 font-medium text-sm">确认要取消选中的任务吗？</p>
              <p className="text-xs text-slate-400 mt-1">
                此操作将取消 <span className="text-red-300 font-medium">{selectedIds.size}</span> 个任务，正在执行中的任务将被中断，操作不可撤销。
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setBatchModal(null)}
              className="px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-sm transition-colors"
            >
              返回
            </button>
            <button
              onClick={handleBatchCancel}
              className="px-4 py-2 rounded-lg bg-red-500 hover:bg-red-400 text-white text-sm font-medium transition-colors flex items-center gap-2"
            >
              <Trash2 size={14} />
              确认取消
            </button>
          </div>
        </div>
      </Modal>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
