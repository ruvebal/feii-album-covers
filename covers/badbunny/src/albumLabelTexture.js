// covers/badbunny/src/albumLabelTexture.js — Route-relative album cover texture loader
// for the 4 Bad Bunny vinyl sleeves and turntable center labels.
//
// Uses `new URL('../public/...', import.meta.url).href` (Route contract 2) and tags every
// texture with `SRGBColorSpace` for accurate color reproduction in Three.js.

import { useTexture } from '@react-three/drei';
import { SRGBColorSpace } from 'three';

export const ALBUM_COVER_URLS = {
  yhlqmdlg: new URL('../public/sleeve.png', import.meta.url).href,
  dtmf: new URL('../public/dtmf.png', import.meta.url).href,
  uvst: new URL('../public/uvst.jpg', import.meta.url).href,
  eutdm: new URL('../public/eutdm.jpg', import.meta.url).href,
};

export const STUDIO_FRAME_URLS = {
  banderaPr: new URL('../public/bandera_pr.png', import.meta.url).href,
  badBunny: new URL('../public/badbunny.jpeg', import.meta.url).href,
};

function tagSrgb(texture) {
  if (Array.isArray(texture)) {
    texture.forEach((t) => {
      t.colorSpace = SRGBColorSpace;
    });
  } else if (texture) {
    texture.colorSpace = SRGBColorSpace;
  }
}

/**
 * Loads the official downloaded cover image for any of the 4 Bad Bunny albums
 * (`yhlqmdlg`, `dtmf`, `uvst`, `eutdm`) from `covers/yhlqmdlg/public/`.
 */
export function useAlbumCoverTexture(albumId) {
  const url = ALBUM_COVER_URLS[albumId] || ALBUM_COVER_URLS.yhlqmdlg;
  return useTexture(url, tagSrgb);
}

/**
 * Loads a studio wall frame texture (`banderaPr` or `badBunny`) from `covers/badbunny/public/`.
 */
export function useStudioFrameTexture(frameKey) {
  const url = STUDIO_FRAME_URLS[frameKey] || STUDIO_FRAME_URLS.banderaPr;
  return useTexture(url, tagSrgb);
}
