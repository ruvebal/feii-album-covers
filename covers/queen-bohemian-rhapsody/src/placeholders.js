// placeholders.js — geometría procedural de task1 (USE_GLB = false).
//
// Sustituye al GLB de Blender hasta task3. Cada pieza lleva el MISMO nombre de nodo
// y las MISMAS medidas que tendrá el modelo (ver keys.js para los ejes), así que
// cambiar a GLB no obliga a tocar la cámara:
//   Stadium  césped + grada escalonada (LatheGeometry)      → 1 draw call
//   Stage    caja del escenario, superficie en y = 0          → 1 draw call
//   Freddie  maniquí de cápsulas fusionadas (pose de brazo alzado) → 1 draw call
//   Mic      pie de micro corto + cabeza                     → 1 draw call
//   Fan_LOD0 fan-maniquí (cápsula + esfera), se instancia en Crowd.jsx
// Las piezas se fusionan con mergeGeometries para que cada nodo sea una sola llamada.
//
// Quien llama es dueño de la geometría devuelta: debe llamar a dispose() al desmontar.

import {
  BoxGeometry,
  CapsuleGeometry,
  CircleGeometry,
  CylinderGeometry,
  Euler,
  LatheGeometry,
  Matrix4,
  Quaternion,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Altura del césped: el escenario mide 1,6 m. */
export const FLOOR_Y = -1.6;

/** Grada: primera fila a STAND_R0 m del centro; cada fila sube STAND_RISE y se aleja STAND_DEPTH. */
export const STAND_R0 = 24;
export const STAND_ROWS = 40;
export const STAND_DEPTH = 0.9;
export const STAND_RISE = 0.55;
/** Altura (pies) de la fila `row` de la grada. */
export const standY = (row) => FLOOR_Y + 1 + row * STAND_RISE;

const tmpMatrix = new Matrix4();
const tmpQuat = new Quaternion();
const tmpEuler = new Euler();
const tmpPos = new Vector3();
const ONE = new Vector3(1, 1, 1);

/**
 * Coloca una geometría (en su sitio, la modifica) y la devuelve.
 *
 * @template {import('three').BufferGeometry} G
 * @param {G} geometry
 * @param {[number, number, number]} position
 * @param {[number, number, number]} [rotation] Euler XYZ en radianes.
 * @returns {G}
 */
function place(geometry, position, rotation = [0, 0, 0]) {
  tmpQuat.setFromEuler(tmpEuler.set(...rotation));
  tmpMatrix.compose(tmpPos.set(...position), tmpQuat, ONE);
  return geometry.applyMatrix4(tmpMatrix);
}

/**
 * Fusiona varias piezas en una geometría y libera las piezas.
 *
 * @param {import('three').BufferGeometry[]} parts
 * @returns {import('three').BufferGeometry}
 */
function fuse(parts) {
  const merged = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  if (!merged) throw new Error('placeholders: mergeGeometries failed (atributos distintos)');
  return merged;
}

/**
 * Freddie-maniquí (placeholder, ~1,8 m). Misma pose que la figura de NUESTRA portada
 * (tools/make-sleeve.mjs), para el match cut de keys.js. Se le ve POR DETRÁS: la cámara MATCH está
 * en +Z mirando a −Z (−X a su izquierda), así que el puño en alto (izquierda de la imagen) va en −X
 * y el micro, delante de él, en +X. Piernas abiertas. Medidas = coordenadas de la imagen convertidas a metros con la escala del encaje
 * (1 / K ≈ 3,13 m por unidad de imagen). Si cambias la pose aquí o en el script, cambia las dos.
 * Pies en y ≈ 0,05 y coronilla en 1,82 (FREDDIE en keys.js).
 */
export function makeFreddie() {
  return fuse([
    // Piernas: de la cadera (±0,06; 0,95) a los pies (±0,28; 0,06). Rotación z > 0 inclina la punta hacia −X.
    place(new CapsuleGeometry(0.075, 0.77, 4, 12), [0.17, 0.5, 0], [0, 0, 0.243]), // pierna +X
    place(new CapsuleGeometry(0.075, 0.77, 4, 12), [-0.17, 0.5, 0], [0, 0, -0.243]), // pierna −X
    place(new CapsuleGeometry(0.16, 0.42, 4, 12), [0, 1.2, 0]), // torso
    place(new CapsuleGeometry(0.045, 0.08, 2, 8), [0, 1.56, 0]), // cuello
    place(new SphereGeometry(0.11, 16, 12), [0, 1.71, 0]), // cabeza (coronilla 1,82)
    // Brazo alzado: del hombro (−0,17; 1,5) al puño (−0,39; 2,17).
    place(new CapsuleGeometry(0.05, 0.6, 4, 10), [-0.28, 1.835, 0], [0, 0, 0.317]),
    place(new SphereGeometry(0.07, 12, 8), [-0.39, 2.17, 0]), // puño
    // Brazo del micro: codo abajo, mano al pecho, el micro delante de él (−Z).
    place(new CapsuleGeometry(0.05, 0.45, 4, 10), [0.26, 1.24, -0.1], [0.4, 0, 0.16]),
  ]);
}

/** Pie de micro corto (el "medio pie" que lleva en la mano) + cabeza del micro, en el lado +X. */
export function makeMic() {
  return fuse([
    place(new CylinderGeometry(0.012, 0.016, 0.8, 8), [0.24, 1.25, -0.28], [-0.3, 0, 0.2]),
    place(new SphereGeometry(0.035, 10, 8), [0.16, 1.63, -0.4]),
  ]);
}

/** Escenario: superficie en y = 0, borde delantero 2 m delante de Freddie. */
export function makeStage() {
  return place(new BoxGeometry(14, 1.6, 9), [0, -0.8, 2.5]);
}

/** Césped (círculo) + grada escalonada de 360°, en una sola geometría. */
export function makeStadium() {
  const profile = [new Vector2(STAND_R0 - 2, FLOOR_Y)];
  for (let row = 0; row < STAND_ROWS; row += 1) {
    const r = STAND_R0 + row * STAND_DEPTH;
    const y = standY(row);
    profile.push(new Vector2(r - STAND_DEPTH / 2, y), new Vector2(r + STAND_DEPTH / 2, y));
  }
  const outer = STAND_R0 + (STAND_ROWS - 1) * STAND_DEPTH + STAND_DEPTH / 2;
  profile.push(new Vector2(outer, standY(STAND_ROWS - 1) + 1.5)); // pretil superior

  const field = place(new CircleGeometry(STAND_R0 - 2, 48), [0, FLOOR_Y, 0], [-Math.PI / 2, 0, 0]);
  return fuse([field, new LatheGeometry(profile, 72)]);
}

/** Fan-maniquí (Fan_LOD0 provisional): pies en y = 0, ~1,45 m, ~96 triángulos. */
export function makeFan() {
  return fuse([
    place(new CapsuleGeometry(0.17, 0.8, 2, 6), [0, 0.6, 0]),
    place(new SphereGeometry(0.13, 6, 4), [0, 1.3, 0]),
  ]);
}
