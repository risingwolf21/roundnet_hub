// Suggests a group colour that is visually distinct from the colours already in use.
//
// We work in HSL hue space and pick the hue whose smallest circular distance to every existing
// hue is as large as possible (a max–min spacing), then render it at a fixed, pleasant
// saturation/lightness. Near-grey existing colours (e.g. the old '#000' default) carry no hue,
// so they don't constrain the choice.

const SAT = 0.68;
const LIGHT = 0.55;

export interface Hsl {
  h: number; // 0..360
  s: number; // 0..1
  l: number; // 0..1
}

export function hexToHsl(hex: string): Hsl | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  let h = m[1];
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  let s = 0;
  let hue = 0;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r: hue = ((g - b) / d) % 6; break;
      case g: hue = (b - r) / d + 2; break;
      default: hue = (r - g) / d + 4; break;
    }
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  return { h: hue, s, l };
}

export function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const mm = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const to = (v: number) => Math.round((v + mm) * 255).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** Smallest distance between two hues on the 0..360 circle. */
const hueDistance = (a: number, b: number): number => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};

/**
 * Pick a hex colour as far (in hue) as possible from the given ones.
 * Existing greys/near-greys (saturation < 0.15) are ignored — they pin no hue.
 */
export function pickDistinctColor(existing: Iterable<string | null | undefined>, step = 2): string {
  const usedHues: number[] = [];
  for (const c of existing) {
    if (!c) continue;
    const hsl = hexToHsl(c);
    if (hsl && hsl.s >= 0.15) usedHues.push(hsl.h);
  }

  if (usedHues.length === 0) {
    // Nothing to avoid — start somewhere pleasant but varied.
    return hslToHex(Math.floor(Math.random() * 360), SAT, LIGHT);
  }

  let bestHue = 0;
  let bestGap = -1;
  const candidates: number[] = [];
  for (let h = 0; h < 360; h += step) {
    let nearest = 360;
    for (const u of usedHues) nearest = Math.min(nearest, hueDistance(h, u));
    if (nearest > bestGap + 0.001) {
      bestGap = nearest;
      bestHue = h;
      candidates.length = 0;
      candidates.push(h);
    } else if (Math.abs(nearest - bestGap) <= 0.001) {
      candidates.push(h);
    }
  }
  // Among equally-good candidates, choose one at random so re-rolls vary.
  bestHue = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : bestHue;
  return hslToHex(bestHue, SAT, LIGHT);
}
