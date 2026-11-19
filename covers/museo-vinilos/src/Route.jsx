// Museo de vinilos — loft en primera persona. Cada vinilo del estante es la portada de una ruta de la galería:
// al tocarlo, Steve lo coge, saca el disco, lo pone en el tocadiscos y se entra en esa ruta.
// React pinta el DOM (título, ayuda, lista accesible, avisos); scene.js monta Three.js sobre el <canvas>.
// Con ?budget aparece un panel con renderer.info para docs/renderer-info.md.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { mountMuseum } from './scene.js';
import { getVinyls, routeExists } from './vinyls.js';
import './route.css';

const SCOPE = 'route-museo-vinilos';

function BudgetPanel({ renderer }) {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    if (!renderer) return undefined;
    // fotogramas por segundo reales de este navegador: ábrelo en tu máquina con GPU para anotarlos en docs/renderer-info.md
    let frames = 0;
    let fps = 0;
    let raf = requestAnimationFrame(function loop() {
      frames += 1;
      raf = requestAnimationFrame(loop);
    });
    const id = setInterval(() => {
      fps = frames;
      frames = 0;
      setInfo({
        fps,
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
      });
    }, 1000);
    return () => {
      clearInterval(id);
      cancelAnimationFrame(raf);
    };
  }, [renderer]);
  if (!info) return null;
  return (
    <pre className="museo__budget" aria-label="renderer.info">
      {`fps ${info.fps}\ncalls ${info.calls}\ntriangles ${info.triangles}\ngeometries ${info.geometries}\ntextures ${info.textures}`}
    </pre>
  );
}

export default function Route() {
  const navigate = useNavigate();
  const rootRef = useRef(null);
  const fadeRef = useRef(null);
  const apiRef = useRef(null);
  const navigateRef = useRef(navigate);
  useEffect(() => {
    navigateRef.current = navigate;
  }, [navigate]);

  const vinyls = useMemo(() => getVinyls(), []);
  const [status, setStatus] = useState('loading');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [hover, setHover] = useState(null);
  const [locked, setLocked] = useState(false);
  const [playing, setPlaying] = useState('');
  const [renderer, setRenderer] = useState(null);
  const [notice, setNotice] = useState('');
  const [coarse] = useState(() => window.matchMedia('(pointer: coarse)').matches);
  const [showBudget] = useState(() => new URLSearchParams(window.location.search).has('budget'));

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add(SCOPE);
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const api = mountMuseum(rootRef.current, {
      vinyls,
      reduced,
      onEnter: (slug) => {
        // si la ruta aún no existe en la galería, se avisa aquí en vez de llevar a una página «No cover»
        if (routeExists(slug)) navigateRef.current(`/covers/${slug}`);
        else {
          document.exitPointerLock?.(); // el aviso necesita el ratón libre
          setNotice(vinyls.find((v) => v.slug === slug)?.title ?? slug);
        }
      },
      onFade: (p) => {
        if (fadeRef.current) fadeRef.current.style.opacity = String(p);
      },
      onProgress: setProgress,
      onHover: setHover,
      onLock: setLocked,
      onRenderer: setRenderer,
      onReady: () => setStatus('ready'),
      onError: (e) => {
        setError(e?.message || String(e));
        setStatus('error');
      },
      onStart: setPlaying,
    });
    apiRef.current = api;
    if (new URLSearchParams(window.location.search).has('debug')) window.__museo = api.debug;
    return () => {
      api.unmount();
      apiRef.current = null;
      delete window.__museo;
      html.classList.remove(SCOPE);
      setRenderer(null);
    };
  }, [vinyls]);

  /** Con la sala lista, Steve lo pone en el tocadiscos; si la sala no carga, entra directo a la ruta. */
  const enter = (v) => {
    if (status === 'ready') apiRef.current?.startSlug(v.slug);
    else if (routeExists(v.slug)) navigate(`/covers/${v.slug}`);
    else setNotice(v.title);
  };

  return (
    <div className="museo" ref={rootRef}>
      <canvas className="museo__scene" aria-label="Loft en 3D: camina con WASD y mira con el ratón" />

      <header className="museo__title">
        <h1>Museo de vinilos</h1>
        <p>Cada vinilo del estante es la portada de un compañero.</p>
      </header>

      {status === 'ready' && !playing && (
        <>
          <div className="museo__cross" aria-hidden="true" data-on={hover?.playable ? 'true' : 'false'} />
          {hover ? (
            <aside className="museo__card" role="status">
              <strong>{hover.title}</strong>
              {hover.concept && <span>{hover.concept}</span>}
              {hover.authors?.length > 0 && <span>Autoría: {hover.authors.join(', ')}</span>}
              {hover.status && <span className="museo__status">{hover.status}</span>}
              <em>{hover.playable ? 'Clic o E: Steve pone el disco y entras a su ruta' : 'Todavía no hay ruta a la que entrar'}</em>
            </aside>
          ) : (
            !locked && <p className="museo__tip" role="status">Clic en la escena para mirar con el ratón</p>
          )}
          <p className="museo__help">WASD o flechas: moverte · ratón: mirar · Mayús: correr · clic o E: coger vinilo · Espacio: saltar · M: sonido · Esc: soltar el ratón</p>
        </>
      )}

      {playing && (
        <p className="museo__tip museo__tip--play" role="status">
          Steve pone «{playing}»… <span>Espacio para saltar</span>
        </p>
      )}

      <p className="museo__credit">
        Modelos 3D (Sketchfab): disco «12″ Vinyl Record» de{' '}
        <a href="https://sketchfab.com/3d-models/12-vinyl-record-dd27284e8c1a4622b3a0433c7cc8ee72" target="_blank" rel="noopener noreferrer">AleixoAlonso</a> (CC BY 4.0, etiquetas sustituidas); tocadiscos «grammaphone» de{' '}
        <a href="https://sketchfab.com/3d-models/none-3996b96c48664caeb52992e454345ee1" target="_blank" rel="noopener noreferrer">Artbor</a> (CC BY); mueble «Record Table» de{' '}
        <a href="https://sketchfab.com/3d-models/none-5f6a7f4de45b4c468b8934e7f0adebdd" target="_blank" rel="noopener noreferrer">turtlesomber</a> (CC BY); loft «Loft (5) interior for free» de{' '}
        <a href="https://sketchfab.com/3d-models/none-883881f6025646c79c92824fdbc8a0cc" target="_blank" rel="noopener noreferrer">dasy444</a> (licencia Free Standard).
      </p>

      {coarse && status === 'ready' && !playing && (
        <div className="museo__pad" role="group" aria-label="Controles táctiles">
          <div className="museo__dpad">
            {[['KeyW', '▲', 'Avanzar'], ['KeyA', '◀', 'Izquierda'], ['KeyS', '▼', 'Retroceder'], ['KeyD', '▶', 'Derecha']].map(([code, glyph, label]) => (
              <button
                key={code}
                type="button"
                className={`museo__pad-${code}`}
                aria-label={label}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  apiRef.current?.key(code, true);
                }}
                onPointerUp={() => apiRef.current?.key(code, false)}
                onPointerCancel={() => apiRef.current?.key(code, false)}
                // teclado: Espacio o Intro mantenidos = botón pulsado; al soltar o perder el foco se detiene
                onKeyDown={(e) => {
                  if ((e.code === 'Space' || e.code === 'Enter') && !e.repeat) {
                    e.preventDefault();
                    apiRef.current?.key(code, true);
                  }
                }}
                onKeyUp={(e) => {
                  if (e.code === 'Space' || e.code === 'Enter') apiRef.current?.key(code, false);
                }}
                onBlur={() => apiRef.current?.key(code, false)}
              >
                {glyph}
              </button>
            ))}
          </div>
          <button type="button" className="museo__pad-act" aria-label="Coger el vinilo al que apuntas" onClick={() => apiRef.current?.interact()}>
            E
          </button>
        </div>
      )}

      <nav className="museo__list" aria-label="Vinilos del museo">
        <details>
          <summary>Vinilos ({vinyls.length})</summary>
          <ul>
            {vinyls.map((v) => (
              <li key={v.slug ?? v.title}>
                <button type="button" disabled={Boolean(playing) || !v.playable} onClick={() => enter(v)}>
                  {v.title}
                  {v.status && <small>{v.status}</small>}
                </button>
              </li>
            ))}
            {vinyls.length === 0 && <li className="museo__empty">Aún no hay rutas de compañeros en el registro.</li>}
          </ul>
        </details>
      </nav>

      {status === 'loading' && (
        <div className="museo__loader" role="status">
          <span className="museo__cube" aria-hidden="true" />
          <p>Construyendo el loft… {Math.round(progress * 100)}%</p>
        </div>
      )}
      {status === 'error' && (
        <div className="museo__loader museo__loader--error" role="alert">
          <p>No se pudo cargar el museo: {error}</p>
          <p>Sin WebGL2 o sin `room.glb` no hay sala. Usa la lista de vinilos para ir directo a una ruta.</p>
        </div>
      )}

      {notice && (
        <div className="museo__notice" role="alertdialog" aria-labelledby="museo-notice-t" aria-describedby="museo-notice-d">
          <h2 id="museo-notice-t">{notice}</h2>
          <p id="museo-notice-d">Su ruta todavía no está subida a la galería. Cuando su autor la haga, esta funda entrará directo.</p>
          <button
            type="button"
            autoFocus
            onClick={() => {
              setNotice('');
              setPlaying('');
              apiRef.current?.resume();
            }}
          >
            Seguir en el museo
          </button>
        </div>
      )}

      <div className="museo__fade" ref={fadeRef} aria-hidden="true" />
      {showBudget && <BudgetPanel renderer={renderer} />}
    </div>
  );
}
