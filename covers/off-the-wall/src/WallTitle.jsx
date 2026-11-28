// El nombre y el título escritos a mano con tiza en la pared, arriba a la
// izquierda, como en la portada: "MICHAEL JACKSON" subrayado y debajo
// "OFF THE WALL" en tres líneas, también subrayado.
// Se dibuja con código en un lienzo (letra a letra, con un poco de temblor y
// la tiza gastada); no es una copia del rótulo original. Una llamada de
// dibujo y una textura.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import { WALL } from './set.js';
import { shotRig } from './shotRig.js';

// Medido sobre la portada: el bloque de texto va del 4 % al 37 % del ancho y
// del 4 % al 53 % del alto, que en la pared (a 1 m detrás de Michael) son
// unos 0,8 x 1,18 m con el centro en x -0,70, y 1,47.
const W = 0.84;
const H = 1.34;
const PX = 1024;
const FONT = '"Architects Daughter"';
// Delante de la cara de los ladrillos (que sobresalen 0,11 m del muro).
const POSITION = [-0.69, 1.33, WALL.z + 0.122];
// En la foto de cintura para arriba el título sale a la mitad de tamaño y más
// cerca de Michael, arriba a la izquierda, como en esa versión del disco.
const HALF_POSITION = [-0.36, 1.71, WALL.z + 0.122];
const HALF_SCALE = 0.4;

/** Generador pseudoaleatorio con semilla: la tiza sale igual en cada visita. */
function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * Escribe una línea letra a letra, ajustada al ancho `width`, con cada letra
 * torcida y fuera de línea, como escrita a mano. `slope` inclina la línea
 * entera (negativo: sube hacia la derecha).
 */
function chalkLine(c, rand, text, x, y, size, width, slope = 0) {
  c.font = `${size}px ${FONT}, "Comic Sans MS", cursive`;
  const natural = c.measureText(text).width;
  const sx = width / natural;
  let cx = x;
  for (const ch of text) {
    const w = c.measureText(ch).width * sx;
    c.save();
    c.translate(cx + w / 2, y + (cx - x) * slope + (rand() - 0.5) * size * 0.1);
    c.rotate(slope + (rand() - 0.5) * 0.2);
    c.scale(sx * (0.9 + rand() * 0.16), 0.9 + rand() * 0.2);
    c.fillText(ch, 0, 0);
    // Un segundo trazo apenas desplazado: la tiza deja el borde irregular.
    c.globalAlpha = 0.5;
    c.fillText(ch, size * 0.012, size * 0.01);
    c.globalAlpha = 1;
    c.restore();
    cx += w;
  }
}

/** Raya de tiza a mano alzada entre dos puntos. */
function chalkStroke(c, rand, x0, y0, x1, y1, thick) {
  c.lineCap = 'round';
  for (let pass = 0; pass < 2; pass += 1) {
    c.lineWidth = thick * (pass ? 0.6 : 1);
    c.beginPath();
    c.moveTo(x0, y0 + (rand() - 0.5) * 4);
    const n = 8;
    for (let i = 1; i <= n; i += 1) {
      const t = i / n;
      c.lineTo(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + (rand() - 0.5) * thick * 0.5);
    }
    c.stroke();
  }
}

function drawTitle(canvas) {
  const c = canvas.getContext('2d');
  const rand = seeded(1979);
  c.clearRect(0, 0, canvas.width, canvas.height);
  c.fillStyle = '#f5f1e8';
  c.strokeStyle = '#f5f1e8';
  c.textAlign = 'center';
  c.textBaseline = 'alphabetic';
  chalkLine(c, rand, 'MICHAEL', 24, 205, 285, 990, -0.01);
  chalkLine(c, rand, 'JACKSON', 18, 480, 290, 850, -0.045);
  chalkStroke(c, rand, 66, 630, 880, 515, 10);
  chalkLine(c, rand, 'OFF', 34, 840, 290, 470, 0.03);
  chalkLine(c, rand, 'THE', 100, 1050, 235, 420, -0.02);
  chalkLine(c, rand, 'WALL', 6, 1320, 290, 500, 0.015);
  chalkStroke(c, rand, 66, 1408, 495, 1392, 9);

  // Tiza gastada: se borran motas y rayitas al azar.
  c.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < 9000; i += 1) {
    c.globalAlpha = 0.25 + rand() * 0.6;
    const x = rand() * canvas.width;
    const y = rand() * canvas.height;
    c.fillRect(x, y, 1 + rand() * 3, 1 + rand() * 2);
  }
  c.globalAlpha = 1;
  c.globalCompositeOperation = 'source-over';
}

/** Vuelve a pintar el lienzo de la textura y avisa a three de que ha cambiado. */
function repaint(texture) {
  drawTitle(texture.image);
  texture.needsUpdate = true;
}

export default function WallTitle() {
  const res = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = PX;
    canvas.height = Math.round((PX * H) / W);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.anisotropy = 4;
    return {
      texture,
      geometry: new PlaneGeometry(W, H),
      material: new MeshStandardMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        roughness: 1,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    };
  }, []);

  useEffect(() => {
    let alive = true;
    const paint = () => {
      if (!alive) return;
      repaint(res.texture);
    };
    // Se pinta ya con la letra de reserva y otra vez cuando llega la de mano.
    paint();
    document.fonts?.load(`200px ${FONT}`).then(paint, () => {});
    return () => {
      alive = false;
      res.texture.dispose();
      res.geometry.dispose();
      res.material.dispose();
    };
  }, [res]);

  const mesh = useRef(/** @type {import('three').Mesh | null} */ (null));
  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    m.position.fromArray(shotRig.half ? HALF_POSITION : POSITION);
    m.scale.setScalar(shotRig.half ? HALF_SCALE : 1);
  });

  return <mesh ref={mesh} geometry={res.geometry} material={res.material} position={POSITION} receiveShadow />;
}
