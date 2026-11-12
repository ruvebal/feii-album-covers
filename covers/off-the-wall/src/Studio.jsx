// Lo que nunca sale en la portada: el plató de la sesión de fotos.
// Se descubre al ponerse detrás de Michael o al pedir la vista "El plató":
// cámara en trípode, dos ventanas de luz, un paraguas, un reflector, una
// bandera negra, el burro de vestuario con los esmóquines, la silla de
// director, baúles de material, la
// alfombra, el cable por el suelo y las paredes del estudio con la puerta y
// el piloto rojo de "en sesión". Todo es atrezo inventado, hecho con código.
// Al hacer la foto, las ventanas de luz destellan (prop `flash`).
//
// Rendimiento: el plató se monta una vez como un árbol de three y se "hornea":
// todas las piezas con el mismo material se funden en una sola geometría. Son
// unas 13 llamadas de dibujo en vez de más de 150, y así la vista "El plató"
// cabe en el tope de móvil. Nada del plató proyecta sombra.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  BoxGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  CylinderGeometry,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector3,
} from 'three';

/** Materiales del plató (uno por grupo horneado). */
function makeMaterials() {
  return {
    metal: new MeshStandardMaterial({ color: '#2b2b2e', roughness: 0.35, metalness: 0.85 }),
    black: new MeshStandardMaterial({ color: '#141416', roughness: 0.55, side: DoubleSide }),
    body: new MeshStandardMaterial({ color: '#1d1d20', roughness: 0.4, metalness: 0.3 }),
    glass: new MeshStandardMaterial({ color: '#0a1420', roughness: 0.05, metalness: 0.6 }),
    silver: new MeshStandardMaterial({ color: '#cfd2d6', roughness: 0.25, metalness: 0.9, side: DoubleSide }),
    wood: new MeshStandardMaterial({ color: '#6e4a2c', roughness: 0.7 }),
    // Lona roja de la silla, etiqueta del disco y fundas.
    canvas: new MeshStandardMaterial({ color: '#8a2420', roughness: 0.85, side: DoubleSide }),
    // Tela blanca: camisas del burro, paraguas y la taza.
    cloth: new MeshStandardMaterial({ color: '#ece7dd', roughness: 0.8, side: DoubleSide }),
    rug: new MeshStandardMaterial({ color: '#4a2620', roughness: 1 }),
    // Paredes del estudio, oscuras para que no compitan con la pared de ladrillo.
    room: new MeshStandardMaterial({ color: '#2a2421', roughness: 0.95 }),
    // Piloto rojo encendido sobre la puerta: "en sesión".
    lamp: new MeshStandardMaterial({ color: '#ff3b2e', emissive: '#ff2a1f', emissiveIntensity: 2.2 }),
    // Tela difusora de las ventanas de luz: emite, y el destello la sube.
    diffuser: new MeshStandardMaterial({ color: '#ffffff', emissive: '#fff4e2', emissiveIntensity: 1.6, side: DoubleSide }),
  };
}

/** Pieza suelta con su posición y giro; `mat` dice en qué grupo se funde. */
function part(parent, geometry, mat, position = [0, 0, 0], rotation = [0, 0, 0]) {
  const m = new Mesh(geometry);
  m.position.set(...position);
  m.rotation.set(...rotation);
  m.userData.mat = mat;
  parent.add(m);
  return m;
}

function node(parent, position = [0, 0, 0], rotation = [0, 0, 0]) {
  const g = new Group();
  g.position.set(...position);
  g.rotation.set(...rotation);
  parent.add(g);
  return g;
}

/** Pie de estudio de tres patas con una columna central. */
function stand(parent, height) {
  for (let i = 0; i < 3; i += 1) {
    const leg = node(parent, [0, 0, 0], [0, (i / 3) * Math.PI * 2, 0]);
    part(leg, new CylinderGeometry(0.011, 0.011, 0.5, 8), 'metal', [0, 0.19, 0.16], [-0.72, 0, 0]);
  }
  part(parent, new CylinderGeometry(0.016, 0.02, height, 10), 'metal', [0, height / 2, 0]);
}

/** Ventana de luz (softbox) que apunta a Michael. */
function softbox(parent, position, rotationY) {
  const g = node(parent, position, [0, rotationY, 0]);
  stand(g, 1.7);
  const head = node(g, [0, 1.75, 0], [0.12, 0, 0]);
  // Caja negra de tela en forma de pirámide; el difusor blanco la cierra delante.
  part(head, new CylinderGeometry(0.36, 0.08, 0.34, 4, 1), 'black', [0, 0, -0.18], [Math.PI / 2, Math.PI / 4, 0]);
  part(head, new PlaneGeometry(0.5, 0.5), 'diffuser', [0, 0, -0.01]);
}

/** Cámara de medio formato sobre trípode, mirando a Michael. */
function camera(parent) {
  const g = node(parent, [0.9, 0, 3.9], [0, Math.PI + 0.23, 0]);
  stand(g, 1.0);
  const body = node(g, [0, 1.07, 0]);
  part(body, new BoxGeometry(0.15, 0.13, 0.12), 'body');
  part(body, new BoxGeometry(0.1, 0.05, 0.09), 'black', [0, 0.085, -0.01]);
  part(body, new CylinderGeometry(0.042, 0.048, 0.12, 20), 'black', [0, 0, 0.11], [Math.PI / 2, 0, 0]);
  part(body, new CylinderGeometry(0.036, 0.036, 0.006, 20), 'glass', [0, 0, 0.172], [Math.PI / 2, 0, 0]);
}

/** Paraguas de luz blanco sobre su pie, inclinado hacia Michael. */
function umbrella(parent, position, rotationY) {
  const g = node(parent, position, [0, rotationY, 0]);
  stand(g, 1.85);
  const head = node(g, [0, 1.9, 0], [-1.1, 0, 0]);
  part(head, new CylinderGeometry(0.55, 0.02, 0.32, 14, 1, true), 'cloth', [0, 0.1, 0]);
  part(head, new CylinderGeometry(0.008, 0.008, 0.7, 6), 'metal', [0, 0.05, 0]);
}

/** Bandera negra en un pie de estudio: corta la luz que se escapa. */
function flag(parent, position, rotationY) {
  const g = node(parent, position, [0, rotationY, 0]);
  stand(g, 1.4);
  part(g, new CylinderGeometry(0.01, 0.01, 0.7, 6), 'metal', [0.3, 1.42, 0], [0, 0, Math.PI / 2]);
  part(g, new BoxGeometry(0.5, 0.62, 0.012), 'black', [0.62, 1.42, 0]);
}

/** Burro de vestuario con ruedas, esmóquines negros y camisas blancas en perchas. */
function wardrobe(parent, position, rotationY) {
  const g = node(parent, position, [0, rotationY, 0]);
  for (const x of [-0.62, 0.62]) {
    part(g, new CylinderGeometry(0.015, 0.015, 1.55, 8), 'metal', [x, 0.83, 0]);
    part(g, new BoxGeometry(0.04, 0.03, 0.46), 'metal', [x, 0.07, 0]);
    for (const z of [-0.21, 0.21]) {
      part(g, new CylinderGeometry(0.03, 0.03, 0.025, 10), 'black', [x, 0.03, z], [0, 0, Math.PI / 2]);
    }
  }
  part(g, new CylinderGeometry(0.014, 0.014, 1.26, 8), 'metal', [0, 1.6, 0], [0, 0, Math.PI / 2]);
  [-0.47, -0.3, -0.13, 0.06, 0.24, 0.44].forEach((x, i) => {
    const shirt = i % 3 === 1;
    // La prenda cuelga perpendicular a la barra: hombros, cuerpo y el gancho.
    part(g, new BoxGeometry(0.07, shirt ? 0.72 : 0.8, shirt ? 0.36 : 0.44), shirt ? 'cloth' : 'black', [x, shirt ? 1.18 : 1.14, 0]);
    part(g, new TorusGeometry(0.03, 0.005, 4, 10, Math.PI), 'metal', [x, 1.6, 0], [0, Math.PI / 2, 0]);
  });
}

/** Silla de director de madera con lona roja, mirando a Michael. */
function directorChair(parent, position, rotationY) {
  const g = node(parent, position, [0, rotationY, 0]);
  for (const x of [-0.24, 0.24]) {
    for (const r of [0.5, -0.5]) part(g, new BoxGeometry(0.03, 0.6, 0.03), 'wood', [x, 0.28, 0], [r, 0, 0]);
    part(g, new BoxGeometry(0.03, 0.44, 0.03), 'wood', [x, 0.74, -0.17]);
    part(g, new BoxGeometry(0.045, 0.03, 0.42), 'wood', [x, 0.66, 0]);
  }
  part(g, new BoxGeometry(0.48, 0.02, 0.36), 'canvas', [0, 0.52, 0]);
  part(g, new BoxGeometry(0.48, 0.17, 0.012), 'canvas', [0, 0.86, -0.17]);
}

/** Baúl de material con cantoneras de metal. */
function flightCase(parent, position, size, rotationY) {
  const g = node(parent, position, [0, rotationY, 0]);
  const [w, h, dd] = size;
  part(g, new BoxGeometry(w, h, dd), 'body', [0, h / 2, 0]);
  for (const y of [0.012, h - 0.012, h / 2]) part(g, new BoxGeometry(w + 0.012, 0.024, dd + 0.012), 'metal', [0, y, 0]);
}

/** Paredes del estudio (detrás de las cámaras y a los lados), con la puerta y el piloto. */
function room(parent) {
  part(parent, new PlaneGeometry(12, 4.6), 'room', [0, 2.3, 10.5], [0, Math.PI, 0]);
  for (const s of [-1, 1]) part(parent, new PlaneGeometry(11.5, 4.6), 'room', [s * 4.3, 2.3, 4.75], [0, -s * (Math.PI / 2), 0]);
  // Puerta de salida en la pared del fondo, con su marco, y el piloto encima.
  part(parent, new BoxGeometry(1.0, 2.1, 0.04), 'black', [-2.6, 1.05, 10.47]);
  part(parent, new BoxGeometry(1.14, 2.2, 0.02), 'metal', [-2.6, 1.1, 10.49]);
  part(parent, new BoxGeometry(0.3, 0.12, 0.06), 'lamp', [-2.6, 2.42, 10.46]);
}

/** Cable negro por el suelo: de la ventana de luz a la cámara y hasta el fondo. */
function cable(parent) {
  const pts = [
    [-2.1, 2.7],
    [-1.4, 3.3],
    [-0.4, 3.5],
    [0.6, 3.95],
    [1.2, 4.8],
    [1.6, 6.2],
    [2.2, 7.4],
    [3.6, 8.2],
  ].map(([x, z]) => new Vector3(x, 0.012, z));
  part(parent, new TubeGeometry(new CatmullRomCurve3(pts), 60, 0.012, 5), 'black');
}

/** Monta el plató y funde las piezas por material. */
function bakeStudio() {
  const root = new Group();
  softbox(root, [-2.1, 0, 2.7], Math.PI - 0.66);
  softbox(root, [2.3, 0, 2.2], Math.PI + 0.82);
  camera(root);
  // Reflector plateado en el suelo, a la izquierda de Michael.
  part(root, new CircleGeometry(0.42, 40), 'silver', [-1.7, 0.42, 2.0], [-0.35, 2.44, 0]);
  // Atrezo detrás de las cámaras, siempre a más de 1,3 m del centro para no
  // tapar a Michael desde la cámara de la portada (en un móvil se aleja ~8,6 m).
  umbrella(root, [2.9, 0, 3.3], -2.4);
  flag(root, [-3.7, 0, 3.3], 0.9);
  wardrobe(root, [-2.75, 0, 6.1], Math.PI / 2 - 0.25);
  part(root, new CircleGeometry(1.15, 32), 'rug', [-1.75, 0.004, 6.6], [-Math.PI / 2, 0, 0]);
  directorChair(root, [-1.55, 0, 6.3], Math.PI - 0.35);
  // La mesa del tocadiscos es interactiva: va aparte, en RecordPlayer.jsx.
  flightCase(root, [2.0, 0, 7.7], [0.7, 0.45, 0.5], 0.2);
  flightCase(root, [2.05, 0.45, 7.68], [0.55, 0.35, 0.42], 0.05);
  flightCase(root, [-2.7, 0, 8.3], [0.8, 0.5, 0.55], -0.3);
  cable(root);
  room(root);

  root.updateMatrixWorld(true);
  /** @type {Record<string, import('three').BufferGeometry[]>} */
  const groups = {};
  root.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.clone().applyMatrix4(o.matrixWorld);
    o.geometry.dispose();
    (groups[o.userData.mat] ??= []).push(g);
  });
  return Object.fromEntries(
    Object.entries(groups).map(([mat, list]) => {
      const merged = mergeGeometries(list);
      list.forEach((g) => g.dispose());
      return [mat, merged];
    }),
  );
}

/** @param {{ flash: number | null }} props  `flash` = instante (s) de la última foto. */
export default function Studio({ flash }) {
  const res = useMemo(() => ({ mats: makeMaterials(), geos: bakeStudio() }), []);
  useEffect(
    () => () => {
      Object.values(res.mats).forEach((m) => m.dispose());
      Object.values(res.geos).forEach((g) => g.dispose());
    },
    [res],
  );
  // Malla de los difusores: el destello cambia su material a través de la ref.
  const diffuser = useRef(/** @type {import('three').Mesh | null} */ (null));

  useFrame(() => {
    // Destello corto: los difusores suben mucho y vuelven en 0,4 s.
    let k = 0;
    if (flash !== null) {
      const dt = performance.now() / 1000 - flash;
      if (dt >= 0 && dt < 0.4) k = 1 - dt / 0.4;
    }
    if (diffuser.current) diffuser.current.material.emissiveIntensity = 1.6 + k * 10;
  });

  return (
    <group>
      {Object.entries(res.geos).map(([mat, geo]) => (
        <mesh
          key={mat}
          ref={mat === 'diffuser' ? diffuser : undefined}
          geometry={geo}
          material={res.mats[mat]}
        />
      ))}
    </group>
  );
}
