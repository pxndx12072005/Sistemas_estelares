import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import { Physics } from '@react-three/rapier';
import React, { Suspense, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { BlackHoleBoss } from './BlackHoleBoss';
import { getConfig } from './constants';
import { GaussShip } from './GaussShip';
import { PortalLanes } from './PortalLanes';
import { RevelationGeometry } from './RevelationGeometry';
import { ShockwaveEffect } from './ShockwaveEffect';
import { SpaceEnvironment } from './SpaceEnvironment';
import { SystemProblem } from './types';
import { GameState } from './utils/helper';

interface GameProps {
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  currentProblem: SystemProblem | null;
  lane: number;
  setLane: (fn: (prev: number) => number) => void;
  portalProgressZ: number;
  portalOptions: { label: string; sub: string; color: string; type: string }[];
  isRevelation: boolean;
  isHyperspace: boolean;
  isSlowMo: boolean;
  shockwaveActive: boolean;
  shockwaveColor: string;
  bossHealth: number;
  bossHit: boolean;
  laserFiring: boolean;
  shakeIntensity: number;
  combo: number;
}

function SceneContent({
  currentProblem,
  lane,
  portalProgressZ,
  portalOptions,
  isRevelation,
  isHyperspace,
  isSlowMo,
  shockwaveActive,
  shockwaveColor,
  bossHealth,
  bossHit,
  laserFiring,
  shakeIntensity,
  combo,
}: Omit<GameProps, 'gameState' | 'setGameState'>) {
  const { camera } = useThree();
  const revelationTimerRef = useRef(0);

  // Reset revelation timer when switching into revelation
  useEffect(() => {
    if (isRevelation) {
      revelationTimerRef.current = 0;
    }
  }, [isRevelation]);

  // Camera handling (Flight chase-cam vs 4-second 360° Cinematic Orbit)
  useFrame(({ clock }, delta) => {
    // In slow-mo, scale delta for ultra dramatic slow-motion time dilation
    const timeScale = isSlowMo ? 0.35 : 1.0;
    const dt = Math.min(delta, 0.1) * timeScale;

    if (isRevelation && currentProblem) {
      revelationTimerRef.current += dt;
      const t = revelationTimerRef.current;

      // Exactly 360° orbit (2 * Math.PI) in 4 seconds: angular speed = (2 * Math.PI) / 4 = Math.PI / 2 rad/s
      const orbitProgress = Math.min(t / 4.0, 1.0);
      const orbitAngle = orbitProgress * Math.PI * 2;
      // Camera zooms out during revelation: radius 13.5 for 3D planes, 10.5 for 2D lines
      const baseRadius = currentProblem.numVars === 2 ? 10.5 : 13.5;
      const currentRadius = THREE.MathUtils.lerp(8.0, baseRadius, Math.min(t * 1.5, 1.0));
      const camY = THREE.MathUtils.lerp(3.5, 5.0, Math.min(t * 1.2, 1.0)) + Math.sin(t * 1.5) * 0.8;

      camera.position.x = Math.sin(orbitAngle) * currentRadius;
      camera.position.z = Math.cos(orbitAngle) * currentRadius;
      camera.position.y = camY;
      camera.lookAt(0, 0, 0);
    } else {
      // Third-person chase cam behind the ship
      const targetCamX = lane * 1.8;
      const targetCamY = getConfig('cameraY');
      const targetCamZ = isSlowMo ? getConfig('cameraZ') + 1.2 : getConfig('cameraZ');

      // Camera shake on mistakes or collisions
      const shakeX = (Math.random() - 0.5) * shakeIntensity * 0.6;
      const shakeY = (Math.random() - 0.5) * shakeIntensity * 0.6;

      camera.position.x = THREE.MathUtils.lerp(camera.position.x, targetCamX + shakeX, 8 * dt);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetCamY + shakeY, 8 * dt);
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, targetCamZ, 8 * dt);

      // Aim at point ahead of ship
      camera.lookAt(lane * 2.2, 0.8, -12);
    }
  });

  const isBossSector = currentProblem?.sector === 6;

  return (
    <group>
      {/* Dynamic space background and warp stars with slow-mo scaling */}
      <SpaceEnvironment
        speed={isRevelation ? 0.5 : isSlowMo ? getConfig('portalTunnelSpeed') * 0.3 : getConfig('portalTunnelSpeed')}
        isHyperspace={isHyperspace}
      />

      {/* Flight scene (Ship is hidden/stopped during 3D Revelation) */}
      {!isRevelation && (
        <group>
          {/* Player Ship GAUSS-01 + Copilot RANGO */}
          <GaussShip lane={lane} combo={combo} firingLaser={laserFiring} />

          {/* Shockwave expanding ring when player gets it right */}
          <ShockwaveEffect active={shockwaveActive} color={shockwaveColor} />

          {/* Approaching Portals */}
          <PortalLanes
            progressZ={portalProgressZ}
            options={portalOptions}
            currentLane={lane}
          />

          {/* Boss Black Hole for Sector 6 */}
          {isBossSector && (
            <BlackHoleBoss health={bossHealth} isHit={bossHit} />
          )}
        </group>
      )}

      {/* Revelation 3D Geometry Scene */}
      {isRevelation && currentProblem && (
        <RevelationGeometry problem={currentProblem} />
      )}
    </group>
  );
}

export function Game(props: GameProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Config values are read on creation
  }, []);

  return (
    <div ref={containerRef} className="w-full h-full canvas-wrapper relative">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{
          fov: getConfig('fov'),
          near: 0.1,
          far: 500,
          position: [getConfig('cameraX'), getConfig('cameraY'), getConfig('cameraZ')],
        }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.1,
        }}
        scene={{
          background: new THREE.Color(getConfig('backgroundColor')),
          fog: new THREE.FogExp2(getConfig('backgroundColor'), 0.012),
        }}
      >
        <Suspense fallback={null}>
          {/* Lighting Rig */}
          <ambientLight
            color={getConfig('ambientColor')}
            intensity={getConfig('ambientIntensity')}
          />
          <directionalLight
            color={getConfig('sunColor')}
            intensity={getConfig('sunIntensity')}
            position={[10, 20, 15]}
          />
          <hemisphereLight
            color={getConfig('hemiSkyColor')}
            groundColor={getConfig('hemiGroundColor')}
            intensity={getConfig('hemiIntensity')}
          />

          <Physics gravity={[0, getConfig('gravity'), 0]} paused={false}>
            <SceneContent
              currentProblem={props.currentProblem}
              lane={props.lane}
              setLane={props.setLane}
              portalProgressZ={props.portalProgressZ}
              portalOptions={props.portalOptions}
              isRevelation={props.isRevelation}
              isHyperspace={props.isHyperspace}
              isSlowMo={props.isSlowMo}
              shockwaveActive={props.shockwaveActive}
              shockwaveColor={props.shockwaveColor}
              bossHealth={props.bossHealth}
              bossHit={props.bossHit}
              laserFiring={props.laserFiring}
              shakeIntensity={props.shakeIntensity}
              combo={props.combo}
            />
          </Physics>

          {/* Sci-Fi Bloom Postprocessing */}
          <EffectComposer>
            <Bloom
              luminanceThreshold={0.7}
              luminanceSmoothing={0.8}
              intensity={0.65}
              mipmapBlur
            />
          </EffectComposer>
        </Suspense>
      </Canvas>
    </div>
  );
}
