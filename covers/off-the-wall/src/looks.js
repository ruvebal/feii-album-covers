// La ropa de Michael en cada disco (colores de los materiales de Michael.jsx).

/**
 * Ropa de cada disco: el esmoquin negro de 1979 y el traje blanco con camisa
 * negra de la portada de Thriller (1982). Solo cambian los colores de los
 * materiales compartidos; las piezas son las mismas.
 */
export const LOOKS = {
  otw: { wool: '#0d0c0e', sheen: '#3a3740', satin: '#070608', shirt: '#f3f1ec', shirtGlow: '#fff6e8', skin: '#7a4630', hair: '#1a120d', hairRough: 0.9, lips: '#5e2f22' },
  // Traje de lino blanco algo crema, camisa negra de cremallera, piel un poco
  // más clara que en 1979 y el pelo de rizos cortos y brillantes.
  thriller: { wool: '#ebe6da', sheen: '#ffffff', satin: '#d3ccbc', shirt: '#151417', shirtGlow: '#000000', skin: '#9a6a54', hair: '#22170f', hairRough: 0.55, lips: '#8a4c3d' },
};

/** Pone la ropa del disco `key` cambiando los colores de los materiales. */
export function applyLook(mats, key) {
  const L = LOOKS[key] ?? LOOKS.otw;
  mats.wool.color.set(L.wool);
  mats.wool.sheenColor.set(L.sheen);
  mats.satin.color.set(L.satin);
  mats.shirt.color.set(L.shirt);
  mats.shirt.emissive.set(L.shirtGlow);
  mats.skin.color.set(L.skin);
  mats.hair.color.set(L.hair);
  mats.hair.roughness = L.hairRough;
  mats.lips.color.set(L.lips);
}
