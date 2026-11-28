// Portadas reales de los discos, pedidas a Apple Music (la misma API que da
// los fragmentos). Se enlazan al cargar la página: no se guardan en el repositorio.

import { RECORDS } from './player.js';

/** Portada real de un disco (Apple Music, 512 px), o null si no se puede. */
const coverCache = new Map();
export function loadCover(key) {
  if (!coverCache.has(key)) {
    coverCache.set(
      key,
      fetch(`https://itunes.apple.com/lookup?id=${RECORDS[key].id}&country=es`)
        .then((r) => r.json())
        .then(
          (d) =>
            new Promise((resolve) => {
              const url = d.results?.[0]?.artworkUrl100?.replace('100x100bb', '512x512bb');
              if (!url) return resolve(null);
              const img = new Image();
              img.crossOrigin = 'anonymous';
              img.onload = () => resolve(img);
              img.onerror = () => resolve(null);
              img.src = url;
              return undefined;
            }),
        )
        .catch(() => null),
    );
  }
  return coverCache.get(key);
}

