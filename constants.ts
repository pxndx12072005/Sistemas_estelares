import { MusicTrack } from './utils/helper';

/** Game configuration schema. */
export const CONFIG = {
  // --- Game ---
  title: {
    value: 'Sistemas Estelares',
    type: 'string',
    label: 'Game Title',
    group: 'GAME',
  },
  baseCanvasWidth: {
    value: 1280,
    type: 'number',
    label: 'Base Canvas Width',
    group: 'GAME',
  },
  baseCanvasHeight: {
    value: 720,
    type: 'number',
    label: 'Base Canvas Height',
    group: 'GAME',
  },

  // --- Theme ---
  backgroundColor: {
    value: '#0B0F2A',
    type: 'color',
    label: 'Background Color',
    group: 'THEME',
  },
  primaryColor: {
    value: '#34E1FF',
    type: 'color',
    label: 'Primary Color (Cyan)',
    group: 'THEME',
  },
  accentGold: {
    value: '#FFC94A',
    type: 'color',
    label: 'Gold (Única)',
    group: 'THEME',
  },
  accentRed: {
    value: '#FF3B5C',
    type: 'color',
    label: 'Red (Ninguna)',
    group: 'THEME',
  },
  fontFamily: {
    value: 'monospace',
    type: 'string',
    label: 'Font Family',
    group: 'THEME',
  },

  // --- Audio ---
  defaultMusicVolume: {
    value: 0.25,
    type: 'number',
    label: 'Default Music Volume',
    group: 'AUDIO',
    min: 0,
    max: 1,
    step: 0.05,
  },
  defaultSfxVolume: {
    value: 0.6,
    type: 'number',
    label: 'Default SFX Volume',
    group: 'AUDIO',
    min: 0,
    max: 1,
    step: 0.05,
  },
  backgroundMusicUrl: {
    value: 'https://storage.googleapis.com/assets-gen-playground/musiclibrary/stellar_drift.mp3',
    type: 'string',
    label: 'Background Music URL',
    group: 'AUDIO',
  },
  bossMusicUrl: {
    value: 'https://storage.googleapis.com/assets-gen-playground/musiclibrary/titan_clash.mp3',
    type: 'string',
    label: 'Boss Music URL',
    group: 'AUDIO',
  },

  // --- Camera ---
  fov: {
    value: 60,
    type: 'number',
    label: 'Field of View',
    group: 'Camera',
    min: 40,
    max: 90,
    step: 5,
  },
  cameraX: {
    value: 0,
    type: 'number',
    label: 'Camera X',
    group: 'Camera',
  },
  cameraY: {
    value: 3.5,
    type: 'number',
    label: 'Camera Y',
    group: 'Camera',
  },
  cameraZ: {
    value: 8.0,
    type: 'number',
    label: 'Camera Z',
    group: 'Camera',
  },

  // --- Visuals & Lighting ---
  ambientColor: {
    value: '#1e2040',
    type: 'color',
    label: 'Ambient Light Color',
    group: 'Visuals',
  },
  ambientIntensity: {
    value: 1.5,
    type: 'number',
    label: 'Ambient Intensity',
    group: 'Visuals',
    min: 0,
    max: 5,
    step: 0.1,
  },
  sunColor: {
    value: '#8ee6ff',
    type: 'color',
    label: 'Sun Color',
    group: 'Visuals',
  },
  sunIntensity: {
    value: 3.0,
    type: 'number',
    label: 'Sun Intensity',
    group: 'Visuals',
    min: 0,
    max: 8,
    step: 0.2,
  },
  hemiSkyColor: {
    value: '#34e1ff',
    type: 'color',
    label: 'Hemisphere Sky Color',
    group: 'Visuals',
  },
  hemiGroundColor: {
    value: '#1a0b38',
    type: 'color',
    label: 'Hemisphere Ground Color',
    group: 'Visuals',
  },
  hemiIntensity: {
    value: 0.8,
    type: 'number',
    label: 'Hemisphere Intensity',
    group: 'Visuals',
    min: 0,
    max: 2,
    step: 0.1,
  },

  // --- Rules & Gameplay ---
  startingShields: {
    value: 3,
    type: 'number',
    label: 'Escudos Iniciales',
    group: 'Rules',
    min: 1,
    max: 5,
    step: 1,
  },
  stasisDuration: {
    value: 10,
    type: 'number',
    label: 'Duración Éstasis (segundos)',
    group: 'Rules',
    min: 5,
    max: 20,
    step: 1,
  },
  portalTunnelSpeed: {
    value: 8,
    type: 'number',
    label: 'Velocidad de Avance Espacial',
    group: 'Rules',
    min: 4,
    max: 16,
    step: 1,
  },

  // --- Physics & Loop ---
  gravity: {
    value: 0,
    type: 'number',
    label: 'Gravity',
    group: 'Physics',
  },
  targetFPS: {
    value: 60,
    type: 'number',
    label: 'Target FPS',
    group: 'System',
  },
  stepMs: {
    value: 1000 / 60,
    type: 'number',
    label: 'Step MS',
    group: 'System',
  },
  maxSubSteps: {
    value: 5,
    type: 'number',
    label: 'Max Sub Steps',
    group: 'System',
  },
};

// Merge customized config values if present (injected by Playground)
const { playgroundConfig } = globalThis as {
  playgroundConfig?: Record<string, unknown>;
};
if (playgroundConfig) {
  for (const [key, value] of Object.entries(playgroundConfig)) {
    if (key in CONFIG) {
      Object.assign(CONFIG[key as keyof typeof CONFIG], { value });
    }
  }
}

/** Type helper for reading values in game code. */
export type ConfigKey = keyof typeof CONFIG;

/**
 * Gets a configuration value by key.
 * @param key The configuration key.
 * @return The configuration value.
 */
export function getConfig<K extends ConfigKey>(
  key: K,
): (typeof CONFIG)[K]['value'] {
  return CONFIG[key].value;
}

export const AVAILABLE_MUSIC_TRACKS: readonly MusicTrack[] = [
  {
    name: 'stellar_drift',
    url: 'https://storage.googleapis.com/assets-gen-playground/musiclibrary/stellar_drift.mp3',
    description: 'Spacious ambient synths for space exploration.',
  },
  {
    name: 'titan_clash',
    url: 'https://storage.googleapis.com/assets-gen-playground/musiclibrary/titan_clash.mp3',
    description: 'Relentless orchestral battle for the boss fight.',
  },
  {
    name: 'grid_runner',
    url: 'https://storage.googleapis.com/assets-gen-playground/musiclibrary/grid_runner.mp3',
    description: 'Fast paced high-energy sci-fi beat.',
  },
];
