// Monitor de plató: muestra la imagen de la portada con un piloto rojo.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import {
  BoxGeometry,
  CylinderGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  SphereGeometry,
} from 'three';

const COVER_URL = new URL('../public/monitor-cover.jpg', import.meta.url).href;
const SCREEN = 0.62;
// Junto a la cámara del trípode, fuera del encuadre de la portada y girado
// hacia quien mira el plató (sin tapar a Michael desde ninguna vista).
const POSITION = [-0.95, 0, 4.25];
const ROT_Y = -0.73;

export default function LiveMonitor() {
  const texture = useTexture(COVER_URL, (image) => {
    image.colorSpace = SRGBColorSpace;
  });
  const res = useMemo(() => {
    return {
      screenMat: new MeshBasicMaterial({ map: texture, toneMapped: false }),
      body: new MeshStandardMaterial({ color: '#18181b', roughness: 0.5, metalness: 0.4 }),
      rec: new MeshBasicMaterial({ color: '#ff2a1f', toneMapped: false }),
      geo: {
        screen: new PlaneGeometry(SCREEN, SCREEN),
        case: new BoxGeometry(SCREEN + 0.06, SCREEN + 0.06, 0.07),
        pole: new CylinderGeometry(0.018, 0.022, 1.0, 10),
        foot: new CylinderGeometry(0.22, 0.24, 0.03, 20),
        dot: new SphereGeometry(0.014, 10, 8),
      },
    };
  }, [texture]);
  useEffect(
    () => () => {
      res.screenMat.dispose();
      res.body.dispose();
      res.rec.dispose();
      Object.values(res.geo).forEach((g) => g.dispose());
    },
    [res],
  );

  const dot = useRef(/** @type {import('three').Mesh | null} */ (null));
  useFrame(({ clock }) => {
    // Piloto de grabación: parpadea una vez por segundo.
    if (dot.current) dot.current.visible = clock.elapsedTime % 1 < 0.6;
  });

  return (
    <group position={POSITION} rotation={[0, ROT_Y, 0]}>
      <mesh geometry={res.geo.foot} material={res.body} position={[0, 0.015, 0]} />
      <mesh geometry={res.geo.pole} material={res.body} position={[0, 0.5, 0]} />
      <group position={[0, 1.32, 0]} rotation={[-0.06, 0, 0]}>
        <mesh geometry={res.geo.case} material={res.body} position={[0, 0, -0.04]} />
        <mesh geometry={res.geo.screen} material={res.screenMat} />
        {/* Piloto "REC" en la esquina del marco. */}
        <mesh ref={dot} geometry={res.geo.dot} material={res.rec} position={[-SCREEN / 2 + 0.035, SCREEN / 2 + 0.012, 0.001]} />
      </group>
    </group>
  );
}
