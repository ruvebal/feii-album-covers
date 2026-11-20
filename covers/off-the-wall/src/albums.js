// Los dos discos de la ruta: Off the Wall (1979) y Thriller (1982).
// Todo lo que cambia de uno a otro (canciones, ritmos, Spotify, fecha y
// textos del panel) sale de aquí, así la ruta y la escena solo preguntan
// "¿qué disco está puesto?".
//
// Datos comprobados el 18/11/2026:
//  - Thriller salió el 29 de noviembre de 1982 con Epic Records (Wikipedia,
//    «Thriller (album)»; Apple Music da la misma fecha). Se grabó del 14 de
//    abril al 8 de noviembre de 1982 en Westlake Recording Studios, Los
//    Ángeles, producido por Quincy Jones.
//  - La foto de la portada la hizo Dick Zimmerman en julio de 1982; el traje
//    blanco era del propio fotógrafo. El tigre bebé sale en las fotos de
//    dentro del disco (el desplegable).
//  - El plató de Thriller es el mismo estudio de Off the Wall, tres años
//    después (1982): todo el atrezo nuevo es de 1982 o de antes.

import { TRACK_GROOVES } from './dances.js';

const OTW_TRACKS = [
  "Don't Stop 'Til You Get Enough",
  'Rock with You',
  "Workin' Day and Night",
  'Get on the Floor',
  'Off the Wall',
  'Girlfriend',
  "She's Out of My Life",
  "I Can't Help It",
  "It's the Falling in Love",
  'Burn This Disco Out',
];

const THRILLER_TRACKS = [
  "Wanna Be Startin' Somethin'",
  'Baby Be Mine',
  'The Girl Is Mine',
  'Thriller',
  'Beat It',
  'Billie Jean',
  'Human Nature',
  'P.Y.T. (Pretty Young Thing)',
  'The Lady in My Life',
];

/**
 * Tempo aproximado y carácter de cada canción de Thriller, en orden (para el
 * baile de fondo de Michael).
 */
const THRILLER_GROOVES = [
  { bpm: 122, feel: 'funk' }, // Wanna Be Startin' Somethin'
  { bpm: 118, feel: 'smooth' }, // Baby Be Mine
  { bpm: 80, feel: 'ballad' }, // The Girl Is Mine
  { bpm: 118, feel: 'funk' }, // Thriller
  { bpm: 139, feel: 'funk' }, // Beat It
  { bpm: 117, feel: 'disco' }, // Billie Jean
  { bpm: 93, feel: 'smooth' }, // Human Nature
  { bpm: 127, feel: 'disco' }, // P.Y.T.
  { bpm: 76, feel: 'ballad' }, // The Lady in My Life
];

export const ALBUMS = {
  otw: {
    key: 'otw',
    title: 'Off the Wall',
    year: 1979,
    tracks: OTW_TRACKS,
    grooves: TRACK_GROOVES,
    // Apple Music (fragmentos de 30 s) y Spotify (reproductor oficial).
    appleId: 186166282,
    appleUrl: 'https://music.apple.com/es/album/off-the-wall/186166282',
    spotifyId: '2ZytN2cY4Zjrr9ukb2rqTP',
    spotifyTracks: [
      '46eu3SBuFCXWsPT39Yg3tJ',
      '7oOOI85fVQvVnK5ynNMdW7',
      '6BdiFsPMPkSEEO4fFXFVWX',
      '78XG7U0UueeC86XpzF9O7f',
      '3zYpRGnnoegSpt3SguSo3W',
      '1nCV2d1RAch7t2kRmwet5N',
      '6NGsHLZYGVAkXTFr75WWnn',
      '1HibhNhwk2tljwC4BGGLXV',
      '0CeE7kE8zAnfKIVpdmOaJl',
      '6aCs8gCrp4yrwvw7ylhau2',
    ],
    bpm: 118,
  },
  thriller: {
    key: 'thriller',
    title: 'Thriller',
    year: 1982,
    tracks: THRILLER_TRACKS,
    grooves: THRILLER_GROOVES,
    appleId: 269572838,
    appleUrl: 'https://music.apple.com/es/album/thriller/269572838',
    spotifyId: '2ANVost0y2y52ema1E9xAZ',
    spotifyTracks: [
      '1hu2s7qkm5bo03eODpRQO3',
      '6XYbMGvtl6tlPoGWaiH7EY',
      '4IT6vDuKprKl6jyVndlY8V',
      '2LlQb7Uoj1kKyGhlkBf9aC',
      '3BovdzfaX4jb5KFQwoPfAw',
      '7J1uxwnxfQLu4APicE5Rnj',
      '4cgjA7B4fJBHyB9Ya2bu0t',
      '1CgmY8fVN7kstVDZmsdM5k',
      '07L1pzoVerhRSSaDGZHrKy',
    ],
    bpm: 118,
  },
};

/** El otro disco (el botón de la esquina lleva de uno a otro). */
export const otherAlbum = (key) => (key === 'otw' ? 'thriller' : 'otw');
