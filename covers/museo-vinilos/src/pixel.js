// Utilidades de píxel estilo Minecraft: texturas sin suavizar y canvas de baja resolución.

import * as THREE from 'three';

/** Textura con filtro vecino más cercano (píxeles duros). */
export function nearestTexture(canvas) {
  const t = new THREE.CanvasTexture(canvas);
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** Reduce `img` a n×n píxeles (el mapa de píxeles de la portada). */
export function pixelCanvas(img, n) {
  const c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d');
  g.imageSmoothingEnabled = true;
  g.imageSmoothingQuality = 'high';
  g.drawImage(img, 0, 0, n, n);
  return c;
}

/** Color medio de una imagen, para la etiqueta del disco. */
export function averageColor(img) {
  const c = pixelCanvas(img, 1);
  const [r, g, b] = c.getContext('2d').getImageData(0, 0, 1, 1).data;
  return new THREE.Color().setRGB(r / 255, g / 255, b / 255, THREE.SRGBColorSpace);
}

const QUESTION = ['..XXXX..', '.XX..XX.', '.XX..XX.', '....XX..', '...XX...', '...XX...', '........', '...XX...'];

/** Funda vacía de un vinilo sin ruta: cartón con un «?» de píxeles. */
export function blankSleeveCanvas() {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#c9bb98';
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#a89a78';
  for (let i = 0; i < 128; i += 8) {
    g.fillRect(i, 0, 8, 8);
    g.fillRect(i, 120, 8, 8);
    g.fillRect(0, i, 8, 8);
    g.fillRect(120, i, 8, 8);
  }
  g.fillStyle = '#6d6044';
  QUESTION.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === 'X') g.fillRect(32 + x * 8, 24 + y * 10, 8, 10);
    });
  });
  return c;
}
