// keys.js — keyframes del vuelo de cámara (los lee CameraRig.jsx).
//
// Ejes de la escena (mismos que tendrá el GLB de Blender en task3):
//   - metros; +Y arriba; Freddie en el origen con los pies en y = 0, mirando hacia -Z;
//   - la superficie del escenario es y = 0; el césped está en FLOOR_Y (scene.js);
//   - el sol está hacia +Z (contraluz cuando la cámara viene desde -Z).
//
// t en segundos (los del vídeo de referencia, 16,5 s) · tod = time of day (0 atardecer, 1 noche).
// ⚠️ Valores iniciales estimados: se afinan en el GATE 1 con la tecla P (modo dev).

/**
 * @typedef {{ t: number, pos: [number, number, number], look: [number, number, number], fov: number, tod: number }} CameraKey
 */

/** @type {CameraKey[]} */
export const KEYS = [
  { t: 0.0, pos: [0, 1.6, -14], look: [0, 1.6, -9], fov: 35, tod: 0 }, // portada flotando en el vacío
  { t: 2.7, pos: [0, 1.6, -9.6], look: [0, 1.6, -4], fov: 40, tod: 0 }, // atravesamos la portada
  { t: 4.0, pos: [-3.5, 1.1, -6], look: [0, 1.5, 0], fov: 45, tod: 0 }, // revelado: Freddie a contraluz
  { t: 5.3, pos: [-1.8, 1.4, -3.4], look: [0, 1.8, 0], fov: 45, tod: 0 }, // push-in
  { t: 6.7, pos: [-1.2, 1.0, -1.4], look: [0, 1.9, 0.3], fov: 50, tod: 0 }, // contrapicado, hombro
  { t: 8.0, pos: [0.8, 1.9, 1.6], look: [0, 2.2, 12], fov: 50, tod: 0.05 }, // tras él, mirando a la grada
  { t: 9.3, pos: [0.5, 1.75, -1.1], look: [0, 1.72, 0], fov: 38, tod: 0.3 }, // primer plano de la cara
  { t: 10.7, pos: [0.4, 1.7, -1.0], look: [0, 1.85, 0], fov: 38, tod: 0.5 }, // leve tilt, focos violetas
  { t: 12.0, pos: [0.3, 1.0, -1.4], look: [0, 0.9, 0], fov: 45, tod: 0.8 }, // baja a cinturón / pie de micro
  { t: 13.3, pos: [0, 1.3, -2.5], look: [0, 9, -30], fov: 60, tod: 1 }, // tilt al cielo estrellado
  { t: 16.5, pos: [1, 1.1, -2], look: [0, 4, -25], fov: 60, tod: 1 }, // plano final
];

/** Duración total de la intro, en segundos. */
export const INTRO_END = KEYS[KEYS.length - 1].t;

/** La portada se desvanece en este intervalo y el estadio aparece al pasar WORLD_FROM. */
export const PORTAL_FADE = [2.2, 3.4];
export const WORLD_FROM = 2.6;
