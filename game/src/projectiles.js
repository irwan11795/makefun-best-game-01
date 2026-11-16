// Projectiles: the glowing shots towers fire. A shot chases its target; on arrival
// it lands its damage (and splash, for the mortar) and tells the game what happened.

import { damageEnemy } from './enemies.js';

export function fireShot(state, tower, target, st) {
  state.shots.push({
    x: tower.x,
    y: tower.y - 14,
    target,
    speed: st.shotSpeed,
    damage: st.damage,
    splash: st.splash,
    slow: st.slow,
    slowSecs: st.slowSecs,
    color: st.color,
    kind: tower.type,
    dead: false,
  });
}

/** Move shots; returns a list of hit reports {x, y, killed, bounty, color, splash}. */
export function updateShots(state, dt) {
  const hits = [];
  for (const s of state.shots) {
    if (s.dead) continue;
    if (s.target.dead || s.target.leaked) {
      s.dead = true;
      continue;
    }
    const dx = s.target.x - s.x;
    const dy = s.target.y - s.y;
    const d = Math.hypot(dx, dy);
    const step = s.speed * dt;
    if (d <= step + s.target.radius * 0.5) {
      s.dead = true;
      if (s.splash > 0) {
        for (const e of state.enemies) {
          if (e.dead || e.leaked) continue;
          if (Math.hypot(e.x - s.target.x, e.y - s.target.y) <= s.splash + e.radius) {
            const killed = damageEnemy(e, s.damage, state);
            if (killed) hits.push({ x: e.x, y: e.y, killed: true, bounty: e.bounty, color: e.color });
          }
        }
        hits.push({ x: s.target.x, y: s.target.y, killed: false, bounty: 0, color: s.color, splash: s.splash });
      } else {
        const killed = damageEnemy(s.target, s.damage, state);
        if (s.slow > 0 && !s.target.dead) {
          s.target.slowUntil = state.time + s.slowSecs;
          s.target.slowFactor = s.slow;
        }
        hits.push({ x: s.target.x, y: s.target.y, killed, bounty: killed ? s.target.bounty : 0, color: s.color });
      }
      continue;
    }
    s.x += (dx / d) * step;
    s.y += (dy / d) * step;
  }
  state.shots = state.shots.filter((s) => !s.dead);
  return hits;
}
