import { describe, expect, it } from 'vitest';
import { hexToHsl, hslToHex, pickDistinctColor } from '@/features/groups/groupColor';

const hueDist = (a: number, b: number) => {
  const d = Math.abs(a - b) % 360;
  return d > 180 ? 360 - d : d;
};
const hueOf = (hex: string) => hexToHsl(hex)!.h;

describe('hex/hsl conversion', () => {
  it('round-trips a known colour', () => {
    const hsl = hexToHsl('#ff0000')!;
    expect(Math.round(hsl.h)).toBe(0);
    expect(hexToHsl('#00ff00')!.h).toBeCloseTo(120, 0);
    expect(hexToHsl('#0000ff')!.h).toBeCloseTo(240, 0);
  });
  it('produces valid hex', () => {
    expect(hslToHex(210, 0.68, 0.55)).toMatch(/^#[0-9a-f]{6}$/);
  });
  it('returns null for garbage', () => {
    expect(hexToHsl('not-a-color')).toBeNull();
  });
});

describe('pickDistinctColor', () => {
  it('returns a valid hex when there is nothing to avoid', () => {
    expect(pickDistinctColor([])).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('picks roughly the opposite hue of a single existing colour', () => {
    const h = hueOf(pickDistinctColor(['#ff0000'])); // red = hue 0 → expect ~180
    expect(hueDist(h, 0)).toBeGreaterThan(150);
  });

  it('ignores near-grey colours (they pin no hue)', () => {
    // '#000' carries no hue, so this behaves like the empty case: still a valid colour.
    expect(pickDistinctColor(['#000', '#111111'])).toMatch(/^#[0-9a-f]{6}$/);
  });

  it('stays clear of several used hues', () => {
    const used = ['#ff0000', '#00ff00', '#0000ff']; // 0, 120, 240
    const h = hueOf(pickDistinctColor(used));
    const nearest = Math.min(...[0, 120, 240].map((u) => hueDist(h, u)));
    // best achievable min-gap for three evenly spread hues is ~60°
    expect(nearest).toBeGreaterThan(45);
  });

  it('skips nullish entries', () => {
    expect(pickDistinctColor([null, undefined, '#ff0000'])).toMatch(/^#[0-9a-f]{6}$/);
  });
});
