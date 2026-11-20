// El segundo tocadiscos, el de 1982: un plato de tracción directa plateado
// (los de los años ochenta, con el plato pesado, los puntos estroboscópicos
// en el borde, el regulador de velocidad deslizante y el brazo en S), sobre
// un mueble negro lacado. Al lado, cuatro discos: tres de los Jackson 5 que
// Michael ya tenía de antes (Third Album, 1970; Maybe Tomorrow, 1971; Lookin'
// Through the Windows, 1972) y el propio Thriller. Pulsar uno lo pone en el
// plato y suenan sus fragmentos de Apple Music.
//
// Está donde en 1979 estaba el tocadiscos de nogal: el mismo rincón del
// estudio, tres años después. Al poner un disco, sale de su funda, vuela en
// arco y se posa en el plato, como en el de 1979.
//
// Las portadas son las reales: se piden a Apple Music al entrar (la misma
// API que da los fragmentos) y se enlazan, no se guardan en el repositorio.
// Mientras cargan (o si no hay conexión) se ve un diseño provisional con el
// título. Todo se funde por material: 7 llamadas y una textura (el atlas).

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  BoxGeometry,
  CanvasTexture,
  CylinderGeometry,
  DoubleSide,
  Euler,
  Matrix4,
  MeshStandardMaterial,
  PlaneGeometry,
  Quaternion,
  RingGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
} from 'three';
import { goTo } from './cameraEvents.js';
import { VIEWS_THRILLER } from './set.js';
import { loadCover } from './covers.js';

/** En el sitio del tocadiscos de 1979, junto a la pared derecha, girado hacia Michael. */
const MODERN_DECK = { position: [2.55, 0, 4.85], rotY: -Math.PI / 2 + 0.2 };
const SPIN = (33.33 / 60) * Math.PI * 2;
const PLATTER = [-0.12, 0.86, 0];

/** Las fundas de la mesa: clave del disco, colores y título de cada diseño. */
const SLEEVES = [
  { key: 'thriller', bg: '#0c0c0e', fg: '#f3efe6', accent: '#d8342b', title: ['THRILLER'], year: '1982' },
  { key: 'third', bg: '#e07a1f', fg: '#2a160a', accent: '#fff2d8', title: ['THIRD', 'ALBUM'], year: '1970' },
  { key: 'maybe', bg: '#2a5fa8', fg: '#f6efe0', accent: '#f2c230', title: ['MAYBE', 'TOMORROW'], year: '1971' },
  { key: 'windows', bg: '#3f8a4c', fg: '#f6efe0', accent: '#f6efe0', title: ['LOOKIN’', 'THROUGH THE', 'WINDOWS'], year: '1972' },
];
const SLOTS = SLEEVES.length;
const PX = 512;

/** Atlas con las cuatro fundas (diseños propios con letra Oswald). */
function paintAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = PX * SLOTS;
  canvas.height = PX;
  const c = canvas.getContext('2d');
  SLEEVES.forEach((s, i) => {
    const x0 = i * PX;
    c.fillStyle = s.bg;
    c.fillRect(x0, 0, PX, PX);
    // Una franja diagonal y un círculo: un diseño gráfico sencillo de la época.
    c.save();
    c.beginPath();
    c.rect(x0, 0, PX, PX);
    c.clip();
    c.fillStyle = s.accent;
    c.globalAlpha = 0.85;
    c.beginPath();
    c.moveTo(x0, PX * 0.72);
    c.lineTo(x0 + PX, PX * 0.42);
    c.lineTo(x0 + PX, PX * 0.5);
    c.lineTo(x0, PX * 0.8);
    c.fill();
    c.globalAlpha = 0.25;
    c.beginPath();
    c.arc(x0 + PX * 0.74, PX * 0.26, PX * 0.16, 0, Math.PI * 2);
    c.fill();
    c.restore();
    c.fillStyle = s.fg;
    c.textAlign = 'left';
    c.font = `600 ${PX * 0.06}px Oswald, sans-serif`;
    c.fillText(s.key === 'thriller' ? 'MICHAEL JACKSON' : 'JACKSON 5', x0 + PX * 0.07, PX * 0.12);
    const size = s.title.length > 2 ? 0.1 : 0.13;
    c.font = `600 ${PX * size}px Oswald, sans-serif`;
    s.title.forEach((line, k) => c.fillText(line, x0 + PX * 0.07, PX * (0.88 - (s.title.length - 1 - k) * (size + 0.01))));
    c.textAlign = 'right';
    c.font = `${PX * 0.055}px Oswald, sans-serif`;
    c.fillText(s.year, x0 + PX * 0.93, PX * 0.95);
  });
  const t = new CanvasTexture(canvas);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function piece(geo, pos, rot = [0, 0, 0]) {
  geo.applyMatrix4(new Matrix4().compose(new Vector3(...pos), new Quaternion().setFromEuler(new Euler(...rot)), new Vector3(1, 1, 1)));
  return geo;
}

function fuse(parts) {
  const clean = parts.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    if (n !== g) g.dispose();
    return n;
  });
  const g = mergeGeometries(clean);
  clean.forEach((x) => x.dispose());
  return g;
}

/** Funda en su casilla del atlas. */
function sleeve(slot) {
  const g = new PlaneGeometry(0.31, 0.31);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i += 1) uv.setX(i, (uv.getX(i) + slot) / SLOTS);
  return g;
}

/** Etiqueta del disco: el centro de la funda de su casilla. */
function label(slot) {
  const g = new RingGeometry(0.0045, 0.055, 48);
  const uv = g.attributes.uv;
  for (let i = 0; i < uv.count; i += 1) uv.setX(i, (slot + 0.3 + uv.getX(i) * 0.4) / SLOTS);
  for (let i = 0; i < uv.count; i += 1) uv.setY(i, 0.3 + uv.getY(i) * 0.4);
  return g;
}

function build() {
  return {
    // Mueble bajo negro lacado con una caja de discos debajo.
    cabinet: fuse([
      piece(new BoxGeometry(0.9, 0.7, 0.5), [0, 0.35, 0]),
      piece(new BoxGeometry(0.92, 0.03, 0.52), [0, 0.715, 0]),
    ]),
    // Plinto plateado del tocadiscos, el regulador, los botones y las patas.
    silver: fuse([
      piece(new BoxGeometry(0.46, 0.1, 0.36), [-0.06, 0.78, 0]),
      piece(new CylinderGeometry(0.02, 0.02, 0.05, 12), [0.12, 0.85, 0.12]),
      piece(new CylinderGeometry(0.006, 0.006, 0.2, 8), [0.04, 0.86, 0.06], [0, 0.4, Math.PI / 2]),
      piece(new CylinderGeometry(0.018, 0.018, 0.035, 12), [0.15, 0.85, 0.06], [0, 0, Math.PI / 2]),
    ]),
    black: fuse([
      piece(new BoxGeometry(0.03, 0.006, 0.14), [0.13, 0.832, -0.08]),
      piece(new BoxGeometry(0.05, 0.012, 0.03), [-0.24, 0.836, 0.14]),
      piece(new BoxGeometry(0.04, 0.012, 0.03), [-0.18, 0.836, 0.14]),
    ]),
    // Plato pesado con su borde de puntos (un anillo) y la alfombrilla de goma.
    platter: fuse([piece(new CylinderGeometry(0.165, 0.165, 0.02, 48), [0, -0.01, 0]), piece(new TorusGeometry(0.163, 0.004, 4, 64), [0, -0.012, 0], [Math.PI / 2, 0, 0])]),
    vinyl: new CylinderGeometry(0.15, 0.15, 0.005, 40),
    // Brazo en S: dos tramos y el cabezal.
    arm: fuse([
      piece(new CylinderGeometry(0.004, 0.004, 0.13, 8), [-0.06, 0, 0.01], [0, 0.25, Math.PI / 2]),
      piece(new CylinderGeometry(0.004, 0.004, 0.1, 8), [-0.16, 0, -0.012], [0, -0.3, Math.PI / 2]),
      piece(new BoxGeometry(0.03, 0.008, 0.018), [-0.215, -0.004, -0.025]),
      piece(new CylinderGeometry(0.014, 0.014, 0.035, 12), [0.03, 0, 0], [0, 0, Math.PI / 2]),
    ]),
    sleeves: SLEEVES.map((_, i) => sleeve(i)),
    labels: SLEEVES.map((_, i) => label(i)),
  };
}

/** Dónde está cada funda en el mueble (coordenadas del mueble). */
const SPOTS = [
  { pos: [0.3, 0.732, 0.1], rot: [-Math.PI / 2, 0, 0.3] },
  { pos: [0.26, 0.738, -0.06], rot: [-Math.PI / 2, 0, -0.2] },
  { pos: [0.18, 0.4, 0.252], rot: [0, 0, 0.04] },
  { pos: [-0.17, 0.4, 0.252], rot: [0, 0, -0.03] },
];

/**
 * @param {{
 *   playing: boolean,
 *   record: string,
 *   records: Record<string, { title: string, artist: string, year: number }>,
 *   onRecord: (key: string) => void,
 *   onOpenDeck: () => void,
 *   onHover: (on: boolean, name?: string) => void,
 *   lang: string,
 * }} props
 */
export default function ModernDeck({ playing, record, records, onRecord, onOpenDeck, onHover, lang }) {
  const res = useMemo(() => {
    const map = paintAtlas();
    return {
      geo: build(),
      map,
      mats: {
        lacquer: new MeshStandardMaterial({ color: '#0b0b0d', roughness: 0.18, metalness: 0.2 }),
        silver: new MeshStandardMaterial({ color: '#c9ccd1', roughness: 0.28, metalness: 0.9 }),
        black: new MeshStandardMaterial({ color: '#151517', roughness: 0.6 }),
        platter: new MeshStandardMaterial({ color: '#1c1c1f', roughness: 0.55, metalness: 0.4 }),
        vinyl: new MeshStandardMaterial({ color: '#0a0a0c', roughness: 0.22, metalness: 0.2 }),
        sleeve: new MeshStandardMaterial({ map, roughness: 0.7, side: DoubleSide }),
      },
    };
  }, []);
  // Las letras de las fundas se vuelven a pintar cuando carga la fuente.
  useEffect(() => {
    let alive = true;
    document.fonts?.load('600 40px Oswald').then(() => {
      if (!alive) return;
      const fresh = paintAtlas();
      res.mats.sleeve.map.image = fresh.image;
      res.mats.sleeve.map.needsUpdate = true;
      fresh.dispose();
    }, () => {});
    return () => {
      alive = false;
    };
  }, [res]);
  useEffect(
    () => () => {
      Object.values(res.geo).flat().forEach((g) => g.dispose());
      res.map.dispose();
      Object.values(res.mats).forEach((m) => m.dispose());
    },
    [res],
  );

  // Las portadas reales, en cuanto llegan, se pintan encima de las provisionales.
  useEffect(() => {
    let alive = true;
    Promise.all(SLEEVES.map((s) => loadCover(s.key))).then((imgs) => {
      if (!alive) return;
      const canvas = res.mats.sleeve.map.image;
      const c = canvas.getContext('2d');
      imgs.forEach((img, i) => img && c.drawImage(img, i * PX, 0, PX, PX));
      res.mats.sleeve.map.needsUpdate = true;
    });
    return () => {
      alive = false;
    };
  }, [res]);

  const mine = SLEEVES.findIndex((s) => s.key === record);
  // En 1982 todos los discos del plató son de este tocadiscos.
  const shown = Math.max(0, mine);
  const disc = useRef(null);
  const arm = useRef(null);
  // Al poner un disco: sale de su funda, vuela en arco y se posa en el plato.
  const fly = useRef(/** @type {{ from: number[], t: number } | null} */ (null));
  const first = useRef(true);
  useEffect(() => {
    if (mine < 0) return;
    if (first.current) {
      first.current = false;
      return;
    }
    fly.current = { from: SPOTS[mine].pos, t: 0 };
  }, [mine]);
  useFrame((_, dt) => {
    const on = playing && mine >= 0;
    const g = disc.current;
    if (g && fly.current) {
      const f = fly.current;
      f.t = Math.min(1, f.t + Math.min(dt, 0.1) / 0.9);
      const e = f.t * f.t * (3 - 2 * f.t);
      g.position.set(
        f.from[0] + (PLATTER[0] - f.from[0]) * e,
        f.from[1] + (PLATTER[1] - f.from[1]) * e + Math.sin(e * Math.PI) * 0.14,
        f.from[2] + (PLATTER[2] - f.from[2]) * e,
      );
      g.rotation.x = (1 - e) * -1.2;
      if (f.t >= 1) {
        g.rotation.x = 0;
        fly.current = null;
      }
    }
    if (g && on && !fly.current) g.rotation.y -= SPIN * Math.min(dt, 0.1);
    if (arm.current) {
      const target = on ? 0.05 : 0.5;
      arm.current.rotation.y += (target - arm.current.rotation.y) * Math.min(1, dt * 4);
    }
  });

  const open = (e) => {
    e.stopPropagation();
    if (e.delta > 6) return;
    goTo(VIEWS_THRILLER.deck.position, VIEWS_THRILLER.deck.target);
    onOpenDeck();
  };

  return (
    <group position={MODERN_DECK.position} rotation={[0, MODERN_DECK.rotY, 0]}>
      <mesh geometry={res.geo.cabinet} material={res.mats.lacquer} />
      {SLEEVES.map((s, i) => (
        <mesh
          key={s.key}
          geometry={res.geo.sleeves[i]}
          material={res.mats.sleeve}
          position={SPOTS[i].pos}
          rotation={SPOTS[i].rot}
          onClick={(e) => {
            e.stopPropagation();
            if (e.delta > 6) return;
            onRecord(s.key);
            onOpenDeck();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            const r = records[s.key];
            onHover(true, `${r.title} · ${r.artist} (${r.year}) · ${lang === 'en' ? 'click to play' : 'pulsa para ponerlo'}`);
          }}
          onPointerOut={() => onHover(false)}
        />
      ))}
      <group
        onClick={open}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(true, lang === 'en' ? '1980s turntable · pick a song' : 'Tocadiscos de los ochenta · elige canción');
        }}
        onPointerOut={() => onHover(false)}
      >
        <mesh geometry={res.geo.silver} material={res.mats.silver} />
        <mesh geometry={res.geo.black} material={res.mats.black} />
        <group position={[PLATTER[0], 0.84, PLATTER[2]]}>
          <mesh geometry={res.geo.platter} material={res.mats.platter} />
        </group>
        <group ref={disc} position={PLATTER}>
          <mesh geometry={res.geo.vinyl} material={res.mats.vinyl} />
          <mesh geometry={res.geo.labels[shown]} material={res.mats.sleeve} position={[0, 0.0028, 0]} rotation={[-Math.PI / 2, 0, 0]} />
        </group>
        <group ref={arm} position={[0.12, 0.875, 0.12]} rotation={[0, 0.5, 0]}>
          <mesh geometry={res.geo.arm} material={res.mats.silver} />
        </group>
      </group>
    </group>
  );
}
