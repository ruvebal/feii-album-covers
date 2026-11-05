import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

// Mismas bandas que en el shader del vinilo (recordFragment)
const R0 = 0.66, R1 = 0.975, N = 18;
const bandRadius = (i) => R1 - ((i + 0.5) / N) * (R1 - R0);

/**
 * Brazo de tocadiscos: pivota arriba a la izquierda del vinilo, gira hasta la banda
 * de la canción señalada y baja la aguja. Si no hay canción, se levanta y vuelve al reposo.
 */
export function createTonearm({ R, renderer, scene }) {
  // reflejos metálicos: entorno neutro solo para los materiales estándar (el vinilo usa su shader)
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const envTarget = pmrem.fromScene(room, 0.04);
  scene.environment = envTarget.texture;
  scene.environmentIntensity = 0.32;

  const P = new THREE.Vector2(-R * 1.15, R * 0.78); // pivote
  const L = R * 1.1;                                // largo del brazo hasta la aguja
  const D = P.length();
  const toCenter = Math.atan2(-P.y, -P.x);
  const REST = -Math.PI / 2 - 0.04;                 // apuntando hacia abajo, fuera del disco
  const DOWN_Z = 0.15, UP_Z = 0.45;                 // altura del brazo con la aguja apoyada / levantada

  // ángulo del brazo para que la aguja caiga a radio r del centro (ley del coseno)
  const angleFor = (r) => {
    const c = THREE.MathUtils.clamp((D * D + L * L - r * r) / (2 * D * L), -1, 1);
    return toCenter - Math.acos(c);
  };

  const metal = new THREE.MeshStandardMaterial({ color: '#8f96d8', metalness: 1, roughness: 0.38 });
  const dark = new THREE.MeshStandardMaterial({ color: '#141638', metalness: 0.6, roughness: 0.5 });
  const along = (geo) => geo.rotateZ(-Math.PI / 2); // cilindros a lo largo del eje X
  const upright = (geo) => geo.rotateX(Math.PI / 2); // cilindros a lo largo del eje Z

  const root = new THREE.Group();
  root.position.set(P.x, P.y, 0);

  const base = new THREE.Mesh(upright(new THREE.CylinderGeometry(0.34, 0.4, 0.12, 48)), dark);
  base.position.z = 0.06;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.02, 12, 64), metal);
  ring.position.z = 0.12;
  const post = new THREE.Mesh(upright(new THREE.CylinderGeometry(0.07, 0.09, 0.4, 24)), metal);
  post.position.z = 0.25;
  root.add(base, ring, post);

  // pivot gira en Z (barrido sobre el disco); arm sube y baja
  const pivot = new THREE.Group();
  const arm = new THREE.Group();
  pivot.add(arm);
  root.add(pivot);

  const tube = new THREE.Mesh(along(new THREE.CylinderGeometry(0.032, 0.032, L, 16)), metal);
  tube.position.x = L / 2 - 0.05;
  const weight = new THREE.Mesh(along(new THREE.CylinderGeometry(0.15, 0.15, 0.3, 32)), dark);
  weight.position.x = -0.38;
  const weightRing = new THREE.Mesh(along(new THREE.CylinderGeometry(0.155, 0.155, 0.04, 32)), metal);
  weightRing.position.x = -0.25;
  const hinge = new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16), metal);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.17, 0.04), metal);
  head.position.set(L - 0.02, 0, 0);
  const cart = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.11, 0.1), dark);
  cart.position.set(L, 0, -0.07);
  // punta de la aguja: punto rosa que recoge el bloom
  const tip = new THREE.Mesh(
    new THREE.SphereGeometry(0.03, 16, 12),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.5, 1.4) })
  );
  tip.position.set(L, 0, -0.13);
  arm.add(tube, weight, weightRing, hinge, head, cart, tip);
  arm.position.z = UP_Z;

  // sombra de contacto: sin ella el brazo parece flotar sobre el disco
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(L + 0.7, 0.5),
    new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { uOpacity: { value: 0.3 } },
      vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `varying vec2 vUv; uniform float uOpacity;
        void main(){
          float y = 1.0 - smoothstep(0.0, 0.5, abs(vUv.y - 0.5));
          float x = smoothstep(0.0, 0.12, vUv.x) * smoothstep(1.0, 0.9, vUv.x);
          gl_FragColor = vec4(0.0, 0.0, 0.02, y * y * x * uOpacity);
        }`,
    })
  );
  shadow.renderOrder = 2;
  shadow.position.set((L + 0.7) / 2 - 0.55, 0, 0.012);
  pivot.add(shadow);

  let angle = REST, lift = 1;

  function update(dt, trackIndex, intro, spin) {
    const playing = trackIndex >= 0;
    const goal = playing ? angleFor(bandRadius(trackIndex) * R) : REST;
    // primero se levanta, luego se mueve y, al llegar, baja la aguja
    const arrived = Math.abs(angle - goal) < 0.012;
    lift += ((playing && arrived ? 0 : 1) - lift) * (1 - Math.exp(-dt * 7));
    if (lift > 0.8 || arrived) angle += (goal - angle) * (1 - Math.exp(-dt * 5));

    // con la aguja apoyada sigue el leve alabeo del disco al girar
    const wobble = (1 - lift) * Math.sin(spin) * 0.004;
    pivot.rotation.z = angle + wobble;
    arm.position.z = DOWN_Z + (UP_Z - DOWN_Z) * lift;
    arm.rotation.y = -0.05 * lift; // la punta sube un poco más que el contrapeso
    shadow.position.y = -0.12 * lift;
    shadow.material.uniforms.uOpacity.value = 0.55 - 0.3 * lift;

    // entrada: llega deslizándose desde la izquierda tras el vinilo
    root.position.x = P.x - (1 - intro) * 2.5;
    root.position.z = -(1 - intro) * 1.5;
  }

  function dispose() {
    envTarget.dispose();
    pmrem.dispose();
    room.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.(); });
  }

  return { group: root, update, dispose };
}
