// Mesa con el tocadiscos del plató: al pulsarlo se abre allí mismo la lista de
// canciones del disco para elegir una (suenan los fragmentos de Apple Music).
// Cuando suena música, el disco gira a 33⅓ vueltas por minuto y el brazo se
// pone encima del vinilo; al pararla, el brazo vuelve a su soporte.
//
// Las piezas fijas y los surcos van fundidos por material.

import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BoxGeometry, Color, CylinderGeometry, DoubleSide, Euler, Float32BufferAttribute, Matrix4, MeshStandardMaterial, Quaternion, RingGeometry, SphereGeometry, TextureLoader, Vector3 } from 'three';
import { goTo } from './cameraEvents.js';
import { VIEWS } from './set.js';
import { COVER_URLS, createSleeves, setSleeveLabelSlot, sleeveGeometry, sleeveLabelGeometry } from './sleeves.js';

// Junto a la pared derecha del plató, girada hacia Michael.
const POSITION = [2.55, 0, 4.85];
const ROT_Y = -Math.PI / 2 + 0.2;
// 33⅓ vueltas por minuto, en radianes por segundo.
const SPIN = (33.33 / 60) * Math.PI * 2;
// Giro del brazo: en reposo y encima del disco.
const ARM_REST = 0.55;
const ARM_PLAY = 0.05;
// Centro del plato y de dónde sale el disco de cada funda (coordenadas de la mesa).
const PLATTER = [-0.15, 0.828, 0];
const SLEEVE_SPOTS = {
  otw: [-0.27, 0.76, 0.17],
  abc: [0.2, 0.95, -0.16],
  xmas: [0.27, 0.76, 0.06],
  jacksons: [-0.2, 0.95, -0.21],
  diana: [0.52, 0.77, -0.02],
};
const LABEL_SLOT = { abc: 0, xmas: 1, jacksons: 2, otw: 3, diana: 4 };

/** Pieza colocada (posición y giro) lista para fundir con otras del mismo material. */
function piece(geo, pos, rot = [0, 0, 0]) {
  geo.applyMatrix4(new Matrix4().compose(new Vector3(...pos), new Quaternion().setFromEuler(new Euler(...rot)), new Vector3(1, 1, 1)));
  return geo;
}

function fuse(parts) {
  const g = mergeGeometries(parts);
  parts.forEach((p) => p.dispose());
  return g;
}

function vinylGeometry() {
  const disc = new CylinderGeometry(0.15, 0.15, 0.006, 40);
  const rings = Array.from({ length: 10 }, (_, i) =>
    piece(new RingGeometry(0.064 + i * 0.008, 0.065 + i * 0.008, 64), [0, 0.0031, 0], [-Math.PI / 2, 0, 0]),
  );
  for (const [parts, hex] of [[[disc], '#0b0b0d'], [rings, '#323235']]) {
    const color = new Color(hex);
    for (const geometry of parts) {
      const values = new Float32Array(geometry.attributes.position.count * 3);
      for (let i = 0; i < values.length; i += 3) {
        values[i] = color.r;
        values[i + 1] = color.g;
        values[i + 2] = color.b;
      }
      geometry.setAttribute('color', new Float32BufferAttribute(values, 3));
    }
  }
  return fuse([disc, ...rings]);
}

/** Color liso en los vértices (la mesa lleva varios tonos en una sola malla). */
function tint(geo, hex) {
  const color = new Color(hex);
  const values = new Float32Array(geo.attributes.position.count * 3);
  for (let i = 0; i < values.length; i += 3) {
    values[i] = color.r;
    values[i + 1] = color.g;
    values[i + 2] = color.b;
  }
  geo.setAttribute('color', new Float32BufferAttribute(values, 3));
  return geo;
}

// Lomos de los discos guardados en la balda de abajo.
const SPINES = ['#8a2420', '#d9b44a', '#1f4f7a', '#e8e2d2', '#2f7a3a', '#b4553a', '#3a2a5c', '#c9962a', '#141416', '#a33a6a'];

/**
 * Mueble del tocadiscos, de los setenta: tablero de nogal con canto, faldón
 * con dos cajones y tiradores de latón, patas cónicas abiertas con puntera de
 * latón y una balda abajo con una fila de discos. Todo en una malla (los
 * tonos van en el color de los vértices), más la caja de nogal del tocadiscos.
 */
function furniture() {
  const WALNUT = '#74502f';
  const DARK = '#4f331f';
  const BRASS = '#c09a45';
  const cx = 0.13;
  const parts = [
    // Tablero (la cara de arriba queda a 0,74 m) y su canto más oscuro.
    tint(piece(new BoxGeometry(1.14, 0.03, 0.56), [cx, 0.725, 0]), WALNUT),
    tint(piece(new BoxGeometry(1.15, 0.022, 0.57), [cx, 0.701, 0]), DARK),
    // Faldón con dos cajones y sus tiradores.
    tint(piece(new BoxGeometry(1.02, 0.1, 0.46), [cx, 0.64, 0]), DARK),
    ...[-0.255, 0.255].flatMap((x) => [
      tint(piece(new BoxGeometry(0.47, 0.076, 0.014), [cx + x, 0.64, 0.234]), WALNUT),
      tint(piece(new SphereGeometry(0.013, 12, 8), [cx + x, 0.64, 0.25]), BRASS),
    ]),
    // Balda de abajo.
    tint(piece(new BoxGeometry(0.96, 0.022, 0.38), [cx, 0.24, 0]), WALNUT),
    // Caja de nogal del tocadiscos.
    tint(piece(new BoxGeometry(0.44, 0.06, 0.35), [-0.12, 0.77, 0]), '#6e4a2c'),
  ];
  // Patas cónicas, abiertas hacia fuera, con puntera de latón.
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      // La pata sale de la esquina del faldón y baja abriéndose hacia fuera;
      // la puntera sigue su misma línea hasta el suelo.
      const rot = [-sz * 0.07, 0, sx * 0.09];
      const x = cx + sx * 0.47;
      const z = sz * 0.2;
      parts.push(
        tint(piece(new CylinderGeometry(0.03, 0.016, 0.56, 12), [x + sx * 0.025, 0.34, z + sz * 0.02], rot), DARK),
        tint(piece(new CylinderGeometry(0.017, 0.013, 0.07, 12), [x + sx * 0.053, 0.033, z + sz * 0.041], rot), BRASS),
      );
    }
  }
  // Discos de pie en la balda: cada lomo de un color y un poco ladeado.
  for (let i = 0; i < 34; i += 1) {
    const n = Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1;
    parts.push(
      tint(
        piece(new BoxGeometry(0.009, 0.31, 0.31), [-0.2 + i * 0.0135, 0.406, -0.01 + (n - 0.5) * 0.02], [0, 0, (n - 0.5) * 0.05]),
        SPINES[Math.floor(n * 97) % SPINES.length],
      ),
    );
  }
  // Y un par de discos apoyados contra la fila, torcidos.
  parts.push(
    tint(piece(new BoxGeometry(0.009, 0.31, 0.31), [0.3, 0.4, 0], [0, 0, -0.22]), '#d9b44a'),
    tint(piece(new BoxGeometry(0.009, 0.31, 0.31), [0.335, 0.397, 0.01], [0, 0, -0.3]), '#1f4f7a'),
  );
  return fuse(parts);
}

/** Geometrías fijas por material: mueble, tocadiscos, fundas y taza. */
function buildParts() {
  return {
    wood: furniture(),
    // Placa negra de arriba, soporte del brazo, mandos y patas de goma.
    deck: fuse([
      piece(new BoxGeometry(0.43, 0.018, 0.34), [-0.12, 0.809, 0]),
      piece(new CylinderGeometry(0.018, 0.022, 0.03, 12), [0.03, 0.833, 0.11]),
      piece(new CylinderGeometry(0.004, 0.004, 0.06, 6), [0.072, 0.838, 0.13], [0, 0, Math.PI / 2]),
      ...[-0.31, 0.07].flatMap((x) => [-0.15, 0.15].map((z) => piece(new CylinderGeometry(0.02, 0.022, 0.012, 10), [x, 0.746, z]))),
    ]),
    // Plato de aluminio con su borde, el eje, el cabezal y el contrapeso del
    // brazo, y los mandos (marcha y 33/45).
    platter: fuse([
      piece(new CylinderGeometry(0.158, 0.16, 0.012, 48), [-0.15, 0.818, 0]),
      piece(new CylinderGeometry(0.022, 0.022, 0.014, 12), [0.06, 0.825, -0.13]),
      piece(new CylinderGeometry(0.016, 0.016, 0.012, 12), [0.01, 0.824, -0.13]),
      piece(new BoxGeometry(0.05, 0.006, 0.02), [-0.29, 0.82, 0.14]),
    ]),
    // Tapa de metacrilato abierta hacia atrás, con sus bisagras.
    lid: piece(new BoxGeometry(0.43, 0.004, 0.34), [-0.12, 0.98, -0.31], [-1.05, 0, 0]),
    // Etiqueta del disco y el eje, encima del vinilo.
    spindle: new CylinderGeometry(0.004, 0.004, 0.02, 8),
    // La taza de café.
    light: piece(new CylinderGeometry(0.036, 0.03, 0.09, 14), [0.28, 0.785, 0.13]),
    // Discos de los Jackson 5 en la mesa (portadas en el atlas de sleeves.js):
    // ABC y The Jacksons de pie, el Christmas Album tumbado.
    abc: piece(sleeveGeometry(0), [0.2, 0.89, -0.16], [-0.32, 0, 0]),
    xmas: piece(sleeveGeometry(1), [0.27, 0.745, 0.06], [-Math.PI / 2, 0, 0.35]),
    jacksons: piece(sleeveGeometry(2), [-0.2, 0.89, -0.215], [-0.28, 0.1, 0]),
    // Y el propio Off the Wall en físico, tumbado en la esquina de la mesa.
    otw: piece(sleeveGeometry(3), [-0.27, 0.745, 0.17], [-Math.PI / 2, 0, -0.25]),
    // Diana Ross Presents The Jackson 5 (1969), tumbado en el extremo derecho,
    // torcido y un poco encima del Christmas Album.
    diana: piece(sleeveGeometry(4), [0.52, 0.75, -0.02], [-Math.PI / 2, 0, -0.22]),
    vinyl: vinylGeometry(),
    label: sleeveLabelGeometry(3),
    // Brazo: tubo fino, cabezal al final y contrapeso detrás del pivote.
    arm: fuse([
      piece(new CylinderGeometry(0.004, 0.004, 0.2, 8), [-0.1, 0, 0], [0, 0, Math.PI / 2]),
      piece(new BoxGeometry(0.03, 0.008, 0.018), [-0.205, -0.003, 0.004], [0, 0.35, 0]),
      piece(new CylinderGeometry(0.013, 0.013, 0.03, 12), [0.03, 0, 0], [0, 0, Math.PI / 2]),
    ]),
  };
}

/**
 * @param {{
 *   tracks: string[],
 *   current: number,
 *   playing: boolean,
 *   record: string,
 *   records: Record<string, { title: string, artist: string, year: number, label: string }>,
 *   onRecord: (key: string) => void,
 *   onOpenDeck: () => void,
 *   onHover: (on: boolean, name?: string) => void,
 * }} props
 */
export default function RecordPlayer({ playing, record, records, onRecord, onOpenDeck, onHover, lang }) {
  const covers = useLoader(TextureLoader, COVER_URLS);
  const res = useMemo(
    () => ({
      geo: buildParts(),
      mats: {
        wood: new MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }),
        deck: new MeshStandardMaterial({ color: '#1d1d20', roughness: 0.4, metalness: 0.3 }),
        light: new MeshStandardMaterial({ color: '#ece7dd', roughness: 0.8 }),
        sleeve: new MeshStandardMaterial({ map: createSleeves(covers), roughness: 0.75, side: DoubleSide }),
        vinyl: new MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.2 }),
        silver: new MeshStandardMaterial({ color: '#cfd2d6', roughness: 0.25, metalness: 0.9 }),
        // Aluminio cepillado del plato y metacrilato ahumado de la tapa.
        alu: new MeshStandardMaterial({ color: '#b9bcc0', roughness: 0.35, metalness: 0.85 }),
        lid: new MeshStandardMaterial({ color: '#2a2a30', roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.28, depthWrite: false }),
      },
    }),
    [covers],
  );
  useEffect(
    () => () => {
      Object.values(res.geo).forEach((g) => g.dispose());
      res.mats.sleeve.map.dispose();
      Object.values(res.mats).forEach((m) => m.dispose());
    },
    [res],
  );

  const disc = useRef(/** @type {import('three').Group | null} */ (null));
  const arm = useRef(/** @type {import('three').Group | null} */ (null));
  // Animación al poner un disco: sale de su funda, vuela en arco y baja al plato.
  const fly = useRef(/** @type {{ from: number[], t: number } | null} */ (null));
  const first = useRef(true);
  useEffect(() => {
    setSleeveLabelSlot(res.geo.label, LABEL_SLOT[record]);
    if (first.current) {
      first.current = false;
      return;
    }
    fly.current = { from: SLEEVE_SPOTS[record] ?? [0.25, 1.0, 0], t: 0 };
  }, [record, res]);

  useFrame((_, dt) => {
    const g = disc.current;
    if (g && fly.current) {
      // 0,9 s: sube de la funda, cruza en arco y se posa girando un poco.
      const f = fly.current;
      f.t = Math.min(1, f.t + Math.min(dt, 0.1) / 0.9);
      const e = f.t * f.t * (3 - 2 * f.t);
      g.position.set(
        f.from[0] + (PLATTER[0] - f.from[0]) * e,
        f.from[1] + (PLATTER[1] - f.from[1]) * e + Math.sin(e * Math.PI) * 0.14,
        f.from[2] + (PLATTER[2] - f.from[2]) * e,
      );
      g.rotation.x = (1 - e) * -1.2;
      if (f.t >= 1) {
        g.rotation.x = 0;
        fly.current = null;
      }
    }
    if (g && playing && !fly.current) g.rotation.y -= SPIN * Math.min(dt, 0.1);
    if (arm.current) {
      const target = playing ? ARM_PLAY : ARM_REST;
      arm.current.rotation.y += (target - arm.current.rotation.y) * Math.min(1, dt * 4);
    }
  });

  const hover = (on) => (e) => {
    e.stopPropagation();
    onHover(on, lang === 'en' ? 'Record player · pick a song' : 'Tocadiscos · elige canción');
  };

  return (
    <group position={POSITION} rotation={[0, ROT_Y, 0]}>
      <mesh geometry={res.geo.wood} material={res.mats.wood} />
      <mesh geometry={res.geo.light} material={res.mats.light} />
      {/* Discos de la mesa: pulsar uno lo pone en el tocadiscos y empieza a sonar. */}
      {[
        ['abc', res.geo.abc],
        ['xmas', res.geo.xmas],
        ['jacksons', res.geo.jacksons],
        ['otw', res.geo.otw],
        ['diana', res.geo.diana],
      ].map(([key, geo]) => (
        <mesh
          key={key}
          geometry={geo}
          material={res.mats.sleeve}
          onClick={(e) => {
            e.stopPropagation();
            if (e.delta > 6) return;
            onRecord(key);
            onOpenDeck();
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            const r = records[key];
            onHover(true, `${r.title} · ${r.artist} (${r.year}) · ${lang === 'en' ? 'click to play' : 'pulsa para ponerlo'}`);
          }}
          onPointerOut={() => onHover(false)}
        />
      ))}
      {/* Lo que se puede pulsar: el tocadiscos y el disco abren la lista. */}
      <group
        onClick={(e) => {
          e.stopPropagation();
          if (e.delta > 6) return;
          // Se acerca la cámara y se abre el submenú del tocadiscos.
          goTo(VIEWS.deck.position, VIEWS.deck.target);
          onOpenDeck();
        }}
        onPointerOver={hover(true)}
        onPointerOut={() => onHover(false)}
      >
        <mesh geometry={res.geo.deck} material={res.mats.deck} />
        <mesh geometry={res.geo.platter} material={res.mats.alu} />
        <mesh geometry={res.geo.lid} material={res.mats.lid} />
        <group ref={disc} position={PLATTER}>
          <mesh geometry={res.geo.vinyl} material={res.mats.vinyl} />
          <mesh geometry={res.geo.spindle} material={res.mats.silver} position={[0, 0.008, 0]} />
          <mesh geometry={res.geo.label} material={res.mats.sleeve} position={[0, 0.0032, 0]} rotation={[-Math.PI / 2, 0, 0]} />
        </group>
        <group ref={arm} position={[0.03, 0.85, 0.11]} rotation={[0, ARM_REST, 0]}>
          <mesh geometry={res.geo.arm} material={res.mats.silver} />
        </group>
      </group>

    </group>
  );
}
