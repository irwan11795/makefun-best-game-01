// Sound, synthesised with WebAudio — no audio files, no network. Every action
// answers with a sound: shots, coins, leaks, the wave horn, victory and defeat.

let ctx = null;
let muted = false;

export function setMuted(value) {
  muted = value;
}

export function isMuted() {
  return muted;
}

function audio() {
  if (muted) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq, dur, type, vol, slideTo = null, delay = 0) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  gain.gain.setValueAtTime(vol, t0);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

export function playShoot(kind) {
  if (kind === 'prism') tone(880, 0.12, 'sawtooth', 0.05, 440);
  else if (kind === 'mortar') tone(180, 0.18, 'sine', 0.09, 90);
  else if (kind === 'lantern') tone(660, 0.08, 'sine', 0.04, 520);
  else tone(520, 0.05, 'square', 0.03, 380);
}

export function playCoin() {
  tone(1320, 0.09, 'sine', 0.05, 1760);
}

export function playBuild() {
  tone(392, 0.1, 'triangle', 0.08);
  tone(523, 0.12, 'triangle', 0.08, null, 0.07);
}

export function playUpgrade() {
  tone(523, 0.1, 'triangle', 0.08);
  tone(659, 0.1, 'triangle', 0.08, null, 0.07);
  tone(784, 0.16, 'triangle', 0.08, null, 0.14);
}

export function playLeak() {
  tone(220, 0.3, 'sawtooth', 0.1, 110);
}

export function playHorn() {
  tone(196, 0.35, 'sawtooth', 0.08, 262);
  tone(262, 0.35, 'sawtooth', 0.06, 330, 0.05);
}

export function playVictory() {
  [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.25, 'triangle', 0.09, null, i * 0.13));
}

export function playDefeat() {
  [330, 262, 196, 131].forEach((f, i) => tone(f, 0.35, 'sawtooth', 0.07, null, i * 0.18));
}

export function playClick() {
  tone(700, 0.04, 'sine', 0.03);
}
