// Crowd.jsx — la multitud: UN InstancedMesh (1 draw call) con posiciones generadas en JS.
//
// Las posiciones no viven en el GLB (presupuesto del plan): aquí se reparten
//   - FIELD fans en el césped, delante del escenario (lado -Z), mirando a Freddie;
//   - el resto en las filas de la grada (360°), mirando al centro.
// Un PRNG con semilla hace que la multitud sea la misma en cada carga (y que el
// render sea puro: nada de Math.random durante el render).
// task2 (opcional): bote en el vertex shader con un atributo por instancia (aPhase).

import { useLayoutEffect, useRef } from 'react';
import { Color, Object3D } from 'three';
import { FLOOR_Y, STAND_DEPTH, STAND_R0, STAND_ROWS, standY } from './placeholders.js';

/**
 * mulberry32: PRNG pequeño y determinista.
 *
 * @param {number} seed
 * @returns {() => number} Números en [0, 1).
 */
function prng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * @param {object} props
 * @param {import('three').BufferGeometry} props.geometry Fan_LOD0 (placeholder o nodo del GLB).
 * @param {number} [props.count] Total de fans.
 * @param {number} [props.field] Cuántos de ellos están en el césped.
 */
export default function Crowd({ geometry, count = 5000, field = 1800 }) {
  const mesh = useRef(null);

  useLayoutEffect(() => {
    const im = mesh.current;
    if (!im) return;
    const rand = prng(1985); // Live Aid
    const dummy = new Object3D();
    const color = new Color();

    for (let n = 0; n < count; n += 1) {
      if (n < field) {
        // Césped: semicírculo delante del escenario, entre 4 y 20 m de Freddie.
        const r = 4.5 + rand() * 15.5;
        const a = Math.PI + (rand() - 0.5) * Math.PI * 0.9; // centrado en -Z
        dummy.position.set(Math.sin(a) * r, FLOOR_Y, Math.cos(a) * r);
      } else {
        const row = Math.floor(rand() * STAND_ROWS);
        const r = STAND_R0 + row * STAND_DEPTH + (rand() - 0.5) * 0.3;
        const a = rand() * Math.PI * 2;
        dummy.position.set(Math.sin(a) * r, standY(row), Math.cos(a) * r);
      }
      // Mirar al escenario: gira sobre Y para que el +Z local del fan apunte al origen.
      // (Fan_LOD0 en Blender: modelarlo mirando a la vista frontal, -Y de Blender = +Z de three.)
      dummy.rotation.set(0, Math.atan2(-dummy.position.x, -dummy.position.z), 0);
      dummy.scale.setScalar(0.9 + rand() * 0.2);
      dummy.updateMatrix();
      im.setMatrixAt(n, dummy.matrix);

      // Tonos apagados de ropa en contraluz (task2: luces de móvil aparte).
      color.setHSL(0.02 + rand() * 0.1, 0.15 + rand() * 0.25, 0.18 + rand() * 0.22);
      im.setColorAt(n, color);
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
    im.computeBoundingSphere();
  }, [count, field]);

  return (
    <instancedMesh ref={mesh} name="Crowd" args={[geometry, undefined, count]}>
      <meshStandardMaterial roughness={0.9} />
    </instancedMesh>
  );
}
