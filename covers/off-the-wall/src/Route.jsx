// /covers/off-the-wall — Michael Jackson, Off the Wall (1979).
// La portada como plató 3D: se abre en el encuadre de la portada y se puede
// rodear a Michael, ponerse detrás de él y descubrir la sesión de fotos.
// React lleva el estado y el DOM (título, botones, textos); Scene.jsx, el 3D.
// La escena está modelada con código; el monitor muestra la portada original.

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import BudgetProbe from '../../../src/lib/BudgetProbe.jsx';
import { withinCeiling } from '../../../src/lib/budget.js';
import usePrefersReducedMotion from '../../../src/lib/usePrefersReducedMotion.js';
import { CEILING } from './budget.js';
import { GLIDE, MOVES } from './dances.js';
import { develop, developThriller } from './photo.js';
import { RECORDS, createPlayer, loadRecord } from './player.js';
import { createSpotify, spotifyUrl } from './spotify.js';
import { ALBUMS, otherAlbum } from './albums.js';
import { SPIN_TIME, TRAVEL_EXIT } from './travel.js';
import { createVoice } from './voice.js';
import Scene from './Scene.jsx';
import { BILLIE_JEAN_GIF, THRILLER_GIF } from './CornerScreens.jsx';
import Intro from './Intro.jsx';
import Ready from './Ready.jsx';
import { LANGS, STR, initialLang, saveLang } from './i18n.js';
import { fovFor, viewsFor } from './set.js';
import { goTo as flyTo, tour as cameraTour } from './cameraEvents.js';

/**
 * Recorrido de entrada: paradas de la cámara (posición, punto al que mira y
 * segundo en el que pasa por ahí). Va por encima de 2 m, donde el atrezo no
 * empuja la cámara, y acaba con un acercamiento a Michael.
 */
// Es un solo barrido de derecha a izquierda (la cámara no da bandazos): el
// rincón de Studio 54, el tocadiscos, Michael al fondo, la boa, los neones y,
// para acabar, hasta Michael.
const TOUR = [
  // Empieza ya delante de la pared del fondo (`time: 0` = sin vuelo previo),
  // con las cinco canciones de la cara A enteras en pantalla...
  { time: 0, position: [0.7, 2.3, 2.6], target: [0.6, 2.6, 10.4] },
  // ...y se acerca despacio, sin dejar de verlas todas.
  { time: 3.2, position: [0.7, 2.3, 3.6], target: [0.6, 2.6, 10.4] },
  // El letrero de Studio 54, visto desde arriba: queda entero por encima de la bola.
  { time: 5.8, position: [1.4, 3.0, 7.2], target: [3.42, 3.75, 10.4] },
  // El tocadiscos y los discos de los Jackson 5.
  { time: 8.2, position: [0.8, 2.1, 6.4], target: [2.6, 0.9, 5.0] },
  // Michael, al fondo del plató.
  { time: 10.2, position: [0.2, 2.1, 6.6], target: [0.1, 1.2, 0] },
  // Muscles, enroscada en la silla.
  { time: 12.4, position: [-0.4, 2.1, 7.3], target: [-1.55, 0.7, 6.3] },
  // Las cinco canciones de la cara B, en la pared izquierda, desde lejos
  // para que entren todas.
  { time: 15.0, position: [3.0, 2.5, 6.0], target: [-4.2, 2.7, 6.1] },
  // Hacia Michael...
  { time: 17.2, position: [-1.0, 2.05, 3.4], target: [0.1, 1.25, 0] },
  // ...y de cerca.
  { time: 19.4, position: [0.3, 1.5, 1.9], target: [0.05, 1.35, 0] },
];
/**
 * Recorrido de cine del estudio en 1982 (Thriller): el mismo barrido por el
 * plató, parando en lo que ha cambiado, y al final hasta Michael tumbado.
 */
const TOUR_THRILLER = [
  { time: 0, position: [0.7, 2.3, 2.6], target: [0.6, 2.6, 10.4] },
  { time: 3.2, position: [0.7, 2.3, 3.6], target: [0.6, 2.6, 10.4] },
  // El rincón de 1982: la recreativa, la tele y el radiocasete.
  { time: 5.8, position: [1.3, 2.2, 7.0], target: [3.2, 1.0, 9.6] },
  // El tocadiscos de los ochenta y la balda de los premios.
  { time: 8.2, position: [0.8, 1.9, 6.2], target: [3.4, 1.0, 4.9] },
  // Las chaquetas de los vídeos.
  { time: 10.4, position: [-1.3, 1.8, 7.6], target: [-3.7, 1.2, 7.5] },
  // La cara B en neón, en la pared izquierda.
  { time: 12.6, position: [3.0, 2.5, 6.0], target: [-4.2, 2.7, 6.1] },
  // El tocador de maquillaje y el ventilador.
  { time: 15.0, position: [-0.9, 1.7, 4.0], target: [-3.3, 1.0, 2.6] },
  // Hacia Michael, tumbado sobre el fondo negro...
  { time: 17.2, position: [1.2, 1.2, 3.2], target: [0.1, 0.5, 0] },
  // ...y de cerca, con el tigre.
  { time: 19.4, position: [0.5, 0.75, 1.7], target: [0.0, 0.45, 0.1] },
];
const TOUR_THRILLER_CAPTIONS = [0.8, 6.2, 8.8, 11.0, 13.2, 15.6];
/** Segundo en el que aparece cada rótulo del recorrido (i18n `tour`). */
const TOUR_CAPTIONS = [0.8, 4.2, 6.8, 9.0, 11.2, 13.6];
/** Cuándo sale la fecha (con Michael ya cerca) y cuándo acaba todo, en ms. */
const TOUR_DATE = 17800;
const TOUR_END = 21600;
const THRILLER_PREVIEW_GAIN = 0.75;
import './route.css';

const SCOPE = 'route-off-the-wall';
const FONTS = 'https://fonts.googleapis.com/css2?family=Yellowtail&family=Mr+Dafoe&family=Oswald:wght@400;600&family=Architects+Daughter&family=Monoton&display=swap';
/** Medios de las fichas: externos salvo los GIF locales de la tele. */
const CARDS = {
  muscles:
    'https://preview.redd.it/michael-with-muscles-his-pet-snake-v0-joz3ravdq66f1.jpg?width=495&format=pjpg&auto=webp&s=77d942cf450c25d9a240171a294dfa6cb55885bc',
  studio54: 'https://upload.wikimedia.org/wikipedia/commons/thumb/0/07/54-ny.jpg/960px-54-ny.jpg',
  // El disco de oro del cuadro: la portada de The Jacksons (1976), la misma del tocadiscos.
  gold: new URL('../public/the-jacksons.jpg', import.meta.url).href,
  // Thriller (1982). Los Grammy de Kenny Rogers de la misma ceremonia de 1980
  // (Wikimedia Commons, CC BY 2.0): no es el de Michael, y la ficha lo dice.
  grammy:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d2/Grammy_Award_trophies_-_Kenny_Rogers_%22The_Gambler%22_%28cropped%29.jpg/960px-Grammy_Award_trophies_-_Kenny_Rogers_%22The_Gambler%22_%28cropped%29.jpg',
  // Fotos de la sesión con el tigre bebé (enlazadas, no se copian al repositorio).
  tiger: 'https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQhXG89c_5I9BoCmzhEfyqPrrdBBQrJACtkOFbi4CgenkBPmu57vI5yqemT&s=10',
  // Fotos del rincón de 1982 y de la cámara de las Polaroid (Wikimedia
  // Commons, con su licencia libre; se enlazan, no se copian).
  polaroid: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c9/Polaroid_SX-70_camera.jpg/960px-Polaroid_SX-70_camera.jpg',
  arcade: 'https://upload.wikimedia.org/wikipedia/commons/8/80/Asteroids_upright_cabinet.jpg',
  tvconsole: [THRILLER_GIF, BILLIE_JEAN_GIF],
  boombox: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/2b/Sharp_GF-999_Boombox_-_Exhibit_at_Edo_Tokyo_Museum_%28edited%29.jpeg/960px-Sharp_GF-999_Boombox_-_Exhibit_at_Edo_Tokyo_Museum_%28edited%29.jpeg',
  walkman: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/4e/Original_Sony_Walkman_TPS-L2.JPG/960px-Original_Sony_Walkman_TPS-L2.JPG',
  // Un guante de Michael expuesto en el EMP de Seattle (CC BY 2.0).
  billiejean: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7c/Michael_Jackson_glove_%288229092427%29.jpg/960px-Michael_Jackson_glove_%288229092427%29.jpg',
  rubik: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Rubiks_cube_by_keqs.jpg/960px-Rubiks_cube_by_keqs.jpg',
  backdrop: null,
  westlake: null,
  // Las chaquetas de los vídeos de 1983 (Wikimedia Commons, CC BY 2.0).
  beatit:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/e/ef/Michael_Jackson_Beat_It_Jacket_%286043162620%29.jpg/960px-Michael_Jackson_Beat_It_Jacket_%286043162620%29.jpg',
  thrillerJacket:
    'https://upload.wikimedia.org/wikipedia/commons/thumb/2/26/Michael_Jackson_Thriller_Jacket%2C_Grammy_Museum_2020.jpg/960px-Michael_Jackson_Thriller_Jacket%2C_Grammy_Museum_2020.jpg',
};
const DPR = [1, 1.5];
/** Mi perfil de GitHub: lo enlaza la firma de la foto. */
const GITHUB = 'https://github.com/alexxblaro16';

/**
 * Pantalla pequeña: un móvil de pie (estrecha) o tumbado (baja). Ahí los
 * paneles se abren de uno en uno y se pliegan solos para dejar ver el plató.
 */
const COMPACT = '(max-width: 720px), (max-height: 520px)';

function useCompact() {
  const [compact, setCompact] = useState(() => typeof window !== 'undefined' && Boolean(window.matchMedia?.(COMPACT).matches));
  useEffect(() => {
    const mq = window.matchMedia?.(COMPACT);
    if (!mq) return undefined;
    const onChange = () => setCompact(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return compact;
}

/** Reloj de la página (ms), fuera del componente: solo se llama desde eventos. */
const clockNow = () => performance.now();

/** Índice al azar entre 0 y n − 1 (para empezar un disco por cualquier canción). */
const randomIndex = (n) => Math.floor(Math.random() * Math.max(n, 1));

/** Los pasos de baile (sus nombres y textos están en i18n.js). */
const DANCE_KEYS = ['spin', 'toe', 'kick', 'glide'];
const ORDER = /** @type {(keyof typeof MOVES)[]} */ (DANCE_KEYS);
/** Orden de la coreografía completa. */
const CHOREO = /** @type {(keyof typeof MOVES)[]} */ (['spin', 'glide', 'kick', 'toe']);

/** Gritos y chasquido disponibles en los controles. */
const SHOUTS = ['hee', 'ow', 'hoo', 'snap'];

// Altura del reproductor de Spotify con la lista de canciones.
// Reproductor de Spotify con su portada y su lista de canciones.
const SPOTIFY_HEIGHT = 352;

/** Cruceta táctil: dirección que entiende CameraRig, etiqueta y símbolo. */
const PAD = [
  ['f', '▲', 'otw__pad-up'],
  ['l', '◀', 'otw__pad-left'],
  ['r', '▶', 'otw__pad-right'],
  ['b', '▼', 'otw__pad-down'],
];

/** Avisa a la cámara (CameraRig escucha estos eventos en window). */
const padKey = (dir, on) => window.dispatchEvent(new CustomEvent('otw-key', { detail: { dir, on } }));
const zoomBy = (n) => window.dispatchEvent(new CustomEvent('otw-zoom', { detail: n }));

/** Fichas de 1982 (Thriller): se abren al pulsar su objeto. */
const THRILLER_CARDS = ['tiger', 'grammy', 'polaroid', 'backdrop', 'westlake', 'beatit', 'thrillerJacket', 'arcade', 'tvconsole', 'boombox', 'walkman', 'rubik', 'billiejean'];

export default function Route() {
  const reduced = usePrefersReducedMotion();
  const compact = useCompact();
  const compactNow = useRef(compact);
  useEffect(() => {
    compactNow.current = compact;
  }, [compact]);
  // Idioma (ES/EN): los textos salen de i18n.js.
  const [lang, setLang] = useState(initialLang);
  const T = STR[lang];
  useEffect(() => {
    saveLang(lang);
    document.documentElement.lang = lang;
  }, [lang]);
  const [view, setView] = useState(/** @type {{ name: string, at: number } | null} */ (null));
  // Disco puesto: Off the Wall (1979) o Thriller (1982), el mismo estudio tres años después.
  const [album, setAlbum] = useState(/** @type {'otw' | 'thriller'} */ ('otw'));
  const ALB = ALBUMS[album];
  const thriller = album === 'thriller';
  // Viaje de Michael de un plató a otro haciendo el moonwalk (travel.js).
  const [travel, setTravel] = useState(/** @type {{ kind: 'exit' | 'enter', at: number } | null} */ (null));
  // Fundido a negro y rótulo de «tres años después» entre los dos discos.
  const [fade, setFade] = useState(false);
  const [years, setYears] = useState('');
  const [zone, setZone] = useState('cover');
  const [move, setMove] = useState(/** @type {{ name: keyof typeof MOVES, at: number } | null} */ (null));
  // Apple es el origen por defecto para poder ajustar el nivel por disco.
  const [source, setSource] = useState(/** @type {'spotify' | 'apple'} */ ('apple'));
  const [spotifyOn, setSpotifyOn] = useState(false);
  // Canción del disco que suena en Spotify (−1 si no se sabe) y por dónde va (0..1).
  const [spotifyTrack, setSpotifyTrack] = useState(-1);
  const [spotifyProgress, setSpotifyProgress] = useState(0);
  const [spotifyState, setSpotifyState] = useState(/** @type {'loading' | 'ready' | 'error'} */ ('loading'));
  const [flashAt, setFlashAt] = useState(/** @type {number | null} */ (null));
  const [flashing, setFlashing] = useState(false);
  const [track, setTrack] = useState(-1);
  // Disco puesto: Off the Wall o uno de los de la mesa del tocadiscos.
  const [record, setRecord] = useState('otw');
  const [recordTracks, setRecordTracks] = useState(/** @type {string[]} */ ([]));
  const songs = record === album ? ALB.tracks : recordTracks;
  // Submenú del tocadiscos (secundario: aparte del reproductor principal). Solo
  // sale en el rincón del tocadiscos y del cuadro de los Jackson 5 (`atDeck`):
  // se abre al llegar y desaparece al irse, para no estorbar en el resto del
  // plató. Si se cierra con la ×, queda el botón «Ir al tocadiscos».
  const [deckOpen, setDeckOpen] = useState(false);
  const [atDeck, setAtDeck] = useState(false);
  // Ficha con foto: la de Michael con Muscles (al pulsar la boa de la silla) o
  // la de Studio 54 (al pulsar su rótulo de neón). Se cierra con la ×,
  // pulsando fuera o con Escape.
  const [card, setCard] = useState(/** @type {keyof typeof CARDS | null} */ (null));
  useEffect(() => {
    if (!card) return undefined;
    const onKey = (e) => e.key === 'Escape' && setCard(null);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [card]);
  // En pantallas pequeñas el menú no se abre solo al llegar (taparía el
  // tocadiscos): sale el botón y se abre al tocarlo.
  const onDeck = useCallback((near) => {
    setAtDeck(near);
    setDeckOpen((open) => (near ? open || !compactNow.current : false));
  }, []);
  const [progress, setProgress] = useState(0);
  const [hovered, setHovered] = useState(false);
  // Nombre del objeto bajo el puntero (se enseña junto al cursor).
  const [hint, setHint] = useState(/** @type {string | null} */ (null));
  const hintEl = useRef(/** @type {HTMLDivElement | null} */ (null));
  const [budget, setBudget] = useState(null);
  // En el móvil el panel empieza plegado para dejar ver a Michael.
  // Al entrar todo está guardado (panel y reproductor plegados): se ve limpia
  // la foto de la portada y cada cosa se abre con su botón.
  const [panelOpen, setPanelOpen] = useState(false);
  // Reproductor del disco: desplegado en el ordenador, plegado en el móvil.
  const [musicOpen, setMusicOpen] = useState(false);
  const [notice, setNotice] = useState('');
  // Última foto hecha: dirección local de la imagen (se libera al salir o al hacer otra).
  // Última foto: dirección local del PNG y si es entera o de medio cuerpo.
  const [shot, setShot] = useState(/** @type {{ url: string, crop: string } | null} */ (null));
  const gl = useRef(/** @type {import('three').WebGLRenderer | null} */ (null));
  // Estado de R3F, para subir la resolución un momento en la foto de medio cuerpo.
  const three = useRef(/** @type {import('@react-three/fiber').RootState | null} */ (null));
  // Petición de foto de medio cuerpo para ShotCamera y si se subió la resolución.
  const [shotRequest, setShotRequest] = useState(/** @type {number | null} */ (null));
  const boosted = useRef(false);
  const frameEl = useRef(/** @type {HTMLDivElement | null} */ (null));
  // El reproductor nace y muere con la ruta (en un efecto, no en useMemo: en
  // desarrollo React monta dos veces y un reproductor ya liberado no sonaría).
  const music = useRef(/** @type {ReturnType<typeof createPlayer> | null} */ (null));
  const spotify = useRef(/** @type {Awaited<ReturnType<typeof createSpotify>> | null} */ (null));
  const spotifyHost = useRef(/** @type {HTMLDivElement | null} */ (null));
  const voice = useRef(/** @type {ReturnType<typeof createVoice> | null} */ (null));
  // El pulso sale del sonido real (Apple) o del tempo enganchado a Spotify.
  const level = useCallback(() => Math.max(music.current?.level() ?? 0, spotify.current?.level() ?? 0), []);
  const timers = useRef(/** @type {number[]} */ ([]));
  const nextMove = useRef(0);

  // Clase de ámbito, fuentes y limpieza completa al salir de la ruta.
  useEffect(() => {
    document.documentElement.classList.add(SCOPE);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONTS;
    document.head.appendChild(link);
    const pending = timers.current;
    const player = createPlayer({
      onChange: setTrack,
      // El progreso solo mueve la barra; timeupdate llega unas 4 veces por segundo.
      onProgress: (_, t) => setProgress(t),
    });
    music.current = player;
    const shouts = createVoice();
    voice.current = shouts;
    return () => {
      document.documentElement.classList.remove(SCOPE);
      link.remove();
      pending.forEach((id) => window.clearTimeout(id));
      player.dispose();
      music.current = null;
      shouts.dispose();
      voice.current = null;
      document.body.style.cursor = 'auto';
    };
  }, []);

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
  }, [hovered]);

  // Si Spotify empieza a sonar (siempre es Off the Wall) y en el plato había
  // otro disco, el tocadiscos vuelve a Off the Wall: lo que gira es lo que suena.
  const recordNow = useRef(record);
  useEffect(() => {
    recordNow.current = record;
  }, [record]);
  // Pone en el reproductor el disco del plató (sus fragmentos de Apple):
  // Off the Wall es la lista de siempre; Thriller va en la cola del reproductor.
  const albumNow = useRef(album);
  useEffect(() => {
    albumNow.current = album;
  }, [album]);
  const loadMain = useCallback(async (key) => {
    const player = music.current;
    if (!player) return false;
    player.stop();
    setRecord(key);
    if (key === 'otw') {
      player.setVolume(1);
      player.setQueue(null);
      setRecordTracks([]);
      return true;
    }
    const list = await loadRecord(key);
    if (!list.length) return false;
    player.setVolume(key === 'thriller' ? THRILLER_PREVIEW_GAIN : 1);
    player.setQueue(list.map((t) => t.url));
    setRecordTracks(list.map((t) => t.title));
    return true;
  }, []);
  useEffect(() => {
    if (!spotifyOn || recordNow.current === albumNow.current) return;
    loadMain(albumNow.current);
  }, [spotifyOn, loadMain]);

  // La etiqueta sigue al cursor sin volver a pintar React en cada movimiento.
  useEffect(() => {
    const onMove = (e) => {
      const el = hintEl.current;
      if (el) el.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 16}px)`;
    };
    window.addEventListener('pointermove', onMove);
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  const hover = useCallback((on, name) => {
    setHovered(on);
    setHint(on && name ? name : null);
  }, []);

  useEffect(() => () => {
    if (shot) URL.revokeObjectURL(shot.url);
  }, [shot]);

  const later = (fn, ms) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  // `at` cuenta las peticiones: repetir la misma vista vuelve a llevar la cámara.
  const goTo = (name) => {
    setView((v) => ({ name, at: (v?.at ?? 0) + 1 }));
    // En el móvil el menú del tocadiscos no se abre solo (lo taparía entero):
    // al llegar sale su botón.
    if (name === 'deck' && !compact) setDeckOpen(true);
    // En el móvil el panel se pliega al elegir: lo que se quiere es ver el plató.
    if (compact) setPanelOpen(false);
  };

  // En pantallas pequeñas solo cabe un panel abierto: abrir uno pliega los demás.
  const togglePanel = () => {
    if (compact && !panelOpen) {
      setMusicOpen(false);
      setDeckOpen(false);
    }
    setPanelOpen((v) => !v);
  };
  const toggleMusic = () => {
    if (compact && !musicOpen) {
      setPanelOpen(false);
      setDeckOpen(false);
    }
    setMusicOpen((v) => !v);
  };
  // Bailar o hacer la foto desde el panel: en el móvil se pliega para ver a Michael.
  const foldPanel = () => {
    if (compact) setPanelOpen(false);
  };

  // La foto recién hecha se enseña: en el móvil el panel se había plegado para
  // ver el flash, así que se vuelve a abrir por donde está la foto.
  const shotEl = useRef(/** @type {HTMLElement | null} */ (null));
  useEffect(() => {
    if (!shot || !compactNow.current) return undefined;
    setMusicOpen(false);
    setDeckOpen(false);
    setPanelOpen(true);
    const id = window.requestAnimationFrame(() => shotEl.current?.scrollIntoView({ block: 'nearest' }));
    return () => window.cancelAnimationFrame(id);
  }, [shot]);

  // Pantalla de entrada: fase de carga (0 lienzo, 1 letras, 2 fotogramas, 3
  // lista) y si ya se ha entrado. Al entrar, la cámara vuela a la portada.
  const [stage, setStage] = useState(0);
  const [entered, setEntered] = useState(false);
  const advance = useCallback((n) => setStage((s) => Math.max(s, n)), []);
  useEffect(() => {
    let alive = true;
    (document.fonts?.ready ?? Promise.resolve()).then(() => alive && advance(2));
    return () => {
      alive = false;
    };
  }, [advance]);
  // Al entrar sale la fecha del disco unos segundos, mientras la cámara vuela.
  const [showDate, setShowDate] = useState(false);
  // Al entrar, un mini recorrido por el plató: los neones y la boa, el rincón
  // de la bola y el tocadiscos, y un acercamiento a Michael, donde sale la
  // fecha; después la cámara se retira al encuadre de la portada. Cualquier
  // gesto (ratón, dedo, rueda o tecla) lo corta y deja la cámara al visitante.
  // Es una secuencia de cine: la cámara sigue una curva continua (sin parones),
  // la pantalla se queda en formato panorámico con todo lo demás escondido,
  // suena «Don't Stop 'Til You Get Enough» y cada parada lleva su rótulo.
  const tourTimers = useRef(/** @type {number[]} */ ([]));
  const [touring, setTouring] = useState(false);
  const touringNow = useRef(false);
  const [caption, setCaption] = useState('');
  // Cambio de disco en marcha: cómo terminarlo de golpe («Saltar» o cualquier gesto).
  const switching = useRef(/** @type {(() => void) | null} */ (null));
  const endTour = useCallback(() => {
    if (!touringNow.current) return;
    if (switching.current) {
      switching.current();
      return;
    }
    touringNow.current = false;
    tourTimers.current.forEach((id) => window.clearTimeout(id));
    tourTimers.current = [];
    cameraTour(null);
    setTouring(false);
    setCaption('');
    setView((v) => ({ name: 'cover', at: (v?.at ?? 0) + 1 }));
  }, []);
  const enter = () => {
    setEntered(true);
    const date = () => {
      setShowDate(true);
      later(() => setShowDate(false), 3600);
    };
    if (reduced) {
      goTo('cover');
      date();
      return;
    }
    const at = (ms, fn) => {
      const id = window.setTimeout(fn, ms);
      tourTimers.current.push(id);
      timers.current.push(id);
    };
    touringNow.current = true;
    setTouring(true);
    cameraTour(TOUR);
    // La música entra con el recorrido (el clic en «Entrar» da permiso para
    // sonar): un fragmento, sin encadenar el siguiente.
    music.current?.setAutoNext(false);
    music.current?.play(0);
    T.tour.forEach((text, i) => at(TOUR_CAPTIONS[i] * 1000, () => setCaption(text)));
    at(TOUR_DATE, () => {
      setCaption('');
      date();
    });
    at(TOUR_END, endTour);
  };

  const switchAlbum = () => {
    if (touringNow.current) return;
    const to = otherAlbum(album);
    const at = (ms, fn) => {
      const id = window.setTimeout(fn, ms);
      tourTimers.current.push(id);
      timers.current.push(id);
    };
    const now = () => performance.now() / 1000;
    music.current?.stop();
    spotify.current?.pause();
    setPanelOpen(false);
    setMusicOpen(false);
    setDeckOpen(false);
    setCard(null);
    touringNow.current = true;
    setTouring(true);
    let swapped = false;
    let loading = Promise.resolve(false);
    // En negro: cambia el disco, la ropa de Michael y lo que suena.
    const swap = () => {
      if (swapped) return;
      swapped = true;
      setAlbum(to);
      spotify.current?.setAlbum(ALBUMS[to]);
      loading = loadMain(to);
    };
    const arrive = (ok) => {
      if (ok) music.current?.play(to === 'thriller' ? 3 : 0);
    };
    // Terminar ya: todo en su sitio, Michael en su postura y la cámara en la portada.
    switching.current = () => {
      cameraTour(null);
      tourTimers.current.forEach((id) => window.clearTimeout(id));
      tourTimers.current = [];
      switching.current = null;
      touringNow.current = false;
      swap();
      setTravel(null);
      setFade(false);
      setYears('');
      setCaption('');
      setTouring(false);
      setView((v) => ({ name: 'cover', at: (v?.at ?? 0) + 1 }));
    };
    if (reduced) {
      swap();
      switching.current();
      return;
    }
    // 1. Se gira y se va haciendo el moonwalk; la cámara se aparta para verlo.
    setCaption(T.leaving);
    setTravel({ kind: 'exit', at: now() + 0.3 });
    flyTo([1.9, 1.75, 5.2], [-1.6, 0.9, -0.4]);
    const exitMs = (TRAVEL_EXIT + 0.3) * 1000;
    // La vuelta suena con el chirrido de la suela y acaba con un «¡Ji-ji!»; a
    // mitad del moonwalk, otro.
    at(300, () => voice.current?.play('squeak'));
    at((0.3 + SPIN_TIME) * 1000, () => voice.current?.play('hee'));
    at((0.3 + SPIN_TIME) * 1000 + (exitMs - (0.3 + SPIN_TIME) * 1000) * 0.5, () => voice.current?.play('hee'));
    at(exitMs - 600, () => setFade(true));
    // 2. En negro: «tres años después» (o «1979» al volver). Cambia el disco y
    // Michael ya está en su sitio del otro plató (en Thriller, tumbado).
    at(exitMs + 300, () => {
      swap();
      setTravel(null);
      setCaption('');
      setYears(to === 'thriller' ? T.yearsLater : '1979');
    });
    // 3. Vuelve la luz con una secuencia de cine por el estudio (la del
    // principio en Off the Wall; una parecida en el de 1982), con su música,
    // sus rótulos y, al final, la fecha del disco con Michael de cerca.
    const start = exitMs + 2000;
    const stops = to === 'thriller' ? TOUR_THRILLER : TOUR;
    const times = to === 'thriller' ? TOUR_THRILLER_CAPTIONS : TOUR_CAPTIONS;
    const texts = to === 'thriller' ? T.tourThriller : T.tour;
    at(start, () => {
      setYears('');
      cameraTour(stops);
      setFade(false);
      loading.then((ok) => {
        if (!ok || !music.current) return;
        music.current.setAutoNext(false);
        arrive(ok);
      });
    });
    texts.forEach((text, i) => at(start + times[i] * 1000, () => setCaption(text)));
    at(start + TOUR_DATE, () => {
      setCaption('');
      setShowDate(true);
      later(() => setShowDate(false), 3600);
    });
    at(start + TOUR_END, () => {
      cameraTour(null);
      switching.current?.();
    });
  };

  useEffect(() => {
    if (!entered) return undefined;
    const events = ['pointerdown', 'wheel', 'keydown'];
    events.forEach((name) => window.addEventListener(name, endTour, { passive: true }));
    return () => events.forEach((name) => window.removeEventListener(name, endTour));
  }, [entered, endTour]);

  // Reproductor de Spotify: se monta al entrar y se destruye al salir.
  useEffect(() => {
    let alive = true;
    let sp = null;
    createSpotify(spotifyHost.current, { onPlaying: setSpotifyOn, onTrack: setSpotifyTrack, onProgress: setSpotifyProgress, height: SPOTIFY_HEIGHT, album: ALBUMS[albumNow.current] })
      .then((c) => {
        if (!alive) {
          c.dispose();
          return;
        }
        sp = c;
        spotify.current = c;
        setSpotifyState('ready');
      })
      .catch(() => {
        if (alive) setSpotifyState('error');
      });
    return () => {
      alive = false;
      sp?.dispose();
      spotify.current = null;
    };
  }, []);

  // Si Spotify empieza a sonar, se callan los fragmentos de Apple.
  useEffect(() => {
    if (spotifyOn) music.current?.stop();
  }, [spotifyOn]);

  /**
   * Un paso de baile con sus sonidos. `quiet`: sin gritos (cuando baila solo
   * con la música, para no tapar la canción).
   */
  const dance = useCallback((name, quiet = false) => {
    setMove({ name, at: performance.now() / 1000 });
    setNotice(T.dances[name][1]);
    const v = voice.current;
    if (!v) return;
    const at = (ms, s) => timers.current.push(window.setTimeout(() => voice.current?.play(s), ms));
    if (name === 'spin') {
      v.play('squeak');
      if (!quiet) at(MOVES.spin * 760, 'hoo');
    } else if (name === 'toe') {
      v.play('snap');
      if (!quiet) at(250, 'hee');
    } else if (name === 'kick') {
      if (!quiet) at(180, 'ow');
      if (!quiet) at(560, 'hoo');
    } else {
      // Un roce de suela en cada paso del moonwalk y el grito al rematar.
      for (let i = 0; i < GLIDE.steps; i += 1) at(i * GLIDE.step * 1000, 'squeak');
      if (!quiet) at((GLIDE.steps * GLIDE.step + 0.1) * 1000, 'hee');
    }
  }, [T]);

  // Clic en Michael: el siguiente paso de la lista.
  const step = useCallback(() => {
    const name = ORDER[nextMove.current % ORDER.length];
    nextMove.current += 1;
    dance(name);
  }, [dance]);

  const playing = track >= 0 || spotifyOn;
  // Ritmo del baile de fondo: el de la canción de Apple que suena o, con
  // Spotify (que no dice qué canción es), el tempo medio del disco.
  // Canción de Off the Wall que suena, venga de Apple o de Spotify (−1: ninguna
  // o no se sabe). La usan la lista, los neones y el baile.
  const song = track >= 0 ? (record === album ? track : -1) : spotifyOn ? spotifyTrack : -1;
  const songProgress = track >= 0 ? progress : spotifyProgress;
  const nowPlaying =
    track >= 0 ? songs[track] ?? '' : spotifyOn ? (spotifyTrack >= 0 ? ALB.tracks[spotifyTrack] : `${ALB.title} · Spotify`) : `${ALB.title} · ${ALB.year}`;
  const groove =
    track >= 0
      ? record === album
        ? ALB.grooves[track]
        : RECORDS[record].groove
      : spotifyOn
        ? ALB.grooves[spotifyTrack] ?? { bpm: 118, feel: 'disco' }
        : null;

  // Con música, Michael baila de fondo al ritmo (Michael.jsx) y, de vez en
  // cuando, mete uno de sus pasos (sin gritos, para no tapar la canción).
  useEffect(() => {
    if (!playing || reduced) return undefined;
    const id = window.setInterval(() => {
      dance(ORDER[Math.floor(Math.random() * ORDER.length)], true);
    }, 14000);
    return () => window.clearInterval(id);
  }, [playing, reduced, dance]);

  // Coreografía: los cuatro pasos seguidos, con sus gritos.
  const choreography = () => {
    let t = 0;
    for (const name of CHOREO) {
      later(() => dance(name), t);
      t += (MOVES[name] + 0.15) * 1000;
    }
    later(() => setNotice(T.choreoDone), t);
  };

  /**
   * Guarda lo que se ve dentro del encuadre cuadrado (desde donde esté la
   * cámara) como una foto revelada con el tono de la portada y la firma abajo.
   * `crop`: 'full' es el encuadre entero; 'half', de la cintura para arriba,
   * llega con `rect`, el cuadrado del lienzo (en píxeles) que pintó ShotCamera.
   * La copia del lienzo se hace antes del primer `await`: el fotograma
   * siguiente lo borra.
   */
  const capture = async (crop, rect) => {
    const src = gl.current?.domElement;
    const frame = frameEl.current;
    if (!src || !frame) return;
    const side = 1200;
    const out = document.createElement('canvas');
    out.width = side;
    out.height = side;
    const c = out.getContext('2d');
    c.imageSmoothingQuality = 'high';
    if (rect) {
      c.drawImage(src, rect.x, rect.y, rect.side, rect.side, 0, 0, side, side);
    } else {
      const box = src.getBoundingClientRect();
      const fr = frame.getBoundingClientRect();
      const k = src.width / box.width;
      c.drawImage(src, (fr.left - box.left) * k, (fr.top - box.top) * k, fr.width * k, fr.height * k, 0, 0, side, side);
    }
    if (albumNow.current === 'thriller') developThriller(c, side);
    else develop(c, side);
    if (albumNow.current === 'thriller') {
      // Al estilo de la portada (sin copiar su rótulo): tres líneas en cursiva
      // fina e inclinada, escalonadas hacia la derecha, con un degradado de
      // rosa a naranja que brilla un poco y un trazo de subrayado.
      try {
        await document.fonts.load(`${side * 0.1}px "Mr Dafoe"`);
      } catch {
        // Sin la letra se usa una cursiva del sistema.
      }
      const grad = c.createLinearGradient(side * 0.04, side * 0.04, side * 0.46, side * 0.3);
      grad.addColorStop(0, '#ff9fb4');
      grad.addColorStop(0.45, '#ff8a6a');
      grad.addColorStop(1, '#ffc27a');
      c.save();
      c.textAlign = 'left';
      c.fillStyle = grad;
      c.strokeStyle = grad;
      c.shadowColor = 'rgb(255 150 110 / 0.55)';
      c.shadowBlur = side * 0.01;
      c.transform(1, 0, -0.08, 1, 0, 0);
      c.font = `${side * 0.085}px "Mr Dafoe", cursive`;
      c.fillText('Michael', side * 0.06, side * 0.1);
      c.fillText('Jackson', side * 0.11, side * 0.18);
      // Subrayado: un trazo largo que sale de la última letra de «Jackson».
      c.lineWidth = side * 0.004;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(side * 0.12, side * 0.205);
      c.quadraticCurveTo(side * 0.3, side * 0.19, side * 0.46, side * 0.17);
      c.stroke();
      c.font = `${side * 0.08}px "Mr Dafoe", cursive`;
      c.fillText('Thriller', side * 0.2, side * 0.27);
      c.restore();
    }
    try {
      await document.fonts.load(`${side * 0.02}px Oswald`);
    } catch {
      // Sin la fuente se usa la del sistema: la foto sale igual.
    }
    const pad = side * 0.045;
    c.fillStyle = '#f7e9cf';
    c.shadowColor = 'rgb(0 0 0 / 0.5)';
    c.shadowBlur = side * 0.008;
    c.font = `${side * 0.02}px Oswald, sans-serif`;
    c.globalAlpha = 0.8;
    c.textAlign = 'right';
    c.fillText('by alexxblaro', side - pad, side - pad * 0.6);
    out.toBlob((blob) => {
      if (blob) setShot({ url: URL.createObjectURL(blob), crop });
    }, 'image/png');
  };

  // La foto se hace desde donde esté la cámara en ese momento. Primero salta
  // el flash (la escena se ilumina y brillan los calcetines y la camisa) y se
  // espera a que se pinten unos fotogramas con él antes de copiar la imagen.
  // La de medio cuerpo la dispara ShotCamera con su propia cámara (encuadre de
  // la portada de medio cuerpo); si el lienzo es pequeño (móvil), mientras
  // tanto se pinta a más resolución para que no salga borrosa.
  const takePhoto = (crop = 'full') => {
    setFlashAt(clockNow() / 1000);
    setFlashing(true);
    if (crop === 'half') {
      const el = gl.current?.domElement;
      const small = el && Math.min(el.width, el.height) < 1100;
      if (small) three.current?.setDpr(Math.min(3, (window.devicePixelRatio || 1) * 2));
      boosted.current = Boolean(small);
      setShotRequest(clockNow());
    } else {
      window.requestAnimationFrame(() => window.requestAnimationFrame(() => capture('full')));
    }
    setNotice(
      crop === 'half'
        ? T.flashHalf
        : T.flashFull,
    );
    later(() => setFlashing(false), 700);
  };

  // ShotCamera ya ha pintado el encuadre de medio cuerpo: se copia y, si se
  // subió la resolución, se vuelve a la normal.
  const onShot = (rect) => {
    capture('half', rect);
    if (boosted.current) three.current?.setDpr(DPR);
    boosted.current = false;
  };

  // Reproductor principal: siempre Off the Wall (los discos de la mesa van en
  // el submenú del tocadiscos). Si sonaba otro disco, se vuelve a este.
  const playMain = async (i) => {
    if (!music.current) return;
    if (record !== album) {
      spotify.current?.pause();
      const loaded = await loadMain(album);
      const ok = loaded && (await music.current.play(i));
      setNotice(ok ? T.nowSnippet(ALB.tracks[i]) : T.loadFail);
      return;
    }
    playTrack(i);
  };

  // Elegir una canción de Off the Wall (en la lista o en su neón): suena por
  // donde esté puesta la música, Spotify (entera, con sesión) o Apple (30 s).
  // Pulsar la que ya suena la para.
  const playSong = (i) => {
    const sp = spotify.current;
    if (source !== 'spotify' || !sp) {
      playMain(i);
      return;
    }
    if (spotifyOn && spotifyTrack === i) {
      sp.pause();
      setNotice(T.stopped);
      return;
    }
    music.current?.stop();
    sp.playTrack(i);
    setNotice(T.nowSpotify(ALB.tracks[i]));
  };

  const playTrack = async (i) => {
    if (!music.current) return;
    if (track === i) {
      music.current.stop();
      setNotice(T.stopped);
      return;
    }
    spotify.current?.pause();
    // Al elegir canción, los fragmentos vuelven a encadenarse como el disco.
    music.current.setAutoNext(true);
    const ok = await music.current.play(i);
    setNotice(ok ? T.nowSnippet(songs[i]) : T.loadFail);
  };

  // Canción elegida en el tocadiscos del plató: suena su fragmento de Apple
  // (el de Spotify no deja elegir canción desde fuera) y el panel lo muestra.
  const pickFromDeck = (i) => {
    setSource('apple');
    playTrack(i);
  };

  // Poner un disco en el tocadiscos: se piden sus canciones a Apple Music y
  // empieza a sonar la primera (fragmentos de 30 s, uno detrás de otro).
  const putRecord = async (key) => {
    if (!music.current) return;
    spotify.current?.pause();
    setSource('apple');
    music.current.stop();
    setRecord(key);
    if (key === 'otw') {
      music.current.setVolume(1);
      music.current.setQueue(null);
      setRecordTracks([]);
      const ok = await music.current.play(randomIndex(ALB.tracks.length));
      setNotice(ok ? T.otwOnDeck : T.recordFail);
      return;
    }
    setNotice(T.putting(RECORDS[key].title));
    const list = await loadRecord(key);
    if (!list.length) {
      setNotice(T.recordFail);
      return;
    }
    music.current.setQueue(list.map((t) => t.url));
    music.current.setVolume(key === 'thriller' ? THRILLER_PREVIEW_GAIN : 1);
    setRecordTracks(list.map((t) => t.title));
    // Cada vez que se pone un disco empieza por una canción al azar.
    const first = randomIndex(list.length);
    const ok = await music.current.play(first);
    const r = RECORDS[key];
    setNotice(ok ? T.nowRecord(list[first].title, r) : T.playFail);
  };

  const toggleAlbum = () => {
    // Si suena un fragmento de Apple (por ejemplo, el de la entrada), se para ese.
    if (track >= 0) {
      music.current?.stop();
      setNotice(T.stopped);
      return;
    }
    if (source === 'spotify' && spotify.current) {
      spotify.current.toggle();
      setNotice(spotifyOn ? T.stopped : T.spotifyOn);
      return;
    }
    playMain(0);
  };

  // Atajos de teclado: 1-4 bailes, C coreografía, F foto entera, G foto de
  // cintura para arriba, M música.
  // Se leen desde una ref para usar siempre las funciones del último render.
  const keys = useRef({});
  useEffect(() => {
    keys.current = { dance, choreography, takePhoto, toggleAlbum };
  });
  useEffect(() => {
    const onKey = (e) => {
      if (e.repeat || e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = /** @type {HTMLElement} */ (e.target).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      const k = keys.current;
      const n = Number(e.key);
      if (n >= 1 && n <= ORDER.length) k.dance(ORDER[n - 1]);
      else if (e.key === 'c' || e.key === 'C') k.choreography();
      else if (e.key === 'f' || e.key === 'F') k.takePhoto('full');
      else if (e.key === 'g' || e.key === 'G') k.takePhoto('half');
      else if (e.key === 'm' || e.key === 'M') k.toggleAlbum();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const cardText = card ? T.cards[card] ?? T.thrillerCards[card] : null;
  const cardMedia = card ? CARDS[card] : null;
  const cardImages = Array.isArray(cardMedia) ? cardMedia : cardMedia ? [cardMedia] : [];
  const verdict = withinCeiling(budget, CEILING);
  const showBudget = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('budget');
  // La cámara empieza al fondo del estudio; al entrar vuela a la portada.
  const initial = useMemo(() => [0, 2.0, 9.6], []);
  // Lente del primer fotograma (después CameraRig la ajusta a la pantalla).
  const initialFov = useMemo(() => fovFor(window.innerWidth, window.innerHeight), []);

  return (
    <div className={`otw ${zone === 'cover' && !touring ? 'otw--framed' : ''} ${touring ? 'otw--tour' : ''}`}>
      <Canvas
        className="otw__canvas"
        shadows="percentage"
        dpr={DPR}
        gl={{ toneMappingExposure: 1.08, preserveDrawingBuffer: true }}
        onCreated={(state) => {
          gl.current = state.gl;
          three.current = state;
          advance(1);
        }}
        camera={{ position: initial, fov: initialFov, near: 0.05, far: 40 }}
        aria-label={T.sceneLabel}
      >
        <Suspense fallback={null}>
          <Scene
            view={view}
            move={move}
            flashAt={flashAt}
            groove={groove}
            playing={playing}
            level={level}
            reduced={reduced}
            onZone={setZone}
            onStep={step}
            onHover={hover}
            lang={lang}
            onDeck={onDeck}
            album={album}
            travel={travel}
            onInspect={(text, id) => {
              setNotice(text);
              if (THRILLER_CARDS.includes(id)) setCard(id);
              if (id === 'muscles') setCard('muscles');
              // El cuadro de los Jackson 5: la historia de su disco de oro.
              if (id === 'j5') setCard('gold');
            }}
            onSign={() => setCard(thriller ? 'westlake' : 'studio54')}
            titles={ALB.tracks}
            song={song}
            onSong={playSong}
            shotRequest={shotRequest}
            onShot={onShot}
            record={record}
            records={RECORDS}
            onRecord={putRecord}
            onOpenDeck={() => setDeckOpen(true)}
          />
          <Ready onReady={() => advance(3)} />
        </Suspense>
        <BudgetProbe onSample={setBudget} />
      </Canvas>

      {/* Encuadre cuadrado de la portada: aparece cuando se mira de frente. */}
      <Intro stage={stage} entered={entered} onEnter={enter} lang={lang} />
      {/* Recorrido de entrada: franjas de cine, el rótulo de cada parada y «Saltar». */}
      <div className="otw__cine otw__cine--top" aria-hidden="true" />
      <div className="otw__cine otw__cine--bottom" aria-hidden="true" />
      {touring ? (
        <>
          {caption ? (
            <p key={caption} className="otw__tour-caption" role="status">
              {caption}
            </p>
          ) : null}
          <button type="button" className="otw__tour-skip" onClick={endTour}>
            {T.skip}
          </button>
        </>
      ) : null}
      {showDate ? (
        <div className="otw__date" role="status">
          <span>Epic Records</span>
          <strong>{thriller ? T.thrillerDate : T.date}</strong>
        </div>
      ) : null}
      <div ref={hintEl} className={`otw__hint ${hint ? 'is-on' : ''}`} aria-hidden="true">
        {hint}
      </div>
      {/* Encuadre cuadrado de la foto (el título va escrito con tiza en la pared). */}
      <div ref={frameEl} className="otw__frame" aria-hidden="true" />
      <div className="otw__vignette" aria-hidden="true" />
      <div className="otw__grain" aria-hidden="true" />
      <div className={`otw__flash ${flashing ? 'is-on' : ''}`} aria-hidden="true" />
      {/* Fundido a negro entre los dos discos, con el rótulo de los años. */}
      <div className={`otw__fade ${fade ? 'is-on' : ''}`} aria-hidden={!fade}>
        {years ? (
          <p className="otw__years" role="status">
            {years}
          </p>
        ) : null}
      </div>
      {/* El otro disco: Thriller desde Off the Wall, y al revés. */}
      {entered && !touring ? (
        <button
          type="button"
          className={`otw__album otw__album--${otherAlbum(album)}`}
          aria-label={T.albumSwitch(ALBUMS[otherAlbum(album)].title)}
          onClick={switchAlbum}
        >
          <span>{ALBUMS[otherAlbum(album)].year}</span>
          {thriller ? T.toOtw : T.toThriller}
        </button>
      ) : null}

      {/* Zoom en pantalla (también con la rueda, el pellizco o las teclas + y −). */}
      <div className="otw__zoom" role="group" aria-label="Zoom">
        <button type="button" aria-label={T.zoomIn} aria-keyshortcuts="+" onClick={() => zoomBy(1)}>
          +
        </button>
        <button type="button" aria-label={T.zoomOut} aria-keyshortcuts="-" onClick={() => zoomBy(-1)}>
          −
        </button>
      </div>

      {/* Cruceta para caminar con el dedo (solo en pantallas táctiles). */}
      <div className="otw__pad" role="group" aria-label={T.walkPad}>
        {PAD.map(([dir, sym, cls]) => (
          <button
            key={dir}
            type="button"
            className={cls}
            aria-label={T.pad[dir]}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture?.(e.pointerId);
              padKey(dir, true);
            }}
            onPointerUp={() => padKey(dir, false)}
            onPointerCancel={() => padKey(dir, false)}
            onLostPointerCapture={() => padKey(dir, false)}
            onContextMenu={(e) => e.preventDefault()}
          >
            {sym}
          </button>
        ))}
      </div>

      {/* Submenú del tocadiscos: los discos de la mesa, aparte de la música principal. */}
      {deckOpen && atDeck && !touring ? (
        <div className="otw__deck" role="dialog" aria-label={T.deckDialog}>
          <div className="otw__deck-head">
            <strong>{T.deck}</strong>
            <button type="button" className="otw__deck-close" aria-label={T.deckClose} onClick={() => setDeckOpen(false)}>
              ×
            </button>
          </div>
          <div className="otw__deck-records" role="group" aria-label={T.deckPick}>
            {Object.entries(RECORDS)
              .filter(([, r]) => (r.deck === 'modern') === thriller)
              .map(([key, r]) => (
              <button key={key} type="button" aria-pressed={record === key} onClick={() => putRecord(key)}>
                {r.title} <span>{r.year}</span>
              </button>
            ))}
          </div>
          <ol>
            {songs.map((t, i) => (
              <li key={`${record}-${t}`}>
                <button type="button" aria-pressed={track === i} onClick={() => pickFromDeck(i)}>
                  <span>{i + 1}</span> {t}
                </button>
              </li>
            ))}
          </ol>
          <p>{T.deckHelp}</p>
        </div>
      ) : null}
      {/* Los medios de las fichas aparecen juntos cuando la ficha tiene más de uno. */}
      {card ? (
        <div className="otw__photo" role="dialog" aria-modal="true" aria-label={cardText.title} onClick={() => setCard(null)}>
          <figure className={cardImages.length ? '' : 'is-text'} onClick={(e) => e.stopPropagation()}>
            <button type="button" aria-label={T.musclesClose} onClick={() => setCard(null)} autoFocus>
              ×
            </button>
            {cardImages.length ? (
              <div className={cardImages.length > 1 ? 'otw__photo-images otw__photo-images--pair' : 'otw__photo-images'}>
                {cardImages.map((src, index) => (
                  <div className="otw__photo-image" key={src}>
                    <img
                      src={src}
                      alt={index === 0 ? cardText.alt : cardText.altSecondary ?? cardText.alt}
                      referrerPolicy="no-referrer"
                    />
                    {cardImages.length > 1 && cardText.imageLabels?.[index] ? (
                      <span className="otw__photo-image-label">{cardText.imageLabels[index]}</span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
            <figcaption>
              <strong>{cardText.title}</strong>
              {cardText.text}
              {cardText.credit ? <small>{cardText.credit}</small> : null}
            </figcaption>
          </figure>
        </div>
      ) : null}
      {atDeck && !deckOpen && !touring ? (
        <button
          type="button"
          className="otw__deck-arrow"
          onClick={() => {
            if (!compact) {
              goTo('deck');
              return;
            }
            setPanelOpen(false);
            setMusicOpen(false);
            setDeckOpen(true);
          }}
        >
          {compact ? T.deckMenu : T.toDeck}
        </button>
      ) : null}

      {/* Reproductor del disco: la música es protagonista. Está siempre a la vista
          (arriba a la izquierda en el ordenador, abajo en el móvil) y se pliega
          hasta quedar en una barra con lo que suena y el botón de reproducir. */}
      <section className={`otw__music ${musicOpen ? '' : 'is-folded'} ${playing ? 'is-playing' : ''}`} aria-label={T.music}>
        <div className="otw__music-bar">
          <span className="otw__eq" aria-hidden="true">
            <i />
            <i />
            <i />
            <i />
          </span>
          <div className="otw__now">
            <span className="otw__now-label">{playing ? T.playing : T.sides}</span>
            <strong className="otw__now-title">{nowPlaying}</strong>
          </div>
          <button type="button" className="otw__play" aria-label={playing ? T.stop : T.play} onClick={toggleAlbum}>
            {playing ? '❚❚' : '▶'}
          </button>
          <button
            type="button"
            className="otw__fold"
            aria-expanded={musicOpen}
            aria-controls="otw-music-body"
            aria-label={musicOpen ? T.hidePlayer : T.showPlayer}
            onClick={toggleMusic}
          >
            {musicOpen ? '▴' : '▾'}
          </button>
        </div>
        {/* Se oculta (no se desmonta): así Spotify sigue sonando con el reproductor plegado. */}
        <div id="otw-music-body" className="otw__music-body" hidden={!musicOpen}>
            <div className="otw__tracks">
              <div className="otw__source" role="group" aria-label={T.source}>
                <button type="button" aria-pressed={source === 'spotify'} onClick={() => setSource('spotify')}>
                  Spotify
                </button>
                <button
                  type="button"
                  aria-pressed={source === 'apple'}
                  onClick={() => {
                    spotify.current?.pause();
                    setSource('apple');
                  }}
                >
                  Apple Music (30 s)
                </button>
              </div>
              {/* Con Apple, la lista de la página (pulsar una la pone; la que
                  suena lleva su barra). Con Spotify se ve su reproductor, con
                  su propia lista, como siempre. */}
              <ol hidden={source !== 'apple'}>
                {ALB.tracks.map((t, i) => (
                  <li key={t}>
                    <button type="button" className="otw__track" aria-pressed={song === i} onClick={() => playSong(i)}>
                      <span className="otw__track-n">{song === i ? '♪' : i + 1}</span>
                      <span className="otw__track-name">{t}</span>
                      {song === i ? <span className="otw__track-bar" style={{ '--p': songProgress }} aria-hidden="true" /> : null}
                    </button>
                  </li>
                ))}
              </ol>
              {/* El reproductor de Spotify se monta una vez y solo se oculta: así no se corta la canción. */}
              <div className="otw__spotify" hidden={source !== 'spotify'}>
                <div ref={spotifyHost} />
                {/* Al elegir una canción en su neón, Spotify enseña solo esa: con
                    este botón vuelve el disco entero con su lista. */}
                {spotifyTrack >= 0 ? (
                  <button type="button" className="otw__spotify-album" onClick={() => spotify.current?.showAlbum()}>
                    {T.spotifyAlbum}
                  </button>
                ) : null}
                {spotifyState === 'loading' ? <p className="otw__credit">{T.spotifyLoading}</p> : null}
                {spotifyState === 'error' ? (
                  <p className="otw__credit">
                    {T.spotifyError}{' '}
                    <a href={spotifyUrl(ALB.spotifyId)} target="_blank" rel="noreferrer">
                      {T.spotifyOpenShort}
                    </a>
                    .
                  </p>
                ) : null}
                <p className="otw__credit">
                  <a href={spotifyUrl(ALB.spotifyId)} target="_blank" rel="noreferrer">
                    {T.spotifyOpen}
                  </a>{' '}
                  {T.spotifyMirror}
                </p>
                <p className="otw__credit">
                  {T.spotifyNote}
                </p>
              </div>
              <p className="otw__credit" hidden={source !== 'apple'}>
                {T.appleNote}{' '}
                <a href={ALB.appleUrl} target="_blank" rel="noreferrer">
                  {T.appleAlbum}
                </a>
              </p>
            </div>
        </div>
      </section>

      <aside className={`otw__panel ${panelOpen ? '' : 'is-closed'}`} aria-label={T.panelLabel}>
        <header className="otw__head">
          <p className="otw__artist">Michael Jackson</p>
          <h1 className="otw__title">{ALB.title}</h1>
          <p className="otw__meta">{thriller ? T.thrillerMeta : T.meta}</p>
          {/* Idioma: español o inglés. */}
          <div className="otw__lang" role="group" aria-label={T.langLabel}>
            {LANGS.map((l) => (
              <button key={l} type="button" aria-pressed={lang === l} onClick={() => setLang(l)}>
                {l.toUpperCase()}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="otw__toggle"
            aria-expanded={panelOpen}
            aria-controls="otw-body"
            onClick={togglePanel}
          >
            {panelOpen ? T.hide : T.controls}
          </button>
        </header>

        <div id="otw-body" className="otw__body" hidden={!panelOpen}>
          <fieldset className="otw__group">
            <legend>{T.goTo}</legend>
            {Object.entries(viewsFor(album)).map(([name, v]) => (
              <button key={name} type="button" aria-pressed={zone === name} onClick={() => goTo(name)}>
                {(thriller ? T.thrillerViews[name] : T.views[name]) ?? v.label}
              </button>
            ))}
          </fieldset>

          <fieldset className="otw__group">
            <legend>{T.danceLegend}</legend>
            {ORDER.map((name, i) => (
              <button key={name} type="button" aria-keyshortcuts={String(i + 1)} onClick={() => { foldPanel(); dance(name); }}>
                {T.dances[name][0]}
              </button>
            ))}
            <button type="button" className="otw__star" aria-keyshortcuts="C" onClick={() => { foldPanel(); choreography(); }}>
              {T.choreo}
            </button>
          </fieldset>

          <fieldset className="otw__group">
            <legend>{T.shoutsLegend}</legend>
            {SHOUTS.map((name) => (
              <button key={name} type="button" onClick={() => voice.current?.play(name)}>
                {T.shouts[name]}
              </button>
            ))}
          </fieldset>

          <fieldset className="otw__group">
            <legend>{T.doLegend}</legend>
            <button type="button" aria-keyshortcuts="F" onClick={() => { foldPanel(); takePhoto('full'); }}>
              {T.photoFull}
            </button>
            <button type="button" aria-keyshortcuts="G" onClick={() => { foldPanel(); takePhoto('half'); }}>
              {T.photoHalf}
            </button>
            <button type="button" aria-keyshortcuts="M" aria-pressed={playing} onClick={toggleAlbum}>
              {playing ? T.stop : T.play}
            </button>
          </fieldset>

          {shot ? (
            <figure ref={shotEl} className="otw__shot">
              <img
                src={shot.url}
                alt={T.shotAlt(shot.crop === 'half')}
              />
              <figcaption>
                <a href={shot.url} download={(thriller ? T.thrillerShotFile : T.shotFile)(shot.crop === 'half')}>
                  {T.download}
                </a>
                <a className="otw__shot-by" href={GITHUB} target="_blank" rel="noreferrer">
                  by alexxblaro
                </a>
              </figcaption>
            </figure>
          ) : null}

          <p className="otw__caption" aria-live="polite">
            {(thriller ? T.thrillerCaptions : T.captions)[zone]}
          </p>
          <p className="otw__notice" aria-live="polite">
            {notice}
          </p>
          {/* Ayuda: con el dedo en pantallas táctiles, con el teclado en el resto. */}
          <p className="otw__help otw__help--touch">{T.helpTouch}</p>
          <p className="otw__help otw__help--keys">
            {T.help[0]}
            <kbd>W</kbd>
            <kbd>A</kbd>
            <kbd>S</kbd>
            <kbd>D</kbd>
            {T.help[1]}
            <kbd>{T.help[2]}</kbd>
            {T.help[3]}
            <kbd>Q</kbd>/<kbd>E</kbd>
            {T.help[4]}
            <kbd>+</kbd>/<kbd>−</kbd>
            {T.help[5]}
            <kbd>1</kbd>–<kbd>4</kbd>
            {T.help[6]}
            <kbd>C</kbd>
            {T.help[7]}
            <kbd>F</kbd>
            {T.help[8]}
            <kbd>G</kbd>
            {T.help[9]}
            <kbd>M</kbd>
            {T.help[10]}
          </p>


          {/* Firma y dedicatoria. */}
          <footer className="otw__dedication">
            <blockquote className="otw__quote" lang="en">
              <p>“In a world filled with hate, we must still dare to hope.”</p>
              <cite>Michael Jackson</cite>
            </blockquote>
            {T.quoteTr ? <p className="otw__quote-es">{T.quoteTr}</p> : null}
            <p className="otw__signature">
              {T.signature[0]}
              <strong>Alejandro Blanco</strong>
              {T.signature[1]}
            </p>
          </footer>

          {showBudget ? (
            <p className={verdict === false ? 'otw__budget is-over' : 'otw__budget'}>
              {budget
                ? `calls ${budget.calls} · triangles ${budget.triangles} · geometries ${budget.geometries} · textures ${budget.textures}`
                : T.measuring}
              {verdict === true ? ' · dentro del techo' : ''}
              {verdict === false ? ' · por encima del techo' : ''}
            </p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
