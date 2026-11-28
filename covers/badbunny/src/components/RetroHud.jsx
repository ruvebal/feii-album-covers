// covers/badbunny/src/components/RetroHud.jsx — Floating dock and collapsible tracklist drawer.

import { useState } from 'react';

export default function RetroHud({
  activeAlbum,
  isPlacing,
  remainingCount,
  showVinylDeck,
  onToggleVinylDeck,
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
  const hasRecord = Boolean(activeAlbum) && !isPlacing;
  const isAtTurntable = activePoi === 'turntable';

  const tracks = activeAlbum ? activeAlbum.tracks : [];
  const track = tracks[activeTrackIndex] || tracks[0];
  const accentColor = activeAlbum ? track?.hex || activeAlbum.accentHex : '#94a3b8';

  return (
    <div className="yhl-hud" style={{ '--yhl-accent': accentColor }}>
      {/* Subtle 3D Hover Tooltip Pill (only shown when hovering an interactive 3D element) */}
      {hoveredPart ? (
        <div className="yhl-hover-toast" role="status">
          <span className="yhl-hover-pill">{hoveredPart}</span>
        </div>
      ) : null}

      {/* Bottom-Center Interactive Control Dock (replaces the old upper info + buttons box) */}
      {hasRecord ? (
        <nav className="yhl-dock" aria-label="Controles del tocadiscos y escenario 3D">
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
            {isAtTurntable ? '🔄 Ir al Escenario 3D' : '🔄 Volver al Tocadiscos'}
          </button>

          <button
            type="button"
            className={`yhl-btn ${needleOnRecord ? 'is-needle-on' : 'is-needle-off'}`}
            aria-pressed={needleOnRecord}
            onClick={onToggleNeedle}
          >
            {needleOnRecord ? '📍 Quitar Aguja' : '📍 Poner Aguja'}
          </button>

          {isAtTurntable ? (
            <button
              type="button"
              className={`yhl-btn ${showVinylDeck ? 'is-active' : ''}`}
              aria-pressed={showVinylDeck}
              onClick={onToggleVinylDeck}
            >
              {showVinylDeck
                ? '✕ Guardar vinilos'
                : `💿 Cambiar vinilo (${remainingCount})`}
            </button>
          ) : null}

          <button
            type="button"
            className={`yhl-btn ${showTracks ? 'is-active' : ''}`}
            aria-expanded={showTracks}
            onClick={() => setShowTracks((v) => !v)}
          >
            {showTracks ? '✕ Ocultar Canciones' : `🎵 Canciones (${tracks.length})`}
          </button>
        </nav>
      ) : null}

      {/* Sleek Right-Side Tracklist Drawer (without album info clutter) */}
      {hasRecord && showTracks ? (
        <aside
          className="yhl-tracklist-panel"
          aria-label={`Lista de ${tracks.length} canciones`}
        >
          <div className="yhl-tracklist-header">
            <div className="yhl-now-playing">
              <span className={`yhl-status-dot ${needleOnRecord && isPlaying ? 'is-live' : ''}`} />
              <span>
                {needleOnRecord
                  ? `Sonando #${String(track.number).padStart(2, '0')} · ${track.title}`
                  : 'Aguja levantada'}
              </span>
            </div>
            <button
              type="button"
              className="yhl-close-tracks-btn"
              onClick={() => setShowTracks(false)}
              aria-label="Ocultar canciones"
            >
              ✕
            </button>
          </div>
          <ol className="yhl-tracklist">
            {tracks.map((item, idx) => {
              const selected = idx === activeTrackIndex;
              const playingThis = selected && needleOnRecord && isPlaying;
              return (
                <li key={`${activeAlbum.id}-${item.number}`}>
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
