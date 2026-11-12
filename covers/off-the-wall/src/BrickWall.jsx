// La pared de ladrillo de la portada, ladrillo a ladrillo.
// Un único InstancedMesh (una sola llamada de dibujo) con aparejo a soga.
// Bisel de un segmento (108 triángulos por ladrillo) y sin proyectar sombra:
// la pared solo la recibe, así no se dibuja otra vez en el mapa de sombras.
//
// cada fila se desplaza medio ladrillo. Cada ladrillo lleva su color, un
// pequeño giro y un hundimiento distinto, para que la luz rasante lo delate.
// Detrás va el mortero, una caja clara algo más fina que los ladrillos.

import { useLayoutEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Color, Matrix4, Euler, Quaternion, Vector3 } from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { createBrickMaterial } from './brickMaterial.js';
import { WALL } from './set.js';

// Medidas reales aproximadas de un ladrillo macizo (escala 1 = 1 metro).
const BRICK = { w: 0.23, h: 0.072, d: 0.11, joint: 0.012 };

// Paleta de ladrillo cocido: rojos, tostados y alguno quemado.
// Más apagados y marrones que un ladrillo nuevo: el de la foto es viejo y gastado.
const TONES = ['#7b3f33', '#88493a', '#6c372d', '#93584a', '#603126', '#81483a', '#9b6553', '#542b22'];

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

/**
 * @param {{ playing: boolean, level: () => number, reduced: boolean }} props
 */
export default function BrickWall({ playing, level, reduced }) {
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

  // Material con el shader propio (task2): grano del ladrillo y charco de luz con los graves.
  const brick = useMemo(() => createBrickMaterial(), []);

  // La geometría y el material se crearon a mano: se liberan al desmontar la ruta.
  useLayoutEffect(() => () => geometry.dispose(), [geometry]);
  useLayoutEffect(() => () => brick.material.dispose(), [brick]);

  useFrame(() => {
    // Con reducción de movimiento el charco no late: se queda encendido, quieto.
    const target = playing ? (reduced ? 0.35 : level()) : 0;
    const m = mesh.current;
    if (!m) return;
    const u = m.material.userData.uniforms.uPulse;
    u.value += (target - u.value) * 0.3;
  });

  return (
    <group>
      <instancedMesh
        ref={mesh}
        args={[geometry, brick.material, bricks.length]}
        receiveShadow
      />
      {/* Mortero: queda hundido entre ladrillos. */}
      <mesh position={[0, WALL.height / 2, WALL.z + 0.03]} receiveShadow>
        <boxGeometry args={[WALL.width + 0.3, WALL.height, 0.06]} />
        <meshStandardMaterial color="#b1a89c" roughness={1} />
      </mesh>
    </group>
  );
}
