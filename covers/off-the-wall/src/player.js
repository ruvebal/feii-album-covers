// Las canciones del disco: fragmentos oficiales de 30 s de Apple Music
// (iTunes Search API, álbum 186166282). En el repositorio no hay ningún audio:
// la lista se pide al entrar (las direcciones de Apple pueden cambiar) y cada
// fragmento se reproduce directamente desde Apple.
//
// Apple sirve los fragmentos con CORS abierto, así que se pueden pasar por un
// AnalyserNode: `level()` devuelve la energía de los graves (0..1) y con ella
// Michael lleva el ritmo y la luz de la pared late (task2).

const ALBUM_ID = 186166282;
/** Página del disco en Apple Music (enlace fijo para el DOM). */
export const ALBUM_URL = 'https://music.apple.com/es/album/off-the-wall/186166282';
const LOOKUP = `https://itunes.apple.com/lookup?id=${ALBUM_ID}&entity=song&country=es`;

/**
 * @param {{ onChange: (track: number) => void, onProgress?: (track: number, t: number) => void }} handlers
 */
export function createPlayer({ onChange, onProgress }) {
  const audio = new Audio();
  audio.crossOrigin = 'anonymous';
  audio.preload = 'none';

  /** @type {string[]} */
  const previews = [];
  let albumUrl = ALBUM_URL;
  let current = -1;
  let ctx = null;
  let gain = null;
  let analyser = null;
  let bins = null;
  let fadeTimer = 0;
  let autoNext = true;

  const aborter = new AbortController();
  const ready = fetch(LOOKUP, { signal: aborter.signal })
    .then((r) => r.json())
    .then((d) => {
      for (const r of d.results) {
        if (r.wrapperType === 'collection' && r.collectionViewUrl) albumUrl = r.collectionViewUrl;
        if (r.wrapperType === 'track' && r.previewUrl) previews[r.trackNumber - 1] = r.previewUrl;
      }
      return previews.length > 0;
    })
    .catch(() => false);

  // El AudioContext solo puede arrancar tras un gesto del usuario (el primer clic).
  function ensureGraph() {
    if (ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    ctx = new Ctx();
    const src = ctx.createMediaElementSource(audio);
    gain = ctx.createGain();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.55;
    bins = new Uint8Array(analyser.frequencyBinCount);
    src.connect(gain).connect(analyser).connect(ctx.destination);
  }

  function fadeTo(v, secs) {
    const t = ctx.currentTime;
    gain.gain.cancelScheduledValues(t);
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(v, t + secs);
  }

  async function play(i) {
    await ready;
    if (!previews[i]) return false;
    ensureGraph();
    if (ctx.state === 'suspended') await ctx.resume();
    window.clearTimeout(fadeTimer);
    current = i;
    onChange(current);
    audio.src = previews[i];
    gain.gain.value = 0;
    try {
      await audio.play();
      if (current === i) fadeTo(1, 0.3);
      return true;
    } catch {
      if (current === i) {
        current = -1;
        onChange(current);
      }
      return false;
    }
  }

  function stop() {
    if (current < 0) return;
    current = -1;
    onChange(current);
    if (!ctx) {
      audio.pause();
      return;
    }
    fadeTo(0, 0.3);
    fadeTimer = window.setTimeout(() => audio.pause(), 320);
  }

  // Al acabar un fragmento suena el siguiente, como el disco entero.
  const onEnded = () => {
    const next = current + 1;
    if (autoNext && previews[next]) play(next);
    else {
      current = -1;
      onChange(current);
    }
  };
  const onTime = () => {
    if (current >= 0 && audio.duration) onProgress?.(current, audio.currentTime / audio.duration);
  };
  audio.addEventListener('ended', onEnded);
  audio.addEventListener('timeupdate', onTime);

  return {
    ready,
    play,
    stop,
    /** Siguiente canción del disco (vuelve a la primera tras la última). */
    next() {
      return play(current < 0 ? 0 : (current + 1) % Math.max(previews.length, 1));
    },
    setAutoNext(v) {
      autoNext = v;
    },
    get current() {
      return current;
    },
    get albumUrl() {
      return albumUrl;
    },
    /** Energía de los graves (0..1) del fragmento que suena; 0 si no suena nada. */
    level() {
      if (!analyser || current < 0) return 0;
      analyser.getByteFrequencyData(bins);
      // Los primeros bins (~0-170 Hz con fftSize 512 a 44,1 kHz) son bombo y bajo.
      let sum = 0;
      for (let i = 1; i < 5; i += 1) sum += bins[i];
      return Math.min(1, Math.max(0, (sum / 4 - 120) / 120));
    },
    /** Libera todo al salir de la ruta. */
    dispose() {
      aborter.abort();
      window.clearTimeout(fadeTimer);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('timeupdate', onTime);
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
      if (ctx) ctx.close();
      ctx = null;
    },
  };
}
