// Emberwatch's heart: the state, the fixed-step update and what clicks and keys
// mean. No DOM here — the same code runs in the browser and in a headless
// balance test. Sounds and announcements come back as event bits.

import {
  STEP, START_EMBERS, LIGHTHOUSE_HP, TOTAL_WAVES, TOWER_TYPES, TOWER_ORDER,
} from './config.js';
import { plotAt, pointAt, PATH_LENGTH } from './path.js';
import { spawnEnemy, updateEnemies } from './enemies.js';
import { placeTower, upgradeTower, sellTower, updateTowers } from './towers.js';
import { fireShot, updateShots } from './projectiles.js';
import { startWave, updateSpawning, waveCleared, awardWaveClear } from './waves.js';
import { burst, floatText, updateParticles } from './particles.js';
import {
  ACTION_CONFIRM, ACTION_PAUSE, ACTION_RESTART, ACTION_MUTE, ACTION_SPEED,
  ACTION_UPGRADE, ACTION_SELL, towerAction,
} from './input.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export const EVENT_NONE = 0;
export const EVENT_SHOOT = 1;
export const EVENT_KILL = 2;
export const EVENT_LEAK = 4;
export const EVENT_WAVE_START = 8;
export const EVENT_WAVE_CLEAR = 16;
export const EVENT_WIN = 32;
export const EVENT_LOSE = 64;
export const EVENT_BUILD = 128;
export const EVENT_UPGRADE = 256;

const SEND_BUTTON = { x0: 1150, y0: 746, x1: 1264, y1: 790 };
const BAR_TOP = 736;

export function createGame(random) {
  return {
    random,
    time: 0,
    screen: SCREEN_TITLE,
    won: false,
    embers: START_EMBERS,
    score: 0,
    kills: 0,
    leaks: 0,
    wavesCleared: 0,
    wave: 0,
    waveActive: false,
    spawnQueue: [],
    spawnTimer: 0,
    spawnedCount: 0,
    waveTotal: 0,
    lighthouseHp: LIGHTHOUSE_HP,
    lighthouseMax: LIGHTHOUSE_HP,
    towers: [],
    enemies: [],
    ambient: [],
    shots: [],
    particles: [],
    floaters: [],
    shake: 0,
    speed: 1,
    muted: false,
    selectedPlot: -1,
    selectedTower: null,
    buildChoice: null,
    ambientTimer: 0,
  };
}

export function resetGame(state) {
  const fresh = createGame(state.random);
  fresh.muted = state.muted;
  fresh.speed = state.speed;
  Object.keys(fresh).forEach((k) => { state[k] = fresh[k]; });
}

function startPlaying(state) {
  resetGame(state);
  state.screen = SCREEN_PLAY;
}

function sendWave(state) {
  if (startWave(state)) return EVENT_WAVE_START;
  return EVENT_NONE;
}

function buildOnPlot(state, plotIndex, typeKey) {
  const tower = placeTower(state, plotIndex, typeKey);
  if (!tower) return EVENT_NONE;
  state.selectedPlot = -1;
  state.selectedTower = tower;
  state.buildChoice = null;
  burst(state, tower.x, tower.y, TOWER_TYPES[typeKey].color, 14, 90);
  return EVENT_BUILD;
}

/** What a click at field coordinates (x, y) does. Returns event bits. */
export function handleClick(state, x, y) {
  if (state.screen === SCREEN_TITLE || state.screen === SCREEN_OVER) {
    startPlaying(state);
    return EVENT_NONE;
  }
  if (state.screen === SCREEN_PAUSED) {
    state.screen = SCREEN_PLAY;
    return EVENT_NONE;
  }
  // HUD buttons: speed, then mute.
  if (y < 64) {
    if (x >= 1040 && x < 1100) state.speed = state.speed >= 3 ? 1 : state.speed + 1;
    else if (x >= 1100) state.muted = !state.muted;
    return EVENT_NONE;
  }
  // Send-wave button.
  if (x >= SEND_BUTTON.x0 && x <= SEND_BUTTON.x1 && y >= SEND_BUTTON.y0 && y <= SEND_BUTTON.y1) {
    return sendWave(state);
  }
  // Tower cards in the bottom bar.
  if (y >= BAR_TOP) {
    for (let i = 0; i < TOWER_ORDER.length; i += 1) {
      const x0 = 16 + i * 180;
      if (x >= x0 && x <= x0 + 168) {
        const key = TOWER_ORDER[i];
        state.buildChoice = key;
        if (state.selectedPlot >= 0) return buildOnPlot(state, state.selectedPlot, key);
        return EVENT_NONE;
      }
    }
    return EVENT_NONE;
  }
  // A tower on the field.
  for (const tower of state.towers) {
    if (Math.hypot(x - tower.x, y - tower.y) <= 26) {
      state.selectedTower = tower;
      state.selectedPlot = -1;
      return EVENT_NONE;
    }
  }
  // A plot on the field.
  const plot = plotAt(x, y);
  if (plot >= 0) {
    const tower = state.towers.find((t) => t.plot === plot);
    if (tower) {
      state.selectedTower = tower;
      state.selectedPlot = -1;
    } else {
      state.selectedPlot = plot;
      state.selectedTower = null;
      if (state.buildChoice) return buildOnPlot(state, plot, state.buildChoice);
    }
    return EVENT_NONE;
  }
  state.selectedPlot = -1;
  state.selectedTower = null;
  return EVENT_NONE;
}

/** What keys do. Returns event bits. */
export function handleActions(state, actions) {
  let events = EVENT_NONE;
  if (actions & ACTION_MUTE) state.muted = !state.muted;
  if (actions & ACTION_SPEED) state.speed = state.speed >= 3 ? 1 : state.speed + 1;
  if (actions & ACTION_PAUSE) {
    if (state.screen === SCREEN_PLAY) state.screen = SCREEN_PAUSED;
    else if (state.screen === SCREEN_PAUSED) state.screen = SCREEN_PLAY;
  }
  if (actions & ACTION_RESTART && state.screen === SCREEN_OVER) startPlaying(state);
  if (actions & ACTION_CONFIRM) {
    if (state.screen === SCREEN_TITLE || state.screen === SCREEN_OVER) startPlaying(state);
    else if (state.screen === SCREEN_PAUSED) state.screen = SCREEN_PLAY;
    else if (state.screen === SCREEN_PLAY) events |= sendWave(state);
  }
  if (state.screen !== SCREEN_PLAY) return events;
  for (let i = 0; i < TOWER_ORDER.length; i += 1) {
    if (actions & towerAction(i)) {
      const key = TOWER_ORDER[i];
      state.buildChoice = key;
      if (state.selectedPlot >= 0) events |= buildOnPlot(state, state.selectedPlot, key);
    }
  }
  if (actions & ACTION_UPGRADE && state.selectedTower) {
    if (upgradeTower(state, state.selectedTower)) events |= EVENT_UPGRADE;
  }
  if (actions & ACTION_SELL && state.selectedTower) {
    sellTower(state, state.selectedTower);
    state.selectedTower = null;
  }
  return events;
}

/** Move the title screen's ambient wisps along the road; they never hurt anyone. */
function stepAmbient(state, dt) {
  // Ambient wisps only gather on the title screen; stragglers walk off elsewhere.
  if (state.screen === SCREEN_TITLE) {
    state.ambientTimer -= dt;
    if (state.ambientTimer <= 0 && state.ambient.length < 5) {
      state.ambientTimer = 1.4;
      const wisp = spawnEnemy('wisp', 1, state.random);
      wisp.dist = 0;
      state.ambient.push(wisp);
    }
  }
  for (const e of state.ambient) {
    e.dist += e.speed * 0.7 * dt;
    const p = pointAt(Math.max(0, e.dist));
    e.x = p.x;
    e.y = p.y;
  }
  state.ambient = state.ambient.filter((e) => e.dist < PATH_LENGTH);
}

/** One fixed step (STEP seconds). Returns event bits for sounds. */
export function updateGame(state, dt = STEP) {
  let events = EVENT_NONE;
  state.time += dt;
  stepAmbient(state, dt);
  updateParticles(state, dt);
  if (state.screen !== SCREEN_PLAY) return events;

  updateSpawning(state, dt);
  updateTowers(state, dt, (tower, target, st) => {
    fireShot(state, tower, target, st);
    events |= EVENT_SHOOT;
  });
  const hits = updateShots(state, dt);
  for (const hit of hits) {
    if (hit.splash) burst(state, hit.x, hit.y, hit.color, 10, 140);
    else burst(state, hit.x, hit.y, hit.color, 4, 80);
    if (hit.killed) {
      state.embers += hit.bounty;
      state.score += hit.bounty * 10 + state.wave;
      state.kills += 1;
      floatText(state, hit.x, hit.y - 14, `+${hit.bounty}`, '#facc15');
      events |= EVENT_KILL;
    }
  }
  const leaked = updateEnemies(state, dt);
  for (const e of leaked) {
    state.lighthouseHp -= e.leak;
    state.leaks += 1;
    state.shake = 1;
    burst(state, e.x, e.y, '#f87171', 16, 160);
    events |= EVENT_LEAK;
    if (state.lighthouseHp <= 0) {
      state.lighthouseHp = 0;
      state.screen = SCREEN_OVER;
      state.won = false;
      state.floaters = [];
      return events | EVENT_LOSE;
    }
  }
  if (waveCleared(state)) {
    const bonus = awardWaveClear(state);
    state.wavesCleared += 1;
    floatText(state, 640, 200, `Wave ${state.wave} cleared! +${bonus} embers`, '#facc15');
    events |= EVENT_WAVE_CLEAR;
    if (state.wave >= TOTAL_WAVES) {
      state.screen = SCREEN_OVER;
      state.won = true;
      state.floaters = [];
      return events | EVENT_WIN;
    }
  }
  return events;
}
