// stadiumGlb.js — camino GLTF + KTX2 + meshopt para task3. INACTIVO en task1 (USE_GLB = false).
//
// En task3 el GLB de Blender (nodos Freddie, Mic, Stage, Stadium, Fan_LOD0, Fan_LOD1)
// se optimiza a public/stadium.ktx2.glb y se carga aquí. Reutiliza la ruta del
// transcoder COMPARTIDO (src/lib/ktx2.js → TRANSCODER_PATH = BASE_URL + 'basis/'):
// no se copia el transcoder. useKTX2Texture de ese módulo sirve para .ktx2 sueltos,
// no para GLTFLoader, por eso aquí se crea el KTX2Loader con la misma ruta.
// Loaders desde three/addons (la misma copia que usa src/lib/ktx2.js), no three-stdlib.

import { useEffect } from 'react';
import { useLoader, useThree } from '@react-three/fiber';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { TRANSCODER_PATH } from '../../../src/lib/ktx2.js';

/** task1: placeholders procedurales. task3: true cuando exista public/stadium.ktx2.glb. */
export const USE_GLB = false;

// TODO(task3): descomentar cuando el archivo exista (Vite resuelve la URL en build).
// export const MODEL_URL = new URL('../public/stadium.ktx2.glb', import.meta.url).href;

let ktx2Loader = null;

/**
 * Carga el GLB del estadio con KTX2 + meshopt.
 *
 * @param {string} url
 * @returns {import('three/addons/loaders/GLTFLoader.js').GLTF}
 */
export function useStadiumGLTF(url) {
  const gl = useThree((state) => state.gl);
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    ktx2Loader ??= new KTX2Loader().setTranscoderPath(TRANSCODER_PATH);
    ktx2Loader.detectSupport(gl);
    loader.setKTX2Loader(ktx2Loader);
    loader.setMeshoptDecoder(MeshoptDecoder);
  });

  // Al desmontar la ruta: liberar el pool de workers del transcoder.
  useEffect(
    () => () => {
      ktx2Loader?.dispose();
      ktx2Loader = null;
    },
    [],
  );
  return gltf;
}
