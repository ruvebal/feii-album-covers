// El revelado de la foto, tomando como modelo la portada de 1979: no es una
// foto sepia, sino una foto en color nítida con un tono algo cálido.
//  1. Halo del flash: solo lo que queda casi blanco (los calcetines, la
//     camisa) se desborda en un resplandor suave, como en la foto original.
//  2. Nitidez: una máscara de enfoque realza los bordes (ladrillos, solapas).
//  3. Color: ladrillo rojo intenso, negros profundos y luces algo crema;
//     contraste un poco más alto y un leve viraje cálido, sin lavar el color.
//  4. Un grano fino de película y una viñeta muy suave.
// Todo se hace a mano sobre los píxeles (sin `ctx.filter`, que Safari no tiene).

/** Resplandor de las zonas casi blancas: se reducen, se aclaran y se vuelven a ampliar borrosas. */
function halation(c, side) {
  for (const [scale, strength] of [
    [24, 0.7],
    [60, 0.35],
  ]) {
    const n = Math.round(side / scale);
    const small = document.createElement('canvas');
    small.width = n;
    small.height = n;
    const s = small.getContext('2d');
    s.drawImage(c.canvas, 0, 0, n, n);
    const img = s.getImageData(0, 0, n, n);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const lum = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
      const v = Math.max(0, (lum - 205) / 50);
      d[i] = 255 * v;
      d[i + 1] = 246 * v;
      d[i + 2] = 228 * v;
    }
    s.putImageData(img, 0, 0);
    c.save();
    c.globalCompositeOperation = 'screen';
    c.globalAlpha = strength;
    c.imageSmoothingQuality = 'high';
    c.drawImage(small, 0, 0, side, side);
    c.restore();
  }
}

/** Nitidez, color cálido de la portada, grano fino y viñeta suave. */
function coverTone(c, side) {
  const img = c.getImageData(0, 0, side, side);
  const d = img.data;
  const src = new Uint8ClampedArray(d);
  const mid = side / 2;
  const row = side * 4;
  const contrast = (v) => {
    // Curva en S suave alrededor del gris medio.
    const x = Math.max(0, Math.min(1, v / 255));
    return (x * x * (3 - 2 * x) * 0.4 + x * 0.6) * 255;
  };
  for (let y = 0; y < side; y += 1) {
    for (let x = 0; x < side; x += 1) {
      const i = y * row + x * 4;
      const up = y > 0 ? i - row : i;
      const down = y < side - 1 ? i + row : i;
      const left = x > 0 ? i - 4 : i;
      const right = x < side - 1 ? i + 4 : i;
      const out = [0, 0, 0];
      for (let ch = 0; ch < 3; ch += 1) {
        // Máscara de enfoque: el píxel menos la media de sus vecinos.
        const blur = (src[up + ch] + src[down + ch] + src[left + ch] + src[right + ch]) / 4;
        out[ch] = src[i + ch] + (src[i + ch] - blur) * 0.7;
      }
      let [r, g, b] = out;
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      // Color algo apagado, como la portada impresa.
      r = lum + (r - lum) * 0.82;
      g = lum + (g - lum) * 0.82;
      b = lum + (b - lum) * 0.82;
      // Viraje cálido leve: más rojo y amarillo en las luces, menos azul.
      const t = lum / 255;
      r = contrast(r) + 8 * t;
      g = contrast(g) + 3 * t;
      b = contrast(b) - 10 * t;
      // Negros apenas levantados, como en el papel de la época.
      r = 6 + r * 0.98;
      g = 5 + g * 0.97;
      b = 4 + b * 0.95;
      const dx = x - mid;
      const dy = y - mid;
      const vig = 1 - 0.14 * ((dx * dx + dy * dy) / (mid * mid * 2)) ** 1.4;
      const grain = (Math.random() - 0.5) * 9 * (1 - Math.abs(t - 0.5));
      d[i] = r * vig + grain;
      d[i + 1] = g * vig + grain;
      d[i + 2] = b * vig + grain;
    }
  }
  c.putImageData(img, 0, 0);
}

/** Aplica el revelado completo sobre un lienzo cuadrado de `side` píxeles. */
export function develop(c, side) {
  halation(c, side);
  coverTone(c, side);
}
