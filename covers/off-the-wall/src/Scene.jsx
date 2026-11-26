// Todo lo que va dentro del <Canvas>: luz de estudio cálida con una sola
// sombra (la de la luz principal), reflejos suaves con un entorno hecho de
// "lightformers" (sin descargar ningún HDR), suelo, pared, Michael y el plató.

import { Environment, Lightformer } from '@react-three/drei';
import BrickWall from './BrickWall.jsx';
import CameraRig from './CameraRig.jsx';
import Michael from './Michael.jsx';
import Studio from './Studio.jsx';

const BACKGROUND = '#120c0a';

/**
 * @param {{
 *   view: { name: string, at: number } | null,
 *   stepAt: number | null,
 *   flashAt: number | null,
 *   playing: boolean,
 *   level: () => number,
 *   reduced: boolean,
 *   onZone: (zone: string) => void,
 *   onStep: () => void,
 *   onHover: (on: boolean) => void,
 * }} props
 */
export default function Scene({ view, stepAt, flashAt, playing, level, reduced, onZone, onStep, onHover }) {
  return (
    <>
      <color attach="background" args={[BACKGROUND]} />
      <fog attach="fog" args={[BACKGROUND, 9, 19]} />

      {/* Luz de relleno general, cálida arriba y oscura abajo. */}
      <hemisphereLight args={['#ffe6cc', '#2e1a12', 0.5]} />
      {/* Luz principal (la ventana de luz de la izquierda): la única que hace sombra. */}
      <directionalLight
        position={[-2.4, 4.4, 4.6]}
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
      <Environment frames={1} resolution={128}>
        <Lightformer form="rect" intensity={2.2} color="#fff1dd" position={[-2.5, 2, 3]} scale={[2, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#fff1dd" position={[2.6, 2, 2.6]} scale={[2, 2, 1]} />
        <Lightformer form="rect" intensity={0.6} color="#b4553a" position={[0, 1.5, -3]} scale={[8, 4, 1]} />
        <Lightformer form="ring" intensity={0.8} color="#ffffff" position={[0, 5, 0]} scale={3} />
      </Environment>

      {/* Suelo de hormigón del estudio. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 3.5]} receiveShadow>
        <planeGeometry args={[16, 14]} />
        <meshStandardMaterial color="#4e4640" roughness={0.93} />
      </mesh>

      <BrickWall />
      <Michael stepAt={stepAt} playing={playing} reduced={reduced} level={level} onStep={onStep} onHover={onHover} />
      <Studio flash={flashAt} />
      <CameraRig view={view} reduced={reduced} onZone={onZone} />
    </>
  );
}
