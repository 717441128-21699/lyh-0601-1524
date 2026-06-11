import { useState, useEffect, useRef } from 'react';
import {
  ScanLine,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Barcode,
  Package,
  Lock,
  UserRound,
  FileCheck2,
  Shield,
  XCircle,
  Pen,
  Trash2,
  RefreshCw,
  ArrowLeft,
  MapPin,
  Bell,
  User,
  Fingerprint,
  QrCode,
  Camera,
  Sparkles,
  Hourglass,
  X,
} from 'lucide-react';
import dayjs from 'dayjs';
import { useDispatchStore } from '@/store/dispatchStore';
import { Modal } from '@/components/ui/Modal';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { cn, formatBarcode, formatDateTime, formatWeight, getAreaName, getAreaColor, getBatteryColor, randomChoice } from '@/utils/format';
import {
  AREAS,
  NURSE_NAMES,
  PHARMACIST_NAMES,
  SUPERVISOR_NAMES,
  TASK_TIMEOUT_MINUTES,
} from '@/utils/constants';
import type { Task } from '@/types';

interface ScanResult {
  task: Task;
  timeoutMinutes: number;
  isTimeout: boolean;
}

const APPROVAL_STEPS = [
  { level: 1, role: '药房药师', title: '药房核发', names: PHARMACIST_NAMES, icon: Shield },
  { level: 2, role: '病区护士', title: '护士接收', names: NURSE_NAMES, icon: UserRound },
  { level: 3, role: '主管护师', title: '主管复核', names: SUPERVISOR_NAMES, icon: FileCheck2 },
];

export default function ScanConfirm() {
  const { tasks, robots, confirmTask, approveNarcotic } = useDispatchStore();
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [showSignPad, setShowSignPad] = useState(false);
  const [signerName, setSignerName] = useState('');
  const [approvingLevel, setApprovingLevel] = useState<number | null>(null);
  const [approveName, setApproveName] = useState('');
  const [successFlash, setSuccessFlash] = useState(false);
  const [completedTaskCode, setCompletedTaskCode] = useState('');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const arrivedTasks = tasks.filter((t) => t.status === 'arrived');

  useEffect(() => {
    return () => {
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    };
  }, []);

  const startScan = () => {
    if (arrivedTasks.length === 0) return;
    setScanning(true);
    setScanProgress(0);
    setResult(null);
    let p = 0;
    const interval = setInterval(() => {
      p += Math.random() * 12 + 4;
      if (p >= 100) {
        p = 100;
        clearInterval(interval);
        const task = arrivedTasks[Math.floor(Math.random() * arrivedTasks.length)];
        const eta = dayjs(task.estimatedArrival ?? task.createTime);
        const diffMin = dayjs().diff(eta, 'minute');
        const isTimeout = diffMin > TASK_TIMEOUT_MINUTES;
        setTimeout(() => {
          setScanning(false);
          setResult({ task, timeoutMinutes: Math.max(0, diffMin - TASK_TIMEOUT_MINUTES), isTimeout });
          setSuccessFlash(true);
          setTimeout(() => setSuccessFlash(false), 600);
        }, 300);
      }
      setScanProgress(Math.min(p, 100));
    }, 120);
  };

  const simulateScanTask = (task: Task) => {
    const eta = dayjs(task.estimatedArrival ?? task.createTime);
    const diffMin = dayjs().diff(eta, 'minute');
    const isTimeout = diffMin > TASK_TIMEOUT_MINUTES;
    setResult({ task, timeoutMinutes: Math.max(0, diffMin - TASK_TIMEOUT_MINUTES), isTimeout });
    setSuccessFlash(true);
    setTimeout(() => setSuccessFlash(false), 600);
  };

  const resetPanel = () => {
    setResult(null);
    setShowSignPad(false);
    setSignerName('');
    setHasSignature(false);
    setApprovingLevel(null);
    setApproveName('');
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      ctx?.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const openSignPad = () => {
    setShowSignPad(true);
    setSignerName(randomChoice(NURSE_NAMES));
  };

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * canvas.width,
      y: ((e.clientY - rect.top) / rect.height) * canvas.height,
    };
  };

  const startDraw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    lastPos.current = getCanvasPos(e);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current || !lastPos.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    const pos = getCanvasPos(e);
    ctx.strokeStyle = '#0EA5E9';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = '#0EA5E9';
    ctx.shadowBlur = 3;
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
    setHasSignature(true);
  };

  const endDraw = () => {
    setIsDrawing(false);
    lastPos.current = null;
  };

  const clearSignature = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d')!;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasSignature(false);
  };

  const getApprovalProgress = (task: Task) => {
    return task.approvals.filter((a) => a.verified).length;
  };

  const handleApproval = (level: 1 | 2 | 3) => {
    if (!result) return;
    const step = APPROVAL_STEPS.find((s) => s.level === level)!;
    setApprovingLevel(level);
    setApproveName(step.names[0]);
  };

  const confirmApproval = () => {
    if (!result || approvingLevel === null) return;
    const step = APPROVAL_STEPS.find((s) => s.level === approvingLevel)!;
    approveNarcotic(result.task.id, approvingLevel as 1 | 2 | 3, step.role, approveName);
    const updatedTask = { ...result.task };
    updatedTask.approvals = [
      ...updatedTask.approvals.filter((a) => a.level !== approvingLevel),
      { level: approvingLevel as 1 | 2 | 3, approverRole: step.role, approverName: approveName, time: dayjs().toISOString(), verified: true },
    ];
    setResult({ ...result, task: updatedTask });
    setApprovingLevel(null);
    setApproveName('');
  };

  const handleConfirm = () => {
    if (!result) return;
    const task = result.task;
    if (task.cargo.isNarcotic && getApprovalProgress(task) < 3) return;
    confirmTask(task.id, signerName || randomChoice(NURSE_NAMES));
    setCompletedTaskCode(task.code);
    setSuccessFlash(true);
    setTimeout(() => {
      setSuccessFlash(false);
      resetPanel();
    }, 2500);
  };

  return (
    <div className="h-full flex flex-col p-6 gap-5 overflow-hidden">
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/30 flex items-center justify-center">
                <ScanLine className="text-emerald-400" size={20} />
              </div>
              扫码签收
              <span className="text-sm font-normal text-slate-400 ml-2">
                待签收 <span className="text-cyan-400 font-bold">{arrivedTasks.length}</span> 单
              </span>
            </h1>
            <p className="text-sm text-slate-400 mt-1 ml-14">扫描任务条码或机器人编号完成物品签收</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {arrivedTasks.filter((t) => dayjs().diff(dayjs(t.estimatedArrival ?? t.createTime), 'minute') > TASK_TIMEOUT_MINUTES).length > 0 && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/15 border border-red-500/40 animate-pulse">
              <Bell size={16} className="text-red-400" />
              <span className="text-sm text-red-300 font-medium">
                {arrivedTasks.filter((t) => dayjs().diff(dayjs(t.estimatedArrival ?? t.createTime), 'minute') > TASK_TIMEOUT_MINUTES).length} 单超时待处理
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-5 min-h-0 overflow-hidden">
        <div className="col-span-7 flex flex-col gap-4 min-h-0">
          <div className="flex-1 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900 via-slate-900/80 to-slate-900 relative overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-10 left-10 w-64 h-64 bg-cyan-500 rounded-full blur-[120px]" />
              <div className="absolute bottom-10 right-10 w-64 h-64 bg-emerald-500 rounded-full blur-[120px]" />
            </div>

            <div className="relative w-full max-w-lg mx-auto px-8">
              <div
                className={cn(
                  'relative aspect-square rounded-3xl bg-gradient-to-br from-slate-800/80 to-slate-900/80 border-2 overflow-hidden transition-all',
                  successFlash
                    ? 'border-emerald-400 shadow-[0_0_80px_rgba(16,185,129,0.4)]'
                    : scanning
                    ? 'border-cyan-400 shadow-[0_0_60px_rgba(14,165,233,0.3)] animate-pulse'
                    : 'border-dashed border-white/20'
                )}
                style={{ animation: successFlash ? 'flashBorder 0.6s ease-out' : undefined }}
              >
                <div className="absolute top-0 left-0 w-10 h-10 border-t-4 border-l-4 rounded-tl-2xl border-cyan-400" />
                <div className="absolute top-0 right-0 w-10 h-10 border-t-4 border-r-4 rounded-tr-2xl border-cyan-400" />
                <div className="absolute bottom-0 left-0 w-10 h-10 border-b-4 border-l-4 rounded-bl-2xl border-cyan-400" />
                <div className="absolute bottom-0 right-0 w-10 h-10 border-b-4 border-r-4 rounded-br-2xl border-cyan-400" />

                <div className="absolute inset-8 flex items-center justify-center">
                  {!result && !scanning && (
                    <div className="text-center">
                      <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-cyan-500/10 border-2 border-dashed border-cyan-500/40 flex items-center justify-center animate-bounce">
                        <QrCode size={48} className="text-cyan-400" />
                      </div>
                      <h3 className="text-xl font-bold text-white mb-2">准备扫描</h3>
                      <p className="text-sm text-slate-400 mb-8 max-w-xs mx-auto">
                        将任务条码或二维码置于扫描框中央<br />系统将自动识别
                      </p>
                      <button
                        onClick={startScan}
                        disabled={arrivedTasks.length === 0}
                        className={cn(
                          'h-12 px-8 rounded-xl flex items-center gap-3 mx-auto text-sm font-semibold transition-all',
                          arrivedTasks.length > 0
                            ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 text-white hover:from-cyan-400 hover:to-emerald-400 shadow-lg shadow-cyan-500/25'
                            : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                        )}
                      >
                        <Camera size={18} />
                        开始扫描
                      </button>
                      {arrivedTasks.length === 0 && (
                        <p className="text-xs text-slate-500 mt-3">当前无待签收任务</p>
                      )}
                    </div>
                  )}

                  {scanning && (
                    <div className="text-center w-full">
                      <div className="relative h-48 flex items-center justify-center mb-6">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_20px_rgba(14,165,233,0.8)] animate-[scan_2s_ease-in-out_infinite]" />
                        </div>
                        <ScanLine size={64} className="text-cyan-400 opacity-30" />
                      </div>
                      <h3 className="text-xl font-bold text-cyan-300 mb-2">正在识别...</h3>
                      <div className="w-56 h-2 mx-auto rounded-full bg-white/10 overflow-hidden mb-3">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-200"
                          style={{ width: `${scanProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 font-mono">{Math.round(scanProgress)}% 扫描完成</p>
                    </div>
                  )}

                  {result && (
                    <div className="w-full text-center py-2" style={{ animation: 'scaleIn 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                        <CheckCircle2 size={34} className="text-white" />
                      </div>
                      <h3 className="text-lg font-bold text-emerald-300 mb-1">扫描成功</h3>
                      <p className="text-xs text-slate-400 mb-4">识别到 1 个待签收任务</p>
                      <div className="rounded-xl bg-black/30 border border-white/10 p-3 inline-block text-left">
                        <div className="flex items-center gap-2">
                          <Barcode size={14} className="text-cyan-400" />
                          <span className="font-mono font-bold text-white text-sm">{result.task.code}</span>
                          <StatusBadge variant="task-type" status={result.task.type} size="sm" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {!result && !scanning && arrivedTasks.length > 0 && (
                <div className="mt-8 text-center">
                  <p className="text-xs text-slate-500 mb-3">快捷选择待签收任务（模拟扫描）：</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {arrivedTasks.slice(0, 4).map((t) => {
                      const eta = dayjs(t.estimatedArrival ?? t.createTime);
                      const isTimeout = dayjs().diff(eta, 'minute') > TASK_TIMEOUT_MINUTES;
                      return (
                        <button
                          key={t.id}
                          onClick={() => simulateScanTask(t)}
                          className={cn(
                            'px-3 py-1.5 rounded-lg border text-xs font-mono transition-all',
                            isTimeout
                              ? 'bg-red-500/10 border-red-500/30 text-red-300 hover:bg-red-500/20'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10 hover:border-cyan-500/40 hover:text-cyan-300'
                          )}
                        >
                          {t.code}
                          {isTimeout && <AlertTriangle size={10} className="inline ml-1.5 -mt-0.5" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {result && (
            <div className="shrink-0 rounded-2xl border border-white/10 bg-gradient-to-br from-slate-900/80 to-slate-900 p-5">
              <div className="flex items-start gap-5">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-base font-semibold text-white">物品详情</h3>
                    {result.isTimeout && (
                      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/20 border border-red-500/40 animate-pulse">
                        <AlertTriangle size={12} className="text-red-400" />
                        <span className="text-xs font-medium text-red-300">
                          超时 {result.timeoutMinutes} 分钟
                        </span>
                        {result.task.reminderCount > 0 && (
                          <span className="text-[10px] text-red-400 ml-1">· 已催办 {result.task.reminderCount} 次</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                      <span className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Barcode size={11} />
                        物品条码
                      </span>
                      <span className="font-mono text-sm text-cyan-300">{formatBarcode(result.task.cargo.barcode)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                      <span className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Package size={11} />
                        物品名称
                      </span>
                      <span className="text-sm text-white font-medium">{result.task.cargo.name}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                      <span className="text-xs text-slate-400">物品类型</span>
                      <div className="flex items-center gap-2">
                        <StatusBadge variant="task-type" status={result.task.type} size="sm" />
                        <span className="text-xs text-slate-300">{result.task.cargo.type}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                      <span className="text-xs text-slate-400">物品重量</span>
                      <span className="text-sm text-white font-mono">{formatWeight(result.task.cargo.weight)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                      <span className="text-xs text-slate-400 flex items-center gap-1.5">
                        <MapPin size={11} />
                        路线
                      </span>
                      <div className="flex items-center gap-1.5 text-xs">
                        <span style={{ color: getAreaColor(result.task.origin) }}>{getAreaName(result.task.origin)}</span>
                        <span className="text-slate-600">→</span>
                        <span style={{ color: getAreaColor(result.task.destination) }}>{getAreaName(result.task.destination)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                      <span className="text-xs text-slate-400">优先级</span>
                      <StatusBadge variant="priority" level={result.task.priority} size="sm" />
                    </div>
                    {(() => {
                      const robot = robots.find((r) => r.id === result.task.assignedRobotId);
                      return (
                        <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                          <span className="text-xs text-slate-400">配送机器人</span>
                          {robot ? (
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded-md border flex items-center justify-center text-[10px] font-bold font-mono"
                                style={{
                                  borderColor: `${getBatteryColor(robot.battery)}55`,
                                  backgroundColor: `${getBatteryColor(robot.battery)}15`,
                                  color: getBatteryColor(robot.battery),
                                }}
                              >
                                {robot.code.slice(-3)}
                              </div>
                              <span className="text-xs text-white">{robot.code}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500">-</span>
                          )}
                        </div>
                      );
                    })()}
                    <div className="flex justify-between items-center py-1.5">
                      <span className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Clock size={11} />
                        到达时间
                      </span>
                      <span className="text-xs text-white font-mono">{formatDateTime(result.task.estimatedArrival)}</span>
                    </div>
                  </div>
                </div>

                <div className="w-44 shrink-0">
                  <ProgressRing
                    value={result.task.routeProgress * 100}
                    size={120}
                    strokeWidth={8}
                    color={result.isTimeout ? '#EF4444' : '#10B981'}
                    label="配送进度"
                    sublabel={result.isTimeout ? '已超时' : '已到达'}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="col-span-5 flex flex-col gap-4 min-h-0 overflow-auto">
          {!result ? (
            <div className="flex-1 rounded-2xl border border-white/10 bg-white/[0.02] p-8 flex flex-col items-center justify-center text-center">
              <div className="w-20 h-20 mb-5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                <Hourglass size={32} className="text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-1.5">等待扫描</h3>
              <p className="text-sm text-slate-400 max-w-xs">
                扫描任务条码后将在此显示签收详情面板，
                请完成相关核验后点击签收
              </p>
            </div>
          ) : result.task.cargo.isNarcotic ? (
            <div className="flex-1 rounded-2xl border-2 border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-slate-900/80 to-slate-900 p-5 flex flex-col min-h-0">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/5 shrink-0">
                <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/40 flex items-center justify-center">
                  <Lock size={18} className="text-violet-300" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-violet-200">毒麻药品三级审批</h3>
                  <p className="text-[11px] text-slate-400">管控物品需三级责任人依次核验签收</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold font-mono text-violet-300">
                    {getApprovalProgress(result.task)}
                    <span className="text-base text-slate-500">/3</span>
                  </div>
                  <div className="text-[10px] text-slate-500">审批进度</div>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-auto pr-1">
                {APPROVAL_STEPS.map((step, idx) => {
                  const StepIcon = step.icon;
                  const approval = result.task.approvals.find((a) => a.level === step.level);
                  const done = approval?.verified;
                  const canApprove =
                    !done && getApprovalProgress(result.task) === step.level - 1;
                  const isApprove = approvingLevel === step.level;
                  return (
                    <div key={step.level} className="relative">
                      {idx < APPROVAL_STEPS.length - 1 && (
                        <div
                          className={cn(
                            'absolute left-5 top-12 w-0.5 h-[calc(100%-24px)] transition-colors',
                            done ? 'bg-gradient-to-b from-emerald-500 to-emerald-500/30' : 'bg-white/10'
                          )}
                        />
                      )}
                      <div
                        className={cn(
                          'relative rounded-xl p-4 border transition-all',
                          done
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : isApprove
                            ? 'bg-cyan-500/10 border-cyan-400/50 shadow-lg shadow-cyan-500/10'
                            : canApprove
                            ? 'bg-white/[0.04] border-white/15 hover:border-cyan-500/40'
                            : 'bg-white/[0.02] border-white/5 opacity-60'
                        )}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={cn(
                              'w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative z-10',
                              done
                                ? 'bg-gradient-to-br from-emerald-500 to-cyan-500 text-white shadow-lg shadow-emerald-500/20'
                                : canApprove
                                ? 'bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 animate-pulse'
                                : 'bg-white/5 border border-white/10 text-slate-500'
                            )}
                          >
                            {done ? <CheckCircle2 size={18} /> : <StepIcon size={18} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className={cn('text-sm font-semibold', done ? 'text-emerald-300' : 'text-white')}>
                                    第{step.level}级 · {step.title}
                                  </span>
                                  <span className="text-[10px] text-slate-500">{step.role}</span>
                                </div>
                                {done && approval && (
                                  <div className="mt-1 space-y-0.5">
                                    <div className="text-xs text-slate-300">
                                      <User size={10} className="inline mr-1" />
                                      {approval.approverName}
                                    </div>
                                    <div className="text-[10px] text-slate-500 font-mono">
                                      {formatDateTime(approval.time)}
                                    </div>
                                  </div>
                                )}
                              </div>
                              {canApprove && !done && !isApprove && (
                                <button
                                  onClick={() => handleApproval(step.level as 1 | 2 | 3)}
                                  className="shrink-0 flex items-center gap-1.5 h-8 px-3.5 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-medium hover:from-cyan-400 hover:to-blue-400 transition-all shadow-md shadow-cyan-500/20"
                                >
                                  <ScanLine size={12} />
                                  扫码核验
                                </button>
                              )}
                              {done && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                                  已通过
                                </span>
                              )}
                            </div>

                            {isApprove && (
                              <div className="mt-4 rounded-xl bg-black/30 border border-cyan-500/30 p-4" style={{ animation: 'slideIn 0.25s ease-out' }}>
                                <div className="flex items-center gap-2 mb-3">
                                  <Fingerprint size={14} className="text-cyan-400" />
                                  <span className="text-xs font-medium text-cyan-300">身份核验中 · 请扫码工牌</span>
                                </div>
                                <div className="space-y-3">
                                  <div>
                                    <label className="text-[11px] text-slate-400 mb-1.5 block">{step.role}姓名</label>
                                    <select
                                      value={approveName}
                                      onChange={(e) => setApproveName(e.target.value)}
                                      className="w-full h-9 px-3 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:border-cyan-500/40"
                                    >
                                      <option value="" className="bg-slate-800">请选择人员</option>
                                      {step.names.map((n) => (
                                        <option key={n} value={n} className="bg-slate-800">{n}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => { setApprovingLevel(null); setApproveName(''); }}
                                      className="flex-1 h-9 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs hover:bg-white/10 transition-colors"
                                    >
                                      取消
                                    </button>
                                    <button
                                      onClick={confirmApproval}
                                      disabled={!approveName}
                                      className={cn(
                                        'flex-1 h-9 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1.5',
                                        approveName
                                          ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-400 hover:to-cyan-400 shadow-md shadow-emerald-500/20'
                                          : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                      )}
                                    >
                                      <CheckCircle2 size={12} />
                                      确认通过
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-white/5 shrink-0">
                <button
                  onClick={openSignPad}
                  disabled={getApprovalProgress(result.task) < 3}
                  className={cn(
                    'w-full h-12 rounded-xl flex items-center justify-center gap-2.5 text-sm font-semibold transition-all',
                    getApprovalProgress(result.task) >= 3
                      ? 'bg-gradient-to-r from-violet-500 to-cyan-500 text-white hover:from-violet-400 hover:to-cyan-400 shadow-lg shadow-violet-500/25'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  )}
                >
                  {getApprovalProgress(result.task) < 3 ? (
                    <>
                      <Lock size={16} />
                      请先完成三级审批
                    </>
                  ) : (
                    <>
                      <Pen size={16} />
                      前往签收签名
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex-1 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-slate-900/80 to-slate-900 p-5 flex flex-col">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                  <CheckCircle2 size={18} className="text-emerald-300" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-emerald-200">常规物品签收</h3>
                  <p className="text-[11px] text-slate-400">核验物品信息无误后，签名确认签收</p>
                </div>
              </div>

              <div className="flex-1 space-y-4">
                <div className="rounded-xl bg-black/30 border border-white/10 p-4">
                  <div className="text-xs text-slate-400 mb-3 flex items-center gap-1.5">
                    <Barcode size={12} />
                    物品信息核验
                  </div>
                  <div className="space-y-2.5 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">物品名称</span>
                      <span className="text-white font-medium flex items-center gap-1.5">
                        {result.task.cargo.name}
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">规格类型</span>
                      <span className="text-white flex items-center gap-1.5">
                        {result.task.cargo.type}
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">数量重量</span>
                      <span className="text-white font-mono flex items-center gap-1.5">
                        {formatWeight(result.task.cargo.weight)}
                        <CheckCircle2 size={14} className="text-emerald-400" />
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">外包装</span>
                      <span className="text-emerald-300 flex items-center gap-1.5 text-xs font-medium">
                        <Sparkles size={12} />
                        完好无损
                      </span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-black/30 border border-white/10 p-4">
                  <div className="text-xs text-slate-400 mb-3 flex items-center gap-1.5">
                    <Shield size={12} />
                    配送安全检查
                  </div>
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-300 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        冷链温度正常（{result.task.type === 'sample' ? '2-8°C' : '常温'}）
                      </span>
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-300 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        密封标签完整
                      </span>
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-300 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        无异常碰撞记录
                      </span>
                      <CheckCircle2 size={14} className="text-emerald-400" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-4 mt-4 border-t border-white/5">
                <button
                  onClick={openSignPad}
                  className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-white text-sm font-semibold hover:from-emerald-400 hover:to-cyan-400 transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2.5"
                >
                  <Pen size={16} />
                  立即签收签名
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Modal
        open={showSignPad}
        title="签收签名"
        size="lg"
        onClose={() => setShowSignPad(false)}
      >
        {!completedTaskCode ? (
          <div className="space-y-5">
            {result?.isTimeout && (
              <div className="rounded-xl border-2 border-red-500/40 bg-gradient-to-r from-red-500/15 to-red-500/5 p-4 flex items-start gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center shrink-0">
                  <Bell size={18} className="text-red-400" />
                </div>
                <div>
                  <div className="text-red-300 font-semibold text-sm mb-0.5">超时签收警告</div>
                  <div className="text-xs text-slate-300">
                    该任务已超时 <span className="text-red-400 font-bold font-mono">{result.timeoutMinutes} 分钟</span>，
                    催办 <span className="text-red-400 font-bold">{result.task.reminderCount}</span> 次。
                    签收后请注明延迟原因。
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-medium">签收人</label>
                  <div className="flex items-center gap-2 h-11 px-4 rounded-xl bg-white/5 border border-white/10">
                    <User size={14} className="text-slate-500" />
                    <input
                      value={signerName}
                      onChange={(e) => setSignerName(e.target.value)}
                      placeholder="请输入或选择签收人姓名"
                      className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 mb-1.5 block font-medium">快捷选择</label>
                  <div className="flex flex-wrap gap-2">
                    {NURSE_NAMES.slice(0, 4).map((n) => (
                      <button
                        key={n}
                        onClick={() => setSignerName(n)}
                        className={cn(
                          'px-3 py-1.5 rounded-lg text-xs border transition-all',
                          signerName === n
                            ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl bg-black/30 border border-white/10 p-4 mt-2">
                  <div className="text-xs text-slate-400 mb-3 font-medium">签收物品清单</div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">任务编号</span>
                      <span className="font-mono text-cyan-300 font-medium">{result?.task.code}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">物品名称</span>
                      <span className="text-white">{result?.task.cargo.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">重量</span>
                      <span className="text-white font-mono">{result && formatWeight(result.task.cargo.weight)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">条码</span>
                      <span className="font-mono text-xs text-slate-300">
                        {result && formatBarcode(result.task.cargo.barcode)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1.5 block font-medium flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Pen size={12} />
                    电子签名
                  </span>
                  <button
                    onClick={clearSignature}
                    className="text-[11px] text-slate-500 hover:text-red-400 transition-colors flex items-center gap-1"
                  >
                    <Trash2 size={11} />
                    清除
                  </button>
                </label>
                <div
                  className="relative rounded-xl border-2 border-dashed border-white/20 bg-white/[0.03] overflow-hidden"
                  style={{ aspectRatio: '4 / 3' }}
                >
                  <canvas
                    ref={canvasRef}
                    width={480}
                    height={360}
                    onMouseDown={startDraw}
                    onMouseMove={draw}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    className="w-full h-full cursor-crosshair"
                  />
                  {!hasSignature && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center">
                        <Pen size={36} className="text-slate-700 mx-auto mb-2" />
                        <p className="text-sm text-slate-600">请在上方区域签名</p>
                      </div>
                    </div>
                  )}
                  <div className="absolute bottom-2 left-3 text-[10px] text-slate-600 font-mono">
                    {dayjs().format('YYYY-MM-DD HH:mm:ss')}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Fingerprint size={12} />
                    签名数据已加密上传
                  </span>
                  <span className="font-mono">IP: 192.168.1.***</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-white/5">
              <button
                onClick={() => setShowSignPad(false)}
                className="h-11 px-6 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirm}
                disabled={!signerName || !hasSignature}
                className={cn(
                  'h-11 px-8 rounded-xl text-sm font-semibold transition-all flex items-center gap-2',
                  signerName && hasSignature
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-400 hover:to-cyan-400 shadow-lg shadow-emerald-500/25'
                    : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                )}
              >
                <CheckCircle2 size={16} />
                确认签收
              </button>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center shadow-2xl shadow-emerald-500/30 animate-[bounceIn_0.6s_ease-out]">
              <CheckCircle2 size={48} className="text-white" />
            </div>
            <h3 className="text-2xl font-bold text-white mb-2">签收完成</h3>
            <p className="text-sm text-slate-400 mb-2">
              任务 <span className="font-mono text-cyan-300 font-bold">{completedTaskCode}</span> 已签收确认
            </p>
            <p className="text-xs text-slate-500 mb-6">签收人：{signerName} · {dayjs().format('YYYY-MM-DD HH:mm:ss')}</p>
            <button
              onClick={() => { setShowSignPad(false); resetPanel(); setCompletedTaskCode(''); }}
              className="inline-flex items-center gap-2 h-11 px-8 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-sm font-semibold hover:from-cyan-400 hover:to-blue-400 shadow-lg shadow-cyan-500/25 transition-all"
            >
              <RefreshCw size={16} />
              继续扫描下一单
            </button>
          </div>
        )}
      </Modal>

      <style>{`
        @keyframes scan { 0% { transform: translateY(-80px); opacity: 0; } 20% { opacity: 1; } 80% { opacity: 1; } 100% { transform: translateY(80px); opacity: 0; } }
        @keyframes flashBorder { 0%, 100% { box-shadow: 0 0 80px rgba(16,185,129,0.4); } 50% { box-shadow: 0 0 120px rgba(16,185,129,0.7); } }
        @keyframes scaleIn { 0% { transform: scale(0.9); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
        @keyframes bounceIn { 0% { transform: scale(0.3); opacity: 0; } 50% { transform: scale(1.12); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes slideIn { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
