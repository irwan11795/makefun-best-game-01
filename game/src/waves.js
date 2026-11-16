// Waves: what each wave sends, and when. A wave is groups of enemies spawned
// 0.7 s apart; the wave is cleared when the queue is empty and no enemy lives.

import { WAVE_TABLE, waveClearBonus } from './config.js';
import { spawnEnemy } from './enemies.js';

export function waveSize(wave) {
  return WAVE_TABLE[wave - 1].reduce((sum, [, count]) => sum + count, 0);
}

export function startWave(state) {
  if (state.waveActive || state.wave > 10) return false;
  state.wave += 1;
  state.waveActive = true;
  state.spawnQueue = [];
  for (const [kind, count] of WAVE_TABLE[state.wave - 1]) {
    for (let i = 0; i < count; i += 1) state.spawnQueue.push(kind);
  }
  state.spawnTimer = 0.4;
  state.spawnedCount = 0;
  state.waveTotal = state.spawnQueue.length;
  return true;
}

export function updateSpawning(state, dt) {
  if (!state.waveActive || state.spawnQueue.length === 0) return;
  state.spawnTimer -= dt;
  if (state.spawnTimer > 0) return;
  state.spawnTimer = 0.7;
  const kind = state.spawnQueue.shift();
  state.enemies.push(spawnEnemy(kind, state.wave, state.random));
  state.spawnedCount += 1;
}

export function waveCleared(state) {
  return state.waveActive && state.spawnQueue.length === 0 && state.enemies.length === 0;
}

export function awardWaveClear(state) {
  const bonus = waveClearBonus(state.wave);
  state.embers += bonus;
  state.score += 50 * state.wave;
  state.waveActive = false;
  return bonus;
}
