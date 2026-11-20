// Órdenes para la cámara (CameraRig las escucha en window), para que cualquier
// objeto de la escena o del panel pueda moverla sin pasar props por todos lados.

/** Vuela la cámara a `position` mirando a `target`. */
export const goTo = (position, target) =>
  window.dispatchEvent(new CustomEvent('otw-goto', { detail: { position, target } }));

/**
 * Recorrido continuo por varias paradas ({ position, target, time en s }),
 * desde donde esté la cámara. Con `null` se corta.
 */
export const tour = (stops) => window.dispatchEvent(new CustomEvent('otw-tour', { detail: stops }));

/** Camina hasta el punto del suelo `point` ([x, y, z]), sin cambiar hacia dónde se mira. */
export const walkTo = (point) => window.dispatchEvent(new CustomEvent('otw-walk', { detail: point }));
