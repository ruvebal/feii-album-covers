// Vinilos del museo: uno por ruta de la galería (covers/registry.json) y los enlaces de los compañeros
// que aún no han mergeado. Cada vinilo con slug entra a /covers/<slug>: si la ruta todavía no existe,
// la galería avisa «No cover at /covers/<slug>» y funcionará sola cuando la suban.
// Las portadas salen de cada ruta: cover.* > sleeve.* > thumbnail.* en su public/.

import registry from '../../registry.json';

export const SELF = 'museo-vinilos';
export const SLOTS = 8;

/** ¿Existe ya la ruta en la galería? (si no, el enlace avisa en el museo en vez de llevar a «No cover») */
export const routeExists = (slug) => registry.some((c) => c.slug === slug);

const IMAGES = import.meta.glob('../../*/public/{cover,sleeve,thumbnail}.{jpg,jpeg,png,svg}', {
  eager: true,
  query: '?url',
  import: 'default',
});

// Portadas reales puestas a mano en public/locales/ (carpeta ignorada por git): solo para ver el museo en local.
// La URL se arma como texto en tiempo de ejecución, así Vite NO las ve ni las mete en el build. En producción no hay petición.
const LOCAL_BASE = import.meta.url.slice(0, import.meta.url.lastIndexOf('/src/')) + '/public/locales/';

function localImage(slug) {
  return import.meta.env.DEV && slug ? `${LOCAL_BASE}${slug}.jpg` : null;
}

function imageFor(slug) {
  for (const base of ['cover', 'sleeve', 'thumbnail']) {
    for (const ext of ['jpg', 'jpeg', 'png', 'svg']) {
      const url = IMAGES[`../../${slug}/public/${base}.${ext}`];
      if (url) return url;
    }
  }
  return slug ? localImage(slug) : null;
}

/**
 * Enlaces a rutas que aún no están en el registro. Fuente: `gh pr list` del 2026-11-18 y mensajes de Andrea.
 * El título sale del slug del PR (sin añadir artista ni año que el PR no diga). Cuando el slug aparece
 * en el registro, esta fila se sustituye sola por los datos reales de la ruta.
 */
const LINKED = [
  { slug: 'queen-bohemian-rhapsody', title: 'Queen · Bohemian Rhapsody', status: 'PR #11 y #13 de gontugithub, sin mergear' },
  { slug: 'off-the-wall', title: 'Off the Wall', status: 'PR #8 y #9 de alexxblaro16, sin mergear' },
  { slug: 'currents', title: 'Currents', status: 'PR #12 de nbfrodri, sin mergear' },
  { slug: 'everything-at-once', title: 'Everything at Once', status: 'PR #10 de PRNovoa, sin mergear' },
  { slug: 'mosca', title: 'mosca · nsqkk', status: 'Tu portada (3.er álbum, 15/oct/2026): ruta sin hacer' },
  // Nadie ha anunciado esta ruta: el slug es una propuesta y puede cambiar. Si no coincide, la galería avisa de que no existe.
  { slug: 'bad-bunny', title: 'Bad Bunny · Un Verano Sin Ti', status: 'Álbum más famoso, elegido por Andrea sin confirmar con quien lo haga; sin ruta anunciada (enlace propuesto: /covers/bad-bunny)' },
];

/** Hasta SLOTS vinilos: primero las rutas reales del registro, luego los enlaces pendientes. */
export function getVinyls() {
  const real = registry
    .filter((c) => !c.slug.startsWith('_') && c.slug !== SELF)
    .map((c) => ({ slug: c.slug, title: c.title, concept: c.concept, authors: c.authors, image: imageFor(c.slug), playable: true, status: '' }));
  const have = new Set(real.map((v) => v.slug));
  const linked = LINKED.filter((p) => !p.slug || !have.has(p.slug)).map((p) => ({ ...p, image: imageFor(p.slug), playable: Boolean(p.slug) }));
  return [...real, ...linked].slice(0, SLOTS);
}
