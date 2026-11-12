// Cámara de la ruta: girar con el ratón o el dedo (OrbitControls), zoom hacia
// el cursor con la rueda o el pellizco, caminar con WASD o las flechas (con
// Mayúsculas se corre), subir y bajar con Q y E, acercarse con + y −, y
// viajar a las vistas con nombre de set.js. La cruceta táctil y los botones
// de zoom del panel mandan las mismas teclas (eventos `otw-key` / `otw-zoom`).
// Nunca se atraviesa la pared ni a Michael. Avisa (onZone) solo cuando cambia
// la zona desde la que se mira: delante, de lado o por detrás.

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { CatmullRomCurve3, Vector3 } from 'three';
import { BOUNDS, COLLIDERS, MICHAEL, VIEWS, coverPosition, fovFor } from './set.js';

const WALK_SPEED = 2.0; // metros por segundo
const RUN = 2.6; // multiplicador con Mayúsculas
const LIFT_SPEED = 1.1; // subir y bajar, metros por segundo
// Cuánto acerca o aleja cada pulsación de zoom (fracción de la distancia).
const ZOOM_STEP = 0.18;
// El punto al que se mira puede acercarse a la pared, pero no cruzarla.
const WALL_LIMIT = BOUNDS.minZ - 0.2;
// Altura máxima del punto al que se mira (las paredes del estudio miden 4,6 m).
const LOOK_MAX = 4.2;
const KEYS = {
  KeyW: 'f', ArrowUp: 'f',
  KeyS: 'b', ArrowDown: 'b',
  KeyA: 'l', ArrowLeft: 'l',
  KeyD: 'r', ArrowRight: 'r',
  KeyE: 'u',
  KeyQ: 'd',
};

/**
 * Zona según el ángulo entre la cámara y el frente de Michael. Para ser la
 * portada, además, la cámara tiene que mirar hacia la pared (si mira a un lado
 * del plató, por ejemplo al cuadro de los Jackson 5, no lo es).
 */
function zoneOf(cam, target) {
  const dx = cam.x - MICHAEL.x;
  const dz = cam.z - MICHAEL.z;
  const angle = Math.abs((Math.atan2(dx, dz) * 180) / Math.PI);
  if (angle > 115) return 'behind';
  if (angle > 55) return 'side';
  const lx = target.x - cam.x;
  const lz = target.z - cam.z;
  const facing = -lz / (Math.hypot(lx, lz) || 1) > 0.9;
  if (angle < 14 && dz > 3.4 && facing) return 'cover';
  return 'front';
}

/**
 * Si la cámara está en el rincón del tocadiscos y del cuadro de los Jackson 5:
 * cerca de la mesa y mirando hacia ella (solo ahí sale el menú del tocadiscos).
 */
function nearDeck(cam, target) {
  const [dx, , dz] = VIEWS.deck.target;
  const tx = dx - cam.x;
  const tz = dz - cam.z;
  const dist = Math.hypot(tx, tz);
  if (dist > 2.45) return false;
  const lx = target.x - cam.x;
  const lz = target.z - cam.z;
  return (lx * tx + lz * tz) / ((Math.hypot(lx, lz) || 1) * (dist || 1)) > 0.62;
}

/**
 * @param {{
 *   view: { name: string, at: number } | null,
 *   reduced: boolean,
 *   onZone: (zone: string) => void,
 *   onDeck?: (near: boolean) => void,
 * }} props
 */
export default function CameraRig({ view, reduced, onZone, onDeck }) {
  const atDeck = useRef(false);
  const controls = useRef(null);
  const size = useThree((s) => s.size);
  const goal = useRef(null);
  const tour = useRef(null);
  const pressed = useRef(new Set());
  const zone = useRef('');
  const running = useRef(false);
  // Zoom pendiente de los botones o de + y −: se aplica suave en useFrame.
  const zoom = useRef(0);
  // Punto del suelo al que se ha pedido caminar (pulsando en él).
  const walkTo = useRef(/** @type {Vector3 | null} */ (null));
  // Vectores reutilizados: nada se crea dentro de useFrame.
  const tmp = useRef({ fwd: new Vector3(), right: new Vector3(), move: new Vector3(), up: new Vector3(0, 1, 0), vel: new Vector3(), want: new Vector3() });

  // Al pedir una vista, se fija el destino; useFrame hace el viaje.
  useEffect(() => {
    if (!view) return;
    const v = VIEWS[view.name];
    // La portada depende del tamaño de la pantalla (encuadre cuadrado).
    const pos = view.name === 'cover' ? coverPosition(size.width, size.height) : v.position;
    goal.current = { position: new Vector3(...pos), target: new Vector3(...v.target) };
    // Solo al pedir otra vista: un cambio de tamaño no debe mover la cámara.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view]);

  // Teclado para caminar. Se ignora si se escribe en un campo o hay modificadores.
  useEffect(() => {
    const down = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      running.current = e.shiftKey;
      if (e.key === '+' || e.code === 'NumpadAdd') zoom.current += 1;
      if (e.key === '-' || e.code === 'NumpadSubtract') zoom.current -= 1;
      const dir = KEYS[e.code];
      if (!dir) return;
      // Las flechas no deben desplazar la página mientras se camina.
      e.preventDefault();
      pressed.current.add(dir);
      goal.current = null;
    };
    const up = (e) => {
      running.current = e.shiftKey;
      const dir = KEYS[e.code];
      if (dir) pressed.current.delete(dir);
    };
    const clear = () => pressed.current.clear();
    // Cruceta táctil: { dir, on } con las mismas direcciones que el teclado.
    const pad = (e) => {
      if (e.detail.on) {
        pressed.current.add(e.detail.dir);
        goal.current = null;
      } else pressed.current.delete(e.detail.dir);
    };
    const zoomBtn = (e) => {
      zoom.current += e.detail;
      goal.current = null;
    };
    // Un objeto pulsado pide ir a verlo de cerca.
    const goto = (e) => {
      goal.current = { position: new Vector3(...e.detail.position), target: new Vector3(...e.detail.target) };
    };
    // Pulsar en el suelo: se camina hasta ahí (se resuelve en useFrame, que
    // conoce la cámara: se mantiene la altura y hacia dónde se mira).
    const walk = (e) => {
      walkTo.current = new Vector3(...e.detail);
    };
    // Recorrido de entrada: paradas { position, target, time } desde donde
    // esté la cámara ahora. `null` lo corta.
    const startTour = (e) => {
      if (!e.detail || !controls.current) {
        tour.current = null;
        return;
      }
      const cam = controls.current.object;
      goal.current = null;
      // Si la primera parada es del segundo 0, la cámara empieza ya en ella;
      // si no, sale volando desde donde esté.
      const jump = e.detail[0].time === 0;
      const from = jump ? [] : [{ position: cam.position.toArray(), target: controls.current.target.toArray() }];
      const stops = [...from, ...e.detail];
      tour.current = {
        t: 0,
        start: performance.now(),
        times: [...(jump ? [] : [0]), ...e.detail.map((k) => k.time)],
        path: new CatmullRomCurve3(stops.map((k) => new Vector3(...k.position))),
        look: new CatmullRomCurve3(stops.map((k) => new Vector3(...k.target))),
      };
    };
    window.addEventListener('otw-tour', startTour);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clear);
    window.addEventListener('otw-key', pad);
    window.addEventListener('otw-zoom', zoomBtn);
    window.addEventListener('otw-goto', goto);
    window.addEventListener('otw-walk', walk);
    return () => {
      window.removeEventListener('otw-tour', startTour);
      window.removeEventListener('otw-goto', goto);
      window.removeEventListener('otw-walk', walk);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clear);
      window.removeEventListener('otw-key', pad);
      window.removeEventListener('otw-zoom', zoomBtn);
    };
  }, []);

  useFrame(({ camera, size: screen }, rawDelta) => {
    const c = controls.current;
    if (!c) return;
    // La lente depende de la forma de la pantalla (más abierta en vertical):
    // se ajusta al cambiar de tamaño o al girar el móvil.
    const fov = fovFor(screen.width, screen.height);
    if (Math.abs(camera.fov - fov) > 0.01) {
      camera.fov = fov;
      camera.updateProjectionMatrix();
    }
    const dt = Math.min(rawDelta, 0.05);
    const { fwd, right, move, up } = tmp.current;

    // 0. Caminar hasta un punto del suelo: el punto mirado pasa a estar ahí, y
    // la cámara se coloca detrás, en la misma dirección de antes, a 1,8 m y a
    // la altura de los ojos de una persona (como si se fuera andando).
    if (walkTo.current) {
      const pt = walkTo.current;
      walkTo.current = null;
      const target = new Vector3(pt.x, 1.15, pt.z);
      const back = move.subVectors(camera.position, c.target);
      back.y = 0;
      if (back.lengthSq() < 1e-6) back.set(0, 0, 1);
      back.setLength(1.8);
      const position = new Vector3(target.x + back.x, 1.6, target.z + back.z);
      goal.current = { position, target };
    }

    // 0b. Recorrido de entrada: la cámara sigue una curva suave que pasa por
    // todas las paradas, sin detenerse en ninguna, mirando a otra curva.
    if (tour.current) {
      const tr = tour.current;
      // Con el reloj real: si el equipo va lento, la cámara salta fotogramas
      // pero no se retrasa respecto a los rótulos y la música.
      tr.t = (performance.now() - tr.start) / 1000;
      const last = tr.times.length - 1;
      let i = 0;
      while (i < last - 1 && tr.t > tr.times[i + 1]) i += 1;
      let s = Math.max(0, Math.min(1, (tr.t - tr.times[i]) / (tr.times[i + 1] - tr.times[i])));
      // Arranca y llega con suavidad; entre medias no frena.
      if (i === 0) s **= 1.7;
      if (i === last - 1) s = 1 - (1 - s) ** 1.7;
      const u = (i + s) / last;
      tr.path.getPoint(u, camera.position);
      tr.look.getPoint(u, c.target);
      if (tr.t >= tr.times[last]) tour.current = null;
    }

    // 1. Viaje a una vista con nombre (salto directo si hay reducción de movimiento).
    if (goal.current) {
      // Arranque suave: el vuelo coge velocidad en el primer medio segundo en
      // vez de salir disparado, y frena solo al llegar.
      const g = goal.current;
      g.age = (g.age ?? 0) + dt;
      const k = reduced ? 1 : (1 - Math.exp(-dt * 3.4)) * Math.min(1, g.age / 0.45);
      camera.position.lerp(goal.current.position, k);
      c.target.lerp(goal.current.target, k);
      if (camera.position.distanceTo(goal.current.position) < 0.01) goal.current = null;
    }

    // 2. Caminar: adelante/atrás según hacia dónde mira la cámara, sobre el suelo.
    // Con inercia: la velocidad sube poco a poco al pulsar y se frena suave al
    // soltar, en vez de arrancar y parar en seco (sin inercia si se pide menos
    // movimiento).
    const { vel, want } = tmp.current;
    want.set(0, 0, 0);
    if (pressed.current.size) {
      camera.getWorldDirection(fwd);
      fwd.y = 0;
      fwd.normalize();
      right.crossVectors(fwd, up).normalize();
      if (pressed.current.has('f')) want.add(fwd);
      if (pressed.current.has('b')) want.sub(fwd);
      if (pressed.current.has('r')) want.add(right);
      if (pressed.current.has('l')) want.sub(right);
      if (want.lengthSq() > 0) want.normalize().multiplyScalar(WALK_SPEED * (running.current ? RUN : 1));
      // Subir (E) y bajar (Q): la cámara y el punto al que mira, juntos.
      want.y = ((pressed.current.has('u') ? 1 : 0) - (pressed.current.has('d') ? 1 : 0)) * LIFT_SPEED;
    }
    // Arranca algo más rápido de lo que frena: responde al momento y desliza al soltar.
    vel.lerp(want, reduced ? 1 : 1 - Math.exp(-dt * (want.lengthSq() > 0 ? 7 : 5)));
    if (vel.lengthSq() > 1e-5) {
      move.copy(vel).multiplyScalar(dt);
      camera.position.add(move);
      c.target.add(move);
    } else vel.set(0, 0, 0);

    // 2b. Zoom de los botones y de + y −: acerca o aleja hacia el punto mirado,
    // repartido en varios fotogramas para que sea suave.
    if (Math.abs(zoom.current) > 0.01) {
      const step = reduced ? zoom.current : zoom.current * Math.min(1, dt * 9);
      zoom.current -= step;
      const dist = camera.position.distanceTo(c.target);
      const next = Math.min(c.maxDistance, Math.max(c.minDistance, dist * (1 - step * ZOOM_STEP)));
      move.subVectors(camera.position, c.target).setLength(next);
      camera.position.copy(c.target).add(move);
    }

    // 3. Límites del plató: ni dentro de la pared, ni fuera, ni bajo el suelo.
    const p = camera.position;
    p.x = Math.min(BOUNDS.maxX, Math.max(BOUNDS.minX, p.x));
    p.z = Math.min(BOUNDS.maxZ, Math.max(BOUNDS.minZ, p.z));
    // Al mirar hacia arriba la cámara baja girando alrededor del punto mirado.
    // Si toca el suelo, en vez de frenarse ahí sube el punto mirado lo mismo:
    // así se puede seguir inclinando hasta ver los neones de lo alto de la pared.
    // Y al revés: al mirar hacia abajo la cámara sube; si llega a su altura
    // máxima, baja el punto mirado. (No al subir o bajar con Q y E.)
    if (Math.abs(vel.y) < 0.01) {
      if (p.y < BOUNDS.minY) c.target.y = Math.min(LOOK_MAX, c.target.y + (BOUNDS.minY - p.y));
      if (p.y > BOUNDS.maxY) c.target.y = Math.max(0.2, c.target.y - (p.y - BOUNDS.maxY));
    }
    p.y = Math.min(BOUNDS.maxY, Math.max(BOUNDS.minY, p.y));
    // ...ni dentro de Michael: se empuja la cámara hacia fuera de un círculo.
    const dx = p.x - MICHAEL.x;
    const dz = p.z - MICHAEL.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.5 && p.y < 2) {
      const s = 0.5 / (d || 1);
      p.x = MICHAEL.x + dx * s;
      p.z = MICHAEL.z + (d ? dz * s : 0.5);
    }
    // ...ni a través del atrezo: cada objeto empuja la cámara fuera de su círculo.
    if (p.y < 2) {
      for (const [cx, cz, r] of COLLIDERS) {
        const ox = p.x - cx;
        const oz = p.z - cz;
        const od = Math.hypot(ox, oz);
        if (od < r) {
          const s = r / (od || 1);
          p.x = cx + ox * s;
          p.z = cz + (od ? oz * s : r);
        }
      }
    }
    const t = c.target;
    t.x = Math.min(BOUNDS.maxX, Math.max(BOUNDS.minX, t.x));
    t.z = Math.min(BOUNDS.maxZ, Math.max(WALL_LIMIT, t.z));
    t.y = Math.min(LOOK_MAX, Math.max(0.2, t.y));
    c.update();

    // 4. Zona: solo se avisa al cambiar, no en cada fotograma.
    const z = zoneOf(p, t);
    if (z !== zone.current) {
      zone.current = z;
      onZone(z);
    }
    const near = nearDeck(p, t);
    if (near !== atDeck.current) {
      atDeck.current = near;
      onDeck?.(near);
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      target={VIEWS.cover.target}
      enablePan={false}
      enableDamping={!reduced}
      dampingFactor={0.08}
      minDistance={0.35}
      maxDistance={10.5}
      // Se puede mirar hacia arriba (hasta unos 50° sobre el horizonte).
      maxPolarAngle={2.45}
      zoomToCursor
      zoomSpeed={0.9}
      rotateSpeed={0.7}
      onStart={() => {
        tour.current = null;
        goal.current = null;
      }}
    />
  );
}
