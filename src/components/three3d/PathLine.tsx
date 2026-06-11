import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { RoutePoint } from '@/types';

interface PathLineProps {
  points: RoutePoint[];
  progress?: number;
  color?: string;
  isLocked?: boolean;
  width?: number;
  showFlow?: boolean;
  opacity?: number;
}

export function PathLine({
  points,
  progress = 1,
  color = '#10B981',
  isLocked = false,
  width = 0.25,
  showFlow = true,
  opacity = 0.9,
}: PathLineProps) {
  const flowRef = useRef<THREE.Line>(null);
  const particlesRef = useRef<THREE.Points>(null);

  const { curve, totalLength } = useMemo(() => {
    if (!points || points.length < 2) return { curve: null, totalLength: 0 };
    const validPts = points.filter((p) => p && typeof p.x === 'number' && typeof p.z === 'number');
    if (validPts.length < 2) return { curve: null, totalLength: 0 };
    const pts = validPts.map((p) => new THREE.Vector3(p.x, 0.08, p.z));
    try {
      const c = new THREE.CatmullRomCurve3(pts, false, 'centripetal', 0.25);
      return { curve: c, totalLength: c.getLength() };
    } catch {
      return { curve: null, totalLength: 0 };
    }
  }, [points]);

  const geometryData = useMemo(() => {
    if (!curve) return null;
    const divisions = 120;
    const tubeGeo = new THREE.TubeGeometry(curve, divisions, width / 2, 8, false);
    const linePositions = new Float32Array(divisions * 3);
    for (let i = 0; i < divisions; i++) {
      const t = i / (divisions - 1);
      const p = curve.getPoint(t);
      linePositions[i * 3] = p.x;
      linePositions[i * 3 + 1] = p.y;
      linePositions[i * 3 + 2] = p.z;
    }
    return { tubeGeo, linePositions, divisions };
  }, [curve, width]);

  const particlePositions = useMemo(() => {
    if (!curve) return null;
    const count = 25;
    const pos = new Float32Array(count * 3);
    const offsets = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      offsets[i] = i / count;
    }
    return { count, pos, offsets };
  }, [curve]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;

    if (flowRef.current && showFlow) {
      const mat = flowRef.current.material as THREE.LineBasicMaterial;
      if (mat) {
        (mat as any).dashOffset = -(time * 6) % 2;
      }
    }

    if (particlesRef.current && particlePositions && curve && showFlow) {
      const positions = particlesRef.current.geometry.attributes.position
        .array as Float32Array;
      for (let i = 0; i < particlePositions.count; i++) {
        const rawT = ((particlePositions.offsets[i] + time * 0.25) % 1) * progress;
        const t = Math.max(0.001, Math.min(0.999, rawT));
        if (t > 0 && t <= 1) {
          try {
            const safeT = Math.max(0, Math.min(1, t));
            const p = curve.getPoint(safeT);
            if (p && typeof p.x === 'number') {
              const wobble = Math.sin(time * 3 + i * 0.6) * 0.05;
              positions[i * 3] = p.x;
              positions[i * 3 + 1] = p.y + 0.15 + wobble;
              positions[i * 3 + 2] = p.z;
              continue;
            }
          } catch {}
        }
        positions[i * 3] = 0;
        positions[i * 3 + 1] = -100;
        positions[i * 3 + 2] = 0;
      }
      try {
        particlesRef.current.geometry.attributes.position.needsUpdate = true;
      } catch {}
    }
  });

  if (!curve || !geometryData) return null;

  const tubeColor = new THREE.Color(color);

  return (
    <group>
      <mesh geometry={geometryData.tubeGeo}>
        <meshBasicMaterial
          color={tubeColor}
          transparent
          opacity={opacity * 0.25}
        />
      </mesh>

      <line ref={flowRef as any}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={geometryData.divisions}
            array={geometryData.linePositions}
            itemSize={3}
          />
        </bufferGeometry>
        <lineDashedMaterial
          color={isLocked ? '#EF4444' : tubeColor}
          dashSize={0.6}
          gapSize={0.4}
          linewidth={2}
          transparent
          opacity={opacity}
        />
      </line>

      {particlePositions && (
        <points ref={particlesRef}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={particlePositions.count}
              array={particlePositions.pos}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            size={0.22}
            color={isLocked ? '#F87171' : '#34D399'}
            transparent
            opacity={0.95}
            sizeAttenuation
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      )}

      {(() => {
        const startP = curve.getPoint(0);
        const endT = progress;
        const endP = curve.getPoint(Math.min(endT, 0.999));
        return (
          <>
            <mesh position={[startP.x, 0.12, startP.z]}>
              <sphereGeometry args={[0.22, 16, 16]} />
              <meshBasicMaterial color="#34D399" transparent opacity={0.9} />
            </mesh>
            {progress > 0.95 && (
              <mesh position={[endP.x, 0.12, endP.z]}>
                <sphereGeometry args={[0.2, 16, 16]} />
                <meshBasicMaterial
                  color={isLocked ? '#F87171' : '#FBBF24'}
                  transparent
                  opacity={0.95}
                />
              </mesh>
            )}
          </>
        );
      })()}

      {isLocked && (
        <group position={[curve.getPoint(0.5).x, 0.4, curve.getPoint(0.5).z]}>
          <mesh rotation={[0, Math.PI / 4, 0]}>
            <boxGeometry args={[0.3, 0.4, 0.2]} />
            <meshStandardMaterial color="#EF4444" metalness={0.7} roughness={0.3} emissive="#EF4444" emissiveIntensity={0.4} />
          </mesh>
          <mesh position={[0, 0.2, 0]}>
            <torusGeometry args={[0.18, 0.04, 8, 16, Math.PI]} />
            <meshStandardMaterial color="#EF4444" metalness={0.7} roughness={0.3} />
          </mesh>
        </group>
      )}
    </group>
  );
}
