import { useFrame } from '@react-three/fiber';
import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';

interface PortalLanesProps {
  progressZ: number; // Z position of the portal trio (moves towards 0)
  options: { label: string; sub: string; color: string; type: string }[];
  currentLane: number;
}

function makeTextTexture(text: string, sub: string, color: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 512, 256);
    // Background plate
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.roundRect(16, 16, 480, 224, 24);
    ctx.fill();
    ctx.stroke();

    // Main text
    ctx.fillStyle = color;
    ctx.font = 'bold 56px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 100);

    // Subtitle
    ctx.fillStyle = '#E2E8F0';
    ctx.font = '32px sans-serif';
    ctx.fillText(sub, 256, 170);
  }
  const texture = new THREE.CanvasTexture(canvas);
  return texture;
}

export function PortalLanes({ progressZ, options, currentLane }: PortalLanesProps) {
  const rotRef = useRef(0);
  const ring1 = useRef<THREE.Mesh>(null);
  const ring2 = useRef<THREE.Mesh>(null);
  const ring3 = useRef<THREE.Mesh>(null);

  useFrame((_, delta) => {
    rotRef.current += delta * 2;
    if (ring1.current) ring1.current.rotation.z = rotRef.current;
    if (ring2.current) ring2.current.rotation.z = -rotRef.current;
    if (ring3.current) ring3.current.rotation.z = rotRef.current * 1.5;
  });

  const laneX = [-4.5, 0, 4.5];

  // Memoize canvas textures for portal signs
  const labelTextures = useMemo(() => {
    return options.map((opt) => makeTextTexture(opt.label, opt.sub, opt.color));
  }, [options]);

  return (
    <group position={[0, 0, progressZ]}>
      {options.map((opt, idx) => {
        const x = laneX[idx];
        const isSelected = currentLane === idx - 1;
        const ringColor = opt.color;
        const refMap = [ring1, ring2, ring3][idx];
        const textTexture = labelTextures[idx];

        return (
          <group key={idx} position={[x, 0, 0]}>
            {/* Outer portal ring */}
            <mesh ref={refMap}>
              <torusGeometry args={[1.8, 0.14, 16, 32]} />
              <meshStandardMaterial
                color={ringColor}
                emissive={ringColor}
                emissiveIntensity={isSelected ? 2.5 : 1.2}
                roughness={0.2}
              />
            </mesh>

            {/* Inner rotating glyph / motif */}
            {idx === 0 && (
              // Star for ÚNICA
              <mesh rotation={[0, 0, rotRef.current]}>
                <octahedronGeometry args={[0.7, 0]} />
                <meshStandardMaterial
                  color="#FFC94A"
                  emissive="#FFC94A"
                  emissiveIntensity={1.8}
                  wireframe
                />
              </mesh>
            )}

            {idx === 1 && (
              // Infinity torus knot for INFINITAS
              <mesh rotation={[0, 0, -rotRef.current]}>
                <torusKnotGeometry args={[0.5, 0.12, 48, 8, 2, 3]} />
                <meshStandardMaterial
                  color="#34E1FF"
                  emissive="#34E1FF"
                  emissiveIntensity={1.8}
                  roughness={0.2}
                />
              </mesh>
            )}

            {idx === 2 && (
              // Unstable black core / red thorns for NINGUNA
              <group>
                <mesh>
                  <sphereGeometry args={[0.6, 16, 16]} />
                  <meshBasicMaterial color="#11050E" />
                </mesh>
                <mesh rotation={[0, 0, rotRef.current * 2]}>
                  <ringGeometry args={[0.7, 0.9, 12]} />
                  <meshBasicMaterial color="#FF3B5C" wireframe />
                </mesh>
              </group>
            )}

            {/* Portal Light Column behind ring */}
            <mesh position={[0, 0, -2.5]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[1.7, 1.7, 5, 24, 1, true]} />
              <meshBasicMaterial
                color={ringColor}
                transparent
                opacity={isSelected ? 0.45 : 0.2}
                side={THREE.DoubleSide}
              />
            </mesh>

            {/* Canvas Texture Signboard above portal */}
            <mesh position={[0, 2.5, 0]}>
              <planeGeometry args={[2.8, 1.4]} />
              <meshBasicMaterial map={textTexture} transparent side={THREE.DoubleSide} />
            </mesh>

            {/* Selection indicator ground halo */}
            {isSelected && (
              <mesh position={[0, -1.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[1.5, 1.9, 32]} />
                <meshBasicMaterial color={ringColor} side={THREE.DoubleSide} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
}
