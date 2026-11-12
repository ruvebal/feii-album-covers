// SkyLights.jsx — luces del mundo ligadas a la hora del día (tod, la escribe CameraRig).
//
// - Sol (direccional): misma dirección que el sol del cielo (sunDirection de sky.js), así que el
//   contraluz sobre Freddie sale de donde se ve el sol. Se apaga entre tod 0 y 0,6 y enrojece.
// - Ambiente: de cálido (atardecer) a azul frío y más bajo (noche).
// - Dos focos violetas desde la torre del escenario: suben con la noche (tod 0,2 → 0,9).
// Sin asignaciones en useFrame: colores y vectores se reutilizan.

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, MathUtils } from 'three';
import { sunDirection } from './sky.js';

const SUN_DIST = 40;
const SUN_DUSK = new Color('#ffb870');
const SUN_LATE = new Color('#ff6a3a');
const AMB_DUSK = new Color('#ffb98a');
const AMB_NIGHT = new Color('#5a6cc8');

/**
 * @param {object} props
 * @param {import('react').RefObject<{ tod: number }>} props.progress
 */
export default function SkyLights({ progress }) {
  const sun = useRef(null);
  const ambient = useRef(null);
  const spotL = useRef(null);
  const spotR = useRef(null);

  useFrame(() => {
    const tod = progress.current.tod;
    if (sun.current) {
      sunDirection(tod, sun.current.position).multiplyScalar(SUN_DIST);
      const day = 1 - MathUtils.smoothstep(tod, 0, 0.6);
      sun.current.intensity = 2.2 * day;
      sun.current.color.lerpColors(SUN_LATE, SUN_DUSK, day);
      // No se oculta con `visible`: cambiar el número de luces recompila todos los materiales (tirón).
    }
    if (ambient.current) {
      ambient.current.color.lerpColors(AMB_DUSK, AMB_NIGHT, tod);
      ambient.current.intensity = MathUtils.lerp(0.35, 0.2, tod);
    }
    const violet = MathUtils.lerp(15, 140, MathUtils.smoothstep(tod, 0.2, 0.9));
    if (spotL.current) spotL.current.intensity = violet;
    if (spotR.current) spotR.current.intensity = violet;
  });

  return (
    <>
      <ambientLight ref={ambient} intensity={0.35} color="#ffb98a" />
      <directionalLight ref={sun} position={[-9.7, 2, -38.8]} intensity={2.2} color="#ffb870" />
      {/* Focos violetas: torre detrás del público (−Z), cruzados sobre Freddie. target por defecto = origen. */}
      <spotLight ref={spotL} position={[-6, 12, -8]} angle={0.5} penumbra={1} intensity={15} color="#9a4dff" />
      <spotLight ref={spotR} position={[6, 12, -8]} angle={0.5} penumbra={1} intensity={15} color="#b45cff" />
    </>
  );
}
