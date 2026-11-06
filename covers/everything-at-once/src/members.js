// One entry per side of the star, in the order of the side map (scripts/route_assets.py).
// `tint` is the member's colour in Karu's band illustration; `song` is their track (DIRECTION-v2 3.6).

/** @type {{ id: string, name: string, role: string, tint: string, song: string }[]} */
export const MEMBERS = [
  { id: 'lucy', name: 'Lucy', role: 'Keyboard', tint: '#f2b94b', song: 'Nihongo Hanasemasen' },
  { id: 'javi', name: 'Javi', role: 'Vocals', tint: '#7dbb7a', song: 'Gringo Star' },
  { id: 'pavlo', name: 'Pavlo', role: 'Bass', tint: '#9a7fd1', song: 'Es Peligroso Ir Solo' },
  { id: 'andres', name: 'Andrés', role: 'Drums', tint: '#d9645a', song: 'Might Be Exaggerating' },
  { id: 'guille', name: 'Guille', role: 'Guitar', tint: '#7aa6d9', song: "Let's Go!!1!1" },
];

/** The album's nine tracks, in the order of Karu's back cover. */
export const TRACKS = [
  "Let's Go!!1!1",
  'Good Morning, Mr. Suicide',
  'Gringo Star',
  'Come and See',
  'Es Peligroso Ir Solo',
  'ILDE',
  'Kraken Eye Joe',
  'Might Be Exaggerating',
  'Nihongo Hanasemasen',
];
