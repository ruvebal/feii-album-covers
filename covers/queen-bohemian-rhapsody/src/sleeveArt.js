// sleeveArt.js — la imagen impresa en la funda del disco (idle + portada que atraviesa la cámara).
//
// Derechos (D8): NO es la portada oficial. Por defecto es un dibujo procedural hecho aquí,
// en un <canvas> 2D: degradado de atardecer, sol, grada escalonada y una silueta de maniquí
// con el puño alzado. Sin texto ni logotipos.
//
// Por defecto se usa public/sleeve.png (1024², sRGB), pintado por tools/make-sleeve.mjs: arte
// original (sin foto, texto ni escudo). La portada oficial NO va aquí: solo en reference/ (local).
// Es el mismo archivo que `npm run encode -- queen-bohemian-rhapsody` convierte a KTX2 en task3.

import { useEffect, useMemo } from 'react';
import { useTexture } from '@react-three/drei';
import { CanvasTexture, SRGBColorSpace } from 'three';

/**
 * public/sleeve.png: portada propia generada por tools/make-sleeve.mjs. Pon `null` para volver
 * al dibujo de canvas de abajo.
 *
 * @type {string | null}
 */
export const SLEEVE_URL = new URL('../public/sleeve.png', import.meta.url).href;

const SIZE = 512;

/** Dibuja la portada propia en un canvas 2D. */
function drawSleeve() {
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const sky = ctx.createLinearGradient(0, 0, 0, SIZE);
  sky.addColorStop(0, '#2a1650');
  sky.addColorStop(0.45, '#b4386e');
  sky.addColorStop(0.72, '#ff8a2a');
  sky.addColorStop(1, '#ffd27a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Sol bajo, detrás de la grada.
  const sun = ctx.createRadialGradient(SIZE * 0.5, SIZE * 0.66, 8, SIZE * 0.5, SIZE * 0.66, SIZE * 0.32);
  sun.addColorStop(0, 'rgba(255,244,214,1)');
  sun.addColorStop(0.18, 'rgba(255,214,140,0.9)');
  sun.addColorStop(1, 'rgba(255,140,60,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, SIZE, SIZE);

  // Grada escalonada en silueta.
  ctx.fillStyle = '#1a0d1f';
  ctx.beginPath();
  ctx.moveTo(0, SIZE);
  for (let i = 0; i <= 16; i += 1) {
    const x = (i / 16) * SIZE;
    const y = SIZE * 0.7 + Math.abs(i - 8) * 6;
    ctx.lineTo(x, y);
    ctx.lineTo(x + SIZE / 16, y);
  }
  ctx.lineTo(SIZE, SIZE);
  ctx.closePath();
  ctx.fill();

  // Maniquí con el puño alzado (formas simples, sin rasgos).
  ctx.fillStyle = '#0b0610';
  ctx.strokeStyle = '#0b0610';
  ctx.lineCap = 'round';
  const cx = SIZE * 0.5;
  ctx.beginPath();
  ctx.arc(cx, SIZE * 0.47, 18, 0, Math.PI * 2); // cabeza
  ctx.fill();
  ctx.lineWidth = 34;
  ctx.beginPath();
  ctx.moveTo(cx, SIZE * 0.54);
  ctx.lineTo(cx, SIZE * 0.72); // torso
  ctx.stroke();
  ctx.lineWidth = 16;
  ctx.beginPath();
  ctx.moveTo(cx - 14, SIZE * 0.55);
  ctx.lineTo(cx - 52, SIZE * 0.36); // brazo alzado
  ctx.moveTo(cx + 14, SIZE * 0.55);
  ctx.lineTo(cx + 40, SIZE * 0.66); // brazo con micro
  ctx.moveTo(cx - 8, SIZE * 0.72);
  ctx.lineTo(cx - 22, SIZE * 0.92); // piernas
  ctx.moveTo(cx + 8, SIZE * 0.72);
  ctx.lineTo(cx + 26, SIZE * 0.92);
  ctx.stroke();

  // Marco fino.
  ctx.strokeStyle = 'rgba(255,240,220,0.65)';
  ctx.lineWidth = 6;
  ctx.strokeRect(14, 14, SIZE - 28, SIZE - 28);
  return canvas;
}

/** Portada procedural: la CanvasTexture es nuestra, se libera al desmontar. */
function useCanvasSleeve() {
  const texture = useMemo(() => {
    const tex = new CanvasTexture(drawSleeve());
    tex.colorSpace = SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

/** Portada desde public/sleeve.png. La caché de drei es la dueña de la textura (no dispose aquí). */
function usePngSleeve() {
  return useTexture(/** @type {string} */ (SLEEVE_URL), (tex) => {
    tex.colorSpace = SRGBColorSpace; // el PNG guarda colores de pantalla
    tex.anisotropy = 4;
  });
}

/**
 * Textura de la funda. La elección es fija por módulo (SLEEVE_URL), así que
 * siempre se llama al mismo hook en cada render.
 *
 * @returns {import('three').Texture}
 */
export const useSleeveTexture = SLEEVE_URL ? usePngSleeve : useCanvasSleeve;
