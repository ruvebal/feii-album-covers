// El viaje de Michael de un disco a otro (Off the Wall ↔ Thriller): se gira
// y se va haciendo el moonwalk por detrás de la pared, o vuelve por el mismo
// camino. Lo usan Michael.jsx (dónde dibujarlo) y la ruta (cuánto dura).

import { TRAVEL_SPEED } from './dances.js';
import { MICHAEL } from './set.js';

/**
 * Viaje de un disco a otro: Michael se gira y se va haciendo el moonwalk por
 * detrás de la pared (por su lado izquierdo, donde acaba el muro), o vuelve
 * por el mismo camino hasta su sitio. Camino en metros, en el suelo.
 */
const PATH = [
  [MICHAEL.x, MICHAEL.z],
  [-3.6, 0.05],
  [-3.75, -1.9],
];
const TURN = 0.7;
/** Al irse, antes del moonwalk da una vuelta entera (y un cuarto) sobre sí mismo. */
export const SPIN_TIME = 1.1;
const segLen = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
const PATH_LEN = segLen(PATH[0], PATH[1]) + segLen(PATH[1], PATH[2]);
/** Cuánto dura cada viaje (s): el giro y el moonwalk entero. */
export const TRAVEL_TIME = TURN + PATH_LEN / TRAVEL_SPEED + TURN;

/** Punto a `d` metros a lo largo de un camino, y hacia dónde va. */
function along(path, d) {
  let rest = d;
  for (let i = 1; i < path.length; i += 1) {
    const l = segLen(path[i - 1], path[i]);
    if (rest <= l || i === path.length - 1) {
      const k = Math.min(1, rest / (l || 1));
      const [ax, az] = path[i - 1];
      const [bx, bz] = path[i];
      return { x: ax + (bx - ax) * k, z: az + (bz - az) * k, dx: (bx - ax) / (l || 1), dz: (bz - az) / (l || 1) };
    }
    rest -= l;
  }
  return { x: path[0][0], z: path[0][1], dx: 0, dz: 1 };
}

/**
 * Dónde está Michael durante el viaje: posición, hacia dónde mira (yaw), si
 * va haciendo el moonwalk, si se ve y el tiempo de paso. `travel` = { kind:
 * 'exit' | 'enter', at } (at en s de performance.now).
 */
export function travelState(travel, now) {
  if (!travel) return null;
  const t = now - travel.at;
  const walkTime = PATH_LEN / TRAVEL_SPEED;
  // Al ir hacia atrás mira justo al revés de por donde avanza.
  const faceAway = (dx, dz) => Math.atan2(-dx, -dz);
  if (travel.kind === 'exit') {
    if (t < 0) return null;
    if (t < SPIN_TIME) {
      const k = t / SPIN_TIME;
      const yaw = (Math.PI * 2 + faceAway(-1, 0)) * (k * k * (3 - 2 * k));
      return { x: PATH[0][0], z: PATH[0][1], yaw, walk: false, visible: true, t };
    }
    const d = (t - SPIN_TIME) * TRAVEL_SPEED;
    if (d > PATH_LEN) return { x: PATH[2][0], z: PATH[2][1], yaw: 0, walk: false, visible: false, t };
    const a = along(PATH, d);
    return { x: a.x, z: a.z, yaw: faceAway(a.dx, a.dz), walk: true, visible: true, t: t - SPIN_TIME };
  }
  // Entrada: el mismo camino al revés, y al llegar se gira hacia la cámara.
  const back = [...PATH].reverse();
  if (t < 0) return { x: back[0][0], z: back[0][1], yaw: 0, walk: false, visible: false, t: 0 };
  const d = t * TRAVEL_SPEED;
  if (d < PATH_LEN) {
    const a = along(back, d);
    return { x: a.x, z: a.z, yaw: faceAway(a.dx, a.dz), walk: true, visible: true, t };
  }
  const k = Math.min(1, (t - walkTime) / TURN);
  const yaw = faceAway(1, 0) * (1 - k * k * (3 - 2 * k));
  return { x: PATH[0][0], z: PATH[0][1], yaw, walk: false, visible: true, t, done: k >= 1 };
}


/** Duración de la salida (giro + moonwalk) y de la entrada (moonwalk + giro), en s. */
export const TRAVEL_EXIT = SPIN_TIME + PATH_LEN / TRAVEL_SPEED;
export const TRAVEL_ENTER = PATH_LEN / TRAVEL_SPEED + TURN;
