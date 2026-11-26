// covers/badbunny/src/Route.jsx — Student-authored endpoint for /covers/badbunny (D26).

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import usePrefersReducedMotion from '../../../src/lib/usePrefersReducedMotion.js';
import { createBadBunnyAudio } from './audioEngine.js';
import AlbumMaquetaStage from './components/AlbumMaquetaStage.jsx';
import BlenderWorld from './components/BlenderWorld.jsx';
import CameraRig from './components/CameraRig.jsx';
import { CAMERA_POIS } from './cameraPois.js';
import RetroHud from './components/RetroHud.jsx';
import StormSky from './components/StormSky.jsx';
import { ALBUMS_BY_ID, BAD_BUNNY_ALBUMS } from './tracks.js';
import './route.css';

const SCOPE_CLASS = 'route-badbunny';
const CAMERA_INIT = { position: CAMERA_POIS.turntable.position, fov: 50 };
const DPR_CAP = [1, 1.5];

export default function Route() {
  const reduced = usePrefersReducedMotion();

  const [activeAlbumId, setActiveAlbumId] = useState(null);
  const [selectedHistory, setSelectedHistory] = useState([]);
  const [showVinylDeck, setShowVinylDeck] = useState(true);
  const [placingState, setPlacingState] = useState(null);

  const [activeTrackIndex, setActiveTrackIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [needleOnRecord, setNeedleOnRecord] = useState(false);
  const [activePoi, setActivePoi] = useState('turntable');
  const [hoveredPart, setHoveredPart] = useState(null);

  const audioRef = useRef(null);
  const needleRef = useRef(needleOnRecord);
  const trackIndexRef = useRef(activeTrackIndex);
  const albumIdRef = useRef(activeAlbumId);

  useEffect(() => {
    needleRef.current = needleOnRecord;
  }, [needleOnRecord]);

  useEffect(() => {
    trackIndexRef.current = activeTrackIndex;
  }, [activeTrackIndex]);

  useEffect(() => {
    albumIdRef.current = activeAlbumId;
  }, [activeAlbumId]);

  const activeAlbum = activeAlbumId ? ALBUMS_BY_ID[activeAlbumId] || null : null;
  const activeTrack = activeAlbum
    ? activeAlbum.tracks[activeTrackIndex] || activeAlbum.tracks[0]
    : BAD_BUNNY_ALBUMS[0].tracks[0];
  const hasRecordSeated = Boolean(activeAlbum) && !placingState;

  const deckAlbums = useMemo(() => {
    if (!activeAlbumId && selectedHistory.length === 0) {
      return BAD_BUNNY_ALBUMS;
    }
    const unselected = BAD_BUNNY_ALBUMS.filter(
      (a) => !selectedHistory.includes(a.id) && a.id !== activeAlbumId,
    );
    if (unselected.length > 0) {
      return unselected;
    }
    return BAD_BUNNY_ALBUMS.filter((a) => a.id !== activeAlbumId);
  }, [activeAlbumId, selectedHistory]);

  // Scope class on document.documentElement and clean up on unmount (Route contract 1)
  useEffect(() => {
    document.documentElement.classList.add(SCOPE_CLASS);
    return () => {
      document.documentElement.classList.remove(SCOPE_CLASS);
    };
  }, []);

  // Pointer cursor feedback on 3D interactive meshes, reset on unmount
  useEffect(() => {
    document.body.style.cursor = hoveredPart ? 'pointer' : 'auto';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hoveredPart]);

  // Mount and cleanly destroy the Web Audio / Apple Music engine on route exit
  useEffect(() => {
    const engine = createBadBunnyAudio({
      onStateChange: (state) => {
        setIsPlaying(state.isPlaying);
      },
    });
    audioRef.current = engine;
    return () => {
      engine.destroy();
      audioRef.current = null;
    };
  }, []);

  const getBassEnergy = useCallback(() => {
    if (!needleRef.current || !audioRef.current || !albumIdRef.current) return 0;
    return audioRef.current.getBassEnergy();
  }, []);

  const handleStartPlaceAlbum = useCallback((nextAlbumId, startX = 0.05) => {
    if (!ALBUMS_BY_ID[nextAlbumId]) return;
    setShowVinylDeck(false);
    setNeedleOnRecord(false);
    needleRef.current = false;
    audioRef.current?.pause();
    setActivePoi('turntable');
    setPlacingState({
      albumId: nextAlbumId,
      startX,
      startedAt: Date.now(),
    });
  }, []);

  const handleFinishPlaceAlbum = useCallback((finishedAlbumId) => {
    setPlacingState(null);
    setActiveAlbumId(finishedAlbumId);
    setActiveTrackIndex(0);
    albumIdRef.current = finishedAlbumId;
    trackIndexRef.current = 0;

    setSelectedHistory((prev) =>
      prev.includes(finishedAlbumId) ? prev : [...prev, finishedAlbumId],
    );

    if (audioRef.current) {
      audioRef.current.setAlbum(finishedAlbumId, false, 0);
    }
  }, []);

  const handleToggleVinylDeck = useCallback(() => {
    setShowVinylDeck((prev) => !prev);
  }, []);

  const handleSelectPoi = useCallback(
    (nextPoi) => {
      if (!hasRecordSeated && nextPoi !== 'turntable') return;
      if (nextPoi !== 'turntable') {
        setShowVinylDeck(false);
      }
      setActivePoi(nextPoi);
    },
    [hasRecordSeated],
  );

  const handleSelectTrack = useCallback((index) => {
    if (!albumIdRef.current) return;
    setActiveTrackIndex(index);
    trackIndexRef.current = index;
    if (needleRef.current && audioRef.current) {
      audioRef.current.playTrack(index, albumIdRef.current);
    }
  }, []);

  const handleToggleNeedle = useCallback(() => {
    if (!albumIdRef.current) return;
    setNeedleOnRecord((prev) => {
      const next = !prev;
      if (next) {
        audioRef.current?.playTrack(trackIndexRef.current, albumIdRef.current);
      } else {
        audioRef.current?.pause();
      }
      return next;
    });
  }, []);

  const bgHex = activeAlbum ? activeAlbum.bgHex : '#0c1220';
  const fogNear = activeAlbum ? activeAlbum.fogNear : 9.0;
  const fogFar = activeAlbum ? activeAlbum.fogFar : 23.0;

  return (
    <div className="yhl-route">
      <div className="yhl-canvas-wrap">
        <Canvas camera={CAMERA_INIT} dpr={DPR_CAP}>
          <color attach="background" args={[bgHex]} />
          <fog attach="fog" args={[bgHex, fogNear, fogFar]} />

          <ambientLight intensity={0.8} color="#e2e8f0" />
          <directionalLight position={[4.5, 8.5, 4.0]} intensity={2.1} color="#fff7e6" />
          <directionalLight
            position={[-5.0, 5.0, -4.0]}
            intensity={1.2}
            color={activeAlbum ? activeAlbum.accentHex : '#94a3b8'}
          />

          {/* Opposite-side 3D scenario is ONLY mounted once a record is seated on the turntable */}
          {hasRecordSeated ? (
            activeAlbum.id === 'yhlqmdlg' ? (
              <StormSky getBassEnergy={getBassEnergy} reduced={reduced} />
            ) : (
              <AlbumMaquetaStage
                album={activeAlbum}
                activePoi={activePoi}
                onSelectPoi={handleSelectPoi}
                getBassEnergy={getBassEnergy}
                reduced={reduced}
                onHoverChange={setHoveredPart}
              />
            )
          ) : null}

          <Suspense fallback={null}>
            <BlenderWorld
              activeAlbumId={activeAlbumId}
              deckAlbums={deckAlbums}
              showVinylDeck={showVinylDeck}
              placingState={placingState}
              onStartPlaceAlbum={handleStartPlaceAlbum}
              onFinishPlaceAlbum={handleFinishPlaceAlbum}
              activePoi={activePoi}
              onSelectPoi={handleSelectPoi}
              needleOnRecord={needleOnRecord}
              onToggleNeedle={handleToggleNeedle}
              isPlaying={isPlaying}
              thirdEyeActive
              activeTrack={activeTrack}
              getBassEnergy={getBassEnergy}
              reduced={reduced}
              onHoverChange={setHoveredPart}
            />
          </Suspense>

          <CameraRig activePoi={activePoi} hasRecord={hasRecordSeated} reduced={reduced} />
        </Canvas>
      </div>

      <RetroHud
        activeAlbum={activeAlbum}
        isPlacing={Boolean(placingState)}
        remainingCount={deckAlbums.length}
        showVinylDeck={showVinylDeck}
        onToggleVinylDeck={handleToggleVinylDeck}
        activeTrackIndex={activeTrackIndex}
        onSelectTrack={handleSelectTrack}
        isPlaying={isPlaying}
        needleOnRecord={needleOnRecord}
        onToggleNeedle={handleToggleNeedle}
        activePoi={activePoi}
        onSelectPoi={handleSelectPoi}
        hoveredPart={hoveredPart}
      />
    </div>
  );
}
