// Colisiones del loft en coordenadas de three.js (x, z). Salen de las cajas
// delimitadoras de Blender (x igual, z = -y de Blender), medidas el 2026-11-18.
// Son cajas, no la forma real: el jugador roza con rectángulos.

/** [minX, maxX, minZ, maxZ, nombre] */
export const COLLIDERS = [
  [-3.552, 0.936, -2.64, 2.93, 'sofá'],
  [-0.792, 0.792, 0.128, 1.712, 'mesa de centro'],
  [-2.096, -0.147, 3.005, 5.241, 'butaca'],
  [-4.285, -2.691, -4.129, -2.46, 'planta'],
  [3.4, 4.3, -4.65, -3.83, 'mueble de discos'],
  [0.8, 3.0, -4.66, -4.36, 'estantes'],
];

/** Límites caminables: ventanal a la izquierda, pared del fondo, lados abiertos recortados. */
export const BOUNDS = { minX: -4.5, maxX: 4.5, minZ: -4.35, maxZ: 10.0 };

export const SPAWN = { x: 1.2, z: 4.5, yaw: 0 };
export const EYE = 1.7;
export const RADIUS = 0.28;

/** Plato del tocadiscos: centro x,z de three.js e y de la superficie. Se ajusta mirando el render. */
export const PLATTER = { x: 3.85, y: 1.447, z: -4.24, r: 0.19 }; // y medida lanzando rayos al modelo (superficie en 1,437)

/** Dónde se planta Steve para poner el disco: delante del mueble, mirando al plato. */
export const TURNTABLE_STAND = { x: 3.85, z: -3.35 }; // a un paso del frente del mueble: las manos llegan al plato
