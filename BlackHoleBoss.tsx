import { useFrame } from '@react-three/fiber';
import React, { useRef } from 'react';
import * as THREE from 'three';

interface BlackHoleBossProps {
  health: number; // 0 to 6
  isHit?: boolean;
}

export function BlackHoleBoss({ health, isHit }: BlackHoleBossProps) {
  const diskRef = useRef<THREE.Mesh>(null);
  const outerDiskRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (diskRef.current) {
      diskRef.current.rotation.z = t * 0.8;
    }
    if (outerDiskRef.current) {
      outerDiskRef.current.rotation.z = -t * 0.4;
    }
    if (coreRef.current) {
      const pulse = 1 + Math.sin(t * 3) * 0.05 + (isHit ? 0.2 : 0);
      coreRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group position={[0, 0, -42]}>
      {/* Event Horizon (Pure Black Sphere) */}
      <mesh ref={coreRef}>
        <sphereGeometry args={[4.5, 32, 32]} />
        <meshBasicMaterial color={isHit ? '#FFFFFF' : '#030008'} />
      </mesh>

      {/* Photon Ring (Luminous Inner Halo) */}
      <mesh rotation={[Math.PI / 3, 0, 0]}>
        <ringGeometry args={[4.6, 5.2, 48]} />
        <meshBasicMaterial color="#FF3B5C" side={THREE.DoubleSide} />
      </mesh>

      {/* Main Accretion Disk (Swirling Plasma) */}
      <mesh ref={diskRef} rotation={[Math.PI / 3, 0, 0]}>
        <ringGeometry args={[5.2, 9.5, 48]} />
        <meshStandardMaterial
          color="#A855F7"
          emissive="#EC4899"
          emissiveIntensity={1.8}
          side={THREE.DoubleSide}
          transparent
          opacity={0.85}
        />
      </mesh>

      {/* Outer Gravitational Gas Disk */}
      <mesh ref={outerDiskRef} rotation={[Math.PI / 3, 0, 0]}>
        <ringGeometry args={[9.5, 14.0, 48]} />
        <meshBasicMaterial
          color="#38BDF8"
          side={THREE.DoubleSide}
          transparent
          opacity={0.4}
        />
      </mesh>

      {/* Massive Gravitational Point Light */}
      <pointLight color="#EC4899" intensity={30} distance={30} />
    </group>
  );
}
