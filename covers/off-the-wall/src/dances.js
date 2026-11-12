// Los pasos de baile. Cada uno es una función del avance k (0..1) que devuelve
// cuánto se aparta cada articulación de la postura de baile neutra. Así no hay
// fotogramas clave ni ficheros de animación: todo es código.
//
// Convenios (los aplica Michael.jsx):
//  - legR/legL: muslo hacia delante (negativo) o hacia atrás (positivo).
//  - kneeR/kneeL: rodilla doblada (positivo: la espinilla va hacia atrás).
//  - toeR/toeL: talón arriba (el pie gira en el tobillo y la punta baja).
//  - freeR/freeL: 1 si ese pie va por el aire (no apoya ni se pone plano).
//  - sideR/sideL: pierna abierta hacia fuera (positivo) o hacia dentro.
//  - lift: subida extra del cuerpo. La altura de los pies se calcula sola
//    (el cuerpo descansa sobre la pierna apoyada más alta).
//  - amount: cuánto se deja la postura de la portada para bailar (0..1).

/** Duración de cada paso, en segundos. */
export const MOVES = {
  spin: 1.5,
  toe: 1.8,
  kick: 1.35,
  glide: 4.3,
};

/** Medidas del moonwalk: pasos, duración de cada uno (s), avance (m; corto porque la pared está a 1 m), ángulo de pierna y talón. */
export const GLIDE = { steps: 5, step: 0.46, stride: 0.1, angle: 0.13, toe: 0.75, pause: 0.7 };

/** Largo del muslo y de la espinilla (m), y del tobillo a la punta del pie. */
export const LEG = { thigh: 0.42, shin: 0.41, ankle: 0.087, foot: 0.175 };

const clamp01 = (x) => Math.max(0, Math.min(1, x));
/** Suavizado de entrada y salida. */
const ease = (x) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};
/** Campana entre a y b: 0 fuera, 1 en el centro. */
const bell = (k, a, b) => (k <= a || k >= b ? 0 : Math.sin(((k - a) / (b - a)) * Math.PI));
/** Sube en [a, a+in], se mantiene y baja en [b-out, b]. */
const hold = (k, a, b, fade = 0.1) => ease((k - a) / fade) * (1 - ease((k - (b - fade)) / fade));
/** Mezcla lineal. */
const mix = (a, b, t) => a + (b - a) * t;

/** Cuánto sube el tobillo al ponerse de puntillas con el talón a ese ángulo. */
export const toeRise = (a) => LEG.ankle * Math.cos(a) + LEG.foot * Math.sin(a) - LEG.ankle;

/**
 * Rodilla que hace falta para que una pierna sea `drop` metros más corta (el
 * muslo va hacia delante la mitad y la espinilla hacia atrás la otra mitad).
 */
export const kneeFor = (drop) => 2 * Math.acos(Math.max(0.5, 1 - drop / (LEG.thigh + LEG.shin)));

/** Postura neutra: nada se aparta de la postura de baile. */
const ZERO = {
  amount: 0,
  lift: 0, turn: 0, back: 0, lean: 0, tilt: 0,
  headY: 0, headX: 0,
  armRZ: 0, armRX: 0, elbowR: 0, armLZ: 0, armLX: 0, elbowL: 0,
  toeL: 0, toeR: 0, legR: 0, legL: 0, kneeR: 0, kneeL: 0, freeR: 0, freeL: 0, sideR: 0, sideL: 0,
};

/**
 * La congelación de puntillas de Michael, como en sus directos: subido del
 * todo a las puntas (el zapato casi vertical, el talón arriba), las rodillas
 * muy dobladas y echadas hacia delante, la cadera adelantada, el tronco
 * inclinado hacia atrás, la barbilla arriba y los brazos sueltos, colgando
 * junto a los muslos. `s` es cuánto (0..1) y `t` el tiempo para el temblor.
 */
function toeStand(s, t) {
  const tremble = Math.sin(t * 38) * 0.02 * s;
  const toe = s * (1.3 + tremble);
  return {
    toeR: toe,
    toeL: toe,
    // Muslos hacia delante y espinillas hacia atrás: las rodillas salen y los
    // pies quedan debajo de la cadera.
    kneeR: s * 0.95,
    kneeL: s * 0.95,
    legR: -s * 0.55,
    legL: -s * 0.55,
    lean: -s * 0.07,
    headY: s * 0.2,
    headX: -s * 0.26,
    armRZ: -s * 0.08,
    armLZ: s * 0.08,
    armRX: s * 0.02,
    armLX: s * 0.02,
    elbowR: s * 0.12,
    elbowL: s * 0.12,
  };
}

export const POSES = {
  // La vuelta: se agacha un poco, gira dos veces sobre un pie con los brazos
  // recogidos y acaba de puntillas con el brazo arriba.
  spin(k) {
    const crouch = bell(k, 0, 0.2);
    const turning = hold(k, 0.12, 0.72, 0.08);
    const finish = hold(k, 0.7, 1, 0.08);
    return {
      lift: -crouch * 0.02,
      turn: ease((k - 0.14) / 0.56) * Math.PI * 4,
      kneeR: crouch * 0.35,
      kneeL: crouch * 0.35,
      legR: -crouch * 0.17 - turning * 0.25,
      legL: -crouch * 0.17,
      headX: -finish * 0.16,
      headY: finish * 0.35,
      armRZ: -turning * 0.3 - finish * 2.3,
      armRX: -finish * 0.15,
      elbowR: -turning * 1.3,
      armLZ: turning * 0.3 + finish * 0.3,
      elbowL: -turning * 1.3 - finish * 0.5,
      toeL: turning * 0.45 + finish * 0.6,
      toeR: turning * 0.2 + finish * 0.6,
      freeR: turning * (1 - finish),
    };
  },

  // De puntillas: coge impulso doblando las rodillas, sube de golpe a las
  // puntas, se queda congelado temblando un poco y baja con un rebote.
  toe(k, t) {
    const prep = bell(k, 0, 0.2);
    const up = hold(k, 0.14, 0.86, 0.06);
    const land = bell(k, 0.84, 1);
    const stand = toeStand(up, t);
    return {
      ...stand,
      lift: -land * 0.015,
      kneeR: stand.kneeR + prep * 0.45 + land * 0.3,
      kneeL: stand.kneeL + prep * 0.45 + land * 0.3,
      legR: stand.legR - prep * 0.22 - land * 0.15,
      legL: stand.legL - prep * 0.22 - land * 0.15,
      lean: stand.lean + prep * 0.08,
      headX: stand.headX + prep * 0.18,
      elbowR: stand.elbowR - prep * 0.7,
      elbowL: stand.elbowL - prep * 0.7,
    };
  },

  // Patada: sube la rodilla, suelta la pierna de golpe hacia delante y hacia
  // fuera, estirada y con la punta del pie, la deja un momento arriba, la
  // vuelve a recoger y pisa fuerte. Los brazos acompañan: uno señala hacia
  // delante y abajo, el otro se abre doblado.
  kick(k) {
    const chamber = hold(k, 0.02, 0.66, 0.12);
    const ext = hold(k, 0.17, 0.5, 0.05);
    const stomp = bell(k, 0.62, 0.84);
    const arms = hold(k, 0.08, 0.66, 0.1);
    return {
      freeR: chamber,
      legR: -chamber * 0.95 - ext * 0.4,
      kneeR: chamber * 1.45 * (1 - ext),
      sideR: ext * 0.5 + chamber * 0.08,
      toeR: chamber * 0.3 + ext * 0.75,
      kneeL: chamber * 0.2 + stomp * 0.35,
      legL: -chamber * 0.1 - stomp * 0.17,
      sideL: -ext * 0.06,
      lean: -ext * 0.2 + stomp * 0.1,
      tilt: ext * 0.08,
      headX: ext * 0.16 + stomp * 0.12,
      headY: -arms * 0.2,
      armRZ: -arms * 0.3 - ext * 0.15,
      armRX: -arms * 0.4 - ext * 0.5,
      elbowR: -arms * 0.25,
      armLZ: arms * 0.6 + ext * 0.3,
      armLX: arms * 0.2,
      elbowL: -arms * 0.95,
      lift: -stomp * 0.012,
    };
  },

  // Moonwalk: en cada paso un pie va plano y se arrastra hacia atrás mientras
  // el otro se queda clavado de puntillas con la rodilla doblada; luego se
  // cambian. El cuerpo retrocede a velocidad constante y los brazos marcan el
  // paso. Después, congelación de puntillas y vuelta a su sitio andando.
  glide(k, t) {
    const tt = k * MOVES.glide;
    const end = GLIDE.steps * GLIDE.step;
    const far = GLIDE.steps * GLIDE.stride;
    const knee = kneeFor(toeRise(GLIDE.toe));
    // Codos doblados, manos a la altura de la cadera, el cuerpo algo adelante.
    const arms = hold(tt, 0, end + 0.1, 0.2);
    const base = {
      lean: arms * 0.06,
      armRZ: -arms * 0.14,
      armLZ: arms * 0.14,
      elbowR: -arms * 0.9,
      elbowL: -arms * 0.9,
    };
    if (tt < end) {
      const s = Math.floor(tt / GLIDE.step);
      const f = (tt - s * GLIDE.step) / GLIDE.step;
      const right = s % 2 === 0;
      // El pie que se arrastra (plano) va de delante a atrás; el clavado, al
      // revés respecto al cuerpo, porque el cuerpo se va hacia atrás.
      const slide = -GLIDE.angle + 2 * GLIDE.angle * f;
      const plant = -slide;
      // El cambio de pie es rápido: el talón sube y baja en el primer 18 %.
      const up = ease(f / 0.18);
      const toeOn = GLIDE.toe * up; // pie que pasa a estar clavado
      const toeOff = GLIDE.toe * (1 - up); // pie que pasa a arrastrarse
      const kOn = knee * up;
      const kOff = knee * (1 - up);
      // Los brazos van al revés que las piernas, como al andar.
      const swing = (right ? 1 : -1) * Math.sin(f * Math.PI) * 0.22;
      return {
        ...base,
        back: -(s + f) * GLIDE.stride,
        legR: (right ? slide : plant) - (right ? kOff : kOn) / 2,
        legL: (right ? plant : slide) - (right ? kOn : kOff) / 2,
        kneeR: right ? kOff : kOn,
        kneeL: right ? kOn : kOff,
        toeR: right ? toeOff : toeOn,
        toeL: right ? toeOn : toeOff,
        armRX: base.lean + swing,
        armLX: base.lean - swing,
        tilt: (right ? 1 : -1) * 0.03,
        headX: Math.sin(f * Math.PI) * 0.04,
      };
    }
    if (tt < end + GLIDE.pause) {
      // Remate: los pies se juntan y se congela de puntillas.
      const u = (tt - end) / GLIDE.pause;
      const s = hold(u, 0, 1, 0.25);
      const settle = 1 - ease(u * 3);
      const stand = toeStand(s, t);
      return {
        ...stand,
        back: -far,
        legR: stand.legR + GLIDE.angle * settle,
        legL: stand.legL - GLIDE.angle * settle,
        elbowR: mix(base.elbowR, stand.elbowR, s),
        elbowL: mix(base.elbowL, stand.elbowL, s),
      };
    }
    // Vuelta a su sitio andando: la pierna que avanza dobla la rodilla.
    const u = clamp01((tt - end - GLIDE.pause) / (MOVES.glide - end - GLIDE.pause));
    const sw = Math.sin(u * Math.PI * 4) * bell(u, 0, 1);
    return {
      back: -far * (1 - ease(u)),
      legR: -sw * 0.24 - Math.max(0, sw) * 0.2,
      legL: sw * 0.24 - Math.max(0, -sw) * 0.2,
      kneeR: Math.max(0, sw) * 0.5,
      kneeL: Math.max(0, -sw) * 0.5,
      freeR: Math.max(0, sw) > 0.3 ? 1 : 0,
      freeL: Math.max(0, -sw) > 0.3 ? 1 : 0,
      armRZ: -0.05,
      armLZ: 0.05,
      armRX: sw * 0.2,
      armLX: -sw * 0.2,
      elbowR: -0.25,
      elbowL: -0.25,
    };
  },
};

/** Postura del paso en curso (o la neutra si no hay ninguno). */
export function movePose(move, reduced) {
  if (!move) return ZERO;
  const now = performance.now() / 1000;
  const dur = MOVES[move.name];
  const k = (now - move.at) / dur;
  if (k < 0 || k > 1) return ZERO;
  // Sin animación: se enseña el momento más vistoso del paso, quieto.
  const kk = reduced ? { spin: 0.85, toe: 0.5, kick: 0.33, glide: 0.3 }[move.name] : k;
  const p = POSES[move.name](kk, reduced ? 0 : now);
  if (reduced) p.turn = 0;
  // Se deja la postura de la portada al empezar y se vuelve a ella al acabar.
  const amount = reduced ? 1 : ease(k / 0.1) * (1 - ease((k - 0.9) / 0.1));
  return { ...ZERO, ...p, amount };
}

// ---------------------------------------------------------------------------
// Baile de fondo mientras suena la música (cuando no hay un paso en marcha).
// Sigue el tempo de cada canción y cambia de figura cada dos compases, según
// el carácter del tema: disco, funk, suave o balada.

/**
 * Tempo (pulsos por minuto, aproximados) y carácter de cada canción del disco,
 * en el mismo orden que la lista de canciones de la ruta.
 */
export const TRACK_GROOVES = [
  { bpm: 119, feel: 'disco' }, // Don't Stop 'Til You Get Enough
  { bpm: 114, feel: 'smooth' }, // Rock with You
  { bpm: 128, feel: 'funk' }, // Workin' Day and Night
  { bpm: 126, feel: 'disco' }, // Get on the Floor
  { bpm: 122, feel: 'disco' }, // Off the Wall
  { bpm: 108, feel: 'smooth' }, // Girlfriend
  { bpm: 64, feel: 'ballad' }, // She's Out of My Life
  { bpm: 98, feel: 'smooth' }, // I Can't Help It
  { bpm: 116, feel: 'smooth' }, // It's the Falling in Love
  { bpm: 124, feel: 'funk' }, // Burn This Disco Out
];

/** Figuras de cada carácter; se encadenan cada dos compases (8 pulsos). */
const FIGURES = {
  disco: ['step', 'point', 'bounce', 'shoulders'],
  funk: ['step', 'shoulders', 'kickstep', 'bounce'],
  smooth: ['sway', 'step', 'snap', 'step'],
  ballad: ['sway'],
};

/** Una figura del baile de fondo en el pulso `b` (pulsos desde el inicio). */
function figure(name, b, energy) {
  // Rebote en cada pulso: las rodillas se doblan y la cabeza asiente.
  const kb = (1 - Math.cos(b * Math.PI * 2)) / 2;
  // Paso lateral: un lado en un pulso, el otro en el siguiente.
  const s = Math.sin(b * Math.PI);
  const base = {
    kneeR: kb * 0.16 * energy,
    kneeL: kb * 0.16 * energy,
    legR: -kb * 0.08 * energy,
    legL: -kb * 0.08 * energy,
    headX: kb * 0.09 * energy,
  };
  if (name === 'bounce') {
    return {
      ...base,
      kneeR: kb * 0.3 * energy,
      kneeL: kb * 0.3 * energy,
      legR: -kb * 0.15 * energy,
      legL: -kb * 0.15 * energy,
      elbowR: -1.0 - kb * 0.4,
      elbowL: -1.0 - kb * 0.4,
      armRX: -0.2,
      armLX: -0.2,
      lean: kb * 0.05,
    };
  }
  if (name === 'shoulders') {
    // Hombros a contratiempo, el doble de rápido, con los puños a la altura del pecho.
    const sh = Math.sin(b * Math.PI * 2);
    return {
      ...base,
      tilt: sh * 0.09 * energy,
      headY: sh * 0.12,
      elbowR: -1.6,
      elbowL: -1.6,
      armRX: -0.35,
      armLX: -0.35,
      armRZ: -0.2 - Math.max(0, sh) * 0.25,
      armLZ: 0.2 + Math.max(0, -sh) * 0.25,
    };
  }
  if (name === 'point') {
    // El gesto de discoteca: el brazo derecho señala arriba en diagonal en el
    // primer pulso de cada compás y baja a la cadera; la cadera acompaña.
    const up = Math.max(0, Math.cos(((b % 4) / 4) * Math.PI * 2)) ** 3;
    return {
      ...base,
      armRZ: -0.4 - up * 1.9,
      armRX: -up * 0.3,
      elbowR: -0.2,
      armLZ: 0.25,
      elbowL: -1.4,
      armLX: -0.2,
      tilt: up * 0.06 + s * 0.03,
      headY: up * 0.3,
      headX: base.headX - up * 0.15,
      sideL: Math.max(0, -s) * 0.1,
    };
  }
  if (name === 'kickstep') {
    // Paso con golpe de pie: en el cuarto pulso de cada compás la pierna
    // derecha da una patadita corta hacia delante.
    const k = Math.max(0, Math.sin(((b % 4) - 3) * Math.PI)) * ((b % 4) > 3 ? 1 : 0);
    return {
      ...base,
      freeR: k > 0.05 ? 1 : 0,
      legR: base.legR - k * 0.55,
      kneeR: base.kneeR + k * 0.5,
      toeR: k * 0.5,
      armRX: s * 0.3,
      armLX: -s * 0.3,
      elbowR: -0.9,
      elbowL: -0.9,
      lean: -k * 0.06,
    };
  }
  if (name === 'snap') {
    // Chasquidos en los pulsos 2 y 4 con las manos a la altura del hombro.
    const two = Math.max(0, Math.sin(b * Math.PI)) ** 4;
    return {
      ...base,
      armRZ: -0.5,
      armLZ: 0.5,
      armRX: -0.3,
      armLX: -0.3,
      elbowR: -1.7 + two * 0.25,
      elbowL: -1.7 + (1 - two) * 0.25,
      headY: s * 0.15,
      tilt: s * 0.04,
    };
  }
  if (name === 'sway') {
    // Balanceo lento a medio tiempo: el peso pasa de una pierna a otra, los
    // brazos sueltos y la cabeza ladeada; sin rebote.
    const sw = Math.sin(b * Math.PI * 0.5);
    return {
      tilt: sw * 0.06,
      headY: sw * 0.18,
      headX: 0.05,
      sideR: Math.max(0, sw) * 0.06,
      sideL: Math.max(0, -sw) * 0.06,
      kneeR: Math.max(0, -sw) * 0.18,
      kneeL: Math.max(0, sw) * 0.18,
      legR: -Math.max(0, -sw) * 0.09,
      legL: -Math.max(0, sw) * 0.09,
      armRX: -sw * 0.15,
      armLX: sw * 0.15,
      elbowR: -0.5,
      elbowL: -0.5,
    };
  }
  // 'step': paso lateral con los brazos acompañando al revés que las piernas.
  return {
    ...base,
    sideR: Math.max(0, s) * 0.13 * energy,
    sideL: Math.max(0, -s) * 0.13 * energy,
    tilt: s * 0.05,
    headY: s * 0.1,
    armRX: -s * 0.35,
    armLX: s * 0.35,
    elbowR: -0.9 - Math.max(0, s) * 0.3,
    elbowL: -0.9 - Math.max(0, -s) * 0.3,
  };
}

/** Mezcla de dos posturas parciales (w = 1 es la segunda). */
function mixPose(a, b, w) {
  const out = { ...ZERO };
  for (const key of Object.keys(ZERO)) out[key] = (a[key] ?? 0) * (1 - w) + (b[key] ?? 0) * w;
  return out;
}

/**
 * Postura del baile de fondo en el instante `t` (s) para `groove` ({ bpm,
 * feel }). `energy` (0..1) es lo fuerte que suena (graves); `amount` cuánto se
 * deja la postura de la portada. Las figuras se funden entre sí en el último
 * pulso de cada dos compases.
 */
export function groovePose(t, groove, energy, amount) {
  const b = (t * groove.bpm) / 60;
  const list = FIGURES[groove.feel] ?? FIGURES.disco;
  const seg = Math.floor(b / 8);
  const into = (b % 8) / 8;
  const e = groove.feel === 'ballad' ? 0.6 : 0.75 + Math.min(1, energy * 2.5) * 0.35;
  const cur = figure(list[seg % list.length], b, e);
  const next = figure(list[(seg + 1) % list.length], b, e);
  const p = mixPose(cur, next, ease((into - 0.875) / 0.125));
  p.amount = amount;
  return p;
}
