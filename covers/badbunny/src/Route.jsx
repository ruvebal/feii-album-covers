// covers/yhlqmdlg/src/Route.jsx — Student-authored endpoint for /covers/yhlqmdlg (D26).
//
// Bad Bunny — YHLQMDLG (2020)
// Complete 3D diorama modeled in Blender (`yhlqmdlg-world.glb`):
//   - Starts with a wide perspective INSIDE the album cover street surrounded by the electric blue
//     thunderstorm (`StormSky.jsx`) and all 3D cover characters (`BlenderWorld.jsx`).
//   - Clicking any 3D figure zooms the camera directly to it (`CameraRig.jsx`).
//   - Rotating 180 degrees behind the initial camera reveals the rear Turntable:
//     NO vinyl sleeve — only the spinning vinyl record on the platter with the YHLQMDLG cover
//     printed on the circular center (`YhlqmdlgMaterial` GLSL shader + KTX2 UASTC/ETC1S/PNG)
//     and the pivoting tonearm needle.
//   - Physical needle rule: if the needle is lifted off the vinyl (`!needleOnRecord`),
//     no music plays. Putting the needle onto the record immediately starts playback!

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import usePrefersReducedMotion from '../../../src/lib/usePrefersReducedMotion.js';
import { createYhlqmdlgAudio } from './audioEngine.js';
import BlenderWorld from './components/BlenderWorld.jsx';
import CameraRig from './components/CameraRig.jsx';
import { CAMERA_POIS } from './cameraPois.js';
import RetroHud from './components/RetroHud.jsx';
import StormSky from './components/StormSky.jsx';
import { TRACKS } from './tracks.js';
import './route.css';

const SCOPE_CLASS = 'route-yhlqmdlg';
const CAMERA_INIT = { position: CAMERA_POIS.overview.position, fov: 50 };
const DPR_CAP = [1, 1.5];

export default function Route() {
  const reduced = usePrefersReducedMotion();

  const [activeTrackIndex, setActiveTrackIndex] = useState(1); // #02 "La Difícil"
  const [isPlaying, setIsPlaying] = useState(false);
  const [needleOnRecord, setNeedleOnRecord] = useState(false); // Needle starts off the record -> silence until placed!
  const [activePoi, setActivePoi] = useState('overview');
  const [hoveredPart, setHoveredPart] = useState(null);

  const audioRef = useRef(null);
  const needleRef = useRef(needleOnRecord);
  const trackIndexRef = useRef(activeTrackIndex);

  useEffect(() => {
    needleRef.current = needleOnRecord;
  }, [needleOnRecord]);

  useEffect(() => {
    trackIndexRef.current = activeTrackIndex;
  }, [activeTrackIndex]);

  const activeTrack = TRACKS[activeTrackIndex] || TRACKS[0];

  // Scope class on document.documentElement and clean up on unmount (Route contract 1)
  useEffect(() => {
    document.documentElement.classList.add(SCOPE_CLASS);
    return () => {
      document.documentElement.classList.remove(SCOPE_CLASS);
    };
  }, []);

  // Pointer cursor feedback on 3D interactive Blender meshes, reset on unmount
  useEffect(() => {
    document.body.style.cursor = hoveredPart ? 'pointer' : 'auto';
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [hoveredPart]);

  // Mount and cleanly destroy the Web Audio / Apple Music engine on route exit
  useEffect(() => {
    const engine = createYhlqmdlgAudio({
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
    if (!needleRef.current || !audioRef.current) return 0;
    return audioRef.current.getBassEnergy();
  }, []);

  // Selecting a track in the tracklist changes the active track.
  // Music ONLY plays if the needle is touching the record!
  const handleSelectTrack = useCallback((index) => {
    setActiveTrackIndex(index);
    if (needleRef.current && audioRef.current) {
      audioRef.current.playTrack(index);
    }
  }, []);

  // Toggling the tonearm needle on/off the vinyl record:
  //   - Lowering the needle onto the record starts the active track.
  //   - Lifting the needle off the record immediately stops the music!
  const handleToggleNeedle = useCallback(() => {
    setNeedleOnRecord((prev) => {
      const next = !prev;
      if (next) {
        audioRef.current?.playTrack(trackIndexRef.current);
      } else {
        audioRef.current?.pause();
      }
      return next;
    });
  }, []);

  return (
    <div className="yhl-route">
      <div className="yhl-canvas-wrap">
        <Canvas camera={CAMERA_INIT} dpr={DPR_CAP}>
          <color attach="background" args={['#071e3d']} />
          <fog attach="fog" args={['#071e3d', 9.0, 23.0]} />

          <ambientLight intensity={0.75} color="#cce6ff" />
          <directionalLight position={[4.5, 8.5, 4.0]} intensity={2.2} color="#fff7e6" />
          <directionalLight position={[-5.0, 5.0, -4.0]} intensity={1.4} color="#38bdf8" />

          <StormSky
            activeTrack={activeTrack}
            thirdEyeActive
            getBassEnergy={getBassEnergy}
            reduced={reduced}
          />

          <Suspense fallback={null}>
            <BlenderWorld
              textureMode="uastc"
              activePoi={activePoi}
              onSelectPoi={setActivePoi}
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

          <CameraRig activePoi={activePoi} reduced={reduced} />
        </Canvas>
      </div>

      <RetroHud
        activeTrackIndex={activeTrackIndex}
        onSelectTrack={handleSelectTrack}
        isPlaying={isPlaying}
        needleOnRecord={needleOnRecord}
        onToggleNeedle={handleToggleNeedle}
        activePoi={activePoi}
        onSelectPoi={setActivePoi}
        hoveredPart={hoveredPart}
      />
    </div>
  );
}
