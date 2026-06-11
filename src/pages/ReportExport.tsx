import { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet,
  CalendarDays,
  CheckSquare,
  Square,
  Bot,
  ChevronDown,
  ChevronUp,
  Download,
  Clock,
  FileText,
  HardDrive,
  Eye,
  Trash2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  History,
} from 'lucide-react';
import dayjs from 'dayjs';
import { DataCard } from '@/components/ui/DataCard';
import { cn } from '@/utils/format';
import {
  generateDailyReport,
  exportToExcel,
  getExportHistory,
  saveExportHistory,
  type ExportOptions,
  type ExportHistory,
} from '@/services/excelExport';

type ReportTypeKey = 'transport' | 'battery' | 'fault';

const reportTypes: { key: ReportTypeKey; label: string; desc: string; color: string }[] = [
  { key: 'transport', label: '运输日报', desc: '运输次数、准时率、时长统计', color: 'cyan' },
  { key: 'battery', label: '电量分析', desc: '电池消耗、充电效率分析', color: 'amber' },
  { key: 'fault', label: '故障统计', desc: '故障分布、故障率统计', color: 'red' },
];

const allRobots = Array.from({ length: 8 }, (_, i) => ({
  code: `RB${String(i + 1).padStart(3, '0')}`,
  model: ['MedBot-X1 Pro', 'MedBot-X2 Elite', 'MedBot-X3 Max'][i % 3],
}));

const colorClasses: Record<string, { ring: string; text: string; bg: string }> = {
  cyan: { ring: 'ring-cyan-500/40', text: 'text-cyan-400', bg: 'bg-cyan-500/15' },
  amber: { ring: 'ring-amber-500/40', text: 'text-amber-400', bg: 'bg-amber-500/15' },
  red: { ring: 'ring-red-500/40', text: 'text-red-400', bg: 'bg-red-500/15' },
};

export default function ReportExport() {
  const [selectedDate, setSelectedDate] = useState(dayjs().format('YYYY-MM-DD'));
  const [selectedTypes, setSelectedTypes] = useState<ReportTypeKey[]>(['transport', 'battery', 'fault']);
  const [selectedRobots, setSelectedRobots] = useState<string[]>(allRobots.map((r) => r.code));
  const [robotDropdownOpen, setRobotDropdownOpen] = useState(false);
  const [previewCollapsed, setPreviewCollapsed] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [exportResult, setExportResult] = useState<'success' | 'error' | null>(null);
  const [history, setHistory] = useState<ExportHistory[]>([]);

  useEffect(() => {
    setHistory(getExportHistory());
  }, []);

  const exportOptions: ExportOptions = useMemo(
    () => ({
      date: selectedDate,
      reportTypes: selectedTypes,
      robotCodes: selectedRobots.length === allRobots.length ? undefined : selectedRobots,
    }),
    [selectedDate, selectedTypes, selectedRobots]
  );

  const previewReport = useMemo(() => generateDailyReport(exportOptions), [exportOptions]);

  const toggleType = (key: ReportTypeKey) => {
    setSelectedTypes((prev) =>
      prev.includes(key) ? prev.filter((t) => t !== key) : [...prev, key]
    );
  };

  const toggleRobot = (code: string) => {
    setSelectedRobots((prev) =>
      prev.includes(code) ? prev.filter((r) => r !== code) : [...prev, code]
    );
  };

  const selectAllRobots = () => {
    setSelectedRobots(allRobots.map((r) => r.code));
  };

  const clearRobots = () => {
    setSelectedRobots([]);
  };

  const canExport = selectedTypes.length > 0 && selectedRobots.length > 0;

  const handleExport = async () => {
    if (!canExport || isExporting) return;

    setIsExporting(true);
    setExportProgress(0);
    setExportResult(null);

    const steps = [
      { p: 15, d: 250 },
      { p: 40, d: 350 },
      { p: 70, d: 400 },
      { p: 92, d: 300 },
    ];

    for (const step of steps) {
      await new Promise((r) => setTimeout(r, step.d));
      setExportProgress(step.p);
    }

    try {
      const result = await exportToExcel(undefined, exportOptions);
      setExportProgress(100);
      setExportResult('success');
      const newHistory = [result, ...history].slice(0, 20);
      setHistory(newHistory);
      saveExportHistory(newHistory);
    } catch {
      setExportResult('error');
    } finally {
      setTimeout(() => {
        setIsExporting(false);
        setExportProgress(0);
        setExportResult(null);
      }, 2000);
    }
  };

  const deleteHistoryItem = (id: string) => {
    const newHistory = history.filter((h) => h.id !== id);
    setHistory(newHistory);
    saveExportHistory(newHistory);
  };

  return (
    <div className="h-full w-full overflow-y-auto p-6 space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FileSpreadsheet className="text-emerald-400" size={28} />
            Excel 日报导出
          </h1>
          <p className="text-sm text-slate-400 mt-1">配置报表参数，一键导出多维度数据 Excel 报表</p>
        </div>
        <div className="text-xs text-slate-500 font-mono">
          报表生成：{dayjs().format('YYYY-MM-DD HH:mm:ss')}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-5">
        <div className="xl:col-span-2 space-y-5">
          <div className="glass rounded-xl p-5 space-y-5">
            <h2 className="text-white font-semibold flex items-center gap-2 border-b border-white/5 pb-3">
              <CalendarDays size={18} className="text-cyan-400" />
              报表配置
            </h2>

            <div>
              <label className="text-sm text-slate-300 font-medium block mb-2">选择日期</label>
              <div className="relative">
                <CalendarDays size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 focus:outline-none focus:border-cyan-500/40 transition-all"
                />
              </div>
              <div className="flex gap-1.5 mt-2">
                {[
                  { label: '今天', offset: 0 },
                  { label: '昨天', offset: 1 },
                  { label: '前天', offset: 2 },
                  { label: '7天前', offset: 7 },
                ].map((p) => (
                  <button
                    key={p.label}
                    onClick={() => setSelectedDate(dayjs().subtract(p.offset, 'day').format('YYYY-MM-DD'))}
                    className={cn(
                      'flex-1 px-2 py-1.5 text-xs rounded-lg border transition-all',
                      dayjs().subtract(p.offset, 'day').format('YYYY-MM-DD') === selectedDate
                        ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                        : 'bg-white/5 text-slate-400 border-white/5 hover:border-white/10'
                    )}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-300 font-medium block mb-2">
                报表类型
                <span className="text-slate-500 ml-2">（已选 {selectedTypes.length}/3）</span>
              </label>
              <div className="space-y-2">
                {reportTypes.map((rt) => {
                  const checked = selectedTypes.includes(rt.key);
                  const cc = colorClasses[rt.color];
                  return (
                    <button
                      key={rt.key}
                      onClick={() => toggleType(rt.key)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left',
                        checked
                          ? `${cc.bg} border-current ${cc.text} ring-1 ${cc.ring}`
                          : 'bg-white/[0.02] border-white/5 text-slate-400 hover:border-white/10'
                      )}
                    >
                      {checked ? (
                        <CheckSquare size={18} className={cc.text} />
                      ) : (
                        <Square size={18} className="text-slate-600" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className={cn('text-sm font-medium', checked ? cc.text : 'text-slate-300')}>
                          {rt.label}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{rt.desc}</div>
                      </div>
                      <div
                        className={cn(
                          'w-2 h-2 rounded-full',
                          checked ? cc.text.replace('text-', 'bg-') : 'bg-slate-600'
                        )}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-sm text-slate-300 font-medium block mb-2">
                选择机器人
                <span className="text-slate-500 ml-2">
                  （已选 {selectedRobots.length}/{allRobots.length}）
                </span>
              </label>
              <div className="relative">
                <button
                  onClick={() => setRobotDropdownOpen(!robotDropdownOpen)}
                  className="w-full flex items-center justify-between gap-2 bg-black/40 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-left focus:outline-none focus:border-cyan-500/40 transition-all"
                >
                  <span className="flex items-center gap-2 text-slate-400 overflow-hidden">
                    <Bot size={16} className="flex-shrink-0 text-slate-500" />
                    <span className="truncate">
                      {selectedRobots.length === allRobots.length
                        ? '全部机器人'
                        : selectedRobots.length === 0
                        ? '请选择机器人...'
                        : selectedRobots.join('、')}
                    </span>
                  </span>
                  {robotDropdownOpen ? (
                    <ChevronUp size={16} className="text-slate-400 flex-shrink-0" />
                  ) : (
                    <ChevronDown size={16} className="text-slate-400 flex-shrink-0" />
                  )}
                </button>

                {robotDropdownOpen && (
                  <div className="absolute z-30 left-0 right-0 top-full mt-2 glass-strong rounded-xl p-2 shadow-2xl max-h-72 overflow-y-auto">
                    <div className="flex items-center justify-between px-2 py-1.5 border-b border-white/5 mb-1">
                      <button
                        onClick={selectAllRobots}
                        className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        全选
                      </button>
                      <button
                        onClick={clearRobots}
                        className="text-xs text-slate-500 hover:text-slate-400 transition-colors"
                      >
                        清空
                      </button>
                    </div>
                    {allRobots.map((r) => {
                      const checked = selectedRobots.includes(r.code);
                      return (
                        <button
                          key={r.code}
                          onClick={() => toggleRobot(r.code)}
                          className={cn(
                            'w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all text-left',
                            checked ? 'bg-cyan-500/15 text-cyan-400' : 'text-slate-300 hover:bg-white/5'
                          )}
                        >
                          {checked ? (
                            <CheckSquare size={15} />
                          ) : (
                            <Square size={15} className="text-slate-600" />
                          )}
                          <span className="font-mono text-sm">{r.code}</span>
                          <span className="text-[10px] text-slate-500 ml-auto">{r.model}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-white/5">
              <button
                onClick={handleExport}
                disabled={!canExport || isExporting}
                className={cn(
                  'w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all',
                  canExport && !isExporting
                    ? 'bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-700/50 text-slate-500 cursor-not-allowed'
                )}
              >
                {isExporting ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    正在导出... {exportProgress}%
                  </>
                ) : exportResult === 'success' ? (
                  <>
                    <CheckCircle2 size={16} />
                    导出成功！
                  </>
                ) : exportResult === 'error' ? (
                  <>
                    <XCircle size={16} />
                    导出失败
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    导出 Excel 报表
                  </>
                )}
              </button>

              {(isExporting || exportResult) && (
                <div className="mt-3">
                  <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-300',
                        exportResult === 'success'
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                          : exportResult === 'error'
                          ? 'bg-gradient-to-r from-red-500 to-red-400'
                          : 'bg-gradient-to-r from-cyan-500 to-emerald-500'
                      )}
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {!canExport && (
                <p className="text-[11px] text-amber-400/80 mt-2 text-center">
                  请至少选择一种报表类型和一台机器人
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <DataCard
              title="总运输"
              value={previewReport.totalDeliveries}
              color="cyan"
              icon={<PackageIcon size={18} />}
              className="!p-3"
            />
            <DataCard
              title="准时率"
              value={`${previewReport.overallOnTimeRate}%`}
              color="green"
              icon={<CheckCircle2 size={18} />}
              className="!p-3"
            />
            <DataCard
              title="故障数"
              value={previewReport.faultDistribution.reduce((s, f) => s + f.count, 0)}
              color="red"
              icon={<AlertIcon size={18} />}
              className="!p-3"
            />
          </div>
        </div>

        <div className="xl:col-span-3 space-y-5">
          <div className="glass rounded-xl overflow-hidden">
            <button
              onClick={() => setPreviewCollapsed(!previewCollapsed)}
              className="w-full flex items-center justify-between p-4 border-b border-white/5 hover:bg-white/[0.01] transition-colors"
            >
              <div className="flex items-center gap-2">
                <Eye size={18} className="text-violet-400" />
                <span className="text-white font-semibold">数据预览</span>
                <span className="text-xs text-slate-500 ml-2">（样例数据，实际以导出为准）</span>
              </div>
              {previewCollapsed ? (
                <ChevronDown size={18} className="text-slate-400" />
              ) : (
                <ChevronUp size={18} className="text-slate-400" />
              )}
            </button>

            {!previewCollapsed && (
              <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
                <div>
                  <div className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
                    <FileText size={13} />
                    运输概览 · 机器人明细 ({previewReport.robots.length} 台)
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-white/5">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-white/5 text-slate-400">
                          <th className="px-3 py-2 text-left font-medium">机器人</th>
                          <th className="px-3 py-2 text-right font-medium">运输</th>
                          <th className="px-3 py-2 text-right font-medium">准时率</th>
                          <th className="px-3 py-2 text-right font-medium">时长</th>
                          <th className="px-3 py-2 text-right font-medium">耗电</th>
                          <th className="px-3 py-2 text-right font-medium">充电</th>
                          <th className="px-3 py-2 text-right font-medium">故障</th>
                          <th className="px-3 py-2 text-right font-medium">里程</th>
                        </tr>
                      </thead>
                      <tbody>
                        {previewReport.robots.slice(0, 5).map((r) => (
                          <tr key={r.robotCode} className="border-t border-white/5">
                            <td className="px-3 py-2 font-mono text-slate-200">{r.robotCode}</td>
                            <td className="px-3 py-2 text-right text-slate-300 font-mono">{r.deliveryCount}</td>
                            <td className="px-3 py-2 text-right">
                              <span
                                className={cn(
                                  'font-mono',
                                  r.onTimeRate >= 95
                                    ? 'text-emerald-400'
                                    : r.onTimeRate >= 90
                                    ? 'text-cyan-400'
                                    : 'text-amber-400'
                                )}
                              >
                                {r.onTimeRate}%
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right text-slate-300 font-mono">{r.avgDeliveryTime}分</td>
                            <td className="px-3 py-2 text-right text-slate-300 font-mono">{r.batteryConsumption}Ah</td>
                            <td className="px-3 py-2 text-right text-slate-400 font-mono">{r.chargeCount}</td>
                            <td className="px-3 py-2 text-right">
                              <span
                                className={cn(
                                  'font-mono',
                                  r.faultCount === 0
                                    ? 'text-emerald-400'
                                    : r.faultCount === 1
                                    ? 'text-amber-400'
                                    : 'text-red-400'
                                )}
                              >
                                {r.faultCount}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right text-slate-300 font-mono">{r.totalMileage}km</td>
                          </tr>
                        ))}
                        {previewReport.robots.length > 5 && (
                          <tr className="border-t border-white/5 bg-white/[0.02]">
                            <td colSpan={8} className="px-3 py-2 text-center text-slate-500 text-[11px]">
                              ... 还有 {previewReport.robots.length - 5} 台机器人数据
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {selectedTypes.includes('fault') && (
                  <div>
                    <div className="text-xs text-slate-400 mb-2 flex items-center gap-1.5">
                      <AlertIcon size={13} />
                      故障分布统计
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {previewReport.faultDistribution.map((f) => {
                        const total = previewReport.faultDistribution.reduce((s, x) => s + x.count, 0);
                        const pct = total > 0 ? Math.round((f.count / total) * 100) : 0;
                        return (
                          <div
                            key={f.type}
                            className="bg-white/[0.02] border border-white/5 rounded-lg p-3"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-xs text-slate-300">{f.type}</span>
                              <span className="text-sm font-bold text-red-400 font-mono">{f.count}</span>
                            </div>
                            <div className="h-1 rounded-full bg-white/5 overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-red-500/60 to-amber-500/60 rounded-full"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="text-[10px] text-slate-500 mt-1 text-right">{pct}%</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="glass rounded-xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/5">
              <div className="flex items-center gap-2">
                <History size={18} className="text-blue-400" />
                <span className="text-white font-semibold">历史导出记录</span>
                <span className="text-xs text-slate-500 ml-2">（最近 {history.length} 条）</span>
              </div>
              <button
                onClick={() => setHistory(getExportHistory())}
                className="text-xs text-slate-400 hover:text-cyan-400 transition-colors flex items-center gap-1"
              >
                <RefreshCw size={13} />
                刷新
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {history.length === 0 ? (
                <div className="py-16 text-center text-slate-500">
                  <HardDrive size={48} className="mx-auto mb-3 opacity-20" />
                  <p className="text-sm">暂无导出记录</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-white/5 text-slate-400 text-xs">
                      <th className="px-4 py-2.5 text-left font-medium">文件名</th>
                      <th className="px-4 py-2.5 text-left font-medium">导出时间</th>
                      <th className="px-4 py-2.5 text-left font-medium">报表类型</th>
                      <th className="px-4 py-2.5 text-left font-medium">大小</th>
                      <th className="px-4 py-2.5 text-right font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((h) => (
                      <tr key={h.id} className="border-t border-white/5 hover:bg-white/[0.02] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileSpreadsheet size={15} className="text-emerald-400 flex-shrink-0" />
                            <span className="text-slate-200 font-mono text-xs truncate max-w-[240px]">
                              {h.fileName}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Clock size={13} className="text-slate-500" />
                            <span className="text-xs font-mono">{h.exportTime}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {h.reportTypes.map((t) => (
                              <span
                                key={t}
                                className="text-[10px] px-1.5 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                              >
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs text-slate-400 font-mono flex items-center gap-1">
                            <HardDrive size={12} />
                            {h.size}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all">
                              <Download size={14} />
                            </button>
                            <button className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-all">
                              <Eye size={14} />
                            </button>
                            <button
                              onClick={() => deleteHistoryItem(h.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PackageIcon({ size = 24 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}

function AlertIcon({ size = 24 }: { size?: number }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}
