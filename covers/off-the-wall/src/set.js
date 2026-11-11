// Medidas del plató (en metros) y las vistas de cámara que ofrece la ruta.
// Un solo sitio para los números que comparten la escena, la cámara y el DOM.

/** Pared de ladrillo del fondo: su cara delantera está en z = WALL.z. */
export const WALL = { width: 6.4, height: 4.2, z: -1.9 };

/** Hasta dónde se puede caminar (no se atraviesa la pared ni se sale del plató). */
export const BOUNDS = { minX: -2.9, maxX: 2.9, minZ: WALL.z + 0.28, maxZ: 10.5, minY: 0.25, maxY: 3.2 };

/** Donde está Michael (centro de los pies) y a qué altura mira la cámara. */
export const MICHAEL = { x: 0, z: 0, eye: 1.05 };

/**
 * Vistas con nombre. `position` es la cámara y `target` el punto al que mira.
 * `cover` reproduce el encuadre de la portada: de frente, a la altura del pecho.
 */
export const VIEWS = {
  cover: { label: 'Portada', position: [0, 1.16, 5.1], target: [0, 1.12, 0] },
  side: { label: 'De lado', position: [3.1, 1.35, 1.6], target: [0, 1.0, -0.2] },
  behind: { label: 'Por detrás de Michael', position: [-0.95, 1.65, -1.55], target: [0.55, 1.05, 2.6] },
  set: { label: 'El plató', position: [-3.3, 2.9, 6.9], target: [0.2, 0.8, 0.9] },
};


/** Campo de visión vertical de la cámara (grados). */
export const FOV = 32;

/** Fracción del alto de la pantalla que ocupa el encuadre cuadrado de la portada (igual que en route.css). */
export function frameFraction(width, height) {
  return Math.min(0.78, (0.86 * width) / height);
}

/**
 * Posición de la cámara para la vista "Portada": se aleja o se acerca según la
 * pantalla, para que el cuadrado de la portada abarque siempre unos 2,25 m
 * (de los pies a por encima del pelo), igual en un móvil vertical que en un PC.
 */
export function coverPosition(width, height) {
  const span = 2.4;
  const d = span / (frameFraction(width, height) * 2 * Math.tan((FOV * Math.PI) / 360));
  return [0, 1.16, MICHAEL.z + d];
}
