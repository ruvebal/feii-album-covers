import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';

export const UVST_WORLD_GLB_URL = new URL('../../public/uvst-world.glb', import.meta.url).href;

export default function UvstBlenderStage({
  activePoi,
  onSelectPoi,
  onHoverChange,
  getBassEnergy,
  reduced,
}) {
  const { nodes } = useGLTF(UVST_WORLD_GLB_URL);
  const heartRef = useRef(null);
  const palmsRef = useRef(null);
  const dolphinsRef = useRef(null);

  useFrame((state) => {
    if (reduced) return;
    const t = state.clock.elapsedTime;
    const bass = getBassEnergy ? getBassEnergy() : 0;
    if (heartRef.current) {
      heartRef.current.position.y = Math.sin(t * 2.2) * 0.025 + bass * 0.055;
      heartRef.current.rotation.z = Math.sin(t * 1.1) * 0.015;
    }
    if (palmsRef.current) {
      palmsRef.current.rotation.z = Math.sin(t * 1.4) * 0.008;
    }
    if (dolphinsRef.current) {
      dolphinsRef.current.position.y = Math.sin(t * 1.8) * 0.035 + bass * 0.04;
      dolphinsRef.current.rotation.z = Math.cos(t * 1.8) * 0.015;
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
      {nodes.UvstBeachSunset ? (
        <primitive
          object={nodes.UvstBeachSunset}
          onClick={(e) => {
            e.stopPropagation();
            if (activePoi !== 'overview') onSelectPoi('overview');
          }}
        />
      ) : null}
      {nodes.UvstSadHeart ? (
        <primitive ref={heartRef} object={nodes.UvstSadHeart} {...bindPoi('uvstSadHeart', '❤️ Corazón Triste de Un Verano Sin Ti (Clic para acercar)')} />
      ) : null}
      {nodes.UvstPalmTrees ? (
        <primitive ref={palmsRef} object={nodes.UvstPalmTrees} {...bindPoi('uvstPalmsBeach', '🌴 Palmeras Cocoteras y Dunas Doradas (Clic para acercar)')} />
      ) : null}
      {nodes.UvstDolphins ? (
        <primitive ref={dolphinsRef} object={nodes.UvstDolphins} {...bindPoi('uvstDolphinsSun', '🐬 Delfines Saltando y Sol con Gaviotas (Clic para acercar)')} />
      ) : null}
      <pointLight position={[0.0, 3.2, 4.0]} color="#fff7ed" intensity={2.4} distance={16} />
      <pointLight position={[1.5, 3.5, -2.5]} color="#fde047" intensity={2.8} distance={16} />
    </group>
  );
}
