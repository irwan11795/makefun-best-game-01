// Towers: what the player builds on plots. A tower is its type, level, plot and
// cooldown; targeting picks the enemy furthest along the road in range.

import { TOWER_TYPES, upgradeCost } from './config.js';
import { PLOTS } from './path.js';

export function towerStats(typeKey, level) {
  const def = TOWER_TYPES[typeKey];
  const lv = def.levels[level - 1];
  return {
    key: typeKey,
    name: def.name,
    color: def.color,
    range: lv.range,
    damage: lv.damage,
    rate: lv.rate,
    splash: lv.splash ?? 0,
    slow: lv.slow ?? 0,
    slowSecs: def.slowSecs,
    shotSpeed: def.shotSpeed,
  };
}

export function placeTower(state, plotIndex, typeKey) {
  const def = TOWER_TYPES[typeKey];
  if (state.embers < def.cost) return null;
  if (state.towers.some((t) => t.plot === plotIndex)) return null;
  state.embers -= def.cost;
  const tower = {
    plot: plotIndex,
    x: PLOTS[plotIndex].x,
    y: PLOTS[plotIndex].y,
    type: typeKey,
    level: 1,
    cooldown: 0,
    angle: -Math.PI / 2,
    flash: 0,
  };
  state.towers.push(tower);
  return tower;
}

export function upgradeTower(state, tower) {
  if (tower.level >= 3) return false;
  const cost = upgradeCost(tower.type, tower.level + 1);
  if (state.embers < cost) return false;
  state.embers -= cost;
  tower.level += 1;
  tower.flash = 1;
  return true;
}

export function sellTower(state, tower) {
  const def = TOWER_TYPES[tower.type];
  let spent = def.cost;
  for (let lv = 2; lv <= tower.level; lv += 1) spent += upgradeCost(tower.type, lv);
  state.embers += Math.floor(spent * 0.7);
  state.towers = state.towers.filter((t) => t !== tower);
}

/** The enemy furthest along the road inside this tower's range, or null. */
export function pickTarget(tower, enemies) {
  const st = towerStats(tower.type, tower.level);
  let best = null;
  for (const e of enemies) {
    if (e.dead || e.leaked) continue;
    const d = Math.hypot(e.x - tower.x, e.y - tower.y);
    if (d <= st.range + e.radius && (best === null || e.dist > best.dist)) best = e;
  }
  return best;
}

export function updateTowers(state, dt, fire) {
  for (const tower of state.towers) {
    tower.cooldown -= dt;
    if (tower.flash > 0) tower.flash = Math.max(0, tower.flash - dt * 4);
    if (tower.cooldown > 0) continue;
    const target = pickTarget(tower, state.enemies);
    if (!target) continue;
    const st = towerStats(tower.type, tower.level);
    tower.angle = Math.atan2(target.y - tower.y, target.x - tower.x);
    tower.cooldown = 1 / st.rate;
    tower.flash = 1;
    fire(tower, target, st);
  }
}
