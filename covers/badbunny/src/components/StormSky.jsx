// covers/yhlqmdlg/src/components/StormSky.jsx — Electric Blue Storm Sky & Lightning Bolts.
//
// Recreates the iconic stormy blue sky behind the YHLQMDLG street cover, with:
//   - Deep electric-blue storm dome and turbulent cloud banks
//   - Dynamic lightning flash light that illuminates the street and reacts to bass hits
//   - Jagged 3D lightning bolts arcing from the sparking utility pole across the sky

import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BackSide } from 'three';

export default function StormSky({ activeTrack, thirdEyeActive, getBassEnergy, reduced }) {
  const flashLightRef = useRef(null);
  const boltGroupRef = useRef(null);
  const cloudsRef = useRef(null);

  // Precomputed lightning bolt segments arcing from the upper-left utility pole (-3.45, 4.5, -1.0)
  const boltSegments = useMemo(
    () => [
      { pos: [-2.85, 4.45, -1.15], rot: [0.1, 0.2, -1.15], len: 1.35 },
      { pos: [-1.85, 4.18, -1.25], rot: [-0.15, 0.1, -1.42], len: 1.15 },
      { pos: [-0.95, 3.85, -1.35], rot: [0.2, -0.1, -1.05], len: 1.25 },
      { pos: [-1.75, 3.65, -1.20], rot: [0.15, 0.25, -0.55], len: 0.95 },
      { pos: [1.95, 4.75, -2.35], rot: [-0.1, 0.2, 0.85], len: 1.45 },
      { pos: [2.55, 4.05, -2.25], rot: [0.1, -0.15, 1.15], len: 1.2 },
    ],
    [],
  );

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

    // Stochastic storm lightning flicker + bass trigger
    const stormWave = Math.sin(t * 3.7) * Math.sin(t * 11.3) * Math.cos(t * 23.1);
    const flash = reduced ? 0.35 : Math.max(0, stormWave > 0.58 ? (stormWave - 0.58) * 6.5 : 0) + bass * 1.8;

    if (flashLightRef.current) {
      flashLightRef.current.intensity = 1.6 + flash * 4.5;
    }

    if (boltGroupRef.current && !reduced) {
      const showBolt = flash > 0.45 || thirdEyeActive;
      boltGroupRef.current.visible = showBolt;
      boltGroupRef.current.scale.y = 0.92 + Math.sin(t * 28.0) * 0.08;
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
      <mesh position={[0.2, 3.2, -9.8]}>
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

      {/* 3D Jagged Lightning Bolts Arcing from the Sparking Utility Pole */}
      <group ref={boltGroupRef}>
        {boltSegments.map((seg, idx) => (
          <mesh key={idx} position={seg.pos} rotation={seg.rot}>
            <cylinderGeometry args={[0.028, 0.018, seg.len, 6]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive={idx < 4 ? '#5ce1ff' : activeTrack.hex}
              emissiveIntensity={4.5}
            />
          </mesh>
        ))}
      </group>

      {/* Dynamic Storm Lightning PointLight */}
      <pointLight
        ref={flashLightRef}
        position={[-1.5, 6.2, -2.5]}
        color="#66d9ff"
        intensity={2.4}
        distance={24}
      />
    </group>
  );
}
