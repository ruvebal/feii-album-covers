// sky.js — reloj y sol compartidos por el cielo (SunsetSky), las luces (SkyLights) y la multitud (Crowd).
//
// - SKY_PERIOD: uTime se envuelve con este periodo (en JS, antes de subirlo). Todo lo que se
//   mueve en el cielo da un número ENTERO de vueltas por periodo (nubes 1, estrellas 10,
//   centelleo 1000), así que el salto 3000 → 0 no se ve: el estado en 0 y en 3000 es el mismo.
// - BEAT_HZ: pulso de la multitud (72 bpm, el tempo de la balada). La fase del pulso se calcula
//   en JS (double) y llega al shader ya en [0, 1): el bote funciona igual en mediump.
// - sunDirection(tod): el sol que se ve en el cielo y la luz direccional salen de aquí, así que
//   el halo del cielo y el contraluz sobre Freddie coinciden. Con tod (0 atardecer → 1 noche) el
//   sol baja de +2,9° a −7° por debajo del horizonte.

import { MathUtils } from 'three';

export const SKY_PERIOD = 3000; // s
export const BEAT_HZ = 72 / 60;

// Azimut fijo: hacia −Z (la grada que Freddie tiene delante), algo a −X (izquierda de la cámara MATCH).
const AZ_X = -0.25;
const AZ_Z = -1.0;
const AZ_LEN = Math.hypot(AZ_X, AZ_Z);
const ELEV_DUSK = MathUtils.degToRad(2.9);
const ELEV_NIGHT = MathUtils.degToRad(-7);

/**
 * Dirección (unitaria, mundo) hacia el sol para una hora del día.
 *
 * @param {number} tod 0 atardecer … 1 noche.
 * @param {import('three').Vector3} out Se escribe y se devuelve (sin asignaciones por frame).
 * @returns {import('three').Vector3}
 */
export function sunDirection(tod, out) {
  const e = MathUtils.lerp(ELEV_DUSK, ELEV_NIGHT, MathUtils.clamp(tod, 0, 1));
  const c = Math.cos(e) / AZ_LEN;
  return out.set(AZ_X * c, Math.sin(e), AZ_Z * c);
}
