// Las canciones del disco: fragmentos oficiales de 30 s de Apple Music
// (iTunes Search API, álbum 186166282). La lista se pide al entrar
// (las direcciones de Apple pueden cambiar) y cada
// fragmento se reproduce directamente desde Apple.
//
// Apple sirve los fragmentos con CORS abierto, así que se pueden pasar por un
// AnalyserNode: `level()` devuelve la energía de los graves (0..1) y con ella
// Michael lleva el ritmo y la luz de la pared late (task2).

const ALBUM_ID = 186166282;

/**
 * Los discos que se pueden poner en el tocadiscos del plató: id del álbum en
 * Apple Music, título, año, color de la etiqueta y ritmo para el baile de
 * fondo. Off the Wall es el del panel; los otros, los de la mesa.
 */
export const RECORDS = {
  otw: { id: ALBUM_ID, title: 'Off the Wall', artist: 'Michael Jackson', year: 1979, label: '#8a2420' },
  diana: { id: 1443221837, title: 'Diana Ross Presents The Jackson 5', artist: 'Jackson 5', year: 1969, label: '#7a3fa0', groove: { bpm: 100, feel: 'funk' } },
  abc: { id: 1442885957, title: 'ABC', artist: 'Jackson 5', year: 1970, label: '#2a7bc9', groove: { bpm: 112, feel: 'funk' } },
  xmas: { id: 1452949481, title: 'Christmas Album', artist: 'Jackson 5', year: 1970, label: '#2f7a3a', groove: { bpm: 96, feel: 'smooth' } },
  jacksons: { id: 200605281, title: 'The Jacksons', artist: 'The Jacksons', year: 1976, label: '#c9962a', groove: { bpm: 118, feel: 'disco' } },
};

/** Canciones de un disco (título y fragmento de 30 s), en orden; se guardan en caché. */
const albumCache = new Map();
export function loadRecord(key) {
  if (!albumCache.has(key)) {
    const url = `https://itunes.apple.com/lookup?id=${RECORDS[key].id}&entity=song&country=es`;
    albumCache.set(
      key,
      fetch(url)
        .then((r) => r.json())
        .then((data) =>
          data.results
            .filter((r) => r.wrapperType === 'track' && r.previewUrl)
            .sort((a, b) => a.discNumber - b.discNumber || a.trackNumber - b.trackNumber)
            .map((r) => ({ title: r.trackName, url: r.previewUrl })),
        )
        .catch(() => {
          albumCache.delete(key);
          return [];
        }),
    );
  }
  return albumCache.get(key);
}
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

  // Lo que suena: el disco del panel (previews) o uno de la mesa del plató.
  /** @type {string[] | null} */
  let queue = null;
  const list = () => queue ?? previews;

  async function play(i) {
    await ready;
    if (!list()[i]) return false;
    ensureGraph();
    if (ctx.state === 'suspended') await ctx.resume();
    window.clearTimeout(fadeTimer);
    current = i;
    onChange(current);
    audio.src = list()[i];
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
    if (autoNext && list()[next]) play(next);
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
      return play(current < 0 ? 0 : (current + 1) % Math.max(list().length, 1));
    },
    /** Cambia de disco: `urls` de los fragmentos, o null para volver a Off the Wall. */
    setQueue(urls) {
      queue = urls;
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
