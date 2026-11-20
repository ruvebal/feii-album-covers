// Un guiño a 1979, hecho con código (Muscles, la boa, está en Muscles.jsx):
//
//  - Un rincón de Studio 54 al fondo a la derecha: cortinas de terciopelo
//    rojo, postes dorados con su cordón, una mesa alta con mantel de
//    terciopelo, una botella y copas de champán, y una bola de discoteca que
//    gira colgada del techo.
//
// Rendimiento: tres llamadas de dibujo. Todo lo opaco que no se mueve
// (terciopelo, postes, mesa y botella) va fundido en una malla con el color en
// los vértices; las copas, otra, y la bola, la tercera (gira).

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BoxGeometry, CatmullRomCurve3, Color, CylinderGeometry, DoubleSide, Euler, Float32BufferAttribute, LatheGeometry, Matrix4, MeshBasicMaterial, MeshStandardMaterial, PlaneGeometry, Quaternion, SphereGeometry, TubeGeometry, Vector2, Vector3 } from 'three';

// El rincón de la bola.
const TABLE = [3.45, 9.55];
const BALL = [3.3, 3.25, 9.3];

const VELVET = '#7d0f1d';
const GOLD = '#c79a3a';

/** Coloca una geometría y le pone un color liso en los vértices. */
function piece(geo, hex, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  geo.applyMatrix4(new Matrix4().compose(new Vector3(...pos), new Quaternion().setFromEuler(new Euler(...rot)), new Vector3(...scale)));
  return paint(geo, () => hex);
}

/** Color por vértice: `pick(i)` devuelve el color del vértice i. */
function paint(geo, pick) {
  const n = geo.attributes.position.count;
  const values = new Float32Array(n * 3);
  const c = new Color();
  for (let i = 0; i < n; i += 1) {
    c.set(pick(i));
    values[i * 3] = c.r;
    values[i * 3 + 1] = c.g;
    values[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new Float32BufferAttribute(values, 3));
  return geo;
}


/** Cortina de terciopelo con pliegues, colgada de una barra dorada. */
function curtain(width, position, rotY) {
  const g = new PlaneGeometry(width, 3.4, Math.round(width * 46), 6);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i += 1) {
    // Pliegues verticales, algo más abiertos abajo que arriba.
    const open = 0.75 + 0.25 * (0.5 - p.getY(i) / 3.4);
    p.setZ(i, Math.sin(p.getX(i) * 34) * 0.04 * open);
  }
  g.computeVertexNormals();
  return [
    piece(g, VELVET, [position[0], 1.7, position[1]], [0, rotY, 0]),
    piece(new CylinderGeometry(0.02, 0.02, width + 0.1, 10), GOLD, [position[0], 3.42, position[1]], [0, rotY, Math.PI / 2]),
  ];
}

/** Poste dorado de cordón: base, columna y bola arriba. */
function post(x, z) {
  return [
    piece(new CylinderGeometry(0.15, 0.16, 0.03, 24), GOLD, [x, 0.015, z]),
    piece(new CylinderGeometry(0.022, 0.022, 0.92, 12), GOLD, [x, 0.49, z]),
    piece(new SphereGeometry(0.04, 14, 10), GOLD, [x, 0.97, z]),
  ];
}

/** Todo lo opaco que no se mueve, fundido en una geometría. */
function solids() {
  const posts = [
    [2.45, 9.7],
    [3.1, 8.45],
    [3.95, 8.35],
  ];
  // Cordón de terciopelo que cuelga entre los postes.
  const rope = posts.slice(1).map(([x, z], i) => {
    const [x0, z0] = posts[i];
    const curve = new CatmullRomCurve3([
      new Vector3(x0, 0.9, z0),
      new Vector3((x0 + x) / 2, 0.68, (z0 + z) / 2),
      new Vector3(x, 0.9, z),
    ]);
    return piece(new TubeGeometry(curve, 20, 0.02, 8), VELVET);
  });
  const [tx, tz] = TABLE;
  const parts = [
    ...curtain(1.8, [3.4, 10.4], Math.PI),
    ...curtain(2.0, [4.2, 9.45], -Math.PI / 2),
    ...posts.flatMap(([x, z]) => post(x, z)),
    ...rope,
    // Mesa alta con mantel de terciopelo hasta el suelo.
    piece(new CylinderGeometry(0.32, 0.39, 1.04, 28, 1, true), '#8c1322', [tx, 0.52, tz]),
    piece(new CylinderGeometry(0.32, 0.32, 0.012, 28), '#8c1322', [tx, 1.046, tz]),
    // Botella de champán: cuerpo verde, cuello y la cápsula dorada.
    piece(new CylinderGeometry(0.043, 0.045, 0.2, 18), '#10301c', [tx - 0.1, 1.152, tz - 0.08]),
    piece(new CylinderGeometry(0.014, 0.04, 0.07, 18), '#10301c', [tx - 0.1, 1.287, tz - 0.08]),
    piece(new CylinderGeometry(0.016, 0.015, 0.075, 14), GOLD, [tx - 0.1, 1.355, tz - 0.08]),
    // El cable del que cuelga la bola.
    piece(new CylinderGeometry(0.006, 0.006, 4.6 - BALL[1] - 0.3, 6), '#151515', [BALL[0], (4.6 + BALL[1] + 0.3) / 2, BALL[2]]),
  ];
  const merged = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  return merged;
}

/** Tres copas de champán (flauta) con el champán dentro, en la mesa. */
function glasses() {
  const flute = [[0, 0], [0.032, 0], [0.032, 0.004], [0.004, 0.009], [0.004, 0.09], [0.012, 0.1], [0.023, 0.14], [0.027, 0.2], [0.025, 0.235]];
  const wine = [[0, 0.1], [0.01, 0.101], [0.021, 0.14], [0.025, 0.2], [0, 0.2]];
  const [tx, tz] = TABLE;
  const parts = [[0.08, 0.06], [0.14, -0.07], [-0.02, 0.15]].flatMap(([x, z]) => [
    piece(new LatheGeometry(flute.map(([r, y]) => new Vector2(r, y)), 20), '#f2f6fa', [tx + x, 1.052, tz + z]),
    piece(new LatheGeometry(wine.map(([r, y]) => new Vector2(r, y)), 20), '#f0c552', [tx + x, 1.052, tz + z]),
  ]);
  const merged = mergeGeometries(parts);
  parts.forEach((g) => g.dispose());
  return merged;
}

/**
 * Bola de espejos: cada espejito tiene su propio brillo (la mayoría gris
 * plata, unos pocos encendidos en blanco, rosa o azul), así que al girar se
 * ven pasar los destellos aunque el rincón esté a oscuras.
 */
function mirrorBall() {
  const cols = 30;
  const rows = 20;
  const g = new SphereGeometry(0.3, cols, rows).toNonIndexed();
  const p = g.attributes.position;
  const values = new Float32Array(p.count * 3);
  const c = new Color();
  for (let f = 0; f < p.count; f += 3) {
    // Centro del triángulo: dice a qué espejito (fila y columna) pertenece.
    const x = (p.getX(f) + p.getX(f + 1) + p.getX(f + 2)) / 3;
    const y = (p.getY(f) + p.getY(f + 1) + p.getY(f + 2)) / 3;
    const z = (p.getZ(f) + p.getZ(f + 1) + p.getZ(f + 2)) / 3;
    const row = Math.floor((Math.acos(Math.max(-1, Math.min(1, y / 0.3))) / Math.PI) * rows);
    const col = Math.floor(((Math.atan2(z, -x) + Math.PI) / (Math.PI * 2)) * cols) % cols;
    // Número estable por espejito (no cambia al recargar).
    const n = Math.abs(Math.sin(row * 127.1 + col * 311.7) * 43758.5453) % 1;
    if (n > 0.93) c.set('#ffffff');
    else if (n > 0.88) c.set('#ff9ad2');
    else if (n > 0.83) c.set('#9ad8ff');
    else c.setScalar(0.16 + n * 0.5);
    for (let i = f; i < f + 3; i += 1) {
      values[i * 3] = c.r;
      values[i * 3 + 1] = c.g;
      values[i * 3 + 2] = c.b;
    }
  }
  g.setAttribute('color', new Float32BufferAttribute(values, 3));
  return g;
}

/**
 * @param {{
 *   reduced: boolean,
 *   playing: boolean,
 *   groove: { bpm: number, feel: string } | null,
 *   level: () => number,
 * }} props
 */
export default function Disco54({ reduced }) {
  const res = useMemo(() => {
    return {
      solids: solids(),
      glasses: glasses(),
      ball: mirrorBall(),
      mats: {
        solids: new MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.12, side: DoubleSide }),
        glasses: new MeshStandardMaterial({ vertexColors: true, roughness: 0.06, metalness: 0.25, transparent: true, opacity: 0.55, depthWrite: false, side: DoubleSide }),
        ball: new MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
      },
    };
  }, []);
  useEffect(
    () => () => {
      res.solids.dispose();
      res.glasses.dispose();
      res.ball.dispose();
      Object.values(res.mats).forEach((m) => m.dispose());
    },
    [res],
  );
  const ball = useRef(/** @type {import('three').Mesh | null} */ (null));
  useFrame((_, raw) => {
    const dt = Math.min(raw, 0.1);
    // Media vuelta cada cinco segundos (quieta si se pide menos movimiento).
    if (ball.current && !reduced) ball.current.rotation.y += dt * 0.63;
  });
  return (
    <group>
      <mesh geometry={res.solids} material={res.mats.solids} />
      <mesh geometry={res.glasses} material={res.mats.glasses} />
      <mesh ref={ball} geometry={res.ball} material={res.mats.ball} position={BALL} />
    </group>
  );
}
