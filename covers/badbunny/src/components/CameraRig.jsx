// covers/badbunny/src/components/CameraRig.jsx — Interactive Point-of-Interest & 180-Degree Camera Rig.
// Starts facing the Turntable (`CAMERA_POIS.turntable`).
// When no record is placed on the turntable (`!hasRecord`), camera rotation is locked to the
// turntable view so the user cannot turn 180° to any scenario until a vinyl is placed.

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { Vector3 } from 'three';
import { CAMERA_POIS } from '../cameraPois.js';

export default function CameraRig({ activePoi, hasRecord = false, reduced }) {
  const controlsRef = useRef(null);
  const { camera } = useThree();
  const initializedRef = useRef(false);
  const transitionFrames = useRef(0);
  const safePoiKey = hasRecord ? activePoi : 'turntable';
  const initialPoi = CAMERA_POIS[safePoiKey] || CAMERA_POIS.turntable;
  const desiredPosRef = useRef(new Vector3(...initialPoi.position));
  const desiredTargetRef = useRef(new Vector3(...initialPoi.target));

  useEffect(() => {
    const key = hasRecord ? activePoi : 'turntable';
    const poi = CAMERA_POIS[key] || CAMERA_POIS.turntable;
    desiredPosRef.current.set(...poi.position);
    desiredTargetRef.current.set(...poi.target);

    if (!initializedRef.current && controlsRef.current) {
      initializedRef.current = true;
      camera.position.set(...poi.position);
      controlsRef.current.target.set(...poi.target);
      controlsRef.current.update();
      transitionFrames.current = 0;
      return;
    }

    transitionFrames.current = reduced ? 1 : 70;
  }, [activePoi, hasRecord, camera, reduced]);

  useFrame(() => {
    if (transitionFrames.current <= 0) return;
    transitionFrames.current -= 1;

    const alpha = reduced ? 1.0 : 0.1;
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
      enableRotate={hasRecord}
      enableZoom={hasRecord}
      minDistance={1.6}
      maxDistance={14.0}
      minPolarAngle={0.2}
      maxPolarAngle={Math.PI / 2 - 0.02}
    />
  );
}
