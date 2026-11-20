// El tigre bebé de la sesión de Thriller (1982): en las fotos de dentro del
// disco sale junto a Michael. Aquí está vivo: da vueltas despacio por delante
// de las piernas de Michael (sin meterse en su sitio), se para y se sienta a
// mirar alrededor, sigue andando y a ratos se tumba como una esfinge. Respira,
// mueve la cola y gira la cabeza.
//
// Hecho solo con código: piezas sencillas con el pelaje (naranja, rayas negras
// finas de lado a lado y blanco en la tripa, el morro y las zarpas) pintado en
// el color de los vértices. Las cuatro patas van aparte para poder andar.
// Unas 8 llamadas de dibujo.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { createTail, stepTail } from './tigerTail.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  CapsuleGeometry,
  Color,
  Euler,
  Float32BufferAttribute,
  Matrix4,
  MeshStandardMaterial,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';

const ORANGE = new Color('#c8732c');
const DARK = new Color('#1b1210');
const CREAM = new Color('#efe3cf');
const PINK = new Color('#b5736a');

function place(geo, pos, rot = [0, 0, 0], scale = [1, 1, 1]) {
  geo.applyMatrix4(
    new Matrix4().compose(new Vector3(...pos), new Quaternion().setFromEuler(new Euler(...rot)), new Vector3(...scale)),
  );
  return geo;
}

/** Pinta cada vértice con el color que dé `fn(x, y, z)`. */
function paint(geo, fn) {
  const p = geo.attributes.position;
  const c = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i += 1) {
    const col = fn(p.getX(i), p.getY(i), p.getZ(i));
    c[i * 3] = col.r;
    c[i * 3 + 1] = col.g;
    c[i * 3 + 2] = col.b;
  }
  geo.setAttribute('color', new Float32BufferAttribute(c, 3));
  return geo;
}

/** Rayas finas y onduladas de lado a lado del cuerpo; se afinan hacia la tripa. */
function stripe(x, y, z, density = 46) {
  const wobble = Math.sin(y * 38 + z * 22) * 0.55 + Math.sin(z * 61) * 0.25;
  const band = Math.sin(x * density + wobble);
  const width = 0.62 + Math.min(0.3, Math.max(0, -y * 3));
  return band > width;
}

/**
 * Las piezas, cada una con su origen en la articulación: el cuerpo en su
 * centro, las patas en el hombro o la cadera (cuelgan hacia abajo), la cabeza
 * en el cuello y la cola en su raíz.
 */
function buildCub() {
  const body = paint(
    mergeGeometries([
      // Cuerpo: esfera alargada con muchos anillos para que las rayas salgan nítidas.
      place(new SphereGeometry(0.075, 48, 40), [0, 0, 0], [0, 0, Math.PI / 2], [1, 2.3, 0.95]),
      // Hombros y muslos algo marcados.
      place(new SphereGeometry(0.05, 24, 18), [0.1, -0.01, 0], [0, 0, 0], [1, 1, 1.25]),
      place(new SphereGeometry(0.058, 24, 18), [-0.11, -0.005, 0], [0, 0, 0], [1.1, 1.05, 1.3]),
    ]),
    (x, y, z) => (y < -0.045 ? CREAM : stripe(x, y, z) ? DARK : ORANGE),
  );
  // Una pata: tramo con rayas y zarpa clara grande de cachorro.
  const leg = paint(
    mergeGeometries([
      place(new CapsuleGeometry(0.022, 0.07, 8, 14), [0, -0.045, 0]),
      place(new SphereGeometry(0.028, 16, 12), [0.012, -0.095, 0], [0, 0, 0], [1.25, 0.65, 1]),
    ]),
    (x, y, z) => (y < -0.08 ? CREAM : Math.sin(y * 90 + z * 10) > 0.6 ? DARK : ORANGE),
  );
  const head = paint(
    mergeGeometries([
      place(new SphereGeometry(0.075, 32, 24), [0, 0, 0], [0, 0, 0], [1.0, 0.92, 1.05]),
      place(new SphereGeometry(0.038, 18, 14), [0.04, -0.028, 0.042], [0, 0, 0], [1, 0.8, 1]),
      place(new SphereGeometry(0.038, 18, 14), [0.04, -0.028, -0.042], [0, 0, 0], [1, 0.8, 1]),
      place(new SphereGeometry(0.032, 18, 14), [0.066, -0.024, 0], [0, 0, 0], [0.9, 0.75, 1.15]),
      place(new SphereGeometry(0.011, 12, 10), [0.094, -0.011, 0], [0, 0, 0], [0.7, 0.6, 1.25]),
      place(new SphereGeometry(0.024, 16, 12), [-0.014, 0.064, 0.047], [0, 0, 0], [0.55, 1, 1]),
      place(new SphereGeometry(0.024, 16, 12), [-0.014, 0.064, -0.047], [0, 0, 0], [0.55, 1, 1]),
    ]),
    (x, y, z) => {
      if (x > 0.098 && Math.abs(z) < 0.014 && y > -0.02) return PINK;
      if (x > 0.03 && y < -0.005) return CREAM;
      if (x > 0.045 && y > 0.017 && y < 0.038 && Math.abs(z) > 0.014 && Math.abs(z) < 0.047) return CREAM;
      if (y > 0.052 && Math.abs(z) > 0.028) return x < -0.018 ? (y > 0.072 ? CREAM : DARK) : CREAM;
      const forehead = x > -0.02 && y > 0.032 && Math.sin(Math.abs(z) * 120) > 0.55;
      const temple = Math.abs(z) > 0.048 && Math.sin(y * 90 + x * 30) > 0.6;
      return forehead || temple ? DARK : ORANGE;
    },
  );
  const eyes = mergeGeometries([
    place(new SphereGeometry(0.0105, 12, 10), [0.062, 0.019, 0.028]),
    place(new SphereGeometry(0.0105, 12, 10), [0.062, 0.019, -0.028]),
  ]);
  return { body, leg, head, eyes };
}

/** Patas: [x, z] del hombro o la cadera, y con qué pareja van al andar (en diagonal). */
const LEGS = [
  { at: [0.11, 0.045], pair: 0 },
  { at: [0.11, -0.045], pair: 1 },
  { at: [-0.11, 0.05], pair: 1 },
  { at: [-0.11, -0.05], pair: 0 },
];

/** Lo que hace en cada momento (segundos); el ciclo se repite. */
const PLAN = [
  { what: 'walk', time: 6 },
  { what: 'sit', time: 4 },
  { what: 'walk', time: 5 },
  { what: 'lie', time: 6 },
];
const PLAN_TIME = PLAN.reduce((s, p) => s + p.time, 0);

/**
 * @param {{ center: [number, number], radius: [number, number], reduced: boolean }} props
 * `center` y `radius`: la elipse (x, z) por la que da vueltas, delante de las
 * piernas de Michael y sin llegar a su sitio.
 */
export default function TigerCub({ center, radius, reduced, onHover, onInspect, lang }) {
  const res = useMemo(
    () => ({
      geo: buildCub(),
      tail: createTail(),
      fur: new MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }),
      eye: new MeshStandardMaterial({ color: '#160d07', roughness: 0.15 }),
    }),
    [],
  );
  useEffect(
    () => () => {
      Object.values(res.geo).forEach((g) => g.dispose());
      res.tail.geometry.dispose();
      res.fur.dispose();
      res.eye.dispose();
    },
    [res],
  );
  const root = useRef(null);
  const body = useRef(null);
  const head = useRef(null);
  const tail = useRef(null);
  // Vectores de trabajo para la cola (raíz y dirección de reposo).
  const work = useMemo(() => ({ root: new Vector3(), dir: new Vector3(), q: new Quaternion(), pq: new Quaternion() }), []);
  const legs = useRef([]);
  // Por dónde va en la elipse (ángulo) y cuánto está andando, sentado o tumbado.
  const state = useRef({ angle: 0.3, walk: 0, sit: 0, lie: 1, step: 0 });

  useFrame(({ clock }, rawDt) => {
    const t = clock.elapsedTime;
    const dt = Math.min(rawDt, 0.05);
    const s = state.current;
    // Qué toca ahora según el plan (sin movimiento: siempre tumbado).
    let what = 'lie';
    if (!reduced) {
      let k = t % PLAN_TIME;
      for (const p of PLAN) {
        if (k < p.time) {
          what = p.what;
          break;
        }
        k -= p.time;
      }
    }
    // Cambios de postura lentos, como un gato.
    const ease = Math.min(1, dt * 1.1);
    s.walk += ((what === 'walk' ? 1 : 0) - s.walk) * ease;
    s.sit += ((what === 'sit' ? 1 : 0) - s.sit) * ease;
    s.lie += ((what === 'lie' ? 1 : 0) - s.lie) * ease;
    // Anda por la elipse, despacio, a pasitos.
    s.angle += dt * 0.17 * s.walk;
    s.step += dt * 3.6 * s.walk;
    const [cx, cz] = center;
    const [rx, rz] = radius;
    const x = cx + Math.cos(s.angle) * rx;
    const z = cz + Math.sin(s.angle) * rz;
    // Mira hacia donde va (la tangente de la elipse).
    const dx = -Math.sin(s.angle) * rx;
    const dz = Math.cos(s.angle) * rz;
    if (root.current) {
      root.current.position.set(x, 0, z);
      root.current.rotation.y = Math.atan2(-dz, dx);
    }
    // Altura y giro del cuerpo: de pie, sentado (cadera abajo y pecho arriba)
    // o tumbado (casi en el suelo).
    const breathe = 1 + Math.sin(t * 1.5) * 0.02;
    const bob = Math.abs(Math.sin(s.step)) * 0.004 * s.walk;
    if (body.current) {
      body.current.position.y = 0.13 * s.walk + 0.11 * s.sit + 0.065 * s.lie + bob;
      body.current.position.x = -0.03 * s.sit;
      body.current.rotation.z = 0.62 * s.sit;
      // Al andar, los hombros se mecen de lado a lado (paso de felino).
      body.current.rotation.x = Math.sin(s.step) * 0.05 * s.walk;
      body.current.scale.set(1, breathe, breathe);
    }
    legs.current.forEach((g, i) => {
      if (!g) return;
      const front = i < 2;
      const swing = Math.sin(s.step + (LEGS[i].pair ? Math.PI : 0)) * 0.42 * s.walk;
      // Sentado: las de delante rectas (compensan el pecho levantado) y las de
      // atrás dobladas. Tumbado: las de delante estiradas y las de atrás recogidas.
      const sitRot = front ? -0.62 : 1.0;
      const lieRot = front ? 1.45 : -1.25;
      g.rotation.z = swing + sitRot * s.sit + lieRot * s.lie;
    });
    if (head.current) {
      // Mira alrededor: sentado gira la cabeza a un lado y a otro; tumbado, a ratos.
      const look = Math.sin(t * 0.4);
      head.current.rotation.y = look * (0.15 * s.walk + 0.6 * s.sit + 0.3 * s.lie);
      head.current.rotation.z = -0.62 * s.sit + 0.08 * s.lie + Math.sin(s.step * 0.5) * 0.03 * s.walk;
      head.current.position.y = 0.06 * s.walk + 0.05 * s.sit + 0.05 * s.lie;
    }
    if (tail.current && root.current?.parent) {
      // La raíz de la cola marca el reposo (hacia atrás y algo arriba, con un
      // vaivén lento); la física hace el resto: cae, se balancea y apoya en el suelo.
      tail.current.rotation.x = Math.sin(t * (0.6 + 0.3 * s.walk)) * (0.08 + 0.06 * s.walk);
      tail.current.rotation.z = -1.45 + 0.1 * s.lie + 0.15 * s.sit;
      tail.current.updateWorldMatrix(true, false);
      const parent = root.current.parent;
      tail.current.getWorldPosition(work.root);
      parent.worldToLocal(work.root);
      tail.current.getWorldQuaternion(work.q);
      parent.getWorldQuaternion(work.pq);
      work.dir.set(0, -1, 0).applyQuaternion(work.q).applyQuaternion(work.pq.invert()).normalize();
      stepTail(res.tail, work.root, work.dir, 0.15 * s.walk + 0.08 * s.sit + 0.06 * s.lie, dt);
    }
  });

  return (
    <>
    <group
      ref={root}
      onClick={(e) => {
        e.stopPropagation();
        if (e.delta > 6) return;
        onInspect?.(lang === 'en' ? 'The tiger cub from the Thriller shoot.' : 'El tigre bebé de la sesión de Thriller.', 'tiger');
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover?.(true, lang === 'en' ? 'The tiger cub · click for its story' : 'El tigre bebé · pulsa para ver su historia');
      }}
      onPointerOut={() => onHover?.(false)}
    >
      <group ref={body}>
        <mesh geometry={res.geo.body} material={res.fur} castShadow />
        {LEGS.map((l, i) => (
          <group
            key={i}
            position={[l.at[0], -0.02, l.at[1]]}
            ref={(g) => {
              legs.current[i] = g;
            }}
          >
            <mesh geometry={res.geo.leg} material={res.fur} castShadow />
          </group>
        ))}
        <group ref={head} position={[0.19, 0.06, 0]}>
          <mesh geometry={res.geo.head} material={res.fur} castShadow />
          <mesh geometry={res.geo.eyes} material={res.eye} />
        </group>
        {/* Raíz de la cola: solo marca dónde nace; el tubo va fuera, en el espacio del suelo. */}
        <group ref={tail} position={[-0.17, 0.02, 0]} rotation={[0, 0, -1.45]} />
      </group>
    </group>
    <mesh geometry={res.tail.geometry} material={res.fur} castShadow frustumCulled={false} />
    </>
  );
}
