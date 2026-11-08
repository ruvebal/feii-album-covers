// covers/everything-at-once — Texas Red, Everything at Once (2025).
// Hybrid route: the record (Karu's sleeve as a shadow box, her back cover, the vinyl and its label) in
// WebGL/WebGPU, with the title, members, record controls, tracklist and credits as DOM.

import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { Canvas, events as createPointerEvents, useFrame } from '@react-three/fiber';
import { useSearchParams } from 'react-router-dom';
import * as THREE from 'three/webgpu';
import { withinCeiling } from '../../../src/lib/budget.js';
import usePrefersReducedMotion from '../../../src/lib/usePrefersReducedMotion.js';
import { CEILING } from './budget.js';
import { createTransport } from './audio.js';
import { AUDIO } from './heroes.js';
import { MEMBERS, TRACKS } from './members.js';
import Record from './Record.jsx';
import { FOV, FRONT_Z, VIEW_DISTANCE } from './Diorama.jsx';
import RouteBudgetProbe from './RouteBudgetProbe.jsx';
import { move, press, release, resetTurn, TURN } from './turn.js';
import './route.css';

const DPR = [1, 1.5];
const POSTER_URL = new URL('../public/poster.jpg', import.meta.url).href;
const OPENING_KEY = 'everything-at-once:opened'; // the opening plays once per browser session
// Sketchfab sources recorded in docs/ktx2-note.md.
const MODEL_CREDITS = [
  ['Ship in a bottle', 'Loïc Norgeot', 'CC BY-NC 4.0'],
  ['Nintendo 64', 'DevonCarlson', 'CC BY-NC 4.0'],
  ['2008 Dodge Viper SRT10', 'Ddiaz Design', 'CC BY-NC 4.0'],
  ['Tiny frog', 'yanix', 'CC BY 4.0'],
  ['Cute flip phone', 'Kevin Perlado', 'CC BY 4.0'],
  ['Dice D20', 'dutrabr98', 'CC BY 4.0'],
  ['Metronome', 'burnedhrum', 'CC BY 4.0'],
];
const byId = (id) => MEMBERS.find((m) => m.id === id) ?? null;

/** R3F events come from the whole stage (the canvas sits under the DOM hit polygon), normalized against
 *  the canvas, so the polygon and the scene's own hit tests see the same pointer. */
const stageEvents = (store) => ({
  ...createPointerEvents(store),
  compute(event, state) {
    const r = state.gl.domElement.getBoundingClientRect();
    state.pointer.set(((event.clientX - r.left) / r.width) * 2 - 1, -((event.clientY - r.top) / r.height) * 2 + 1);
    state.raycaster.setFromCamera(state.pointer, state.camera);
    // the vinyl zone is reserved: the member hit test never sees it (the ray points away; the pointer
    // itself stays true, for the hover tilt)
    if (event.target?.dataset?.hit === 'vinyl') state.raycaster.ray.direction.negate();
  },
});

/** A hit polygon's SVG point slots, written by Record every frame: the sleeve's projected outline (8 points)
 *  and the vinyl zone (4). */
const bindZone = (key, n) => (el) => {
  if (!el) return;
  // StrictMode attaches the ref twice: top up to n slots instead of appending n each time
  while (el.points.numberOfItems < n) el.points.appendItem(el.ownerSVGElement.createSVGPoint());
  TURN[key] = el.points;
  return () => {
    TURN[key] = null;
  };
};
const bindHull = bindZone('hull', 8);
const bindVinyl = bindZone('vinylZone', 4);
const STATUS = {
  off: () => '',
  loading: (song) => `Loading ${song}…`,
  playing: (song) => `Now playing: ${song}`,
  blocked: () => 'The browser blocked the sound. Tap the disc to try again.',
  missing: (song) => `${song}: no recording on this page yet.`,
};

// Local Phase A probes (src/probe/, git-ignored), dev server only: ?probe=<name> loads ./probe/<Name>Probe.jsx.
// The DEV guard keeps them out of production builds even when the files exist locally.
const PROBES = import.meta.env.DEV ? import.meta.glob('./probe/*Probe.jsx') : {};
const LAZY = Object.fromEntries(Object.entries(PROBES).map(([file, load]) => [file.toLowerCase(), lazy(load)]));

export default function Route() {
  const [search] = useSearchParams();
  const Probe = LAZY[`./probe/${search.get('probe') ?? ''}probe.jsx`.toLowerCase()];
  return Probe ? (
    <Suspense fallback={null}>
      <Probe />
    </Suspense>
  ) : (
    <CoverRoute />
  );
}

/** Keeps the poster up and says so if the 3D part fails; the DOM content stays usable. */
class SceneBoundary extends Component {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError?.(); // the route shows its poster again, even after the scene had loaded
  }
  render() {
    return this.state.failed ? <p className="eao__failed">The 3D record could not load. The cover above is Karu&apos;s artwork.</p> : this.props.children;
  }
}

/** Signals that everything inside Suspense has loaded (textures included). */
function Ready({ onReady }) {
  useEffect(() => onReady(), [onReady]);
  return null;
}

/** The first-visit opening: the layers spread from flat to their depths in one second. Timed from its
 *  first rendered frame (the frame after the textures upload can be long), in real time. */
function Opening({ spreadRef, runningRef }) {
  const start = useRef(0);
  useFrame(({ clock }) => {
    if (!runningRef.current) {
      start.current = 0;
      return;
    }
    if (!start.current) start.current = clock.elapsedTime;
    spreadRef.current = Math.min(1, clock.elapsedTime - start.current);
    if (spreadRef.current >= 1) runningRef.current = false;
  });
  return null;
}

function CoverRoute() {
  const reduced = usePrefersReducedMotion();
  const [search] = useSearchParams();
  const debug = search.has('debug');
  const fps = search.get('debug') === 'fps'; // ?debug=fps: frame-rate overlay for the hardware/phone gates
  const [hovered, setHovered] = useState(null);
  // ?pin=<member> opens with that member selected; anything else starts at rest.
  const [pinned, setPinned] = useState(() => byId(search.get('pin'))?.id ?? null);
  const [face, setFace] = useState('front');
  const [out, setOut] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const stage = useRef(null);
  const [budget, setBudget] = useState(null);
  const spread = useRef(1);
  const opening = useRef(false);
  const pendingOpening = useRef(false);
  const flickedAt = useRef(0); // when the last drag ended: its pointer-up/click is not a tap
  const [sound, setSound] = useState({ state: 'off', song: null });
  useEffect(() => {
    AUDIO.playing = sound.state === 'playing';
    return () => {
      AUDIO.playing = false;
    };
  }, [sound.state]);
  const transport = useRef(null);

  // The opening: consumed as soon as it starts (also when reduced motion skips it), so leaving and
  // coming back in the same session never replays it.
  useEffect(() => {
    if (sessionStorage.getItem(OPENING_KEY)) return;
    sessionStorage.setItem(OPENING_KEY, '1');
    if (reduced) return;
    spread.current = 0; // runs once the record has loaded (onReady), not behind the poster
    pendingOpening.current = true;
  }, [reduced]);
  // Any visitor action, or reduced motion turning on, finishes the opening at once.
  const settle = useCallback(() => {
    spread.current = 1;
    opening.current = false;
    pendingOpening.current = false;
  }, []);
  const onReady = useCallback(() => {
    setReady(true);
    if (pendingOpening.current) {
      pendingOpening.current = false;
      opening.current = true;
    }
  }, []);
  useEffect(() => {
    if (reduced) settle();
  }, [reduced, settle]);

  // Hover previews only on the front with the vinyl put away and nobody selected: once a member is chosen
  // only a click changes it (user, 7 Nov). With the vinyl out the retained member performs to its song; on
  // the back nobody does (the selection is kept).
  const hoverable = face === 'front' && !out;
  const active = face !== 'front' ? null : (pinned ?? (out ? null : hovered));
  const member = byId(active ?? pinned);
  const verdict = withinCeiling(budget, CEILING);

  useEffect(() => {
    document.documentElement.classList.add('route-everything-at-once');
    resetTurn(); // one record at a time: the gesture state is module-level
    return () => {
      resetTurn();
      document.documentElement.classList.remove('route-everything-at-once');
      document.body.style.cursor = 'auto';
    };
  }, []);
  useEffect(() => {
    if (!debug) return;
    window.__eaoTurn = TURN; // scripts/route-check.mjs reads the gesture state
    window.__eaoAudio = transport; // ... and which songs are sounding
    return () => {
      delete window.__eaoTurn;
      delete window.__eaoAudio;
    };
  }, [debug]);
  useEffect(() => {
    document.body.style.cursor = hovered ? 'pointer' : 'auto';
  }, [hovered]);

  // The record's sound: out plays the retained member's song (or the interlude), in pauses.
  useEffect(() => {
    const t = createTransport(setSound);
    transport.current = t;
    return () => {
      t.close();
      transport.current = null;
    };
  }, []);
  useEffect(() => transport.current?.setOn(out), [out]);
  useEffect(() => transport.current?.setSong(byId(pinned)?.song ?? null), [pinned]);
  /** Out or in. Called from the visitor's own gesture or key, so the sound is unlocked right there. */
  const setRecordOut = useCallback((v) => {
    if (v) transport.current?.unlock();
    setOut(v);
  }, []);

  const dismiss = useCallback(() => {
    setPinned(null);
    setHovered(null); // Escape used to leave the hovered/focused member visible
  }, []);
  /** Choose a member: from the back, return to the front first. The vinyl stays where it is. */
  const choose = useCallback((id, toggle = true) => {
    if (Date.now() - flickedAt.current < 300) return; // the pointer-up that ended a flick is not a tap
    setFace('front');
    setPinned((p) => {
      if (toggle && p === id) {
        setHovered(null); // a repeat selection dismisses the preview too
        return null;
      }
      return id;
    });
  }, []);
  // Hover previews come from a mouse only: a tap also fires enter/move events, which would leave the
  // tapped member previewed after a phone user dismissed it.
  const preview = (id, pointerType = 'mouse') => {
    if (hoverable && pointerType === 'mouse' && (TURN.mode === 'idle' || TURN.mode === 'pending')) setHovered(id);
  };
  // Turning keeps the vinyl where it is: extraction survives a turn.
  const turnOver = () => setFace((v) => (v === 'front' ? 'back' : 'front'));
  /** The vinyl's action: put an extracted disc away from either face (or retry blocked sound on it);
   *  extraction starts from the front. */
  const vinylAction = (retry = false) => {
    if (out && retry && sound.state === 'blocked') transport.current?.unlock();
    else if (out) setRecordOut(false);
    else {
      setFace('front');
      setRecordOut(true);
    }
  };
  // A click on the front that is not a member: with the vinyl out it goes back in.
  const onBlank = () => {
    if (Date.now() - flickedAt.current < 300) return;
    if (out) setRecordOut(false);
  };

  // Escape dismisses inside the route only (the stage and panel), never as a global window handler.
  const onKeyDown = (e) => {
    settle();
    if (e.key === 'Escape') dismiss();
    if (e.target !== stage.current) return; // a focused control handles its own keys
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      turnOver();
    }
    if ((e.key === ' ' || e.key === 'Enter') && (out || face === 'front')) {
      e.preventDefault();
      vinylAction();
    }
  };

  // Drag-to-turn: a gesture starts only on the sleeve's projected polygon, which owns one pointer (the
  // first) through release; elsewhere the page scrolls and pinch-zoom stays native.
  const onPointerDown = (e) => {
    stage.current?.focus({ preventScroll: true }); // so Escape after a canvas selection reaches the route
    // off the record, a second finger, or not the primary button (a context menu can swallow its pointerup)
    const zone = e.target.dataset?.hit;
    if (!zone || TURN.id !== -1 || e.button !== 0) return;
    // a mouse pull ends on pointerup, which is not a user activation: unlock on the press (silent while in)
    if (zone === 'vinyl') transport.current?.unlock();
    press(e, face, zone);
    e.target.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e) => {
    // the mouse button came up where we never heard it: end the gesture as cancelled
    if (e.pointerType === 'mouse' && e.buttons === 0 && e.pointerId === TURN.id) return endTurn(e, true);
    const was = TURN.mode;
    if (move(e) && was === 'pending') setHovered(null); // the drag parks any hover preview
  };
  const endTurn = (e, cancel) => {
    const r = release(e, cancel, reduced);
    if (!r) return;
    if ('tap' in r) {
      if (r.tap === 'vinyl') vinylAction(true);
      else if (r.tap === 'sleeve' && out && face === 'back') setRecordOut(false); // the front's own click decides there
      return;
    }
    flickedAt.current = Date.now();
    if ('out' in r) setRecordOut(r.out);
    else setFace(r.face);
  };

  return (
    <main className="eao" onKeyDown={onKeyDown} onPointerDownCapture={settle}>
      <div
        ref={stage}
        tabIndex={-1}
        className="eao__cover"
        style={{ backgroundImage: ready && !failed ? 'none' : `url(${POSTER_URL})` }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={(e) => endTurn(e, false)}
        onPointerCancel={(e) => endTurn(e, true)}
        onLostPointerCapture={(e) => endTurn(e, true)}
      >
        <SceneBoundary onError={() => setFailed(true)}>
          <Canvas
            flat
            dpr={DPR}
            eventSource={stage}
            events={stageEvents}
            camera={{ position: [0, 0, VIEW_DISTANCE + FRONT_Z], fov: FOV }}
            gl={async (props) => {
              // TSL on the WebGL 2 backend everywhere (course: WebGL); TSL compiles to GLSL there
              const r = new THREE.WebGPURenderer({ ...props, forceWebGL: true });
              await r.init();
              return r;
            }}
          >
            <Suspense fallback={null}>
              <Record
                face={face}
                out={out}
                reduced={reduced}
                active={active}
                hoverable={hoverable}
                spread={spread}
                onHover={preview}
                onSelect={choose}
                onBlank={onBlank}
              />
              <Ready onReady={onReady} />
            </Suspense>
            <Opening spreadRef={spread} runningRef={opening} />
            <RouteBudgetProbe onSample={setBudget} fps={fps} debug={debug} />
          </Canvas>
        </SceneBoundary>
        <svg className="eao__hit" aria-hidden="true">
          <polygon ref={bindHull} data-hit="sleeve" />
          <polygon
            ref={bindVinyl}
            data-hit="vinyl"
            onPointerEnter={(e) => (TURN.peek = e.pointerType === 'mouse')}
            onPointerLeave={() => (TURN.peek = false)}
          />
        </svg>
        <hgroup className="eao__title">
          <h1>Everything at Once</h1>
          <p>Texas Red</p>
        </hgroup>
      </div>

      <aside className="eao__panel" aria-label="Band members and record">
        <ul className="eao__members">
          {MEMBERS.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                style={{ '--tint': m.tint }}
                aria-pressed={pinned === m.id}
                onPointerEnter={(e) => preview(m.id, e.pointerType)}
                onPointerLeave={() => setHovered(null)}
                onFocus={(e) => e.target.matches(':focus-visible') && preview(m.id)} // keyboard focus, not a tap
                onBlur={() => setHovered(null)}
                onClick={() => choose(m.id)}
              >
                {m.name}
              </button>
            </li>
          ))}
        </ul>
        <p className="eao__info" aria-live="polite">
          {member ? (
            <>
              <strong>{member.name}</strong> — {member.role} · <em>{member.song}</em>
            </>
          ) : (
            'Hover a side of the star, or pick a member.'
          )}
        </p>
        <p className="eao__status" aria-live="polite">
          {STATUS[sound.state](sound.song)}
          {sound.state === 'blocked' && (
            <button type="button" onClick={() => transport.current?.unlock()}>
              Try the sound again
            </button>
          )}
        </p>
        <div className="eao__controls">
          <button type="button" onClick={turnOver}>
            {face === 'front' ? 'Turn the record over' : 'Show the front'}
          </button>
          <button type="button" aria-expanded={out} onClick={() => vinylAction()}>
            {out ? 'Put the record away' : 'Slide the record out'}
          </button>
          {pinned && (
            <button type="button" onClick={dismiss}>
              Close member
            </button>
          )}
        </div>
        <section className="eao__tracks" aria-label="Tracklist">
          <h2>Tracklist</h2>
          <ol>
            {TRACKS.map((t) => {
              const owner = MEMBERS.find((m) => m.song === t);
              return (
                <li key={t}>
                  {owner ? (
                    <button type="button" onClick={() => choose(owner.id, false)}>
                      {t} <span>· {owner.name}</span>
                    </button>
                  ) : (
                    t
                  )}
                </li>
              );
            })}
          </ol>
        </section>
        <p className="eao__credits">Cover and illustrations: Karu. 3D scene: Guille (Texas Red). Used with permission.</p>
        <details className="eao__credits">
          <summary>3D model credits</summary>
          <ul>
            {MODEL_CREDITS.map(([title, author, licence]) => (
              <li key={title}>
                “{title}” by {author}, {licence}; modified (reduced, retextured).
              </li>
            ))}
          </ul>
        </details>
        {debug && (
          <p className={verdict === false ? 'eao__budget over' : 'eao__budget'}>
            {budget
              ? `calls ${budget.calls} · triangles ${budget.triangles} · geometries ${budget.geometries} · textures ${budget.textures}`
              : 'Sampling…'}
          </p>
        )}
        {fps && (
          <p className="eao__fps">
            {budget?.fps
              ? `${budget.fps.avg.toFixed(1)} fps · p95 ${budget.fps.p95.toFixed(1)} ms · ${budget.fps.seconds.toFixed(0)} s · calls ${budget.calls} · ${budget.fps.size} @${budget.fps.dpr} · ${budget.fps.gpu}`
              : 'Sampling…'}
          </p>
        )}
      </aside>
    </main>
  );
}
