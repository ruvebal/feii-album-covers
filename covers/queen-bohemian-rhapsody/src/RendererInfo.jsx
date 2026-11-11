// RendererInfo.jsx — registra renderer.info en la consola en tres momentos de la intro,
// para docs/renderer-info.md: portada (t ≈ 1 s), plano ancho (t ≈ 4,6 s) y plano final
// (1 s después de entregar el control). Abre la consola del navegador y copia las tablas.
// useFrame corre antes de gl.render: cada lectura describe el frame anterior (válido).

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';

const MOMENTS = [
  { id: 'portada', at: 1.0 },
  { id: 'plano ancho', at: 4.6 },
];

/**
 * @param {object} props
 * @param {import('react').RefObject<{ t: number }>} props.progress
 * @param {boolean} props.done
 */
export default function RendererInfo({ progress, done }) {
  const logged = useRef(new Set());
  const sinceDone = useRef(0);

  useFrame(({ gl }, delta) => {
    const { t } = progress.current;
    // Ventana de 0,5 s: si se salta la intro, no se etiqueta el plano final como "portada".
    let label = MOMENTS.find((m) => t >= m.at && t < m.at + 0.5 && !logged.current.has(m.id))?.id;
    if (done) {
      sinceDone.current += delta;
      if (sinceDone.current > 1 && !logged.current.has('plano final')) label = 'plano final';
    }
    if (!label) return;
    logged.current.add(label);
    const { render, memory } = gl.info;
    console.info(`[queen-bohemian-rhapsody] renderer.info — ${label} (t = ${t.toFixed(2)} s)`);
    console.table({
      calls: render.calls,
      triangles: render.triangles,
      geometries: memory.geometries,
      textures: memory.textures,
    });
  });

  return null;
}
