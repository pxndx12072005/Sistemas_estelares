import { useFrame } from '@react-three/fiber';
import React, { useRef } from 'react';
import * as THREE from 'three';

interface GaussShipProps {
  lane: number; // -1 (left), 0 (center), 1 (right)
  combo: number;
  firingLaser?: boolean;
}

export function GaussShip({ lane, combo, firingLaser = false }: GaussShipProps) {
  const shipGroupRef = useRef<THREE.Group>(null);
  const rangoRef = useRef<THREE.Group>(null);
  const leftPlasmaRef = useRef<THREE.Mesh>(null);
  const rightPlasmaRef = useRef<THREE.Mesh>(null);

  // Smooth lane interpolation with dynamic banking
  const targetX = lane * 4.5;
  const currentX = useRef(0);
  const currentRoll = useRef(0);

  useFrame(({ clock }, delta) => {
    const t = clock.getElapsedTime();
    const dt = Math.min(delta, 0.1);

    // Lerp ship position X
    currentX.current = THREE.MathUtils.lerp(currentX.current, targetX, 10 * dt);
    
    // Bank angle (roll) when changing lanes: increased bank response (-0.28) for an agile sci-fi feel
    const xDiff = targetX - currentX.current;
    const targetRoll = -xDiff * 0.28;
    currentRoll.current = THREE.MathUtils.lerp(currentRoll.current, targetRoll, 9 * dt);

    if (shipGroupRef.current) {
      shipGroupRef.current.position.x = currentX.current;
      shipGroupRef.current.rotation.z = currentRoll.current;
      // Slight pitch forward when banking into a turn
      shipGroupRef.current.rotation.x = Math.abs(currentRoll.current) * 0.15;
      shipGroupRef.current.position.y = Math.sin(t * 2.5) * 0.08;
    }

    // Copilot Rango floating animation
    if (rangoRef.current) {
      rangoRef.current.position.y = 0.7 + Math.sin(t * 3.5) * 0.1;
      rangoRef.current.position.x = 1.2 + Math.cos(t * 2) * 0.06;
      rangoRef.current.rotation.y = Math.sin(t * 2) * 0.2;
    }

    // Plasma thruster flickering & combo boost
    const boost = combo >= 5 ? 2.5 : combo >= 3 ? 1.8 : 1.0;
    const flick = 0.85 + Math.random() * 0.3;
    const pScale = boost * flick;
    if (leftPlasmaRef.current) {
      leftPlasmaRef.current.scale.set(1, 1, pScale);
    }
    if (rightPlasmaRef.current) {
      rightPlasmaRef.current.scale.set(1, 1, pScale);
    }
  });

  const isBlueFire = combo >= 3;
  const thrusterColor = isBlueFire ? '#38BDF8' : '#F97316';
  const emissiveColor = isBlueFire ? '#0284C7' : '#EA580C';

  return (
    <group ref={shipGroupRef} position={[0, 0, 0]}>
      {/* Ship Body */}
      {/* Main Fuselage */}
      <mesh position={[0, 0, 0]} castShadow>
        <coneGeometry args={[0.7, 3.2, 5]} />
        <meshStandardMaterial color="#0F172A" metalness={0.8} roughness={0.3} />
      </mesh>

      {/* Cockpit Canopy (Forward facing -Z) */}
      <mesh position={[0, 0.28, -0.4]} rotation={[0.2, 0, 0]}>
        <capsuleGeometry args={[0.25, 0.9, 4, 8]} />
        <meshStandardMaterial
          color="#38BDF8"
          emissive="#0284C7"
          emissiveIntensity={0.8}
          roughness={0.1}
          metalness={0.9}
        />
      </mesh>

      {/* Swept Wings */}
      <group position={[0, 0, 0.4]}>
        {/* Left Wing */}
        <mesh position={[-1.2, -0.05, 0]} rotation={[0, 0.15, -0.1]}>
          <boxGeometry args={[1.6, 0.08, 1.2]} />
          <meshStandardMaterial color="#1E293B" metalness={0.7} roughness={0.4} />
        </mesh>
        {/* Left Wingtip Neon */}
        <mesh position={[-2.0, -0.02, 0.1]} rotation={[0, 0.15, -0.1]}>
          <boxGeometry args={[0.08, 0.12, 1.0]} />
          <meshBasicMaterial color="#38BDF8" />
        </mesh>

        {/* Right Wing */}
        <mesh position={[1.2, -0.05, 0]} rotation={[0, -0.15, 0.1]}>
          <boxGeometry args={[1.6, 0.08, 1.2]} />
          <meshStandardMaterial color="#1E293B" metalness={0.7} roughness={0.4} />
        </mesh>
        {/* Right Wingtip Neon */}
        <mesh position={[2.0, -0.02, 0.1]} rotation={[0, -0.15, 0.1]}>
          <boxGeometry args={[0.08, 0.12, 1.0]} />
          <meshBasicMaterial color="#38BDF8" />
        </mesh>
      </group>

      {/* Twin Engine Nacelles */}
      <mesh position={[-0.45, 0, 1.3]}>
        <cylinderGeometry args={[0.22, 0.25, 0.9, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0.45, 0, 1.3]}>
        <cylinderGeometry args={[0.22, 0.25, 0.9, 8]} />
        <meshStandardMaterial color="#334155" metalness={0.9} roughness={0.2} />
      </mesh>

      {/* Plasma Flames (Pointing toward +Z) */}
      <mesh ref={leftPlasmaRef} position={[-0.45, 0, 2.0]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.2, 1.4, 8]} />
        <meshBasicMaterial color={thrusterColor} />
      </mesh>
      <mesh ref={rightPlasmaRef} position={[0.45, 0, 2.0]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.2, 1.4, 8]} />
        <meshBasicMaterial color={thrusterColor} />
      </mesh>

      {/* Pointlight for engine glow */}
      <pointLight
        position={[0, 0, 2.2]}
        color={emissiveColor}
        intensity={combo >= 3 ? 35 : 18}
        distance={10}
      />

      {/* Boss laser blast */}
      {firingLaser && (
        <group position={[0, 0, -2]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -18]}>
            <cylinderGeometry args={[0.15, 0.15, 36, 8]} />
            <meshBasicMaterial color="#38BDF8" />
          </mesh>
          <pointLight color="#38BDF8" intensity={40} distance={20} />
        </group>
      )}

      {/* COPILOT RANGO - Floating holographic drone */}
      <group ref={rangoRef} position={[1.2, 0.7, 0]}>
        {/* Spherical Droid Body */}
        <mesh>
          <sphereGeometry args={[0.22, 16, 16]} />
          <meshStandardMaterial color="#1E293B" metalness={0.9} roughness={0.2} />
        </mesh>
        {/* Cyan Eye Lens */}
        <mesh position={[0, 0.02, -0.18]}>
          <sphereGeometry args={[0.08, 12, 12]} />
          <meshStandardMaterial
            color="#22D3EE"
            emissive="#22D3EE"
            emissiveIntensity={2.5}
          />
        </mesh>
        {/* Antenna */}
        <mesh position={[0, 0.26, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.15, 6]} />
          <meshStandardMaterial color="#94A3B8" />
        </mesh>
        <mesh position={[0, 0.35, 0]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshBasicMaterial color="#FBBF24" />
        </mesh>
        {/* Holographic light ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.3, 0.015, 8, 24]} />
          <meshBasicMaterial color="#22D3EE" transparent opacity={0.6} />
        </mesh>
      </group>
    </group>
  );
}
