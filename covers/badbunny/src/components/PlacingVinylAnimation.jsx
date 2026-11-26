import { Suspense, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { SleeveCoverArtMaterial } from './VinylDeckCard.jsx';

export default function PlacingVinylAnimation({ placingState, onFinishPlacing, reduced }) {
  const groupRef = useRef(null);
  const progressRef = useRef(0);

  useFrame((_, delta) => {
    if (!placingState || !groupRef.current) return;
    const duration = reduced ? 0.08 : 1.15;
    progressRef.current = Math.min(1, progressRef.current + Math.min(delta, 0.05) / duration);
    const p = progressRef.current;

    const ease = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;

    const startX = placingState.startX ?? 0.05;
    const endX = -0.22;
    const x = startX + (endX - startX) * ease;

    const startY = 1.55;
    const endY = 0.75;
    const linearY = startY + (endY - startY) * ease;
    const arcLift = Math.sin(ease * Math.PI) * 0.55;
    const y = linearY + arcLift;

    const startZ = 5.55;
    const endZ = 7.5;
    const z = startZ + (endZ - startZ) * ease;

    groupRef.current.position.set(x, y, z);

    const startRotX = -1.15;
    const endRotX = 0.0;
    groupRef.current.rotation.set(startRotX + (endRotX - startRotX) * ease, ease * Math.PI, 0);

    const scale = 0.62 + 0.38 * ease;
    groupRef.current.scale.setScalar(scale);

    if (p >= 1) {
      onFinishPlacing(placingState.albumId);
    }
  });

  if (!placingState) return null;

  return (
    <group ref={groupRef} position={[placingState.startX ?? 0.05, 1.55, 5.55]}>
      <mesh>
        <cylinderGeometry args={[0.92, 0.92, 0.018, 64]} />
        <meshStandardMaterial color="#0b0c10" roughness={0.24} metalness={0.45} />
      </mesh>
      <mesh position={[0, 0.011, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.58, 0.6, 64]} />
        <meshBasicMaterial color="#1f2430" />
      </mesh>
      <mesh position={[0, 0.011, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.76, 0.78, 64]} />
        <meshBasicMaterial color="#1f2430" />
      </mesh>
      <mesh position={[0, 0.012, 0]} rotation={[-Math.PI / 2, Math.PI, 0]}>
        <circleGeometry args={[0.45, 64]} />
        <Suspense fallback={<meshBasicMaterial color="#27272a" />}>
          <SleeveCoverArtMaterial albumId={placingState.albumId} />
        </Suspense>
      </mesh>
      <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.04, 24]} />
        <meshBasicMaterial color="#050811" />
      </mesh>
    </group>
  );
}
