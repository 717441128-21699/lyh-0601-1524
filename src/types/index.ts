export type AreaType =
  | 'pharmacy'
  | 'lab'
  | 'operating_room'
  | 'nurse_station'
  | 'supply_room'
  | 'charging_station'
  | 'corridor';

export type RobotStatus =
  | 'idle'
  | 'working'
  | 'charging'
  | 'fault'
  | 'returning'
  | 'avoiding'
  | 'delivering'
  | 'picking'
  | 'arrived';

export type TaskType =
  | 'emergency_lab'
  | 'regular_med'
  | 'narcotic'
  | 'supply'
  | 'sample';

export type TaskStatus =
  | 'pending'
  | 'assigned'
  | 'picking'
  | 'delivering'
  | 'arrived'
  | 'confirmed'
  | 'timeout'
  | 'cancelled'
  | 'transferred';

export type FaultLevel = 'critical' | 'major' | 'minor';

export type FaultStatus = 'pending' | 'assigned' | 'repairing' | 'resolved';

export interface Position {
  x: number;
  y: number;
  z: number;
  area: AreaType;
}

export interface Cargo {
  barcode: string;
  type: string;
  name: string;
  weight: number;
  isNarcotic: boolean;
  narcoticLevel?: 'I' | 'II' | 'III';
}

export interface Robot {
  id: string;
  code: string;
  model: string;
  battery: number;
  status: RobotStatus;
  position: Position;
  targetPosition?: Position;
  currentTaskId: string | null;
  cargo: Cargo | null;
  totalMileage: number;
  totalDeliveries: number;
  deployDate: string;
  lastMaintenance: string;
  avoidPath?: Position[];
}

export interface ApprovalRecord {
  level: 1 | 2 | 3;
  approverRole: string;
  approverName: string;
  time: string;
  verified: boolean;
}

export interface TransferRecord {
  fromRobotId: string;
  toRobotId: string;
  reason: 'low_battery' | 'fault';
  time: string;
}

export interface RoutePoint extends Position {
  timestamp: string;
}

export interface Task {
  id: string;
  code: string;
  type: TaskType;
  priority: 1 | 2 | 3;
  status: TaskStatus;
  origin: AreaType;
  destination: AreaType;
  originPosition: Position;
  destinationPosition: Position;
  cargo: Cargo;
  assignedRobotId: string | null;
  createTime: string;
  dueTime: string;
  confirmTime: string | null;
  signer: string | null;
  approvals: ApprovalRecord[];
  transferHistory: TransferRecord[];
  currentRoute: RoutePoint[];
  routeProgress: number;
  estimatedArrival: string;
  reminderCount: number;
}

export interface DeliveryRecord {
  id: string;
  taskId: string;
  taskCode: string;
  robotId: string;
  robotCode: string;
  origin: AreaType;
  destination: AreaType;
  cargoName: string;
  route: RoutePoint[];
  startTime: string;
  endTime: string;
  durationMinutes: number;
  onTime: boolean;
  signer: string | null;
  isNarcotic: boolean;
}

export interface FaultOrder {
  id: string;
  robotId: string;
  robotCode: string;
  faultCode: string;
  faultLevel: FaultLevel;
  description: string;
  status: FaultStatus;
  assignedEngineer: string | null;
  createTime: string;
  resolveTime: string | null;
  position: Position;
  affectedTaskIds: string[];
}

export interface Engineer {
  id: string;
  name: string;
  phone: string;
  status: 'idle' | 'busy' | 'offline';
  position: Position;
  skills: string[];
  currentOrderId: string | null;
}

export interface DailyReportRobotStats {
  robotCode: string;
  deliveryCount: number;
  onTimeRate: number;
  avgDeliveryTime: number;
  batteryConsumption: number;
  chargeCount: number;
  faultCount: number;
  totalMileage: number;
}

export interface DailyReport {
  date: string;
  robots: DailyReportRobotStats[];
  totalDeliveries: number;
  overallOnTimeRate: number;
  avgDeliveryTime: number;
  totalBatteryConsumption: number;
  faultDistribution: { type: string; count: number }[];
  peakHours: { hour: number; count: number }[];
  areaDistribution: { area: string; count: number }[];
}

export interface AreaConfig {
  id: AreaType;
  name: string;
  nameCn: string;
  color: string;
  lightColor: string;
  position: Position;
  size: { width: number; height: number; depth: number };
  icon: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'task' | 'robot' | 'fault' | 'system';
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  relatedId?: string;
}

export interface CollisionEvent {
  robotAId: string;
  robotBId: string;
  position: Position;
  time: string;
  resolved: boolean;
  resolution: 'wait' | 'detour';
  waitingRobotId?: string;
}
