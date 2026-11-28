// Las pantallas del rincón de 1982, animadas con un lienzo cada una:
//  - La recreativa, en modo demostración, como en los salones: un laberinto
//    de neón rosa con notas musicales por el que corre un personaje
//    inventado (un muñequito con sombrero), el título del juego
//    y el «INSERT COIN» que se enciende y se apaga. Juego inventado.
//  - La tele: alterna los GIF remotos de Billie Jean y Thriller sobre la
//    pantalla 3D sin dibujarlos en el lienzo (Pinterest no permite CORS).
// Las texturas se repintan unas 24 veces por segundo. Dos llamadas de dibujo.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { CanvasTexture, MeshBasicMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import { advanceGifAfterLoop } from './gifSequence.js';

const ARCADE = { position: [3.7, 1.36, 9.588], rotation: [0.12, Math.PI, 0], size: [0.5, 0.4] };
const TV = { position: [2.6, 0.75, 9.695], rotation: [0, Math.PI, 0], size: [0.46, 0.34] };
export const BILLIE_JEAN_GIF = 'https://i.pinimg.com/originals/ac/3a/b8/ac3ab837347e5654059bbf4319ec059c.gif';
export const THRILLER_GIF = 'https://64.media.tumblr.com/2f3518c461440f685903845c586f362c/tumblr_p2v8rzt8tJ1ukadcbo1_400.gif';
const TV_GIFS = [BILLIE_JEAN_GIF, THRILLER_GIF];
const TV_GIF_LOOP_DURATIONS_MS = [3960, 2080];

/** Laberinto (1 = pared) de 15 x 11 casillas. */
const MAZE = [
  '111111111111111',
  '100000010000001',
  '101110010011101',
  '100000000000001',
  '101101111101101',
  '100000010000001',
  '111011010110111',
  '100000000000001',
  '101110111011101',
  '100000000000001',
  '111111111111111',
];
/** Recorrido del personaje por los pasillos (casillas [columna, fila]). */
const LOOP = [
  [1, 1], [6, 1], [6, 3], [8, 3], [8, 1], [13, 1], [13, 3], [13, 5], [8, 5], [8, 7], [13, 7], [13, 9],
  [8, 9], [6, 9], [1, 9], [1, 7], [6, 7], [6, 5], [1, 5], [1, 3], [1, 1],
];

function drawArcade(c, w, h, t) {
  c.fillStyle = '#12061c';
  c.fillRect(0, 0, w, h);
  const cell = Math.floor(Math.min(w / 15, (h * 0.78) / 11));
  const ox = (w - cell * 15) / 2;
  const oy = h * 0.18;
  // Paredes de neón rosa (solo el contorno, como tubos), sobre fondo violeta.
  c.strokeStyle = '#ff4fd8';
  c.lineWidth = 2;
  MAZE.forEach((row, y) => {
    [...row].forEach((v, x) => {
      if (v !== '1') return;
      c.strokeRect(ox + x * cell + 2, oy + y * cell + 2, cell - 4, cell - 4);
    });
  });
  // Posición del personaje a lo largo del recorrido.
  const seg = (t * 2.2) % (LOOP.length - 1);
  const i = Math.floor(seg);
  const f = seg - i;
  const [ax, ay] = LOOP[i];
  const [bx, by] = LOOP[i + 1];
  const steps = Math.abs(bx - ax) + Math.abs(by - ay) || 1;
  const px = ax + (bx - ax) * f;
  const py = ay + (by - ay) * f;
  // Notas musicales en los pasillos (las que va recogiendo el bailarín).
  c.fillStyle = '#7ef9ff';
  c.textAlign = 'center';
  c.font = `${cell * 0.7}px serif`;
  MAZE.forEach((row, y) => {
    [...row].forEach((v, x) => {
      if (v !== '0' || (x + y) % 2) return;
      c.fillText('♪', ox + (x + 0.5) * cell, oy + (y + 0.8) * cell);
    });
  });
  // El personaje inventado: un muñequito blanco con sombrero negro que baila.
  const cx = ox + (px + 0.5) * cell;
  const cy = oy + (py + 0.5) * cell;
  const bob = Math.sin(t * 18) * cell * 0.06;
  c.fillStyle = '#ffffff';
  c.fillRect(cx - cell * 0.18, cy - cell * 0.1 + bob, cell * 0.36, cell * 0.42);
  c.beginPath();
  c.arc(cx, cy - cell * 0.22 + bob, cell * 0.15, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#111';
  c.fillRect(cx - cell * 0.22, cy - cell * 0.36 + bob, cell * 0.44, cell * 0.06);
  c.fillRect(cx - cell * 0.12, cy - cell * 0.5 + bob, cell * 0.24, cell * 0.15);
  // Rastro de brillos del moonwalk.
  c.fillStyle = '#ff4fd8';
  for (let k = 1; k < 4; k += 1) {
    const back = Math.max(0, f - k * 0.18 / steps);
    c.globalAlpha = 0.5 / k;
    c.fillRect(ox + (ax + (bx - ax) * back + 0.4) * cell, oy + (ay + (by - ay) * back + 0.6) * cell, cell * 0.2, cell * 0.2);
  }
  c.globalAlpha = 1;
  // Título y «INSERT COIN» que parpadea (y la pantalla entera se apaga un
  // instante cada pocos segundos, como en el modo demostración).
  c.textAlign = 'center';
  c.fillStyle = '#ffd400';
  c.font = `bold ${h * 0.085}px monospace`;
  c.fillText('DISCO MAZE', w / 2, h * 0.11);
  if (Math.sin(t * 5) > 0) {
    c.fillStyle = '#ff3b3b';
    c.font = `bold ${h * 0.065}px monospace`;
    c.fillText('INSERT COIN', w / 2, h * 0.975);
  }
  if (t % 7 > 6.4) {
    c.fillStyle = '#000';
    c.fillRect(0, 0, w, h);
  }
}

function drawTv(c, w, h, t, image) {
  if (image && (image.displayWidth > 0 || image.naturalWidth > 0)) {
    c.fillStyle = '#080808';
    c.fillRect(0, 0, w, h);
    c.drawImage(image, 0, 0, w, h);
    return;
  }
  // Atardecer violeta y rosa sobre la silueta de una ciudad.
  const sky = c.createLinearGradient(0, 0, 0, h * 0.5);
  sky.addColorStop(0, '#3a2048');
  sky.addColorStop(0.6, '#8a4a78');
  sky.addColorStop(1, '#c97a8c');
  c.fillStyle = sky;
  c.fillRect(0, 0, w, h * 0.5);
  c.fillStyle = '#2a1a34';
  for (let i = 0; i < 14; i += 1) {
    const bw = w * (0.04 + ((i * 37) % 5) * 0.012);
    const bh = h * (0.06 + ((i * 53) % 7) * 0.025);
    c.fillRect(w * (i / 14) + ((i * 13) % 7), h * 0.5 - bh, bw, bh);
  }
  // Ventanas encendidas de la ciudad.
  c.fillStyle = 'rgb(255 220 180 / 0.6)';
  for (let i = 0; i < 26; i += 1) c.fillRect((i * 97) % w, h * 0.38 + ((i * 41) % 30), 2, 2);
  // Agua oscura y, en diagonal, la acera gris.
  c.fillStyle = '#141018';
  c.fillRect(0, h * 0.5, w, h * 0.5);
  c.fillStyle = '#6b6870';
  c.beginPath();
  c.moveTo(0, h * 0.62);
  c.lineTo(w * 0.35, h * 0.5);
  c.lineTo(w, h * 0.68);
  c.lineTo(w, h);
  c.lineTo(0, h);
  c.fill();
  // Papeles tirados por el suelo.
  c.fillStyle = '#d9d6dc';
  [[0.06, 0.8], [0.14, 0.9], [0.1, 0.72], [0.22, 0.95]].forEach(([u, v]) => c.fillRect(w * u, h * v, 7, 3));
  // La silueta camina hacia la cámara y cada baldosa que pisa se enciende.
  const k = (t * 0.12) % 1;
  const fx = w * (0.32 + k * 0.25);
  const fy = h * (0.6 + k * 0.28);
  const sc = 0.7 + k * 0.6;
  const tile = Math.floor(k * 6);
  for (let i = 0; i <= tile; i += 1) {
    const kk = (i + 0.5) / 6;
    const glow = i === tile ? 1 : Math.max(0, 0.6 - (tile - i) * 0.25);
    if (glow <= 0) continue;
    c.fillStyle = `rgb(255 250 235 / ${glow})`;
    const tx = w * (0.32 + kk * 0.25);
    const ty = h * (0.6 + kk * 0.28) + 4;
    const ts = 18 * (0.7 + kk * 0.6);
    c.beginPath();
    c.moveTo(tx - ts, ty);
    c.lineTo(tx, ty - ts * 0.35);
    c.lineTo(tx + ts, ty);
    c.lineTo(tx, ty + ts * 0.35);
    c.fill();
  }
  // Silueta: pantalón y chaqueta negros, camisa rosa y calcetines blancos.
  const step = Math.sin(t * 6);
  const u = 6 * sc;
  c.fillStyle = '#0d0b0e';
  c.fillRect(fx - u * 0.9 + step * u * 0.4, fy - u * 3, u * 0.8, u * 3);
  c.fillRect(fx + u * 0.1 - step * u * 0.4, fy - u * 3, u * 0.8, u * 3);
  c.fillRect(fx - u * 1.5, fy - u * 6.4, u * 3, u * 3.6);
  c.fillStyle = '#e48aa0';
  c.fillRect(fx - u * 0.5, fy - u * 6.3, u, u * 2.8);
  c.fillStyle = '#5a3a2c';
  c.beginPath();
  c.arc(fx, fy - u * 7.2, u * 0.8, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#0d0b0e';
  c.beginPath();
  c.arc(fx, fy - u * 7.6, u * 0.85, Math.PI, 0);
  c.fill();
  c.fillStyle = '#ffffff';
  c.fillRect(fx - u * 0.9 + step * u * 0.4, fy - u * 0.4, u * 0.8, u * 0.4);
  c.fillRect(fx + u * 0.1 - step * u * 0.4, fy - u * 0.4, u * 0.8, u * 0.4);
  // Rótulo, rayas de tubo y un leve parpadeo.
  c.textAlign = 'left';
  c.fillStyle = 'rgb(255 255 255 / 0.85)';
  c.font = `${h * 0.07}px sans-serif`;
  c.fillText('Billie Jean · 1983', w * 0.05, h * 0.1);
  c.fillStyle = 'rgb(0 0 0 / 0.22)';
  for (let y = 0; y < h; y += 4) c.fillRect(0, y, w, 1.5);
  c.fillStyle = `rgb(255 255 255 / ${0.02 + Math.random() * 0.03})`;
  c.fillRect(0, 0, w, h);
}

/** @param {{ reduced: boolean }} props */
export default function CornerScreens({ reduced }) {
  const [gifIndex, setGifIndex] = useState(0);
  const [loadedGifIndex, setLoadedGifIndex] = useState(-1);
  useEffect(() => {
    if (reduced || loadedGifIndex !== gifIndex) return undefined;
    let loopsCompleted = 0;
    const timer = window.setInterval(() => {
      const next = advanceGifAfterLoop(gifIndex, loopsCompleted, TV_GIFS.length);
      loopsCompleted = next.loopsCompleted;
      if (next.gifIndex !== gifIndex) setGifIndex(next.gifIndex);
    }, TV_GIF_LOOP_DURATIONS_MS[gifIndex]);
    return () => window.clearInterval(timer);
  }, [gifIndex, loadedGifIndex, reduced]);
  const res = useMemo(() => {
    const make = (w, h) => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const texture = new CanvasTexture(canvas);
      texture.colorSpace = SRGBColorSpace;
      return { canvas, texture, mat: new MeshBasicMaterial({ map: texture, toneMapped: false }) };
    };
    return {
      arcade: make(300, 240),
      tv: make(320, 236),
      geo: { arcade: new PlaneGeometry(...ARCADE.size), tv: new PlaneGeometry(...TV.size) },
    };
  }, []);
  useEffect(
    () => () => {
      [res.arcade, res.tv].forEach((s) => {
        s.texture.dispose();
        s.mat.dispose();
      });
      res.geo.arcade.dispose();
      res.geo.tv.dispose();
    },
    [res],
  );
  const last = useRef(-1);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    if (t - last.current < 1 / 24) return;
    last.current = t;
    paintScreens(res, reduced ? 1 : t);
  });
  return (
    <group>
      <mesh geometry={res.geo.arcade} material={res.arcade.mat} position={ARCADE.position} rotation={ARCADE.rotation} />
      <mesh geometry={res.geo.tv} material={res.tv.mat} position={TV.position} rotation={TV.rotation} />
      <Html
        transform
        position={[TV.position[0], TV.position[1], TV.position[2] - 0.002]}
        rotation={TV.rotation}
        distanceFactor={4}
        pointerEvents="none"
        style={{ display: reduced ? 'none' : 'block' }}
      >
        <div style={{ width: `${TV.size[0] * 100}px`, height: `${TV.size[1] * 100}px`, overflow: 'hidden' }}>
          <img
            key={TV_GIFS[gifIndex]}
            src={TV_GIFS[gifIndex]}
            alt={gifIndex === 0 ? 'Videoclip de Billie Jean' : 'Videoclip de Thriller'}
            draggable={false}
            onLoad={() => setLoadedGifIndex(gifIndex)}
            onError={(event) => {
              console.error(`No se pudo cargar el GIF de la tele: ${event.currentTarget.src}`);
              setLoadedGifIndex(gifIndex);
            }}
            style={{ display: 'block', width: '100%', height: '100%', objectFit: 'fill' }}
          />
        </div>
      </Html>
    </group>
  );
}

/** Repinta las dos pantallas (fuera del componente: cambia las texturas). */
function paintScreens(res, t, tvImage) {
  drawArcade(res.arcade.canvas.getContext('2d'), 300, 240, t);
  res.arcade.texture.needsUpdate = true;
  drawTv(res.tv.canvas.getContext('2d'), 320, 236, t, tvImage);
  res.tv.texture.needsUpdate = true;
}
