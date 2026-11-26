// CoverPortal.jsx — el disco en su funda, flotando en el vacío negro (idle y t = 0–2,7 s).
//
// Como en covers/_studio (solo referencia, código propio): una funda de cartón (caja fina) con
// la portada impresa delante y detrás, y el vinilo asomando por un lado. La imagen sale de
// sleeveArt.js (procedural propia, o public/sleeve.png si la activas allí).
//
// Idle (antes de entrar): el usuario orbita con arrastre (OrbitControls en CameraRig); la funda
// se balancea suave y el disco entra y sale un poco. Con prefers-reduced-motion no hay ni
// balanceo ni disco deslizándose. La amplitud se apaga al empezar la intro, así que la cámara
// atraviesa la funda en reposo. Un CLIC (R3F solo lo dispara si el puntero se movió ≤ 2 px:
// arrastrar para orbitar no cuenta) = entrar. Hover → la ruta pone cursor pointer y la funda
// crece un 3 %.
// Se desvanece entre PORTAL_FADE[0] y PORTAL_FADE[1] y luego se oculta (luces incluidas: el
// mundo trae las suyas). Sin asignaciones en useFrame.
//
// Match cut (keys.js): tamaño y posición de la funda se CALCULAN para que la figura pintada
// tape exactamente al Freddie 3D desde la pose MATCH. Las medidas de abajo están en «unidades de
// diseño» (funda de 3) y el grupo se escala a SLEEVE_SIZE. Al entrar aparece un telón negro detrás
// de la funda que se funde con ella: así el vacío negro que la rodea también se convierte en el
// estadio a la vez, en vez de saltar de golpe. En idle el telón no existe (se puede orbitar).

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BoxGeometry, CylinderGeometry, DoubleSide, MathUtils } from 'three';
import { PORTAL_FADE, SLEEVE_CENTER, SLEEVE_SIZE, VIEW_DIR } from './keys.js';
import { useSleeveTexture } from './sleeveArt.js';

const W = 3; // lado de la funda en unidades de diseño
const SCALE = SLEEVE_SIZE / W; // → metros
const D = 0.04; // grosor
const DISC_R = 1.38;
const DISC_REST_X = 0.55; // el disco asoma por el borde +X local
// La cara +Z local (portada) mira a la cámara MATCH: girada 180° si la cámara mira a +Z.
const REST_ROT_Y = VIEW_DIR > 0 ? Math.PI : 0;
const [SX, SY, SZ] = SLEEVE_CENTER;

/**
 * Opacidad de todos los materiales bajo `object` (recursivo, sin cierres ni arrays nuevos por frame).
 *
 * @param {import('three').Object3D} object
 * @param {number} value
 */
function setOpacity(object, value) {
  const { material } = /** @type {any} */ (object);
  if (Array.isArray(material)) for (let i = 0; i < material.length; i += 1) material[i].opacity = value;
  else if (material) material.opacity = value;
  for (let i = 0; i < object.children.length; i += 1) setOpacity(object.children[i], value);
}

/**
 * @param {object} props
 * @param {import('react').RefObject<{ t: number }>} props.progress Reloj de la intro (lo escribe CameraRig).
 * @param {boolean} props.idle Antes de entrar: balanceo + clic activo.
 * @param {boolean} props.reduced prefers-reduced-motion: sin movimiento propio.
 * @param {() => void} props.onEnter Clic sobre el disco o la funda.
 * @param {(hovered: boolean) => void} props.onHover
 */
export default function CoverPortal({ progress, idle, reduced, onEnter, onHover }) {
  const root = useRef(null);
  const disc = useRef(null);
  const lights = useRef(null);
  const backdrop = useRef(null);
  const anim = useRef({ time: 0, amp: 0, hover: 0, hovered: false });
  const texture = useSleeveTexture();

  const geo = useMemo(
    () => ({
      sleeve: new BoxGeometry(W, W, D),
      disc: new CylinderGeometry(DISC_R, DISC_R, 0.012, 96),
      label: new CylinderGeometry(0.46, 0.46, 0.014, 48),
    }),
    [],
  );
  useEffect(() => () => Object.values(geo).forEach((g) => g.dispose()), [geo]);


  useFrame((_, delta) => {
    const g = root.current;
    if (!g) return;
    const dt = Math.min(delta, 0.05);
    const a = anim.current;

    // Balanceo idle + disco deslizándose; amplitud con decaimiento exponencial.
    const target = idle && !reduced ? 1 : 0;
    a.amp = reduced ? 0 : a.amp + (target - a.amp) * (1 - Math.exp(-4 * dt));
    if (a.amp > 0.001) a.time += dt;
    g.position.y = SLEEVE_CENTER[1] + 0.06 * SCALE * a.amp * Math.sin(a.time * 1.3);
    g.rotation.y = REST_ROT_Y + 0.07 * a.amp * Math.sin(a.time * 0.7);
    g.rotation.z = 0.025 * a.amp * Math.sin(a.time * 0.9 + 1.2);
    if (disc.current) disc.current.position.x = DISC_REST_X + 0.3 * a.amp * (0.5 + 0.5 * Math.sin(a.time * 0.8));

    // Hover: escala suave (también sin movimiento reducido es feedback, no animación continua).
    a.hover += ((idle && a.hovered ? 1 : 0) - a.hover) * (reduced ? 1 : 1 - Math.exp(-10 * dt));
    g.scale.setScalar(SCALE * (1 + 0.03 * a.hover));

    // Fundido al atravesar.
    const [from, to] = PORTAL_FADE;
    const fade = MathUtils.clamp((progress.current.t - from) / (to - from), 0, 1);
    setOpacity(g, 1 - fade);
    g.visible = fade < 1;
    if (lights.current) lights.current.visible = fade < 1;
    if (backdrop.current) {
      backdrop.current.visible = !idle && fade < 1;
      backdrop.current.material.opacity = 1 - fade;
    }
  });

  const setHovered = (value) => {
    anim.current.hovered = value;
    onHover(value);
  };

  return (
    <>
      {/* Luz propia de la funda: el mundo (y sus luces) está oculto hasta WORLD_FROM. */}
      <group ref={lights}>
        <ambientLight intensity={0.55} color="#ffe2c4" />
        {/* Principal desde el lado de la cámara, arriba; relleno violeta desde detrás de la funda. */}
        <directionalLight position={[SX - 3 * VIEW_DIR, SY + 5, SZ - 8 * VIEW_DIR]} intensity={2.4} color="#fff1dc" />
        <directionalLight position={[SX + 4 * VIEW_DIR, SY - 1, SZ + 8 * VIEW_DIR]} intensity={0.6} color="#b07cff" />
      </group>

      {/* Telón negro (fuera del grupo con eventos): 1 m detrás de la funda, cubre todo el encuadre.
          Mira a la cámara: girado igual que la funda. */}
      <mesh
        ref={backdrop}
        position={[SX, SY, SZ + VIEW_DIR]}
        visible={false}
        renderOrder={-1}
      >
        <planeGeometry args={[60, 60]} />
        <meshBasicMaterial color="#000000" transparent depthWrite={false} toneMapped={false} side={DoubleSide} />
      </mesh>

      <group
        ref={root}
        name="CoverPortal"
        position={SLEEVE_CENTER}
        rotation={[0, REST_ROT_Y, 0]}
        scale={SCALE}
        onClick={(event) => {
          if (!idle) return;
          event.stopPropagation();
          onEnter();
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          setHovered(true);
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          setHovered(false);
        }}
      >
        {/* Funda: caras de BoxGeometry en orden +X, −X, +Y, −Y, +Z (delante), −Z (detrás). */}
        <mesh geometry={geo.sleeve}>
          <meshStandardMaterial attach="material-0" color="#d8c8b0" roughness={0.9} transparent />
          <meshStandardMaterial attach="material-1" color="#d8c8b0" roughness={0.9} transparent />
          <meshStandardMaterial attach="material-2" color="#d8c8b0" roughness={0.9} transparent />
          <meshStandardMaterial attach="material-3" color="#d8c8b0" roughness={0.9} transparent />
          <meshStandardMaterial attach="material-4" map={texture} roughness={0.7} transparent />
          {/* Trasera: la misma imagen, apagada, como el reverso impreso de una funda. */}
          <meshStandardMaterial attach="material-5" map={texture} color="#7d6f68" roughness={0.85} transparent />
        </mesh>

        {/* Vinilo dentro del grosor de la funda; asoma por el borde +X local. */}
        <group ref={disc} position={[DISC_REST_X, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <mesh geometry={geo.disc}>
            <meshStandardMaterial color="#0d0b0e" metalness={0.25} roughness={0.32} transparent />
          </mesh>
          <mesh geometry={geo.label}>
            <meshStandardMaterial color="#b8323d" roughness={0.8} transparent />
          </mesh>
        </group>
      </group>
    </>
  );
}
