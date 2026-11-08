// covers/everything-at-once — the record's sound: the vinyl out plays, put away pauses.
//
// Web Audio, one looping buffer per song. The selected member's song plays (crossfading between members),
// or the interlude when nobody is selected; the interlude keeps its place while a member's song plays.
// The context is created and resumed inside the visitor's gesture (unlock), so later loading never loses
// the browser's permission. A blocked start is reported, never hidden; unlock() again retries.
//
// Excerpts: public/audio/<file>.{opus,m4a}, whole bars from the band's loop starts, each starting on a beat
// (scripts/audio_excerpts.py), so a song's beat is its position * BPM / 60. A song without a file says so
// instead of playing something else.

export const INTERLUDE = 'Good Morning, Mr. Suicide';
const FILE = {
  "Let's Go!!1!1": 'lets-go',
  'Good Morning, Mr. Suicide': 'good-morning-mr-suicide',
  'Gringo Star': 'gringo-star',
  'Es Peligroso Ir Solo': 'es-peligroso-ir-solo',
  'Might Be Exaggerating': 'might-be-exaggerating',
  'Nihongo Hanasemasen': 'nihongo-hanasemasen',
};
/** Each song's tempo (the band's, 8 Nov; the excerpts are cut on it). */
const BPM = {
  "Let's Go!!1!1": 125,
  'Good Morning, Mr. Suicide': 125,
  'Gringo Star': 121,
  'Es Peligroso Ir Solo': 120,
  'Might Be Exaggerating': 165,
  'Nihongo Hanasemasen': 170,
};
const urls = (files) => Object.fromEntries(Object.entries(files).map(([path, url]) => [path.split('/').pop(), url]));
const URLS = urls(import.meta.glob('../public/audio/*.{opus,m4a}', { query: '?url', import: 'default', eager: true }));
const FADE = 1.5; // s, crossfade between songs
const FADE_IN = 1.2; // s, the record comes out: the music swells in
const FADE_OUT = 0.8; // s, the record goes in: the music fades, then the context suspends
// The incoming song rises on a quarter sine (equal power against the outgoing linear fade, so the mix
// does not dip halfway).
const RISE = Float32Array.from({ length: 64 }, (_, i) => Math.sin((i / 63) * (Math.PI / 2)));
const PATIENCE = 1500; // ms a resume may take before it counts as blocked (Chrome leaves it pending)

/** True when this song has an excerpt on the page. */
export const hasRecording = (song) => !!(URLS[`${FILE[song]}.opus`] || URLS[`${FILE[song]}.m4a`]);

/**
 * @param {(status: { state: 'off' | 'loading' | 'playing' | 'blocked' | 'missing', song: string | null }) => void} onStatus
 */
export function createTransport(onStatus) {
  /** @type {AudioContext | null} */
  let ctx = null;
  let on = false;
  let song = INTERLUDE;
  let seq = 0; // the latest sync wins over slower loads
  let cur = null; // { song, src, gain, at, offset, buffer }
  let master = null; // silent while the record is in, so unlocking early never sounds
  let resuming = false; // a resume is in flight: loading, not blocked (yet)
  let hush = 0;
  const missing = new Set();
  const live = new Map(); // source -> song, until it has really ended (fade tails included)
  const buffers = new Map();
  const saved = new Map(); // song -> s into its loop (the interlude resumes there)
  const ext = typeof Audio !== 'undefined' && new Audio().canPlayType('audio/ogg; codecs=opus') ? 'opus' : 'm4a';

  const load = (name) => {
    if (!buffers.has(name)) {
      const url = URLS[`${FILE[name]}.${ext}`] ?? URLS[`${FILE[name]}.m4a`] ?? URLS[`${FILE[name]}.opus`];
      buffers.set(
        name,
        url
          ? fetch(url)
              .then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`))))
              .then((b) => ctx.decodeAudioData(b))
              .catch(() => {
                buffers.delete(name); // a network blip is not forever: the next try fetches again
                return null;
              })
          : Promise.resolve(null),
      );
    }
    return buffers.get(name);
  };

  /** @param {number} fade s; 0 cuts at once (only while silent) */
  const stop = (fade = FADE) => {
    if (!cur) return;
    const c = cur;
    cur = null;
    const now = ctx.currentTime;
    saved.set(c.song, (c.offset + now - c.at) % c.buffer.duration);
    // from wherever it is (it may still be rising after a quick switch) down to silence
    const g = c.gain.gain;
    const v = g.value;
    g.cancelScheduledValues(now);
    g.setValueAtTime(v, now);
    if (fade) g.linearRampToValueAtTime(0, now + fade);
    c.src.stop(now + fade);
  };

  const report = () => {
    if (!on) return onStatus({ state: 'off', song: null });
    if (missing.has(song)) return onStatus({ state: 'missing', song });
    if (ctx?.state !== 'running') return onStatus({ state: resuming ? 'loading' : 'blocked', song });
    onStatus({ state: cur?.song === song ? 'playing' : 'loading', song });
  };
  const resume = () => {
    resuming = true;
    const done = () => {
      resuming = false;
      report();
    };
    const timer = setTimeout(done, PATIENCE);
    ctx.resume().then(
      () => (clearTimeout(timer), done()),
      () => (clearTimeout(timer), done()),
    );
  };

  const sync = async () => {
    const mine = ++seq;
    if (!on || !ctx) return report();
    if (cur?.song === song) return report();
    report();
    const want = song;
    const buffer = await load(want);
    if (mine !== seq || !ctx) return;
    const prev = !!cur;
    stop();
    if (!buffer) {
      missing.add(want);
      return report();
    }
    missing.delete(want);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const gain = ctx.createGain();
    // a switch crossfades; a first song rises on its own too (its file may arrive after the master's swell)
    gain.gain.setValueCurveAtTime(RISE, ctx.currentTime, prev ? FADE : FADE_IN);
    src.connect(gain).connect(master);
    const offset = want === INTERLUDE ? (saved.get(want) ?? 0) : 0; // member songs start at their loop
    src.start(ctx.currentTime, offset);
    live.set(src, want);
    src.onended = () => live.delete(src);
    cur = { song: want, src, gain, at: ctx.currentTime, offset, buffer };
    report();
  };

  return {
    /** Call synchronously inside a click/tap/key handler: creates or resumes the context there. */
    unlock() {
      try {
        if (!ctx) {
          ctx = new AudioContext();
          master = ctx.createGain();
          master.gain.value = on ? 1 : 0;
          master.connect(ctx.destination);
        }
        resume();
      } catch {
        report();
      }
    },
    /** @param {boolean} value the vinyl is out */
    setOn(value) {
      on = value;
      if (ctx) {
        clearTimeout(hush);
        master.gain.cancelScheduledValues(ctx.currentTime);
        // the master holds whatever level it has reached (a quick in-out-in reverses smoothly)
        const v = master.gain.value;
        master.gain.setValueAtTime(v, ctx.currentTime);
        // time constant: about 95 % of the way after three of them
        master.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, (on ? FADE_IN : FADE_OUT) / 3);
        // coming out with a different song chosen while it was in: the paused one never sounds again (it
        // is silent now, under the master), so only the chosen song plays
        if (on && cur && cur.song !== song) stop(0);
        if (on) resume();
        else hush = setTimeout(() => ctx?.suspend(), FADE_OUT * 1500); // well past the fade's tail
      }
      sync();
    },
    /** @param {string | null} memberSong the retained member's song, or null for the interlude */
    setSong(memberSong) {
      song = memberSong ?? INTERLUDE;
      sync();
    },
    /**
     * The audible song's tempo and beat (beats into its loop, as heard: output latency taken off), or null
     * while nothing plays.
     * @returns {{ bpm: number, beat: number } | null}
     */
    clock() {
      if (!cur || !on || ctx?.state !== 'running') return null;
      const heard = ctx.currentTime - (ctx.outputLatency || ctx.baseLatency || 0);
      const pos = (((cur.offset + heard - cur.at) % cur.buffer.duration) + cur.buffer.duration) % cur.buffer.duration;
      return { bpm: BPM[cur.song], beat: (pos * BPM[cur.song]) / 60 };
    },
    /** The songs with a live source right now, fading ones included (for the route checks). */
    sounding: () => [...live.values()],
    close() {
      seq++;
      clearTimeout(hush);
      on = false;
      cur = null;
      live.clear();
      ctx?.close();
      ctx = null;
      buffers.clear();
    },
  };
}
