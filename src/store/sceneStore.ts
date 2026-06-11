import { create } from 'zustand';

export type ViewMode = 'overview' | 'follow' | 'first_person';
export type FloorLevel = 1;

interface SceneState {
  viewMode: ViewMode;
  followRobotId: string | null;
  floorLevel: FloorLevel;
  showPaths: boolean;
  showLabels: boolean;
  showGrid: boolean;
  showAreas: boolean;
  autoRotate: boolean;
  bloomIntensity: number;

  setViewMode: (mode: ViewMode) => void;
  setFollowRobot: (id: string | null) => void;
  setFloorLevel: (level: FloorLevel) => void;
  togglePaths: () => void;
  toggleLabels: () => void;
  toggleGrid: () => void;
  toggleAreas: () => void;
  toggleAutoRotate: () => void;
  setBloomIntensity: (v: number) => void;
}

export const useSceneStore = create<SceneState>((set) => ({
  viewMode: 'overview',
  followRobotId: null,
  floorLevel: 1,
  showPaths: true,
  showLabels: true,
  showGrid: true,
  showAreas: true,
  autoRotate: false,
  bloomIntensity: 0.8,

  setViewMode: (mode) => set({ viewMode: mode }),
  setFollowRobot: (id) => set({ followRobotId: id, viewMode: id ? 'follow' : 'overview' }),
  setFloorLevel: (level) => set({ floorLevel: level }),
  togglePaths: () => set((s) => ({ showPaths: !s.showPaths })),
  toggleLabels: () => set((s) => ({ showLabels: !s.showLabels })),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleAreas: () => set((s) => ({ showAreas: !s.showAreas })),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
  setBloomIntensity: (v) => set({ bloomIntensity: v }),
}));
