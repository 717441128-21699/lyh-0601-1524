import dayjs from 'dayjs';
import type { AreaType, TaskType, RobotStatus, TaskStatus } from '@/types';
import { AREAS, TASK_TYPE_LABELS, ROBOT_STATUS_LABELS, TASK_STATUS_LABELS } from './constants';

export const cn = (...inputs: (string | undefined | null | false)[]): string => {
  return inputs.filter(Boolean).join(' ');
};

export const formatTime = (date: string | Date): string => {
  return dayjs(date).format('HH:mm:ss');
};

export const formatDateTime = (date: string | Date): string => {
  return dayjs(date).format('MM-DD HH:mm');
};

export const formatFullDateTime = (date: string | Date): string => {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss');
};

export const formatDate = (date: string | Date): string => {
  return dayjs(date).format('YYYY-MM-DD');
};

export const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${Math.round(minutes)}分钟`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}小时${mins}分` : `${hours}小时`;
};

export const formatBattery = (battery: number): string => {
  return `${Math.round(battery)}%`;
};

export const formatMileage = (km: number): string => {
  return `${km.toFixed(1)}km`;
};

export const formatWeight = (kg: number): string => {
  return kg < 1 ? `${Math.round(kg * 1000)}g` : `${kg.toFixed(1)}kg`;
};

export const getAreaName = (area: AreaType): string => {
  return AREAS[area]?.nameCn ?? area;
};

export const getAreaColor = (area: AreaType): string => {
  return AREAS[area]?.color ?? '#6B7280';
};

export const getTaskTypeName = (type: TaskType): string => {
  return TASK_TYPE_LABELS[type]?.name ?? type;
};

export const getTaskTypeColor = (type: TaskType): string => {
  return TASK_TYPE_LABELS[type]?.color ?? '#6B7280';
};

export const getRobotStatusName = (status: RobotStatus): string => {
  return ROBOT_STATUS_LABELS[status]?.name ?? status;
};

export const getRobotStatusColorClass = (status: RobotStatus): string => {
  return ROBOT_STATUS_LABELS[status]?.color ?? 'text-slate-400';
};

export const getRobotStatusDotColor = (status: RobotStatus): string => {
  return ROBOT_STATUS_LABELS[status]?.dotColor ?? '#9CA3AF';
};

export const getTaskStatusName = (status: TaskStatus): string => {
  return TASK_STATUS_LABELS[status]?.name ?? status;
};

export const getTaskStatusColor = (status: TaskStatus): string => {
  return TASK_STATUS_LABELS[status]?.color ?? '#6B7280';
};

export const getBatteryColor = (battery: number): string => {
  if (battery >= 60) return '#10B981';
  if (battery >= 30) return '#F59E0B';
  return '#EF4444';
};

export const getBatteryColorClass = (battery: number): string => {
  if (battery >= 60) return 'text-emerald-400';
  if (battery >= 30) return 'text-amber-400';
  return 'text-red-400';
};

export const formatBarcode = (barcode: string): string => {
  return barcode.replace(/(.{4})/g, '$1 ').trim();
};

export const generateId = (prefix: string): string => {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
};

export const randomChoice = <T>(arr: T[]): T => {
  return arr[Math.floor(Math.random() * arr.length)];
};

export const randomRange = (min: number, max: number, decimals = 0): number => {
  const val = Math.random() * (max - min) + min;
  return decimals ? Number(val.toFixed(decimals)) : Math.round(val);
};

export const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

export const lerp = (a: number, b: number, t: number): number => {
  return a + (b - a) * t;
};

export const manhattanDistance = (
  p1: { x: number; y: number; z: number },
  p2: { x: number; y: number; z: number }
): number => {
  return Math.abs(p1.x - p2.x) + Math.abs(p1.y - p2.y) + Math.abs(p1.z - p2.z);
};

export const euclideanDistance = (
  p1: { x: number; y: number; z: number },
  p2: { x: number; y: number; z: number }
): number => {
  return Math.sqrt(
    Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2) + Math.pow(p1.z - p2.z, 2)
  );
};

export const roundTo = (num: number, decimals: number): number => {
  return Number(num.toFixed(decimals));
};
