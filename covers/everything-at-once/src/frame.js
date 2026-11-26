// covers/everything-at-once — where the record sits on the page (shared by Route.jsx and Record.jsx).

import { PULL_BACK, VIEW_DISTANCE } from './Diorama.jsx';

/** With the vinyl out, sleeve + disc need this many times the rest box's width (what the old square stage gave). */
export const OUT_SPAN = 1 + PULL_BACK / VIEW_DISTANCE;

/**
 * The record's rest box on a stage of w x h CSS px: its side `S` and centre (`x`, `y`), the width `room` the vinyl
 * may use, and the root font size `rem`. Route.jsx places the poster with it and Record.jsx frames the camera with
 * it, so the swap from the poster to 3D never jumps. Desktop: centred above the gallery's navigation (route.css
 * --eao-nav), with the corners' text beside it; phones (<= 52 rem): in the upper part, under the wordmark.
 */
export function recordBox(w, h) {
  const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
  const nav = 7 * rem;
  if (w <= 52 * rem) {
    const S = Math.min(0.94 * w, 0.62 * h);
    return { S, x: w / 2, y: 4.5 * rem + S / 2, room: w - 2 * rem, rem };
  }
  // as large as fits (user, 10 Nov: "make the record bigger"): the corners' text sits beside it, not above
  const top = 1.5 * rem;
  const free = h - top - 1.5 * rem - nav;
  const S = Math.min(0.96 * free, 0.7 * w, w - 2 * 18.5 * rem); // and a 16 rem column each side (member text)
  return { S, x: w / 2, y: top + free / 2, room: w - 4 * rem, rem };
}
