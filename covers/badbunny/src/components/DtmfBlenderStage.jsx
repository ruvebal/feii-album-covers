import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import SapoConchoModel from './SapoConchoModel.jsx';

export const DTMF_WORLD_GLB_URL = new URL('../../public/dtmf-world.glb', import.meta.url).href;

export default function DtmfBlenderStage({ activePoi, onSelectPoi, onHoverChange, getBassEnergy, reduced }) {
  const { nodes } = useGLTF(DTMF_WORLD_GLB_URL);
  const plantainRef = useRef(null);
  const groveRef = useRef(null);

  useFrame((state) => {
    if (reduced) return;
    const t = state.clock.elapsedTime;
    const bass = getBassEnergy ? getBassEnergy() : 0;
    if (plantainRef.current) {
      plantainRef.current.rotation.z = Math.sin(t * 1.6) * 0.018 + bass * 0.025;
      plantainRef.current.position.y = Math.sin(t * 2.2) * 0.008 + bass * 0.02;
    }
    if (groveRef.current) {
      groveRef.current.rotation.z = Math.sin(t * 1.1) * 0.006;
    }
  });

  const bindPoi = (poiId, label) => ({
    onClick: (e) => {
      e.stopPropagation();
      onSelectPoi(poiId);
    },
    onPointerOver: (e) => {
      e.stopPropagation();
      onHoverChange?.(label);
    },
    onPointerOut: (e) => {
      e.stopPropagation();
      onHoverChange?.(null);
    },
  });

  return (
    <group>
      {nodes.DtmfPatioGround ? (
        <primitive
          object={nodes.DtmfPatioGround}
          onClick={(e) => {
            e.stopPropagation();
            if (activePoi !== 'overview') onSelectPoi('overview');
          }}
        />
      ) : null}
      {nodes.DtmfPlasticChairs ? (
        <primitive object={nodes.DtmfPlasticChairs} {...bindPoi('dtmfChairs', '🪑 Las Dos Sillas Plásticas Blancas de DTmF (Clic para acercar)')} />
      ) : null}
      {nodes.DtmfBananaGrove ? (
        <primitive ref={groveRef} object={nodes.DtmfBananaGrove} {...bindPoi('dtmfBananaGrove', '🌴 Palmeras Reales, Matas de Plátano y Monte Boricua (Clic para acercar)')} />
      ) : null}
      {nodes.DtmfPlantainBunch ? (
        <primitive ref={plantainRef} object={nodes.DtmfPlantainBunch} {...bindPoi('dtmfPlantains', '🍌 Racimo de Plátanos Verdes Colgando (Clic para acercar)')} />
      ) : null}
      <Suspense fallback={null}>
        <SapoConchoModel onSelectPoi={onSelectPoi} onHoverChange={onHoverChange} getBassEnergy={getBassEnergy} reduced={reduced} />
      </Suspense>
      <pointLight position={[0.5, 3.8, 3.5]} color="#fffbeb" intensity={2.8} distance={15} />
      <pointLight position={[-1.5, 2.2, 3.2]} color="#dcfce7" intensity={1.8} distance={12} />
      <pointLight position={[0.0, 2.6, 0.5]} color="#bef264" intensity={1.6} distance={10} />
    </group>
  );
}
