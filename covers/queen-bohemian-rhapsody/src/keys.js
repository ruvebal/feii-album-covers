// keys.js — keyframes del vuelo de cámara (los lee CameraRig.jsx).
//
// Ejes de la escena (mismos que tendrá el GLB de Blender en task3):
//   - metros; +Y arriba; Freddie en el origen con los pies en y = 0, mirando hacia -Z;
//   - la superficie del escenario es y = 0; el césped está en FLOOR_Y (scene.js);
//   - el sol está hacia +Z (contraluz cuando la cámara viene desde -Z).
//
// t en segundos (los del vídeo de referencia, 16,5 s) · tod = time of day (0 atardecer, 1 noche).
// ⚠️ Los keys desde t = 4 son estimados: se afinan en el GATE 1 con la tecla P (modo dev).
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
export const FLIGHT_FROM = 2.4;
export const ZOOM_FOV = 17;

/** Fundido portada → mundo dentro del zoom; el mundo se enciende al empezar el fundido. */
export const PORTAL_FADE = [1.3, 2.3];
export const WORLD_FROM = PORTAL_FADE[0];

/**
 * Vuelo (desde FLIGHT_FROM). El primer key es la pose MATCH ya ampliada: el vuelo arranca justo
 * donde acaba el zoom. Desde t = 4 son los planos del vídeo de referencia: revelado, push-in y
 * contrapicado POR DETRÁS (+Z); desde t = 9,3 los planos de cara, por delante (−Z).
 *
 * @type {CameraKey[]}
 */
export const KEYS = [
  { t: FLIGHT_FROM, pos: MATCH.pos, look: MATCH.look, fov: ZOOM_FOV, tod: 0 }, // portada → Freddie, ampliado
  { t: 4.0, pos: [3.5, 1.1, 6], look: [0, 1.5, 0], fov: 45, tod: 0 }, // revelado por detrás: Freddie a contraluz
  { t: 5.3, pos: [1.8, 1.4, 3.4], look: [0, 1.8, 0], fov: 45, tod: 0 }, // push-in por detrás
  { t: 6.7, pos: [1.2, 1.0, 1.4], look: [0, 1.9, -0.3], fov: 50, tod: 0 }, // contrapicado, sobre el hombro
  { t: 8.0, pos: [0.8, 1.9, 1.6], look: [0, 2.2, -12], fov: 50, tod: 0.05 }, // tras él, mirando a la grada que tiene delante
  { t: 9.3, pos: [0.5, 1.75, -1.1], look: [0, 1.72, 0], fov: 38, tod: 0.3 }, // primer plano de la cara
  { t: 10.7, pos: [0.4, 1.7, -1.0], look: [0, 1.85, 0], fov: 38, tod: 0.5 }, // leve tilt, focos violetas
  { t: 12.0, pos: [0.3, 1.0, -1.4], look: [0, 0.9, 0], fov: 45, tod: 0.8 }, // baja a cinturón / pie de micro
  { t: 13.3, pos: [0, 1.3, -2.5], look: [0, 9, -30], fov: 60, tod: 1 }, // tilt al cielo estrellado
  { t: 16.5, pos: [1, 1.1, -2], look: [0, 4, -25], fov: 60, tod: 1 }, // plano final
];

/** Duración total de la intro, en segundos. */
export const INTRO_END = KEYS[KEYS.length - 1].t;
