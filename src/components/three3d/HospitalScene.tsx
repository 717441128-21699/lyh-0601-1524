import { useRef, useEffect, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, Effects, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import * as THREE from 'three';
import { AllAreas, FloorGrid } from './AreaZone';
import { RobotModel } from './RobotModel';
import { PathLine } from './PathLine';
import { useDispatchStore } from '@/store/dispatchStore';
import { useSceneStore } from '@/store/sceneStore';
import type { Robot } from '@/types';

function CameraRig() {
  const { camera } = useThree();
  const { viewMode, followRobotId, autoRotate } = useSceneStore();
  const { robots } = useDispatchStore();
  const controlsRef = useRef<any>(null);
  const targetPos = useRef(new THREE.Vector3());
  const targetLook = useRef(new THREE.Vector3());

  useEffect(() => {
    if (viewMode === 'overview') {
      targetPos.current.set(0, 32, 28);
      targetLook.current.set(0, 0, 0);
    } else if (viewMode === 'follow' && followRobotId) {
      const r = robots.find((x) => x.id === followRobotId);
      if (r) {
        targetPos.current.set(r.position.x + 5, 8, r.position.z + 5);
        targetLook.current.set(r.position.x, 0.5, r.position.z);
      }
    }
  }, [viewMode, followRobotId, robots]);

  useFrame((_, delta) => {
    if (viewMode === 'follow' && followRobotId) {
      const r = robots.find((x) => x.id === followRobotId);
      if (r) {
        targetLook.current.set(r.position.x, 0.5, r.position.z);
        targetPos.current.lerp(
          new THREE.Vector3(r.position.x + 5, 8, r.position.z + 5),
          delta * 2
        );
      }
    }

    if (autoRotate && controlsRef.current) {
      controlsRef.current.autoRotate = true;
      controlsRef.current.autoRotateSpeed = 0.4;
    } else if (controlsRef.current) {
      controlsRef.current.autoRotate = false;
    }

    camera.position.lerp(targetPos.current, delta * 1.8);
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLook.current, delta * 1.8);
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.08}
      minDistance={6}
      maxDistance={60}
      maxPolarAngle={Math.PI / 2.2}
      minPolarAngle={Math.PI / 8}
      makeDefault
    />
  );
}

function SceneContent() {
  const { robots, tasks, selectedRobotId, setSelectedRobot } = useDispatchStore();
  const { showPaths, showGrid, showAreas } = useSceneStore();

  const activeTasks = useMemo(
    () => tasks.filter((t) =>
      ['assigned', 'picking', 'delivering', 'arrived'].includes(t.status) &&
      t.currentRoute && t.currentRoute.length > 1
    ),
    [tasks]
  );

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 32, 28]} fov={45} />
      <CameraRig />

      <ambientLight intensity={0.35} color="#94a3b8" />
      <directionalLight
        position={[15, 28, 18]}
        intensity={0.85}
        color="#ffffff"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-40}
        shadow-camera-right={40}
        shadow-camera-top={40}
        shadow-camera-bottom={-40}
        shadow-camera-near={0.5}
        shadow-camera-far={100}
      />
      <directionalLight position={[-12, 20, -15]} intensity={0.3} color="#64748b" />
      <hemisphereLight args={['#475569', '#0f172a', 0.4]} />

      {showGrid && <FloorGrid />}
      {showAreas && <AllAreas />}

      {showPaths &&
        activeTasks.map((task) => (
          <PathLine
            key={task.id}
            points={task.currentRoute}
            progress={task.routeProgress}
            color={task.cargo.isNarcotic ? '#EF4444' : '#10B981'}
            isLocked={task.cargo.isNarcotic}
            opacity={task.type === 'emergency_lab' ? 1 : 0.85}
          />
        ))}

      {robots.map((robot) => (
        <RobotModel
          key={robot.id}
          robot={robot as Robot}
          selected={selectedRobotId === robot.id}
          onClick={(r) => setSelectedRobot(selectedRobotId === r.id ? null : r.id)}
        />
      ))}

      <fog attach="fog" args={['#0a0f1c', 35, 85]} />

      <Effects>
        <EffectComposer multisampling={0}>
          <Bloom
            intensity={0.85}
            luminanceThreshold={0.25}
            luminanceSmoothing={0.9}
            mipmapBlur
          />
          <Vignette eskil={false} offset={0.2} darkness={0.55} />
        </EffectComposer>
      </Effects>
    </>
  );
}

export function HospitalScene() {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      onCreated={({ gl, scene }) => {
        gl.setClearColor('#0a0f1c');
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.outputColorSpace = THREE.SRGBColorSpace;
        scene.background = new THREE.Color('#0a0f1c');
      }}
      style={{ width: '100%', height: '100%' }}
    >
      <SceneContent />
    </Canvas>
  );
}
