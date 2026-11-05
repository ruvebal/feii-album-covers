// Imágenes de esta ruta: viven en covers/por-si-manana-no-estoy/public/ y se
// resuelven desde este archivo (regla de CONTRIBUTING.md), nunca desde la raíz.
// Vite las copia al build con hash, así que funcionan también en una subcarpeta.

export const TEXTURE_URLS = {
  cover: new URL('../public/cover.jpg', import.meta.url).href,
  depth: new URL('../public/depth.png', import.meta.url).href,
  glow: new URL('../public/glow.png', import.meta.url).href,
  heart: new URL('../public/heart.png', import.meta.url).href,
  strands: new URL('../public/strands.png', import.meta.url).href,
};
