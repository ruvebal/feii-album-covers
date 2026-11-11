// covers/yhlqmdlg/src/components/RetroHud.jsx — Minimalist, immersive DOM HUD for the YHLQMDLG 3D World.
//
// Design per user specification:
//   - No character POI button bar (characters are clicked directly in the 3D scene).
//   - No Third-Eye toggle or technical clutter buttons.
//   - No "Now Playing" bottom card.
//   - The 20-track Vinyl Tracklist ONLY appears when the camera is at the rear 180° turntable
//     (`activePoi === 'turntable'`), with an option to hide/show it.

import { useState } from 'react';
import { ALBUM_META, TRACKS } from '../tracks.js';

export default function RetroHud({
  activeTrackIndex,
  onSelectTrack,
  isPlaying,
  needleOnRecord,
  onToggleNeedle,
  activePoi,
  onSelectPoi,
  hoveredPart,
}) {
  const [showTracks, setShowTracks] = useState(true);
  const track = TRACKS[activeTrackIndex] || TRACKS[0];
  const isAtTurntable = activePoi === 'turntable';

  return (
    <div className="yhl-hud" style={{ '--yhl-accent': track.hex }}>
      {/* Compact Top-Left Badge & 180° Camera Switch */}
      <header className="yhl-header">
        <h1 className="yhl-title">{ALBUM_META.title}</h1>
        <p className="yhl-subtitle">
          <strong>{ALBUM_META.artist}</strong> · {ALBUM_META.year}
        </p>

        <p className="yhl-hint">
          {isAtTurntable
            ? 'Haz clic en el brazo o en el vinilo para apoyar/levantar la aguja.'
            : 'Haz clic en cualquier figura 3D de la calle para acercarte o gira 180° al vinilo.'}
        </p>

        {hoveredPart ? <p className="yhl-hover-pill">{hoveredPart}</p> : null}

        <div className="yhl-actions">
          {activePoi !== 'overview' && !isAtTurntable ? (
            <button
              type="button"
              className="yhl-btn"
              onClick={() => onSelectPoi('overview')}
            >
              ← Vista General
            </button>
          ) : null}

          <button
            type="button"
            className="yhl-btn is-turntable-btn"
            onClick={() => onSelectPoi(isAtTurntable ? 'overview' : 'turntable')}
          >
            {isAtTurntable ? '🔄 Volver 180° a la Portada' : '🔄 Girar 180° al Tocadiscos'}
          </button>

          {isAtTurntable ? (
            <>
              <button
                type="button"
                className={`yhl-btn ${needleOnRecord ? 'is-needle-on' : 'is-needle-off'}`}
                aria-pressed={needleOnRecord}
                onClick={onToggleNeedle}
              >
                {needleOnRecord ? '📍 Quitar Aguja' : '📍 Poner Aguja'}
              </button>

              <button
                type="button"
                className={`yhl-btn ${showTracks ? 'is-active' : ''}`}
                aria-expanded={showTracks}
                onClick={() => setShowTracks((v) => !v)}
              >
                {showTracks ? '✕ Ocultar Tracklist' : '📼 Ver Tracklist'}
              </button>
            </>
          ) : null}
        </div>
      </header>

      {/* Right Side Panel: 20-Track Vinyl Tracklist — ONLY visible when at the Turntable */}
      {isAtTurntable && showTracks ? (
        <aside className="yhl-tracklist-panel" aria-label="Lista de 20 canciones de YHLQMDLG">
          <div className="yhl-tracklist-header">
            <div>
              <h2>TRACKLIST (20)</h2>
              <span>
                {needleOnRecord
                  ? 'Aguja en el disco · Sonando'
                  : 'Pon la aguja en el disco para sonar'}
              </span>
            </div>
            <button
              type="button"
              className="yhl-close-tracks-btn"
              onClick={() => setShowTracks(false)}
              aria-label="Ocultar tracklist"
            >
              ✕
            </button>
          </div>
          <ol className="yhl-tracklist">
            {TRACKS.map((item, idx) => {
              const selected = idx === activeTrackIndex;
              const playingThis = selected && needleOnRecord && isPlaying;
              return (
                <li key={item.number}>
                  <button
                    type="button"
                    className={`yhl-track-row ${selected ? 'is-selected' : ''} ${playingThis ? 'is-playing' : ''}`}
                    style={{ '--track-color': item.hex }}
                    aria-pressed={selected}
                    onClick={() => onSelectTrack(idx)}
                  >
                    <span className="yhl-row-num">
                      {playingThis ? '▶' : String(item.number).padStart(2, '0')}
                    </span>
                    <span className="yhl-row-main">
                      <span className="yhl-row-title">{item.title}</span>
                      {item.feat ? <span className="yhl-row-feat">ft. {item.feat}</span> : null}
                    </span>
                    <span className="yhl-row-dur">{item.duration}</span>
                  </button>
                </li>
              );
            })}
          </ol>
        </aside>
      ) : null}
    </div>
  );
}
