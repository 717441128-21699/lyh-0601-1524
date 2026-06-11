import { create } from 'zustand';
import type { Robot, Task, DeliveryRecord, FaultOrder, Engineer, DailyReport, LogEntry, CollisionEvent, Position } from '@/types';
import {
  createInitialRobots,
  createInitialTasks,
  createInitialDeliveryRecords,
  createInitialFaultOrders,
  createInitialEngineers,
  createInitialDailyReport,
  createInitialLogs,
} from '@/utils/mock';
import { AREAS, LOW_BATTERY_THRESHOLD, TASK_TIMEOUT_MINUTES, COLLISION_DISTANCE_THRESHOLD } from '@/utils/constants';
import { euclideanDistance, generateId, randomChoice, randomRange } from '@/utils/format';
import dayjs from 'dayjs';

interface DispatchState {
  robots: Robot[];
  tasks: Task[];
  deliveryRecords: DeliveryRecord[];
  faultOrders: FaultOrder[];
  engineers: Engineer[];
  dailyReport: DailyReport;
  logs: LogEntry[];
  collisions: CollisionEvent[];
  selectedRobotId: string | null;
  selectedTaskId: string | null;
  isSimulating: boolean;
  simulationSpeed: number;
  lastTick: number;

  setSelectedRobot: (id: string | null) => void;
  setSelectedTask: (id: string | null) => void;
  toggleSimulation: () => void;
  setSimulationSpeed: (speed: number) => void;

  tick: (deltaMs: number) => void;
  assignBestRobot: (taskId: string) => string | null;
  confirmTask: (taskId: string, signer: string) => void;
  transferTask: (taskId: string, reason: 'low_battery' | 'fault') => void;
  approveNarcotic: (taskId: string, level: 1 | 2 | 3, approverRole: string, approverName: string) => void;
  resolveFault: (orderId: string, engineer: string) => void;
  addLog: (entry: Omit<LogEntry, 'id' | 'timestamp'>) => void;
  markTaskArrivedTimeout: () => void;
}

export const useDispatchStore = create<DispatchState>((set, get) => ({
  robots: createInitialRobots(),
  tasks: createInitialTasks(),
  deliveryRecords: createInitialDeliveryRecords(),
  faultOrders: createInitialFaultOrders(),
  engineers: createInitialEngineers(),
  dailyReport: createInitialDailyReport(),
  logs: createInitialLogs(),
  collisions: [],
  selectedRobotId: null,
  selectedTaskId: null,
  isSimulating: true,
  simulationSpeed: 1,
  lastTick: Date.now(),

  setSelectedRobot: (id) => set({ selectedRobotId: id }),
  setSelectedTask: (id) => set({ selectedTaskId: id }),
  toggleSimulation: () => set((s) => ({ isSimulating: !s.isSimulating })),
  setSimulationSpeed: (speed) => set({ simulationSpeed: speed }),

  assignBestRobot: (taskId) => {
    const { tasks, robots, addLog } = get();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return null;
    const candidates = robots.filter(
      (r) =>
        r.status === 'idle' &&
        r.battery >= LOW_BATTERY_THRESHOLD &&
        (!r.cargo || r.cargo.weight + task.cargo.weight <= 50)
    );
    if (candidates.length === 0) return null;
    const scored = candidates.map((r) => {
      const dist = euclideanDistance(r.position, task.originPosition);
      const maxDist = 80;
      const distScore = 1 - Math.min(dist / maxDist, 1);
      const batteryScore = r.battery / 100;
      const priorityBonus = task.priority === 1 ? 0.2 : task.priority === 2 ? 0.08 : 0;
      return { robot: r, score: distScore * 0.5 + batteryScore * 0.35 + 0.15 + priorityBonus };
    });
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0].robot;
    set((s) => ({
      robots: s.robots.map((r) =>
        r.id === best.id ? { ...r, status: 'working', currentTaskId: taskId, cargo: task.cargo } : r
      ),
      tasks: s.tasks.map((t) =>
        t.id === taskId
          ? { ...t, status: 'assigned', assignedRobotId: best.id, estimatedArrival: dayjs().add(25, 'minute').toISOString() }
          : t
      ),
    }));
    addLog({
      type: 'task',
      level: 'info',
      message: `任务 ${task.code} 已分配给 ${best.code}（综合评分 ${scored[0].score.toFixed(2)}）`,
      relatedId: taskId,
    });
    return best.id;
  },

  confirmTask: (taskId, signer) => {
    const { tasks, robots, deliveryRecords, addLog } = get();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const now = dayjs().toISOString();
    if (task.assignedRobotId) {
      const robot = robots.find((r) => r.id === task.assignedRobotId);
      if (robot) {
        const duration = dayjs().diff(dayjs(task.createTime), 'minute');
        const onTime = dayjs(task.dueTime).isAfter(dayjs());
        deliveryRecords.unshift({
          id: generateId('DR'),
          taskId,
          taskCode: task.code,
          robotId: robot.id,
          robotCode: robot.code,
          origin: task.origin,
          destination: task.destination,
          cargoName: task.cargo.name,
          route: task.currentRoute,
          startTime: task.createTime,
          endTime: now,
          durationMinutes: duration,
          onTime,
          signer,
          isNarcotic: task.cargo.isNarcotic,
        });
      }
    }
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId ? { ...t, status: 'confirmed', confirmTime: now, signer } : t
      ),
      robots: s.robots.map((r) =>
        r.id === task.assignedRobotId ? { ...r, status: 'idle', currentTaskId: null, cargo: null } : r
      ),
      deliveryRecords: [...deliveryRecords],
    }));
    addLog({
      type: 'task',
      level: 'success',
      message: `任务 ${task.code} 已由 ${signer} 签收完成`,
      relatedId: taskId,
    });
  },

  transferTask: (taskId, reason) => {
    const { tasks, robots, assignBestRobot, addLog } = get();
    const task = tasks.find((t) => t.id === taskId);
    if (!task || !task.assignedRobotId) return;
    const fromRobot = robots.find((r) => r.id === task.assignedRobotId);
    addLog({
      type: 'task',
      level: 'warning',
      message: `${fromRobot?.code ?? '机器人'} 因${reason === 'low_battery' ? '低电量' : '故障'}，任务 ${task.code} 正在转派`,
      relatedId: taskId,
    });
    set((s) => ({
      robots: s.robots.map((r) =>
        r.id === task.assignedRobotId
          ? {
              ...r,
              status: reason === 'low_battery' ? 'returning' : 'fault',
              currentTaskId: null,
              cargo: null,
              targetPosition:
                reason === 'low_battery' ? AREAS.charging_station.position : undefined,
            }
          : r
      ),
      tasks: s.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: 'transferred',
              transferHistory: [
                ...t.transferHistory,
                {
                  fromRobotId: task.assignedRobotId!,
                  toRobotId: '',
                  reason,
                  time: dayjs().toISOString(),
                },
              ],
              assignedRobotId: null,
            }
          : t
      ),
    }));
    setTimeout(() => {
      const newId = get().assignBestRobot(taskId);
      if (newId) {
        const toRobot = get().robots.find((r) => r.id === newId);
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  transferHistory: t.transferHistory.map((th, idx) =>
                    idx === t.transferHistory.length - 1 ? { ...th, toRobotId: newId } : th
                  ),
                }
              : t
          ),
        }));
        get().addLog({
          type: 'task',
          level: 'info',
          message: `任务 ${task.code} 已转派给 ${toRobot?.code}`,
          relatedId: taskId,
        });
      }
    }, 1500);
  },

  approveNarcotic: (taskId, level, approverRole, approverName) => {
    const { tasks, addLog } = get();
    set((s) => ({
      tasks: s.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              approvals: [
                ...t.approvals.filter((a) => a.level !== level),
                { level, approverRole, approverName, time: dayjs().toISOString(), verified: true },
              ],
            }
          : t
      ),
    }));
    addLog({
      type: 'task',
      level: 'success',
      message: `毒麻药品任务 ${tasks.find((t) => t.id === taskId)?.code} 第${level}级审批通过（${approverName}）`,
      relatedId: taskId,
    });
  },

  resolveFault: (orderId, engineer) => {
    const { faultOrders, robots, addLog } = get();
    const order = faultOrders.find((f) => f.id === orderId);
    if (!order) return;
    set((s) => ({
      faultOrders: s.faultOrders.map((f) =>
        f.id === orderId ? { ...f, status: 'resolved', resolveTime: dayjs().toISOString() } : f
      ),
      robots: s.robots.map((r) =>
        r.id === order.robotId ? { ...r, status: 'idle', battery: Math.max(r.battery, 40) } : r
      ),
    }));
    addLog({
      type: 'fault',
      level: 'success',
      message: `${order.robotCode} 故障 ${order.faultCode} 已由 ${engineer} 修复完成`,
      relatedId: order.robotId,
    });
  },

  addLog: (entry) => {
    set((s) => ({
      logs: [
        { ...entry, id: generateId('LOG'), timestamp: dayjs().toISOString() },
        ...s.logs,
      ].slice(0, 100),
    }));
  },

  markTaskArrivedTimeout: () => {
    const { tasks, addLog } = get();
    const now = dayjs();
    const timeoutIds: string[] = [];
    tasks.forEach((t) => {
      if (t.status === 'arrived') {
        const arrivedTime = t.estimatedArrival ? dayjs(t.estimatedArrival) : now;
        if (now.diff(arrivedTime, 'minute') >= TASK_TIMEOUT_MINUTES && t.reminderCount < 3) {
          timeoutIds.push(t.id);
        }
      }
    });
    if (timeoutIds.length > 0) {
      set((s) => ({
        tasks: s.tasks.map((t) =>
          timeoutIds.includes(t.id)
            ? {
                ...t,
                reminderCount: t.reminderCount + 1,
                status: t.reminderCount >= 2 ? 'timeout' : t.status,
              }
            : t
        ),
      }));
      timeoutIds.forEach((id) => {
        const t = tasks.find((x) => x.id === id);
        if (t) {
          addLog({
            type: 'task',
            level: 'warning',
            message: `任务 ${t.code} 到达后超时未签收，已第${t.reminderCount + 1}次催办`,
            relatedId: id,
          });
          if (t.reminderCount >= 2) {
            get().transferTask(id, 'low_battery');
          }
        }
      });
    }
  },

  tick: (deltaMs) => {
    const state = get();
    if (!state.isSimulating) return;
    const speed = state.simulationSpeed;
    const delta = (deltaMs / 1000) * speed;

    set((s) => {
      const newRobots = [...s.robots];
      const newTasks = [...s.tasks];
      const newCollisions: CollisionEvent[] = [];

      newRobots.forEach((r, idx) => {
        const rs = r.status as string;
        if (rs === 'working' || rs === 'returning' || rs === 'delivering' || rs === 'picking') {
          const target =
            rs === 'returning' ? AREAS.charging_station.position : r.targetPosition;
          if (target) {
            const dx = target.x - r.position.x;
            const dz = target.z - r.position.z;
            const dist = Math.sqrt(dx * dx + dz * dz);
            const step = 2.5 * delta;
            if (dist > 0.3) {
              const ratio = Math.min(step / dist, 1);
              newRobots[idx] = {
                ...r,
                position: {
                  ...r.position,
                  x: r.position.x + dx * ratio,
                  z: r.position.z + dz * ratio,
                  area: r.position.area,
                },
                battery: Math.max(0, r.battery - delta * 0.15),
              };
            } else {
              if (rs === 'returning') {
                newRobots[idx] = { ...r, status: 'charging', position: { ...AREAS.charging_station.position, area: 'charging_station' as const } };
              } else {
                newRobots[idx] = { ...r, battery: Math.max(0, r.battery - delta * 0.05) };
              }
            }
          } else {
            newRobots[idx] = { ...r, battery: Math.max(0, r.battery - delta * 0.05) };
          }
        } else if (rs === 'charging') {
          newRobots[idx] = {
            ...r,
            battery: Math.min(100, r.battery + delta * 1.2),
          };
          if (newRobots[idx].battery >= 99) {
            newRobots[idx] = { ...newRobots[idx], status: 'idle' };
          }
        }
      });

      newTasks.forEach((t, idx) => {
        const ts = t.status as string;
        if ((ts === 'assigned' || ts === 'delivering' || ts === 'picking') && t.assignedRobotId) {
          const progress = Math.min(1, t.routeProgress + delta * 0.008);
          let status: Task['status'] = t.status;
          if (progress >= 0.2 && ts === 'assigned') status = 'picking';
          if (progress >= 0.5 && (ts === 'assigned' || ts === 'picking' || status === 'picking')) status = 'delivering';
          if (progress >= 0.99 && (ts === 'delivering' || ts === 'picking' || status === 'delivering')) status = 'arrived';
          newTasks[idx] = { ...t, routeProgress: progress, status };
          const rIdx = newRobots.findIndex((r) => r.id === t.assignedRobotId);
          const route = t.currentRoute;
          if (rIdx >= 0 && route && route.length >= 2) {
            const maxIdx = route.length - 1;
            const pIdx = Math.min(Math.floor(progress * maxIdx), Math.max(0, maxIdx - 1));
            const safePIdx = Math.max(0, pIdx);
            const nextIdx = Math.min(safePIdx + 1, maxIdx);
            const stepSpan = Math.max(1, maxIdx);
            const localT = Math.max(0, Math.min(1, progress * stepSpan - safePIdx));
            const a = route[safePIdx];
            const b = route[nextIdx];
            if (a && b) {
              const nx = a.x + (b.x - a.x) * localT;
              const nz = a.z + (b.z - a.z) * localT;
              newRobots[rIdx] = {
                ...newRobots[rIdx],
                position: { ...newRobots[rIdx].position, x: nx, z: nz, area: localT < 0.5 ? a.area : b.area },
              };
            }
            if ((status as string) === 'delivering') {
              newRobots[rIdx] = { ...newRobots[rIdx], status: 'delivering' };
            }
          }
        }
      });

      for (let i = 0; i < newRobots.length; i++) {
        for (let j = i + 1; j < newRobots.length; j++) {
          const a = newRobots[i];
          const b = newRobots[j];
          const d = euclideanDistance(a.position, b.position);
          const aS = a.status as string;
          const bS = b.status as string;
          if (d < COLLISION_DISTANCE_THRESHOLD && ['working', 'delivering', 'picking'].includes(aS) && ['working', 'delivering', 'picking'].includes(bS)) {
            newCollisions.push({
              robotAId: a.id,
              robotBId: b.id,
              position: { x: (a.position.x + b.position.x) / 2, y: 0, z: (a.position.z + b.position.z) / 2, area: 'corridor' },
              time: new Date().toISOString(),
              resolved: false,
              resolution: Math.random() > 0.4 ? 'detour' : 'wait',
              waitingRobotId: Math.random() > 0.5 ? a.id : b.id,
            });
            newRobots[i] = { ...a, status: 'avoiding' };
            newRobots[j] = { ...b, status: 'avoiding' };
          }
        }
      }

      newRobots.forEach((r, idx) => {
        const rs = r.status as string;
        if (rs !== 'charging' && rs !== 'fault' && r.battery < LOW_BATTERY_THRESHOLD && r.currentTaskId) {
          setTimeout(() => get().transferTask(r.currentTaskId!, 'low_battery'), 0);
        }
      });

      return {
        robots: newRobots,
        tasks: newTasks,
        collisions: newCollisions.length > 0 ? [...s.collisions, ...newCollisions].slice(-20) : s.collisions,
        lastTick: Date.now(),
      };
    });
  },
}));
