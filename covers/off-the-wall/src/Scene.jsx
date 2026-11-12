// Todo lo que va dentro del <Canvas>: luz de estudio cálida con una sola
// sombra (la de la luz principal), reflejos suaves con un entorno hecho de
// "lightformers" (sin descargar ningún HDR), suelo, pared, Michael y el plató.

import { memo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { flashLevel } from './flash.js';
import BrickWall from './BrickWall.jsx';
import CameraRig from './CameraRig.jsx';
import Michael from './Michael.jsx';
import Studio from './Studio.jsx';
import WallWindow from './WallWindow.jsx';
import WallTitle from './WallTitle.jsx';
import LiveMonitor from './LiveMonitor.jsx';
import SpotifyMirror from './SpotifyMirror.jsx';
import ShotCamera from './ShotCamera.jsx';
import RecordPlayer from './RecordPlayer.jsx';
import Jackson5 from './Jackson5.jsx';
import Hotspots from './Hotspots.jsx';
import NeonSongs from './NeonSongs.jsx';
import Disco54 from './Disco54.jsx';
import { walkTo } from './cameraEvents.js';

const BACKGROUND = '#120c0a';

/** Luz del flash: sale de donde está la cámara y solo se enciende al hacer la foto. */
function FlashLight({ flashAt }) {
  const light = useRef(/** @type {import('three').PointLight | null} */ (null));
  useFrame(({ camera }) => {
    if (!light.current) return;
    light.current.position.copy(camera.position);
    light.current.intensity = flashLevel(flashAt) * 18;
  });
  return <pointLight ref={light} intensity={0} distance={16} decay={1.2} color="#fff7ec" />;
}


/**
 * Entorno para los reflejos del raso, el cuero y el metal. Se pinta una vez y
 * va aparte, memorizado: si estuviera dentro de Scene, cada vez que la ruta se
 * repinta (la música, el panel) se volvía a generar el mapa de reflejos y en
 * ese fotograma había hasta 19 llamadas de dibujo más.
 */
const StudioEnvironment = memo(function StudioEnvironment() {
  return (
    <Environment frames={1} resolution={128}>
      <Lightformer form="rect" intensity={2.2} color="#fff1dd" position={[-2.5, 2, 3]} scale={[2, 2, 1]} />
      <Lightformer form="rect" intensity={1.2} color="#fff1dd" position={[2.6, 2, 2.6]} scale={[2, 2, 1]} />
      <Lightformer form="rect" intensity={0.6} color="#b4553a" position={[0, 1.5, -3]} scale={[8, 4, 1]} />
      <Lightformer form="ring" intensity={0.8} color="#ffffff" position={[0, 5, 0]} scale={3} />
    </Environment>
  );
});

/**
 * @param {{
 *   view: { name: string, at: number } | null,
 *   move: { name: string, at: number } | null,
 *   flashAt: number | null,
 *   groove: { bpm: number, feel: string } | null,
 *   playing: boolean,
 *   level: () => number,
 *   reduced: boolean,
 *   onZone: (zone: string) => void,
 *   onDeck: (near: boolean) => void,
 *   onStep: () => void,
 *   onHover: (on: boolean, name?: string) => void,
 *   onInspect: (text: string, id: string) => void,
 *   lang: string,
 *   shotRequest: number | null,
 *   record: string,
 *   records: object,
 *   onRecord: (key: string) => void,
 *   onOpenDeck: () => void,
 *   titles: string[],
 *   song: number,
 *   onSong: (index: number) => void,
 *   onSign: () => void,
 *   onShot: (rect: { x: number, y: number, side: number }) => void,
 * }} props
 */
export default function Scene({ view, move, flashAt, groove, playing, level, reduced, onZone, onDeck, onStep, onHover, onInspect, lang, shotRequest, onShot, record, records, onRecord, onOpenDeck, titles, song, onSong, onSign }) {
  return (
    <>
      <color attach="background" args={[BACKGROUND]} />
      <fog attach="fog" args={[BACKGROUND, 9, 19]} />

      {/* Luz de relleno general, cálida arriba y oscura abajo. */}
      <hemisphereLight args={['#ffe6cc', '#2e1a12', 0.5]} />
      {/* Luz principal (la ventana de luz de la izquierda): la única que hace sombra. */}
      <directionalLight
        position={[-0.75, 3.4, 5.4]}
        intensity={2.7}
        color="#ffd6ab"
        castShadow
        shadow-radius={5}
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
        shadow-camera-left={-3.4}
        shadow-camera-right={3.4}
        shadow-camera-top={3.8}
        shadow-camera-bottom={-1.2}
        shadow-camera-near={1}
        shadow-camera-far={14}
      />
      {/* Relleno frío desde la derecha y contraluz que separa a Michael de la pared. */}
      <directionalLight position={[3.2, 2.2, 3.4]} intensity={0.55} color="#cbd6ff" />
      <directionalLight position={[0.6, 3.4, -1.6]} intensity={0.9} color="#ffcf9e" />
      {/* Luz de techo sobre el plató, para que se vea al ponerse detrás de Michael. */}
      <pointLight position={[0.4, 3.2, 3.2]} intensity={6} distance={7} decay={1.6} color="#ffe2c2" />

      {/* Entorno para los reflejos del raso, el cuero y el metal. Se pinta una vez. */}
      <StudioEnvironment />

      {/* Suelo de hormigón del estudio. */}
      {/* Pulsar en el suelo: se camina hasta ahí (un arrastre para girar no cuenta). */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0, 3.5]}
        receiveShadow
        onClick={(e) => {
          if (e.delta > 6) return;
          e.stopPropagation();
          walkTo([e.point.x, 0, e.point.z]);
        }}
      >
        <planeGeometry args={[16, 14]} />
        <meshStandardMaterial color="#4e4640" roughness={0.93} />
      </mesh>

      <BrickWall playing={playing} level={level} reduced={reduced} />
      <WallWindow />
      <WallTitle />
      <Michael move={move} flashAt={flashAt} groove={groove} playing={playing} reduced={reduced} level={level} onStep={onStep} onHover={onHover} lang={lang} />
      <FlashLight flashAt={flashAt} />
      <Studio flash={flashAt} />
      <LiveMonitor />
      <SpotifyMirror onHover={onHover} lang={lang} />
      <Jackson5 />
      <Disco54 reduced={reduced} playing={playing} groove={groove} level={level} />
      <Hotspots onHover={onHover} onInspect={onInspect} lang={lang} />
      {/* Después de las cajas invisibles: los neones se pulsan por delante de ellas. */}
      <NeonSongs titles={titles} current={song} level={level} reduced={reduced} onPick={onSong} onSign={onSign} onHover={onHover} lang={lang} />
      <RecordPlayer
        playing={playing}
        record={record}
        records={records}
        onRecord={onRecord}
        onOpenDeck={onOpenDeck}
        onHover={onHover}
        lang={lang}
      />
      <CameraRig view={view} reduced={reduced} onZone={onZone} onDeck={onDeck} />
      <ShotCamera request={shotRequest} onShot={onShot} />
    </>
  );
}
