// Secuencia de Steve al tocar un vinilo, con las dos manos:
//   approach  se acerca al estante y mira la funda
//   grab      la mano derecha golpea y trae la funda
//   inspect   agarra la funda por los lados con las dos manos y la gira: reverso y frente
//   slide     saca el disco por arriba, suelta la funda y lo agarra por los bordes; lo gira para ver las dos caras
//   walk      camina al tocadiscos con el disco entre las manos
//   place     lo lleva en arco sobre el plato, lo baja nivelado, lo suelta (golpe, polvo, rebote)
//   play      el disco arranca con inercia, crujido de vinilo y notas
//   fade      pantalla a negro y se entra en la ruta del compañero
// Con prefers-reduced-motion las fases duran una fracción y no hay giros, polvo ni notas.

import * as THREE from 'three';
import { PLATTER, TURNTABLE_STAND, EYE } from './colliders.js';
import { DISC_R, createDiscMaterial } from './disc.js';

const PHASES = ['approach', 'grab', 'inspect', 'slide', 'walk', 'place', 'play', 'fade'];
const DUR = { approach: 0.9, grab: 0.9, inspect: 2.0, slide: 2.0, walk: 1.5, place: 2.0, play: 1.8, fade: 0.7 };
const DUR_REDUCED = { approach: 0.25, grab: 0.25, inspect: 0.3, slide: 0.3, walk: 0.35, place: 0.3, play: 0.4, fade: 0.4 };

// poses en el espacio de la cámara (x derecha, y arriba, -z hacia delante)
const FAR = new THREE.Vector3(0.12, -0.12, -0.55);
const ITEM = new THREE.Vector3(0, -0.06, -0.52);
const SLEEVE_SCALE = 0.95; // la funda de la mano mide 0,3 m × esto
const DISC_HELD = 0.85; // escala del disco en la mano (diámetro 0,3 m × esto)
const HALF_SLEEVE = 0.17;
const HALF_DISC = 0.145;
const NOTE_COLOURS = [0x6bd36b, 0xd36bd3, 0x6bd3d3, 0xd3d36b, 0xd36b6b];
const TILT = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, 0, 0.06));

const clamp01 = (t) => Math.min(1, Math.max(0, t));
const seg = (t, a, b) => clamp01((t - a) / (b - a));
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeIn = (t) => t * t;
const easeOut = (t) => 1 - (1 - t) * (1 - t);

/**
 * @param {{ scene: THREE.Scene, camera: THREE.PerspectiveCamera, arm: ReturnType<import('./steve.js').createSteveArm>,
 *   sfx: ReturnType<import('./sfx.js').createSfx>, onImpact?: (amount: number) => void, onFade: (p: number) => void, onEnter: (slug: string) => void, reduced: boolean }} o
 */
export function createSequence({ scene, camera, arm, sfx, onImpact, onFade, onEnter, reduced: reducedIn }) {
  // «reducido» puede ser un booleano o una función: así sigue la preferencia del sistema aunque cambie durante la sesión
  const rd = () => (typeof reducedIn === 'function' ? reducedIn() : Boolean(reducedIn));
  let dur = rd() ? DUR_REDUCED : DUR;
  const tmpCam = new THREE.PerspectiveCamera();

  // funda en la mano
  const cardboard = new THREE.MeshLambertMaterial({ color: 0xc9bb98 });
  const backMat = new THREE.MeshBasicMaterial({ color: 0xb8a984 });
  const frontMat = new THREE.MeshBasicMaterial();
  const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.012), [cardboard, cardboard, cardboard, cardboard, frontMat, backMat]);
  // relieve 3D de la funda en la mano: mismo material que la del estante, así las dos manos la giran con volumen
  const reliefGeo = new THREE.PlaneGeometry(0.3, 0.3, 32, 32);
  const heldRelief = new THREE.Mesh(reliefGeo, new THREE.MeshBasicMaterial());
  heldRelief.position.z = 0.0065;
  sleeve.add(heldRelief);
  const held = new THREE.Group();
  held.visible = false;
  held.add(sleeve);
  camera.add(held);

  // disco: pivote (orientación) > spin (giro sobre su eje) > malla del modelo
  const fallbackGeo = new THREE.CylinderGeometry(DISC_R, DISC_R, 0.006, 48);
  const discMesh = new THREE.Mesh(fallbackGeo, new THREE.MeshStandardMaterial({ color: 0x111116 }));
  const spin = new THREE.Group();
  spin.add(discMesh);
  const disc = new THREE.Group();
  disc.rotation.order = 'YXZ';
  disc.add(spin);
  disc.visible = false;
  held.add(disc);
  /** @type {Awaited<ReturnType<typeof import('./disc.js').loadDiscAssets>> | null} */
  let assets = null;
  /** @type {{ material: THREE.Material, dispose: () => void } | null} */
  let discMat = null;

  // partículas: notas que suben y polvo al posar el disco
  const noteGeo = new THREE.BoxGeometry(0.035, 0.035, 0.035);
  const noteMats = NOTE_COLOURS.map((c) => new THREE.MeshBasicMaterial({ color: c }));
  const dustMat = new THREE.MeshBasicMaterial({ color: 0xd8d2c4 });
  /** @type {{ mesh: THREE.Mesh, life: number, max: number, vel: THREE.Vector3, seed: number }[]} */
  let bits = [];
  let noteTimer = 0;
  let noteIndex = 0;

  /** @type {null | Record<string, any>} */
  let run = null;
  const tmpA = new THREE.Vector3();
  const tmpB = new THREE.Vector3();
  const tmpC = new THREE.Vector3();

  function dust() {
    if (rd()) return;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2 + Math.random() * 0.4;
      const mesh = new THREE.Mesh(noteGeo, dustMat);
      mesh.scale.setScalar(0.6);
      mesh.position.set(PLATTER.x + Math.cos(a) * PLATTER.r, PLATTER.y + 0.01, PLATTER.z + Math.sin(a) * PLATTER.r);
      scene.add(mesh);
      bits.push({ mesh, life: 0, max: 0.55, vel: new THREE.Vector3(Math.cos(a) * 0.5, 0.35, Math.sin(a) * 0.5), seed: 0 });
    }
  }

  /** Las dos manos agarran un objeto por los lados (centro en el espacio de la cámara). */
  function gripCam(center, half, right = true, left = true) {
    if (right) arm.grip('r', tmpA.copy(center).add(tmpB.set(half, -0.03, 0.03)));
    if (left) arm.grip('l', tmpC.copy(center).add(tmpB.set(-half, -0.03, 0.03)));
  }

  /** Igual, pero con el centro en el mundo (el disco que ya viaja al plato). */
  function gripWorld(center, half) {
    camera.updateMatrixWorld(true);
    tmpB.set(1, 0, 0).applyQuaternion(camera.quaternion);
    arm.grip('r', camera.worldToLocal(tmpA.copy(center).addScaledVector(tmpB, half)));
    arm.grip('l', camera.worldToLocal(tmpC.copy(center).addScaledVector(tmpB, -half)));
  }

  const phases = {
    approach: {
      enter(r) {
        r.a = camera.position.clone();
        r.qa = camera.quaternion.clone();
        r.stand = new THREE.Vector3(r.v.home.x, EYE, r.v.home.z + 1.15);
        tmpCam.position.copy(r.stand);
        tmpCam.lookAt(r.v.home);
        r.qb = tmpCam.quaternion.clone();
      },
      step(r, p) {
        const e = ease(p);
        camera.position.lerpVectors(r.a, r.stand, e);
        camera.quaternion.slerpQuaternions(r.qa, r.qb, e);
      },
    },
    grab: {
      enter(r) {
        camera.updateMatrixWorld(true);
        r.start = camera.worldToLocal(r.v.home.clone());
        frontMat.map = r.v.frontTex;
        frontMat.needsUpdate = true;
        heldRelief.material = r.v.reliefMat;
        arm.swing();
      },
      step(r, p) {
        if (p >= 0.3 && !r.grabbed) {
          r.grabbed = true;
          r.v.mesh.visible = false;
          held.visible = true;
          sleeve.visible = true;
          sfx.pop();
          if (r.v.bark) sfx.bark();
          onImpact?.(0.18);
        }
        if (!r.grabbed) return;
        const q = ease(seg(p, 0.3, 1));
        sleeve.position.lerpVectors(r.start, FAR, q);
        sleeve.position.y += Math.sin(q * Math.PI) * 0.08;
        sleeve.scale.setScalar(1.4 - (1.4 - SLEEVE_SCALE) * q);
        sleeve.rotation.set(0, (1 - q) * 0.4, (1 - q) * 0.12);
        if (p > 0.55) gripCam(sleeve.position, HALF_SLEEVE, true, false); // la derecha lo agarra
      },
    },
    inspect: {
      enter() {
        sfx.tick(0);
      },
      step(r, p) {
        const e = ease(seg(p, 0, 0.25));
        sleeve.position.lerpVectors(FAR, ITEM, e);
        sleeve.scale.setScalar(SLEEVE_SCALE);
        r.v.reliefMat.uniforms.uRelief.value = 0.05; // más volumen mientras la gira
        r.v.reliefMat.uniforms.uParallax.value = 0.08;
        // reverso y vuelta al frente, con las dos manos en los lados
        const flip = ease(seg(p, 0.28, 0.58)) * Math.PI + ease(seg(p, 0.66, 0.96)) * Math.PI;
        sleeve.rotation.set(0, rd() ? 0 : flip, Math.sin(p * Math.PI) * -0.05);
        sleeve.position.y += Math.sin(p * Math.PI * 2) * 0.006;
        gripCam(sleeve.position, HALF_SLEEVE);
      },
    },
    slide: {
      enter() {
        disc.visible = true;
        disc.position.set(ITEM.x, ITEM.y, ITEM.z - 0.012);
        disc.rotation.set(Math.PI / 2, 0, 0);
        disc.scale.setScalar(1.05);
        sfx.slide();
      },
      step(r, p) {
        const out = ease(seg(p, 0, 0.3)); // sale por arriba de la funda
        const drop = ease(seg(p, 0.32, 0.6)); // suelta la funda
        const flip = ease(seg(p, 0.62, 0.96)) * Math.PI * 2; // lo gira: una cara y la otra
        const dz = ITEM.z - 0.012 + 0.04 * out;
        disc.position.set(ITEM.x, ITEM.y + 0.24 * out, dz);
        disc.rotation.set(Math.PI / 2, rd() ? 0 : flip, 0);
        disc.scale.setScalar(1.05 + (DISC_HELD - 1.05) * drop);
        spin.rotation.y = out * 1.2;
        // la funda cae y se aparta
        sleeve.position.set(ITEM.x - drop * 0.2, ITEM.y - drop * 0.7, ITEM.z);
        sleeve.rotation.z = drop * 0.5;
        sleeve.visible = drop < 1;
        // manos: en la funda mientras sale; luego en los bordes del disco
        if (p < 0.32) gripCam(sleeve.position, HALF_SLEEVE);
        else gripCam(disc.position, HALF_DISC);
      },
    },
    walk: {
      enter(r) {
        r.a = camera.position.clone();
        r.qa = camera.quaternion.clone();
        r.b = new THREE.Vector3(TURNTABLE_STAND.x, EYE, TURNTABLE_STAND.z);
        tmpCam.position.copy(r.b);
        tmpCam.lookAt(PLATTER.x, PLATTER.y, PLATTER.z);
        r.qb = tmpCam.quaternion.clone();
        r.base = disc.position.clone();
      },
      step(r, p, dt) {
        const e = ease(p);
        camera.position.lerpVectors(r.a, r.b, e);
        const bob = rd() ? 0 : Math.sin(p * Math.PI * 7) * 0.025 * Math.sin(p * Math.PI);
        camera.position.y = EYE + bob;
        camera.quaternion.slerpQuaternions(r.qa, r.qb, e);
        spin.rotation.y += dt * 0.5;
        disc.position.set(ITEM.x, ITEM.y + (rd() ? 0 : Math.sin(p * Math.PI * 7) * 0.012), ITEM.z);
        disc.rotation.set(Math.PI / 2 - 0.35 * ease(seg(p, 0.6, 1)), 0, 0);
        gripCam(disc.position, HALF_DISC);
      },
    },
    place: {
      enter(r) {
        camera.updateMatrixWorld(true);
        scene.attach(disc);
        r.dFrom = disc.position.clone();
        r.qFrom = disc.quaternion.clone();
        r.sFrom = disc.scale.x;
        r.dTo = new THREE.Vector3(PLATTER.x, PLATTER.y + 0.002, PLATTER.z);
        r.above = new THREE.Vector3(PLATTER.x, PLATTER.y + 0.22, PLATTER.z);
        r.sTo = PLATTER.r / DISC_R;
        r.identity = new THREE.Quaternion();
      },
      step(r, p) {
        if (p < 0.5) {
          // las manos suben el disco y lo llevan sobre el plato en arco
          const u = ease(p / 0.5);
          disc.position.lerpVectors(r.dFrom, r.above, u);
          disc.position.y += Math.sin(u * Math.PI) * 0.06;
          disc.quaternion.slerpQuaternions(r.qFrom, TILT, easeOut(u));
          disc.scale.setScalar(r.sFrom + (r.sTo - r.sFrom) * u);
        } else {
          // lo bajan acelerando y se nivela justo antes del plato
          const w = (p - 0.5) / 0.5;
          disc.position.set(r.above.x, r.above.y - (r.above.y - r.dTo.y) * easeIn(w), r.above.z);
          disc.quaternion.slerpQuaternions(TILT, r.identity, easeOut(clamp01(w * 1.4)));
          disc.scale.setScalar(r.sTo);
        }
        // las manos sujetan hasta casi tocar y luego sueltan
        if (p < 0.9) gripWorld(disc.position, 0.19);
        else if (!r.released) {
          r.released = true;
          arm.grip('r', null);
          arm.grip('l', null);
        }
        if (p >= 0.96 && !r.impact) {
          r.impact = true;
          sfx.thud();
          onImpact?.(0.5);
          dust();
          arm.swing();
        }
      },
    },
    play: {
      enter(r) {
        r.pb = camera.position.clone();
        r.spinVel = 0;
        sfx.startCrackle();
      },
      step(r, p, dt) {
        r.spinVel = Math.min(8, r.spinVel + dt * 14);
        spin.rotation.y += r.spinVel * dt;
        // rebote al caer en el plato
        disc.position.y = PLATTER.y + 0.002 + (p < 0.12 ? Math.sin((p / 0.12) * Math.PI) * 0.014 : 0);
        camera.position.z = r.pb.z - 0.3 * ease(p);
        if (rd()) return;
        noteTimer += dt;
        if (noteTimer > 0.11) {
          noteTimer = 0;
          const mesh = new THREE.Mesh(noteGeo, noteMats[Math.floor(Math.random() * noteMats.length)]);
          mesh.position.set(PLATTER.x + (Math.random() - 0.5) * 0.3, PLATTER.y + 0.25, PLATTER.z + (Math.random() - 0.5) * 0.3);
          scene.add(mesh);
          bits.push({ mesh, life: 0, max: 1.4, vel: new THREE.Vector3(0, 0.45, 0), seed: Math.random() * 6 });
          sfx.note(noteIndex++);
        }
      },
    },
    fade: {
      enter() {
        sfx.stopCrackle();
      },
      step(r, p) {
        onFade(p);
        if (p >= 1 && !r.entered) {
          r.entered = true;
          onEnter(r.v.slug);
        }
      },
    },
  };

  function enterPhase(i) {
    run.idx = i;
    phases[PHASES[i]].enter(run);
  }

  function clearBits() {
    bits.forEach((b) => scene.remove(b.mesh));
    bits = [];
  }

  function releaseRun() {
    discMat?.dispose();
    discMat = null;
    arm.grip('r', null);
    arm.grip('l', null);
  }

  return {
    get active() {
      return run !== null;
    },
    get phase() {
      return run ? PHASES[run.idx] : null;
    },
    /** 0 mientras agarra con las dos manos; 1 al caminar con el balanceo normal del brazo. */
    get armSpeed() {
      return 0;
    },
    /** Disco ya cargado (geometría y mapas de surcos). Sin él se usa un cilindro liso. */
    setDisc(a) {
      assets = a;
    },
    /** @param {{ slug: string, mesh: THREE.Object3D, home: THREE.Vector3, frontTex: THREE.Texture, source: CanvasImageSource, label: THREE.Color }} v */
    start(v) {
      if (run) return;
      sfx.unlock();
      dur = rd() ? DUR_REDUCED : DUR; // se decide al empezar cada secuencia
      run = { v, t: 0, idx: 0 };
      if (assets) {
        discMat = createDiscMaterial(assets, v.source, v.label, scene.environment);
        discMesh.geometry = assets.geometry;
        discMesh.material = discMat.material;
      }
      sleeve.visible = true;
      sleeve.position.set(0, 0, 0);
      sleeve.scale.setScalar(1);
      sleeve.rotation.set(0, 0, 0);
      held.visible = false;
      disc.visible = false;
      held.add(disc);
      phases.approach.enter(run);
    },
    /** Compila de antemano los materiales de la funda en la mano y del disco (hace visibles los objetos solo mientras compila). */
    async warm(compile, discMaterial) {
      const prev = [held.visible, sleeve.visible, disc.visible, discMesh.material, discMesh.geometry, frontMat.map];
      const tex = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1);
      tex.needsUpdate = true;
      frontMat.map = tex;
      frontMat.needsUpdate = true;
      if (discMaterial && assets) {
        discMesh.material = discMaterial;
        discMesh.geometry = assets.geometry;
      }
      held.visible = sleeve.visible = disc.visible = true;
      try {
        await compile();
      } finally {
        [held.visible, sleeve.visible, disc.visible, discMesh.material, discMesh.geometry, frontMat.map] = prev;
        frontMat.needsUpdate = true;
        tex.dispose();
      }
    },
    /** Cancela la secuencia y deja todo como estaba: la funda vuelve al estante y se sueltan las manos. */
    abort() {
      if (!run) return;
      run.v.mesh.visible = true;
      sfx.stopCrackle();
      releaseRun();
      clearBits();
      held.visible = false;
      disc.visible = false;
      sleeve.visible = false;
      held.add(disc);
      onFade(0);
      run = null;
    },
    /** Salta al fundido final. */
    skip() {
      if (!run) return;
      // idempotente: solo adelanta hasta el inicio del fundido. Si se repite (tecla mantenida), no lo reinicia.
      const fadeStart = PHASES.slice(0, -1).reduce((s, k) => s + dur[k], 0);
      if (run.t < fadeStart) run.t = fadeStart;
    },
    update(dt) {
      if (!run) return;
      run.t += dt;
      let t = run.t;
      let idx = 0;
      while (idx < PHASES.length - 1 && t >= dur[PHASES[idx]]) {
        t -= dur[PHASES[idx]];
        idx += 1;
      }
      while (run.idx < idx) {
        phases[PHASES[run.idx]].step(run, 1, 0);
        enterPhase(run.idx + 1);
      }
      const name = PHASES[idx];
      phases[name].step(run, clamp01(t / dur[name]), dt);
      if (idx >= PHASES.indexOf('play')) {
        arm.grip('r', null);
        arm.grip('l', null);
      }
      for (const b of bits) {
        b.life += dt;
        b.mesh.position.addScaledVector(b.vel, dt);
        if (b.seed) b.mesh.position.x += Math.sin(b.life * 4 + b.seed) * dt * 0.1;
        b.mesh.scale.setScalar(Math.max(0.01, (b.seed ? 1 : 0.6) * (1 - b.life / b.max)));
      }
      bits = bits.filter((b) => {
        if (b.life < b.max) return true;
        scene.remove(b.mesh);
        return false;
      });
    },
    dispose() {
      sfx.stopCrackle();
      releaseRun();
      clearBits();
      camera.remove(held);
      scene.remove(disc);
      [sleeve.geometry, reliefGeo, noteGeo, fallbackGeo].forEach((g) => g.dispose());
      [cardboard, backMat, frontMat, dustMat, discMesh.material, ...noteMats].forEach((m) => m.dispose());
      run = null;
    },
  };
}
