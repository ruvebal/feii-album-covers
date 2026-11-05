// Por Si Mañana No Estoy — vinilo 3D con la portada impresa, brazo y tracklist.
// React pinta el DOM (título, tracklist, avisos); scene.js monta Three.js sobre
// el <canvas> de esta ruta y devuelve su desmontaje (bucle, listeners, audio, GPU).
// Con ?budget en la URL aparece un panel con renderer.info, para docs/renderer-info.md.

import { useEffect, useRef, useState } from 'react';
import { mountCover } from './scene.js';
import { tracks } from './tracks.js';
import { TEXTURE_URLS } from './textures.js';
import './route.css';

const SCOPE = 'route-por-si-manana-no-estoy';
const FONTS =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,300;12..96,500;12..96,800&family=JetBrains+Mono:wght@400;600&display=swap';
const TITLE_LINES = ['Por Si Mañana', 'No Estoy'];

/** Cada letra en su span (dentro de un bloque por palabra) para ondularla con el giro del disco. */
function LiveTitle() {
  return (
    <h1 aria-label="Por Si Mañana No Estoy">
      {TITLE_LINES.map((line, l) => (
        <span key={line} aria-hidden="true">
          {l > 0 && <br />}
          {line.split(' ').map((word, w) => (
            <span key={w}>
              {w > 0 && ' '}
              <span className="word">
                {[...word].map((ch, c) => (
                  <span key={c} className="ch">{ch}</span>
                ))}
              </span>
            </span>
          ))}
        </span>
      ))}
    </h1>
  );
}

/** Panel opcional (?budget) que lee renderer.info una vez por segundo. */
function BudgetPanel({ renderer }) {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    if (!renderer) return undefined;
    const id = setInterval(() => {
      setInfo({
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
      });
    }, 1000);
    return () => clearInterval(id);
  }, [renderer]);
  if (!info) return null;
  return (
    <pre className="psmne__budget" aria-label="renderer.info">
      {`calls ${info.calls}\ntriangles ${info.triangles}\ngeometries ${info.geometries}\ntextures ${info.textures}`}
    </pre>
  );
}

export default function Route() {
  const rootRef = useRef(null);
  const [renderer, setRenderer] = useState(null);
  const [showBudget] = useState(() => new URLSearchParams(window.location.search).has('budget'));

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add(SCOPE);
    const fonts = document.createElement('link');
    fonts.rel = 'stylesheet';
    fonts.href = FONTS;
    document.head.append(fonts);

    const unmount = mountCover(rootRef.current, { onRenderer: setRenderer });
    return () => {
      unmount();
      fonts.remove();
      html.classList.remove(SCOPE);
      setRenderer(null);
    };
  }, []);

  return (
    <div className="psmne" ref={rootRef}>
      <div className="psmne__loader" role="status">
        <span className="psmne__loader-heart" aria-hidden="true" />
        <p>Cargando…</p>
      </div>

      <canvas className="psmne__scene" aria-label="Portada del álbum en 3D: arrastra para girar el vinilo" />

      <main className="psmne__ui">
        <header className="psmne__title">
          <p className="kicker">Omar Courtz · 2026</p>
          <LiveTitle />
          <p className="meta">18 canciones · 1 h 10 min</p>
          <a className="listen" href="https://open.spotify.com/album/6A7uWpBb4nHbiBHWRlZi5f" target="_blank" rel="noopener noreferrer">
            ▶ Escuchar en Spotify
          </a>
        </header>

        <section className="psmne__tracklist" aria-label="Tracklist">
          <h2>Tracklist</h2>
          <p className="psmne__credit">
            Toca una canción para escuchar 30 s · fragmentos de{' '}
            <a href="https://music.apple.com/" target="_blank" rel="noopener noreferrer">Apple Music</a>
          </p>
          <ol className="psmne__tracks">
            {tracks.map((t, i) => (
              <li key={t.title} style={{ animationDelay: `${0.6 + i * 0.05}s` }}>
                <button type="button" className="track" aria-pressed="false">
                  <span className="n">
                    <span className="num">{String(i + 1).padStart(2, '0')}</span>
                    <span className="eq" aria-hidden="true"><i /><i /><i /></span>
                  </span>
                  <span className="t">
                    {t.title}
                    {t.feat && <span className="f">con {t.feat}</span>}
                  </span>
                </button>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <p className="psmne__hint">Mueve el ratón · arrastra o haz scroll en el vinilo</p>
      <div className="psmne__flat-disc" aria-hidden="true">
        <div className="psmne__flat-vinyl" />
        <img src={TEXTURE_URLS.cover} alt="" />
      </div>
      <p className="psmne__nowebgl" hidden>
        WebGL está desactivado, por eso ves la versión sin 3D. En Chrome:{' '}
        <strong>Ajustes › Sistema › «Usar aceleración gráfica cuando esté disponible»</strong> y reinicia el navegador.
        <span className="why" />
      </p>

      {showBudget && <BudgetPanel renderer={renderer} />}
    </div>
  );
}
