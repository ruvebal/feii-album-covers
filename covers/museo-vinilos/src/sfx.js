// Sonidos sintetizados con Web Audio (sin archivos de audio): pop al coger, tics al pixelar,
// roce del disco, golpe al posarlo, crujido de vinilo y notas tipo bloque de notas.
// El AudioContext nace en el primer gesto del jugador (clic o E). M silencia.

const PENTA = [0, 2, 4, 7, 9];

export function createSfx() {
  /** @type {AudioContext | null} */
  let ctx = null;
  /** @type {GainNode | null} */
  let out = null;
  let muted = false;
  let crackle = null;

  function ensure() {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      out = ctx.createGain();
      out.gain.value = muted ? 0 : 0.35;
      out.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return true;
  }

  function osc(type, f0, f1, dur, vol, delay = 0) {
    if (!ensure()) return;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(out);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  function noiseBuffer(seconds, sparse) {
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = sparse ? (Math.random() < 0.0009 ? Math.random() * 2 - 1 : 0) : Math.random() * 2 - 1;
    return buf;
  }

  function noise(dur, vol, hp) {
    if (!ensure()) return;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuffer(dur, false);
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    src.connect(f).connect(g).connect(out);
    src.start();
  }

  return {
    unlock: ensure,
    get muted() {
      return muted;
    },
    pop() {
      osc('square', 520, 900, 0.09, 0.16);
    },
    tick(stage) {
      osc('square', 330 * 2 ** (stage / 4), null, 0.07, 0.1);
    },
    bark() {
      osc('sawtooth', 340, 150, 0.16, 0.2);
      osc('square', 270, 120, 0.14, 0.1);
      noise(0.1, 0.09, 900);
      osc('sawtooth', 360, 160, 0.16, 0.2, 0.22);
      osc('square', 290, 130, 0.14, 0.1, 0.22);
    },
    slide() {
      noise(0.28, 0.1, 2200);
    },
    thud() {
      osc('sine', 150, 48, 0.24, 0.5);
      noise(0.08, 0.12, 900);
    },
    note(i) {
      osc('square', 392 * 2 ** (PENTA[i % PENTA.length] / 12), null, 0.13, 0.08);
    },
    startCrackle() {
      if (!ensure() || crackle) return;
      crackle = ctx.createBufferSource();
      crackle.buffer = noiseBuffer(2, true);
      crackle.loop = true;
      const g = ctx.createGain();
      g.gain.value = 0.18;
      crackle.connect(g).connect(out);
      crackle.start();
    },
    stopCrackle() {
      try {
        crackle?.stop();
      } catch {
        /* ya parado */
      }
      crackle = null;
    },
    toggleMute() {
      muted = !muted;
      if (out) out.gain.value = muted ? 0 : 0.35;
      return muted;
    },
    dispose() {
      this.stopCrackle();
      ctx?.close().catch(() => {});
      ctx = null;
    },
  };
}
