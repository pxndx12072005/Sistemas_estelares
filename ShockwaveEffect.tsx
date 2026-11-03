import { useFrame } from '@react-three/fiber';
import React, { useRef } from 'react';
import * as THREE from 'three';

interface ShockwaveEffectProps {
  active: boolean;
  color?: string;
}

export function ShockwaveEffect({ active, color = '#34E1FF' }: ShockwaveEffectProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  useFrame((_, delta) => {
    if (!active) {
      timeRef.current = 0;
      if (meshRef.current) meshRef.current.scale.set(0.001, 0.001, 0.001);
      if (ringRef.current) ringRef.current.scale.set(0.001, 0.001, 0.001);
      return;
    }

    timeRef.current += delta * 2.5;
    const progress = Math.min(timeRef.current, 1.0);
    const radius = 0.5 + progress * 16.0;
    const opacity = Math.max(0, 1.0 - progress * 1.1);

    if (meshRef.current) {
      meshRef.current.scale.set(radius, radius, 1);
      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      if (mat) mat.opacity = opacity * 0.7;
    }

    if (ringRef.current) {
      ringRef.current.scale.set(radius * 1.15, radius * 1.15, 1);
      const mat = ringRef.current.material as THREE.MeshBasicMaterial;
      if (mat) mat.opacity = opacity * 0.9;
    }
  });

  return (
    <group position={[0, 0, -2]}>
      {/* Expanding Primary Luminous Wave Ring */}
      <mesh ref={meshRef}>
        <ringGeometry args={[0.9, 1.15, 36]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Secondary Outer Ripple */}
      <mesh ref={ringRef}>
        <ringGeometry args={[0.95, 1.05, 36]} />
        <meshBasicMaterial
          color="#FFFFFF"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
