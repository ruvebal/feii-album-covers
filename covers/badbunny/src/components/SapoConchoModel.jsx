import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';

export const SAPO_CONCHO_GLB_URL = new URL('../../public/sapo_concho.glb', import.meta.url).href;

const NOOP_RAYCAST = () => null;

export default function SapoConchoModel({ onSelectPoi, onHoverChange, getBassEnergy, reduced }) {
  const { scene } = useGLTF(SAPO_CONCHO_GLB_URL);
  const sapoRef = useRef(null);

  useEffect(() => {
    scene.traverse((obj) => {
      if (obj.isMesh) {
        obj.raycast = NOOP_RAYCAST;
      }
    });
  }, [scene]);

  useFrame((state) => {
    if (!sapoRef.current || reduced) return;
    const t = state.clock.elapsedTime;
    const bass = getBassEnergy ? getBassEnergy() : 0;
    sapoRef.current.position.y = 0.68 + Math.sin(t * 2.4) * 0.025 + bass * 0.065;
    sapoRef.current.rotation.y = Math.sin(t * 0.9) * 0.1;
  });

  return (
    <group ref={sapoRef} position={[-0.02, 0.68, 1.55]} scale={0.72}>
      <primitive object={scene} />
      <mesh
        onClick={(e) => {
          e.stopPropagation();
          onSelectPoi('dtmfSapoConcho');
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHoverChange?.('🐸 Sapo Concho de DTmF · 3D: AGUAY0 (CC BY 4.0) — Clic para acercar');
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          onHoverChange?.(null);
        }}
      >
        <cylinderGeometry args={[0.5, 0.5, 1.85, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}
