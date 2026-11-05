// Fragmentos oficiales de 30 s de Apple Music (iTunes Search API).
// No se aloja ningún audio: se pide la lista al cargar (las URLs pueden cambiar) y se reproduce desde Apple.
const ALBUM_ID = 1877481995;
const LOOKUP = `https://itunes.apple.com/lookup?id=${ALBUM_ID}&entity=song&country=es`;

export function createPlayer({ onChange, onProgress }) {
  const audio = new Audio();
  audio.crossOrigin = 'anonymous'; // Apple sirve CORS: permite analizar el audio para el latido
  audio.preload = 'none';

  let previews = [];   // por número de pista (0-17)
  let albumUrl = '';
  let current = -1;
  let ctx, gain, analyser, bins;
  let fadeTimer;

  const aborter = new AbortController();
  const ready = fetch(LOOKUP, { signal: aborter.signal })
    .then((r) => r.json())
    .then((d) => {
      for (const r of d.results) {
        if (r.wrapperType === 'collection') albumUrl = r.collectionViewUrl;
        if (r.wrapperType === 'track' && r.previewUrl) previews[r.trackNumber - 1] = r.previewUrl;
      }
      return previews.length > 0;
    })
    .catch(() => false);

  // el AudioContext solo puede arrancar tras un gesto del usuario (el primer clic)
  function ensureGraph() {
    if (ctx) return;
    ctx = new AudioContext();
    const src = ctx.createMediaElementSource(audio);
    gain = ctx.createGain();
    analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.6;
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
    if (!previews[i]) return;
    ensureGraph();
    if (ctx.state === 'suspended') ctx.resume();
    clearTimeout(fadeTimer);
    current = i;
    onChange(current);
    audio.src = previews[i];
    gain.gain.value = 0;
    try {
      await audio.play();
      if (current === i) fadeTo(1, 0.25);
    } catch {
      if (current === i) { current = -1; onChange(current); }
    }
  }

  function stop() {
    if (current < 0) return;
    current = -1;
    onChange(current);
    if (!ctx) { audio.pause(); return; }
    fadeTo(0, 0.3);
    fadeTimer = setTimeout(() => audio.pause(), 320);
  }

  const onEnded = () => { current = -1; onChange(current); };
  const onTime = () => {
    if (current >= 0 && audio.duration) onProgress?.(current, audio.currentTime / audio.duration);
  };
  audio.addEventListener('ended', onEnded);
  audio.addEventListener('timeupdate', onTime);

  // al salir de la ruta: cortar audio, petición y AudioContext
  function destroy() {
    aborter.abort();
    clearTimeout(fadeTimer);
    audio.removeEventListener('ended', onEnded);
    audio.removeEventListener('timeupdate', onTime);
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    current = -1;
    ctx?.close().catch(() => {});
  }

  return {
    ready,
    get current() { return current; },
    get albumUrl() { return albumUrl; },
    has: (i) => !!previews[i],
    toggle: (i) => (current === i ? stop() : play(i)),
    stop,
    destroy,
    progress: () => (audio.duration ? audio.currentTime / audio.duration : 0),
    // energía de graves (0-1) para el latido
    bass() {
      if (!analyser || current < 0) return 0;
      analyser.getByteFrequencyData(bins);
      let s = 0;
      for (let k = 1; k < 8; k++) s += bins[k]; // ~40-650 Hz con fftSize 512 a 44,1 kHz
      return Math.max(0, (s / 7 / 255 - 0.45) / 0.55);
    },
  };
}
