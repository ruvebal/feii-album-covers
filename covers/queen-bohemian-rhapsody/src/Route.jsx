// covers/queen-bohemian-rhapsody/src/Route.jsx — endpoint completo de la ruta (D26).
//
// Homenaje 3D a Queen — Bohemian Rhapsody: la cámara atraviesa una portada propia,
// vuela por un estadio al atardecer con Freddie (maniquí estilizado) y la multitud,
// y al terminar entrega navegación libre. Esta ruta es dueña de su <Canvas>, cámara y DOM.
//
// Arranque en idle: el disco en su funda flota en el vacío y se puede orbitar arrastrando.
// La intro solo empieza con un clic (no un arrastre) sobre el disco o con el botón DOM
// «Entrar» (teclado, foco visible). Cursor pointer al pasar sobre la funda (clase en .qbr,
// sin tocar estilos globales).
// DOM (accesible): título, «Entrar», «Saltar intro» / «Repetir intro» (Escape también
// salta una vez empezada), aviso aria-live. prefers-reduced-motion → sin balanceo y,
// al entrar, nunca reproduce el vuelo: va directo a la pose final y congela el cielo.
// Al desmontar: quita la clase de alcance y el listener; R3F libera el renderer y
// cada componente libera sus geometrías/texturas propias.

import { Suspense, useCallback, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import BudgetProbe from '../../../src/lib/BudgetProbe.jsx';
import { withinCeiling } from '../../../src/lib/budget.js';
import usePrefersReducedMotion from '../../../src/lib/usePrefersReducedMotion.js';
import { CEILING } from './budget.js';
import { IDLE_CAMERA } from './keys.js';
import Scene from './Scene.jsx';
import './route.css';

const SCOPE = 'route-queen-bohemian-rhapsody';
// Arranca en la vista de tres cuartos del idle; al entrar, CameraRig la lleva a la pose de t = 0.
const CAMERA = { fov: 35, near: 0.1, far: 1500, position: IDLE_CAMERA };
const DPR = [1, 1.5];

export default function Route() {
  const reduced = usePrefersReducedMotion();
  const [run, setRun] = useState(0);
  const [started, setStarted] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [skipped, setSkipped] = useState(false);
  const [done, setDone] = useState(false);
  const [budget, setBudget] = useState(null);
  const [showBudget] = useState(
    () => import.meta.env.DEV || new URLSearchParams(window.location.search).has('budget'),
  );
  const skip = started && (skipped || reduced);

  useEffect(() => {
    document.documentElement.classList.add(SCOPE);
    return () => document.documentElement.classList.remove(SCOPE);
  }, []);

  // Escape salta la intro (además del botón), solo una vez empezada: en idle no hace nada.
  useEffect(() => {
    if (!started) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') setSkipped(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [started]);

  const onDone = useCallback(() => setDone(true), []);
  const onEnter = useCallback(() => setStarted(true), []);
  const onHoverPortal = useCallback((value) => setHovered(value), []);
  const onSkip = () => {
    setStarted(true);
    setSkipped(true);
  };
  const onReplay = () => {
    setDone(false);
    setSkipped(false);
    setRun((n) => n + 1);
  };

  const verdict = withinCeiling(budget, CEILING);

  return (
    <div className={hovered && !started ? 'qbr qbr--hover' : 'qbr'}>
      <Canvas className="qbr__canvas" dpr={DPR} camera={CAMERA} gl={{ antialias: true, powerPreference: 'high-performance' }}>
        <Suspense fallback={null}>
          <Scene
            run={run}
            started={started}
            onEnter={onEnter}
            onHoverPortal={onHoverPortal}
            skip={skip}
            reduced={reduced}
            done={done}
            onDone={onDone}
          />
        </Suspense>
        <BudgetProbe onSample={setBudget} />
      </Canvas>

      <header className="qbr__title">
        <h1>Bohemian Rhapsody</h1>
        <p>Queen · homenaje 3D (fan art no oficial)</p>
      </header>

      <div className="qbr__controls">
        {!started ? (
          <>
            <button type="button" className="qbr__enter" onClick={onEnter}>
              Entrar
            </button>
            {reduced ? (
              <p>Movimiento reducido: al entrar se omite el vuelo.</p>
            ) : (
              <button type="button" onClick={onSkip}>
                Saltar intro
              </button>
            )}
          </>
        ) : null}
        {!started ? <p>Arrastra para girar el disco · clic en la portada para entrar</p> : null}
        {started && reduced ? <p>Movimiento reducido: intro omitida.</p> : null}
        {started && !reduced && !done ? (
          <button type="button" onClick={() => setSkipped(true)}>
            Saltar intro
          </button>
        ) : null}
        {started && !reduced && done ? (
          <button type="button" onClick={onReplay}>
            Repetir intro
          </button>
        ) : null}
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
