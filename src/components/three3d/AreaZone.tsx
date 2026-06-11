import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { AREAS, AREA_ORDER } from '@/utils/constants';
import type { AreaType } from '@/types';
import { Pill, FlaskConical, Stethoscope, UserRound, Package, Zap, ArrowLeftRight } from 'lucide-react';
import React from 'react';

const iconMap: Record<string, React.ReactNode> = {
  Pill: <Pill size={14} />,
  FlaskConical: <FlaskConical size={14} />,
  Stethoscope: <Stethoscope size={14} />,
  UserRound: <UserRound size={14} />,
  Package: <Package size={14} />,
  Zap: <Zap size={14} />,
  ArrowLeftRight: <ArrowLeftRight size={14} />,
};

interface AreaZoneProps {
  areaId: AreaType;
  onClick?: () => void;
  selected?: boolean;
}

export function AreaZone({ areaId, onClick, selected = false }: AreaZoneProps) {
  const cfg = AREAS[areaId];
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (glowRef.current) {
      const pulse = Math.sin(state.clock.elapsedTime * 1.2 + areaId.length) * 0.08 + 1;
      glowRef.current.scale.set(pulse, 1, pulse);
    }
  });

  const color = useMemo(() => new THREE.Color(cfg.color), [cfg.color]);
  const lightColor = useMemo(() => new THREE.Color(cfg.lightColor), [cfg.lightColor]);

  if (areaId === 'corridor') {
    return (
      <group position={[cfg.position.x, -0.18, cfg.position.z]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[cfg.size.width, cfg.size.depth]} />
          <meshStandardMaterial
            color="#1e293b"
            metalness={0.7}
            roughness={0.3}
            transparent
            opacity={0.9}
          />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0]}>
          <planeGeometry args={[cfg.size.width - 0.5, cfg.size.depth - 0.3]} />
          <meshStandardMaterial
            color="#263449"
            metalness={0.5}
            roughness={0.5}
          />
        </mesh>
        {Array.from({ length: 10 }).map((_, i) => (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[-22 + i * 5, 0.003, 0]}>
            <planeGeometry args={[2.2, 0.15]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.5} />
          </mesh>
        ))}
      </group>
    );
  }

  return (
    <group
      position={[cfg.position.x, cfg.position.y, cfg.position.z]}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      <mesh
        ref={glowRef}
        position={[0, 0.01, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <planeGeometry args={[cfg.size.width + 1.2, cfg.size.depth + 1.2]} />
        <meshBasicMaterial
          color={lightColor}
          transparent
          opacity={selected ? 0.35 : 0.15}
        />
      </mesh>

      <mesh ref={meshRef} position={[0, -0.1, 0]} receiveShadow castShadow>
        <boxGeometry args={[cfg.size.width, 0.2, cfg.size.depth]} />
        <meshStandardMaterial
          color={color}
          metalness={0.4}
          roughness={0.5}
          transparent
          opacity={0.85}
        />
      </mesh>

      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[cfg.size.width - 0.4, cfg.size.depth - 0.4]} />
        <meshStandardMaterial
          color={lightColor}
          metalness={0.3}
          roughness={0.6}
          emissive={color}
          emissiveIntensity={0.15}
        />
      </mesh>

      <mesh position={[cfg.size.width / 2, 1, 0]}>
        <boxGeometry args={[0.15, 2, cfg.size.depth]} />
        <meshStandardMaterial
          color={color}
          metalness={0.6}
          roughness={0.35}
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[-cfg.size.width / 2, 1, 0]}>
        <boxGeometry args={[0.15, 2, cfg.size.depth]} />
        <meshStandardMaterial
          color={color}
          metalness={0.6}
          roughness={0.35}
          transparent
          opacity={0.35}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 1, cfg.size.depth / 2]}>
        <boxGeometry args={[cfg.size.width, 2, 0.15]} />
        <meshStandardMaterial
          color={color}
          metalness={0.6}
          roughness={0.35}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 1, -cfg.size.depth / 2]}>
        <boxGeometry args={[cfg.size.width, 2, 0.15]} />
        <meshStandardMaterial
          color={color}
          metalness={0.6}
          roughness={0.35}
          transparent
          opacity={0.3}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh position={[0, 2, 0]}>
        <boxGeometry args={[cfg.size.width, 0.12, cfg.size.depth]} />
        <meshStandardMaterial
          color={color}
          metalness={0.7}
          roughness={0.3}
          transparent
          opacity={0.6}
        />
      </mesh>

      <pointLight
        position={[0, 1.5, 0]}
        color={cfg.lightColor}
        intensity={0.6}
        distance={8}
        decay={2}
      />

      <Billboard position={[0, 2.6, 0]}>
        <Html
          center
          distanceFactor={8}
          zIndexRange={[10, 0]}
          style={{ pointerEvents: 'none' }}
        >
          <div
            className="px-3 py-1.5 rounded-lg backdrop-blur-xl border text-xs whitespace-nowrap shadow-lg"
            style={{
              background: `${cfg.color}30`,
              borderColor: `${cfg.lightColor}70`,
              boxShadow: `0 4px 20px ${cfg.color}40`,
            }}
          >
            <div className="flex items-center gap-2">
              <span style={{ color: cfg.lightColor }}>{iconMap[cfg.icon]}</span>
              <span className="font-bold" style={{ color: cfg.lightColor }}>
                {cfg.nameCn}
              </span>
            </div>
          </div>
        </Html>
      </Billboard>
    </group>
  );
}

export function FloorGrid() {
  return (
    <group position={[0, -0.21, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[80, 60]} />
        <meshStandardMaterial
          color="#0c1220"
          metalness={0.8}
          roughness={0.4}
        />
      </mesh>
      <gridHelper
        args={[80, 40, '#1e3a5f20', '#0f172a40']}
        position={[0, 0.002, 0]}
      />
    </group>
  );
}

export function AllAreas({ onAreaClick }: { onAreaClick?: (area: AreaType) => void }) {
  return (
    <group>
      {AREA_ORDER.map((area) => (
        <AreaZone
          key={area}
          areaId={area}
          onClick={() => onAreaClick?.(area)}
        />
      ))}
      <AreaZone areaId="corridor" />
    </group>
  );
}
