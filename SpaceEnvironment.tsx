import { useFrame } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface SpaceEnvironmentProps {
  speed: number;
  isHyperspace?: boolean;
}

export function SpaceEnvironment({ speed, isHyperspace = false }: SpaceEnvironmentProps) {
  const starsRef = useRef<THREE.Points>(null);
  const hyperStarsRef = useRef<THREE.Points>(null);
  const asteroidsRef = useRef<THREE.Group>(null);

  // Generate 850 optimized star points for a denser, more spectacular cosmic tunnel
  const starCount = 850;
  const [starPositions, starSpeeds, starColors] = useMemo(() => {
    const pos = new Float32Array(starCount * 3);
    const spd = new Float32Array(starCount);
    const cols = new Float32Array(starCount * 3);
    const colorPalette = [
      new THREE.Color('#38BDF8'),
      new THREE.Color('#FBBF24'),
      new THREE.Color('#F43F5E'),
      new THREE.Color('#FFFFFF'),
      new THREE.Color('#818CF8'),
    ];

    for (let i = 0; i < starCount; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 44;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 32;
      pos[i * 3 + 2] = -Math.random() * 85;
      spd[i] = 0.6 + Math.random() * 1.8;

      const c = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      cols[i * 3] = c.r;
      cols[i * 3 + 1] = c.g;
      cols[i * 3 + 2] = c.b;
    }
    return [pos, spd, cols];
  }, []);

  // Asteroid instances with rotational speed
  const asteroids = useMemo(() => {
    return Array.from({ length: 16 }, () => ({
      x: (Math.random() > 0.5 ? 1 : -1) * (6.5 + Math.random() * 6),
      y: (Math.random() - 0.5) * 7,
      z: -10 - Math.random() * 55,
      rotSpeed: 0.5 + Math.random() * 1.5,
      scale: 0.6 + Math.random() * 0.8,
    }));
  }, []);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const effectiveSpeed = isHyperspace ? speed * 6.5 : speed;

    if (starsRef.current) {
      const positions = starsRef.current.geometry.attributes.position.array as Float32Array;
      for (let i = 0; i < starCount; i++) {
        positions[i * 3 + 2] += effectiveSpeed * starSpeeds[i] * dt;
        if (positions[i * 3 + 2] > 10) {
          positions[i * 3 + 2] = -75 - Math.random() * 15;
          positions[i * 3] = (Math.random() - 0.5) * 44;
          positions[i * 3 + 1] = (Math.random() - 0.5) * 32;
        }
      }
      starsRef.current.geometry.attributes.position.needsUpdate = true;
    }

    if (asteroidsRef.current) {
      asteroidsRef.current.children.forEach((child) => {
        child.position.z += effectiveSpeed * 0.75 * dt;
        child.rotation.x += delta * 0.6;
        child.rotation.y += delta * 0.8;
        if (child.position.z > 12) {
          child.position.z = -55 - Math.random() * 20;
        }
      });
    }
  });

  return (
    <group>
      {/* Dense Multi-colored Stars */}
      <points ref={starsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[starPositions, 3]}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[starColors, 3]}
          />
        </bufferGeometry>
        <pointsMaterial
          size={isHyperspace ? 0.38 : 0.22}
          vertexColors
          transparent
          opacity={0.92}
        />
      </points>

      {/* Floating Asteroids */}
      <group ref={asteroidsRef}>
        {asteroids.map((ast, i) => (
          <group key={i} position={[ast.x, ast.y, ast.z]} scale={ast.scale}>
            <mesh>
              <dodecahedronGeometry args={[0.9, 0]} />
              <meshStandardMaterial
                color="#475569"
                roughness={0.9}
                metalness={0.1}
                flatShading
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* Neon Light Tunnel Rings */}
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} position={[0, 0, -i * 12]} rotation={[0, 0, i * 0.45]}>
          <torusGeometry args={[9.5, 0.05, 8, 32]} />
          <meshBasicMaterial color={i % 2 === 0 ? '#38BDF8' : '#818CF8'} transparent opacity={0.22} />
        </mesh>
      ))}
    </group>
  );
}
