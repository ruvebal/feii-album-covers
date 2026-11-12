// Carteles de neón con las diez canciones del disco: la cara A en la pared de
// la salida y la cara B en la pared de la izquierda (la que no tiene el disco
// de oro), más un rótulo «Studio 54» sobre el rincón de la bola de discoteca.
//
// Cada cartel parpadea a su aire, como un tubo de neón viejo: zumba un poco y
// de vez en cuando se apaga un instante. Cuando suena una canción del disco,
// su cartel late rápido con los graves y los demás se quedan a media luz.
// Pulsar un cartel pone esa canción.
//
// Rendimiento: los once rótulos son una sola malla con una sola textura (un
// lienzo con los textos en blanco). El color y el parpadeo van en el color de
// los vértices, así que todo cuesta una llamada de dibujo.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, BufferGeometry, CanvasTexture, Color, Euler, Float32BufferAttribute, Matrix4, MeshBasicMaterial, Quaternion, SRGBColorSpace, Vector3 } from 'three';

const W = 2048;
const ROW = 186;
const BACK_Z = 10.43;
const LEFT_X = -4.23;

/**
 * Dónde va cada cartel: pared ('back' o 'left'), posición a lo largo de la
 * pared, altura, inclinación, alto de la letra y ancho máximo (metros), color.
 */
const SIGNS = [
  { wall: 'back', at: 0.45, y: 3.92, tilt: -0.02, h: 0.4, max: 3.7, color: '#ff2d95' },
  { wall: 'back', at: 1.25, y: 3.32, tilt: 0.04, h: 0.4, max: 2.4, color: '#19e3ff' },
  { wall: 'back', at: -0.15, y: 2.74, tilt: -0.03, h: 0.4, max: 3.0, color: '#ffe14a' },
  { wall: 'back', at: 1.05, y: 2.16, tilt: 0.03, h: 0.4, max: 2.6, color: '#ff6a2b' },
  { wall: 'back', at: -0.35, y: 1.56, tilt: -0.05, h: 0.42, max: 2.4, color: '#b96bff' },
  { wall: 'left', at: 6.7, y: 3.88, tilt: 0.03, h: 0.4, max: 2.2, color: '#3dff9a' },
  { wall: 'left', at: 4.9, y: 3.34, tilt: -0.03, h: 0.4, max: 3.2, color: '#ff3b3b' },
  { wall: 'left', at: 7.3, y: 2.8, tilt: 0.02, h: 0.4, max: 2.6, color: '#4a8dff' },
  { wall: 'left', at: 5.1, y: 2.28, tilt: -0.04, h: 0.4, max: 3.4, color: '#ff9de1' },
  { wall: 'left', at: 7.5, y: 1.86, tilt: 0.04, h: 0.4, max: 3.0, color: '#ffb02e' },
  // Rótulo del rincón de la bola, con letra de discoteca de los setenta.
  { wall: 'back', at: 3.42, y: 3.9, tilt: 0, h: 0.5, max: 1.7, color: '#ffcf5a', font: 'Monoton', text: 'Studio 54' },
];

/** Color de cada cartel encendido del todo. */
const BASE = SIGNS.map((s) => new Color(s.color));

/** Pinta los textos en blanco con su halo y devuelve el ancho usado de cada fila (0..1). */
function paint(canvas, texts) {
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  return texts.map(({ text, font }, row) => {
    let size = font === 'Monoton' ? 96 : 108;
    const family = font === 'Monoton' ? "'Monoton', 'Oswald', sans-serif" : "'Yellowtail', cursive";
    ctx.font = `${size}px ${family}`;
    const fit = (W - 96) / ctx.measureText(text).width;
    if (fit < 1) {
      size *= fit;
      ctx.font = `${size}px ${family}`;
    }
    const width = ctx.measureText(text).width;
    const y = row * ROW + ROW / 2;
    // Tres pasadas: halo ancho, halo corto y el tubo encendido.
    for (const [blur, alpha] of [[38, 0.45], [14, 0.7], [0, 1]]) {
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = blur;
      ctx.fillStyle = `rgb(255 255 255 / ${alpha})`;
      ctx.fillText(text, 48, y);
    }
    ctx.shadowBlur = 0;
    return (width + 96) / W;
  });
}

/** Una malla con un rectángulo por cartel, ya colocado en su pared. */
function build(used) {
  const pos = [];
  const uv = [];
  const col = [];
  const index = [];
  const rows = SIGNS.length;
  const v = new Vector3();
  SIGNS.forEach((s, k) => {
    const aspect = (used[k] * W) / ROW;
    const w = Math.min(s.max, s.h * aspect);
    const h = w / aspect;
    const back = s.wall === 'back';
    const m = new Matrix4().compose(
      new Vector3(back ? s.at : LEFT_X, s.y, back ? BACK_Z : s.at),
      new Quaternion().setFromEuler(new Euler(0, back ? Math.PI : Math.PI / 2, s.tilt, 'YXZ')),
      new Vector3(1, 1, 1),
    );
    const top = 1 - (k * ROW) / (rows * ROW);
    const bottom = 1 - ((k + 1) * ROW) / (rows * ROW);
    const c = new Color(s.color);
    [[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
      v.set((sx * w) / 2, (sy * h) / 2, 0).applyMatrix4(m);
      pos.push(v.x, v.y, v.z);
      uv.push(sx < 0 ? 0 : used[k], sy < 0 ? bottom : top);
      col.push(c.r, c.g, c.b);
    });
    const i = k * 4;
    index.push(i, i + 1, i + 2, i, i + 2, i + 3);
  });
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  g.setIndex(index);
  return g;
}

/**
 * @param {{
 *   titles: string[],
 *   current: number,
 *   level: () => number,
 *   reduced: boolean,
 *   onPick: (index: number) => void,
 *   onSign: () => void,
 *   onHover: (on: boolean, name?: string) => void,
 *   lang: string,
 * }} props  `current` = canción del disco que suena (−1 si ninguna).
 */
export default function NeonSongs({ titles, current, level, reduced, onPick, onSign, onHover, lang }) {
  // Las letras se pintan cuando las fuentes han cargado (si no, saldría otra letra).
  const [fonts, setFonts] = useState(false);
  useEffect(() => {
    let alive = true;
    const load = document.fonts?.load
      ? Promise.all([document.fonts.load("108px 'Yellowtail'"), document.fonts.load("96px 'Monoton'")])
      : Promise.resolve();
    load.catch(() => {}).then(() => alive && setFonts(true));
    return () => {
      alive = false;
    };
  }, []);

  const res = useMemo(() => {
    if (!fonts) return null;
    const canvas = document.createElement('canvas');
    canvas.width = W;
    canvas.height = ROW * SIGNS.length;
    const used = paint(canvas, SIGNS.map((s, k) => ({ text: s.text ?? titles[k], font: s.font })));
    const map = new CanvasTexture(canvas);
    map.colorSpace = SRGBColorSpace;
    map.anisotropy = 4;
    return {
      geo: build(used),
      map,
      mat: new MeshBasicMaterial({ map, vertexColors: true, transparent: true, blending: AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }),
    };
  }, [fonts, titles]);
  useEffect(
    () => () => {
      res?.geo.dispose();
      res?.map.dispose();
      res?.mat.dispose();
    },
    [res],
  );

  // Apagones de cada tubo: hasta cuándo está apagado y cuándo toca el siguiente.
  const glitch = useRef(SIGNS.map((_, k) => ({ off: 0, next: 1 + k * 0.7 })));
  const mesh = useRef(/** @type {import('three').Mesh | null} */ (null));
  useFrame(({ clock }) => {
    if (!mesh.current) return;
    const t = clock.elapsedTime;
    const colors = mesh.current.geometry.attributes.color;
    const beat = level();
    SIGNS.forEach((_, k) => {
      let light;
      if (reduced) {
        // Sin parpadeo: la canción que suena encendida y las demás a media luz.
        light = current < 0 ? 0.92 : k === current ? 1 : 0.32;
      } else {
        const g = glitch.current[k];
        if (t > g.next) {
          g.off = t + 0.04 + Math.random() * 0.13;
          // A veces el tubo tartamudea: otro apagón enseguida.
          g.next = t + (Math.random() < 0.3 ? 0.18 : 2 + Math.random() * 7);
        }
        const hum = 0.9 + 0.1 * Math.sin(t * (31 + k * 3.7) + k * 1.9);
        light = t < g.off ? 0.1 : hum;
        if (current >= 0 && k < 10) {
          // La que suena: parpadeo rápido (5 veces por segundo) y golpe con los graves.
          if (k === current) light = (Math.sin(t * Math.PI * 10) > 0 ? 1 : 0.5) + beat * 0.5;
          else light *= 0.3;
        }
      }
      const c = BASE[k];
      for (let i = k * 4; i < k * 4 + 4; i += 1) colors.setXYZ(i, c.r * light, c.g * light, c.b * light);
    });
    colors.needsUpdate = true;
  });

  if (!res) return null;
  const which = (e) => Math.floor(e.faceIndex / 2);
  return (
    <mesh
      ref={mesh}
      geometry={res.geo}
      material={res.mat}
      onClick={(e) => {
        if (e.delta > 6) return;
        const k = which(e);
        e.stopPropagation();
        // El último rótulo es el de Studio 54: cuenta su historia.
        if (k >= 10) onSign();
        else onPick(k);
      }}
      onPointerMove={(e) => {
        const k = which(e);
        e.stopPropagation();
        if (k >= 10) onHover(true, lang === 'en' ? 'Studio 54 · click for its story' : 'Studio 54 · pulsa para ver su historia');
        else onHover(true, `${titles[k]} · ${lang === 'en' ? 'click to play it' : 'pulsa para escucharla'}`);
      }}
      onPointerOut={() => onHover(false)}
    />
  );
}
