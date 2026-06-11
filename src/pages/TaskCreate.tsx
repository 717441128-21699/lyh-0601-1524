import { useState, useMemo, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Package,
  Truck,
  FileCheck2,
  AlertTriangle,
  Lock,
  Pill,
  FlaskConical,
  Stethoscope,
  UserRound,
  Box,
  TestTube,
  MapPin,
  Clock,
  Zap,
  Barcode,
  Scale,
  FileText,
  Sparkles,
  Star,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Battery,
  Gauge,
  ChevronRight,
} from 'lucide-react';
import dayjs from 'dayjs';
import { useDispatchStore } from '@/store/dispatchStore';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { cn } from '@/utils/format';
import {
  AREAS,
  AREA_ORDER,
  TASK_TYPE_LABELS,
  PRIORITY_LABELS,
  CARGO_TYPES,
  LOW_BATTERY_THRESHOLD,
  ROBOT_MODEL_NAMES,
} from '@/utils/constants';
import {
  getAreaName,
  getAreaColor,
  formatWeight,
  formatBarcode,
  generateId,
  euclideanDistance,
  roundTo,
} from '@/utils/format';
import type { TaskType, AreaType, Cargo } from '@/types';

const STEPS = [
  { id: 1, name: '物品信息', icon: Package, desc: '填写运送物品详情' },
  { id: 2, name: '运输设置', icon: Truck, desc: '配置起点终点和时效' },
  { id: 3, name: '确认提交', icon: FileCheck2, desc: '预览调度结果并提交' },
];

const TYPE_OPTIONS: {
  key: TaskType;
  name: string;
  color: string;
  icon: typeof Pill;
  category: string;
}[] = [
  { key: 'emergency_lab', name: '急诊检验', color: '#DC2626', icon: FlaskConical, category: '紧急类' },
  { key: 'regular_med', name: '常规送药', color: '#2563EB', icon: Pill, category: '常规类' },
  { key: 'narcotic', name: '毒麻药品', color: '#7C3AED', icon: Lock, category: '管控类' },
  { key: 'supply', name: '器械供应', color: '#0284C7', icon: Box, category: '常规类' },
  { key: 'sample', name: '标本运输', color: '#059669', icon: TestTube, category: '常规类' },
];

const TIME_OPTIONS = [
  { value: 15, label: '15分钟', desc: '极速配送', priority: 1, icon: Zap },
  { value: 30, label: '30分钟', desc: '加急配送', priority: 1, icon: Zap },
  { value: 60, label: '1小时', desc: '标准配送', priority: 2, icon: Clock },
  { value: 120, label: '2小时', desc: '普通配送', priority: 3, icon: Clock },
  { value: 240, label: '4小时', desc: '计划配送', priority: 3, icon: Clock },
];

export default function TaskCreate() {
  const { robots, tasks, assignBestRobot, addLog } = useDispatchStore();
  const [step, setStep] = useState(1);
  const [showResult, setShowResult] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [createdTaskCode, setCreatedTaskCode] = useState('');
  const [assignedRobotCode, setAssignedRobotCode] = useState('');
  const [assignedScore, setAssignedScore] = useState(0);

  const [taskType, setTaskType] = useState<TaskType>('regular_med');
  const [cargoName, setCargoName] = useState('');
  const [cargoCategory, setCargoCategory] = useState(CARGO_TYPES[0].type);
  const [cargoWeight, setCargoWeight] = useState(1.2);
  const [autoBarcode] = useState(() => `BC${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 1000).toString().padStart(4, '0')}`);

  const [origin, setOrigin] = useState<AreaType>('pharmacy');
  const [destination, setDestination] = useState<AreaType>('nurse_station');
  const [timeLimit, setTimeLimit] = useState(30);
  const [priority, setPriority] = useState<1 | 2 | 3>(2);
  const [remark, setRemark] = useState('');

  const cargoOptions = useMemo(() => {
    return CARGO_TYPES.find((g) => g.type === cargoCategory)?.names ?? [];
  }, [cargoCategory]);

  useEffect(() => {
    if (taskType === 'narcotic') {
      setCargoCategory('毒麻药');
      setPriority(1);
    } else if (taskType === 'emergency_lab') {
      setCargoCategory('检验标本');
      setPriority(1);
    } else if (taskType === 'sample') {
      setCargoCategory('检验标本');
    } else if (taskType === 'supply') {
      setCargoCategory('手术器械');
    } else {
      setCargoCategory('口服药');
    }
  }, [taskType]);

  useEffect(() => {
    if (cargoOptions.length > 0 && !cargoOptions.includes(cargoName)) {
      setCargoName(cargoOptions[0]);
    }
  }, [cargoOptions, cargoName]);

  const candidateRobots = useMemo(() => {
    const originPos = AREAS[origin].position;
    return robots
      .filter(
        (r) =>
          r.status === 'idle' &&
          r.battery >= LOW_BATTERY_THRESHOLD &&
          (!r.cargo || r.cargo.weight + cargoWeight <= 50)
      )
      .map((r) => {
        const dist = euclideanDistance(r.position, originPos);
        const maxDist = 80;
        const distScore = 1 - Math.min(dist / maxDist, 1);
        const batteryScore = r.battery / 100;
        const priorityBonus = priority === 1 ? 0.2 : priority === 2 ? 0.08 : 0;
        const score = roundTo(distScore * 0.5 + batteryScore * 0.35 + 0.15 + priorityBonus, 3);
        const estMinutes = roundTo(dist * 0.8 + 5, 0);
        return { robot: r, score, dist: roundTo(dist, 1), estMinutes };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [robots, origin, cargoWeight, priority]);

  const isNarcotic = taskType === 'narcotic';

  const canGoNext = () => {
    if (step === 1) return cargoName.trim().length > 0 && cargoWeight > 0;
    if (step === 2) return origin !== destination;
    return true;
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const newTaskId = generateId('T');
    const codeNum = tasks.length + 1;
    const newCode = `TK${String(codeNum).padStart(5, '0')}`;

    addLog({
      type: 'task',
      level: 'info',
      message: `新建任务 ${newCode}（${TASK_TYPE_LABELS[taskType].name}）创建中...`,
      relatedId: newTaskId,
    });

    await new Promise((r) => setTimeout(r, 1200));

    const cargo: Cargo = {
      barcode: autoBarcode,
      type: cargoCategory,
      name: cargoName,
      weight: roundTo(cargoWeight, 2),
      isNarcotic,
      narcoticLevel: isNarcotic ? ('II' as const) : undefined,
    };

    const originPos = AREAS[origin].position;
    const destPos = AREAS[destination].position;
    const startTime = dayjs();
    const routePoints = 8;
    const route = Array.from({ length: routePoints + 1 }, (_, i) => {
      const t = i / routePoints;
      const midX = 0;
      const x = originPos.x + (midX - originPos.x) * Math.min(1, t * 2) + (destPos.x - midX) * Math.max(0, t * 2 - 1);
      const z = originPos.z * (1 - Math.min(1, t * 2)) + destPos.z * Math.max(0, t * 2 - 1);
      const area: AreaType = t < 0.2 ? origin : t > 0.8 ? destination : 'corridor';
      return {
        x: roundTo(x, 2),
        y: 0,
        z: roundTo(z, 2),
        area,
        timestamp: startTime.add(i * 60_000, 'millisecond').toISOString(),
      };
    });

    const newTask = {
      id: newTaskId,
      code: newCode,
      type: taskType,
      priority,
      status: 'pending' as const,
      origin,
      destination,
      originPosition: { ...originPos, area: origin },
      destinationPosition: { ...destPos, area: destination },
      cargo,
      assignedRobotId: null as string | null,
      createTime: startTime.toISOString(),
      dueTime: startTime.add(timeLimit, 'minute').toISOString(),
      confirmTime: null,
      signer: null,
      approvals: isNarcotic ? [] : [],
      transferHistory: [],
      currentRoute: route,
      routeProgress: 0,
      estimatedArrival: startTime.add(timeLimit - 5, 'minute').toISOString(),
      reminderCount: 0,
    };
    (tasks as any).unshift(newTask);

    setTimeout(() => {
      const robotId = assignBestRobot(newTaskId);
      const assigned = robots.find((r) => r.id === robotId);
      setCreatedTaskCode(newCode);
      setAssignedRobotCode(assigned?.code ?? '待分配');
      setAssignedScore(candidateRobots[0]?.score ?? 0);
      setSubmitting(false);
      setShowResult(true);
    }, 800);
  };

  const resetForm = () => {
    setStep(1);
    setTaskType('regular_med');
    setCargoWeight(1.2);
    setOrigin('pharmacy');
    setDestination('nurse_station');
    setTimeLimit(30);
    setPriority(2);
    setRemark('');
    setShowResult(false);
  };

  const TypeIcon = TYPE_OPTIONS.find((t) => t.key === taskType)?.icon ?? Package;
  const typeCfg = TASK_TYPE_LABELS[taskType];

  return (
    <div className="h-full flex flex-col p-6 gap-5 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-cyan-500/20 border border-violet-500/30 flex items-center justify-center">
                <Sparkles className="text-violet-400" size={20} />
              </div>
              创建运输任务
            </h1>
            <p className="text-sm text-slate-400 mt-1 ml-14">填写任务信息，系统将自动调度最优机器人完成配送</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 shrink-0 py-2">
        {STEPS.map((s, idx) => {
          const Icon = s.icon;
          const active = step === s.id;
          const done = step > s.id;
          return (
            <div key={s.id} className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'w-11 h-11 rounded-xl flex items-center justify-center border-2 transition-all relative',
                    done
                      ? 'bg-gradient-to-br from-emerald-500 to-cyan-500 border-emerald-400 text-white shadow-lg shadow-emerald-500/20'
                      : active
                      ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-500/20 animate-pulse'
                      : 'bg-white/5 border-white/10 text-slate-500'
                  )}
                >
                  {done ? <Check size={18} /> : <Icon size={18} />}
                </div>
                <div className={active ? '' : done ? '' : 'opacity-60'}>
                  <div
                    className={cn(
                      'text-sm font-semibold',
                      done ? 'text-emerald-400' : active ? 'text-white' : 'text-slate-400'
                    )}
                  >
                    步骤 {s.id} · {s.name}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{s.desc}</div>
                </div>
              </div>
              {idx < STEPS.length - 1 && (
                <div
                  className={cn(
                    'w-20 h-0.5 rounded-full transition-all',
                    done ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : 'bg-white/10'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex-1 grid grid-cols-12 gap-5 min-h-0 overflow-hidden">
        <div className="col-span-8 rounded-xl border border-white/10 bg-white/[0.02] p-6 overflow-auto">
          {step === 1 && (
            <div className="space-y-6 max-w-3xl mx-auto" style={{ animation: 'slideIn 0.3s ease-out' }}>
              <div>
                <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                  <Package size={16} className="text-cyan-400" />
                  选择物品类别
                </h3>
                <div className="grid grid-cols-5 gap-3">
                  {TYPE_OPTIONS.map((opt) => {
                    const OptIcon = opt.icon;
                    const selected = taskType === opt.key;
                    return (
                      <button
                        key={opt.key}
                        onClick={() => setTaskType(opt.key)}
                        className={cn(
                          'relative rounded-xl p-4 border transition-all group text-left',
                          selected
                            ? 'border-2 bg-gradient-to-br from-white/10 to-white/5 shadow-lg'
                            : 'border-white/10 bg-white/[0.02] hover:bg-white/5 hover:border-white/20'
                        )}
                        style={selected ? { borderColor: `${opt.color}99`, boxShadow: `0 0 30px ${opt.color}22` } : {}}
                      >
                        <div
                          className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center mb-2.5 transition-all',
                            selected ? 'scale-110' : 'group-hover:scale-105'
                          )}
                          style={{
                            backgroundColor: selected ? `${opt.color}25` : 'rgba(255,255,255,0.05)',
                            color: selected ? opt.color : '#94A3B8',
                          }}
                        >
                          <OptIcon size={20} />
                        </div>
                        <div className="text-sm font-semibold" style={{ color: selected ? opt.color : '#E2E8F0' }}>
                          {opt.name}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">{opt.category}</div>
                        {opt.key === 'narcotic' && (
                          <div className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 font-medium">
                            管控
                          </div>
                        )}
                        {opt.key === 'emergency_lab' && (
                          <div className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 font-medium animate-pulse">
                            紧急
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {isNarcotic && (
                <div className="rounded-xl border-2 border-violet-500/40 bg-gradient-to-r from-violet-500/15 via-violet-500/5 to-violet-500/15 p-4 flex gap-4" style={{ animation: 'pulse 2s ease-in-out infinite' }}>
                  <div className="w-12 h-12 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center shrink-0">
                    <AlertTriangle className="text-violet-300" size={22} />
                  </div>
                  <div>
                    <div className="text-violet-200 font-semibold text-sm flex items-center gap-2">
                      <Lock size={14} />
                      毒麻药品特殊管控提示
                    </div>
                    <div className="text-xs text-slate-300 mt-1.5 space-y-1">
                      <p>• 此类任务需要 <span className="text-violet-300 font-medium">三级审批</span>：药房 → 护士 → 主管</p>
                      <p>• 每级审批均需相关责任人扫码核验身份</p>
                      <p>• 全程轨迹加密记录，双人双锁机制</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-2 block font-medium">物品分类</label>
                  <select
                    value={cargoCategory}
                    onChange={(e) => setCargoCategory(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500/40 transition-colors"
                  >
                    {CARGO_TYPES.map((g) => (
                      <option key={g.type} value={g.type} className="bg-slate-800">
                        {g.type}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-2 block font-medium">物品名称</label>
                  <select
                    value={cargoName}
                    onChange={(e) => setCargoName(e.target.value)}
                    className="w-full h-11 px-4 rounded-xl bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500/40 transition-colors"
                  >
                    {cargoOptions.map((n) => (
                      <option key={n} value={n} className="bg-slate-800">
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400 mb-2 block font-medium flex items-center gap-1.5">
                    <Barcode size={12} />
                    物品条码（自动生成）
                  </label>
                  <div className="h-11 px-4 rounded-xl bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 flex items-center">
                    <span className="font-mono text-cyan-300 text-sm tracking-wide">{formatBarcode(autoBarcode)}</span>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-2 block font-medium flex items-center gap-1.5">
                    <Scale size={12} />
                    物品重量（千克）
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0.2}
                      max={20}
                      step={0.1}
                      value={cargoWeight}
                      onChange={(e) => setCargoWeight(Number(e.target.value))}
                      className="flex-1 accent-cyan-500"
                    />
                    <div className="w-24 h-11 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center">
                      <span className="font-mono font-bold text-white">{formatWeight(cargoWeight)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 max-w-3xl mx-auto" style={{ animation: 'slideIn 0.3s ease-out' }}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                      <MapPin size={12} className="text-emerald-400" />
                    </div>
                    起始位置
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {AREA_ORDER.filter((a) => a !== 'charging_station').map((a) => {
                      const cfg = AREAS[a];
                      const selected = origin === a;
                      return (
                        <button
                          key={a}
                          onClick={() => setOrigin(a)}
                          className={cn(
                            'rounded-xl p-3 border text-left transition-all',
                            selected
                              ? 'bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 shadow-lg'
                              : 'bg-white/[0.02] border-white/10 hover:bg-white/5 hover:border-white/20',
                            destination === a && 'opacity-40 cursor-not-allowed'
                          )}
                          style={selected ? { borderColor: `${cfg.color}99`, boxShadow: `0 0 20px ${cfg.color}22` } : {}}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: cfg.color }}
                            />
                            <span className="text-sm font-semibold" style={{ color: selected ? cfg.color : '#E2E8F0' }}>
                              {cfg.nameCn}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">{cfg.name}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                    <div className="w-6 h-6 rounded-md bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
                      <MapPin size={12} className="text-rose-400" />
                    </div>
                    目标位置
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {AREA_ORDER.filter((a) => a !== 'charging_station').map((a) => {
                      const cfg = AREAS[a];
                      const selected = destination === a;
                      return (
                        <button
                          key={a}
                          onClick={() => setDestination(a)}
                          disabled={origin === a}
                          className={cn(
                            'rounded-xl p-3 border text-left transition-all',
                            selected
                              ? 'bg-gradient-to-br from-rose-500/20 to-rose-500/5 shadow-lg'
                              : 'bg-white/[0.02] border-white/10 hover:bg-white/5 hover:border-white/20',
                            origin === a && 'opacity-40 cursor-not-allowed'
                          )}
                          style={selected ? { borderColor: `${cfg.color}99`, boxShadow: `0 0 20px ${cfg.color}22` } : {}}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: cfg.color }}
                            />
                            <span className="text-sm font-semibold" style={{ color: selected ? cfg.color : '#E2E8F0' }}>
                              {cfg.nameCn}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">{cfg.name}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-gradient-to-r from-emerald-500/10 via-cyan-500/10 to-blue-500/10 border border-white/10 p-4 flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getAreaColor(origin) }}
                  />
                  <span className="text-sm font-medium text-white">{getAreaName(origin)}</span>
                </div>
                <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden relative">
                  <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 via-cyan-500 to-blue-500 rounded-full animate-pulse" style={{ width: '100%' }} />
                  <ChevronRight className="absolute top-1/2 -translate-y-1/2 text-cyan-300 animate-bounce" size={16} style={{ left: '50%', transform: 'translate(-50%, -50%)' }} />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">{getAreaName(destination)}</span>
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getAreaColor(destination) }}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold text-white mb-4 flex items-center gap-2">
                  <Clock size={16} className="text-amber-400" />
                  时效要求
                </h3>
                <div className="grid grid-cols-5 gap-3">
                  {TIME_OPTIONS.map((opt) => {
                    const TIcon = opt.icon;
                    const selected = timeLimit === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setTimeLimit(opt.value);
                          setPriority(opt.priority as 1 | 2 | 3);
                        }}
                        className={cn(
                          'rounded-xl p-3 border transition-all text-center',
                          selected
                            ? 'bg-gradient-to-br from-amber-500/20 to-orange-500/10 border-amber-500/50 shadow-lg shadow-amber-500/10'
                            : 'bg-white/[0.02] border-white/10 hover:bg-white/5 hover:border-white/20'
                        )}
                      >
                        <TIcon
                          size={18}
                          className={cn('mx-auto mb-2', selected ? 'text-amber-400' : 'text-slate-500')}
                        />
                        <div className={cn('text-sm font-bold', selected ? 'text-amber-300' : 'text-white')}>
                          {opt.label}
                        </div>
                        <div className={cn('text-[10px] mt-0.5', selected ? 'text-amber-200/70' : 'text-slate-500')}>
                          {opt.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2">
                  <Gauge size={16} className="text-cyan-400" />
                  优先级
                  <StatusBadge variant="priority" level={priority} size="sm" className="ml-2" />
                </h3>
                <div className="flex gap-2">
                  {[1, 2, 3].map((lv) => {
                    const cfg = PRIORITY_LABELS[lv];
                    const selected = priority === lv;
                    return (
                      <button
                        key={lv}
                        onClick={() => setPriority(lv as 1 | 2 | 3)}
                        className={cn(
                          'flex-1 rounded-xl py-3 px-4 border transition-all flex items-center justify-between',
                          selected ? 'shadow-lg' : 'bg-white/[0.02] border-white/10 hover:bg-white/5'
                        )}
                        style={
                          selected
                            ? { borderColor: `${cfg.color}88`, backgroundColor: `${cfg.color}15` }
                            : {}
                        }
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-sm"
                            style={{
                              backgroundColor: `${cfg.color}25`,
                              color: cfg.color,
                            }}
                          >
                            P{lv}
                          </div>
                          <span className="text-sm font-medium" style={{ color: selected ? cfg.color : '#E2E8F0' }}>
                            {cfg.name}
                          </span>
                        </div>
                        {lv === 1 && <Zap size={14} className="text-red-400" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-2 block font-medium flex items-center gap-1.5">
                  <FileText size={12} />
                  备注说明（可选）
                </label>
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  rows={3}
                  placeholder="请输入特殊需求、注意事项等补充说明..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/40 transition-colors resize-none"
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5 max-w-4xl mx-auto" style={{ animation: 'slideIn 0.3s ease-out' }}>
              <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-blue-500/5 p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <CheckCircle2 size={18} className="text-cyan-400" />
                    任务信息确认
                  </h3>
                  <button
                    onClick={() => setStep(1)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                  >
                    返回修改
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  <div className="space-y-3">
                    <div className="text-xs text-slate-400 uppercase tracking-wider">物品信息</div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center"
                          style={{ backgroundColor: `${typeCfg.color}25` }}
                        >
                          <TypeIcon size={14} style={{ color: typeCfg.color }} />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">{cargoName}</div>
                          <div className="text-[10px] text-slate-500">{typeCfg.name} · {cargoCategory}</div>
                        </div>
                      </div>
                      <div className="rounded-lg bg-white/5 border border-white/10 p-2.5 space-y-1.5 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-400">条码</span>
                          <span className="font-mono text-cyan-300">{formatBarcode(autoBarcode)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">重量</span>
                          <span className="text-white font-medium">{formatWeight(cargoWeight)}</span>
                        </div>
                        {isNarcotic && (
                          <div className="flex justify-between pt-1 mt-1 border-t border-white/5">
                            <span className="text-violet-400 flex items-center gap-1"><Lock size={10} />管控等级</span>
                            <span className="text-violet-300 font-medium">需三级审批</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-xs text-slate-400 uppercase tracking-wider">运输路线</div>
                    <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                      <div className="flex items-center gap-2 mb-3">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: getAreaColor(origin) }}
                        />
                        <span className="text-sm font-medium text-white">{getAreaName(origin)}</span>
                      </div>
                      <div className="ml-[5px] pl-3 border-l-2 border-dashed border-white/10 space-y-3 py-1">
                        <div className="text-[10px] text-slate-500">主走廊通道 · 预计通过 3 个区域</div>
                      </div>
                      <div className="flex items-center gap-2 mt-3">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: getAreaColor(destination) }}
                        />
                        <span className="text-sm font-medium text-white">{getAreaName(destination)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="text-xs text-slate-400 uppercase tracking-wider">时效与优先级</div>
                    <div className="space-y-2.5">
                      <div className="rounded-lg bg-white/5 border border-white/10 p-3">
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs text-slate-400">要求时效</span>
                          <StatusBadge variant="priority" level={priority} size="sm" />
                        </div>
                        <div className="text-xl font-bold text-cyan-300 font-mono text-glow-cyan">
                          {timeLimit} <span className="text-sm text-slate-400 font-normal">分钟</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-1">
                          截止: {dayjs().add(timeLimit, 'minute').format('HH:mm')}
                        </div>
                      </div>
                      {remark && (
                        <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2.5">
                          <div className="text-[10px] text-amber-400 mb-1 font-medium">备注</div>
                          <div className="text-xs text-amber-200/80">{remark}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-white flex items-center gap-2">
                    <Sparkles size={18} className="text-violet-400" />
                    AI 智能调度预览
                    <span className="text-xs text-slate-400 font-normal">根据距离/电量/优先级综合评分</span>
                  </h3>
                  <span className="text-xs font-mono px-2 py-1 rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/30">
                    {candidateRobots.length} 个候选机器人
                  </span>
                </div>
                <div className="space-y-3">
                  {candidateRobots.map((c, idx) => {
                    const best = idx === 0;
                    return (
                      <div
                        key={c.robot.id}
                        className={cn(
                          'rounded-xl p-4 border transition-all flex items-center gap-4',
                          best
                            ? 'bg-gradient-to-r from-emerald-500/15 via-cyan-500/10 to-transparent border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                            : 'bg-white/[0.02] border-white/10'
                        )}
                      >
                        <div className="relative">
                          <ProgressRing
                            value={c.score * 100}
                            size={64}
                            strokeWidth={6}
                            color={best ? '#10B981' : c.score > 0.7 ? '#0EA5E9' : '#6B7280'}
                            label="评分"
                          />
                          {best && (
                            <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/40 animate-bounce">
                              <Star size={14} className="text-white fill-white" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-base font-bold text-white font-mono">{c.robot.code}</span>
                            <span className="text-xs text-slate-400">{ROBOT_MODEL_NAMES[idx % ROBOT_MODEL_NAMES.length]}</span>
                            {best && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-medium">
                                推荐
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-4 gap-3 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Battery size={12} className="text-emerald-400" />
                              <span className="text-slate-400">电量</span>
                              <span className="text-white font-medium">{Math.round(c.robot.battery)}%</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MapPin size={12} className="text-cyan-400" />
                              <span className="text-slate-400">距离</span>
                              <span className="text-white font-medium">{c.dist}u</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Clock size={12} className="text-amber-400" />
                              <span className="text-slate-400">ETA</span>
                              <span className="text-white font-medium">{c.estMinutes}分钟</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 size={12} className="text-violet-400" />
                              <span className="text-slate-400">里程</span>
                              <span className="text-white font-medium">{c.robot.totalDeliveries}次</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {candidateRobots.length === 0 && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-8 text-center">
                      <AlertTriangle className="mx-auto text-amber-400 mb-3" size={28} />
                      <p className="text-amber-200 text-sm font-medium">暂无可调度机器人</p>
                      <p className="text-xs text-slate-400 mt-1">当前无空闲机器人或电量不足，任务将进入等待队列</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="col-span-4 flex flex-col gap-4 min-h-0">
          <div className="rounded-xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-900/40 p-5 shrink-0">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <FileCheck2 size={14} className="text-cyan-400" />
              当前填写概览
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-xs text-slate-400">任务类型</span>
                <StatusBadge variant="task-type" status={taskType} size="sm" />
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-xs text-slate-400">物品</span>
                <span className="text-sm text-white font-medium truncate max-w-[180px]">{cargoName}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-xs text-slate-400">重量</span>
                <span className="text-sm text-white font-mono">{formatWeight(cargoWeight)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-xs text-slate-400">路线</span>
                <div className="flex items-center gap-1.5 text-xs">
                  <span style={{ color: getAreaColor(origin) }}>{getAreaName(origin)}</span>
                  <ChevronRight size={10} className="text-slate-500" />
                  <span style={{ color: getAreaColor(destination) }}>{getAreaName(destination)}</span>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-xs text-slate-400">时效</span>
                <span className="text-sm text-cyan-300 font-mono font-bold">{timeLimit}分钟</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-xs text-slate-400">优先级</span>
                <StatusBadge variant="priority" level={priority} size="sm" />
              </div>
            </div>
          </div>

          <div className="flex-1 rounded-xl border border-white/10 bg-white/[0.02] p-5 overflow-auto">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <Sparkles size={14} className="text-violet-400" />
              AI 调度建议
            </h3>
            <div className="space-y-3">
              {candidateRobots[0] && (
                <div className="rounded-xl bg-gradient-to-br from-emerald-500/15 to-cyan-500/5 border border-emerald-500/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Star size={14} className="text-amber-400 fill-amber-400" />
                    <span className="text-sm font-semibold text-emerald-300">最优方案推荐</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    系统推荐 <span className="text-white font-bold font-mono">{candidateRobots[0].robot.code}</span> 执行此任务，
                    综合评分 <span className="text-emerald-300 font-bold">{Math.round(candidateRobots[0].score * 100)}</span> 分，
                    预计 <span className="text-cyan-300 font-medium">{candidateRobots[0].estMinutes} 分钟</span> 内抵达起点。
                  </p>
                </div>
              )}
              {priority === 1 && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} className="text-red-400" />
                    <span className="text-sm font-semibold text-red-300">高优先级任务</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    系统将提升该任务调度权重，空闲机器人将优先响应。
                    若超时将自动升级通知等级。
                  </p>
                </div>
              )}
              {isNarcotic && (
                <div className="rounded-xl bg-violet-500/10 border border-violet-500/30 p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lock size={14} className="text-violet-400" />
                    <span className="text-sm font-semibold text-violet-300">三级审批流程</span>
                  </div>
                  <div className="space-y-2 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center text-[10px] font-bold text-violet-300">1</div>
                      药房药师核发
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center text-[10px] font-bold text-violet-300">2</div>
                      病区护士接收
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-violet-500/20 flex items-center justify-center text-[10px] font-bold text-violet-300">3</div>
                      主管护师复核
                    </div>
                  </div>
                </div>
              )}
              <div className="rounded-xl bg-slate-800/50 border border-white/5 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={14} className="text-slate-400" />
                  <span className="text-sm font-semibold text-slate-300">合规说明</span>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  任务创建后将自动记录操作日志，全程可追溯。
                  配送路径数据保留 90 天，签收记录永久存档。
                  符合 HIPAA 医疗数据安全标准。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between shrink-0 pt-2">
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className={cn(
            'h-11 px-6 rounded-xl flex items-center gap-2 text-sm font-medium transition-all',
            step === 1
              ? 'bg-white/5 border border-white/10 text-slate-600 cursor-not-allowed'
              : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 hover:border-white/20'
          )}
        >
          <ArrowLeft size={16} />
          上一步
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 mr-2">
            {step} / {STEPS.length} 步骤已完成
          </span>
          {step < 3 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={!canGoNext()}
              className={cn(
                'h-11 px-8 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all',
                canGoNext()
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400 shadow-lg shadow-cyan-500/25'
                  : 'bg-slate-700 text-slate-500 cursor-not-allowed'
              )}
            >
              下一步
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="h-11 px-8 rounded-xl flex items-center gap-2 text-sm font-semibold bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-400 hover:to-cyan-400 shadow-lg shadow-emerald-500/25 transition-all disabled:opacity-60"
            >
              {submitting && <RefreshCw size={16} className="animate-spin" />}
              {submitting ? '提交中...' : '提交并调度'}
              <Check size={16} />
            </button>
          )}
        </div>
      </div>

      <Modal
        open={showResult}
        title="任务创建成功"
        size="md"
        hideClose
        onClose={() => setShowResult(false)}
      >
        <div className="text-center py-4">
          <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30" style={{ animation: 'bounceIn 0.5s ease-out' }}>
            <CheckCircle2 size={42} className="text-white" />
          </div>
          <h3 className="text-xl font-bold text-white mb-1">任务已提交调度</h3>
          <p className="text-sm text-slate-400 mb-6">系统已自动分配最优机器人完成配送</p>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 max-w-md mx-auto mb-6 text-left space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">任务编号</span>
              <span className="font-mono font-bold text-cyan-300 text-base">{createdTaskCode}</span>
            </div>
            <div className="h-px bg-white/5" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">分配机器人</span>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center font-mono text-cyan-300 text-xs font-bold">
                  {assignedRobotCode.slice(-3)}
                </div>
                <span className="font-semibold text-white">{assignedRobotCode}</span>
              </div>
            </div>
            <div className="h-px bg-white/5" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">综合匹配度</span>
              <div className="flex items-center gap-2">
                <ProgressRing
                  value={assignedScore * 100}
                  size={36}
                  strokeWidth={4}
                  color="#10B981"
                  showValue={false}
                />
                <span className="font-bold text-emerald-300 font-mono text-lg">{Math.round(assignedScore * 100)}%</span>
              </div>
            </div>
            <div className="h-px bg-white/5" />
            <div className="flex justify-between items-center">
              <span className="text-sm text-slate-400">状态</span>
              <StatusBadge variant="task" status="assigned" size="sm" pulse />
            </div>
          </div>

          <div className="flex gap-3 justify-center">
            <button
              onClick={resetForm}
              className="h-11 px-6 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10 text-sm font-medium transition-colors"
            >
              继续新建
            </button>
            <button
              onClick={() => setShowResult(false)}
              className="h-11 px-6 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400 shadow-lg shadow-cyan-500/25 text-sm font-semibold transition-all"
            >
              返回任务中心
            </button>
          </div>
        </div>
      </Modal>

      <style>{`
        @keyframes slideIn { from { opacity: 0; transform: translateX(12px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes bounceIn { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.15); } 50% { box-shadow: 0 0 0 8px rgba(139, 92, 246, 0); } }
      `}</style>
    </div>
  );
}
