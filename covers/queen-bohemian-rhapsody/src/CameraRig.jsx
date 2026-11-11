// CameraRig.jsx — vuelo de cámara basado en el vídeo de referencia (16,5 s).
//
// Dos CatmullRomCurve3 (posición y punto de mira) + tabla de keyframes con tiempos (keys.js).
// getPoint(i / (n - 1)) pasa EXACTAMENTE por el punto i, así que mapeando
// tiempo → (segmento i + progreso local u) controlamos cuándo llega la cámara a cada plano.
// Al terminar (o al saltar la intro) entrega el control al usuario con <CameraControls/>.
//
// - `started = false` (estado idle): OrbitControls alrededor de la funda (arrastrar gira,
//   rueda acerca); el reloj de la intro no avanza. La cámara arranca en IDLE_CAMERA (tres cuartos).
// - Al pasar `started = true` (clic en la funda o «Entrar»): acercamiento de APPROACH s desde
//   donde quedó la órbita hasta la pose MATCH (de frente, cantante centrado).
// - t ∈ [0, FLIGHT_FROM): zoom SOLO de FOV (MATCH.fov → ZOOM_FOV) con la cámara quieta. Sin
//   paralaje, la figura pintada y el Freddie 3D siguen superpuestos mientras la portada se funde
//   (match cut, ver keys.js). t ≥ FLIGHT_FROM: el vuelo arranca desde esa pose ya ampliada.
// - `skip`: salta a la pose final en un frame (botón "Saltar intro", Escape, o
//   prefers-reduced-motion, que nunca reproduce el vuelo).
// - Modo dev (solo `npm run dev`): Espacio pausa · ←/→ scrub ±0,25 s · S salta al final ·
//   P imprime el keyframe actual para pegarlo en keys.js. Se ignoran si el foco está en un
//   control DOM (Espacio sobre «Entrar» no debe arrancar Y pausar a la vez), y en idle
//   solo P hace algo: el reloj sigue clavado en 0 hasta entrar.
// - Sin asignaciones en useFrame: los vectores temporales viven en refs.

import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { CameraControls, OrbitControls } from '@react-three/drei';
import { CatmullRomCurve3, MathUtils, Vector3 } from 'three';
import { APPROACH, FLIGHT_FROM, INTRO_END, KEYS, MATCH, ORBIT_DIST, SLEEVE_CENTER, ZOOM_FOV } from './keys.js';

const smooth = (x) => x * x * (3 - 2 * x);

/**
 * @param {object} props
 * @param {boolean} props.started false = idle en la pose t = 0; true = corre la intro.
 * @param {boolean} props.skip Saltar a la pose final (solo cuenta con `started`).
 * @param {(p: { t: number, tod: number }) => void} [props.onProgress] Cada frame de la intro.
 * @param {() => void} [props.onDone] Una vez, al entregar el control.
 */
export default function CameraRig({ started, skip, onProgress, onDone }) {
  const get = useThree((state) => state.get);
  const controls = useRef(null);
  const [phase, setPhase] = useState('intro'); // 'intro' | 'free'
  const clock = useRef({ t: 0, playing: true, snap: true });
  const tmp = useRef({ pos: new Vector3(), look: new Vector3(), smoothLook: new Vector3(...MATCH.look) });
  // Acercamiento idle → MATCH: desde dónde (capturado en el primer frame) y progreso 0..1.
  const approach = useRef({
    k: 0,
    captured: false,
    fromPos: new Vector3(),
    fromLook: new Vector3(...SLEEVE_CENTER),
    fromFov: MATCH.fov,
    toPos: new Vector3(...MATCH.pos),
    toLook: new Vector3(...MATCH.look),
  });

  const { posCurve, lookCurve } = useMemo(
    () => ({
      posCurve: new CatmullRomCurve3(KEYS.map((k) => new Vector3(...k.pos)), false, 'centripetal'),
      lookCurve: new CatmullRomCurve3(KEYS.map((k) => new Vector3(...k.look)), false, 'centripetal'),
    }),
    [],
  );

  // Herramientas de desarrollo para afinar KEYS (GATE 1).
  useEffect(() => {
    if (!import.meta.env.DEV) return undefined;
    const onKey = (event) => {
      if (event.target instanceof Element && event.target.closest('button, a, input, select, textarea')) return;
      const c = clock.current;
      if (event.code === 'Space') c.playing = !c.playing;
      else if (event.code === 'ArrowRight') c.t += 0.25;
      else if (event.code === 'ArrowLeft') c.t = Math.max(0, c.t - 0.25);
      else if (event.code === 'KeyS') c.t = INTRO_END;
      else if (event.code === 'KeyP') {
        const { camera } = get();
        const d = camera.getWorldDirection(new Vector3());
        const p = camera.position;
        const l = p.clone().addScaledVector(d, 5);
        const f = (n) => n.toFixed(2);
        console.log(
          `{ t: ${c.t.toFixed(1)}, pos: [${f(p.x)}, ${f(p.y)}, ${f(p.z)}], look: [${f(l.x)}, ${f(l.y)}, ${f(l.z)}], fov: ${camera.fov}, tod: 0 },`,
        );
      } else return;
      if (event.code === 'Space' || event.code.startsWith('Arrow')) event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [get]);

  useFrame((state, delta) => {
    if (phase !== 'intro') return;
    const c = clock.current;
    const dt = Math.min(delta, 0.05);
    if (!started) {
      // Idle: la órbita manda; el reloj se queda en 0 (deshace cualquier scrub dev).
      c.t = 0;
      c.snap = true;
      onProgress?.({ t: 0, tod: 0 });
      return;
    }

    // Acercamiento desde la órbita hasta la pose MATCH (sin él, el primer frame daría un salto).
    const ap = approach.current;
    if (ap.k < 1 && !skip) {
      const { camera } = state;
      if (!ap.captured) {
        ap.fromPos.copy(camera.position);
        ap.fromFov = camera.fov;
        ap.captured = true;
      }
      ap.k = Math.min(ap.k + dt / APPROACH, 1);
      const e = smooth(ap.k);
      const { pos, look, smoothLook } = tmp.current;
      pos.lerpVectors(ap.fromPos, ap.toPos, e);
      look.lerpVectors(ap.fromLook, ap.toLook, e);
      camera.position.copy(pos);
      camera.lookAt(look);
      smoothLook.copy(look);
      camera.fov = MathUtils.lerp(ap.fromFov, MATCH.fov, e);
      camera.updateProjectionMatrix();
      onProgress?.({ t: 0, tod: 0 });
      return;
    }
    ap.k = 1;

    if (skip && c.t < INTRO_END) {
      c.t = INTRO_END;
      c.snap = true;
    }
    if (c.playing) c.t += dt;
    const t = Math.min(c.t, INTRO_END);
    const { camera } = state;
    const { pos, look, smoothLook } = tmp.current;

    if (t < FLIGHT_FROM) {
      // Zoom de match cut: posición y mirada fijas en MATCH, solo cambia el FOV (sin paralaje).
      // Acelera hacia el final (ease-in) para enlazar con el arranque del vuelo.
      const z = t / FLIGHT_FROM;
      pos.set(...MATCH.pos);
      smoothLook.set(...MATCH.look);
      camera.position.copy(pos);
      camera.lookAt(smoothLook);
      camera.fov = MathUtils.lerp(MATCH.fov, ZOOM_FOV, z * z * (2 - z));
      camera.updateProjectionMatrix();
      c.snap = false;
      onProgress?.({ t, tod: 0 });
      return;
    }

    // tiempo → segmento i + progreso local u
    let i = 0;
    while (i < KEYS.length - 2 && t > KEYS[i + 1].t) i += 1;
    const a = KEYS[i];
    const b = KEYS[i + 1];
    const u = MathUtils.clamp((t - a.t) / (b.t - a.t), 0, 1);
    const s = (i + u) / (KEYS.length - 1); // parámetro de la curva

    posCurve.getPoint(s, pos);
    lookCurve.getPoint(s, look);

    // Suavizado exponencial: absorbe los cambios de velocidad entre segmentos.
    const k = c.snap ? 1 : 1 - Math.exp(-14 * dt);
    c.snap = false;
    camera.position.lerp(pos, k);
    smoothLook.lerp(look, k);
    camera.lookAt(smoothLook);
    camera.fov = MathUtils.lerp(a.fov, b.fov, smooth(u));
    camera.updateProjectionMatrix();

    onProgress?.({ t, tod: MathUtils.lerp(a.tod, b.tod, smooth(u)) });
    if (c.t >= INTRO_END) {
      setPhase('free');
      onDone?.();
    }
  });

  // Entrega a navegación libre desde la pose final.
  useEffect(() => {
    if (phase !== 'free' || !controls.current) return;
    const { camera } = get();
    const l = tmp.current.smoothLook;
    controls.current.setLookAt(camera.position.x, camera.position.y, camera.position.z, l.x, l.y, l.z, false);
  }, [phase, get]);

  if (!started) {
    // Órbita alrededor de la funda, sin pan (como _studio); target = SLEEVE_CENTER.
    return <OrbitControls makeDefault enablePan={false} target={SLEEVE_CENTER} minDistance={ORBIT_DIST[0]} maxDistance={ORBIT_DIST[1]} />;
  }
  return phase === 'free' ? (
    <CameraControls ref={controls} makeDefault minDistance={0.5} maxDistance={60} maxPolarAngle={Math.PI * 0.55} />
  ) : null;
}
