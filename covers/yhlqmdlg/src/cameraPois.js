// covers/yhlqmdlg/src/cameraPois.js — Camera Point-of-Interest presets for the YHLQMDLG Blender 3D World.
// Calibrated with generous framing distances so clicking any 3D figure shows the full character/object
// and its surrounding context without excessive zoom.

export const CAMERA_POIS = {
  overview: {
    id: 'overview',
    label: 'Vista General (Dentro del Disco)',
    shortLabel: '🌌 Vista Portada',
    description: 'Vista inmersiva dentro de la calle de YHLQMDLG con todos los elementos en 3D y tormenta eléctrica.',
    position: [0.0, 2.55, 6.4],
    target: [0.0, 1.65, -1.2],
  },
  boy: {
    id: 'boy',
    label: 'Niño del Tercer Ojo en BMX',
    shortLabel: '🚲 Niño Tercer Ojo',
    description: 'El niño con tres ojos haciendo caballito en su BMX azul metálica con potencia dorada.',
    position: [0.25, 1.95, 5.15],
    target: [-0.25, 1.40, 1.05],
  },
  flyingCar: {
    id: 'flyingCar',
    label: 'Coche Volador con Faros',
    shortLabel: '🚗 Coche Volador',
    description: 'El sedán ochentero levitando en el cielo tormentoso con dos haces de luz atravesando las nubes.',
    position: [0.15, 3.10, 2.25],
    target: [2.65, 3.10, -1.85],
  },
  burningCar: {
    id: 'burningCar',
    label: 'Coche en Llamas',
    shortLabel: '🔥 Coche Ardiendo',
    description: 'El coche estacionado a la izquierda de la avenida envuelto en llamaradas 3D.',
    position: [-1.75, 2.15, 3.05],
    target: [-3.85, 1.45, -1.65],
  },
  ladyDog: {
    id: 'ladyDog',
    label: 'Señora y Perro Volando',
    shortLabel: '🐕 Señora & Perro',
    description: 'La señora llevándose las manos a la cabeza mientras su chihuahua y el cubo de basura salen volando.',
    position: [0.65, 1.85, 3.45],
    target: [3.35, 1.48, -0.65],
  },
  pole: {
    id: 'pole',
    label: 'Farola y Poste Eléctrico',
    shortLabel: '⚡ Farola Chispas',
    description: 'El poste eléctrico inclinado con transformador y farola echando chispas azules y rayos en mitad de la tormenta.',
    position: [-1.15, 3.35, 1.05],
    target: [-4.55, 3.95, -3.05],
  },
  turntable: {
    id: 'turntable',
    label: 'Tocadiscos (180° Detrás)',
    shortLabel: '🎛️ Girar 180° al Vinilo',
    description: 'Detrás de la cámara inicial (180°): el vinilo sin funda con la portada en el centro. Pon la aguja sobre el disco para que suene la música.',
    position: [0.35, 3.10, 3.95],
    target: [0.25, 0.68, 7.55],
  },
};
