import type { AreaConfig, AreaType } from '@/types';

export const AREAS: Record<AreaType, AreaConfig> = {
  pharmacy: {
    id: 'pharmacy',
    name: 'Pharmacy',
    nameCn: '中心药房',
    color: '#7C3AED',
    lightColor: '#A78BFA',
    position: { x: -18, y: 0, z: -10, area: 'pharmacy' },
    size: { width: 12, height: 6, depth: 10 },
    icon: 'Pill',
  },
  lab: {
    id: 'lab',
    name: 'Lab',
    nameCn: '检验科',
    color: '#059669',
    lightColor: '#34D399',
    position: { x: -18, y: 0, z: 10, area: 'lab' },
    size: { width: 12, height: 6, depth: 10 },
    icon: 'FlaskConical',
  },
  operating_room: {
    id: 'operating_room',
    name: 'OR',
    nameCn: '手术室',
    color: '#DC2626',
    lightColor: '#F87171',
    position: { x: 0, y: 0, z: 16, area: 'operating_room' },
    size: { width: 14, height: 6, depth: 10 },
    icon: 'Stethoscope',
  },
  nurse_station: {
    id: 'nurse_station',
    name: 'Nurse',
    nameCn: '病区护士站',
    color: '#D97706',
    lightColor: '#FBBF24',
    position: { x: 18, y: 0, z: 10, area: 'nurse_station' },
    size: { width: 12, height: 6, depth: 10 },
    icon: 'UserRound',
  },
  supply_room: {
    id: 'supply_room',
    name: 'CSSD',
    nameCn: '中心供应室',
    color: '#0284C7',
    lightColor: '#38BDF8',
    position: { x: 18, y: 0, z: -10, area: 'supply_room' },
    size: { width: 12, height: 6, depth: 10 },
    icon: 'Package',
  },
  charging_station: {
    id: 'charging_station',
    name: 'Charge',
    nameCn: '充电站',
    color: '#4B5563',
    lightColor: '#9CA3AF',
    position: { x: 0, y: 0, z: -16, area: 'charging_station' },
    size: { width: 10, height: 4, depth: 8 },
    icon: 'Zap',
  },
  corridor: {
    id: 'corridor',
    name: 'Corridor',
    nameCn: '主走廊',
    color: '#374151',
    lightColor: '#6B7280',
    position: { x: 0, y: 0, z: 0, area: 'corridor' },
    size: { width: 50, height: 0.2, depth: 6 },
    icon: 'ArrowLeftRight',
  },
};

export const AREA_ORDER: AreaType[] = [
  'pharmacy',
  'lab',
  'operating_room',
  'nurse_station',
  'supply_room',
  'charging_station',
];

export const TASK_TYPE_LABELS: Record<string, { name: string; color: string; icon: string }> = {
  emergency_lab: { name: '急诊检验', color: '#DC2626', icon: 'AlertTriangle' },
  regular_med: { name: '常规送药', color: '#2563EB', icon: 'Pill' },
  narcotic: { name: '毒麻药品', color: '#7C3AED', icon: 'Lock' },
  supply: { name: '器械供应', color: '#0284C7', icon: 'Package' },
  sample: { name: '标本运输', color: '#059669', icon: 'TestTube' },
};

export const TASK_STATUS_LABELS: Record<string, { name: string; color: string }> = {
  pending: { name: '待分配', color: '#6B7280' },
  assigned: { name: '已分配', color: '#3B82F6' },
  picking: { name: '取货中', color: '#8B5CF6' },
  delivering: { name: '运输中', color: '#0EA5E9' },
  arrived: { name: '已到达', color: '#F59E0B' },
  confirmed: { name: '已签收', color: '#10B981' },
  timeout: { name: '已超时', color: '#EF4444' },
  cancelled: { name: '已取消', color: '#9CA3AF' },
  transferred: { name: '已转派', color: '#F97316' },
};

export const ROBOT_STATUS_LABELS: Record<string, { name: string; color: string; dotColor: string }> = {
  idle: { name: '待机中', color: 'text-slate-400', dotColor: '#9CA3AF' },
  working: { name: '工作中', color: 'text-cyan-400', dotColor: '#06B6D4' },
  charging: { name: '充电中', color: 'text-emerald-400', dotColor: '#10B981' },
  fault: { name: '故障', color: 'text-red-400', dotColor: '#EF4444' },
  returning: { name: '返航中', color: 'text-amber-400', dotColor: '#F59E0B' },
  avoiding: { name: '避让中', color: 'text-violet-400', dotColor: '#8B5CF6' },
};

export const FAULT_LEVEL_LABELS: Record<string, { name: string; color: string }> = {
  critical: { name: '严重', color: '#DC2626' },
  major: { name: '重要', color: '#F59E0B' },
  minor: { name: '轻微', color: '#3B82F6' },
};

export const FAULT_CODE_MAP: Record<string, { code: string; desc: string }> = {
  E001: { code: 'E001', desc: '驱动电机故障' },
  E002: { code: 'E002', desc: '电池异常' },
  E003: { code: 'E003', desc: '激光雷达传感器异常' },
  E004: { code: 'E004', desc: '升降机构卡死' },
  E005: { code: 'E005', desc: '网络连接中断' },
  E006: { code: 'E006', desc: '路径规划失败' },
  E007: { code: 'E007', desc: '货箱检测异常' },
  E008: { code: 'E008', desc: '急停按钮触发' },
};

export const PRIORITY_LABELS: Record<number, { name: string; color: string }> = {
  1: { name: '高优先级', color: '#DC2626' },
  2: { name: '中优先级', color: '#F59E0B' },
  3: { name: '普通', color: '#6B7280' },
};

export const CARGO_TYPES = [
  { type: '口服药', names: ['降压药苯磺酸氨氯地平', '降糖药二甲双胍', '阿司匹林肠溶片', '头孢克肟胶囊'] },
  { type: '注射剂', names: ['生理盐水500ml', '青霉素注射液', '维生素C注射液', '肝素钠注射液'] },
  { type: '检验标本', names: ['血常规标本', '生化全套标本', '凝血四项标本', '血气分析标本'] },
  { type: '手术器械', names: ['普外科手术包', '骨科手术器械', '腹腔镜器械组', '缝合器械包'] },
  { type: '消毒耗材', names: ['一次性注射器', '医用口罩N95', '无菌手术衣', '消毒棉球'] },
  { type: '毒麻药', names: ['吗啡注射液', '哌替啶注射液', '芬太尼透皮贴', '舒芬太尼注射液'] },
];

export const ENGINEER_NAMES = ['张伟工', '李明工', '王强工', '赵磊工'];
export const NURSE_NAMES = ['护士刘芳', '护士陈静', '护士杨丽', '护士周敏', '护士吴婷'];
export const PHARMACIST_NAMES = ['药师黄建国', '药师郑海涛', '药师孙美玲'];
export const SUPERVISOR_NAMES = ['护士长林主任', '护理部王主任', '药学部李主任'];

export const LOW_BATTERY_THRESHOLD = 20;
export const TASK_TIMEOUT_MINUTES = 15;
export const COLLISION_DISTANCE_THRESHOLD = 3;
export const ROBOT_MODEL_NAMES = ['MedBot-X1 Pro', 'MedBot-X2 Elite', 'MedBot-X3 Max'];
