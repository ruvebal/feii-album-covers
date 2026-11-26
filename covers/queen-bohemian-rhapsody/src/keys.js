// keys.js — keyframes del vuelo de cámara (los lee CameraRig.jsx).
//
// Ejes de la escena (mismos que tendrá el GLB de Blender en task3):
//   - metros; +Y arriba; Freddie en el origen con los pies en y = 0, mirando hacia -Z;
//   - la superficie del escenario es y = 0; el césped está en FLOOR_Y (scene.js);
//   - el sol está hacia +Z (contraluz cuando la cámara viene desde -Z).
//
// t en segundos (≈ 55,5 s; guion del GATE 4) · tod = time of day (0 atardecer, 1 noche).
// Los keys del vuelo se afinan con la tecla P (modo dev).
// La pose MATCH y la funda NO se afinan a mano: se calculan abajo (match cut).

/**
 * @typedef {{ t: number, pos: [number, number, number], look: [number, number, number], fov: number, tod: number }} CameraKey
 */

// ---------------------------------------------------------------------------------------------
// MATCH CUT portada → mundo
// La figura de public/sleeve.png (tools/make-sleeve.mjs) y el Freddie 3D (placeholders.js) se
// alinean vistos desde la cámara MATCH: la funda está entre la cámara y Freddie, a la escala justa
// para que cabeza y pies de la figura pintada caigan sobre cabeza y pies del maniquí 3D.
// El plano arranca POR DETRÁS del cantante (como el vídeo): cámara en +Z mirando a −Z, Freddie de
// espaldas a contraluz (el sol está delante de él, al fondo, en −Z).
// Durante el zoom y el fundido la cámara NO se mueve (solo cambia el FOV): sin paralaje, el encaje
// se mantiene exacto mientras la portada se desvanece y aparece el estadio.
// ---------------------------------------------------------------------------------------------

/** Figura en la imagen de la funda (UV con v hacia abajo, como el canvas de make-sleeve.mjs). */
const FIGURE = { u: 0.6, vTop: 0.353, vBottom: 0.924 };
/** Maniquí 3D (placeholders.js · makeFreddie): alturas de pies y coronilla, plano z = 0. */
const FREDDIE = { bottom: 0.05, top: 1.82, z: 0 };

/** Lado de la funda (m). */
export const SLEEVE_SIZE = 1.0;
/** Distancia cámara → funda en la pose MATCH; ≈ 2,9 lados, el encuadre relativo de covers/_studio. */
const MATCH_DIST = 2.9;

/** Hacia dónde mira la cámara MATCH en Z: −1 = desde detrás de Freddie (él mira a −Z). */
export const VIEW_DIR = -1;

// Semejanza de triángulos: k = (distancia a la funda) / (distancia a Freddie).
const K = ((FIGURE.vBottom - FIGURE.vTop) * SLEEVE_SIZE) / (FREDDIE.top - FREDDIE.bottom);
const CAM_Z = FREDDIE.z - VIEW_DIR * (MATCH_DIST / K);
// Cámara mirando recto (VIEW_DIR) y funda centrada en pantalla: la vertical de Freddie (x = 0) cae
// en u y sus pies en vBottom. Mirando a −Z la derecha de la cámara es +X (mirando a +Z, −X).
const CAM_X = (VIEW_DIR * (FIGURE.u - 0.5) * SLEEVE_SIZE) / K;
const CAM_Y = FREDDIE.bottom + ((FIGURE.vBottom - 0.5) * SLEEVE_SIZE) / K;

/** Pose MATCH: de frente a la funda, cantante centrado. Aquí termina el acercamiento y empieza el zoom. */
export const MATCH = {
  pos: /** @type {[number, number, number]} */ ([CAM_X, CAM_Y, CAM_Z]),
  look: /** @type {[number, number, number]} */ ([CAM_X, CAM_Y, CAM_Z + VIEW_DIR * 5]),
  fov: 35,
};

/** Centro de la funda (CoverPortal) y objetivo de la órbita en idle. */
export const SLEEVE_CENTER = /** @type {[number, number, number]} */ ([CAM_X, CAM_Y, CAM_Z + VIEW_DIR * MATCH_DIST]);

/**
 * Cámara inicial en idle: tres cuartos (de lado y algo por encima) a MATCH_DIST de la funda, el
 * mismo ángulo que covers/_studio: delante de la funda y hacia la derecha de cámara (donde asoma el vinilo).
 */
const IDLE_DIR = [-5.4 * VIEW_DIR, 2.5, -6.4 * VIEW_DIR];
const IDLE_LEN = Math.hypot(...IDLE_DIR);
export const IDLE_CAMERA = /** @type {[number, number, number]} */ (
  SLEEVE_CENTER.map((c, i) => c + (IDLE_DIR[i] / IDLE_LEN) * MATCH_DIST)
);
/** Límites de la órbita en idle (m). */
export const ORBIT_DIST = [MATCH_DIST * 0.5, MATCH_DIST * 2];

/** Segundos del acercamiento desde donde dejaste la órbita hasta la pose MATCH. */
export const APPROACH = 1.2;

/** 0 → FLIGHT_FROM: zoom (FOV de MATCH.fov a ZOOM_FOV) sobre el cantante, cámara quieta. */
export const FLIGHT_FROM = 3.6;
export const ZOOM_FOV = 17;

/** Fundido portada → mundo dentro del zoom; el mundo se enciende al empezar el fundido. */
export const PORTAL_FADE = [1.6, 3.4];
export const WORLD_FROM = PORTAL_FADE[0];

/**
 * Vuelo (desde FLIGHT_FROM), guion de gontugithub en el GATE 4 (sustituye a los planos del vídeo de 16,5 s):
 * 1. Revelado lateral por detrás, en contrapicado (se ve el cielo como en la portada) y paso por su costado.
 * 2. Sobre su hombro derecho (+X: Freddie mira a −Z) hacia el público; vuela sobre la multitud hasta el
 *    fondo del estadio y se gira: el escenario visto desde la grada, como un espectador.
 * 3. Dron por la ladera de la grada (círculo alrededor del centro z = −22), mirando siempre a Freddie.
 * 4. Entra bajo el techo del escenario (tarima y = 0, focos a 7,3 m), lo encuadra y se queda detrás de él.
 * 5. Sale por delante y sube sobre la grada del fondo: Freddie en el escenario y la multitud con los móviles (tod = 1).
 * Medidas del GLB: grada r = 24…59 m desde (0, −22); tarima x ±7, z −2…9,6; muro de fondo en z ≈ 9,6.
 *
 * @type {CameraKey[]}
 */
export const KEYS = [
  { t: FLIGHT_FROM, pos: MATCH.pos, look: MATCH.look, fov: ZOOM_FOV, tod: 0 }, // portada → Freddie, ampliado
  // 1 · por detrás, a contraluz y desde abajo (cielo como en la portada)
  { t: 6.5, pos: [3.2, 0.7, 4.5], look: [0, 2.2, -3], fov: 50, tod: 0 }, // revelado lateral en contrapicado
  { t: 9.5, pos: [2.6, 1.0, 2.8], look: [0, 2.0, -1.5], fov: 46, tod: 0.03 }, // por su costado
  { t: 12.5, pos: [0.75, 1.95, 0.9], look: [0, 1.2, -14], fov: 50, tod: 0.08 }, // sobre su hombro derecho → público
  // 2 · sobre la multitud hasta el fondo y vuelta al escenario
  { t: 14.5, pos: [0.4, 2.8, -5], look: [0, 0.4, -26], fov: 52, tod: 0.15 }, // sale del escenario
  { t: 16.8, pos: [0, 3.6, -20], look: [0, 1.5, -46], fov: 52, tod: 0.22 }, // sobre las cabezas
  { t: 19.0, pos: [-2.5, 4.2, -38], look: [-16, 3, -40], fov: 46, tod: 0.28 }, // fondo del campo, girando
  { t: 21.5, pos: [0, 3.0, -49], look: [0, 2.2, 0], fov: 28, tod: 0.33 }, // desde la grada: perspectiva de espectador
  { t: 24.0, pos: [5, 4.5, -48], look: [0, 2.0, 0], fov: 28, tod: 0.37 }, // pausa, empieza a subir
  // 3 · dron por la ladera de la grada (r ≈ 28–32 desde z = −22), siempre mirando a Freddie
  { t: 27.5, pos: [18, 9, -45], look: [0, 1.6, 0], fov: 28, tod: 0.42 },
  { t: 31.0, pos: [29, 8.5, -26], look: [0, 1.6, 0], fov: 30, tod: 0.47 },
  { t: 34.5, pos: [22, 6.5, -9], look: [0, 1.6, 0], fov: 34, tod: 0.52 },
  // 4 · entra en el escenario, lo encuadra y se queda detrás
  { t: 37.5, pos: [10.5, 3.6, -1.5], look: [0, 1.7, 0], fov: 42, tod: 0.6 }, // borde de la tarima
  { t: 40.5, pos: [3.2, 1.9, 1.4], look: [0, 1.7, 0], fov: 40, tod: 0.7 }, // dentro, bajo los focos
  { t: 43.5, pos: [0.7, 2.0, 3.4], look: [0, 1.3, -12], fov: 50, tod: 0.8 }, // detrás de él, al público
  // 5 · sale por delante bajo el techo (el muro del fondo, z ≈ 9,6, tapa la subida por detrás) y sube
  { t: 47.0, pos: [2.5, 5.5, -6], look: [0, 1.6, 0], fov: 50, tod: 0.88 },
  { t: 51.5, pos: [5, 15, -30], look: [0, 2, -4], fov: 40, tod: 0.95 },
  { t: 55.5, pos: [6, 22, -48], look: [0, 2, -8], fov: 34, tod: 1 }, // plano final: escenario y móviles
];

/** Duración total de la intro, en segundos. */
export const INTRO_END = KEYS[KEYS.length - 1].t;
