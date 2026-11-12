// Medidas del plató (en metros) y las vistas de cámara que ofrece la ruta.
// Un solo sitio para los números que comparten la escena, la cámara y el DOM.

/** Pared de ladrillo del fondo: su cara delantera está en z = WALL.z. */
// Michael está casi pegado a la pared, como en la foto (su sombra cae justo al lado).
export const WALL = { width: 6.4, height: 4.2, z: -1.0 };

/** Hasta dónde se puede caminar (no se atraviesa la pared ni se sale del plató). */
// Las paredes del estudio están en x = ±4,3 y z = 10,5 (Studio.jsx).
export const BOUNDS = { minX: -4.0, maxX: 4.0, minZ: WALL.z + 0.28, maxZ: 10.2, minY: 0.25, maxY: 3.2 };

/**
 * Lo que la cámara no puede atravesar al caminar por debajo de 2 m: círculos
 * [x, z, radio] alrededor de los pies de luz, el trípode, los muebles y los
 * baúles del plató (Studio.jsx, RecordPlayer.jsx, LiveMonitor.jsx, SpotifyMirror.jsx).
 */
export const COLLIDERS = [
  [-2.1, 2.7, 0.4],
  [2.3, 2.2, 0.4],
  [0.9, 3.9, 0.35],
  [2.9, 3.3, 0.45],
  [-3.7, 3.3, 0.35],
  [-2.75, 6.1, 0.75],
  [-1.55, 6.3, 0.42],
  [2.58, 4.98, 0.62],
  [2.0, 7.7, 0.5],
  [-2.7, 8.3, 0.5],
  [-0.95, 4.25, 0.3],
  [2.6, 6.4, 0.45],
  // Rincón Studio 54: la mesa de las copas y los postes del cordón (Disco54.jsx).
  [3.45, 9.55, 0.5],
  [2.45, 9.7, 0.22],
  [3.1, 8.45, 0.22],
  [3.95, 8.35, 0.22],
];

/** Donde está Michael (centro de los pies) y a qué altura mira la cámara. */
// x: 10 cm a la derecha del centro del encuadre, como en la portada (su
// centro queda al 51 % del ancho de la foto).
export const MICHAEL = { x: 0.1, z: 0, eye: 1.05 };

/**
 * Vistas con nombre. `position` es la cámara y `target` el punto al que mira.
 * `cover` reproduce el encuadre de la portada: de frente, a la altura del pecho.
 */
export const VIEWS = {
  cover: { label: 'Portada', position: [0, 0.72, 4.4], target: [0, 0.95, 0] },
  side: { label: 'De lado', position: [3.1, 1.35, 1.6], target: [0, 1.0, -0.2] },
  behind: { label: 'Por detrás de Michael', position: [-1.15, 1.7, -0.72], target: [0.3, 1.0, 2.6] },
  set: { label: 'El plató', position: [-3.3, 2.9, 6.9], target: [0.2, 0.8, 0.9] },
  // La cara de cerca: la sonrisa, el afro y la pajarita.
  face: { label: 'Primer plano', position: [0.22, 1.66, 1.15], target: [0, 1.6, 0] },
  // Delante del monitor del plató: se ve la imagen de la portada.
  monitor: { label: 'El monitor', position: [-1.85, 1.42, 5.3], target: [-0.95, 1.3, 4.25] },
  // Delante del cuadro de los Jackson 5 y del tocadiscos, en la pared derecha.
  // El tocadiscos y sus discos, en la mesa junto a la pared derecha.
  // Un poco más lejos y centrada en la mesa, para que entren los cinco discos.
  deck: { label: 'Tocadiscos', position: [0.63, 1.68, 6.05], target: [2.55, 0.9, 5.05] },
  j5: { label: 'Los Jackson 5', position: [0.95, 1.6, 4.75], target: [3.9, 1.45, 4.68] },
};


/** Campo de visión vertical de la cámara (grados). */
export const FOV = 32;

/** Fracción del alto de la pantalla que ocupa el encuadre cuadrado de la portada (igual que en route.css). */
export function frameFraction(width, height) {
  return Math.min(0.78, (0.86 * width) / height);
}

/**
 * Campo de visión según la pantalla. En horizontal es FOV. En vertical (móvil
 * o tableta de pie) el cuadrado de la portada ocupa menos alto de pantalla, y
 * con la misma lente habría que irse muy lejos para que Michael cupiera: todo
 * el plató se veía por un tubo. Aquí se abre la lente lo justo para que la
 * portada se haga desde la misma distancia que en un ordenador (tope: 75°).
 */
export function fovFor(width, height) {
  const half = (Math.tan((FOV * Math.PI) / 360) * 0.78) / frameFraction(width, height);
  return Math.min(75, (2 * Math.atan(half) * 180) / Math.PI);
}

/**
 * Posición de la cámara para la vista "Portada": se aleja o se acerca según la
 * pantalla, para que el cuadrado de la portada abarque siempre 1,95 m, de los
 * zapatos a justo por encima del pelo, como en la foto original (donde Michael
 * llena casi todo el alto). Igual en un móvil vertical que en un PC.
 */
export function coverPosition(width, height) {
  const span = 1.95;
  const d = span / (frameFraction(width, height) * 2 * Math.tan((fovFor(width, height) * Math.PI) / 360));
  // Cámara baja, a la altura de la cadera, mirando un poco hacia arriba: casi
  // no se ve suelo, como en la foto.
  return [0, 0.72, MICHAEL.z + d];
}
