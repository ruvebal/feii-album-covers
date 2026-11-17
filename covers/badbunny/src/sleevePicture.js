// covers/badbunny/src/sleevePicture.js — Route-relative KTX2 texture loader (Route contract 2).
//
// All assets live inside `covers/badbunny/public/` and are resolved via
// `new URL('../public/...', import.meta.url).href` so they never collide with other routes
// and continue to resolve when the aggregator is built under a subfolder (`BASE_URL`).

import { useKTX2Texture } from '../../../src/lib/ktx2.js';

export const SLEEVE_KTX2_URLS = {
  etc1s: new URL('../public/sleeve-etc1s.ktx2', import.meta.url).href,
  uastc: new URL('../public/sleeve-uastc.ktx2', import.meta.url).href,
};

/** Loads `sleeve-etc1s.ktx2` or `sleeve-uastc.ktx2` using the shared repo Basis transcoder. */
export function useBadBunnyKtx2(mode = 'uastc') {
  return useKTX2Texture(SLEEVE_KTX2_URLS[mode] || SLEEVE_KTX2_URLS.uastc);
}
