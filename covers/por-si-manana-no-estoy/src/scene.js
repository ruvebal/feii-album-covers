// Escena Three.js del vinilo (antes src/main.js del proyecto suelto).
// Todo queda limitado al nodo raíz de la ruta y mountCover() devuelve la función
// que lo desmonta: cancela el bucle, quita listeners, para el audio y libera la GPU.

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { recordVertex, recordFragment, particleVertex, particleFragment } from './shaders.js';
import { createTonearm } from './tonearm.js';
import { createPlayer } from './player.js';
import { TEXTURE_URLS } from './textures.js';

const BASE_SPIN = 0.45;  // rad/s en reposo
const PLAY_SPIN = 3.49;  // 33⅓ rpm al pasar por una canción

/** Devuelve null si hay WebGL2 o el motivo por el que el navegador lo niega. */
function webglProblem() {
  const c = document.createElement('canvas');
  let reason = '';
  c.addEventListener('webglcontextcreationerror', (e) => { reason = e.statusMessage || ''; });
  try {
    const gl = c.getContext('webgl2');
    if (gl) {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return null;
    }
  } catch (e) {
    reason ||= e.message;
  }
  return reason || 'WebGL2 no disponible';
}

/**
 * Monta la portada dentro de `root` (el <div> raíz de Route.jsx).
 *
 * @param {HTMLElement} root
 * @param {{ onRenderer?: (renderer: THREE.WebGLRenderer) => void }} [options]
 * @returns {() => void} desmontaje
 */
export function mountCover(root, { onRenderer } = {}) {
  const ac = new AbortController();
  const { signal } = ac;
  const on = (target, type, fn, opts = {}) => target.addEventListener(type, fn, { ...opts, signal });
  const cleanups = [];

  const canvas = root.querySelector('.psmne__scene');
  const loader = root.querySelector('.psmne__loader');
  const titleEl = root.querySelector('.psmne__title h1');
  const letters = [...titleEl.querySelectorAll('.ch')];
  const items = [...root.querySelectorAll('.psmne__tracks li')];
  const tracklist = root.querySelector('.psmne__tracklist');

  const state = {
    boost: 0,
    mouse: new THREE.Vector2(), target: new THREE.Vector2(),
    hover: -1,  // canción bajo el ratón
    track: -1,  // canción activa: la que suena o, si no suena nada, la señalada
    trackGlow: 0,
    spin: 0, spinVel: 10, dragging: false, lastX: 0,
    tilt: 0, tiltV: 0, titleE: 0,
  };

  /* ---------- Fragmentos de audio ---------- */
  const player = createPlayer({
    onChange(current) {
      root.classList.toggle('is-playing', current >= 0);
      items.forEach((li, i) => {
        li.classList.toggle('playing', i === current);
        if (i !== current) li.style.setProperty('--p', 0);
        li.querySelector('button').setAttribute('aria-pressed', String(i === current));
      });
      if (current >= 0) state.boost = 1;
    },
    onProgress(i, p) { items[i]?.style.setProperty('--p', p.toFixed(4)); },
  });
  cleanups.push(() => player.destroy());
  player.ready.then((ok) => {
    if (signal.aborted) return;
    root.classList.toggle('no-previews', !ok);
    const credit = root.querySelector('.psmne__credit a');
    if (ok && player.albumUrl) credit.href = player.albumUrl;
    items.forEach((li, i) => { li.querySelector('button').disabled = !player.has(i); });
  });
  on(window, 'keydown', (e) => { if (e.key === 'Escape') player.stop(); });

  /* ---------- Tracklist ---------- */
  let leaveTimer;
  cleanups.push(() => clearTimeout(leaveTimer));
  items.forEach((li, i) => {
    on(li.querySelector('button'), 'click', () => player.toggle(i));
    on(li, 'mouseenter', () => { clearTimeout(leaveTimer); state.boost = 1; state.hover = i; });
    // al salir espera un poco: así el brazo no sube y baja al pasar de una canción a otra
    on(li, 'mouseleave', () => {
      clearTimeout(leaveTimer);
      leaveTimer = setTimeout(() => { if (state.hover === i) state.hover = -1; }, 450);
    });
  });

  /* ---------- WebGL ---------- */
  // Sin WebGL: vinilo hecho con CSS (el tracklist y los fragmentos siguen funcionando)
  function fallback(reason) {
    if (signal.aborted) return;
    console.warn('[portada 3D] Sin WebGL:', reason);
    root.classList.add('flat');
    const note = root.querySelector('.psmne__nowebgl');
    note.querySelector('.why').textContent = reason;
    note.hidden = false;
    loader.classList.add('done');
  }

  const problem = webglProblem();
  if (problem) fallback(problem);
  else init().catch((e) => fallback(e?.message || String(e)));

  async function init() {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    cleanups.push(() => {
      renderer.setAnimationLoop(null);
      renderer.dispose();
    });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); // tope DPR del curso
    renderer.toneMapping = THREE.NoToneMapping; // colores fieles a la portada
    // el bloom hace varias pasadas por frame: renderer.info se reinicia a mano al empezar
    // cada frame para que el panel ?budget cuente el frame entero, no solo la última pasada
    renderer.info.autoReset = false;

    const scene = new THREE.Scene();
    cleanups.push(() => {
      scene.traverse((o) => {
        o.geometry?.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        mats.forEach((m) => m?.dispose());
      });
    });
    scene.background = new THREE.Color('#02021a');
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    camera.position.set(0, 0, 9);

    const loaderTex = new THREE.TextureLoader();
    const textures = await Promise.all(
      ['cover', 'depth', 'glow', 'heart', 'strands'].map((k) => loaderTex.loadAsync(TEXTURE_URLS[k]))
    );
    cleanups.push(() => textures.forEach((t) => t.dispose()));
    if (signal.aborted) return; // la ruta se desmontó mientras cargaban
    const [map, depth, glow, heart, strands] = textures;
    map.colorSpace = THREE.SRGBColorSpace;
    map.anisotropy = renderer.capabilities.getMaxAnisotropy();

    /* Todo lo que se inclina con el ratón cuelga de "rig" */
    const rig = new THREE.Group();
    scene.add(rig);

    /* Un solo vinilo con la portada impresa en el centro (picture disc).
       Plano muy subdividido recortado en círculo: así la foto puede levantarse en relieve
       desde la misma superficie del disco, sin capas sueltas. */
    const R = 2.7;          // radio del vinilo
    const PHOTO = 1.75;     // media anchura de la foto en el disco
    const uniforms = {
      uMap: { value: map }, uDepth: { value: depth }, uGlow: { value: glow },
      uHeart: { value: heart }, uStrands: { value: strands },
      uMouse: { value: new THREE.Vector2() }, uTime: { value: 0 }, uBoost: { value: 0 },
      uPhoto: { value: PHOTO / R },
      uSpin: { value: 0 }, uLight: { value: new THREE.Vector2(1, 1) },
      uTrack: { value: -1 }, uTrackGlow: { value: 0 },
    };
    const disc = new THREE.Group();
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(R * 2, R * 2, 320, 320),
      new THREE.ShaderMaterial({
        uniforms, vertexShader: recordVertex, fragmentShader: recordFragment, transparent: true,
      })
    );
    const edge = new THREE.Mesh(
      new THREE.CylinderGeometry(R * 0.998, R * 0.998, 0.06, 192, 1, true),
      new THREE.MeshBasicMaterial({ color: '#1a1c52', side: THREE.DoubleSide })
    );
    edge.rotation.x = Math.PI / 2;
    edge.position.z = -0.031;
    disc.add(face, edge);
    rig.add(disc);

    /* Brazo del tocadiscos */
    const tonearm = createTonearm({ R, renderer, scene });
    cleanups.push(() => tonearm.dispose());
    rig.add(tonearm.group);

    /* Halo trasero azul */
    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(11, 11),
      new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        uniforms: { uTime: uniforms.uTime },
        vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
        fragmentShader: `varying vec2 vUv; uniform float uTime;
          void main(){ float d=length(vUv-.5); float a=smoothstep(.5,.0,d)*(.22+.04*sin(uTime*.8));
          gl_FragColor=vec4(vec3(.12,.15,1.)*a,1.); }`,
      })
    );
    halo.position.z = -1.6;
    rig.add(halo);

    /* Partículas: un anillo que orbita el vinilo + destellos de fondo */
    const palette = ['#4dffd2', '#ff4fd8', '#ffffff', '#7d8bff'].map((c) => new THREE.Color(c));
    const pMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true,
      uniforms: { uTime: uniforms.uTime, uPixel: { value: renderer.getPixelRatio() } },
      vertexShader: particleVertex, fragmentShader: particleFragment,
    });
    function makePoints(n, place) {
      const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), seed = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        pos.set(place(), i * 3);
        const c = palette[Math.floor(Math.random() * palette.length)];
        col.set([c.r, c.g, c.b], i * 3);
        seed[i] = Math.random();
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('color', new THREE.BufferAttribute(col, 3));
      g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
      return new THREE.Points(g, pMat);
    }
    const ring = makePoints(420, () => {
      const a = Math.random() * Math.PI * 2;
      const r = R + 0.15 + Math.pow(Math.random(), 1.8) * 1.1;
      return [Math.cos(a) * r, Math.sin(a) * r, (Math.random() - 0.5) * 0.35];
    });
    disc.add(ring);
    const dust = makePoints(380, () => [
      (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8, (Math.random() - 0.6) * 5,
    ]);
    scene.add(dust);

    /* Post-procesado: bloom para los neones */
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.85, 0.6, 0.55);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    cleanups.push(() => {
      composer.passes.forEach((p) => p.dispose?.());
      composer.dispose();
    });

    /* Layout responsive: el vinilo entero tiene que caber entre título y tracklist */
    let baseZ = 9;
    function resize() {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return;
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      camera.aspect = w / h;
      const desktop = innerWidth > 860;
      const fit = desktop ? Math.max(1, 1.75 / camera.aspect) : Math.max(1, 1 / camera.aspect);
      baseZ = (desktop ? 11 : 12.6) * fit;
      camera.updateProjectionMatrix();
    }
    on(window, 'resize', resize);
    resize();

    /* Entrada: ratón, arrastre del disco y giroscopio */
    const release = () => { state.dragging = false; canvas.classList.remove('grabbing'); };
    on(window, 'pointermove', (e) => {
      state.target.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
      if (state.dragging) {
        const dx = e.clientX - state.lastX;
        state.lastX = e.clientX;
        state.spin += dx * 0.012;
        state.spinVel = dx * 0.7;
      }
    });
    on(canvas, 'pointerdown', (e) => {
      state.dragging = true;
      state.lastX = e.clientX;
      canvas.classList.add('grabbing');
    });
    on(window, 'pointerup', release);
    on(window, 'pointercancel', release);
    on(window, 'deviceorientation', (e) => {
      if (e.gamma == null) return;
      state.target.set(THREE.MathUtils.clamp(e.gamma / 30, -1, 1), THREE.MathUtils.clamp((e.beta - 45) / 30, -1, 1));
    });
    // iOS pide permiso para el giroscopio tras un toque
    on(window, 'touchstart', () => {
      if (typeof DeviceOrientationEvent?.requestPermission === 'function') DeviceOrientationEvent.requestPermission().catch(() => {});
    }, { once: true });

    /* Scroll estilo DJ: la rueda arrastra el vinilo (abajo = adelante, arriba = rebobinar)
       y le da un empujón que lo inclina y rebota con un muelle */
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    function kick(delta, strength = 1) {
      const d = THREE.MathUtils.clamp(delta, -160, 160) * strength;
      state.spinVel += d * 0.035;
      if (!reduced) state.tiltV += d * 0.012;
      state.boost = Math.max(state.boost, Math.min(Math.abs(d) / 160, 1) * 0.6);
    }
    // en escritorio la ruta no se desplaza: la rueda fuera del tracklist solo mueve el disco
    on(root, 'wheel', (e) => {
      if (tracklist.contains(e.target)) return; // ahí lo recoge el evento scroll
      kick(e.deltaY * (e.deltaMode === 1 ? 16 : 1));
    }, { passive: true });
    // scroll real (tracklist o la página en móvil): reacciona más suave
    const lastTop = new WeakMap();
    on(document, 'scroll', (e) => {
      const el = e.target === document ? document.scrollingElement : e.target;
      if (el !== document.scrollingElement && !root.contains(el)) return;
      const prev = lastTop.get(el) ?? el.scrollTop;
      lastTop.set(el, el.scrollTop);
      kick(el.scrollTop - prev, 0.6);
    }, { passive: true, capture: true });

    /* Bucle */
    const start = performance.now();
    const easeOut = (x) => 1 - Math.pow(1 - x, 4);
    let last = 0;
    renderer.setAnimationLoop(() => {
      renderer.info.reset();
      const t = (performance.now() - start) / 1000;
      const dt = Math.min(t - last, 0.05);
      last = t;
      const intro = reduced ? 1 : easeOut(Math.min(t / 2.6, 1));
      const m = state.mouse;

      m.lerp(state.target, 0.06);
      // mientras suena una canción, el brazo se queda en ella aunque señales otra
      const playing = player.current >= 0;
      state.track = playing ? player.current : state.hover;
      // los graves de la música hacen latir el corazón y la banda
      const bass = playing ? player.bass() : 0;
      state.boost = Math.max(state.boost * 0.96, bass);
      state.trackGlow += ((state.track >= 0 ? 1 : 0) - state.trackGlow) * 0.12;

      // giro del vinilo: inercia hacia la velocidad objetivo
      if (!state.dragging) {
        const goal = state.track >= 0 ? PLAY_SPIN : BASE_SPIN;
        state.spinVel += (goal - state.spinVel) * (1 - Math.exp(-dt * 1.6));
        state.spin += state.spinVel * dt;
      }

      uniforms.uTime.value = t;
      uniforms.uMouse.value.copy(m);
      uniforms.uBoost.value = state.boost;
      uniforms.uSpin.value = state.spin;
      uniforms.uTrack.value = state.track;
      uniforms.uTrackGlow.value = state.trackGlow * (0.75 + 0.8 * bass);
      // la luz viene de arriba y se desplaza con el ratón: los reflejos barren el disco
      uniforms.uLight.value.set(0.6 + m.x * 1.4, 1 - m.y * 0.8);

      // inclinación con el ratón + balanceo lento en reposo
      const idle = reduced ? 0 : 1;
      rig.rotation.y = m.x * 0.5 + Math.sin(t * 0.37) * 0.14 * idle;
      // muelle del empujón de scroll
      state.tiltV += (-70 * state.tilt - 9 * state.tiltV) * dt;
      state.tilt = THREE.MathUtils.clamp(state.tilt + state.tiltV * dt, -0.6, 0.6);
      // en móvil, al bajar hacia el tracklist el disco se tumba como si se posara en el plato
      const lay = reduced || innerWidth > 860 ? 0 : Math.min(scrollY / canvas.clientHeight, 1);

      rig.rotation.x = -m.y * 0.34 + Math.cos(t * 0.29) * 0.08 * idle + state.tilt - lay * 1.05;
      rig.rotation.z = Math.sin(t * 0.21) * 0.03 * idle;
      rig.position.y = Math.sin(t * 0.7) * 0.06 * idle;
      rig.scale.setScalar(1 - lay * 0.15);

      // entrada del vinilo: viene desde el fondo girándose hasta quedar de frente
      disc.position.z = -(1 - intro) * 3 - Math.abs(state.tilt) * 1.2;
      disc.scale.setScalar(0.5 + 0.5 * intro);
      disc.rotation.y = -(1 - intro) * 1.3;
      ring.rotation.z = -state.spin * 0.12;

      // brazo: va a la banda de la canción señalada; si el disco se hunde por el scroll, lo acompaña
      tonearm.update(dt, state.track, intro, state.spin);
      tonearm.group.position.z -= Math.abs(state.tilt) * 1.2;

      // título vivo: se ondula según lo lejos que esté el giro de su velocidad normal
      if (!reduced) {
        const goal = state.track >= 0 ? PLAY_SPIN : BASE_SPIN;
        const sv = THREE.MathUtils.clamp((state.spinVel - goal) / 6, -1, 1);
        state.titleE += (Math.abs(sv) - state.titleE) * (1 - Math.exp(-dt * 6));
        const e = state.titleE;
        const bt = t % 1.2;
        // con música, las letras laten con los graves; si no, con el latido del corazón
        const beat = playing
          ? bass
          : (Math.exp(-(((bt - 0.1) * 14) ** 2)) + 0.6 * Math.exp(-(((bt - 0.35) * 14) ** 2))) * state.trackGlow;
        titleEl.style.setProperty('--e', (e + state.trackGlow * 0.25).toFixed(3));
        letters.forEach((s, i) => {
          const y = Math.sin(t * 5 - i * 0.55) * e * 12;
          const r = Math.sin(t * 4 - i * 0.5) * e * 7;
          s.style.transform =
            `translateY(${y.toFixed(2)}px) rotate(${r.toFixed(2)}deg) skewX(${(-sv * 12).toFixed(2)}deg) scale(${(1 + beat * 0.06).toFixed(3)})`;
        });
      }

      // la cámara orbita un poco: paralaje entre el relieve de la foto, el disco y los destellos
      camera.position.set(m.x * 0.6, m.y * 0.4, baseZ + (1 - intro) * 2.5);
      camera.lookAt(0, 0, 0);

      dust.rotation.y = t * 0.02 + m.x * 0.1;
      dust.position.x = -m.x * 0.3;

      composer.render();
    });

    onRenderer?.(renderer);
    loader.classList.add('done');
  }

  return () => {
    ac.abort();
    // en orden inverso: primero se para el bucle, luego se libera lo que usaba
    for (let i = cleanups.length - 1; i >= 0; i--) cleanups[i]();
  };
}
