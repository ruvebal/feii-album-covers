// Espejo de pie detrás de las cámaras, a la espalda de quien mira la portada:
// solo aparece si se gira la cámara o se camina hacia atrás. Refleja el plató
// en directo (Michael, la pared, las luces) y, al pulsarlo, abre el disco en
// Spotify. Refleja la escena propia; no lleva ninguna foto de la portada.
//
// Rendimiento: el reflejo (Reflector de three) es una segunda pasada de render
// a una textura de 512 px que solo se hace cuando el espejo está a la vista.
// En pantallas pequeñas o táctiles se pinta una sola vez (reflejo fijo).

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import { BoxGeometry, CylinderGeometry, MeshStandardMaterial, PlaneGeometry } from 'three';
import { SPOTIFY_URL } from './spotify.js';

const W = 0.78;
const H = 1.45;
// Detrás de las cámaras y a un lado, girado hacia Michael. Va fuera de la línea
// de la portada: en un móvil vertical esa cámara se aleja hasta unos 10,5 m y
// un espejo en el centro la taparía.
const POS = [2.6, 0, 6.4];
const FACE = Math.atan2(-POS[0], -POS[2]);
const TILT = -0.04;

/** @param {{ onHover: (on: boolean, name?: string) => void }} props */
export default function SpotifyMirror({ onHover, lang }) {
  const res = useMemo(() => {
    const glass = new Reflector(new PlaneGeometry(W, H), {
      textureWidth: 512,
      textureHeight: Math.round((512 * H) / W),
      color: 0xb8c4c2,
      clipBias: 0.003,
      multisample: 0,
    });
    return {
      glass,
      frame: new BoxGeometry(W + 0.09, H + 0.09, 0.04),
      leg: new CylinderGeometry(0.02, 0.024, 0.75, 10),
      // Marco dorado de espejo de camerino.
      gold: new MeshStandardMaterial({ color: '#b08a3e', roughness: 0.35, metalness: 0.9 }),
    };
  }, []);
  useEffect(
    () => () => {
      res.glass.getRenderTarget().dispose();
      res.glass.geometry.dispose();
      res.glass.material.dispose();
      res.frame.dispose();
      res.leg.dispose();
      res.gold.dispose();
    },
    [res],
  );

  // En móvil, un solo reflejo: tras la primera pintada se apaga el render del espejo.
  const live = useRef(window.matchMedia('(pointer: fine) and (min-width: 721px)').matches);
  const frames = useRef(0);
  const holder = useRef(/** @type {import('three').Group | null} */ (null));
  useFrame(() => {
    frames.current += 1;
    const g = holder.current;
    if (live.current || frames.current !== 3 || !g) return;
    const mirror = g.children.find((c) => c.isReflector);
    if (mirror) mirror.onBeforeRender = () => {};
  });

  const open = (e) => {
    e.stopPropagation();
    window.open(SPOTIFY_URL, '_blank', 'noopener,noreferrer');
  };

  return (
    // Girado para que el cristal mire hacia Michael.
    <group position={POS} rotation={[0, FACE, 0]}>
      {/* Dos patas de espejo de pie. */}
      {[-1, 1].map((s) => (
        <mesh key={s} geometry={res.leg} material={res.gold} position={[s * (W / 2 - 0.04), 0.37, -0.06]} rotation={[0.08, 0, 0]} />
      ))}
      <group
        ref={holder}
        position={[0, 0.72 + H / 2, 0]}
        rotation={[TILT, 0, 0]}
        onClick={open}
        onPointerOver={(e) => {
          e.stopPropagation();
          onHover(true, lang === 'en' ? 'Mirror · opens the album on Spotify' : 'Espejo · abre el disco en Spotify');
        }}
        onPointerOut={() => onHover(false)}
      >
        <mesh geometry={res.frame} material={res.gold} position={[0, 0, -0.015]} />
        <primitive object={res.glass} position={[0, 0, 0.007]} />
      </group>
    </group>
  );
}
