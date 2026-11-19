// Funda lisa con el título, para las rutas que todavía no tienen portada. No es arte de ningún álbum:
// la portada real entra por public/locales/ (solo local) o por la propia ruta cuando su autor la sube.

const SIZE = 512;
const SLEEVE_COLOURS = ['#c9bb98', '#8fb5a8', '#c98f8f', '#9aa4d0', '#d4b86a', '#a8c98f'];

export const sleeveColour = (i) => SLEEVE_COLOURS[i % SLEEVE_COLOURS.length];

function newCanvas() {
  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  return [c, c.getContext('2d')];
}

function text(g, str, x, y, size, colour, weight = 800, family = 'ui-monospace, Menlo, monospace') {
  g.font = `${weight} ${size}px ${family}`;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillStyle = colour;
  g.fillText(str, x, y);
}

function legend(g) {
  g.fillStyle = 'rgba(0,0,0,0.55)';
  g.fillRect(0, SIZE - 34, SIZE, 34);
  text(g, 'SIN PORTADA TODAVÍA', SIZE / 2, SIZE - 17, 14, '#ffffff', 600);
}

/** Funda de cartón con el título centrado, para cualquier ruta sin portada ni diseño provisional. */
export function titleSleeveCanvas(title, i) {
  const [c, g] = newCanvas();
  g.fillStyle = sleeveColour(i);
  g.fillRect(0, 0, SIZE, SIZE);
  g.strokeStyle = 'rgba(0,0,0,0.22)';
  g.lineWidth = 6;
  g.strokeRect(28, 28, SIZE - 56, SIZE - 56);
  g.font = '700 64px ui-monospace, Menlo, monospace';
  const words = title.toUpperCase().split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (g.measureText(next).width > 400 && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  lines.push(cur);
  const y0 = 256 - ((lines.length - 1) * 84) / 2;
  lines.slice(0, 4).forEach((l, k) => text(g, l, 256, y0 + k * 84, 64, '#2b2418', 700));
  legend(g);
  return c;
}
