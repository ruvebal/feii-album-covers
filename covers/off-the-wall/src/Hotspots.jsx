// Todo el plató se puede tocar. Cada objeto tiene una caja invisible que
// recoge el ratón o el dedo: al pasar por encima sale su nombre junto al
// cursor y al pulsarlo la cámara vuela a verlo de cerca y se cuenta qué es.
// Las cajas no se pintan (visible=false): no cuestan llamadas de dibujo, solo
// sirven para el rayo del puntero.

import { goTo } from './cameraEvents.js';

// Con `?boxes` en la dirección se dibujan las cajas (en verde) para revisarlas.
const SHOW = typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('boxes');

/**
 * Objetos del plató: centro y tamaño de la caja, nombre, lo que se cuenta y
 * desde dónde mirarlo (posición de la cámara y punto al que mira). Cada caja
 * abarca el objeto entero y nada más (con `boxes`, una por pieza): si sobra
 * aire alrededor, tapa lo que hay detrás y se pulsa lo que no es.
 */
const SPOTS = [
  {
    name: 'Cámara del trípode',
    en: ['Tripod camera', 'The medium-format camera from the shoot: the cover was taken from here. Press “Full photo” and shoot.'],
    text: 'La cámara de medio formato de la sesión: desde aquí se hizo la portada. Pulsa «Foto entera» y dispara.',
    boxes: [[0.9, 1.09, 3.92, 0.3, 0.3, 0.42], [0.9, 0.5, 3.9, 0.36, 1.0, 0.36]],
    view: [[-0.3, 1.4, 5.6], [0.9, 1.07, 3.9]],
  },
  {
    name: 'Ventana de luz',
    en: ['Softbox', 'Softbox: a box with diffusion fabric that gives a big, soft light. It flashes when you take the photo.'],
    text: 'Ventana de luz: una caja con tela difusora que da una luz grande y suave. Destella al hacer la foto.',
    boxes: [[-2.1, 1.75, 2.7, 0.62, 0.62, 0.62], [-2.1, 0.72, 2.7, 0.36, 1.44, 0.36]],
    view: [[-0.7, 1.55, 1.3], [-2.1, 1.7, 2.7]],
  },
  {
    name: 'Ventana de luz',
    en: ['Softbox', 'The other softbox, on the opposite side: it fills the shadows on Michael’s face.'],
    text: 'La otra ventana de luz, al otro lado: rellena las sombras de la cara de Michael.',
    boxes: [[2.3, 1.75, 2.2, 0.62, 0.62, 0.62], [2.3, 0.72, 2.2, 0.36, 1.44, 0.36]],
    view: [[0.9, 1.55, 0.9], [2.3, 1.7, 2.2]],
  },
  {
    name: 'Paraguas de luz',
    only: 'otw',
    en: ['Light umbrella', 'White umbrella: the flash bounces off it and the light lands softer.'],
    text: 'Paraguas blanco: el flash rebota en él y la luz llega más suave.',
    boxes: [[2.9, 1.9, 3.3, 1.0, 0.7, 1.0], [2.9, 0.78, 3.3, 0.36, 1.56, 0.36]],
    view: [[1.2, 1.7, 5.0], [2.9, 1.8, 3.3]],
  },
  {
    name: 'Reflector',
    en: ['Reflector', 'Silver reflector: it bounces light back onto the face from below so there are no dark circles.'],
    text: 'Reflector plateado: devuelve luz a la cara desde abajo para que no queden ojeras.',
    box: [-1.7, 0.42, 2.0, 0.7, 0.84, 0.62],
    view: [[-0.4, 1.2, 3.4], [-1.7, 0.42, 2.0]],
  },
  {
    name: 'Bandera negra',
    only: 'otw',
    en: ['Black flag', 'Black flag: it blocks the light that leaks towards the lens.'],
    text: 'Bandera negra: corta la luz que se escapa hacia el objetivo.',
    boxes: [[-3.31, 1.42, 2.81, 0.42, 0.66, 0.5], [-3.7, 0.7, 3.3, 0.36, 1.4, 0.36]],
    view: [[-1.6, 1.5, 4.2], [-3.3, 1.4, 2.8]],
  },
  {
    name: 'Burro de vestuario',
    only: 'otw',
    en: ['Wardrobe rack', 'The wardrobe rack: spare tuxedos and white shirts, in case of a change between shots.'],
    text: 'El burro de vestuario: esmóquines de recambio y camisas blancas, por si hay que cambiarse entre fotos.',
    box: [-2.75, 0.82, 6.1, 0.8, 1.64, 1.42],
    view: [[-0.6, 1.5, 6.6], [-2.75, 1.1, 6.1]],
  },
  {
    // La silla de director, con la boa enroscada: al pulsarla se abre su foto.
    id: 'muscles',
    name: 'Muscles, la boa de Michael',
    en: ['Muscles, Michael’s boa', 'Muscles, the boa constrictor Michael kept as a pet in those years, coiled on the director’s chair.'],
    text: 'Muscles, la boa constrictor que Michael tenía de mascota en aquellos años, enroscada en la silla de director.',
    box: [-1.55, 0.48, 6.3, 0.62, 0.96, 0.6],
    view: [[-1.05, 1.25, 5.0], [-1.55, 0.68, 6.3]],
  },
  {
    name: 'Rincón Studio 54',
    only: 'otw',
    en: ['Studio 54 corner', 'A corner of Studio 54, the New York club of 1979: red velvet, champagne and a spinning mirror ball.'],
    text: 'Un rincón de Studio 54, la discoteca de Nueva York de 1979: terciopelo rojo, champán y una bola de espejos girando.',
    // Una caja por pieza (la mesa con las copas, la bola y las dos cortinas),
    // para que el aire entre ellas no tape lo que hay detrás: el rótulo de
    // neón de arriba se pulsa aparte.
    boxes: [
      [3.45, 0.66, 9.55, 0.8, 1.32, 0.8],
      [3.3, 3.25, 9.3, 0.62, 0.62, 0.62],
      [3.4, 1.7, 10.38, 1.8, 3.4, 0.1],
      [4.18, 1.7, 9.45, 0.1, 3.4, 2.0],
    ],
    view: [[1.5, 1.7, 7.2], [3.4, 1.7, 9.7]],
  },
  {
    name: 'Baúles de material',
    en: ['Equipment cases', 'Cases with the gear: cables, light stands and spares.'],
    text: 'Baúles con el material: cables, pies de luz y repuestos.',
    box: [2.0, 0.4, 7.7, 0.8, 0.8, 0.64],
    view: [[0.7, 1.3, 8.8], [2.0, 0.5, 7.7]],
  },
  {
    name: 'Baúl de material',
    en: ['Equipment case', 'Another equipment case, by the exit.'],
    text: 'Otro baúl de material, junto a la salida.',
    box: [-2.7, 0.25, 8.3, 0.94, 0.5, 0.78],
    view: [[-1.3, 1.3, 9.4], [-2.7, 0.4, 8.3]],
  },
  {
    name: 'Salida del estudio',
    en: ['Studio exit', 'The studio exit. The red light is on: shoot in progress, do not enter.'],
    text: 'La salida del estudio. El piloto rojo encendido avisa de que hay sesión: no se entra.',
    box: [-2.6, 1.25, 10.42, 1.2, 2.5, 0.14],
    view: [[-2.0, 1.6, 7.6], [-2.6, 1.4, 10.4]],
  },
  {
    name: 'Los Jackson 5',
    en: ['The Jackson 5', 'Before going solo, Michael sang as a kid with his brothers in the Jackson 5. In 1976 they became The Jacksons: that year’s album hangs here in gold.'],
    text: 'Antes de ir en solitario, Michael cantó de niño con sus hermanos en los Jackson 5. En 1976 pasaron a llamarse The Jacksons: su disco de ese año cuelga aquí en oro.',
    box: [4.25, 1.75, 4.6, 0.1, 1.1, 1.5],
    view: [[0.95, 1.6, 4.75], [3.9, 1.45, 4.68]],
  },
  {
    name: 'La ventana',
    only: 'otw',
    en: ['The window', 'The window from the cover: a blue sky fading down to green.'],
    text: 'La ventana de la portada: un cielo azul que baja hasta el verde.',
    box: [1.585, 2.12, -0.85, 1.08, 2.32, 0.1],
    view: [[0.6, 1.8, 3.0], [1.6, 2.0, -0.9]],
  },
  {
    name: 'El título en tiza',
    only: 'otw',
    en: ['The chalk title', 'The name and title, handwritten in chalk on the wall, as on the cover.'],
    text: 'El nombre y el título, escritos a mano con tiza en la pared, como en la portada.',
    box: [-0.675, 1.5, -0.86, 0.85, 1.2, 0.08],
    view: [[-0.4, 1.5, 2.6], [-0.7, 1.5, -0.9]],
  },
  {
    name: 'El monitor',
    en: ['The monitor', 'The set monitor, next to the camera.'],
    text: 'El monitor del plató, junto a la cámara.',
    boxes: [[-0.95, 1.32, 4.25, 0.6, 0.72, 0.56], [-0.95, 0.5, 4.25, 0.3, 1.0, 0.3]],
    view: [[-1.85, 1.42, 5.3], [-0.95, 1.3, 4.25]],
  },
];

/**
 * Lo nuevo de 1982 (Thriller). Cada uno abre su ficha (`id`, textos en i18n.js).
 */
const SPOTS_THRILLER = [
  {
    id: 'grammy',
    name: 'El Grammy y los American Music Awards',
    en: ['The Grammy and the American Music Awards', 'His first Grammy as a solo artist and his three American Music Awards, both from 1980.'],
    text: 'Su primer Grammy en solitario y sus tres American Music Awards, los dos de 1980.',
    box: [4.12, 1.15, 4.7, 0.3, 0.32, 0.72],
    view: [[2.6, 1.35, 4.7], [4.1, 1.15, 4.7]],
  },
  {
    id: 'polaroid',
    name: 'Las Polaroid de prueba',
    en: ['The test Polaroids', 'Instant test shots to check the light before shooting on film.'],
    text: 'Fotos instantáneas de prueba para comprobar la luz antes de disparar en película.',
    box: [1.55, 0.6, 4.4, 0.7, 0.4, 0.55],
    view: [[1.3, 1.45, 5.3], [1.55, 0.74, 4.4]],
  },
  {
    id: 'arcade',
    name: 'La máquina recreativa',
    en: ['The arcade machine', 'Arcades were at their peak in 1982.'],
    text: 'Los salones recreativos vivían su mejor momento en 1982.',
    box: [3.7, 0.9, 9.95, 0.75, 1.8, 0.75],
    view: [[2.6, 1.4, 8.3], [3.7, 1.1, 9.9]],
  },
  {
    id: 'tvconsole',
    name: 'La tele y la videoconsola',
    en: ['The TV and the console', 'A tube TV with a cartridge console plugged in.'],
    text: 'Una tele de tubo con una videoconsola de cartuchos enchufada.',
    boxes: [[2.65, 0.6, 9.95, 0.92, 1.2, 0.5], [2.55, 0.06, 9.4, 0.45, 0.12, 0.3]],
    view: [[1.6, 1.1, 8.0], [2.6, 0.6, 9.7]],
  },
  {
    id: 'boombox',
    name: 'El radiocasete',
    en: ['The boombox', 'A big portable boombox.'],
    text: 'Un radiocasete grande portátil.',
    box: [3.15, 0.18, 9.0, 0.66, 0.4, 0.2],
    view: [[2.6, 0.7, 8.0], [3.15, 0.2, 9.0]],
  },
  {
    id: 'walkman',
    name: 'El walkman',
    en: ['The Walkman', 'Music in your pocket.'],
    text: 'La música en el bolsillo.',
    box: [2.62, 0.47, 8.97, 0.26, 0.12, 0.3],
    view: [[2.2, 0.95, 8.4], [2.55, 0.45, 8.95]],
  },
  {
    id: 'rubik',
    name: 'El cubo de Rubik',
    en: ["The Rubik's Cube", 'The puzzle everyone had in 1982.'],
    text: 'El rompecabezas que tenía todo el mundo en 1982.',
    box: [2.4, 0.48, 8.97, 0.15, 0.13, 0.15],
    view: [[2.2, 0.9, 8.4], [2.4, 0.46, 8.97]],
  },
  {
    name: 'Octabox',
    en: ['Octabox', 'A big eight-sided softbox: by 1982 it lights the set where the umbrella used to be.'],
    text: 'Una ventana de luz grande de ocho lados: en 1982 ilumina donde antes estaba el paraguas.',
    boxes: [[2.9, 1.85, 3.3, 1.3, 1.3, 0.8], [2.9, 0.8, 3.3, 0.36, 1.6, 0.36]],
    view: [[1.2, 1.7, 5.0], [2.9, 1.8, 3.3]],
  },
  {
    name: 'Tocador de maquillaje',
    en: ['Make-up table', 'The make-up table with its mirror ringed with bulbs: last touches before every shot.'],
    text: 'El tocador de maquillaje con el espejo rodeado de bombillas: los últimos retoques antes de cada foto.',
    box: [-3.72, 0.8, 3.3, 0.6, 1.6, 1.0],
    view: [[-1.9, 1.4, 3.6], [-3.7, 1.1, 3.3]],
  },
  {
    name: 'Ventilador',
    en: ['Studio fan', 'A studio fan: a little air moves the hair and the suit so the photo does not look stiff.'],
    text: 'Un ventilador de estudio: un poco de aire mueve el pelo y el traje para que la foto no salga rígida.',
    boxes: [[-2.7, 1.0, 1.3, 0.7, 0.7, 0.4], [-2.7, 0.45, 1.3, 0.36, 0.9, 0.36]],
    view: [[-1.2, 1.3, 2.6], [-2.7, 0.95, 1.3]],
  },
  {
    name: 'Burro de vestuario',
    en: ['Wardrobe rack', 'The wardrobe rack, now by the exit: spare white suits and black shirts.'],
    text: 'El burro de vestuario, ahora junto a la salida: trajes blancos y camisas negras de recambio.',
    box: [-1.25, 0.82, 9.75, 1.42, 1.64, 0.8],
    view: [[-0.8, 1.5, 7.6], [-1.25, 1.1, 9.75]],
  },
  {
    id: 'backdrop',
    name: 'El fondo negro',
    en: ['The black backdrop', 'The black seamless paper of the Thriller shoot.'],
    text: 'El papel negro sin fin de la sesión de Thriller.',
    boxes: [[-2.3, 2.2, -0.82, 0.5, 2.8, 0.06], [2.75, 2.2, -0.82, 0.5, 2.8, 0.06]],
    view: [[0.2, 1.4, 3.6], [0.2, 1.5, -0.9]],
  },
];

/**
 * @param {{
 *   onHover: (on: boolean, name?: string) => void,
 *   onInspect: (text: string, id: string) => void,
 *   lang: string,
 * }} props
 */
export default function Hotspots({ onHover, onInspect, lang, album = 'otw' }) {
  const spots = album === 'thriller' ? [...SPOTS.filter((s) => !s.only), ...SPOTS_THRILLER] : SPOTS;
  return (
    <group>
      {spots.flatMap((s) => (s.boxes ?? [s.box]).map((box) => [s, box])).map(([s, box]) => {
        const [x, y, z, w, h, d] = box;
        return (
          <mesh
            key={`${s.name}-${x}-${y}`}
            position={[x, y, z]}
            visible={SHOW}
            onClick={(e) => {
              e.stopPropagation();
              // Un arrastre para girar la cámara no cuenta como pulsar.
              if (e.delta > 6) return;
              goTo(s.view[0], s.view[1]);
              const [name, text] = lang === 'en' ? s.en : [s.name, s.text];
              onInspect(text, s.id ?? (s.name === 'Los Jackson 5' ? 'j5' : name));
            }}
            onPointerOver={(e) => {
              e.stopPropagation();
              onHover(true, lang === 'en' ? s.en[0] : s.name);
            }}
            onPointerOut={() => onHover(false)}
          >
            <boxGeometry args={[w, h, d]} />
            {SHOW ? <meshBasicMaterial color="#39ff88" wireframe toneMapped={false} /> : null}
          </mesh>
        );
      })}
    </group>
  );
}
