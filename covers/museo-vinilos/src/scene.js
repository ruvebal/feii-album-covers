// Sala 3D del museo en primera persona, de noche. Carga room.glb (el loft con el mueble de discos y los
// estantes), pone una funda por cada vinilo y deja a Steve (la cámara) caminar, mirar y tocar.
// La luz sale solo de lámparas: indirecta, cálida, rebotando en pared y techo.
// mountMuseum() devuelve el desmontaje: bucle, listeners, sonido, GPU y bloqueo del ratón.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { COLLIDERS as BASE_COLLIDERS, BOUNDS, SPAWN, EYE, RADIUS } from './colliders.js';
import { createSteveArm } from './steve.js';
import { createSequence } from './sequence.js';
import { createSfx } from './sfx.js';
import { loadDiscAssets, createDiscMaterial } from './disc.js';
import { averageColor } from './pixel.js';
import { makeDepthTexture, createReliefMaterial } from './relief.js';
import { createMoscaSleeve } from './mosca.js';
import { titleSleeveCanvas } from './art.js';

const ROOM_URL = new URL('../public/room.glb', import.meta.url).href;
const SPEED = 2.8;
const SPRINT = 1.7;
const REACH = 3.4;
const SLEEVE = 0.42;
const THICK = 0.012;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const wrapPi = (a) => Math.atan2(Math.sin(a), Math.cos(a));

/** dispose() de la textura y, si su imagen es un ImageBitmap (GLTFLoader lo usa), close(): si no, la memoria no se libera. */
function disposeTexture(t) {
  t.dispose();
  if (typeof ImageBitmap !== 'undefined' && t.image instanceof ImageBitmap) t.image.close();
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`no se pudo cargar ${url}`));
    img.src = url;
  });
}

/** Imagen a canvas de 512 (también sirve para SVG sin tamaño intrínseco). */
function toCanvas(img) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  c.getContext('2d').drawImage(img, 0, 0, 512, 512);
  return c;
}

/**
 * @param {HTMLElement} root
 * @param {{
 *   vinyls: { slug: string | null, title: string, image: string | null, playable: boolean, status?: string, concept?: string, authors?: string[] }[],
 *   reduced: boolean,
 *   onEnter: (slug: string) => void,
 *   onFade: (p: number) => void,
 *   onProgress?: (p: number) => void,
 *   onHover?: (v: object | null) => void,
 *   onLock?: (locked: boolean) => void,
 *   onRenderer?: (r: THREE.WebGLRenderer) => void,
 *   onReady?: () => void,
 *   onError?: (e: Error) => void,
 *   onStart?: (title: string) => void,
 * }} o
 */
export function mountMuseum(root, o) {
  const ac = new AbortController();
  const { signal } = ac;
  const on = (target, type, fn, opts = {}) => target.addEventListener(type, fn, { ...opts, signal });
  const cleanups = [];
  const canvas = root.querySelector('canvas');

  const state = { yaw: SPAWN.yaw, pitch: 0, x: SPAWN.x, z: SPAWN.z, y: 0, vy: 0, vx: 0, vz: 0, speed: 0, bob: 0, hover: null, locked: false, dragging: false, moved: 0 };
  const keys = new Set();
  // prefers-reduced-motion se lee en vivo: si cambia durante la sesión, la escena lo sigue
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  const flags = { reduced: mq.matches };
  on(mq, 'change', () => {
    flags.reduced = mq.matches;
  });
  const colliders = [...BASE_COLLIDERS];
  /** @type {any} */
  let api = { debug: {} };

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  } catch (e) {
    // sin WebGL: la ruta enseña el aviso y la lista de vinilos (entra directo a cada ruta), sin sala
    o.onError?.(e);
    return { debug: {}, startSlug() {}, skip() {}, resume() {}, unmount() { ac.abort(); } };
  }
  renderer.setPixelRatio(new URLSearchParams(window.location.search).has('fast') ? 0.75 : Math.min(devicePixelRatio, 1.25));
  renderer.toneMapping = THREE.NeutralToneMapping; // Khronos PBR Neutral: respeta el color de las portadas (ACES lo deformaba)
  renderer.toneMappingExposure = 1.3;
  // compileAsync comprueba con temporizadores que el programa esté listo; si el renderer se libera antes, esos temporizadores
  // lanzan «reading 'isReady'». Se espera a que terminen las compilaciones pendientes antes de liberar.
  const compiling = new Set();
  const compileSafe = () => {
    // la escena se dibuja dentro del compositor (destino lineal): los programas se compilan para ESE destino; si se compilaran
    // para la pantalla (sRGB) serían otros y el precompilado no serviría de nada
    const prev = renderer.getRenderTarget();
    renderer.setRenderTarget(composer.renderTarget1);
    let p;
    try {
      p = renderer.compileAsync(scene, camera).catch(() => {});
    } finally {
      renderer.setRenderTarget(prev);
    }
    compiling.add(p);
    p.finally(() => compiling.delete(p));
    return p;
  };
  cleanups.push(() => renderer.dispose()); // sin forceContextLoss: StrictMode remonta sobre el mismo <canvas>
  renderer.info.autoReset = false;
  o.onRenderer?.(renderer);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#03050a');
  const camera = new THREE.PerspectiveCamera(70, 1, 0.05, 80);
  camera.rotation.order = 'YXZ';
  scene.add(camera);
  scene.fog = new THREE.FogExp2(0x05070d, 0.02); // profundidad nocturna: el fondo de la sala se apaga

  // cadena: escena → bloom (solo lo muy brillante: las lámparas) → salida con el tono del renderer
  const FAST = new URLSearchParams(window.location.search).has('fast'); // solo pruebas: sin bloom, menos píxeles
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  // un solo pase extra, barato: bloom suave para lámparas (sin oclusión ambiental: pesaba demasiado)
  const bloom = FAST ? null : new UnrealBloomPass(new THREE.Vector2(1, 1), 0.22, 0.45, 1.05);
  if (bloom) composer.addPass(bloom);
  composer.addPass(new OutputPass());
  cleanups.push(() => {
    composer.passes.forEach((p) => p.dispose?.());
    composer.dispose();
  });

  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envTarget = pmrem.fromScene(room, 0.04);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 0.05;
  cleanups.push(() => {
    envTarget.dispose();
    pmrem.dispose();
    room.traverse((n) => {
      n.geometry?.dispose();
      n.material?.dispose?.();
    });
  });

  /* ---------- Luz: solo lámparas, indirecta y cálida ---------- */
  scene.add(new THREE.HemisphereLight(0x33446c, 0x14100c, 0.34)); // resplandor de ciudad por el ventanal, muy bajo

  const lampWood = new THREE.MeshStandardMaterial({ color: 0x1d1611, roughness: 0.7 });
  const lampShade = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.3, 0.8, 0.38), fog: false }); // >1: brilla con el bloom
  // base, poste y tapa en una sola malla (una llamada de dibujo en vez de tres); la pantalla va aparte porque brilla
  const at = (geo, y) => geo.translate(0, y, 0);
  const lampGeo = {
    wood: mergeGeometries([at(new THREE.BoxGeometry(0.32, 0.04, 0.32), 0.02), at(new THREE.BoxGeometry(0.04, 1.4, 0.04), 0.74), at(new THREE.BoxGeometry(0.4, 0.03, 0.4), 1.83)]),
    shade: at(new THREE.BoxGeometry(0.3, 0.34, 0.3), 1.62),
  };
  cleanups.push(() => {
    Object.values(lampGeo).forEach((g) => g.dispose());
    lampWood.dispose();
    lampShade.dispose();
  });

  /**
   * Lámpara de pie. glow: luz difusa alrededor. wash: foco a la pared (la luz que rebota). ceiling: foco al techo.
   * @param {number} x @param {number} z @param {[number, number, number]} wall @param {boolean} ceiling
   */
  function addLamp(x, z, wall, ceiling) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.add(new THREE.Mesh(lampGeo.wood, lampWood), new THREE.Mesh(lampGeo.shade, lampShade));
    scene.add(g);
    const wash = new THREE.SpotLight(0xff9a45, 40, 9, 0.85, 0.9, 1.3);
    wash.position.set(x, 1.6, z);
    wash.target.position.set(...wall);
    scene.add(wash, wash.target);
    if (ceiling) {
      const up = new THREE.SpotLight(0xffb36b, 34, 11, 1.1, 1, 1.4);
      up.position.set(x, 1.85, z);
      up.target.position.set(x, 7.4, z);
      scene.add(up, up.target);
    }
    colliders.push([x - 0.22, x + 0.22, z - 0.22, z + 0.22, 'lámpara']);
  }
  addLamp(0.3, -4.0, [0.3, 2.4, -4.75], false); // junto a los estantes, lava el ladrillo del fondo
  addLamp(4.3, -2.9, [4.9, 2.4, -2.9], false); // junto al tocadiscos, lava la pared derecha
  addLamp(1.6, 2.4, [4.9, 2.2, 2.4], true); // junto al sofá, lava techo y pared

  // tira de luz sobre los estantes
  const stripMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.3, 0.9), fog: false });
  const stripGeo = new THREE.BoxGeometry(2.2, 0.03, 0.03);
  const strip = new THREE.Mesh(stripGeo, stripMat);
  strip.position.set(1.9, 2.2, -4.5);
  scene.add(strip);
  // luz de área suave sobre las fundas (solo la leen los materiales estándar)
  RectAreaLightUniformsLib.init();
  // las tablas de luz de área son globales de three (variante FLOAT o HALF según la extensión de la GPU): se guardan aquí las
  // referencias de ESTE montaje y se liberan de la GPU al salir; si otro montaje las sustituye, el cleanup no toca las suyas
  const ltc = ['LTC_FLOAT_1', 'LTC_FLOAT_2', 'LTC_HALF_1', 'LTC_HALF_2'].map((k) => THREE.UniformsLib[k]).filter(Boolean);
  cleanups.push(() => ltc.forEach((t) => t.dispose()));
  const stripLight = new THREE.RectAreaLight(0xffc27a, 9, 2.2, 0.12);
  stripLight.position.set(1.9, 2.17, -4.42);
  stripLight.lookAt(1.9, 0.95, -3.9);
  scene.add(stripLight);
  cleanups.push(() => {
    stripGeo.dispose();
    stripMat.dispose();
  });

  /* ---------- Brazo, sonido y secuencia ---------- */
  const arm = createSteveArm(camera);
  cleanups.push(() => arm.dispose());
  const sfx = createSfx();
  cleanups.push(() => sfx.dispose());
  // sacudida por impactos: trauma que decae; la sacudida es trauma², así los golpes pequeños casi no se notan
  const shake = { trauma: 0, off: new THREE.Vector3() };
  const seq = createSequence({
    scene, camera, arm, sfx, onFade: o.onFade, onEnter: o.onEnter, reduced: () => flags.reduced,
    onImpact: (amount) => {
      if (!flags.reduced) shake.trauma = Math.min(1, shake.trauma + amount);
    },
  });
  cleanups.push(() => seq.dispose());

  // contorno sobre el vinilo señalado
  const outline = new THREE.LineSegments(
    new THREE.EdgesGeometry(new THREE.BoxGeometry(THICK + 0.01, SLEEVE * 1.05, SLEEVE * 1.05)),
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthTest: false }),
  );
  outline.visible = false;
  outline.renderOrder = 10;
  scene.add(outline);
  cleanups.push(() => {
    outline.geometry.dispose();
    outline.material.dispose();
  });

  /* ---------- Entrada ---------- */
  const lockSupported = typeof canvas.requestPointerLock === 'function';
  const requestLock = () => {
    try {
      canvas.requestPointerLock()?.catch?.(() => {});
    } catch {
      /* sin bloqueo del ratón: arrastrar para mirar */
    }
  };
  on(document, 'pointerlockchange', () => {
    state.locked = document.pointerLockElement === canvas;
    o.onLock?.(state.locked);
  });
  cleanups.push(() => {
    if (document.pointerLockElement === canvas) document.exitPointerLock();
  });
  on(window, 'keydown', (e) => {
    // con el foco en un botón, enlace, resumen o campo, las teclas son del control (Espacio y Intro lo activan), no del juego
    const ctl = e.target instanceof HTMLElement ? e.target.closest('button, a[href], summary, input, textarea, select, [contenteditable], [role="button"]') : null;
    // excepción: en los botones de la cruceta táctil, WASD y las flechas siguen moviendo (Espacio e Intro los maneja el propio botón)
    if (ctl && !(ctl.closest('.museo__pad') && e.code !== 'Space' && e.code !== 'Enter')) return;
    sfx.unlock();
    const k = e.code;
    if (k === 'KeyM') {
      if (!e.repeat) sfx.toggleMute(); // una pulsación mantenida es una sola alternancia
      return;
    }
    if (seq.active) {
      if (k === 'Space') {
        e.preventDefault();
        if (!e.repeat) seq.skip();
      }
      return;
    }
    if (k === 'Space') {
      e.preventDefault();
      if (state.y <= 0.001) state.vy = 5; // salto como el de Minecraft: unos 0,7 m
      return;
    }
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'].includes(k)) {
      keys.add(k);
      if (k.startsWith('Arrow')) e.preventDefault();
    }
    if ((k === 'KeyE' || k === 'Enter') && state.hover && document.activeElement === document.body) pick(state.hover);
  });
  on(window, 'keyup', (e) => keys.delete(e.code));
  on(window, 'blur', () => keys.clear());
  on(window, 'mousemove', (e) => {
    if (seq.active) return;
    if (state.locked || state.dragging) {
      state.yaw -= e.movementX * 0.0022;
      state.pitch = clamp(state.pitch - e.movementY * 0.0022, -1.35, 1.35);
      state.moved += Math.abs(e.movementX) + Math.abs(e.movementY);
    }
  });
  const touchLook = { x: 0, y: 0, id: null };
  on(window, 'pointermove', (e) => {
    // arrastrar con el dedo para mirar (el ratón usa mousemove con movementX)
    if (e.pointerType !== 'touch' || !state.dragging || seq.active || e.pointerId !== touchLook.id) return;
    state.yaw -= (e.clientX - touchLook.x) * 0.005;
    state.pitch = clamp(state.pitch - (e.clientY - touchLook.y) * 0.005, -1.35, 1.35);
    state.moved += Math.abs(e.clientX - touchLook.x) + Math.abs(e.clientY - touchLook.y);
    touchLook.x = e.clientX;
    touchLook.y = e.clientY;
  });
  on(canvas, 'pointerdown', (e) => {
    sfx.unlock();
    if (e.pointerType === 'touch') {
      if (touchLook.id !== null) return; // ya hay un dedo mirando: el segundo no lo interrumpe
      touchLook.id = e.pointerId;
    }
    touchLook.x = e.clientX;
    touchLook.y = e.clientY;
    if (seq.active) return;
    if (state.locked) arm.swing(); // el clic mueve el brazo aunque no toques nada, como en Minecraft
    state.dragging = true;
    state.moved = 0;
  });
  const endLook = (e, cancelled = false) => {
    // un dedo que no es el de mirar (por ejemplo, el de la cruceta) no termina el arrastre
    if (e.pointerType === 'touch' && e.pointerId !== touchLook.id) return;
    touchLook.id = null;
    if (!state.dragging) return;
    state.dragging = false;
    if (seq.active || cancelled) return; // un gesto cancelado (el sistema se lo quedó) no coge nada ni pide el ratón
    if (state.hover && (state.locked || state.moved < 6)) pick(state.hover);
    else if (!state.locked && state.moved < 6 && lockSupported) requestLock();
  };
  on(window, 'pointerup', (e) => endLook(e, false));
  on(window, 'pointercancel', (e) => endLook(e, true));
  on(window, 'resize', resize);

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    composer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  /* ---------- Movimiento y colisión ---------- */
  function resolve(x, z) {
    x = clamp(x, BOUNDS.minX, BOUNDS.maxX);
    z = clamp(z, BOUNDS.minZ, BOUNDS.maxZ);
    for (let pass = 0; pass < 2; pass++) {
      for (const [x0, x1, z0, z1] of colliders) {
        const cx = clamp(x, x0, x1);
        const cz = clamp(z, z0, z1);
        const dx = x - cx;
        const dz = z - cz;
        const d2 = dx * dx + dz * dz;
        if (d2 >= RADIUS * RADIUS) continue;
        if (d2 > 1e-8) {
          const d = Math.sqrt(d2);
          x = cx + (dx / d) * RADIUS;
          z = cz + (dz / d) * RADIUS;
        } else {
          const m = Math.min(x - x0, x1 - x, z - z0, z1 - z);
          if (m === x - x0) x = x0 - RADIUS;
          else if (m === x1 - x) x = x1 + RADIUS;
          else if (m === z - z0) z = z0 - RADIUS;
          else z = z1 + RADIUS;
        }
      }
    }
    return [x, z];
  }

  function walk(dt) {
    const f = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    const r = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
    const turn = (keys.has('ArrowLeft') ? 1 : 0) - (keys.has('ArrowRight') ? 1 : 0);
    state.yaw += turn * 1.9 * dt;
    let tx = 0;
    let tz = 0;
    if (f || r) {
      const len = Math.hypot(f, r);
      const sp = SPEED * (keys.has('ShiftLeft') || keys.has('ShiftRight') ? SPRINT : 1);
      const sy = Math.sin(state.yaw);
      const cy = Math.cos(state.yaw);
      tx = ((-sy * f + cy * r) / len) * sp;
      tz = ((-cy * f - sy * r) / len) * sp;
    }
    // aceleración suave: arranca y frena con inercia, sin tirones
    const k = Math.min(1, dt * (f || r ? 9 : 12));
    state.vx += (tx - state.vx) * k;
    state.vz += (tz - state.vz) * k;
    [state.x, state.z] = resolve(state.x + state.vx * dt, state.z + state.vz * dt);
    state.speed = clamp(Math.hypot(state.vx, state.vz) / SPEED, 0, 1.7);
    state.bob += dt * (6 + state.speed * 4) * (state.speed > 0.05 ? 1 : 0);
  }

  /* ---------- Vinilos ---------- */
  /** @type {any[]} */
  const entries = [];
  const pickables = [];
  const raycaster = new THREE.Raycaster();
  raycaster.far = REACH;
  const center = new THREE.Vector2(0, 0);
  const Y = new THREE.Vector3(0, 1, 0);
  const Z = new THREE.Vector3(0, 0, 1);
  const tmp = new THREE.Vector3();
  const qYaw = new THREE.Quaternion();
  const qTilt = new THREE.Quaternion();

  function pick(entry) {
    if (seq.active || !entry?.vinyl?.playable) return;
    // si la secuencia nace de un botón de la lista, se le quita el foco: así Espacio salta la animación en vez de pulsar otra vez el botón
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    o.onStart?.(entry.vinyl.title);
    o.onHover?.(null);
    outline.visible = false;
    keys.clear();
    seq.start(entry);
  }

  function updateHover() {
    raycaster.setFromCamera(center, camera);
    const hit = raycaster.intersectObjects(pickables, false)[0];
    const entry = hit ? hit.object.userData.entry : null;
    if (entry !== state.hover) {
      state.hover = entry;
      const v = entry?.vinyl;
      o.onHover?.(v ? { slug: v.slug, title: v.title, status: v.status, concept: v.concept, authors: v.authors, playable: v.playable } : null);
    }
  }

  /** Movimiento 3D de las fundas: balanceo en reposo; al apuntarlas se asoman, giran hacia ti y brilla un destello. */
  let frame = 0;
  function animateSleeves(t, dt) {
    frame += 1;
    for (const e of entries) {
      if (e.animate && !flags.reduced && frame % 2 === 0) {
        e.animate(t, e.hov); // el lienzo de la funda se repinta; el relieve 3D lo lee
        e.frontTex.needsUpdate = true;
      }
      const hov = e === state.hover ? 1 : 0;
      e.hov += (hov - e.hov) * Math.min(1, dt * 9);
      const calm = flags.reduced ? 0 : 1;
      const sway = Math.sin(t * 0.7 + e.phase) * 0.06 * calm;
      const bob = Math.sin(t * 1.1 + e.phase) * 0.004 * calm;
      tmp.copy(camera.position).sub(e.home);
      const toCam = Math.atan2(-tmp.z, tmp.x);
      const yawHover = clamp(wrapPi(toCam - e.baseAngle), -0.7, 0.7) * e.hov * (flags.reduced ? 0.3 : 1);
      qYaw.setFromAxisAngle(Y, sway + yawHover);
      qTilt.setFromAxisAngle(Z, -0.14 * e.hov * (flags.reduced ? 0 : 1));
      e.mesh.quaternion.copy(qYaw).multiply(e.quat).multiply(qTilt);
      e.mesh.position.copy(e.home).addScaledVector(e.normal, 0.09 * e.hov * (flags.reduced ? 0.4 : 1));
      e.mesh.position.y += bob + e.hov * 0.01;
      // relieve que respira en reposo y sobresale más al apuntarla
      const tt = flags.reduced ? 0 : t; // con movimiento reducido el destello y el relieve no avanzan
      e.reliefMat.uniforms.uTime.value = tt;
      e.reliefMat.uniforms.uIdle.value = flags.reduced ? 0 : 1;
      e.reliefMat.uniforms.uRelief.value = 0.02 + (flags.reduced ? 0 : Math.sin(t * 1.3 + e.phase) * 0.006) + e.hov * 0.03;
      e.reliefMat.uniforms.uParallax.value = 0.03 + e.hov * 0.04;
      // destello: el shader de relieve lo dibuja
      e.reliefMat.uniforms.uSweep.value = ((tt * (0.12 + e.hov * 0.4) + e.phase * 0.3) % 2.6) - 0.5;
      e.reliefMat.uniforms.uSheen.value = (flags.reduced ? 0.03 : 0.07) + e.hov * 0.22;
    }
    const h = state.hover;
    outline.visible = Boolean(h);
    if (h) {
      outline.position.copy(h.mesh.position);
      outline.quaternion.copy(h.mesh.quaternion);
    }
  }

  /** El loft de origen tiene el lado derecho y el frente abiertos: se cierran con ladrillo del propio modelo. */
  function closeRoom(sceneRoot) {
    let brick = null;
    sceneRoot.traverse((n) => {
      if (!brick && n.isMesh && n.name.startsWith('Cube_') && n.material?.map) brick = n.material.map;
    });
    const map = brick ? brick.clone() : null;
    if (map) {
      map.wrapS = map.wrapT = THREE.RepeatWrapping;
      map.repeat.set(7, 3);
      map.needsUpdate = true;
    }
    const mat = new THREE.MeshStandardMaterial({ map, color: map ? 0xffffff : 0x6b3b2c, roughness: 0.95 });
    const wall = (w, h, x, y, z, ry) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
      m.position.set(x, y, z);
      m.rotation.y = ry;
      scene.add(m);
    };
    wall(15.4, 7.6, 4.78, 3.8, 2.8, -Math.PI / 2); // lado derecho, mira a -x (pegado al ladrillo del fondo, que acaba en 4,8)
    wall(9.8, 7.6, 0, 3.8, 10.35, Math.PI); // frente, mira a -z
    cleanups.push(() => {
      mat.dispose();
      map?.dispose();
    });
  }

  async function build() {
    const gltf = await new GLTFLoader().loadAsync(ROOM_URL, (e) => {
      if (e.total) o.onProgress?.(e.loaded / e.total);
    });
    if (signal.aborted) {
      // se desmontó mientras cargaba: se libera lo recibido
      gltf.scene.traverse((n) => {
        n.geometry?.dispose();
        (Array.isArray(n.material) ? n.material : [n.material]).forEach((m) => {
          if (!m) return;
          Object.values(m).forEach((v) => v?.isTexture && disposeTexture(v)); // también las texturas
          m.dispose();
        });
      });
      return;
    }
    scene.add(gltf.scene);
    gltf.scene.updateMatrixWorld(true);
    closeRoom(gltf.scene);
    const aniso = renderer.capabilities.getMaxAnisotropy();

    // disco 3D de la secuencia (sin él, el disco sale como un cilindro liso)
    try {
      const assets = await loadDiscAssets(aniso);
      if (signal.aborted) {
        assets.dispose();
        return;
      }
      seq.setDisc(assets);
      cleanups.push(() => assets.dispose());
      // precompila ahora lo que usa la secuencia (funda en la mano y disco con su material real): sin esto, el primer vinilo
      // que se coge compila programas nuevos a mitad de la animación. El material de prueba se conserva hasta salir: si se liberara
      // al instante, three borraría su programa y no serviría de nada.
      try {
        const warm = createDiscMaterial(assets, null, new THREE.Color(0x888888), scene.environment);
        warm.material.map?.dispose(); // el programa no depende de que la textura esté subida
        cleanups.push(() => warm.material.dispose());
        await seq.warm(compileSafe, warm.material);
      } catch {
        /* sin precompilado: se compila al primer uso */
      }
      if (signal.aborted) return;
    } catch (e) {
      if (signal.aborted) return;
      console.warn('[museo] disco 3D sin cargar:', e.message);
    }

    const nodes = [];
    gltf.scene.traverse((n) => {
      if (/^vinilo_\d+$/.test(n.name)) nodes.push(n);
    });
    nodes.sort((a, b) => a.name.localeCompare(b.name));

    const sideMat = new THREE.MeshStandardMaterial({ color: 0x8a7d5e, roughness: 0.8 });
    const geo = new THREE.BoxGeometry(THICK, SLEEVE, SLEEVE);
    const reliefGeo = new THREE.PlaneGeometry(SLEEVE * 0.98, SLEEVE * 0.98, 32, 32);
    cleanups.push(() => {
      sideMat.dispose();
      geo.dispose();
      reliefGeo.dispose();
    });

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const vinyl = o.vinyls[i] ?? null;
      const home = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      node.getWorldPosition(home);
      node.getWorldQuaternion(quat);
      node.visible = false;
      if (!vinyl) continue; // hueco sin vinilo: no se pinta funda

      let source;
      let label;
      let animate = null;
      if (vinyl.image) {
        try {
          const img = await loadImage(vinyl.image);
          if (signal.aborted) return;
          if (vinyl.slug === 'mosca') {
            // la portada real de mosca, animada: perro ladrando, onomatopeyas y brillo
            const m = createMoscaSleeve(img);
            source = m.canvas;
            animate = m.draw;
          } else source = toCanvas(img);
          label = averageColor(img);
        } catch (e) {
          if (signal.aborted) return;
          console.warn('[museo] portada sin cargar:', vinyl.slug, e.message);
        }
      }
      if (signal.aborted) return;
      if (!source) source = titleSleeveCanvas(vinyl.title, i);
      if (!label) label = averageColor(source);
      const frontTex = new THREE.CanvasTexture(source);
      frontTex.colorSpace = THREE.SRGBColorSpace;
      frontTex.anisotropy = aniso;
      cleanups.push(() => frontTex.dispose());

      const mesh = new THREE.Group();
      mesh.position.copy(home);
      mesh.quaternion.copy(quat);
      // una caja de un solo material = una llamada de dibujo (con 6 materiales eran 6); el frente lo cubre el plano de relieve
      const box = new THREE.Mesh(geo, sideMat);
      mesh.add(box);
      // relieve 3D: la portada sale del plano según su mapa de profundidad y se desplaza con el punto de vista
      const depthTex = makeDepthTexture(source);
      const reliefMat = createReliefMaterial(frontTex, depthTex);
      reliefMat.uniforms.uPhase.value = i * 1.7;
      reliefMat.uniforms.uLight.value = 1.0; // el tono Neutral respeta el color: sin compensación
      reliefMat.uniforms.uIdle.value = flags.reduced ? 0 : 1;
      const relief = new THREE.Mesh(reliefGeo, reliefMat);
      relief.rotation.y = Math.PI / 2;
      relief.position.x = THICK / 2 + 0.004; // por delante del frente de cartón
      mesh.add(relief);
      cleanups.push(() => {
        depthTex.dispose();
        reliefMat.dispose();
      });
      scene.add(mesh);

      const normal = new THREE.Vector3(1, 0, 0).applyQuaternion(quat).normalize();
      const entry = {
        index: i, name: node.name, mesh, home, quat, normal, vinyl, slug: vinyl.slug, frontTex, source, label, animate, bark: vinyl.slug === 'mosca',
        phase: i * 1.7, hov: 0, reliefMat, baseAngle: Math.atan2(-normal.z, normal.x),
      };
      box.userData.entry = entry;
      entries.push(entry);
      pickables.push(box);
    }
    api.debug.entries = entries;
  }

  /* ---------- Bucle ---------- */
  const gov = { frames: 0, time: 0, low: 0, level: 0 };
  /** Nivel 1: sin bloom. Nivel 2: además resolución ≤ 1 en el renderer Y en el compositor (si no, sus buffers se quedan grandes).
   *  Nivel 3: resolución ≤ 0,75 (para equipos que siguen sin llegar). Nunca sube la resolución que ya tenía. */
  function applyQuality(level) {
    gov.level = level;
    if (level >= 1 && bloom) bloom.enabled = false;
    if (level >= 2) {
      // nunca sube: si el DPR ya era menor (zoom del navegador), se conserva
      const low = Math.min(level >= 3 ? 0.75 : 1, renderer.getPixelRatio());
      renderer.setPixelRatio(low);
      composer.setPixelRatio(low);
      resize();
    }
  }
  let last = performance.now();
  const t0 = last;
  function tick() {
    renderer.info.reset(); // renderer.info.autoReset está apagado: el panel ?budget cuenta el fotograma completo (todas las pasadas)
    const now = performance.now();
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    const t = (now - t0) / 1000;
    if (!seq.active) {
      walk(dt);
      state.vy -= 18 * dt;
      state.y += state.vy * dt;
      if (state.y < 0) {
        state.y = 0;
        state.vy = 0;
      }
      const bobY = flags.reduced || state.y > 0.001 ? 0 : Math.sin(state.bob) * 0.035 * Math.min(1, state.speed);
      camera.position.set(state.x, EYE + state.y + bobY, state.z);
      camera.rotation.set(state.pitch, state.yaw, 0);
      const fov = 70 + (flags.reduced ? 0 : clamp(state.speed - 1, 0, 0.7) * 8);
      if (Math.abs(camera.fov - fov) > 0.05) {
        camera.fov += (fov - camera.fov) * Math.min(1, dt * 6);
        camera.updateProjectionMatrix();
      }
      updateHover();
    } else {
      state.hover = null;
    }
    // adaptación de calidad: si el equipo va justo (menos de 38 fps sostenidos), baja primero el bloom y luego la resolución
    if (!FAST) {
      gov.frames += 1;
      gov.time += dt;
      if (gov.time >= 2) {
        const fps = gov.frames / gov.time;
        gov.low = fps < 38 && !document.hidden ? gov.low + 1 : 0;
        gov.frames = 0;
        gov.time = 0;
        if (gov.low >= 2 && gov.level < 3) {
          gov.low = 0;
          applyQuality(gov.level + 1);
          console.info(`[museo] calidad bajada al nivel ${gov.level} (fps < 38)`);
        }
        api.debug.quality = gov.level;
      }
    }
    animateSleeves(t, dt);
    camera.position.sub(shake.off); // quita la sacudida del fotograma anterior
    seq.update(dt);
    arm.update(dt, seq.active ? seq.armSpeed : state.speed, flags.reduced);
    shake.trauma = Math.max(0, shake.trauma - 1.4 * dt);
    const sh = shake.trauma * shake.trauma;
    shake.off.set(Math.sin(t * 61) * 0.03 * sh, Math.sin(t * 73 + 1) * 0.03 * sh, 0);
    camera.position.add(shake.off);
    composer.render();
  }

  resize();
  camera.position.set(state.x, EYE, state.z);
  camera.rotation.set(state.pitch, state.yaw, 0);

  build()
    .then(async () => {
      if (signal.aborted) return;
      // precompila los shaders con todas las luces antes del primer fotograma (evita el tirón al empezar)
      try {
        await compileSafe();
      } catch {
        /* sin compileAsync: se compila al vuelo */
      }
      if (signal.aborted) return;
      renderer.setAnimationLoop(tick);
      o.onReady?.();
    })
    .catch((e) => {
      if (!signal.aborted) o.onError?.(e);
    });

  api = {
    debug: { camera, state, scene, seq, entries, renderer, composer, applyQuality, compileSafe, sfx },
    startSlug(slug) {
      const e = entries.find((x) => x.vinyl?.slug === slug);
      if (e) pick(e);
    },
    skip: () => seq.skip(),
    /** Mando táctil: pulsa o suelta una tecla de movimiento. */
    key(code, down) {
      if (seq.active) return;
      if (down) keys.add(code);
      else keys.delete(code);
    },
    /** Mando táctil: coger el vinilo al que se apunta. */
    interact() {
      if (state.hover) pick(state.hover);
    },
    /** Vuelve a la sala tras una secuencia que no entró a ninguna ruta (la ruta aún no existe). */
    resume() {
      seq.abort();
      const eu = new THREE.Euler().setFromQuaternion(camera.quaternion, 'YXZ');
      state.x = camera.position.x;
      state.z = camera.position.z;
      state.yaw = eu.y;
      state.pitch = clamp(eu.x, -1.35, 1.35);
      state.vx = state.vz = 0;
      shake.trauma = 0;
    },
    unmount() {
      ac.abort();
      renderer.setAnimationLoop(null);
      // Liberar materiales o el renderer con una compilación pendiente rompe sus temporizadores («reading 'isReady'»):
      // se espera a que terminen (sin plazo: un plazo vencido reabriría el mismo fallo) y solo entonces se libera todo.
      const release = () => {
        // primero los recursos de la escena (texturas, materiales, geometrías) y al final el renderer:
        // renderer.dispose() borra el registro interno de three, y una textura liberada después ya no se borra en la GPU
        scene.traverse((n) => {
          n.geometry?.dispose();
          const mats = Array.isArray(n.material) ? n.material : [n.material];
          mats.forEach((m) => {
            if (!m) return;
            Object.values(m).forEach((v) => v?.isTexture && disposeTexture(v));
            m.dispose();
          });
        });
        for (let i = cleanups.length - 1; i >= 0; i--) cleanups[i]();
      };
      if (compiling.size) Promise.allSettled([...compiling]).then(release);
      else release();
    },
  };
  return api;
}
