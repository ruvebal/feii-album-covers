// Muscles, la boa constrictor que Michael tenía de mascota, enroscada en la
// silla de director (al pulsarla se abre su foto: Hotspots.jsx). Está en los
// dos platós (1979 y 1982): con música mece la cabeza de lado a lado al compás
// y cabecea con los graves; sin música apenas se mueve.
//
// Dos llamadas de dibujo: el cuerpo enroscado (quieto) y el cuello con la
// cabeza (se mueve), con el dibujo de la piel en el color de los vértices.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BoxGeometry, CatmullRomCurve3, Color, DoubleSide, Euler, Float32BufferAttribute, Matrix4, MeshStandardMaterial, Quaternion, SphereGeometry, TubeGeometry, Vector3 } from 'three';

// La silla de director (Studio.jsx).
const CHAIR = { position: [-1.55, 0, 6.3], rotY: Math.PI - 0.35 };

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

/** Coloca una geometría y le pone un color liso en los vértices. */
function piece(geo, hex, pos = [0, 0, 0], rot = [0, 0, 0], scale = [1, 1, 1]) {
  geo.applyMatrix4(new Matrix4().compose(new Vector3(...pos), new Quaternion().setFromEuler(new Euler(...rot)), new Vector3(...scale)));
  return paint(geo, () => hex);
}

function smooth(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

/**
 * La cola cuelga del asiento, el cuerpo da dos vueltas y cuarto enroscado
 * encima y el cuello se levanta con la cabeza mirando a Michael.
 * Coordenadas de la silla (el asiento está a 0,53 m; el frente es +z).
 */
function snake() {
  const pts = [
    [0.1, 0.34, 0.27],
    [0.11, 0.47, 0.225],
    [0.13, 0.555, 0.15],
  ];
  const turns = 2.25;
  for (let i = 0; i <= 44; i += 1) {
    const t = i / 44;
    const a = 0.5 + t * turns * Math.PI * 2;
    const r = 0.155 - 0.075 * t;
    pts.push([Math.cos(a) * r, 0.565 + 0.13 * t, Math.sin(a) * r * 0.8]);
  }
  pts.push([-0.035, 0.775, 0.075], [-0.015, 0.845, 0.125], [0, 0.865, 0.2]);
  const curve = new CatmullRomCurve3(pts.map((p) => new Vector3(...p)));
  const rings = 240;
  const sides = 10;
  const body = new TubeGeometry(curve, rings, 1, sides, false);
  // El tubo nace con radio 1: cada anillo se encoge a su grosor (cola fina,
  // cuerpo grueso y cuello algo más estrecho).
  const p = body.attributes.position;
  const centre = new Vector3();
  for (let i = 0; i <= rings; i += 1) {
    const u = i / rings;
    curve.getPointAt(u, centre);
    const r = (0.007 + 0.028 * smooth(0, 0.3, u)) * (1 - 0.42 * smooth(0.8, 0.97, u));
    for (let j = 0; j <= sides; j += 1) {
      const k = i * (sides + 1) + j;
      p.setXYZ(k, centre.x + (p.getX(k) - centre.x) * r, centre.y + (p.getY(k) - centre.y) * r, centre.z + (p.getZ(k) - centre.z) * r);
    }
  }
  body.computeVertexNormals();
  // Dibujo de boa: fondo tostado con sillas de montar marrones, y la cola rojiza.
  paint(body, (k) => {
    const u = Math.floor(k / (sides + 1)) / rings;
    const saddle = Math.sin(u * 150) > 0.25;
    if (u < 0.14) return saddle ? '#7a2c16' : '#c9a473';
    return saddle ? '#4a2d1b' : '#bd9c6c';
  });
  // El cuerpo enroscado se queda quieto; el cuello y la cabeza van aparte y
  // giran sobre la base del cuello. Los dos trozos se pisan un par de anillos.
  const cut = Math.round(0.86 * rings);
  const per = sides * 6;
  const all = Array.from(body.index.array);
  const still = body.clone();
  still.setIndex(all.slice(0, (cut + 3) * per));
  const neck = body.clone();
  neck.setIndex(all.slice(cut * per));
  body.dispose();
  const head = [0, 0.868, 0.225];
  const moving = mergeGeometries([
    neck,
    piece(new SphereGeometry(0.03, 20, 14), '#b08f60', head, [0.15, 0, 0], [0.95, 0.62, 1.5]),
    ...[-1, 1].map((s) => piece(new SphereGeometry(0.0055, 8, 6), '#0c0806', [s * 0.019, 0.878, 0.243])),
    // La lengua, fina y roja, asomando.
    piece(new BoxGeometry(0.004, 0.0015, 0.03), '#a3151f', [0, 0.862, 0.28]),
  ]);
  const m = new Matrix4().compose(new Vector3(...CHAIR.position), new Quaternion().setFromEuler(new Euler(0, CHAIR.rotY, 0)), new Vector3(1, 1, 1));
  const pivot = curve.getPointAt(0.87).applyMatrix4(m);
  moving.applyMatrix4(m).translate(-pivot.x, -pivot.y, -pivot.z);
  return { still: still.applyMatrix4(m), moving, pivot };
}

/**
 * @param {{ reduced: boolean, playing: boolean, groove: { bpm: number } | null, level: () => number }} props
 */
export default function Muscles({ reduced, playing, groove, level }) {
  const res = useMemo(() => {
    const boa = snake();
    return {
      ...boa,
      mat: new MeshStandardMaterial({ vertexColors: true, roughness: 0.6, metalness: 0.12, side: DoubleSide }),
    };
  }, []);
  useEffect(
    () => () => {
      res.still.dispose();
      res.moving.dispose();
      res.mat.dispose();
    },
    [res],
  );
  const neck = useRef(null);
  useFrame(({ clock }, raw) => {
    const n = neck.current;
    if (!n || reduced) return;
    const dt = Math.min(raw, 0.1);
    const t = clock.elapsedTime;
    let y = Math.sin(t * 0.6) * 0.05;
    let x = 0;
    let z = 0;
    if (playing) {
      const phase = t * ((groove?.bpm ?? 112) / 60) * Math.PI;
      y = Math.sin(phase) * 0.42;
      x = Math.sin(phase * 2) * 0.08 - level() * 0.14;
      z = Math.cos(phase) * 0.1;
    }
    const k = 1 - Math.exp(-dt * 6);
    n.rotation.x += (x - n.rotation.x) * k;
    n.rotation.y += (y - n.rotation.y) * k;
    n.rotation.z += (z - n.rotation.z) * k;
  });
  return (
    <group>
      <mesh geometry={res.still} material={res.mat} />
      <mesh ref={neck} geometry={res.moving} material={res.mat} position={res.pivot} />
    </group>
  );
}
