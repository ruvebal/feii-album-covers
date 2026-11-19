// Disco de 12" que saca Steve. Modelo «12" Vinyl Record» de AleixoAlonso (CC BY 4.0, ver public/disc/CREDITS.txt).
// Se usa su geometría y sus mapas de surcos; las dos etiquetas originales (AC/DC, Atlantic) se borraron de la
// textura de color y aquí se pinta en su lugar la etiqueta de cada álbum.

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const DISC_R = 0.15; // radio del modelo, en metros
const url = (name) => new URL(`../public/disc/${name}`, import.meta.url).href;
// centros y radio de las etiquetas en la textura de color, como fracción del lado (medidos en la imagen original)
const LABEL = { centres: [0.291, 0.709], r: 0.0947 };
const SIZE = 2048;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`no se pudo cargar ${src}`));
    img.src = src;
  });
}

/** Carga geometría, mapa de surcos y textura base una sola vez. */
export async function loadDiscAssets(anisotropy = 4) {
  const gltf = await new GLTFLoader().loadAsync(url('disc.glb'));
  let geometry = null;
  gltf.scene.traverse((n) => {
    if (n.isMesh && !geometry) geometry = n.geometry;
  });
  if (!geometry) throw new Error('disc.glb sin malla');
  geometry.rotateX(-Math.PI / 2); // el modelo viene en XY: el eje del disco pasa a Y
  const tl = new THREE.TextureLoader();
  const parts = await Promise.allSettled([tl.loadAsync(url('disc_orm.jpg')), tl.loadAsync(url('disc_normal.jpg')), loadImage(url('disc_base.jpg'))]);
  if (parts.some((p) => p.status === 'rejected')) {
    // éxito parcial: se libera lo que sí llegó antes de avisar del fallo
    parts.forEach((p) => p.status === 'fulfilled' && p.value?.isTexture && p.value.dispose());
    geometry.dispose();
    throw new Error(parts.find((p) => p.status === 'rejected').reason?.message ?? 'disco sin cargar');
  }
  const [orm, normal, baseImg] = parts.map((p) => p.value);
  for (const t of [orm, normal]) {
    t.flipY = false; // las UV de glTF no se voltean
    t.anisotropy = anisotropy;
  }
  return {
    geometry,
    orm,
    normal,
    baseImg,
    dispose() {
      geometry.dispose();
      orm.dispose();
      normal.dispose();
    },
  };
}

/**
 * Material del disco con la etiqueta del álbum.
 * @param {Awaited<ReturnType<typeof loadDiscAssets>>} assets
 * @param {CanvasImageSource | null} source portada (cuadrada) para la etiqueta
 * @param {THREE.Color} colour color de la etiqueta si no hay portada
 * @param {THREE.Texture | null} envMap
 */
export function createDiscMaterial(assets, source, colour, envMap) {
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const g = c.getContext('2d');
  g.drawImage(assets.baseImg, 0, 0, SIZE, SIZE);
  const R = LABEL.r * SIZE;
  for (const f of LABEL.centres) {
    const cx = f * SIZE;
    g.save();
    g.beginPath();
    g.arc(cx, cx, R, 0, Math.PI * 2);
    g.clip();
    if (source) g.drawImage(source, cx - R, cx - R, R * 2, R * 2);
    else {
      g.fillStyle = `#${colour.getHexString()}`;
      g.fillRect(cx - R, cx - R, R * 2, R * 2);
    }
    const shade = g.createRadialGradient(cx, cx, R * 0.55, cx, cx, R);
    shade.addColorStop(0, 'rgba(0,0,0,0)');
    shade.addColorStop(1, 'rgba(0,0,0,0.35)');
    g.fillStyle = shade;
    g.fillRect(cx - R, cx - R, R * 2, R * 2);
    g.restore();
    g.strokeStyle = 'rgba(0,0,0,0.55)';
    g.lineWidth = 4;
    g.beginPath();
    g.arc(cx, cx, R, 0, Math.PI * 2);
    g.stroke();
    g.fillStyle = '#050507'; // agujero del eje
    g.beginPath();
    g.arc(cx, cx, R * 0.075, 0, Math.PI * 2);
    g.fill();
  }
  const map = new THREE.CanvasTexture(c);
  map.flipY = false;
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = assets.normal.anisotropy;
  const material = new THREE.MeshStandardMaterial({
    map,
    normalMap: assets.normal,
    normalScale: new THREE.Vector2(0.9, 0.9),
    roughness: 0.55,
    metalness: 0.12,
    color: 0x8a8a8a, // oscurece la base: la lámpara cercana lo lavaba a blanco
    side: THREE.DoubleSide,
    envMap,
    envMapIntensity: 0.3,
  });
  return {
    material,
    dispose() {
      map.dispose();
      material.dispose();
    },
  };
}
