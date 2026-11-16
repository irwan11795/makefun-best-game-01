// Boot and the one loop: input is read every frame, the world advances in fixed
// 1/60 s steps (several in a slow frame, none in a fast one, times the speed
// setting), and the renderer paints what is there. The game moves between four
// screens: title, play, paused and game over.
//
// ?seed=N fixes the random scatter. ?shot=start|play|late|victory|defeat (with
// &seed=N) stages that scene instead of running the loop, paints it twice and
// sets window.__shotReady for a screenshot.

import { BEST_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import {
  createGame, updateGame, handleClick, handleActions,
  EVENT_SHOOT, EVENT_KILL, EVENT_LEAK, EVENT_WAVE_START, EVENT_WAVE_CLEAR,
  EVENT_WIN, EVENT_LOSE, EVENT_BUILD, EVENT_UPGRADE,
  SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_OVER,
} from './game.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';
import { stageShot } from './shots.js';
import {
  setMuted, playShoot, playCoin, playLeak, playHorn, playVictory, playDefeat,
  playBuild, playUpgrade, playClick,
} from './audio.js';

/** The longest frame the loop catches up on; a longer stall is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const state = createGame(createRandom(seed));
const renderer = createRenderer(canvas, createRandom(seed ^ 0x9e3779b9));

// A handle for tests and screenshots: the live state, never the DOM.
window.__emberwatch = state;

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

/** Turn event bits into sounds. */
function soundEvents(events, towerKind) {
  if (events & EVENT_SHOOT) playShoot(towerKind ?? 'brazier');
  if (events & EVENT_KILL) playCoin();
  if (events & EVENT_LEAK) playLeak();
  if (events & EVENT_WAVE_START) playHorn();
  if (events & EVENT_WAVE_CLEAR) playUpgrade();
  if (events & EVENT_WIN) playVictory();
  if (events & EVENT_LOSE) playDefeat();
  if (events & EVENT_BUILD) playBuild();
  if (events & EVENT_UPGRADE) playUpgrade();
}

function runShot(name) {
  const scene = stageShot(name, state);
  const best = name === 'start' ? 0 : state.score;
  let painted = 0;
  function paint() {
    renderer.draw(state, scene.screen, best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) {
    status.textContent = message;
  }

  function syncMute() {
    setMuted(state.muted);
  }

  function handleClicks() {
    for (const click of input.takeClicks()) {
      playClick();
      const before = state.screen;
      handleClick(state, click.x, click.y);
      if (state.screen !== before) {
        if (state.screen === SCREEN_PLAY) announce(`Playing. Wave ${state.wave}.`);
        else if (state.screen === SCREEN_OVER) announce(state.won ? `Victory. Score ${state.score}.` : `Defeat. Score ${state.score}.`);
        else if (state.screen === SCREEN_PAUSED) announce('Paused.');
      }
      screen = state.screen;
      if (state.screen === SCREEN_OVER && state.score > best) {
        best = state.score;
        saveBest(best);
      }
    }
  }

  function handleKeys() {
    const actions = input.takeActions();
    if (!actions) return;
    const before = state.screen;
    const events = handleActions(state, actions);
    syncMute();
    soundEvents(events);
    if (state.screen !== before) {
      if (state.screen === SCREEN_PLAY) announce('Playing.');
      else if (state.screen === SCREEN_PAUSED) announce('Paused.');
      else if (state.screen === SCREEN_OVER) announce(state.won ? `Victory. Score ${state.score}.` : `Defeat. Score ${state.score}.`);
    }
    screen = state.screen;
    if (state.screen === SCREEN_OVER && state.score > best) {
      best = state.score;
      saveBest(best);
    }
  }

  function step() {
    const events = updateGame(state, STEP);
    soundEvents(events);
    if (state.screen === SCREEN_OVER && state.score > best) {
      best = state.score;
      saveBest(best);
    }
    screen = state.screen;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleClicks();
    handleKeys();
    if (screen === SCREEN_PLAY) {
      const steps = state.speed;
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        for (let i = 0; i < steps && screen === SCREEN_PLAY; i += 1) step();
        accumulator -= STEP;
      }
    } else if (screen === SCREEN_TITLE) {
      while (accumulator >= STEP) {
        updateGame(state, STEP);
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    renderer.draw(state, screen, best);
  }

  // Leaving the tab pauses a running game rather than letting wisps walk unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      state.screen = SCREEN_PAUSED;
      announce('Paused.');
    }
  });

  announce('Emberwatch. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
