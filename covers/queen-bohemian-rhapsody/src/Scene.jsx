// Scene.jsx — árbol R3F de la ruta (dentro del <Canvas> de Route.jsx).
//
// t < WORLD_FROM: vacío negro con la portada (CoverPortal).
// t ≥ WORLD_FROM: cielo + luces (SkyLights) + estadio + Freddie + multitud con móviles (grupo `world`).
// La hora del día (progress.tod) mueve el cielo, las luces y la multitud a la vez.
// task1 usa placeholders procedurales (placeholders.js); el camino GLB está en
// stadiumGlb.js detrás de USE_GLB. Las geometrías creadas aquí se liberan al desmontar.

import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { DoubleSide } from 'three';
import CameraRig from './CameraRig.jsx';
import CoverPortal from './CoverPortal.jsx';
import Crowd from './Crowd.jsx';
import RendererInfo from './RendererInfo.jsx';
import SkyLights from './SkyLights.jsx';
import SunsetSky from './SunsetSky.jsx';
import { WORLD_FROM } from './keys.js';
import { makeFan, makeFreddie, makeMic, makeStadium, makeStage } from './placeholders.js';
import { USE_GLB, useStadiumGLTF } from './stadiumGlb.js';

/**
 * Estadio, escenario, Freddie, micro y multitud con geometría procedural.
 *
 * @param {{ progress: import('react').RefObject<{ tod: number }>, reduced: boolean }} props
 */
function ProceduralWorld({ progress, reduced }) {
  const geo = useMemo(
    () => ({
      stadium: makeStadium(),
      stage: makeStage(),
      freddie: makeFreddie(),
      mic: makeMic(),
      fan: makeFan(),
    }),
    [],
  );
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);

  return (
    <>
      <mesh name="Stadium" geometry={geo.stadium}>
        <meshStandardMaterial color="#3a2d38" roughness={0.95} side={DoubleSide} />
      </mesh>
      <mesh name="Stage" geometry={geo.stage}>
        <meshStandardMaterial color="#2b2230" roughness={0.8} />
      </mesh>
      <mesh name="Freddie" geometry={geo.freddie}>
        <meshStandardMaterial color="#b98a5e" roughness={0.65} />
      </mesh>
      <mesh name="Mic" geometry={geo.mic}>
        <meshStandardMaterial color="#1c1c1f" metalness={0.6} roughness={0.35} />
      </mesh>
      <Crowd geometry={geo.fan} progress={progress} reduced={reduced} />
    </>
  );
}

/**
 * task3: el GLB de Blender. Los nodos Fan_LOD0/Fan_LOD1 se ocultan: la multitud
 * los instancia (posiciones en JS). INACTIVO mientras USE_GLB = false.
 *
 * @param {{ url: string, progress: import('react').RefObject<{ tod: number }>, reduced: boolean }} props
 */
function GlbWorld({ url, progress, reduced }) {
  const { scene, nodes } = useStadiumGLTF(url);
  useEffect(() => {
    ['Fan_LOD0', 'Fan_LOD1'].forEach((name) => {
      if (nodes[name]) nodes[name].visible = false;
    });
  }, [nodes]);
  return (
    <>
      <primitive object={scene} />
      {nodes.Fan_LOD0 ? <Crowd geometry={nodes.Fan_LOD0.geometry} progress={progress} reduced={reduced} /> : null}
    </>
  );
}

/**
 * @param {object} props
 * @param {number} props.run Cambia para reiniciar la intro ("Repetir intro").
 * @param {boolean} props.started false = idle (portada flotando, cámara en t = 0).
 * @param {() => void} props.onEnter Clic en la portada en idle.
 * @param {(hovered: boolean) => void} props.onHoverPortal
 * @param {boolean} props.skip Saltar a la pose final.
 * @param {boolean} props.reduced prefers-reduced-motion.
 * @param {boolean} props.done La intro ha terminado.
 * @param {() => void} props.onDone
 */
export default function Scene({ run, started, onEnter, onHoverPortal, skip, reduced, done, onDone }) {
  const progress = useRef({ t: 0, tod: 0 });
  const world = useRef(null);

  const onProgress = useCallback(({ t, tod }) => {
    progress.current.t = t;
    progress.current.tod = tod;
  }, []);

  useFrame(() => {
    if (world.current) world.current.visible = progress.current.t >= WORLD_FROM;
  });

  return (
    <>
      <color attach="background" args={['#000000']} />

      <group ref={world} visible={false}>
        <SunsetSky progress={progress} reduced={reduced} />
        {/* Sol, ambiente y focos violetas ligados a la hora del día (tod). */}
        <SkyLights progress={progress} />
        {/* TODO(task3): <Suspense><GlbWorld url={MODEL_URL} /></Suspense> (ver stadiumGlb.js). */}
        {USE_GLB ? (
          <GlbWorld url="" progress={progress} reduced={reduced} />
        ) : (
          <ProceduralWorld progress={progress} reduced={reduced} />
        )}
      </group>

      <CoverPortal progress={progress} idle={!started} reduced={reduced} onEnter={onEnter} onHover={onHoverPortal} />
      <CameraRig key={run} started={started} skip={skip} onProgress={onProgress} onDone={onDone} />
      <RendererInfo key={`info-${run}`} progress={progress} done={done} />
    </>
  );
}
