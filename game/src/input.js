// Input: pointer and keyboard. Clicks land on the canvas in logical field
// coordinates; the game decides what a click means (plot, tower, button).

import { FIELD, TOWER_ORDER } from './config.js';
import { plotAt } from './path.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_RESTART = 4;
export const ACTION_MUTE = 8;
export const ACTION_SPEED = 16;
export const ACTION_UPGRADE = 32;
export const ACTION_SELL = 64;
/** Bit for tower hotkey i (0 = key "1", 1 = key "2", ...). */
export function towerAction(i) {
  return 1 << (8 + i);
}

const KEY_ACTIONS = {
  ' ': ACTION_CONFIRM,
  Enter: ACTION_CONFIRM,
  p: ACTION_PAUSE,
  P: ACTION_PAUSE,
  Escape: ACTION_PAUSE,
  r: ACTION_RESTART,
  R: ACTION_RESTART,
  m: ACTION_MUTE,
  M: ACTION_MUTE,
  f: ACTION_SPEED,
  F: ACTION_SPEED,
  u: ACTION_UPGRADE,
  U: ACTION_UPGRADE,
  x: ACTION_SELL,
  X: ACTION_SELL,
};

export function createInput(canvas) {
  let actions = 0;
  let click = null;
  let hover = { x: -1, y: -1 };
  const queue = [];

  function toField(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    const ox = (rect.width - FIELD.width * scale) / 2;
    const oy = (rect.height - FIELD.height * scale) / 2;
    return {
      x: (event.clientX - rect.left - ox) / scale,
      y: (event.clientY - rect.top - oy) / scale,
    };
  }

  canvas.addEventListener('pointerdown', (event) => {
    event.preventDefault();
    click = toField(event);
    queue.push(click);
  });
  canvas.addEventListener('pointermove', (event) => {
    hover = toField(event);
  });
  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    const towerIndex = TOWER_ORDER.findIndex((key) => event.key === String(TOWER_ORDER.indexOf(key) + 1));
    if (towerIndex >= 0) {
      actions |= towerAction(towerIndex);
      return;
    }
    const action = KEY_ACTIONS[event.key];
    if (action) {
      actions |= action;
      event.preventDefault();
    }
  });

  return {
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    takeClicks() {
      const taken = queue.splice(0, queue.length);
      return taken;
    },
    hoverPlot() {
      return plotAt(hover.x, hover.y);
    },
    hover() {
      return hover;
    },
    clickAt(x, y) {
      return { x, y };
    },
  };
}
