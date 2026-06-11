import { useEffect, useRef } from 'react';
import { useDispatchStore } from '@/store/dispatchStore';

export function useSimulation() {
  const { isSimulating, tick, assignBestRobot, tasks, markTaskArrivedTimeout, addLog } =
    useDispatchStore();
  const lastTimeRef = useRef<number>(performance.now());
  const assignCheckRef = useRef<number>(0);
  const timeoutCheckRef = useRef<number>(0);

  useEffect(() => {
    let raf = 0;
    let lastFrame = performance.now();

    const loop = (now: number) => {
      const delta = now - lastFrame;
      lastFrame = now;

      if (isSimulating && delta < 200) {
        tick(delta);

        assignCheckRef.current += delta;
        if (assignCheckRef.current > 2500) {
          const pendingIds = tasks
            .filter((t) => t.status === 'pending' && !t.assignedRobotId)
            .map((t) => t.id);
          pendingIds.slice(0, 2).forEach((tid) => {
            try {
              assignBestRobot(tid);
            } catch {}
          });
          assignCheckRef.current = 0;
        }

        timeoutCheckRef.current += delta;
        if (timeoutCheckRef.current > 8000) {
          markTaskArrivedTimeout();
          timeoutCheckRef.current = 0;
        }
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [isSimulating, tick, assignBestRobot, tasks, markTaskArrivedTimeout, addLog]);

  return null;
}
