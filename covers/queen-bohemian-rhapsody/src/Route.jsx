// covers/queen-bohemian-rhapsody/src/Route.jsx — endpoint completo de la ruta (D26).
//
// Homenaje 3D a Queen — Bohemian Rhapsody: la cámara atraviesa una portada propia,
// vuela por un estadio al atardecer con Freddie (maniquí estilizado) y la multitud,
// y al terminar entrega navegación libre. Esta ruta es dueña de su <Canvas>, cámara y DOM.
//
// DOM (accesible): título, botón "Saltar intro" / "Repetir intro" (también Escape
// salta), aviso aria-live al entregar el control. prefers-reduced-motion → nunca
// reproduce el vuelo: va directo a la pose final y congela el reloj del cielo.
// Al desmontar: quita la clase de alcance y el listener; R3F libera el renderer y
// cada componente libera sus geometrías/texturas propias.

import { Suspense, useCallback, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import BudgetProbe from '../../../src/lib/BudgetProbe.jsx';
import { withinCeiling } from '../../../src/lib/budget.js';
import usePrefersReducedMotion from '../../../src/lib/usePrefersReducedMotion.js';
import { CEILING } from './budget.js';
import Scene from './Scene.jsx';
import './route.css';

const SCOPE = 'route-queen-bohemian-rhapsody';
const CAMERA = { fov: 35, near: 0.1, far: 1500, position: [0, 1.6, -14] };
const DPR = [1, 1.5];

export default function Route() {
  const reduced = usePrefersReducedMotion();
  const [run, setRun] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const [done, setDone] = useState(false);
  const [budget, setBudget] = useState(null);
  const [showBudget] = useState(
    () => import.meta.env.DEV || new URLSearchParams(window.location.search).has('budget'),
  );
  const skip = skipped || reduced;

  useEffect(() => {
    document.documentElement.classList.add(SCOPE);
    return () => document.documentElement.classList.remove(SCOPE);
  }, []);

  // Escape salta la intro (además del botón).
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') setSkipped(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onDone = useCallback(() => setDone(true), []);
  const onButton = () => {
    if (!done) {
      setSkipped(true);
      return;
    }
    setDone(false);
    setSkipped(false);
    setRun((n) => n + 1);
  };

  const verdict = withinCeiling(budget, CEILING);

  return (
    <div className="qbr">
      <Canvas className="qbr__canvas" dpr={DPR} camera={CAMERA} gl={{ antialias: true, powerPreference: 'high-performance' }}>
        <Suspense fallback={null}>
          <Scene run={run} skip={skip} reduced={reduced} done={done} onDone={onDone} />
        </Suspense>
        <BudgetProbe onSample={setBudget} />
      </Canvas>

      <header className="qbr__title">
        <h1>Bohemian Rhapsody</h1>
        <p>Queen · homenaje 3D (fan art no oficial)</p>
      </header>

      <div className="qbr__controls">
        {reduced ? (
          <p>Movimiento reducido: intro omitida.</p>
        ) : (
          <button type="button" onClick={onButton}>
            {done ? 'Repetir intro' : 'Saltar intro'}
          </button>
        )}
        {done ? <p>Arrastra para orbitar · rueda para acercar · clic derecho para desplazar</p> : null}
      </div>

      <p className="qbr__sr" aria-live="polite">
        {done ? 'Intro terminada. Navegación libre activa.' : ''}
      </p>

      {showBudget && budget ? (
        <pre className={verdict === false ? 'qbr__budget qbr__budget--over' : 'qbr__budget'} aria-label="renderer.info">
          {`calls ${budget.calls} · triangles ${budget.triangles}\ngeometries ${budget.geometries} · textures ${budget.textures}`}
          {verdict === false ? '\nover ceiling' : ''}
        </pre>
      ) : null}
    </div>
  );
}
