// The screenshot scenes behind ?shot=start|play|late|victory|defeat. Each one
// plays the real rules forward with a simple autopilot — build the obvious
// towers, send each wave when the road is clear, upgrade when rich — so the
// frame is what a real game looks like, and the same seed gives the same frame.

import { STEP, TOTAL_WAVES, TOWER_TYPES } from './config.js';
import { handleClick, updateGame, SCREEN_TITLE, SCREEN_PLAY, SCREEN_OVER } from './game.js';
import { upgradeTower } from './towers.js';
import { PLOTS } from './path.js';

// The autopilot's build plan: plot index -> tower type, in the order it buys them.
// Spread across the road's segments, so every stretch is covered, not just the first.
const BUILD_PLAN = [
  [0, 'brazier'],
  [4, 'lantern'],
  [1, 'prism'],
  [7, 'mortar'],
  [2, 'brazier'],
  [8, 'lantern'],
  [10, 'prism'],
  [3, 'mortar'],
];

const UPGRADE_ORDER = [4, 0, 1, 7, 2, 8, 10, 3];

/** Buy the next planned tower, else upgrade the most valuable one, when rich. */
function autoBuy(state) {
  for (const [plot, type] of BUILD_PLAN) {
    if (state.towers.some((t) => t.plot === plot)) continue;
    if (state.embers < TOWER_TYPES[type].cost) return;
    state.selectedPlot = plot;
    state.buildChoice = type;
    handleClick(state, PLOTS[plot].x, PLOTS[plot].y);
    return;
  }
  if (state.embers >= 200) {
    for (const plot of UPGRADE_ORDER) {
      const tower = state.towers.find((t) => t.plot === plot);
      if (!tower || tower.level >= 3) continue;
      if (upgradeTower(state, tower)) return;
    }
  }
}

function stepFor(state, seconds) {
  const steps = Math.round(seconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    updateGame(state, STEP);
    if (state.screen === SCREEN_OVER) return;
  }
}

/** Run the game until `until` returns true (or the game ends), at most `maxSeconds`. */
function runUntil(state, until, maxSeconds, buy = true) {
  const maxSteps = Math.round(maxSeconds / STEP);
  for (let i = 0; i < maxSteps; i += 1) {
    if (buy) autoBuy(state);
    if (!state.waveActive && state.wave < TOTAL_WAVES && state.screen === SCREEN_PLAY) {
      handleClick(state, 1207, 768);
    }
    updateGame(state, STEP);
    if (state.screen === SCREEN_OVER) return;
    if (until(state)) return;
  }
}

/**
 * Set `state` to the named scene and return the screen to draw over it.
 * Scenes: start, play (mid wave 3), late (mid wave 7), victory, defeat.
 */
export function stageShot(name, state) {
  if (name === 'start') {
    stepFor(state, 6);
    return { screen: SCREEN_TITLE };
  }
  // Every other scene starts a real game.
  handleClick(state, 640, 400);
  if (name === 'defeat') {
    // No towers at all: the lighthouse falls fast, as a careless player finds.
    runUntil(state, () => state.screen === SCREEN_OVER, 300, false);
    return { screen: SCREEN_OVER };
  }
  if (name === 'play') {
    runUntil(state, (s) => s.wave === 3 && s.waveActive && s.enemies.length >= 4, 400);
    stepFor(state, 2);
    return { screen: SCREEN_PLAY };
  }
  if (name === 'late') {
    runUntil(state, (s) => s.wave === 7 && s.waveActive && s.enemies.length >= 6, 900);
    stepFor(state, 2);
    return { screen: SCREEN_PLAY };
  }
  // Victory: play the whole game out.
  runUntil(state, () => state.screen === SCREEN_OVER, 1800);
  return { screen: SCREEN_OVER };
}
