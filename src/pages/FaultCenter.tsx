import { useState, useMemo } from 'react';
import {
  AlertTriangle,
  Wrench,
  CheckCircle2,
  Clock,
  Search,
  ChevronDown,
  ChevronUp,
  Send,
  Eye,
  User,
  MapPin,
  FileText,
  Bot,
  Zap,
  Filter,
} from 'lucide-react';
import dayjs from 'dayjs';
import { DataCard } from '@/components/ui/DataCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { cn } from '@/utils/format';
import { createInitialFaultOrders, createInitialEngineers } from '@/utils/mock';
import { FAULT_CODE_MAP, ENGINEER_NAMES } from '@/utils/constants';
import type { FaultOrder, FaultLevel, FaultStatus } from '@/types';
import { getAreaName, formatDateTime } from '@/utils/format';

type TabKey = 'active' | 'orders' | 'kb';

interface WorkOrder extends FaultOrder {
  orderCode: string;
  responseMinutes: number;
}

const faultStatusMap: Record<FaultStatus, { name: string; color: string; bg: string }> = {
  pending: { name: '待派单', color: '#F59E0B', bg: 'bg-amber-500/15 border-amber-500/40' },
  assigned: { name: '已派单', color: '#3B82F6', bg: 'bg-blue-500/15 border-blue-500/40' },
  repairing: { name: '维修中', color: '#8B5CF6', bg: 'bg-violet-500/15 border-violet-500/40' },
  resolved: { name: '已解决', color: '#10B981', bg: 'bg-emerald-500/15 border-emerald-500/40' },
};

const levelBorderMap: Record<FaultLevel, string> = {
  critical: 'border-red-500/60 shadow-red-500/20',
  major: 'border-amber-500/50 shadow-amber-500/15',
  minor: 'border-blue-500/40 shadow-blue-500/10',
};

const levelGradientMap: Record<FaultLevel, string> = {
  critical: 'from-red-500/20 via-red-500/10 to-transparent',
  major: 'from-amber-500/15 via-amber-500/8 to-transparent',
  minor: 'from-blue-500/12 via-blue-500/6 to-transparent',
};

const kbItems = [
  {
    code: 'E003',
    question: '激光雷达传感器异常如何处理？',
    answer:
      '1. 首先检查激光雷达窗口是否有污渍或遮挡，用干净软布擦拭镜头\n2. 检查机器人周围是否有强光直射或反射干扰源\n3. 通过远程诊断工具重启传感器模块\n4. 若仍报故障，需现场检查传感器接线是否松动\n5. 严重情况需更换激光雷达模块',
    cause: '常见原因：镜头污染、强光干扰、接线松动、模块老化',
  },
  {
    code: 'E002',
    question: '电池异常或电压偏低怎么办？',
    answer:
      '1. 立即指令机器人返航至最近充电站\n2. 检查电池管理系统(BMS)状态，查看电芯均衡情况\n3. 若充电后仍快速掉电，需进行电池校准\n4. 使用超过500次循环的电池建议更换\n5. 记录故障时的负载和环境温度',
    cause: '常见原因：电芯老化、低温环境、过放电、BMS校准偏移',
  },
  {
    code: 'E005',
    question: '网络连接中断如何恢复？',
    answer:
      '1. 检查机器人WiFi模块指示灯状态\n2. 尝试切换至备用AP或5G网络\n3. 远程发送网络重启指令\n4. 现场检查无线AP覆盖和信道干扰\n5. 更新WiFi驱动和网络配置文件',
    cause: '常见原因：WiFi信号盲区、AP负载过高、信道冲突、驱动异常',
  },
  {
    code: 'E006',
    question: '路径规划失败或导航异常？',
    answer:
      '1. 检查当前区域地图是否需要重新建图\n2. 清除导航栈中的障碍物缓存\n3. 检查激光雷达和轮式里程计数据是否一致\n4. 更新区域POI和禁行区配置\n5. 严重情况需重新进行SLAM建图',
    cause: '常见原因：地图过期、环境变化大、传感器数据偏差、配置错误',
  },
  {
    code: 'E007',
    question: '货箱检测传感器异常？',
    answer:
      '1. 清洁红外传感器窗口，检查是否有遮挡\n2. 远程执行传感器自检和校准\n3. 检查货箱是否变形或放置不到位\n4. 更新传感器阈值配置\n5. 必要时更换红外检测模组',
    cause: '常见原因：传感器窗口污染、阈值偏移、货箱变形、模块故障',
  },
  {
    code: 'E001',
    question: '驱动电机故障或行走异常？',
    answer:
      '1. 立即停机，避免扩大损坏\n2. 检查电机编码器反馈数据\n3. 检查驱动轮是否有异物缠绕或磨损\n4. 检查电机驱动板温度和供电电压\n5. 通知工程师现场检测，必要时更换电机总成',
    cause: '常见原因：编码器故障、驱动轮磨损、过流保护、接线松动',
  },
];

export default function FaultCenter() {
  const [activeTab, setActiveTab] = useState<TabKey>('active');
  const [faultOrders] = useState<FaultOrder[]>(createInitialFaultOrders());
  const [engineers] = useState(createInitialEngineers());
  const [expandedKb, setExpandedKb] = useState<string | null>('E003');
  const [kbSearch, setKbSearch] = useState('');
  const [orderFilter, setOrderFilter] = useState<FaultStatus | 'all'>('all');
  const [selectedEngineer, setSelectedEngineer] = useState<Record<string, string>>({});

  const workOrders = useMemo<WorkOrder[]>(() => {
    return faultOrders.map((fo, idx) => ({
      ...fo,
      orderCode: `WO${dayjs(fo.createTime).format('YYYYMMDD')}${String(idx + 1).padStart(4, '0')}`,
      responseMinutes: fo.resolveTime
        ? dayjs(fo.resolveTime).diff(dayjs(fo.createTime), 'minute')
        : dayjs().diff(dayjs(fo.createTime), 'minute'),
    }));
  }, [faultOrders]);

  const activeFaults = useMemo(() => faultOrders.filter((f) => f.status !== 'resolved'), [faultOrders]);
  const resolvedToday = useMemo(
    () =>
      faultOrders.filter(
        (f) => f.status === 'resolved' && dayjs(f.resolveTime).isSame(dayjs(), 'day')
      ).length,
    [faultOrders]
  );
  const inProgress = useMemo(
    () => faultOrders.filter((f) => f.status === 'assigned' || f.status === 'repairing').length,
    [faultOrders]
  );

  const filteredOrders = useMemo(() => {
    if (orderFilter === 'all') return workOrders;
    return workOrders.filter((o) => o.status === orderFilter);
  }, [workOrders, orderFilter]);

  const filteredKb = useMemo(() => {
    if (!kbSearch.trim()) return kbItems;
    const q = kbSearch.toLowerCase();
    return kbItems.filter(
      (k) =>
        k.code.toLowerCase().includes(q) ||
        k.question.toLowerCase().includes(q) ||
        k.answer.toLowerCase().includes(q)
    );
  }, [kbSearch]);

  const handleDispatch = (orderId: string, robotCode: string) => {
    const eng = selectedEngineer[orderId] || ENGINEER_NAMES[0];
    alert(`已将故障单 (${robotCode}) 派单给工程师：${eng}`);
  };

  const statsCards = [
    {
      title: '未解决故障',
      value: activeFaults.length,
      icon: <AlertTriangle size={22} />,
      color: 'red' as const,
      trend: activeFaults.length > 2 ? { value: 12, label: '较昨日' } : undefined,
      footer: (
        <span className="text-xs text-slate-400">
          其中严重故障 {activeFaults.filter((f) => f.faultLevel === 'critical').length} 起
        </span>
      ),
    },
    {
      title: '处理中工单',
      value: inProgress,
      icon: <Wrench size={22} />,
      color: 'amber' as const,
      footer: (
        <span className="text-xs text-slate-400">
          平均响应时长 {workOrders.length > 0 ? Math.round(workOrders.reduce((s, o) => s + o.responseMinutes, 0) / workOrders.length) : 0} 分钟
        </span>
      ),
    },
    {
      title: '今日已解决',
      value: resolvedToday,
      icon: <CheckCircle2 size={22} />,
      color: 'green' as const,
      trend: { value: 8, label: '环比' },
      footer: <span className="text-xs text-slate-400">解决率 {resolvedToday + activeFaults.length > 0 ? Math.round((resolvedToday / (resolvedToday + activeFaults.length)) * 100) : 0}%</span>,
    },
    {
      title: 'MTBF 平均无故障',
      value: '128.5',
      icon: <Zap size={22} />,
      color: 'cyan' as const,
      trend: { value: 5.2, label: '提升' },
      footer: <span className="text-xs text-slate-400">单位：小时 · 近30天统计</span>,
    },
  ];

  return (
    <div className="h-full w-full overflow-y-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <AlertTriangle className="text-red-400" size={28} />
            故障与工单中心
          </h1>
          <p className="text-sm text-slate-400 mt-1">实时监控机器人故障状态，管理维修工单</p>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          最后更新：{dayjs().format('YYYY-MM-DD HH:mm:ss')}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {statsCards.map((s, i) => (
          <DataCard key={i} {...s} />
        ))}
      </div>

      <div className="glass rounded-xl overflow-hidden">
        <div className="flex border-b border-white/5 px-2">
          {(
            [
              { key: 'active', label: '活跃故障', count: activeFaults.length, icon: <AlertTriangle size={16} /> },
              { key: 'orders', label: '工单列表', count: workOrders.length, icon: <FileText size={16} /> },
              { key: 'kb', label: '故障知识库', count: kbItems.length, icon: <BookIcon size={16} /> },
            ] as { key: TabKey; label: string; count: number; icon: React.ReactNode }[]
          ).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'relative px-5 py-3.5 text-sm font-medium transition-all flex items-center gap-2',
                activeTab === tab.key
                  ? 'text-cyan-400'
                  : 'text-slate-400 hover:text-slate-200'
              )}
            >
              {tab.icon}
              {tab.label}
              <span
                className={cn(
                  'text-[10px] px-1.5 py-0.5 rounded-full',
                  activeTab === tab.key
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'bg-white/5 text-slate-500 border border-white/5'
                )}
              >
                {tab.count}
              </span>
              {activeTab === tab.key && (
                <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'active' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {activeFaults.length === 0 ? (
                <div className="col-span-2 py-20 text-center text-slate-500">
                  <CheckCircle2 size={64} className="mx-auto mb-4 opacity-30" />
                  <p className="text-lg">太棒了！当前没有活跃故障</p>
                </div>
              ) : (
                activeFaults.map((fault) => {
                  const info = FAULT_CODE_MAP[fault.faultCode] || { code: fault.faultCode, desc: '未知故障' };
                  const isCritical = fault.faultLevel === 'critical';
                  return (
                    <div
                      key={fault.id}
                      className={cn(
                        'relative rounded-xl border overflow-hidden card-hover',
                        'bg-gradient-to-br backdrop-blur-xl',
                        levelGradientMap[fault.faultLevel],
                        levelBorderMap[fault.faultLevel],
                        'shadow-lg',
                        isCritical && 'fault-pulse'
                      )}
                    >
                      {isCritical && (
                        <div className="absolute inset-0 border-2 border-red-500/40 rounded-xl animate-pulse pointer-events-none" />
                      )}
                      <div className="p-5">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={cn(
                                'w-12 h-12 rounded-xl flex items-center justify-center border',
                                isCritical
                                  ? 'bg-red-500/20 border-red-500/40 text-red-400'
                                  : fault.faultLevel === 'major'
                                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                                  : 'bg-blue-500/20 border-blue-500/40 text-blue-400'
                              )}
                            >
                              <Bot size={24} />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-lg font-bold text-white font-mono">{fault.robotCode}</span>
                                <StatusBadge variant="fault" status={fault.faultLevel} pulse={isCritical} />
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                                <MapPin size={12} />
                                {getAreaName(fault.position.area)}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-xs text-slate-500">故障代码</div>
                            <div
                              className={cn(
                                'font-mono font-bold text-lg',
                                isCritical
                                  ? 'text-red-400'
                                  : fault.faultLevel === 'major'
                                  ? 'text-amber-400'
                                  : 'text-blue-400'
                              )}
                            >
                              {info.code}
                            </div>
                          </div>
                        </div>

                        <div className="bg-black/30 rounded-lg p-3 mb-4 border border-white/5">
                          <div className="text-xs text-slate-400 mb-1">{info.desc}</div>
                          <div className="text-sm text-slate-200 leading-relaxed">{fault.description}</div>
                        </div>

                        <div className="flex items-center justify-between text-xs text-slate-400 mb-4">
                          <div className="flex items-center gap-1">
                            <Clock size={12} />
                            发生于 {formatDateTime(fault.createTime)}
                          </div>
                          {fault.affectedTaskIds.length > 0 && (
                            <div className="text-amber-400">
                              影响任务 {fault.affectedTaskIds.length} 个
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <select
                            value={selectedEngineer[fault.id] || ''}
                            onChange={(e) =>
                              setSelectedEngineer((prev) => ({ ...prev, [fault.id]: e.target.value }))
                            }
                            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/50"
                          >
                            <option value="">选择工程师...</option>
                            {engineers.map((e) => (
                              <option key={e.id} value={e.name}>
                                {e.name} · {e.status === 'idle' ? '空闲' : '忙碌'} ·{' '}
                                {e.skills.slice(0, 2).join('/')}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleDispatch(fault.id, fault.robotCode)}
                            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-medium rounded-lg flex items-center gap-1.5 transition-all shadow-lg shadow-cyan-500/20"
                          >
                            <Send size={14} />
                            一键派单
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2">
                  <Filter size={16} className="text-slate-500" />
                  <div className="flex gap-1">
                    {(['all', 'pending', 'assigned', 'repairing', 'resolved'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setOrderFilter(s)}
                        className={cn(
                          'px-3 py-1.5 text-xs rounded-lg border transition-all',
                          orderFilter === s
                            ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                            : 'bg-white/5 text-slate-400 border-white/5 hover:border-white/10'
                        )}
                      >
                        {s === 'all' ? '全部' : faultStatusMap[s].name}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  共 {filteredOrders.length} 条工单
                </div>
              </div>

              <div className="overflow-x-auto rounded-xl border border-white/5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/5 text-slate-400 text-xs uppercase tracking-wider">
                      <th className="px-4 py-3 text-left font-medium">工单号</th>
                      <th className="px-4 py-3 text-left font-medium">机器人</th>
                      <th className="px-4 py-3 text-left font-medium">故障</th>
                      <th className="px-4 py-3 text-left font-medium">工程师</th>
                      <th className="px-4 py-3 text-left font-medium">状态</th>
                      <th className="px-4 py-3 text-left font-medium">响应时长</th>
                      <th className="px-4 py-3 text-right font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => {
                      const fs = faultStatusMap[order.status];
                      const info = FAULT_CODE_MAP[order.faultCode];
                      return (
                        <tr
                          key={order.id}
                          className="border-t border-white/5 hover:bg-white/[0.02] transition-colors"
                        >
                          <td className="px-4 py-3.5 font-mono text-cyan-400">{order.orderCode}</td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-lg bg-slate-700/50 flex items-center justify-center">
                                <Bot size={14} className="text-slate-400" />
                              </div>
                              <div>
                                <div className="text-white font-medium">{order.robotCode}</div>
                                <div className="text-[10px] text-slate-500 flex items-center gap-1">
                                  <MapPin size={10} />
                                  {getAreaName(order.position.area)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-2">
                              <StatusBadge variant="fault" status={order.faultLevel} size="sm" />
                              <div>
                                <div className="text-slate-200 font-mono text-xs">{order.faultCode}</div>
                                <div className="text-xs text-slate-500">{info?.desc || order.description.slice(0, 12)}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            {order.assignedEngineer ? (
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500/30 to-blue-500/30 flex items-center justify-center border border-white/10">
                                  <User size={13} className="text-slate-300" />
                                </div>
                                <span className="text-slate-200">{order.assignedEngineer}</span>
                              </div>
                            ) : (
                              <span className="text-slate-500 text-xs">— 未分配 —</span>
                            )}
                          </td>
                          <td className="px-4 py-3.5">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border',
                                fs.bg
                              )}
                              style={{ color: fs.color }}
                            >
                              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: fs.color }} />
                              {fs.name}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-slate-300 font-mono">
                            {order.responseMinutes < 60
                              ? `${order.responseMinutes} 分钟`
                              : `${Math.floor(order.responseMinutes / 60)}小时${order.responseMinutes % 60}分`}
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <button className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all">
                                <Eye size={15} />
                              </button>
                              <button className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-all">
                                <Wrench size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'kb' && (
            <div className="space-y-4 max-w-4xl mx-auto">
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  value={kbSearch}
                  onChange={(e) => setKbSearch(e.target.value)}
                  placeholder="搜索故障代码、问题或解决方案..."
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/40 transition-all"
                />
              </div>

              <div className="space-y-3">
                {filteredKb.map((item) => {
                  const expanded = expandedKb === item.code;
                  return (
                    <div
                      key={item.code}
                      className={cn(
                        'rounded-xl border overflow-hidden transition-all',
                        expanded
                          ? 'border-cyan-500/30 bg-cyan-500/[0.03] shadow-lg shadow-cyan-500/5'
                          : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                      )}
                    >
                      <button
                        onClick={() => setExpandedKb(expanded ? null : item.code)}
                        className="w-full px-5 py-4 flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-4">
                          <span
                            className={cn(
                              'font-mono font-bold text-sm px-2.5 py-1 rounded-lg border',
                              'bg-red-500/15 text-red-400 border-red-500/30'
                            )}
                          >
                            {item.code}
                          </span>
                          <span className="text-slate-200 font-medium">{item.question}</span>
                        </div>
                        {expanded ? (
                          <ChevronUp size={18} className="text-cyan-400 flex-shrink-0" />
                        ) : (
                          <ChevronDown size={18} className="text-slate-500 flex-shrink-0" />
                        )}
                      </button>
                      {expanded && (
                        <div className="px-5 pb-5 pt-0 border-t border-white/5">
                          <div className="mt-4 p-4 bg-black/30 rounded-lg border border-white/5">
                            <div className="text-xs text-amber-400 mb-2 font-medium flex items-center gap-1">
                              <AlertTriangle size={13} />
                              {item.cause}
                            </div>
                            <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                              {item.answer}
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                            <span>相关故障代码：{item.code}</span>
                            <button className="text-cyan-400 hover:text-cyan-300 transition-colors">
                              查看历史案例 →
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {filteredKb.length === 0 && (
                  <div className="py-16 text-center text-slate-500">
                    <Search size={48} className="mx-auto mb-3 opacity-20" />
                    <p>未找到匹配的知识库条目</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function BookIcon({ size = 24 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
