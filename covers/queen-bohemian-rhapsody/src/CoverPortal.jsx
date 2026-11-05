// CoverPortal.jsx — la "portada" flotando en el vacío negro que la cámara atraviesa (t = 0–2,7 s).
//
// Derechos (D8): NO es la portada oficial. Es un dibujo procedural hecho aquí,
// en un <canvas> 2D: degradado de atardecer, sol, grada escalonada y una silueta
// de maniquí con el puño alzado. No contiene texto ni logotipos.
// Se desvanece entre PORTAL_FADE[0] y PORTAL_FADE[1] y luego se oculta.
// La CanvasTexture es nuestra: se libera (dispose) al desmontar.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { CanvasTexture, SRGBColorSpace } from 'three';
import { PORTAL_FADE } from './keys.js';

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

/**
 * @param {object} props
 * @param {import('react').RefObject<{ t: number }>} props.progress Reloj de la intro (lo escribe CameraRig).
 */
export default function CoverPortal({ progress }) {
  const mesh = useRef(null);
  const material = useRef(null);

  const texture = useMemo(() => {
    const tex = new CanvasTexture(drawSleeve());
    tex.colorSpace = SRGBColorSpace;
    return tex;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);

  useFrame(() => {
    if (!mesh.current || !material.current) return;
    const [from, to] = PORTAL_FADE;
    const { t } = progress.current;
    const fade = Math.min(Math.max((t - from) / (to - from), 0), 1);
    material.current.opacity = 1 - fade;
    mesh.current.visible = fade < 1;
  });

  return (
    // Plano de 3 × 3 m a 1,6 m de altura; girado para mirar a la cámara que llega desde -Z.
    <mesh ref={mesh} name="CoverPortal" position={[0, 1.6, -10.2]} rotation={[0, Math.PI, 0]}>
      <planeGeometry args={[3, 3]} />
      <meshBasicMaterial ref={material} map={texture} transparent toneMapped={false} />
    </mesh>
  );
}
