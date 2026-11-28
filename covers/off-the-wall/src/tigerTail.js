// Cola del tigre con física: una cadena de puntos (Verlet) que cuelga de la
// raíz, cae con la gravedad, se balancea con lo que hace el cuerpo y tiene algo
// de rigidez para no quedar como una cuerda. Nunca baja del suelo (y = 0 en el
// espacio del padre del tigre). Se dibuja como un tubo con rayas que se rehace
// cada fotograma: una sola llamada de dibujo.

import { BufferGeometry, Color, Float32BufferAttribute, Vector3 } from "three";

const POINTS = 12; // puntos de la cadena
const LENGTH = 0.15; // metros (cola corta y fina de cachorro)
const SEG = LENGTH / (POINTS - 1);
const SAMPLES = 30; // anillos del tubo (se interpolan entre los puntos)
const RADIAL = 10;
const R_ROOT = 0.0105;
const R_TIP = 0.006;
const GRAVITY = 9.8;
const DAMPING = 0.82;
const ITERATIONS = 6;

const ORANGE = new Color("#c8732c");
const DARK = new Color("#1b1210");

const radiusAt = (u) => R_ROOT + (R_TIP - R_ROOT) * u;

export function createTail() {
  const rings = SAMPLES;
  const vertCount = rings * RADIAL + 1; // + la punta
  const positions = new Float32Array(vertCount * 3);
  const colors = new Float32Array(vertCount * 3);
  for (let r = 0; r < rings; r += 1) {
    const u = r / (rings - 1);
    // Anillos negros cada vez más juntos hacia la punta, y la punta negra.
    const col = u > 0.86 || Math.sin(u * 34) > 0.55 ? DARK : ORANGE;
    for (let k = 0; k < RADIAL; k += 1)
      col.toArray(colors, (r * RADIAL + k) * 3);
  }
  DARK.toArray(colors, (vertCount - 1) * 3);
  const index = [];
  for (let r = 0; r < rings - 1; r += 1) {
    for (let k = 0; k < RADIAL; k += 1) {
      const a = r * RADIAL + k;
      const b = r * RADIAL + ((k + 1) % RADIAL);
      const c = a + RADIAL;
      const d = b + RADIAL;
      index.push(a, c, b, b, c, d);
    }
  }
  const tip = vertCount - 1;
  const last = (rings - 1) * RADIAL;
  for (let k = 0; k < RADIAL; k += 1)
    index.push(last + k, tip, last + ((k + 1) % RADIAL));
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.setIndex(index);

  return {
    geometry,
    p: Array.from({ length: POINTS }, () => new Vector3()),
    prev: Array.from({ length: POINTS }, () => new Vector3()),
    ready: false,
    // Vectores de trabajo (sin crear objetos en cada fotograma).
    tmp: {
      a: new Vector3(),
      b: new Vector3(),
      n: new Vector3(),
      bn: new Vector3(),
      t: new Vector3(),
      up: new Vector3(0, 1, 0),
      s: new Vector3(),
    },
    samples: Array.from({ length: SAMPLES }, () => new Vector3()),
  };
}

/**
 * Avanza la simulación.
 * @param tail lo que devuelve createTail()
 * @param root posición de la raíz (espacio del padre del tigre)
 * @param dir dirección de reposo de la cola (unitaria): hacia atrás y algo arriba
 * @param stiff rigidez 0..1 (andando, más tiesa; tumbado, más floja)
 */
export function stepTail(tail, root, dir, stiff, dt) {
  const { p, prev } = tail;
  if (!tail.ready) {
    for (let i = 0; i < POINTS; i += 1) {
      p[i].copy(root).addScaledVector(dir, SEG * i);
      p[i].y = Math.max(p[i].y, radiusAt(i / (POINTS - 1)));
      prev[i].copy(p[i]);
    }
    tail.ready = true;
  }
  const g = GRAVITY * dt * dt;
  const v = tail.tmp.a;
  for (let i = 1; i < POINTS; i += 1) {
    v.subVectors(p[i], prev[i]).multiplyScalar(DAMPING);
    prev[i].copy(p[i]);
    p[i].add(v);
    p[i].y -= g;
  }
  p[0].copy(root);
  prev[0].copy(root);

  const target = tail.tmp.b;
  for (let it = 0; it < ITERATIONS; it += 1) {
    for (let i = 1; i < POINTS; i += 1) {
      // Rigidez: cada tramo tiende a seguir la dirección de reposo (más cerca de la raíz, más fuerte).
      const u = i / (POINTS - 1);
      target.copy(p[i - 1]).addScaledVector(dir, SEG);
      p[i].lerp(target, (stiff * (1 - 0.75 * u)) / ITERATIONS);
      // Largo de cada tramo fijo.
      v.subVectors(p[i], p[i - 1]);
      const len = v.length() || 1e-6;
      const fix = (len - SEG) / len;
      if (i === 1) p[i].addScaledVector(v, -fix);
      else {
        p[i].addScaledVector(v, -fix * 0.5);
        p[i - 1].addScaledVector(v, fix * 0.5);
      }
      // El suelo: la cola apoya, no lo atraviesa.
      const floor = radiusAt(u) + 0.002;
      if (p[i].y < floor) {
        p[i].y = floor;
        // Rozamiento con el suelo: no resbala.
        prev[i].x += (p[i].x - prev[i].x) * 0.5;
        prev[i].z += (p[i].z - prev[i].z) * 0.5;
        prev[i].y = p[i].y;
      }
    }
    p[0].copy(root);
  }
  updateMesh(tail);
}

// Catmull-Rom entre los puntos de la cadena para que el tubo salga redondo.
function sample(p, u, out) {
  const f = u * (POINTS - 1);
  const i = Math.min(POINTS - 2, Math.floor(f));
  const t = f - i;
  const p0 = p[Math.max(0, i - 1)];
  const p1 = p[i];
  const p2 = p[i + 1];
  const p3 = p[Math.min(POINTS - 1, i + 2)];
  const t2 = t * t;
  const t3 = t2 * t;
  for (const ax of ["x", "y", "z"]) {
    out[ax] =
      0.5 *
      (2 * p1[ax] +
        (-p0[ax] + p2[ax]) * t +
        (2 * p0[ax] - 5 * p1[ax] + 4 * p2[ax] - p3[ax]) * t2 +
        (-p0[ax] + 3 * p1[ax] - 3 * p2[ax] + p3[ax]) * t3);
  }
  return out;
}

function updateMesh(tail) {
  const { samples, geometry, tmp } = tail;
  for (let r = 0; r < SAMPLES; r += 1)
    sample(tail.p, r / (SAMPLES - 1), samples[r]);
  const pos = geometry.attributes.position.array;
  const { t, n, bn, up } = tmp;
  for (let r = 0; r < SAMPLES; r += 1) {
    const a = samples[Math.max(0, r - 1)];
    const b = samples[Math.min(SAMPLES - 1, r + 1)];
    t.subVectors(b, a).normalize();
    // Marco del anillo: perpendicular a la tangente (si la cola va vertical, se usa otro eje).
    n.crossVectors(
      t,
      Math.abs(t.y) > 0.95 ? tmp.s.set(1, 0, 0) : up,
    ).normalize();
    bn.crossVectors(t, n).normalize();
    const rad = radiusAt(r / (SAMPLES - 1));
    for (let k = 0; k < RADIAL; k += 1) {
      const ang = (k / RADIAL) * Math.PI * 2;
      const c = Math.cos(ang) * rad;
      const s = Math.sin(ang) * rad;
      const o = (r * RADIAL + k) * 3;
      pos[o] = samples[r].x + n.x * c + bn.x * s;
      pos[o + 1] = samples[r].y + n.y * c + bn.y * s;
      pos[o + 2] = samples[r].z + n.z * c + bn.z * s;
    }
  }
  // Punta redondeada un poco más allá del último anillo.
  const lastS = samples[SAMPLES - 1];
  t.subVectors(lastS, samples[SAMPLES - 2]).normalize();
  const o = SAMPLES * RADIAL * 3;
  pos[o] = lastS.x + t.x * R_TIP;
  pos[o + 1] = lastS.y + t.y * R_TIP;
  pos[o + 2] = lastS.z + t.z * R_TIP;
  geometry.attributes.position.needsUpdate = true;
  geometry.computeVertexNormals();
}
