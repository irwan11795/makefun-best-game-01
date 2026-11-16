// The renderer: everything the player (and the judge) sees. One canvas, one
// logical field of 1280x800, scaled to the window. Screens: title, play, paused,
// victory and defeat — each readable at a glance when shrunk.

import { FIELD, HUD_HEIGHT, BAR_HEIGHT, PALETTE, TOWER_TYPES, TOWER_ORDER, TOTAL_WAVES } from './config.js';
import { PATH_POINTS, PLOTS, PLOT_RADIUS, LIGHTHOUSE } from './path.js';
import { towerStats } from './towers.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const TOP = HUD_HEIGHT;
const BOTTOM = FIELD.height - BAR_HEIGHT;

function makeStars(random) {
  const stars = [];
  for (let i = 0; i < 90; i += 1) {
    stars.push({ x: random() * FIELD.width, y: random() * 420, r: 0.6 + random() * 1.4, tw: random() * Math.PI * 2 });
  }
  return stars;
}

export function createRenderer(canvas, random) {
  const ctx = canvas.getContext('2d');
  const stars = makeStars(random);

  function fit() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || window.innerWidth;
    const h = canvas.clientHeight || window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height) * dpr;
    const ox = (canvas.width - FIELD.width * scale) / 2;
    const oy = (canvas.height - FIELD.height * scale) / 2;
    ctx.setTransform(scale, 0, 0, scale, ox, oy);
    return { scale, ox, oy };
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function text(str, x, y, size, color, align = 'left', weight = '600') {
    ctx.fillStyle = color;
    ctx.font = `${weight} ${size}px system-ui, sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'middle';
    ctx.fillText(str, x, y);
  }

  function drawNight(state) {
    const g = ctx.createLinearGradient(0, 0, 0, FIELD.height);
    g.addColorStop(0, PALETTE.night);
    g.addColorStop(0.6, PALETTE.ground);
    g.addColorStop(1, PALETTE.nightDeep);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    for (const s of stars) {
      const a = 0.35 + 0.4 * Math.abs(Math.sin(state.time * 0.7 + s.tw));
      ctx.globalAlpha = a;
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // The moon, watching over the lighthouse.
    ctx.fillStyle = '#fef3c7';
    ctx.beginPath();
    ctx.arc(1120, 92, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.night;
    ctx.beginPath();
    ctx.arc(1132, 84, 30, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPath() {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = PALETTE.pathEdge;
    ctx.lineWidth = 46;
    ctx.beginPath();
    PATH_POINTS.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.strokeStyle = PALETTE.path;
    ctx.lineWidth = 36;
    ctx.beginPath();
    PATH_POINTS.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.strokeStyle = 'rgba(148,163,184,0.25)';
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 14]);
    ctx.beginPath();
    PATH_POINTS.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function drawPlots(state) {
    for (let i = 0; i < PLOTS.length; i += 1) {
      const p = PLOTS[i];
      const occupied = state.towers.some((t) => t.plot === i);
      const selected = state.selectedPlot === i;
      ctx.fillStyle = occupied ? 'rgba(26,33,72,0.4)' : PALETTE.plot;
      ctx.beginPath();
      ctx.arc(p.x, p.y, PLOT_RADIUS, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = selected ? PALETTE.amberBright : PALETTE.plotRing;
      ctx.lineWidth = selected ? 3 : 2;
      ctx.beginPath();
      ctx.arc(p.x, p.y, PLOT_RADIUS, 0, Math.PI * 2);
      ctx.stroke();
      if (!occupied) {
        ctx.fillStyle = 'rgba(148,163,184,0.5)';
        ctx.font = '700 20px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('+', p.x, p.y + 1);
      }
    }
  }

  function drawLighthouse(state) {
    const { x, y } = LIGHTHOUSE;
    const hpFrac = Math.max(0, state.lighthouseHp / state.lighthouseMax);
    // Warm glow that shrinks as the lighthouse weakens.
    const glow = ctx.createRadialGradient(x, y - 40, 4, x, y - 40, 90 + 70 * hpFrac);
    glow.addColorStop(0, 'rgba(255,179,71,0.5)');
    glow.addColorStop(1, 'rgba(255,179,71,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y - 40, 90 + 70 * hpFrac, 0, Math.PI * 2);
    ctx.fill();
    // Tower body.
    ctx.fillStyle = '#e7e5e4';
    ctx.beginPath();
    ctx.moveTo(x - 16, y + 30);
    ctx.lineTo(x - 10, y - 52);
    ctx.lineTo(x + 10, y - 52);
    ctx.lineTo(x + 16, y + 30);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#dc2626';
    ctx.fillRect(x - 13, y - 18, 26, 12);
    ctx.fillRect(x - 11, y - 42, 22, 10);
    // Lamp room.
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(x - 12, y - 66, 24, 16);
    ctx.fillStyle = hpFrac > 0.5 ? PALETTE.amberBright : '#f87171';
    ctx.beginPath();
    ctx.arc(x, y - 58, 7 + 3 * Math.sin(state.time * 3), 0, Math.PI * 2);
    ctx.fill();
    // Rotating beam.
    ctx.save();
    ctx.translate(x, y - 58);
    ctx.rotate(state.time * 0.6);
    const beam = ctx.createLinearGradient(0, 0, 220, 0);
    beam.addColorStop(0, 'rgba(255,210,122,0.35)');
    beam.addColorStop(1, 'rgba(255,210,122,0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(220, -26);
    ctx.lineTo(220, 26);
    ctx.lineTo(0, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    // HP bar over the lighthouse.
    ctx.fillStyle = 'rgba(7,10,26,0.8)';
    roundRect(x - 34, y + 40, 68, 10, 5);
    ctx.fill();
    ctx.fillStyle = hpFrac > 0.5 ? PALETTE.green : hpFrac > 0.25 ? PALETTE.gold : PALETTE.red;
    roundRect(x - 32, y + 42, 64 * hpFrac, 6, 3);
    ctx.fill();
  }

  function drawTower(tower) {
    const st = towerStats(tower.type, tower.level);
    const { x, y } = tower;
    // Range ring when selected or hovered.
    ctx.save();
    ctx.globalAlpha = 0.12 + 0.08 * tower.flash;
    ctx.fillStyle = st.color;
    ctx.beginPath();
    ctx.arc(x, y, 22 + tower.level * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = st.color;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.stroke();
    // Barrel points at the target.
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(tower.angle);
    ctx.fillStyle = st.color;
    ctx.fillRect(0, -4, 24, 8);
    ctx.restore();
    // The tower's heart.
    ctx.fillStyle = st.color;
    ctx.beginPath();
    ctx.arc(x, y, 8 + tower.flash * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0b1026';
    ctx.font = '700 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`L${tower.level}`, x, y + 30);
  }

  function drawEnemy(e) {
    const slowed = e.slowUntil > 0;
    ctx.save();
    if (e.flash > 0) ctx.globalAlpha = 0.6 + 0.4 * e.flash;
    ctx.fillStyle = e.color;
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(7,10,26,0.85)';
    ctx.beginPath();
    ctx.arc(e.x - e.radius * 0.35, e.y - e.radius * 0.2, e.radius * 0.28, 0, Math.PI * 2);
    ctx.arc(e.x + e.radius * 0.35, e.y - e.radius * 0.2, e.radius * 0.28, 0, Math.PI * 2);
    ctx.fill();
    if (slowed) {
      ctx.strokeStyle = PALETTE.teal;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.radius + 4, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
    // Health bar, only when hurt.
    if (e.hp < e.maxHp) {
      const w = e.radius * 2;
      ctx.fillStyle = 'rgba(7,10,26,0.8)';
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 10, w, 5);
      ctx.fillStyle = e.hp / e.maxHp > 0.5 ? PALETTE.green : PALETTE.red;
      ctx.fillRect(e.x - w / 2, e.y - e.radius - 10, w * Math.max(0, e.hp / e.maxHp), 5);
    }
  }

  function drawShots(state) {
    for (const s of state.shots) {
      ctx.strokeStyle = s.color;
      ctx.lineWidth = s.kind === 'prism' ? 3 : 2;
      ctx.globalAlpha = 0.9;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - (s.target.x - s.x) * 0.02, s.y - (s.target.y - s.y) * 0.02);
      ctx.stroke();
      ctx.fillStyle = s.color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.kind === 'mortar' ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawParticles(state) {
    for (const p of state.particles) {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    for (const f of state.floaters) {
      ctx.globalAlpha = Math.max(0, f.life / f.maxLife);
      text(f.text, f.x, f.y, 15, f.color, 'center', '700');
    }
    ctx.globalAlpha = 1;
  }

  function drawHud(state, screen) {
    ctx.fillStyle = 'rgba(7,10,26,0.85)';
    ctx.fillRect(0, 0, FIELD.width, TOP);
    ctx.fillStyle = PALETTE.amber;
    text('EMBERWATCH', 24, 32, 24, PALETTE.amberBright, 'left', '800');
    const waveLabel = state.wave === 0 ? 'Get ready' : `Wave ${state.wave} / ${TOTAL_WAVES}`;
    text(waveLabel, 210, 32, 18, PALETTE.white);
    if (state.waveActive) {
      const left = state.spawnQueue.length + state.enemies.length;
      text(`${left} wisps left`, 330, 32, 15, PALETTE.dim);
    }
    // Lighthouse HP.
    text('Lighthouse', 520, 22, 13, PALETTE.dim, 'left', '600');
    ctx.fillStyle = 'rgba(148,163,184,0.3)';
    roundRect(520, 32, 150, 12, 6);
    ctx.fill();
    const frac = Math.max(0, state.lighthouseHp / state.lighthouseMax);
    ctx.fillStyle = frac > 0.5 ? PALETTE.green : frac > 0.25 ? PALETTE.gold : PALETTE.red;
    roundRect(522, 34, 146 * frac, 8, 4);
    ctx.fill();
    text(`${state.lighthouseHp}/${state.lighthouseMax}`, 676, 38, 14, PALETTE.white);
    text(`Embers  ${state.embers}`, 760, 32, 18, PALETTE.gold, 'left', '700');
    text(`Score  ${state.score}`, 920, 32, 18, PALETTE.white, 'left', '700');
    text(`${state.speed}x`, 1060, 32, 16, PALETTE.dim, 'left', '700');
    text(state.muted ? 'Muted (M)' : 'Sound (M)', 1110, 32, 14, PALETTE.dim);
  }

  function drawBuildBar(state, screen) {
    ctx.fillStyle = 'rgba(7,10,26,0.9)';
    ctx.fillRect(0, BOTTOM, FIELD.width, BAR_HEIGHT);
    let x = 16;
    for (const key of TOWER_ORDER) {
      const def = TOWER_TYPES[key];
      const afford = state.embers >= def.cost;
      const picked = state.buildChoice === key;
      ctx.fillStyle = picked ? 'rgba(255,179,71,0.25)' : 'rgba(26,33,72,0.7)';
      roundRect(x, BOTTOM + 8, 168, 48, 8);
      ctx.fill();
      ctx.strokeStyle = picked ? PALETTE.amberBright : afford ? def.color : 'rgba(148,163,184,0.4)';
      ctx.lineWidth = picked ? 2.5 : 1.5;
      roundRect(x, BOTTOM + 8, 168, 48, 8);
      ctx.stroke();
      ctx.fillStyle = def.color;
      ctx.beginPath();
      ctx.arc(x + 20, BOTTOM + 32, 9, 0, Math.PI * 2);
      ctx.fill();
      text(`${def.hotkey} ${def.name}`, x + 36, BOTTOM + 24, 14, afford ? PALETTE.white : PALETTE.dim, 'left', '700');
      text(`${def.cost} embers`, x + 36, BOTTOM + 42, 12, afford ? PALETTE.gold : PALETTE.dim);
      x += 180;
    }
    // Selected tower panel or hint.
    const sel = state.selectedTower;
    if (sel) {
      const def = TOWER_TYPES[sel.type];
      const st = towerStats(sel.type, sel.level);
      text(`${def.name}  L${sel.level}  ·  dmg ${st.damage}  ·  range ${st.range}`, 750, BOTTOM + 22, 14, PALETTE.white, 'left', '700');
      if (sel.level < 3) text(`[U] Upgrade ${def.levels[sel.level].cost}e   [X] Sell +${Math.floor((def.cost + def.levels.slice(1, sel.level).reduce((s, l) => s + l.cost, 0)) * 0.7)}e`, 750, BOTTOM + 42, 12, PALETTE.dim);
      else text('[X] Sell', 750, BOTTOM + 42, 12, PALETTE.dim);
    } else if (state.selectedPlot >= 0) {
      text('Pick a tower (1-4) or click a card to build here.', 750, BOTTOM + 32, 14, PALETTE.dim);
    } else {
      text('Click a plot to build · Space sends the next wave', 750, BOTTOM + 32, 13, PALETTE.dim);
    }
    // Send wave button.
    const canSend = !state.waveActive && state.wave < TOTAL_WAVES && screen === SCREEN_PLAY;
    ctx.fillStyle = canSend ? PALETTE.amber : 'rgba(148,163,184,0.3)';
    roundRect(1150, BOTTOM + 10, 114, 44, 8);
    ctx.fill();
    text(state.wave === 0 ? 'Start Wave 1' : state.wave >= TOTAL_WAVES ? 'Final wave done' : `Send Wave ${state.wave + 1}`, 1207, BOTTOM + 32, 14, '#0b1026', 'center', '800');
  }

  function drawTitleScreen(state, best) {
    ctx.fillStyle = 'rgba(7,10,26,0.72)';
    ctx.fillRect(0, TOP, FIELD.width, BOTTOM - TOP);
    text('EMBERWATCH', FIELD.width / 2, 190, 72, PALETTE.amberBright, 'center', '800');
    text('Defend the Last Lighthouse from the shadow wisps', FIELD.width / 2, 248, 22, PALETTE.white, 'center');
    text('A complete tower-defense game — 10 waves, 4 towers, upgrades, a win and a lose screen.', FIELD.width / 2, 282, 15, PALETTE.dim, 'center');
    // How to play card.
    ctx.fillStyle = 'rgba(26,33,72,0.85)';
    roundRect(340, 320, 600, 210, 12);
    ctx.fill();
    ctx.strokeStyle = PALETTE.plotRing;
    ctx.lineWidth = 1.5;
    roundRect(340, 320, 600, 210, 12);
    ctx.stroke();
    text('HOW TO PLAY', 640, 350, 16, PALETTE.amberBright, 'center', '800');
    const lines = [
      'Wisps walk the road to the lighthouse. If it falls, the light goes out.',
      'Click a glowing plot, then pick a tower (keys 1-4). Towers fire on their own.',
      'Kills earn embers. Spend them on more towers — or upgrade one (U) and sell (X).',
      'Press Space to send the next wave. Survive all 10 waves to win.',
      'Brazier burns swarms · Lantern slows the dark · Prism pierces armour · Mortar splashes.',
    ];
    lines.forEach((line, i) => text(line, 640, 384 + i * 26, 15, PALETTE.white, 'center', '400'));
    if (best > 0) text(`Best score: ${best}`, FIELD.width / 2, 566, 18, PALETTE.gold, 'center', '700');
    const pulse = 0.65 + 0.35 * Math.sin(state.time * 3);
    ctx.globalAlpha = pulse;
    text('Click or press Space to start', FIELD.width / 2, 612, 24, PALETTE.amberBright, 'center', '700');
    ctx.globalAlpha = 1;
  }

  function drawPausedScreen() {
    ctx.fillStyle = 'rgba(7,10,26,0.7)';
    ctx.fillRect(0, TOP, FIELD.width, BOTTOM - TOP);
    text('PAUSED', FIELD.width / 2, 360, 56, PALETTE.white, 'center', '800');
    text('Press P or click to resume', FIELD.width / 2, 420, 20, PALETTE.dim, 'center');
  }

  function drawOverScreen(state, best) {
    const won = state.won;
    ctx.fillStyle = won ? 'rgba(7,10,26,0.66)' : 'rgba(20,6,12,0.78)';
    ctx.fillRect(0, TOP, FIELD.width, BOTTOM - TOP);
    text(won ? 'THE LIGHT HOLDS' : 'THE LIGHT WENT OUT', FIELD.width / 2, 210, 58, won ? PALETTE.amberBright : PALETTE.red, 'center', '800');
    text(
      won ? 'Ten waves beaten. The lighthouse still burns.' : `The lighthouse fell on wave ${state.wave}.`,
      FIELD.width / 2, 268, 20, PALETTE.white, 'center',
    );
    ctx.fillStyle = 'rgba(26,33,72,0.85)';
    roundRect(440, 310, 400, 190, 12);
    ctx.fill();
    ctx.strokeStyle = PALETTE.plotRing;
    roundRect(440, 310, 400, 190, 12);
    ctx.stroke();
    text(`Score   ${state.score}`, 640, 350, 22, PALETTE.white, 'center', '700');
    text(`Wisps banished   ${state.kills}`, 640, 388, 16, PALETTE.dim, 'center');
    text(`Leaks   ${state.leaks}   ·   Waves cleared   ${state.wavesCleared}`, 640, 420, 16, PALETTE.dim, 'center');
    text(`Best score   ${Math.max(best, state.score)}`, 640, 458, 16, PALETTE.gold, 'center', '700');
    const pulse = 0.65 + 0.35 * Math.sin(state.time * 3);
    ctx.globalAlpha = pulse;
    text('Press R or click to play again', FIELD.width / 2, 560, 24, PALETTE.amberBright, 'center', '700');
    ctx.globalAlpha = 1;
  }

  function draw(state, screen, best) {
    const { scale } = fit();
    void scale;
    ctx.save();
    if (state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake * 14, (Math.random() - 0.5) * state.shake * 14);
    }
    drawNight(state);
    drawPath();
    drawPlots(state);
    drawLighthouse(state);
    for (const tower of state.towers) drawTower(tower);
    for (const e of state.enemies) drawEnemy(e);
    for (const e of state.ambient) drawEnemy(e);
    drawShots(state);
    drawParticles(state);
    // Range ring of the hovered/selected tower, above the field.
    const hovered = state.selectedTower;
    if (hovered) {
      const st = towerStats(hovered.type, hovered.level);
      ctx.strokeStyle = 'rgba(255,210,122,0.5)';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.beginPath();
      ctx.arc(hovered.x, hovered.y, st.range, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    drawHud(state, screen);
    drawBuildBar(state, screen);
    if (screen === SCREEN_TITLE) drawTitleScreen(state, best);
    else if (screen === SCREEN_PAUSED) drawPausedScreen();
    else if (screen === SCREEN_OVER) drawOverScreen(state, best);
    ctx.restore();
  }

  return { draw, fit };
}
