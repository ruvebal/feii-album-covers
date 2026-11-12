// Estado compartido de la foto de cintura para arriba. Durante su disparo (un
// par de fotogramas) el título de tiza y la ventana se colocan como en la
// versión cuadrada del disco de medio cuerpo, donde salen más cerca de Michael.
// Lo leen WallTitle y WallWindow en su useFrame; lo cambia ShotCamera.

export const shotRig = { half: false };

/**
 * Encuadre de la foto de medio cuerpo, medido sobre esa portada: un cuadrado
 * de 1,14 m a la altura de Michael, del pelo (que toca el borde) a las caderas,
 * con Michael algo a la izquierda del centro. La cámara mira de frente desde 4,4 m.
 */
export const HALF_SHOT = { span: 1.14, centerX: 0.12, centerY: 1.35, distance: 4.4 };
