// covers/off-the-wall/src/budget.js — techo aceptado para el árbol de esta ruta.
//
// Medido el 2026-11-11 con el BudgetProbe de la galería (panel ?budget), en
// Microsoft Edge (ANGLE D3D11, Intel UHD Graphics del i7-13620H), 1440x900.
// La lectura más alta es la vista "El plató" (76 calls); el monitor ahora usa
// una imagen estática en lugar de renderizar otra vista. Ver docs/renderer-info.md.
// Cambiar el árbol obliga a cambiar este techo y la tabla en el mismo PR.

/** @type {import('../../../src/lib/types.js').Ceiling | null} */
// Texturas: 9 desde el título escrito con tiza en la pared (WallTitle.jsx).
// Triángulos: 205 000 desde el atrezo del plató (burro de vestuario, silla,
// tocadiscos, baúles, paraguas, cable y paredes del estudio, todo fundido por
// material). Lectura más alta el 2026-11-11: El plató, 82 calls y 197 294
// triángulos; Portada 72 calls. Texturas: 10 desde el cuadro de los Jackson 5
// (Jackson5.jsx); con el tocadiscos, "Por detrás de Michael" llega a 86 calls.
// Texturas: 11 desde las fundas de los discos de la mesa del tocadiscos.
//
// Medido de nuevo el 2026-11-12 (1440x900, mismo equipo) tras los neones de las
// canciones, el rincón Studio 54, Muscles y el mueble del tocadiscos. El techo
// anterior (98 / 205 000 / 100 / 11) ya se superaba antes de esta ronda desde
// el espejo y el cuadro (117 calls, 104 geometrías y 12 texturas en "Por
// detrás de Michael"). Lecturas más altas ahora: 127 calls y 216 250
// triángulos en "Por detrás de Michael" (ahí el espejo pinta su reflejo), 110
// geometrías y 13 texturas (la nueva es la de los neones).
export const CEILING = { calls: 130, triangles: 220000, geometries: 112, textures: 13 };
