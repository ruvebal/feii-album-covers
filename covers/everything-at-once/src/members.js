// One entry per side of the star, in the order of the side map (scripts/route_assets.py).
// `tint` is the member's colour in Karu's band illustration; `song` is their track (DIRECTION-v2 3.6).
// `band`: their crop of Karu's band illustration
// (scripts/band_crops.py). `about`: the description each member wrote, in Spanish and English (line breaks kept); `aboutLang`
// overrides the language when the text is the same in both (Andrés: a song in Chinese, kept as written).

const band = (id) => new URL(`../public/band-${id}.webp`, import.meta.url).href;

/** @type {{ id: string, name: string, role: string, tint: string, song: string, band: string, about: { es: string, en: string }, aboutLang?: string }[]} */
export const MEMBERS = [
  { id: 'lucy', name: 'Lucy', role: 'Keyboard', tint: '#f2b94b', song: 'Nihongo Hanasemasen', band: band('lucy'), about: { es: "Tiene una naturaleza curiosa y reflexiva: observa, analiza y busca matices incluso donde parece que no los hay. Pero también le gusta jugar con las posibilidades, improvisar y descubrir que hasta los momentos más cotidianos pueden convertirse en algo extraordinario.", en: "She has a curious, reflective nature: she observes, analyses and looks for nuance even where there seems to be none. But she also likes to play with possibilities, improvise and discover that even the most everyday moments can become something extraordinary." } },
  { id: 'javi', name: 'Javi', role: 'Vocals', tint: '#7dbb7a', song: 'Gringo Star', band: band('javi'), about: { es: "Extrovertido, pero con poca batería social. Se comporta bien en sociedad, aunque a la vez es individualista y cree en el «yo antes que los demás».\nNo se considera buena persona, pero tampoco mala: simplemente alguien que mira por sus intereses.\nGracioso (según él), con un humor algo estúpido.\nAmante de todo y de nada en particular: muchas aficiones, pero no profundiza en ninguna.", en: "Outgoing, but with a low social battery. He behaves well around people, yet at the same time he is an individualist and believes in “me before everyone else”.\nHe doesn't consider himself a good person, but not a bad one either: just someone who looks out for his own interests.\nFunny (in his opinion), with a somewhat stupid sense of humour.\nA lover of everything and nothing in particular: lots of hobbies, but he doesn't go deep into any of them." } },
  { id: 'pavlo', name: 'Pavlo', role: 'Bass', tint: '#9a7fd1', song: 'Es Peligroso Ir Solo', band: band('pavlo'), about: { es: "Bueno, él ha hecho esta página, le gusta hacer tu tu tururum con el bajo y le da mucha pereza escribir una descripción, así que digamos que: el papel de lija, o simplemente lija, es un papel sobre el cual se adhiere algún material abrasivo, como polvo de vidrio o esmeril.", en: "Well, he made this page, he likes going tu tu tururum on the bass and he can't be bothered to write a description, so let's just say: sandpaper is a paper with an abrasive material, such as powdered glass or emery, glued onto it." } },
  { id: 'andres', name: 'Andrés', role: 'Drums', tint: '#d9645a', song: 'Might Be Exaggerating', band: band('andres'), about: { es: "Super idol 的笑容 都沒你的甜\n八月正午的陽光 都沒你耀眼\n熱愛105度的你\n滴滴清純的蒸餾水", en: "Super idol 的笑容 都沒你的甜\n八月正午的陽光 都沒你耀眼\n熱愛105度的你\n滴滴清純的蒸餾水" }, aboutLang: 'zh-Hant' },
  { id: 'guille', name: 'Guille', role: 'Guitar', tint: '#7aa6d9', song: "Let's Go!!1!1", band: band('guille'), about: { es: "Es la columna de la banda: es quien lleva la gestión, pero también el más cercano con la gente. Siempre ha sido muy comprensivo con los demás, callado y centrado en hacer bien lo suyo. Deja que otros se lleven el micro, pero él habla a través de su guitarra.", en: "He is the backbone of the band: he does the management, but he is also the friendliest with people. He has always been very understanding with others, quiet and focused on doing his own things well. He lets the others take the mic, but he speaks through his guitar." } },
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
