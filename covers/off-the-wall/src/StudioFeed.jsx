// Imágenes hechas dentro del propio plató (1982, Thriller):
//  - El monitor: enseña la portada original de Thriller, que se pide a Apple
//    Music al entrar (como las fundas del tocadiscos; se enlaza, no se guarda
//    en el repositorio). Mientras llega, o si no hay conexión, enseña en
//    directo lo que graba la cámara del trípode.
//  - Las Polaroid de prueba de la mesa: seis fotos de Michael desde distintos
//    ángulos, hechas con cámaras propias; se revelan al llegar al plató y se
//    vuelven a hacer cada vez que se hace una foto.
// Las Polaroid son imagen de la escena 3D.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { loadCover } from './covers.js';
import {
  BoxGeometry,
  Texture,
  CylinderGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  SRGBColorSpace,
  SphereGeometry,
  WebGLRenderTarget,
} from 'three';

const LITE = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse), (max-width: 720px)').matches;

/** Monitor junto a la cámara del trípode (mismo sitio que en 1979). */
const MONITOR = { position: [-0.95, 0, 4.25], rotY: -0.73, screen: 0.62 };
/** La cámara del trípode (Studio.jsx) y hacia dónde mira: Michael sentado. */
// La cámara virtual va justo delante del objetivo (dentro del cuerpo de la
// cámara solo se vería su interior).
const TRIPOD = { position: [0.84, 1.05, 3.62], target: [0.0, 0.6, 0.1] };

/** Las seis Polaroid: desde dónde se hace cada foto y a qué mira. */
const SHOTS = [
  { position: [0, 0.65, 3.4], target: [0, 0.55, 0], fov: 34 },
  { position: [0.35, 0.95, 1.7], target: [0.15, 0.85, 0], fov: 30 },
  { position: [-1.6, 0.8, 2.4], target: [0.05, 0.6, 0], fov: 32 },
  { position: [1.8, 0.9, 2.2], target: [0.05, 0.6, 0], fov: 32 },
  { position: [0.3, 1.05, 1.0], target: [0.12, 0.95, 0], fov: 28 },
  { position: [-0.4, 0.5, 2.6], target: [-0.5, 0.25, 0.4], fov: 34 },
];
const CELL = 256;

/** Dónde está cada Polaroid en la mesa (la mesa está en ThrillerSet.jsx). */
function polaroidSpot(i) {
  return {
    x: 1.38 + (i % 3) * 0.12,
    z: 4.3 + Math.floor(i / 3) * 0.16,
    r: Math.sin(i * 7.1) * 0.5 - 0.2,
  };
}

/** Plano de la foto `i` con las coordenadas de su casilla del atlas (3 x 2). */
function photoGeometry(i) {
  const g = new PlaneGeometry(0.078, 0.078);
  const uv = g.attributes.uv;
  const cx = i % 3;
  const cy = 1 - Math.floor(i / 3);
  for (let k = 0; k < uv.count; k += 1) uv.setXY(k, (cx + uv.getX(k)) / 3, (cy + uv.getY(k)) / 2);
  return g;
}

/** Pone la portada en la pantalla del monitor (y deja de pintar el directo). */
function showCover(res, texture) {
  res.cover = texture;
  res.mats.screen.map = texture;
  res.mats.screen.needsUpdate = true;
}

/**
 * Hace las seis fotos de las Polaroid, cada una en su casilla del atlas. Con
 * el recorte activado, borrar una casilla no borra las demás.
 */
function renderPolaroids(gl, scene, atlas, shot) {
  atlas.scissorTest = true;
  SHOTS.forEach((s, i) => {
    const x = (i % 3) * CELL;
    const y = (1 - Math.floor(i / 3)) * CELL;
    shot.fov = s.fov;
    shot.aspect = 1;
    shot.position.set(...s.position);
    shot.lookAt(...s.target);
    shot.updateProjectionMatrix();
    atlas.viewport.set(x, y, CELL, CELL);
    atlas.scissor.set(x, y, CELL, CELL);
    gl.setRenderTarget(atlas);
    gl.render(scene, shot);
  });
  atlas.scissorTest = false;
  atlas.viewport.set(0, 0, CELL * 3, CELL * 2);
  atlas.scissor.set(0, 0, CELL * 3, CELL * 2);
}

/**
 * @param {{ flash: number | null, reduced: boolean }} props
 */
export default function StudioFeed({ flash }) {
  const res = useMemo(() => {
    const live = new WebGLRenderTarget(512, 512);
    live.texture.colorSpace = SRGBColorSpace;
    const atlas = new WebGLRenderTarget(CELL * 3, CELL * 2);
    atlas.texture.colorSpace = SRGBColorSpace;
    const tripod = new PerspectiveCamera(30, 1, 0.05, 30);
    tripod.position.set(...TRIPOD.position);
    tripod.lookAt(...TRIPOD.target);
    return {
      live,
      atlas,
      tripod,
      shot: new PerspectiveCamera(32, 1, 0.05, 30),
      mats: {
        screen: new MeshBasicMaterial({ map: live.texture, toneMapped: false }),
        // Las fotos, un poco más cálidas y apagadas, como una Polaroid.
        photo: new MeshBasicMaterial({ map: atlas.texture, color: '#f2e4cc', toneMapped: false }),
        body: new MeshStandardMaterial({ color: '#18181b', roughness: 0.5, metalness: 0.4 }),
        rec: new MeshBasicMaterial({ color: '#ff2a1f', toneMapped: false }),
      },
      geo: {
        screen: new PlaneGeometry(MONITOR.screen, MONITOR.screen),
        case: new BoxGeometry(MONITOR.screen + 0.06, MONITOR.screen + 0.06, 0.07),
        pole: new CylinderGeometry(0.018, 0.022, 1.0, 10),
        foot: new CylinderGeometry(0.22, 0.24, 0.03, 20),
        dot: new SphereGeometry(0.014, 10, 8),
        photos: Array.from({ length: SHOTS.length }, (_, i) => photoGeometry(i)),
      },
    };
  }, []);
  useEffect(
    () => () => {
      res.live.dispose();
      res.cover?.dispose();
      res.atlas.dispose();
      Object.values(res.mats).forEach((m) => m.dispose());
      Object.values(res.geo).flat().forEach((g) => g.dispose());
    },
    [res],
  );

  // La portada original para el monitor, en cuanto llega.
  useEffect(() => {
    let alive = true;
    loadCover('thriller').then((img) => {
      if (!alive || !img) return;
      const t = new Texture(img);
      t.colorSpace = SRGBColorSpace;
      t.needsUpdate = true;
      showCover(res, t);
    });
    return () => {
      alive = false;
    };
  }, [res]);

  const screen = useRef(null);
  const photos = useRef(null);
  const dot = useRef(null);
  const tick = useRef(0);
  // Cuándo hay que revelar las Polaroid: al llegar (cuando Michael ya se ha
  // sentado) y un momento después de cada foto.
  const develop = useRef(/** @type {number | null} */ (null));
  useEffect(() => {
    develop.current = performance.now() / 1000 + 3.5;
  }, []);
  useEffect(() => {
    if (flash !== null) develop.current = performance.now() / 1000 + 0.9;
  }, [flash]);

  useFrame(({ gl, scene, clock }) => {
    if (dot.current) dot.current.visible = clock.elapsedTime % 1 < 0.6;
    tick.current += 1;
    const doLive = !res.cover && tick.current % (LITE ? 15 : 6) === 0;
    const doPhotos = develop.current !== null && performance.now() / 1000 > develop.current;
    if (!doLive && !doPhotos) return;
    // Mientras se pinta para el monitor o las fotos, el propio monitor y las
    // fotos no salen (si no, se verían a sí mismos).
    if (screen.current) screen.current.visible = false;
    if (photos.current) photos.current.visible = false;
    const prev = gl.getRenderTarget();
    if (doLive) {
      gl.setRenderTarget(res.live);
      gl.render(scene, res.tripod);
    }
    if (doPhotos) {
      develop.current = null;
      renderPolaroids(gl, scene, res.atlas, res.shot);
    }
    gl.setRenderTarget(prev);
    if (screen.current) screen.current.visible = true;
    if (photos.current) photos.current.visible = true;
  });

  return (
    <group>
      {/* El monitor, en el mismo sitio que en 1979, ahora en directo. */}
      <group position={MONITOR.position} rotation={[0, MONITOR.rotY, 0]}>
        <mesh geometry={res.geo.foot} material={res.mats.body} position={[0, 0.015, 0]} />
        <mesh geometry={res.geo.pole} material={res.mats.body} position={[0, 0.5, 0]} />
        <group position={[0, 1.32, 0]} rotation={[-0.06, 0, 0]}>
          <mesh geometry={res.geo.case} material={res.mats.body} position={[0, 0, -0.04]} />
          <mesh ref={screen} geometry={res.geo.screen} material={res.mats.screen} />
          <mesh ref={dot} geometry={res.geo.dot} material={res.mats.rec} position={[-MONITOR.screen / 2 + 0.035, MONITOR.screen / 2 + 0.012, 0.001]} />
        </group>
      </group>
      {/* Las fotos de las Polaroid, encima de sus marcos blancos. */}
      <group ref={photos}>
        {res.geo.photos.map((g, i) => {
          const p = polaroidSpot(i);
          return <mesh key={i} geometry={g} material={res.mats.photo} position={[p.x, 0.7405, p.z - 0.008]} rotation={[-Math.PI / 2, 0, p.r]} />;
        })}
      </group>
    </group>
  );
}
