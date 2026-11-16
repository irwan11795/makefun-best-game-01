// Enemies: what walks the road. An enemy is a distance along the path plus its
// own health, speed and slow timer; the renderer reads the same fields.

import { ENEMY_TYPES, enemyHpFor } from './config.js';
import { PATH_LENGTH, pointAt } from './path.js';

let nextId = 1;

/** Make one enemy of `kind` for `wave`, standing just off the path start. */
export function spawnEnemy(kind, wave, random) {
  const def = ENEMY_TYPES[kind];
  const jitter = (random() - 0.5) * 14;
  return {
    id: nextId,
    kind,
    name: def.name,
    x: -30 + jitter * 0.2,
    y: 150 + jitter,
    dist: -20 - random() * 10,
    hp: enemyHpFor(kind, wave),
    maxHp: enemyHpFor(kind, wave),
    speed: def.speed,
    bounty: def.bounty,
    leak: def.leak,
    radius: def.radius,
    regen: def.regen,
    splits: def.splits,
    color: def.color,
    slowUntil: 0,
    slowFactor: 0,
    flash: 0,
    wobble: random() * Math.PI * 2,
    dead: false,
    leaked: false,
  };
}

/** Advance every enemy one step; returns the ones that reached the lighthouse. */
export function updateEnemies(state, dt) {
  const leaked = [];
  for (const e of state.enemies) {
    if (e.dead || e.leaked) continue;
    if (e.regen > 0 && e.hp < e.maxHp) e.hp = Math.min(e.maxHp, e.hp + e.regen * dt);
    const slowed = state.time < e.slowUntil;
    const speed = e.speed * (slowed ? 1 - e.slowFactor : 1);
    e.dist += speed * dt;
    if (e.flash > 0) e.flash = Math.max(0, e.flash - dt * 6);
    if (e.dist >= PATH_LENGTH) {
      e.leaked = true;
      leaked.push(e);
      continue;
    }
    const p = pointAt(e.dist);
    e.wobble += dt * 3;
    e.x = p.x + Math.sin(e.wobble) * 3;
    e.y = p.y + Math.cos(e.wobble * 0.8) * 3;
  }
  state.enemies = state.enemies.filter((e) => !e.dead && !e.leaked);
  return leaked;
}

/** Hurt one enemy; returns true when it died. */
export function damageEnemy(e, amount, state) {
  e.hp -= amount;
  e.flash = 1;
  if (e.hp > 0) return false;
  e.dead = true;
  if (e.splits) {
    for (let i = 0; i < 2; i += 1) {
      const mite = spawnEnemy(e.splits, state.wave, state.random);
      mite.dist = Math.max(0, e.dist - 12 - i * 10);
      const p = pointAt(mite.dist);
      mite.x = p.x;
      mite.y = p.y;
      state.enemies.push(mite);
    }
  }
  return true;
}
