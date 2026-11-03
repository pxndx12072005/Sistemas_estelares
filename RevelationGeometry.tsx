import { useFrame } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { SystemProblem } from './types';

interface RevelationGeometryProps {
  problem: SystemProblem;
  interactive?: boolean;
}

export function RevelationGeometry({ problem }: RevelationGeometryProps) {
  const groupRef = useRef<THREE.Group>(null);
  const sparkRef = useRef<THREE.Mesh>(null);
  const pulseRef = useRef<THREE.Mesh>(null);
  const flashLightsRef = useRef<THREE.PointLight[]>([]);

  // Time elapsed in revelation (reset when problem changes)
  const animTimeRef = useRef(0);

  const is2D = problem.numVars === 2;
  const isUnica = problem.type === 'UNICA' || (!problem.isKQuestion && problem.rankA === problem.numVars && problem.rankA === problem.rankAb);
  const isInfinitas = problem.type === 'INFINITAS' || (problem.rankA === problem.rankAb && problem.rankA < problem.numVars);
  const isNinguna = problem.type === 'NINGUNA' || (problem.rankA < problem.rankAb);

  // Plane & Line Appearance Timing (Planes/Lines appear one by one with a colored flash)
  // Step 1: Element 0 at t = 0.3s
  // Step 2: Element 1 at t = 1.0s
  // Step 3: Element 2 at t = 1.7s
  // Step 4: Final Intersection result (Golden star / Cyan beam / Red mismatch) at t = 2.4s
  const elementSpawnTimes = [0.3, 1.0, 1.7, 2.4];

  // 2D lines coordinates: ax + by = d
  const lineMeshes = useMemo(() => {
    if (!is2D) return [];
    return problem.planesOrLines.map((eq, idx) => {
      let p1 = new THREE.Vector3();
      let p2 = new THREE.Vector3();

      if (Math.abs(eq.b) > 0.001) {
        const x1 = -5.0;
        const y1 = (eq.d - eq.a * x1) / eq.b;
        const x2 = 5.0;
        const y2 = (eq.d - eq.a * x2) / eq.b;
        p1.set(x1, THREE.MathUtils.clamp(y1, -5.0, 5.0), 0);
        p2.set(x2, THREE.MathUtils.clamp(y2, -5.0, 5.0), 0);
      } else {
        const xVal = eq.d / (eq.a || 1);
        p1.set(xVal, -5.0, 0);
        p2.set(xVal, 5.0, 0);
      }

      const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
      const dir = new THREE.Vector3().subVectors(p2, p1);
      const len = dir.length();
      const orientation = new THREE.Matrix4();
      orientation.lookAt(p1, p2, new THREE.Vector3(0, 0, 1));
      const rot = new THREE.Euler().setFromRotationMatrix(orientation);

      const colors = ['#34E1FF', '#FF3B5C', '#FFC94A', '#A855F7'];
      const color = isInfinitas ? '#34E1FF' : colors[idx % colors.length];

      return { mid, len, rot, color, p1, p2 };
    });
  }, [is2D, problem, isInfinitas]);

  // Compute 3D planes: for ax + by + cz = d
  // Centered at point closest to origin: d * (a,b,c) / (a^2+b^2+c^2)
  // Oriented strictly according to normal vector (a, b, c)
  const planeMeshes = useMemo(() => {
    if (is2D) return [];
    const colors = ['#34E1FF', '#EC4899', '#FBBF24', '#A855F7'];
    return problem.planesOrLines.map((eq, idx) => {
      const normal = new THREE.Vector3(eq.a, eq.b, eq.c);
      const lenSq = normal.lengthSq();
      const nLen = normal.length();
      const normalized = nLen > 0.0001 ? normal.clone().normalize() : new THREE.Vector3(0, 1, 0);

      // Point on plane closest to origin: d * normal / lenSq
      const center = lenSq > 0.0001 ? normal.clone().multiplyScalar(eq.d / lenSq) : new THREE.Vector3(0, 0, 0);

      // Quaternion rotation from standard plane normal (0, 0, 1) to normal (a, b, c)
      const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normalized);
      const euler = new THREE.Euler().setFromQuaternion(quat);

      const color = colors[idx % colors.length];
      return { center, euler, color, normal: normalized };
    });
  }, [is2D, problem]);

  // Star intersection point for ÚNICA
  const starPos: [number, number, number] = useMemo(() => {
    if (problem.solution && problem.solution.length >= 2) {
      const s = problem.solution;
      if (problem.numVars === 2) {
        return [s[0], s[1], 0];
      }
      return [s[0], s[1], s[2] ?? 0];
    }
    return [0, 0, 0];
  }, [problem]);

  // Red mismatch points for NINGUNA (when lines or planes have disjoint intersections)
  const mismatchPoints = useMemo(() => {
    if (!isNinguna) return [];
    if (is2D) {
      // Return parallel offset points or disjoint intersection markers
      return [
        new THREE.Vector3(-1.8, 1.2, 0),
        new THREE.Vector3(1.8, -1.2, 0),
      ];
    } else {
      // 3D mismatch intersection lines/points
      return [
        new THREE.Vector3(1.5, 0.5, 0.5),
        new THREE.Vector3(-1.5, -0.5, -0.5),
        new THREE.Vector3(0, 1.5, -1.2),
      ];
    }
  }, [isNinguna, is2D]);

  // Refs for dynamic animated children
  const planeRefs = useRef<(THREE.Group | null)[]>([]);
  const lineRefs = useRef<(THREE.Group | null)[]>([]);
  const resultRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    animTimeRef.current += delta;
    const t = animTimeRef.current;

    // Animate planes appearing one by one with a scale bounce & flash
    if (!is2D) {
      planeMeshes.forEach((_, idx) => {
        const ref = planeRefs.current[idx];
        if (!ref) return;
        const spawnT = elementSpawnTimes[idx] || 0.3;
        if (t < spawnT) {
          ref.scale.set(0.001, 0.001, 0.001);
          ref.visible = false;
        } else {
          ref.visible = true;
          const elapsed = t - spawnT;
          if (elapsed < 0.35) {
            // Flash and spring pop in
            const progress = elapsed / 0.35;
            const pop = 1 + Math.sin(progress * Math.PI) * 0.35;
            ref.scale.set(pop, pop, pop);
          } else {
            ref.scale.set(1, 1, 1);
          }
        }
      });
    } else {
      // Animate 2D lines appearing one by one
      lineMeshes.forEach((_, idx) => {
        const ref = lineRefs.current[idx];
        if (!ref) return;
        const spawnT = elementSpawnTimes[idx] || 0.3;
        if (t < spawnT) {
          ref.scale.set(0.001, 0.001, 0.001);
          ref.visible = false;
        } else {
          ref.visible = true;
          const elapsed = t - spawnT;
          if (elapsed < 0.3) {
            const pop = 1 + Math.sin((elapsed / 0.3) * Math.PI) * 0.3;
            ref.scale.set(pop, pop, pop);
          } else {
            ref.scale.set(1, 1, 1);
          }
        }
      });
    }

    // Result group (Golden Star / Cyan Beam / Red Mismatch) appears after all planes are visible (t >= 2.4s)
    if (resultRef.current) {
      if (t < 2.3) {
        resultRef.current.visible = false;
        resultRef.current.scale.set(0.001, 0.001, 0.001);
      } else {
        resultRef.current.visible = true;
        const elapsed = t - 2.3;
        const progress = Math.min(1, elapsed / 0.4);
        const s = 1 + Math.sin(progress * Math.PI) * 0.25;
        resultRef.current.scale.set(s, s, s);
      }
    }

    // Pulse effects
    if (sparkRef.current) {
      sparkRef.current.position.x = Math.sin(t * 4.0) * 4;
    }
    if (pulseRef.current) {
      const ps = 1 + Math.sin(t * 6) * 0.18;
      pulseRef.current.scale.set(ps, ps, ps);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* 2D Holographic coordinate grid */}
      {is2D && (
        <group>
          <gridHelper args={[12, 12, '#34E1FF', '#1E293B']} rotation={[Math.PI / 2, 0, 0]} />
          {/* Axis markers */}
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshBasicMaterial color="#94A3B8" />
          </mesh>

          {lineMeshes.map((line, i) => (
            <group
              key={i}
              ref={(el) => (lineRefs.current[i] = el)}
              position={line.mid}
              rotation={line.rot}
            >
              <mesh>
                <cylinderGeometry args={[0.08, 0.08, line.len, 16]} />
                <meshStandardMaterial
                  color={line.color}
                  emissive={line.color}
                  emissiveIntensity={1.8}
                  roughness={0.2}
                />
              </mesh>
              {/* Spawn flash light */}
              <pointLight color={line.color} intensity={8} distance={6} />
            </group>
          ))}
        </group>
      )}

      {/* 3D Translucent Planes (10x10 units) oriented strictly according to normal (a, b, c) */}
      {!is2D && (
        <group>
          {planeMeshes.map((p, i) => (
            <group
              key={i}
              ref={(el) => (planeRefs.current[i] = el)}
              position={p.center}
              rotation={p.euler}
            >
              {/* Main 10x10 translucent plane */}
              <mesh>
                <boxGeometry args={[10, 10, 0.09]} />
                <meshStandardMaterial
                  color={p.color}
                  transparent
                  opacity={0.48}
                  emissive={p.color}
                  emissiveIntensity={0.65}
                  side={THREE.DoubleSide}
                  roughness={0.25}
                />
              </mesh>

              {/* Glowing border wireframe */}
              <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(10, 10, 0.09)]} />
                <lineBasicMaterial color={p.color} linewidth={3} />
              </lineSegments>

              {/* Normal arrow indicator at center of plane */}
              <mesh position={[0, 0, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[0.18, 0.6, 12]} />
                <meshStandardMaterial color={p.color} emissive={p.color} emissiveIntensity={1.5} />
              </mesh>

              {/* Colored Flash Point Light when spawning */}
              <pointLight color={p.color} intensity={12} distance={8} />
            </group>
          ))}
        </group>
      )}

      {/* ========================================================================= */}
      {/* FINAL RESULT HIGHLIGHT (Appears after 4-sec sequence: t >= 2.4s) */}
      {/* ========================================================================= */}
      <group ref={resultRef}>
        {/* ÚNICA: Golden Star at exact intersection point */}
        {isUnica && (
          <group position={starPos} ref={pulseRef}>
            {/* Central brilliant star sphere */}
            <mesh>
              <sphereGeometry args={[0.32, 24, 24]} />
              <meshStandardMaterial
                color="#FFC94A"
                emissive="#FFC94A"
                emissiveIntensity={3.2}
              />
            </mesh>
            {/* Diamond star spikes */}
            <mesh rotation={[0, 0, Math.PI / 4]}>
              <octahedronGeometry args={[0.55, 0]} />
              <meshBasicMaterial color="#FFFBEB" wireframe />
            </mesh>
            {/* Outer halo */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[0.5, 0.8, 32]} />
              <meshBasicMaterial color="#FFC94A" side={THREE.DoubleSide} transparent opacity={0.7} />
            </mesh>
            {/* High intensity gold point light */}
            <pointLight color="#FFC94A" intensity={30} distance={10} />
          </group>
        )}

        {/* INFINITAS: Radiant Cyan Ray over the shared common line */}
        {isInfinitas && (
          <group>
            {/* 3D Cyan Beam Ray of Intersection */}
            <mesh rotation={[0, Math.PI / 4, Math.PI / 4]}>
              <cylinderGeometry args={[0.12, 0.12, 14, 24]} />
              <meshStandardMaterial
                color="#34E1FF"
                emissive="#34E1FF"
                emissiveIntensity={3.5}
              />
            </mesh>
            {/* Outer soft aura cylinder */}
            <mesh rotation={[0, Math.PI / 4, Math.PI / 4]}>
              <cylinderGeometry args={[0.35, 0.35, 14, 16]} />
              <meshBasicMaterial color="#34E1FF" transparent opacity={0.35} />
            </mesh>
            <pointLight color="#34E1FF" intensity={25} distance={12} />
          </group>
        )}

        {/* NINGUNA: Mismatched intersections highlighted in RED with sparking alarm */}
        {isNinguna && (
          <group>
            {mismatchPoints.map((pt, i) => (
              <group key={i} position={pt}>
                <mesh>
                  <sphereGeometry args={[0.26, 16, 16]} />
                  <meshStandardMaterial
                    color="#FF3B5C"
                    emissive="#FF3B5C"
                    emissiveIntensity={3.0}
                  />
                </mesh>
                <mesh rotation={[0, 0, (i + 1) * Math.PI / 3]}>
                  <ringGeometry args={[0.35, 0.55, 16]} />
                  <meshBasicMaterial color="#FF3B5C" wireframe />
                </mesh>
                <pointLight color="#FF3B5C" intensity={18} distance={8} />
              </group>
            ))}

            {/* Traveling warning spark */}
            {is2D && (
              <mesh ref={sparkRef} position={[0, 0.6, 0]}>
                <sphereGeometry args={[0.2, 16, 16]} />
                <meshBasicMaterial color="#FF3B5C" />
              </mesh>
            )}
          </group>
        )}
      </group>
    </group>
  );
}
