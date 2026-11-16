// Particles and floating text: the sparks, embers and "+6" popups that make every
// hit, kill and leak feel answered at once.

export function burst(state, x, y, color, count, speed = 120) {
  for (let i = 0; i < count; i += 1) {
    const a = state.random() * Math.PI * 2;
    const v = speed * (0.4 + state.random() * 0.8);
    state.particles.push({
      x, y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - 30,
      life: 0.5 + state.random() * 0.4,
      maxLife: 0.9,
      size: 2 + state.random() * 3,
      color,
    });
  }
}

export function floatText(state, x, y, text, color) {
  state.floaters.push({ x, y, text, color, life: 1.1, maxLife: 1.1 });
}

export function updateParticles(state, dt) {
  for (const p of state.particles) {
    p.life -= dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 160 * dt;
  }
  state.particles = state.particles.filter((p) => p.life > 0);
  for (const f of state.floaters) {
    f.life -= dt;
    f.y -= 34 * dt;
  }
  state.floaters = state.floaters.filter((f) => f.life > 0);
  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt * 2.2);
}
