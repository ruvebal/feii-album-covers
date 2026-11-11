// covers/yhlqmdlg/src/sleevePicture.js — Route-relative texture loaders (Route contract 2)
// and GPU byte measurements (`src/lib/gpuBytes.js` + `src/lib/ktx2.js`).
//
// All sleeve assets live inside `covers/yhlqmdlg/public/` and are resolved via
// `new URL('../public/...', import.meta.url).href` so they never collide with other routes
// and continue to resolve when the aggregator is built under a subfolder (`BASE_URL`).

import { useEffect, useState } from 'react';
import { useTexture } from '@react-three/drei';
import { SRGBColorSpace } from 'three';
import { useKTX2Texture } from '../../../src/lib/ktx2.js';
import { gpuBytes } from '../../../src/lib/gpuBytes.js';

export const SLEEVE_PNG_URL = new URL('../public/sleeve.png', import.meta.url).href;

export const SLEEVE_KTX2_URLS = {
  etc1s: new URL('../public/sleeve-etc1s.ktx2', import.meta.url).href,
  uastc: new URL('../public/sleeve-uastc.ktx2', import.meta.url).href,
};

export const TEXTURE_MODES = [
  { id: 'uastc', label: 'KTX2 UASTC', badge: 'Chosen (Clean type & detail)' },
  { id: 'etc1s', label: 'KTX2 ETC1S', badge: 'Smallest file & VRAM' },
  { id: 'png', label: 'Source PNG', badge: 'Unpacked RGBA8' },
];

export const TEXTURE_URLS = {
  png: SLEEVE_PNG_URL,
  etc1s: SLEEVE_KTX2_URLS.etc1s,
  uastc: SLEEVE_KTX2_URLS.uastc,
};

function tagSrgb(texture) {
  texture.colorSpace = SRGBColorSpace;
}

/** Loads `covers/yhlqmdlg/public/sleeve.png` tagged as sRGB. */
export function useYhlqmdlgPng() {
  return useTexture(SLEEVE_PNG_URL, tagSrgb);
}

/** Loads `sleeve-etc1s.ktx2` or `sleeve-uastc.ktx2` using the shared repo Basis transcoder. */
export function useYhlqmdlgKtx2(mode) {
  return useKTX2Texture(SLEEVE_KTX2_URLS[mode]);
}

/** Computes GPU bytes (all mip levels & level 0) + format & colorSpace verification. */
export function inspectSleeveTexture(texture, mode) {
  const all = gpuBytes(texture, { levels: 'all' });
  const level0 = gpuBytes(texture, { levels: 'level0' });
  return {
    mode,
    gpuBytesAll: all.bytes,
    gpuBytesLevel0: level0.bytes,
    levels: all.levels,
    width: all.width,
    height: all.height,
    format: all.format,
    colorSpace: texture.colorSpace,
    colorSpaceOk: texture.colorSpace === SRGBColorSpace,
  };
}

/** Fetches the exact file bytes on disk ("the suitcase") for the active mode URL. */
export function useAssetFileBytes(url) {
  const [record, setRecord] = useState({ url: null, bytes: null });

  useEffect(() => {
    if (!url) return undefined;
    let mounted = true;
    fetch(url)
      .then((res) => res.arrayBuffer())
      .then((buf) => {
        if (mounted) setRecord({ url, bytes: buf.byteLength });
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [url]);

  return record.url === url ? record.bytes : null;
}
