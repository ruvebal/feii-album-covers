// covers/badbunny/src/components/StormSky.jsx — Storm sky dome and cloud clusters for YHLQMDLG.

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BackSide } from 'three';

export default function StormSky({ getBassEnergy, reduced }) {
  const flashLightRef = useRef(null);
  const cloudsRef = useRef(null);

  // Volumetric storm cloud clusters in the upper blue sky
  const cloudPuffs = useMemo(
    () => [
      { pos: [-4.5, 5.2, -7.5], scale: [4.2, 1.8, 2.2], color: '#0c3b6e' },
      { pos: [-0.8, 5.8, -8.2], scale: [5.0, 2.2, 2.4], color: '#13569e' },
      { pos: [3.6, 5.0, -7.8], scale: [4.5, 1.9, 2.2], color: '#0e4888' },
      { pos: [0.5, 3.8, -9.0], scale: [6.2, 2.1, 2.0], color: '#1b72c4' },
      { pos: [-3.2, 3.5, -8.5], scale: [3.8, 1.6, 1.8], color: '#0a2d57' },
    ],
    [],
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const bass = reduced ? 0 : getBassEnergy ? getBassEnergy() : 0;

    if (flashLightRef.current) {
      flashLightRef.current.intensity = 2.0 + bass * 2.5;
    }

    if (cloudsRef.current && !reduced) {
      cloudsRef.current.position.x = Math.sin(t * 0.18) * 0.45;
    }
  });

  return (
    <group>
      {/* Enclosing Electric Blue Storm Sky Dome */}
      <mesh position={[0, 1.5, 0]}>
        <sphereGeometry args={[22, 28, 20]} />
        <meshBasicMaterial color="#071e3d" side={BackSide} />
      </mesh>

      {/* Glowing Cyan/Blue Horizon Backdrop behind the street (just like the album cover) */}
      <mesh position={[0, 3.6, -11.5]}>
        <planeGeometry args={[28, 13]} />
        <meshBasicMaterial color="#0d4b8c" />
      </mesh>

      {/* Bright Cyan Storm Core behind the boy's head */}
      <mesh position={[0, 3.2, -9.8]}>
        <circleGeometry args={[5.2, 32]} />
        <meshBasicMaterial color="#248ce0" />
      </mesh>

      {/* Storm Cloud Clusters */}
      <group ref={cloudsRef}>
        {cloudPuffs.map((puff, i) => (
          <mesh key={i} position={puff.pos} scale={puff.scale}>
            <sphereGeometry args={[1.0, 14, 12]} />
            <meshStandardMaterial
              color={puff.color}
              emissive="#125ca8"
              emissiveIntensity={0.45}
              roughness={0.95}
            />
          </mesh>
        ))}
      </group>

      {/* Storm Fill PointLight */}
      <pointLight
        ref={flashLightRef}
        position={[-1.5, 6.2, -2.5]}
        color="#66d9ff"
        intensity={2.2}
        distance={24}
      />
    </group>
  );
}
