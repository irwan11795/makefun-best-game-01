// Emberwatch: every number that tunes the game lives here, so balance is one file.
// Palette: a deep indigo night, warm amber lantern light, teal shadow wisps.

export const FIELD = { width: 1280, height: 800 };
export const HUD_HEIGHT = 64;
export const BAR_HEIGHT = 64;
export const STEP = 1 / 60;
export const BEST_KEY = 'emberwatch-best-score';

export const START_EMBERS = 170;
export const LIGHTHOUSE_HP = 20;
export const TOTAL_WAVES = 10;
export const SELL_RATE = 0.7;

export const PALETTE = {
  night: '#0b1026',
  nightDeep: '#070a1a',
  ground: '#11173a',
  groundAlt: '#0e1330',
  path: '#2a335f',
  pathEdge: '#3d4a7d',
  plot: '#1a2148',
  plotRing: '#4a5a9e',
  amber: '#ffb347',
  amberBright: '#ffd27a',
  ember: '#ff7a3c',
  teal: '#5eead4',
  wisp: '#7dd3fc',
  wraith: '#c4b5fd',
  bulwark: '#94a3b8',
  swift: '#fda4af',
  herald: '#f472b6',
  mite: '#bae6fd',
  white: '#f8fafc',
  dim: '#94a3b8',
  red: '#f87171',
  green: '#4ade80',
  gold: '#facc15',
};

// Towers: key, name, cost, range, damage, shots per second, projectile speed,
// splash radius (0 = single target), slow factor + slow seconds (0 = none).
export const TOWER_TYPES = {
  brazier: {
    key: 'brazier', name: 'Brazier', hotkey: '1', cost: 60,
    range: 115, damage: 8, rate: 3.2, shotSpeed: 520, splash: 0, slow: 0, slowSecs: 0,
    blurb: 'Fast little flame. Shreds swarms.',
    color: '#ff7a3c',
    levels: [
      { damage: 8, range: 115, rate: 3.2, cost: 60 },
      { damage: 12, range: 125, rate: 3.2, cost: 50 },
      { damage: 18, range: 135, rate: 3.6, cost: 80 },
    ],
  },
  lantern: {
    key: 'lantern', name: 'Lantern', hotkey: '2', cost: 100,
    range: 145, damage: 5, rate: 1.2, shotSpeed: 460, splash: 0, slow: 0.45, slowSecs: 1.6,
    blurb: 'Cold light that slows the dark.',
    color: '#5eead4',
    levels: [
      { damage: 5, range: 145, rate: 1.2, slow: 0.45, cost: 100 },
      { damage: 9, range: 155, rate: 1.3, slow: 0.5, cost: 80 },
      { damage: 14, range: 170, rate: 1.5, slow: 0.6, cost: 120 },
    ],
  },
  prism: {
    key: 'prism', name: 'Prism', hotkey: '3', cost: 160,
    range: 225, damage: 34, rate: 0.7, shotSpeed: 900, splash: 0, slow: 0, slowSecs: 0,
    blurb: 'One long, heavy beam of dawn.',
    color: '#ffd27a',
    levels: [
      { damage: 34, range: 225, rate: 0.7, cost: 160 },
      { damage: 54, range: 235, rate: 0.75, cost: 130 },
      { damage: 84, range: 250, rate: 0.8, cost: 190 },
    ],
  },
  mortar: {
    key: 'mortar', name: 'Ember Mortar', hotkey: '4', cost: 180,
    range: 195, damage: 22, rate: 0.5, shotSpeed: 380, splash: 55, slow: 0, slowSecs: 0,
    blurb: 'Lobs burning embers. Splashes.',
    color: '#f472b6',
    levels: [
      { damage: 22, range: 195, rate: 0.5, splash: 55, cost: 180 },
      { damage: 36, range: 205, rate: 0.55, splash: 65, cost: 140 },
      { damage: 54, range: 215, rate: 0.6, splash: 80, cost: 200 },
    ],
  },
};

export const TOWER_ORDER = ['brazier', 'lantern', 'prism', 'mortar'];

// Enemies: hp, speed (px/s), bounty in embers, lighthouse damage on leak,
// radius, regen per second, splits into this kind on death (0 = none).
export const ENEMY_TYPES = {
  wisp: { key: 'wisp', name: 'Wisp', hp: 30, speed: 55, bounty: 6, leak: 1, radius: 11, regen: 0, splits: null, color: '#7dd3fc' },
  swift: { key: 'swift', name: 'Swift', hp: 22, speed: 96, bounty: 8, leak: 1, radius: 9, regen: 0, splits: null, color: '#fda4af' },
  bulwark: { key: 'bulwark', name: 'Bulwark', hp: 150, speed: 32, bounty: 14, leak: 2, radius: 16, regen: 0, splits: null, color: '#94a3b8' },
  splitter: { key: 'splitter', name: 'Splitter', hp: 52, speed: 60, bounty: 10, leak: 1, radius: 13, regen: 0, splits: 'mite', color: '#a78bfa' },
  mite: { key: 'mite', name: 'Mite', hp: 12, speed: 82, bounty: 2, leak: 1, radius: 7, regen: 0, splits: null, color: '#bae6fd' },
  wraith: { key: 'wraith', name: 'Wraith', hp: 72, speed: 76, bounty: 12, leak: 1, radius: 12, regen: 3, splits: null, color: '#c4b5fd' },
  herald: { key: 'herald', name: 'Dread Herald', hp: 1250, speed: 26, bounty: 150, leak: 10, radius: 26, regen: 0, splits: null, color: '#f472b6' },
};

// Enemy hp grows 12% per wave after the first, so late waves need upgrades, not more towers.
export function enemyHpFor(kind, wave) {
  return Math.round(ENEMY_TYPES[kind].hp * (1 + 0.12 * (wave - 1)));
}

// Each wave: a list of [kind, count] in spawn order groups, spawned 0.7 s apart.
export const WAVE_TABLE = [
  [['wisp', 7]],
  [['wisp', 10]],
  [['wisp', 8], ['swift', 6]],
  [['wisp', 10], ['swift', 8], ['bulwark', 2]],
  [['swift', 12], ['bulwark', 4], ['splitter', 4]],
  [['wisp', 10], ['swift', 10], ['bulwark', 6], ['splitter', 4]],
  [['swift', 8], ['bulwark', 8], ['splitter', 6], ['wraith', 4]],
  [['swift', 14], ['splitter', 8], ['wraith', 8], ['bulwark', 4]],
  [['bulwark', 10], ['splitter', 10], ['wraith', 10], ['swift', 6]],
  [['herald', 1], ['wraith', 8], ['splitter', 6], ['bulwark', 6]],
];

export function waveClearBonus(wave) {
  return 25 + 5 * wave;
}

export function upgradeCost(typeKey, level) {
  // level is the level being bought (2 or 3).
  return TOWER_TYPES[typeKey].levels[level - 1].cost;
}
