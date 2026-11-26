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

export function useAlbumCoverTexture(albumId) {
  const url = ALBUM_COVER_URLS[albumId] || ALBUM_COVER_URLS.yhlqmdlg;
  return useTexture(url, tagSrgb);
}

export function useStudioFrameTexture(frameKey) {
  const url = STUDIO_FRAME_URLS[frameKey] || STUDIO_FRAME_URLS.banderaPr;
  return useTexture(url, tagSrgb);
}
