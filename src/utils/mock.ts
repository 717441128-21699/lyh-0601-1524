import dayjs from 'dayjs';
import type {
  Robot,
  Task,
  DeliveryRecord,
  FaultOrder,
  Engineer,
  RoutePoint,
  Cargo,
  Position,
  AreaType,
  TaskType,
  DailyReport,
  LogEntry,
} from '@/types';
import {
  AREAS,
  AREA_ORDER,
  CARGO_TYPES,
  ENGINEER_NAMES,
  FAULT_CODE_MAP,
  NURSE_NAMES,
  PHARMACIST_NAMES,
  ROBOT_MODEL_NAMES,
  SUPERVISOR_NAMES,
} from './constants';
import { generateId, randomChoice, randomRange, roundTo } from './format';

const now = dayjs();

const makeAreaPos = (area: AreaType, offsetX = 0, offsetZ = 0): Position => {
  const cfg = AREAS[area];
  return {
    x: cfg.position.x + offsetX,
    y: 0,
    z: cfg.position.z + offsetZ,
    area,
  };
};

export const createInitialRobots = (): Robot[] => {
  const basePositions: { area: AreaType; ox: number; oz: number; status: Robot['status']; battery: number }[] = [
    { area: 'pharmacy', ox: -2, oz: 0, status: 'delivering', battery: 78 },
    { area: 'lab', ox: 1, oz: -1, status: 'working', battery: 62 },
    { area: 'nurse_station', ox: -1, oz: 1, status: 'arrived', battery: 45 },
    { area: 'corridor', ox: -5, oz: 2, status: 'working', battery: 35 },
    { area: 'corridor', ox: 4, oz: -1, status: 'working', battery: 18 },
    { area: 'charging_station', ox: 1, oz: 0, status: 'charging', battery: 92 },
    { area: 'supply_room', ox: 0, oz: 1, status: 'idle', battery: 88 },
    { area: 'corridor', ox: 8, oz: 0, status: 'fault', battery: 55 },
  ];
  return basePositions.map((bp, i) => {
    const idx = i + 1;
    const pos = makeAreaPos(bp.area, bp.ox, bp.oz);
    return {
      id: `robot_${idx}`,
      code: `RB${String(idx).padStart(3, '0')}`,
      model: ROBOT_MODEL_NAMES[i % ROBOT_MODEL_NAMES.length],
      battery: bp.battery,
      status: bp.status as Robot['status'],
      position: pos,
      targetPosition: (bp.status === 'working' || bp.status === 'delivering') as boolean
        ? makeAreaPos(
            i % 2 === 0 ? 'nurse_station' : 'lab',
            randomRange(-2, 2),
            randomRange(-1, 1)
          )
        : undefined,
      currentTaskId: (['working', 'delivering', 'arrived'] as string[]).includes(bp.status as string)
        ? `task_${idx}`
        : bp.status === 'fault'
        ? null
        : null,
      cargo: bp.status !== 'idle' && bp.status !== 'charging' && bp.status !== 'fault'
        ? createRandomCargo(i < 4 ? 'regular' : i === 4 ? 'narcotic' : 'supply')
        : null,
      totalMileage: roundTo(120 + i * 35.6 + randomRange(0, 50, 1), 1),
      totalDeliveries: 280 + i * 42 + randomRange(0, 80),
      deployDate: now.subtract(90 + i * 15, 'day').format('YYYY-MM-DD'),
      lastMaintenance: now.subtract(7 + i, 'day').format('YYYY-MM-DD'),
    };
  });
};

export const createRandomCargo = (flavor: 'regular' | 'narcotic' | 'supply' | 'sample' | 'emergency' = 'regular'): Cargo => {
  const mapping: Record<string, number> = {
    regular: 0,
    sample: 2,
    supply: 3,
    emergency: 2,
    narcotic: 5,
  };
  const group = CARGO_TYPES[mapping[flavor]];
  const isNarcotic = flavor === 'narcotic';
  return {
    barcode: `BC${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 1000)
      .toString()
      .padStart(4, '0')}`,
    type: group.type,
    name: randomChoice(group.names),
    weight: roundTo(randomRange(0.2, 4.5, 2), 2),
    isNarcotic,
    narcoticLevel: isNarcotic ? (randomChoice(['I', 'II', 'III']) as 'I' | 'II' | 'III') : undefined,
  };
};

const createRoute = (from: AreaType, to: AreaType): RoutePoint[] => {
  const start = AREAS[from].position;
  const end = AREAS[to].position;
  const points: RoutePoint[] = [];
  const midX = 0;
  const steps = 8;
  const startTime = now.valueOf();
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = start.x + (midX - start.x) * Math.min(1, t * 2) + (end.x - midX) * Math.max(0, t * 2 - 1);
    const z = start.z * (1 - Math.min(1, t * 2)) + end.z * Math.max(0, t * 2 - 1);
    const y = 0;
    const area: AreaType =
      t < 0.2 ? from : t > 0.8 ? to : 'corridor';
    points.push({
      x: roundTo(x, 2),
      y,
      z: roundTo(z, 2),
      area,
      timestamp: dayjs(startTime + i * 60_000).toISOString(),
    });
  }
  return points;
};

export const createInitialTasks = (): Task[] => {
  const templates: {
    type: TaskType;
    origin: AreaType;
    dest: AreaType;
    status: Task['status'];
    robotIdx: number;
  }[] = [
    { type: 'emergency_lab', origin: 'nurse_station', dest: 'lab', status: 'delivering', robotIdx: 0 },
    { type: 'regular_med', origin: 'pharmacy', dest: 'nurse_station', status: 'delivering', robotIdx: 1 },
    { type: 'narcotic', origin: 'pharmacy', dest: 'operating_room', status: 'delivering', robotIdx: 3 },
    { type: 'sample', origin: 'operating_room', dest: 'lab', status: 'arrived', robotIdx: 2 },
    { type: 'supply', origin: 'supply_room', dest: 'operating_room', status: 'picking', robotIdx: -1 },
    { type: 'regular_med', origin: 'pharmacy', dest: 'nurse_station', status: 'pending', robotIdx: -1 },
    { type: 'regular_med', origin: 'pharmacy', dest: 'lab', status: 'assigned', robotIdx: 5 },
    { type: 'supply', origin: 'supply_room', dest: 'nurse_station', status: 'pending', robotIdx: -1 },
    { type: 'emergency_lab', origin: 'nurse_station', dest: 'lab', status: 'pending', robotIdx: -1 },
    { type: 'confirmed', origin: 'pharmacy', dest: 'nurse_station', status: 'confirmed', robotIdx: 5 } as any,
  ];

  return templates.map((t, i) => {
    const isNarcotic = t.type === 'narcotic';
    const priority: 1 | 2 | 3 = t.type === 'emergency_lab' ? 1 : t.type === 'narcotic' ? 1 : 2;
    const route = createRoute(t.origin, t.dest);
    const createT = now.subtract(randomRange(2, 45), 'minute');
    const dueT = createT.add(randomRange(20, 60), 'minute');
    const cargo =
      t.type === 'emergency_lab'
        ? createRandomCargo('sample')
        : t.type === 'sample'
        ? createRandomCargo('sample')
        : t.type === 'narcotic'
        ? createRandomCargo('narcotic')
        : t.type === 'supply'
        ? createRandomCargo('supply')
        : createRandomCargo('regular');
    const robotId = t.robotIdx >= 0 ? `robot_${t.robotIdx + 1}` : null;
    return {
      id: `task_${i + 1}`,
      code: `TK${String(i + 1).padStart(5, '0')}`,
      type: t.type,
      priority,
      status: t.status,
      origin: t.origin,
      destination: t.dest,
      originPosition: makeAreaPos(t.origin),
      destinationPosition: makeAreaPos(t.dest),
      cargo,
      assignedRobotId: robotId,
      createTime: createT.toISOString(),
      dueTime: dueT.toISOString(),
      confirmTime: t.status === 'confirmed' ? now.subtract(randomRange(1, 5), 'minute').toISOString() : null,
      signer: t.status === 'confirmed' ? randomChoice(NURSE_NAMES) : null,
      approvals: isNarcotic
        ? [
            {
              level: 1,
              approverRole: '药师',
              approverName: randomChoice(PHARMACIST_NAMES),
              time: createT.add(1, 'minute').toISOString(),
              verified: true,
            },
          ]
        : [],
      transferHistory: [],
      currentRoute: route,
      routeProgress:
        t.status === 'delivering' ? 0.45 : t.status === 'picking' ? 0.15 : t.status === 'arrived' ? 1 : 0,
      estimatedArrival: dueT.subtract(5, 'minute').toISOString(),
      reminderCount: 0,
    };
  });
};

export const createInitialDeliveryRecords = (): DeliveryRecord[] => {
  const records: DeliveryRecord[] = [];
  for (let day = 0; day < 7; day++) {
    const dayDate = now.subtract(day, 'day');
    const count = day === 0 ? 12 : randomRange(18, 32);
    for (let i = 0; i < count; i++) {
      const origin = randomChoice(AREA_ORDER.filter((a) => a !== 'charging_station'));
      let dest = randomChoice(AREA_ORDER.filter((a) => a !== 'charging_station' && a !== origin));
      if (origin === 'pharmacy') dest = randomChoice(['nurse_station', 'operating_room', 'lab'] as AreaType[]);
      if (origin === 'supply_room') dest = randomChoice(['operating_room', 'nurse_station', 'pharmacy'] as AreaType[]);
      const startT = dayDate.hour(randomRange(7, 21)).minute(randomRange(0, 59));
      const duration = randomRange(8, 28);
      const robotIdx = randomRange(0, 7);
      const onTime = Math.random() > 0.12;
      records.push({
        id: generateId('DR'),
        taskId: generateId('T'),
        taskCode: `TK${String(day * 100 + i).padStart(5, '0')}`,
        robotId: `robot_${robotIdx + 1}`,
        robotCode: `RB${String(robotIdx + 1).padStart(3, '0')}`,
        origin,
        destination: dest,
        cargoName: randomChoice([
          '口服药包',
          '注射剂组',
          '检验标本',
          '手术器械包',
          '消毒耗材',
          '生理盐水',
          '抗生素组',
        ]),
        route: createRoute(origin, dest),
        startTime: startT.toISOString(),
        endTime: startT.add(duration, 'minute').toISOString(),
        durationMinutes: duration,
        onTime,
        signer: randomChoice(NURSE_NAMES),
        isNarcotic: Math.random() < 0.05,
      });
    }
  }
  return records.sort((a, b) => b.startTime.localeCompare(a.startTime));
};

export const createInitialFaultOrders = (): FaultOrder[] => {
  const faultCodes = Object.keys(FAULT_CODE_MAP);
  return [
    {
      id: generateId('FO'),
      robotId: 'robot_8',
      robotCode: 'RB008',
      faultCode: 'E003',
      faultLevel: 'critical',
      description: '激光雷达传感器信号异常，无法正常导航，请立即现场排查',
      status: 'assigned',
      assignedEngineer: ENGINEER_NAMES[0],
      createTime: now.subtract(8, 'minute').toISOString(),
      resolveTime: null,
      position: makeAreaPos('corridor', 8, 0),
      affectedTaskIds: [],
    },
    {
      id: generateId('FO'),
      robotId: 'robot_5',
      robotCode: 'RB005',
      faultCode: 'E002',
      faultLevel: 'major',
      description: '电池电压异常偏低，已触发低电量保护，正在返航充电',
      status: 'pending',
      assignedEngineer: null,
      createTime: now.subtract(2, 'minute').toISOString(),
      resolveTime: null,
      position: makeAreaPos('corridor', 4, -1),
      affectedTaskIds: ['task_4'],
    },
    {
      id: generateId('FO'),
      robotId: 'robot_3',
      robotCode: 'RB003',
      faultCode: 'E007',
      faultLevel: 'minor',
      description: '货箱红外检测偶发异常，已远程重启传感器，待观察',
      status: 'resolved',
      assignedEngineer: ENGINEER_NAMES[1],
      createTime: now.subtract(3, 'hour').toISOString(),
      resolveTime: now.subtract(1.5, 'hour').toISOString(),
      position: makeAreaPos('nurse_station', -1, 1),
      affectedTaskIds: [],
    },
    {
      id: generateId('FO'),
      robotId: 'robot_1',
      robotCode: 'RB001',
      faultCode: 'E006',
      faultLevel: 'minor',
      description: '路径规划遇障碍物绕行超次，已更新区域地图',
      status: 'resolved',
      assignedEngineer: ENGINEER_NAMES[2],
      createTime: now.subtract(1, 'day').add(5, 'hour').toISOString(),
      resolveTime: now.subtract(1, 'day').add(6, 'hour').toISOString(),
      position: makeAreaPos('corridor', -3, 0),
      affectedTaskIds: [],
    },
  ];
};

export const createInitialEngineers = (): Engineer[] => {
  const statuses: Engineer['status'][] = ['busy', 'idle', 'idle'];
  return ENGINEER_NAMES.slice(0, 3).map((name, i) => ({
    id: `eng_${i + 1}`,
    name,
    phone: `138${String(10000000 + i * 13579).slice(0, 8)}`,
    status: statuses[i],
    position: makeAreaPos(
      i === 0 ? 'corridor' : i === 1 ? 'charging_station' : 'pharmacy',
      randomRange(-3, 3),
      randomRange(-2, 2)
    ),
    skills: [
      ['机械维修', '驱动系统', '电池维护'],
      ['电子维修', '传感器校准', '软件升级'],
      ['综合维修', '激光雷达', '路径规划'],
    ][i],
    currentOrderId: i === 0 ? 'fault_assigned_0' : null,
  }));
};

export const createInitialDailyReport = (): DailyReport => {
  const robotCodes = Array.from({ length: 8 }, (_, i) => `RB${String(i + 1).padStart(3, '0')}`);
  const faultTypes = [
    { type: '传感器异常', count: 3 },
    { type: '电池问题', count: 2 },
    { type: '路径规划', count: 1 },
    { type: '机械故障', count: 1 },
    { type: '网络中断', count: 1 },
  ];
  const peakHours = Array.from({ length: 24 }, (_, h) => ({
    hour: h,
    count: h >= 8 && h <= 11 ? randomRange(10, 18) : h >= 14 && h <= 17 ? randomRange(8, 15) : randomRange(0, 6),
  }));
  const areaNames = ['中心药房', '检验科', '手术室', '护士站', '供应室'];
  const areaDist = areaNames.map((a) => ({ area: a, count: randomRange(20, 55) }));

  let totalDeliveries = 0;
  let totalOnTime = 0;
  let totalTime = 0;
  let totalBattery = 0;

  const robots = robotCodes.map((code) => {
    const dc = randomRange(22, 48);
    const otr = roundTo(randomRange(86, 99, 1), 1);
    const adt = roundTo(randomRange(10, 22, 1), 1);
    const bc = roundTo(randomRange(120, 280, 1), 0);
    const cc = randomRange(2, 4);
    const fc = randomRange(0, 2);
    const tm = roundTo(dc * randomRange(0.12, 0.28, 2), 1);
    totalDeliveries += dc;
    totalOnTime += Math.round(dc * (otr / 100));
    totalTime += dc * adt;
    totalBattery += bc;
    return {
      robotCode: code,
      deliveryCount: dc,
      onTimeRate: otr,
      avgDeliveryTime: adt,
      batteryConsumption: bc,
      chargeCount: cc,
      faultCount: fc,
      totalMileage: tm,
    };
  });

  return {
    date: now.format('YYYY-MM-DD'),
    robots,
    totalDeliveries,
    overallOnTimeRate: roundTo((totalOnTime / totalDeliveries) * 100, 1),
    avgDeliveryTime: roundTo(totalTime / totalDeliveries, 1),
    totalBatteryConsumption: totalBattery,
    faultDistribution: faultTypes,
    peakHours,
    areaDistribution: areaDist,
  };
};

export const createInitialLogs = (): LogEntry[] => {
  const list: Omit<LogEntry, 'id' | 'timestamp'>[] = [
    { type: 'system', level: 'info', message: '调度系统启动完成，连接机器人8台' },
    { type: 'task', level: 'success', message: '任务 TK00008 已由 RB006 签收完成' },
    { type: 'task', level: 'warning', message: '任务 TK00007 到达护士站超过10分钟未签收，已催办' },
    { type: 'fault', level: 'error', message: 'RB008 激光雷达故障 E003，已派单给 ' + ENGINEER_NAMES[0], relatedId: 'robot_8' },
    { type: 'robot', level: 'warning', message: 'RB005 电量低于20%，正在返航充电，任务TK00004转移至RB007', relatedId: 'robot_5' },
    { type: 'robot', level: 'info', message: 'RB001 进入主走廊，检测到前方RB004，已计算避让路径' },
    { type: 'task', level: 'info', message: '新急诊检验任务 TK00009 创建，优先分配中' },
    { type: 'task', level: 'success', message: '毒麻药品任务 TK00003 一级审批通过（药师黄建国）' },
    { type: 'system', level: 'success', message: '与检验科LIS系统数据同步成功' },
    { type: 'fault', level: 'warning', message: 'RB003 货箱检测传感器 E007 轻微告警，已远程复位', relatedId: 'robot_3' },
  ];
  return list.map((item, i) => ({
    ...item,
    id: generateId('LOG'),
    timestamp: now.subtract(i * randomRange(1, 6), 'minute').toISOString(),
  }));
};
