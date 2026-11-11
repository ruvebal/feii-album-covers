// /covers/off-the-wall — Michael Jackson, Off the Wall (1979).
// La portada como plató 3D: se abre en el encuadre de la portada y se puede
// rodear a Michael, ponerse detrás de él y descubrir la sesión de fotos.
// React lleva el estado y el DOM (título, botones, textos); Scene.jsx, el 3D.
// Todo está modelado con código: no hay ninguna foto de la portada original.

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import BudgetProbe from '../../../src/lib/BudgetProbe.jsx';
import { withinCeiling } from '../../../src/lib/budget.js';
import usePrefersReducedMotion from '../../../src/lib/usePrefersReducedMotion.js';
import { CEILING } from './budget.js';
import { ALBUM_URL, createPlayer } from './player.js';
import Scene from './Scene.jsx';
import { FOV, VIEWS, coverPosition } from './set.js';
import './route.css';

const SCOPE = 'route-off-the-wall';
const FONTS = 'https://fonts.googleapis.com/css2?family=Yellowtail&family=Oswald:wght@400;600&display=swap';
const DPR = [1, 1.5];

const TRACKS = [
  "Don't Stop 'Til You Get Enough",
  'Rock with You',
  "Workin' Day and Night",
  'Get on the Floor',
  'Off the Wall',
  'Girlfriend',
  "She's Out of My Life",
  "I Can't Help It",
  "It's the Falling in Love",
  'Burn This Disco Out',
];

/** Lo que se cuenta según desde dónde se mire (se lee en voz alta con aria-live). */
const CAPTIONS = {
  cover: 'La portada: Michael sonríe delante de la pared de ladrillo, con esmoquin, pajarita y calcetines blancos.',
  front: 'Arrastra para girar, usa la rueda para acercarte y WASD o las flechas para caminar por el plató.',
  side: 'De lado ya no es una foto: la pared es de ladrillo de verdad, uno a uno, y Michael tiene volumen.',
  behind:
    'Por detrás de Michael: el plató. La cámara en su trípode, las ventanas de luz y el reflector, lo que nunca sale en la portada.',
};

export default function Route() {
  const reduced = usePrefersReducedMotion();
  const [view, setView] = useState(/** @type {{ name: string, at: number } | null} */ (null));
  const [zone, setZone] = useState('cover');
  const [stepAt, setStepAt] = useState(/** @type {number | null} */ (null));
  const [flashAt, setFlashAt] = useState(/** @type {number | null} */ (null));
  const [flashing, setFlashing] = useState(false);
  const [track, setTrack] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [budget, setBudget] = useState(null);
  // En el móvil el panel empieza plegado para dejar ver a Michael.
  const [panelOpen, setPanelOpen] = useState(() => !window.matchMedia('(max-width: 720px)').matches);
  const [notice, setNotice] = useState('');
  // El reproductor nace y muere con la ruta (en un efecto, no en useMemo: en
  // desarrollo React monta dos veces y un reproductor ya liberado no sonaría).
  const music = useRef(/** @type {ReturnType<typeof createPlayer> | null} */ (null));
  const level = useCallback(() => music.current?.level() ?? 0, []);
  const timers = useRef(/** @type {number[]} */ ([]));

  // Clase de ámbito, fuentes y limpieza completa al salir de la ruta.
  useEffect(() => {
    document.documentElement.classList.add(SCOPE);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = FONTS;
    document.head.appendChild(link);
    const pending = timers.current;
    const player = createPlayer({
      onChange: setTrack,
      // El progreso solo mueve la barra; timeupdate llega unas 4 veces por segundo.
      onProgress: (_, t) => setProgress(t),
    });
    music.current = player;
    return () => {
      document.documentElement.classList.remove(SCOPE);
      link.remove();
      pending.forEach((id) => window.clearTimeout(id));
      player.dispose();
      music.current = null;
      document.body.style.cursor = 'auto';
    };
  }, []);

  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
  }, [hovered]);

  const later = (fn, ms) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  // `at` cuenta las peticiones: repetir la misma vista vuelve a llevar la cámara.
  const goTo = (name) => setView((v) => ({ name, at: (v?.at ?? 0) + 1 }));

  const step = useCallback(() => {
    setStepAt(performance.now() / 1000);
    setNotice('Michael se pone de puntillas y saluda.');
  }, []);

  const takePhoto = () => {
    goTo('cover');
    // Primero llega la cámara al encuadre de la portada; después, el destello.
    later(
      () => {
        setFlashAt(performance.now() / 1000);
        setFlashing(true);
        setNotice('Foto hecha: así se ve la portada desde la cámara del plató.');
        later(() => setFlashing(false), 700);
      },
      reduced ? 0 : 1500,
    );
  };

  const playTrack = async (i) => {
    if (!music.current) return;
    if (track === i) {
      music.current.stop();
      setNotice('Música parada.');
      return;
    }
    const ok = await music.current.play(i);
    setNotice(ok ? `Suena «${TRACKS[i]}» (fragmento de 30 s). Michael lleva el ritmo.` : 'No se ha podido cargar el fragmento. ¿Hay conexión?');
  };

  const toggleAlbum = () => (track >= 0 ? playTrack(track) : playTrack(0));

  const verdict = withinCeiling(budget, CEILING);
  const showBudget = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('budget');
  const initial = useMemo(() => coverPosition(window.innerWidth, window.innerHeight), []);

  return (
    <div className={`otw ${zone === 'cover' ? 'otw--framed' : ''}`}>
      <Canvas
        className="otw__canvas"
        shadows="percentage"
        dpr={DPR}
        gl={{ toneMappingExposure: 1.08 }}
        camera={{ position: initial, fov: FOV, near: 0.05, far: 40 }}
        aria-label="Escena 3D: Michael Jackson delante de una pared de ladrillo, en un plató de fotos"
      >
        <Suspense fallback={null}>
          <Scene
            view={view}
            stepAt={stepAt}
            flashAt={flashAt}
            playing={track >= 0}
            level={level}
            reduced={reduced}
            onZone={setZone}
            onStep={step}
            onHover={setHovered}
          />
        </Suspense>
        <BudgetProbe onSample={setBudget} />
      </Canvas>

      {/* Encuadre cuadrado de la portada: aparece cuando se mira de frente. */}
      <div className="otw__frame" aria-hidden="true">
        <span className="otw__frame-artist">Michael Jackson</span>
        <span className="otw__frame-title">Off the Wall</span>
      </div>
      <div className="otw__vignette" aria-hidden="true" />
      <div className="otw__grain" aria-hidden="true" />
      <div className={`otw__flash ${flashing ? 'is-on' : ''}`} aria-hidden="true" />

      <aside className={`otw__panel ${panelOpen ? '' : 'is-closed'}`} aria-label="Controles de la portada">
        <header className="otw__head">
          <p className="otw__artist">Michael Jackson</p>
          <h1 className="otw__title">Off the Wall</h1>
          <p className="otw__meta">Epic Records · 1979 · producido por Quincy Jones</p>
          <button
            type="button"
            className="otw__toggle"
            aria-expanded={panelOpen}
            aria-controls="otw-body"
            onClick={() => setPanelOpen((v) => !v)}
          >
            {panelOpen ? 'Ocultar' : 'Controles'}
          </button>
        </header>

        <div id="otw-body" className="otw__body" hidden={!panelOpen}>
          <fieldset className="otw__group">
            <legend>Ir a</legend>
            {Object.entries(VIEWS).map(([name, v]) => (
              <button key={name} type="button" aria-pressed={zone === name} onClick={() => goTo(name)}>
                {v.label}
              </button>
            ))}
          </fieldset>

          <fieldset className="otw__group">
            <legend>Hacer</legend>
            <button type="button" onClick={step}>
              Hacer un paso
            </button>
            <button type="button" onClick={takePhoto}>
              Hacer la foto
            </button>
            <button type="button" aria-pressed={track >= 0} onClick={toggleAlbum}>
              {track >= 0 ? 'Parar la música' : 'Escuchar el disco'}
            </button>
          </fieldset>

          <p className="otw__caption" aria-live="polite">
            {CAPTIONS[zone]}
          </p>
          <p className="otw__notice" aria-live="polite">
            {notice}
          </p>
          <p className="otw__help">
            Ratón o dedo: girar · rueda o pellizco: acercar · <kbd>W</kbd>
            <kbd>A</kbd>
            <kbd>S</kbd>
            <kbd>D</kbd> o flechas: caminar · clic en Michael: un paso
          </p>

          <section className="otw__tracks" aria-label="Canciones del disco">
            <h2>Cara A y cara B</h2>
            <ol>
              {TRACKS.map((t, i) => (
                <li key={t}>
                  <button
                    type="button"
                    className="otw__track"
                    aria-pressed={track === i}
                    onClick={() => playTrack(i)}
                  >
                    <span className="otw__track-n">{i + 1}</span>
                    <span className="otw__track-name">{t}</span>
                    {track === i ? (
                      <span className="otw__track-bar" style={{ '--p': progress }} aria-hidden="true" />
                    ) : null}
                  </button>
                </li>
              ))}
            </ol>
            <p className="otw__credit">
              Fragmentos de 30 s servidos por Apple Music.{' '}
              <a href={ALBUM_URL} target="_blank" rel="noreferrer">
                Escuchar el disco entero
              </a>
            </p>
          </section>

          {showBudget ? (
            <p className={verdict === false ? 'otw__budget is-over' : 'otw__budget'}>
              {budget
                ? `calls ${budget.calls} · triangles ${budget.triangles} · geometries ${budget.geometries} · textures ${budget.textures}`
                : 'Midiendo…'}
              {verdict === true ? ' · dentro del techo' : ''}
              {verdict === false ? ' · por encima del techo' : ''}
            </p>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
