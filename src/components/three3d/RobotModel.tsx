import { useRef, useMemo, useState } from 'react';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import { Html, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import type { Robot } from '@/types';
import { getRobotStatusDotColor, getBatteryColor } from '@/utils/format';
import { LOW_BATTERY_THRESHOLD } from '@/utils/constants';

interface RobotModelProps {
  robot: Robot;
  selected?: boolean;
  onClick?: (robot: Robot) => void;
}

export function RobotModel({ robot, selected = false, onClick }: RobotModelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const lidarRef = useRef<THREE.Group>(null);
  const hoverRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);

  const statusColor = useMemo(
    () => new THREE.Color(getRobotStatusDotColor(robot.status)),
    [robot.status]
  );
  const batteryColor = useMemo(
    () => new THREE.Color(getBatteryColor(robot.battery)),
    [robot.battery]
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) {
      const floatOffset = Math.sin(t * 2 + robot.id.charCodeAt(0)) * 0.02;
      groupRef.current.position.y = robot.position.y + 0.15 + floatOffset;
      groupRef.current.position.x = robot.position.x;
      groupRef.current.position.z = robot.position.z;

      if (robot.targetPosition && (robot.status === 'working' || robot.status === 'delivering' || robot.status === 'returning')) {
        const dx = robot.targetPosition.x - robot.position.x;
        const dz = robot.targetPosition.z - robot.position.z;
        if (Math.abs(dx) > 0.1 || Math.abs(dz) > 0.1) {
          const targetRot = Math.atan2(dx, dz);
          let curRot = groupRef.current.rotation.y;
          let diff = targetRot - curRot;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          groupRef.current.rotation.y = curRot + diff * 0.08;
        }
      }
    }

    if (ringRef.current) {
      const scale = 1 + Math.sin(t * 3) * 0.08;
      ringRef.current.scale.set(scale, 1, scale);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      if (mat) {
        mat.opacity = 0.35 + Math.sin(t * 3) * 0.2;
      }
    }

    if (lidarRef.current) {
      lidarRef.current.rotation.y = t * 4;
    }
  });

  const isFault = robot.status === 'fault';
  const isLowBattery = robot.battery < LOW_BATTERY_THRESHOLD;
  const isCharging = robot.status === 'charging';

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    onClick?.(robot);
  };

  return (
    <group
      ref={groupRef}
      position={[robot.position.x, 0.15, robot.position.z]}
      onClick={handleClick}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'default';
      }}
    >
      <mesh ref={ringRef} position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.75, 0.95, 48]} />
        <meshBasicMaterial
          color={statusColor}
          transparent
          opacity={0.45}
          side={THREE.DoubleSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {(selected || hovered) && (
        <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.05, 1.25, 48]} />
          <meshBasicMaterial
            color="#0EA5E9"
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      <mesh position={[0, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.55, 0.6, 0.28, 32]} />
        <meshStandardMaterial
          color={isFault ? '#7f1d1d' : '#e2e8f0'}
          metalness={0.75}
          roughness={0.25}
          emissive={isFault ? '#991b1b' : '#0f172a'}
          emissiveIntensity={isFault ? 0.6 : 0.1}
        />
      </mesh>

      <mesh position={[0, 0.32, 0]} castShadow>
        <boxGeometry args={[0.85, 0.42, 0.65]} />
        <meshStandardMaterial
          color={isFault ? '#b91c1c' : '#f8fafc'}
          metalness={0.6}
          roughness={0.3}
          emissive={isFault ? '#dc2626' : '#000000'}
          emissiveIntensity={isFault ? 0.5 + Math.sin(Date.now() * 0.01) * 0.4 : 0}
        />
      </mesh>

      <mesh position={[0, 0.56, 0]} castShadow>
        <cylinderGeometry args={[0.38, 0.45, 0.18, 24]} />
        <meshStandardMaterial
          color={isFault ? '#450a0a' : '#1e293b'}
          metalness={0.85}
          roughness={0.18}
        />
      </mesh>

      <group ref={lidarRef} position={[0, 0.72, 0]}>
        <mesh castShadow>
          <cylinderGeometry args={[0.18, 0.2, 0.12, 20]} />
          <meshStandardMaterial
            color="#334155"
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
        <mesh rotation={[0, 0, 0]}>
          <boxGeometry args={[0.5, 0.015, 0.015]} />
          <meshBasicMaterial
            color={statusColor}
            transparent
            opacity={0.75}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      </group>

      <mesh position={[0, 0.08, 0]}>
        <torusGeometry args={[0.57, 0.025, 12, 32]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={0.9}
          metalness={0.3}
          roughness={0.4}
        />
      </mesh>

      {isLowBattery && !isCharging && (
        <mesh position={[0, 1.05, 0]}>
          <cylinderGeometry args={[0.04, 0.04, 0.001, 16]} />
          <meshBasicMaterial
            color="#F59E0B"
            transparent
            opacity={0.6 + Math.sin(Date.now() * 0.008) * 0.4}
          />
        </mesh>
      )}

      <group position={[0, 0.35, 0]}>
        <mesh position={[-0.32, 0, 0]}>
          <planeGeometry args={[0.15, 0.08]} />
          <meshBasicMaterial color={batteryColor} transparent opacity={0.95} />
        </mesh>
        <mesh position={[-0.2, 0, 0.001]}>
          <planeGeometry args={[robot.battery * 0.008, 0.05]} />
          <meshBasicMaterial color={batteryColor} />
        </mesh>
      </group>

      {isCharging && (
        <group position={[0, 1.1, 0]}>
          <mesh>
            <cylinderGeometry args={[0.06, 0.06, 0.06, 8]} />
            <meshBasicMaterial
              color="#10B981"
              transparent
              opacity={0.8 + Math.sin(Date.now() * 0.01) * 0.2}
            />
          </mesh>
        </group>
      )}

      {robot.cargo && (
        <mesh position={[0, 0.33, 0.36]}>
          <boxGeometry args={[0.45, 0.22, 0.22]} />
          <meshStandardMaterial
            color={robot.cargo.isNarcotic ? '#7c3aed' : '#0891b2'}
            metalness={0.5}
            roughness={0.4}
            emissive={robot.cargo.isNarcotic ? '#6d28d9' : '#0e7490'}
            emissiveIntensity={robot.cargo.isNarcotic ? 0.35 : 0.2}
            transparent
            opacity={0.9}
          />
        </mesh>
      )}

      {(hovered || selected) && (
        <Billboard position={[0, 1.55, 0]}>
          <Html
            center
            distanceFactor={6}
            zIndexRange={[50, 0]}
            ref={hoverRef as any}
            style={{ pointerEvents: 'none', minWidth: '160px' }}
          >
            <div
              className="rounded-xl px-3 py-2.5 backdrop-blur-xl shadow-2xl border text-xs"
              style={{
                background: 'rgba(15, 23, 42, 0.92)',
                borderColor: selected ? 'rgba(14, 165, 233, 0.6)' : 'rgba(255, 255, 255, 0.12)',
                boxShadow: selected
                  ? '0 8px 32px rgba(14, 165, 233, 0.35)'
                  : '0 8px 32px rgba(0,0,0,0.5)',
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className="font-bold text-white font-mono text-sm"
                  style={{ fontFamily: 'JetBrains Mono, monospace' }}
                >
                  {robot.code}
                </span>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`w-2 h-2 rounded-full ${isFault ? 'animate-ping' : ''}`}
                    style={{ backgroundColor: getRobotStatusDotColor(robot.status) }}
                  />
                  <span className="text-[10px] text-slate-400">
                    {robot.status === 'working' || robot.status === 'delivering'
                      ? '运行中'
                      : robot.status === 'charging'
                      ? '充电中'
                      : robot.status === 'idle'
                      ? '待命'
                      : robot.status === 'fault'
                      ? '故障'
                      : robot.status === 'returning'
                      ? '返航'
                      : '避让'}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">电量</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 rounded-full bg-slate-700 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${robot.battery}%`,
                          backgroundColor: getBatteryColor(robot.battery),
                        }}
                      />
                    </div>
                    <span
                      className="font-mono text-[10px]"
                      style={{ color: getBatteryColor(robot.battery) }}
                    >
                      {Math.round(robot.battery)}%
                    </span>
                  </div>
                </div>

                {robot.cargo && (
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">装载</span>
                    <span
                      className="text-[10px] font-medium truncate max-w-[90px]"
                      style={{ color: robot.cargo.isNarcotic ? '#A78BFA' : '#67E8F9' }}
                    >
                      {robot.cargo.isNarcotic && '🔒 '}
                      {robot.cargo.type}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">累计</span>
                  <span className="font-mono text-[10px] text-slate-300">
                    {robot.totalDeliveries}次
                  </span>
                </div>
              </div>
            </div>
          </Html>
        </Billboard>
      )}
    </group>
  );
}
