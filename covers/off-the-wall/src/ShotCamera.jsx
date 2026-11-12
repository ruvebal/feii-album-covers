// Pinta la escena en cada fotograma y, cuando se pide la foto de cintura para
// arriba, hace un fotograma con su propia cámara (encuadre HALF_SHOT) y con el
// título y la ventana recolocados, y avisa con el cuadrado del lienzo que hay
// que copiar. El fotograma siguiente vuelve a la cámara normal: el cambio dura
// lo que el destello del flash.
//
// Con prioridad 1 en useFrame, R3F deja de pintar solo: lo hace este componente.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { PerspectiveCamera } from 'three';
import { HALF_SHOT, shotRig } from './shotRig.js';
import { MICHAEL } from './set.js';

// Fotogramas de espera antes del disparo: el flash ya ha subido y el título y
// la ventana ya están en su sitio.
const WAIT = 3;

/** Coloca la cámara del encuadre de medio cuerpo para un lienzo de w x h píxeles. */
function aim(cam, w, h) {
  // El cuadrado más grande que cabe en el lienzo, centrado, abarca HALF_SHOT.span.
  const side = Math.min(w, h);
  cam.aspect = w / h;
  cam.fov = (2 * Math.atan((HALF_SHOT.span / 2 / HALF_SHOT.distance) * (h / side)) * 180) / Math.PI;
  cam.position.set(HALF_SHOT.centerX, HALF_SHOT.centerY, MICHAEL.z + HALF_SHOT.distance);
  cam.lookAt(HALF_SHOT.centerX, HALF_SHOT.centerY, MICHAEL.z);
  cam.updateProjectionMatrix();
  return side;
}

/**
 * @param {{
 *   request: number | null,
 *   onShot: (rect: { x: number, y: number, side: number }) => void,
 * }} props
 */
export default function ShotCamera({ request, onShot }) {
  const cam = useMemo(() => new PerspectiveCamera(20, 1, 0.05, 40), []);
  const pending = useRef(/** @type {number | null} */ (null));
  const frames = useRef(0);

  useEffect(() => {
    if (request === null) return;
    pending.current = request;
    frames.current = 0;
    shotRig.half = true;
  }, [request]);

  useFrame(({ gl, scene, camera }) => {
    if (pending.current === null) {
      gl.render(scene, camera);
      return;
    }
    frames.current += 1;
    if (frames.current < WAIT) {
      gl.render(scene, camera);
      return;
    }
    const w = gl.domElement.width;
    const h = gl.domElement.height;
    const side = aim(cam, w, h);
    gl.render(scene, cam);
    // Se copia ya: el siguiente fotograma borra el lienzo.
    onShot({ x: (w - side) / 2, y: (h - side) / 2, side });
    pending.current = null;
    shotRig.half = false;
  }, 1);

  return null;
}
