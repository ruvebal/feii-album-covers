// Funda animada de «mosca»: la portada REAL (el perro dálmata sobre azul), animada sin tocar el dibujo:
// el perro ladra (la mandíbula se abre sobre la propia imagen), la portada da un golpe de zoom con cada ladrido,
// salen ondas de sonido y onomatopeyas en estilo cómic y titilan destellos (el brillo que barre la funda lo pone la escena).
// Se dibuja en un lienzo que se repinta cada pocos fotogramas; el relieve 3D y el parallax lo pone relief.js encima.
// draw(t, energia): t en segundos, energia 0..1 (sube al apuntarla: ladra más rápido).

const WORDS = ['¡GUAU!', 'WOOF!', '¡GRRR!', 'BARK!', '¡AU AU!', '¡RUAF!'];
const S = 640;
// zona de la boca en la imagen original de 1164 px (medida sobre la portada)
const REF = 1164;
const MOUTH = { x: 676, y: 588, w: 128, h: 76, cx: 735, cy: 585 };

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeOutBack = (t) => 1 + 2.7 * Math.pow(t - 1, 3) + 1.7 * Math.pow(t - 1, 2);

function rng(seed) {
  let s = seed >>> 0 || 1;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

function star(g, x, y, r, rot) {
  g.beginPath();
  for (let k = 0; k < 8; k++) {
    const a = rot + (k * Math.PI) / 4;
    const rr = k % 2 === 0 ? r : r * 0.22;
    g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  g.closePath();
  g.fill();
}

/** @param {CanvasImageSource} img portada real de mosca */
export function createMoscaSleeve(img) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = S;
  const g = canvas.getContext('2d');
  // la escena oscurece los azules puros: se aclara una sola vez una copia de la portada (curva gamma 0,62)
  const lit = document.createElement('canvas');
  lit.width = lit.height = S;
  const lg = lit.getContext('2d', { willReadFrequently: true });
  lg.drawImage(img, 0, 0, S, S);
  const data = lg.getImageData(0, 0, S, S);
  const lut = Array.from({ length: 256 }, (_, v) => Math.round(255 * Math.pow(v / 255, 0.62)));
  for (let i = 0; i < data.data.length; i += 4) {
    data.data[i] = lut[data.data[i]];
    data.data[i + 1] = lut[data.data[i + 1]];
    data.data[i + 2] = lut[data.data[i + 2]];
  }
  lg.putImageData(data, 0, 0);
  const k = S / REF;
  const r = rng(31);
  const sparks = Array.from({ length: 18 }, () => ({ x: r() * S, y: r() * S, s: 4 + r() * 9, ph: r() * 6.28 }));

  function draw(t, energy = 0) {
    const period = 1.5 - 0.6 * clamp01(energy);
    const cyc = t / period;
    const p = cyc - Math.floor(cyc);
    const age = p * period;
    const open = p < 0.38 ? Math.sin((p / 0.38) * Math.PI) : 0;

    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.save();
    // golpe de zoom hacia la cabeza con cada ladrido, y un temblor corto
    const s = 1 + open * 0.035;
    g.translate(MOUTH.cx * k, MOUTH.cy * k);
    g.rotate(Math.sin(t * 60) * 0.004 * open);
    g.scale(s, s);
    g.translate(-MOUTH.cx * k, -MOUTH.cy * k);
    g.drawImage(lit, 0, 0, S, S);
    // mandíbula: sobre la propia imagen, el hueco se oscurece y la parte baja se desplaza hacia abajo
    if (open > 0.04) {
      const sx = MOUTH.x;
      const sy = MOUTH.y;
      const drop = open * 20;
      g.fillStyle = '#3a0912';
      g.beginPath();
      g.ellipse(MOUTH.cx * k, (sy + 6) * k, (MOUTH.w / 2 - 6) * k, (8 + drop * 0.9) * k, 0, 0, Math.PI * 2);
      g.fill();
      g.drawImage(lit, sx * k, sy * k, MOUTH.w * k, MOUTH.h * k, sx * k, (sy + drop) * k, MOUTH.w * k, MOUTH.h * k);
    }
    g.restore();

    // ondas de sonido desde la boca
    if (open > 0.05) {
      g.strokeStyle = `rgba(255,255,255,${0.55 * open})`;
      g.lineWidth = 5;
      g.lineCap = 'round';
      for (let i = 0; i < 3; i++) {
        g.beginPath();
        g.arc((MOUTH.cx + 40) * k, (MOUTH.cy + 12) * k, 22 + age * 190 + i * 30, -0.6, 0.6);
        g.stroke();
      }
    }

    // onomatopeya en estilo cómic: estalla al ladrar y se desvanece
    if (p < 0.8) {
      const pop = easeOutBack(clamp01(age / 0.16));
      const fade = p < 0.5 ? 1 : 1 - (p - 0.5) / 0.3;
      const word = WORDS[Math.floor(cyc) % WORDS.length];
      g.save();
      g.translate(S * 0.3, S * 0.2);
      g.rotate(-0.12 + Math.sin(t * 30) * 0.012 * open);
      g.scale(pop, pop);
      g.globalAlpha = clamp01(fade);
      g.fillStyle = '#e8203c';
      g.beginPath();
      for (let i = 0; i < 20; i++) {
        const a = (i / 20) * Math.PI * 2;
        const rr = i % 2 ? 56 : 92 + open * 10;
        g.lineTo(Math.cos(a) * rr * 1.45, Math.sin(a) * rr * 0.85);
      }
      g.closePath();
      g.fill();
      g.lineWidth = 5;
      g.strokeStyle = '#fff4c8';
      g.stroke();
      g.font = '900 56px Impact, "Arial Black", ui-sans-serif, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.lineJoin = 'round';
      g.lineWidth = 12;
      g.strokeStyle = '#150a28';
      g.strokeText(word, 0, 3);
      const tg = g.createLinearGradient(0, -30, 0, 34);
      tg.addColorStop(0, '#fff7a8');
      tg.addColorStop(0.5, '#ffd23c');
      tg.addColorStop(1, '#ff8a1e');
      g.fillStyle = tg;
      g.fillText(word, 0, 3);
      g.restore();
    }

    // destellos que titilan y un brillo que barre la funda (suma luz, no cambia el dibujo)
    g.globalCompositeOperation = 'lighter';
    for (const sp of sparks) {
      const a = 0.25 + 0.6 * Math.abs(Math.sin(t * 2.2 + sp.ph));
      g.globalAlpha = a * 0.7;
      g.fillStyle = '#ffffff';
      star(g, sp.x, sp.y, sp.s * (0.5 + a), t * 0.4 + sp.ph);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  draw(0.4, 0);
  return { canvas, draw };
}
