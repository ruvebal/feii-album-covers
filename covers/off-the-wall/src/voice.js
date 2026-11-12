import heeUrl from './sounds/hee.mp3';
import owUrl from './sounds/ow.mp3';
import uhhUrl from './sounds/uhh.mp3';
import snapUrl from './sounds/snap.mp3';

const recordings = {
  hee: heeUrl,
  ow: owUrl,
  whoo: uhhUrl,
  hoo: uhhUrl,
  snap: snapUrl,
};

/** Respuesta de una sala pequeña para el roce de la suela. */
function roomImpulse(ctx) {
  const len = Math.floor(ctx.sampleRate * 0.6);
  const buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch += 1) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3;
  }
  return buf;
}

export function createVoice() {
  let ctx = null;
  let out = null;
  let noiseBuf = null;
  const playing = new Set();
  let disposed = false;

  function squeak() {
    if (!ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      ctx = new Ctx();
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i += 1) d[i] = Math.random() * 2 - 1;

      out = ctx.createGain();
      out.gain.value = 0.5;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -18;
      comp.ratio.value = 4;
      const dry = ctx.createGain();
      dry.gain.value = 0.85;
      const verb = ctx.createConvolver();
      verb.buffer = roomImpulse(ctx);
      const wet = ctx.createGain();
      wet.gain.value = 0.22;
      out.connect(dry).connect(comp);
      out.connect(verb).connect(wet).connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') {
      ctx.resume().catch((error) => console.error('No se pudo activar el sonido de la suela:', error));
    }
    const t0 = ctx.currentTime;
    const dur = 0.2;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 18;
    filter.frequency.setValueAtTime(2300, t0);
    filter.frequency.exponentialRampToValueAtTime(3900, t0 + dur);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(3, t0 + 0.002);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(env).connect(out);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.05);
  }

  return {
    /** @param {'hee' | 'ow' | 'whoo' | 'hoo' | 'snap' | 'squeak'} name */
    play(name) {
      if (disposed) return;
      if (name === 'squeak') {
        squeak();
        return;
      }
      const audio = new Audio(recordings[name]);
      playing.add(audio);
      audio.addEventListener('ended', () => playing.delete(audio), { once: true });
      audio.addEventListener('error', () => {
        playing.delete(audio);
        console.error(`No se pudo cargar el sonido "${name}".`, audio.error);
      }, { once: true });
      audio.play().catch((error) => {
        playing.delete(audio);
        if (!disposed) console.error(`No se pudo reproducir el sonido "${name}".`, error);
      });
    },
    dispose() {
      disposed = true;
      playing.forEach((audio) => {
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
      });
      playing.clear();
      if (ctx) ctx.close().catch((error) => console.error('No se pudo cerrar el audio de la suela:', error));
      ctx = null;
    },
  };
}
