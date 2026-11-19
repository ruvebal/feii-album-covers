// Brazos de Steve en primera persona, como los de Minecraft: cajas de píxeles cuadrados (manga cian y piel).
// Cada brazo cuelga de la cámara y apunta su extremo de la mano a donde se le diga: en reposo el derecho está
// abajo a la derecha (el izquierdo fuera de plano); con grip() agarran un objeto por los lados y lo siguen.
// Los brazos son largos a propósito: salen del borde de la pantalla y llegan al objeto estés donde estés.

import * as THREE from 'three';
import { nearestTexture } from './pixel.js';

const PX = 8; // cada «píxel» de Minecraft son 8 px de lienzo
const ROWS = 32;
const SLEEVE_ROWS = 24; // manga larga cian; las 8 filas de la punta son piel
const W = 0.15;
const LEN = 1.2;
const SKIN = [[190, 134, 98], [181, 126, 91], [198, 142, 106]];
const SLEEVE = [[28, 168, 170], [22, 150, 152], [36, 180, 182]];

const Y = new THREE.Vector3(0, 1, 0);
const REST_TIP = { r: new THREE.Vector3(0.27, -0.3, -0.42), l: new THREE.Vector3(-0.5, -0.95, -0.3) };
const SHOULDER = { r: new THREE.Vector3(0.62, -0.95, 0.15), l: new THREE.Vector3(-0.62, -0.95, 0.15) };
const REST_DIR = { r: new THREE.Vector3(0.28, -0.62, 0.72).normalize(), l: new THREE.Vector3(-0.3, -0.7, 0.65).normalize() };

function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

function sideTexture(shade, seed) {
  const r = rng(seed);
  const c = document.createElement('canvas');
  c.width = 4 * PX;
  c.height = ROWS * PX;
  const g = c.getContext('2d');
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < 4; x++) {
      const pal = y < SLEEVE_ROWS ? SLEEVE : SKIN;
      const col = pal[Math.floor(r() * pal.length)];
      const k = shade * (y === SLEEVE_ROWS ? 0.82 : 1); // sombra bajo el borde de la manga
      g.fillStyle = `rgb(${Math.round(col[0] * k)},${Math.round(col[1] * k)},${Math.round(col[2] * k)})`;
      g.fillRect(x * PX, y * PX, PX, PX);
    }
  }
  return nearestTexture(c);
}

function capTexture(pal, shade, seed) {
  const r = rng(seed);
  const c = document.createElement('canvas');
  c.width = c.height = 4 * PX;
  const g = c.getContext('2d');
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const col = pal[Math.floor(r() * pal.length)];
      g.fillStyle = `rgb(${Math.round(col[0] * shade)},${Math.round(col[1] * shade)},${Math.round(col[2] * shade)})`;
      g.fillRect(x * PX, y * PX, PX, PX);
    }
  }
  return nearestTexture(c);
}

export function createSteveArm(camera) {
  const textures = [sideTexture(0.92, 7), sideTexture(0.7, 11), sideTexture(1, 13), sideTexture(0.8, 17), capTexture(SLEEVE, 1, 3), capTexture(SKIN, 0.85, 5)];
  // caras de BoxGeometry: +x, -x, +y (extremo del hombro), -y (la mano), +z, -z
  // un solo material en todas las caras = una llamada de dibujo por brazo (con 6 eran 6)
  const mats = [new THREE.MeshBasicMaterial({ map: textures[0] })];
  const geo = new THREE.BoxGeometry(W, LEN, W);

  function build() {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(geo, mats[0]);
    mesh.position.y = LEN / 2; // el extremo de la mano queda en el origen del grupo
    group.add(mesh);
    camera.add(group);
    return { group, b: 0, target: null, tip: new THREE.Vector3(), dir: new THREE.Vector3() };
  }
  const arms = { r: build(), l: build() };
  arms.l.group.visible = false;

  let swingT = -1;
  let bob = 0;
  let breath = 0;
  const tmpTip = new THREE.Vector3();
  const tmpDir = new THREE.Vector3();
  const gripDir = new THREE.Vector3();

  return {
    /**
     * Agarra: la punta del brazo va a `pos` (espacio de la cámara) y lo sigue; null lo suelta.
     * @param {'r' | 'l'} side @param {THREE.Vector3 | null} pos
     */
    grip(side, pos) {
      const a = arms[side];
      if (pos) {
        if (!a.target) a.target = new THREE.Vector3();
        a.target.copy(pos);
      } else a.target = null;
    },
    get gripping() {
      return Boolean(arms.r.target || arms.l.target);
    },
    /** Golpe de brazo (0,32 s), como el clic izquierdo de Minecraft. */
    swing() {
      swingT = 0;
    },
    /** @param {number} speed 0..1 velocidad al caminar */
    update(dt, speed, reduced) {
      bob += dt * (3 + speed * 9);
      breath += dt;
      const k = reduced ? 0 : speed;
      let sw = 0;
      if (swingT >= 0) {
        swingT += dt / 0.32;
        sw = Math.sin(Math.min(swingT, 1) * Math.PI);
        if (swingT >= 1) swingT = -1;
      }
      for (const side of ['r', 'l']) {
        const a = arms[side];
        a.b += ((a.target ? 1 : 0) - a.b) * Math.min(1, dt * (a.target ? 11 : 7));
        // reposo: el derecho balancea al caminar y golpea; el izquierdo espera fuera de plano
        tmpTip.copy(REST_TIP[side]);
        tmpDir.copy(REST_DIR[side]);
        if (side === 'r') {
          tmpTip.x += Math.sin(bob * 0.5) * 0.03 * k - sw * 0.09;
          tmpTip.y += Math.abs(Math.sin(bob)) * 0.04 * k + (reduced ? 0 : Math.sin(breath * 1.6) * 0.004) + sw * 0.12;
          tmpTip.z -= sw * 0.2;
          tmpDir.y -= sw * 0.25;
          tmpDir.normalize();
        }
        if (a.target) {
          gripDir.copy(SHOULDER[side]).sub(a.target).normalize();
          tmpTip.lerp(a.target, a.b);
          tmpDir.lerp(gripDir, a.b).normalize();
        } else if (a.b > 0.001) {
          // soltando: sigue la última posición hacia el reposo
          tmpTip.lerp(a.tip, a.b);
          tmpDir.lerp(a.dir, a.b).normalize();
        }
        if (a.target) {
          a.tip.copy(tmpTip);
          a.dir.copy(tmpDir);
        }
        a.group.position.copy(tmpTip);
        a.group.quaternion.setFromUnitVectors(Y, tmpDir);
        if (side === 'l') a.group.visible = a.b > 0.02 || Boolean(a.target);
      }
    },
    dispose() {
      camera.remove(arms.r.group);
      camera.remove(arms.l.group);
      geo.dispose();
      mats.forEach((m) => m.dispose());
      textures.forEach((t) => t.dispose());
    },
  };
}
