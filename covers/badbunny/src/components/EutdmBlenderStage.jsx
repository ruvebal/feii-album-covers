import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';

export const EUTDM_WORLD_GLB_URL = new URL('../../public/eutdm-world.glb', import.meta.url).href;

export default function EutdmBlenderStage({
  activePoi,
  onSelectPoi,
  onHoverChange,
  getBassEnergy,
  reduced,
}) {
  const { nodes } = useGLTF(EUTDM_WORLD_GLB_URL);
  const truckRef = useRef(null);
  const badBunnyRef = useRef(null);

  useFrame((state) => {
    if (reduced) return;
    const t = state.clock.elapsedTime;
    const bass = getBassEnergy ? getBassEnergy() : 0;
    if (truckRef.current) {
      truckRef.current.position.y = Math.sin(t * 26.0) * 0.004 + bass * 0.025;
      truckRef.current.rotation.z = Math.sin(t * 13.0) * 0.002;
    }
    if (badBunnyRef.current) {
      badBunnyRef.current.position.y = Math.sin(t * 2.4) * 0.012 + bass * 0.035;
      badBunnyRef.current.rotation.y = Math.sin(t * 1.1) * 0.025;
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
      {nodes.EutdmDesertHighway ? (
        <primitive
          object={nodes.EutdmDesertHighway}
          onClick={(e) => {
            e.stopPropagation();
            if (activePoi !== 'overview') onSelectPoi('overview');
          }}
        />
      ) : null}
      {nodes.EutdmPeterbiltTruck ? (
        <primitive ref={truckRef} object={nodes.EutdmPeterbiltTruck} {...bindPoi('eutdmFrontGrille', '🚛 Peterbilt 379 · Parrilla Cromada y Matrícula YHLQMDLG (Clic para acercar)')} />
      ) : null}
      {nodes.EutdmBadBunny ? (
        <primitive ref={badBunnyRef} object={nodes.EutdmBadBunny} {...bindPoi('eutdmBadBunnyHood', '🐰 Bad Bunny sobre el Capó del Camión (Clic para acercar)')} />
      ) : null}
      {nodes.EutdmTelegraphPoles ? (
        <primitive object={nodes.EutdmTelegraphPoles} {...bindPoi('eutdmPolesHighway', '🏜️ Poste Eléctrico, Cables y Autopista del Desierto (Clic para acercar)')} />
      ) : null}
      <pointLight position={[0.0, 2.2, 4.2]} color="#ffd8be" intensity={3.2} distance={14} />
      <pointLight position={[0.0, 0.45, 2.65]} color="#ff8c1a" intensity={2.6} distance={6} />
      <pointLight position={[0.0, 3.8, -4.5]} color="#ff2a00" intensity={5.0} distance={18} />
    </group>
  );
}
