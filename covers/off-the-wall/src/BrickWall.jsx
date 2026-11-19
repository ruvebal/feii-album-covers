// La pared de ladrillo de la portada, ladrillo a ladrillo.
// Un único InstancedMesh (una sola llamada de dibujo) con aparejo a soga.
// Bisel de un segmento (108 triángulos por ladrillo) y sin proyectar sombra:
// la pared solo la recibe, así no se dibuja otra vez en el mapa de sombras.
//
// cada fila se desplaza medio ladrillo. Cada ladrillo lleva su color, un
// pequeño giro y un hundimiento distinto, para que la luz rasante lo delate.
// Detrás va el mortero, una caja clara algo más fina que los ladrillos.

import { useLayoutEffect, useMemo, useRef } from 'react';
import { Color, Matrix4, Euler, Quaternion, Vector3 } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { WALL } from './set.js';

// Medidas reales aproximadas de un ladrillo macizo (escala 1 = 1 metro).
const BRICK = { w: 0.23, h: 0.072, d: 0.11, joint: 0.012 };

// Paleta de ladrillo cocido: rojos, tostados y alguno quemado.
const TONES = ['#8c3a22', '#9a4429', '#7d321d', '#a5532f', '#6f2c1a', '#93412a', '#b0603a', '#5e2616'];

/** Generador pseudoaleatorio con semilla: la pared sale igual en cada visita. */
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Calcula la posición, el giro y el color de cada ladrillo. */
function layBricks() {
  const rand = seeded(1979);
  const stepX = BRICK.w + BRICK.joint;
  const stepY = BRICK.h + BRICK.joint;
  const cols = Math.ceil(WALL.width / stepX) + 1;
  const rows = Math.floor(WALL.height / stepY);
  const bricks = [];
  for (let r = 0; r < rows; r += 1) {
    const offset = r % 2 === 0 ? 0 : stepX / 2;
    for (let c = 0; c < cols; c += 1) {
      const x = -WALL.width / 2 + c * stepX - offset + stepX / 2;
      if (x < -WALL.width / 2 - BRICK.w / 2 || x > WALL.width / 2 + BRICK.w / 2) continue;
      const tone = TONES[Math.floor(rand() * TONES.length)];
      bricks.push({
        x,
        y: BRICK.h / 2 + r * stepY + 0.004,
        z: WALL.z + BRICK.d / 2 + (rand() - 0.5) * 0.006,
        rx: (rand() - 0.5) * 0.02,
        ry: (rand() - 0.5) * 0.025,
        rz: (rand() - 0.5) * 0.012,
        // Variación de brillo por ladrillo para que no haya dos iguales.
        shade: 0.82 + rand() * 0.3,
        tone,
      });
    }
  }
  return bricks;
}

export default function BrickWall() {
  const mesh = useRef(null);
  const bricks = useMemo(() => layBricks(), []);
  const geometry = useMemo(() => new RoundedBoxGeometry(BRICK.w, BRICK.h, BRICK.d, 1, 0.008), []);

  useLayoutEffect(() => {
    const m = new Matrix4();
    const q = new Quaternion();
    const e = new Euler();
    const p = new Vector3();
    const s = new Vector3(1, 1, 1);
    const color = new Color();
    bricks.forEach((b, i) => {
      e.set(b.rx, b.ry, b.rz);
      q.setFromEuler(e);
      p.set(b.x, b.y, b.z);
      m.compose(p, q, s);
      mesh.current.setMatrixAt(i, m);
      color.set(b.tone).multiplyScalar(b.shade);
      mesh.current.setColorAt(i, color);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
    if (mesh.current.instanceColor) mesh.current.instanceColor.needsUpdate = true;
    mesh.current.computeBoundingSphere();
  }, [bricks]);

  // La geometría se creó a mano: se libera al desmontar la ruta.
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <group>
      <instancedMesh
        ref={mesh}
        args={[geometry, undefined, bricks.length]}
        receiveShadow
      >
        <meshStandardMaterial roughness={0.92} metalness={0} />
      </instancedMesh>
      {/* Mortero: queda hundido entre ladrillos. */}
      <mesh position={[0, WALL.height / 2, WALL.z + 0.03]} receiveShadow>
        <boxGeometry args={[WALL.width + 0.3, WALL.height, 0.06]} />
        <meshStandardMaterial color="#9c9184" roughness={1} />
      </mesh>
    </group>
  );
}
