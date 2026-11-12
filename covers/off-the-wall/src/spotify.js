// El disco en Spotify, con su reproductor oficial (Spotify iFrame API).
// Con sesión de Spotify abierta en el navegador suenan las canciones enteras;
// sin sesión, Spotify da fragmentos. Las canciones se sirven desde Spotify.
//
// El reproductor de Spotify vive en un iframe de otro dominio: la página no
// puede leer su sonido (a diferencia de los fragmentos de Apple, que sí pasan
// por un AnalyserNode). Lo que sí cuenta la API es si suena y por dónde va,
// así que el ritmo se aproxima con un pulso a tempo de disco (BPM) enganchado
// a la posición real de la canción.

const API = 'https://open.spotify.com/embed/iframe-api/v1';
const ALBUM_ID = '2ZytN2cY4Zjrr9ukb2rqTP';
export const SPOTIFY_URL = `https://open.spotify.com/album/${ALBUM_ID}`;
// Las diez canciones del disco en Spotify, en orden: así se puede elegir una
// desde la lista de la página o desde los neones, y saber cuál suena.
const TRACK_IDS = [
  '46eu3SBuFCXWsPT39Yg3tJ',
  '7oOOI85fVQvVnK5ynNMdW7',
  '6BdiFsPMPkSEEO4fFXFVWX',
  '78XG7U0UueeC86XpzF9O7f',
  '3zYpRGnnoegSpt3SguSo3W',
  '1nCV2d1RAch7t2kRmwet5N',
  '6NGsHLZYGVAkXTFr75WWnn',
  '1HibhNhwk2tljwC4BGGLXV',
  '0CeE7kE8zAnfKIVpdmOaJl',
  '6aCs8gCrp4yrwvw7ylhau2',
];
// Tempo aproximado del disco (casi todo va entre 110 y 125 BPM).
const BPM = 118;

let apiPromise = null;

/** Carga la API una sola vez; si vuelve a montarse la ruta, se reutiliza. */
function loadApi() {
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    const prev = window.onSpotifyIframeApiReady;
    window.onSpotifyIframeApiReady = (api) => {
      resolve(api);
      prev?.(api);
    };
    const s = document.createElement('script');
    s.src = API;
    s.async = true;
    s.onerror = () => {
      apiPromise = null;
      reject(new Error('No se ha podido cargar Spotify'));
    };
    document.body.appendChild(s);
  });
  return apiPromise;
}

/**
 * Monta el reproductor dentro de `host` (un div que no toca React).
 * @param {HTMLElement} host
 * @param {{
 *   onPlaying: (on: boolean) => void,
 *   onTrack?: (index: number) => void,
 *   onProgress?: (t: number) => void,
 *   height: number,
 * }} o  `onTrack` avisa de qué canción del disco suena (−1 si no se sabe) y
 *       `onProgress` de por dónde va (0..1).
 */
export async function createSpotify(host, { onPlaying, onTrack, onProgress, height }) {
  const api = await loadApi();
  // La API sustituye el elemento por el iframe: se le da uno propio.
  const slot = document.createElement('div');
  host.appendChild(slot);
  let playing = false;
  // Posición (s) y momento en que se midió, para extrapolar entre avisos.
  let pos = 0;
  let stamp = 0;

  const controller = await new Promise((resolve) => {
    api.createController(slot, { uri: `spotify:album:${ALBUM_ID}`, width: '100%', height }, resolve);
  });
  // Canción elegida desde la página (−1: el disco entero, como lo carga Spotify).
  let current = -1;
  // Para pasar a la siguiente una sola vez cuando acaba la elegida.
  let advanced = false;
  const setCurrent = (i) => {
    if (i === current) return;
    current = i;
    onTrack?.(i);
  };
  function playTrack(i) {
    advanced = false;
    setCurrent(i);
    controller.loadUri(`spotify:track:${TRACK_IDS[i]}`);
    controller.play();
  }
  controller.addListener('playback_update', (e) => {
    const now = !e.data.isPaused && !e.data.isBuffering;
    pos = e.data.position / 1000;
    stamp = performance.now() / 1000;
    // Si Spotify dice qué canción suena (al dar al play en su propio reproductor), se apunta.
    const uri = e.data.playingURI;
    if (typeof uri === 'string' && uri.startsWith('spotify:track:')) {
      const i = TRACK_IDS.indexOf(uri.slice(14));
      if (i >= 0) setCurrent(i);
    }
    if (e.data.duration > 0) {
      onProgress?.(Math.min(1, e.data.position / e.data.duration));
      // Al acabar la canción elegida suena la siguiente, como el disco entero.
      if (current >= 0 && !advanced && e.data.position >= e.data.duration - 700) {
        advanced = true;
        if (current < TRACK_IDS.length - 1) playTrack(current + 1);
      }
    }
    if (now !== playing) {
      playing = now;
      onPlaying(now);
    }
  });

  return {
    toggle() {
      controller.togglePlay();
    },
    /** Pone una canción del disco (0..9) y la hace sonar. */
    playTrack,
    /** Vuelve a cargar el disco entero, con su lista de canciones. */
    showAlbum() {
      setCurrent(-1);
      controller.loadUri(`spotify:album:${ALBUM_ID}`);
    },
    get current() {
      return current;
    },
    pause() {
      if (playing) controller.togglePlay();
    },
    get playing() {
      return playing;
    },
    /** Pulso de graves aproximado (0..1): golpe en cada tiempo del compás. */
    level() {
      if (!playing) return 0;
      const t = pos + (performance.now() / 1000 - stamp);
      const beat = (t * BPM) / 60;
      const f = beat - Math.floor(beat);
      return Math.exp(-f * 7) * 0.85;
    },
    // Solo quita su propio iframe: en desarrollo React monta dos veces y el
    // contenedor puede tener ya el reproductor del segundo montaje.
    dispose() {
      controller.destroy();
      slot.remove();
    },
  };
}
