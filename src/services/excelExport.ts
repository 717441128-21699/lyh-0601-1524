import * as XLSX from 'xlsx';
import dayjs from 'dayjs';
import type { DailyReport, DailyReportRobotStats } from '@/types';
import { createInitialDailyReport } from '@/utils/mock';

export interface ExportOptions {
  date?: string;
  reportTypes: ('transport' | 'battery' | 'fault')[];
  robotCodes?: string[];
}

export interface ExportHistory {
  id: string;
  fileName: string;
  exportTime: string;
  reportTypes: string[];
  size: string;
}

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const generateDailyReport = (options: ExportOptions = { reportTypes: ['transport', 'battery', 'fault'] }): DailyReport => {
  const baseReport = createInitialDailyReport();
  const report: DailyReport = {
    ...baseReport,
    date: options.date || baseReport.date,
  };

  if (options.robotCodes && options.robotCodes.length > 0) {
    const filteredRobots = baseReport.robots.filter((r) => options.robotCodes!.includes(r.robotCode));
    if (filteredRobots.length > 0) {
      report.robots = filteredRobots;
      report.totalDeliveries = filteredRobots.reduce((sum, r) => sum + r.deliveryCount, 0);
      const totalWeighted = filteredRobots.reduce((sum, r) => sum + r.deliveryCount * r.onTimeRate, 0);
      report.overallOnTimeRate = Number((totalWeighted / report.totalDeliveries).toFixed(1));
      const totalTime = filteredRobots.reduce((sum, r) => sum + r.deliveryCount * r.avgDeliveryTime, 0);
      report.avgDeliveryTime = Number((totalTime / report.totalDeliveries).toFixed(1));
      report.totalBatteryConsumption = filteredRobots.reduce((sum, r) => sum + r.batteryConsumption, 0);
    }
  }

  return report;
};

const createTransportSheet = (report: DailyReport): XLSX.WorkSheet => {
  const headers = ['指标', '数值', '单位'];
  const overview = [
    headers,
    ['统计日期', report.date, ''],
    ['总运输次数', report.totalDeliveries, '次'],
    ['整体准时率', report.overallOnTimeRate, '%'],
    ['平均运输时长', report.avgDeliveryTime, '分钟'],
    ['总电量消耗', report.totalBatteryConsumption, 'Ah'],
  ];

  const robotHeaders = [
    '机器人编号',
    '运输次数',
    '准时率(%)',
    '平均时长(分钟)',
    '电量消耗(Ah)',
    '充电次数',
    '故障次数',
    '行驶里程(km)',
  ];
  const robotRows = report.robots.map((r: DailyReportRobotStats) => [
    r.robotCode,
    r.deliveryCount,
    r.onTimeRate,
    r.avgDeliveryTime,
    r.batteryConsumption,
    r.chargeCount,
    r.faultCount,
    r.totalMileage,
  ]);

  const aoa = [...overview, [], ['机器人明细统计'], robotHeaders, ...robotRows];
  return XLSX.utils.aoa_to_sheet(aoa);
};

const createBatterySheet = (report: DailyReport): XLSX.WorkSheet => {
  const headers = ['机器人编号', '电量消耗(Ah)', '充电次数', '运输次数', '单次平均耗电(Ah)'];
  const rows = report.robots.map((r: DailyReportRobotStats) => [
    r.robotCode,
    r.batteryConsumption,
    r.chargeCount,
    r.deliveryCount,
    Number((r.batteryConsumption / Math.max(r.deliveryCount, 1)).toFixed(2)),
  ]);

  const totalConsumption = report.robots.reduce((s, r) => s + r.batteryConsumption, 0);
  const totalCharges = report.robots.reduce((s, r) => s + r.chargeCount, 0);
  const summary = [
    '合计',
    totalConsumption,
    totalCharges,
    report.totalDeliveries,
    Number((totalConsumption / Math.max(report.totalDeliveries, 1)).toFixed(2)),
  ];

  const aoa = [headers, ...rows, summary];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [{ wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 18 }];
  return ws;
};

const createFaultSheet = (report: DailyReport): XLSX.WorkSheet => {
  const headers = ['故障类型', '发生次数', '占比(%)'];
  const totalFaults = report.faultDistribution.reduce((s, f) => s + f.count, 0);
  const rows = report.faultDistribution.map((f) => [
    f.type,
    f.count,
    Number(((f.count / Math.max(totalFaults, 1)) * 100).toFixed(1)),
  ]);

  const robotHeaders = ['机器人编号', '故障次数', '运输次数', '故障率(%)'];
  const robotRows = report.robots.map((r: DailyReportRobotStats) => [
    r.robotCode,
    r.faultCount,
    r.deliveryCount,
    Number(((r.faultCount / Math.max(r.deliveryCount, 1)) * 100).toFixed(2)),
  ]);

  const aoa = [
    ['故障类型分布'],
    headers,
    ...rows,
    ['合计', totalFaults, '100.0'],
    [],
    ['机器人故障率统计'],
    robotHeaders,
    ...robotRows,
  ];
  return XLSX.utils.aoa_to_sheet(aoa);
};

const createRobotDetailSheet = (report: DailyReport): XLSX.WorkSheet => {
  const headers = [
    '机器人编号',
    '运输次数',
    '准时率(%)',
    '平均时长(分)',
    '电量消耗(Ah)',
    '充电次数',
    '故障次数',
    '行驶里程(km)',
    '备注',
  ];
  const rows = report.robots.map((r: DailyReportRobotStats) => [
    r.robotCode,
    r.deliveryCount,
    r.onTimeRate,
    r.avgDeliveryTime,
    r.batteryConsumption,
    r.chargeCount,
    r.faultCount,
    r.totalMileage,
    r.faultCount > 2 ? '需重点关注' : r.onTimeRate < 90 ? '准时率偏低' : '正常',
  ]);

  const aoa = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols'] = [
    { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
    { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 14 },
  ];
  return ws;
};

export const exportToExcel = async (
  fileName?: string,
  options: ExportOptions = { reportTypes: ['transport', 'battery', 'fault'] }
): Promise<ExportHistory> => {
  const report = generateDailyReport(options);
  const wb = XLSX.utils.book_new();

  if (options.reportTypes.includes('transport')) {
    const transportWs = createTransportSheet(report);
    XLSX.utils.book_append_sheet(wb, transportWs, '运输概览');

    const robotDetailWs = createRobotDetailSheet(report);
    XLSX.utils.book_append_sheet(wb, robotDetailWs, '机器人明细');
  }

  if (options.reportTypes.includes('battery')) {
    const batteryWs = createBatterySheet(report);
    XLSX.utils.book_append_sheet(wb, batteryWs, '电量分析');
  }

  if (options.reportTypes.includes('fault')) {
    const faultWs = createFaultSheet(report);
    XLSX.utils.book_append_sheet(wb, faultWs, '故障统计');
  }

  const finalName = fileName || `医院机器人日报_${report.date}.xlsx`;
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/octet-stream' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = finalName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  const reportTypeNames: Record<string, string> = {
    transport: '运输日报',
    battery: '电量分析',
    fault: '故障统计',
  };

  return {
    id: `EXP_${Date.now()}`,
    fileName: finalName,
    exportTime: dayjs().format('YYYY-MM-DD HH:mm:ss'),
    reportTypes: options.reportTypes.map((t) => reportTypeNames[t]),
    size: formatSize(wbout.length),
  };
};

export const getExportHistory = (): ExportHistory[] => {
  const stored = localStorage.getItem('export_history');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }
  const defaultHistory: ExportHistory[] = [
    {
      id: 'EXP_001',
      fileName: `医院机器人日报_${dayjs().subtract(1, 'day').format('YYYY-MM-DD')}.xlsx`,
      exportTime: dayjs().subtract(1, 'day').hour(18).minute(30).format('YYYY-MM-DD HH:mm:ss'),
      reportTypes: ['运输日报', '电量分析', '故障统计'],
      size: '128.5 KB',
    },
    {
      id: 'EXP_002',
      fileName: `医院机器人日报_${dayjs().subtract(2, 'day').format('YYYY-MM-DD')}.xlsx`,
      exportTime: dayjs().subtract(2, 'day').hour(18).minute(15).format('YYYY-MM-DD HH:mm:ss'),
      reportTypes: ['运输日报', '故障统计'],
      size: '96.2 KB',
    },
    {
      id: 'EXP_003',
      fileName: `医院机器人周报_${dayjs().subtract(7, 'day').format('YYYY-MM-DD')}.xlsx`,
      exportTime: dayjs().subtract(7, 'day').hour(17).minute(45).format('YYYY-MM-DD HH:mm:ss'),
      reportTypes: ['运输日报', '电量分析'],
      size: '256.8 KB',
    },
  ];
  localStorage.setItem('export_history', JSON.stringify(defaultHistory));
  return defaultHistory;
};

export const saveExportHistory = (history: ExportHistory[]) => {
  localStorage.setItem('export_history', JSON.stringify(history.slice(0, 20)));
};
