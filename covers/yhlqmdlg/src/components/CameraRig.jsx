// covers/yhlqmdlg/src/components/CameraRig.jsx — Interactive Point-of-Interest & 180-Degree Camera Rig.

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Vector3 } from 'three';
import { CAMERA_POIS } from '../cameraPois.js';

export default function CameraRig({ activePoi, reduced }) {
  const controlsRef = useRef(null);
  const { camera } = useThree();
  const transitionFrames = useRef(0);
  const desiredPosRef = useRef(new Vector3(...CAMERA_POIS.overview.position));
  const desiredTargetRef = useRef(new Vector3(...CAMERA_POIS.overview.target));

  useEffect(() => {
    const poi = CAMERA_POIS[activePoi] || CAMERA_POIS.overview;
    desiredPosRef.current.set(...poi.position);
    desiredTargetRef.current.set(...poi.target);
    transitionFrames.current = reduced ? 1 : 65;
  }, [activePoi, reduced]);

  useFrame(() => {
    if (transitionFrames.current <= 0) return;
    transitionFrames.current -= 1;

    const alpha = reduced ? 1.0 : 0.11;
    camera.position.lerp(desiredPosRef.current, alpha);
    if (controlsRef.current) {
      controlsRef.current.target.lerp(desiredTargetRef.current, alpha);
      controlsRef.current.update();
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      minDistance={1.6}
      maxDistance={14.0}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI / 2 - 0.02}
      target={CAMERA_POIS.overview.target}
    />
  );
}
