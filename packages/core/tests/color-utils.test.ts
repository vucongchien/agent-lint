import { describe, it, expect } from 'vitest';
import {
  parseHexColor,
  parseRgbString,
  calculateColorDistance,
  findNearestColorToken,
} from '../src/tokens/color-utils';
import { TAILWIND_COLORS } from '../src/tokens/tailwind-tokens';

describe('Design Token Color Distance & Matching', () => {
  it('should parse 3-digit and 6-digit hex colors', () => {
    expect(parseHexColor('#fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(parseHexColor('#1e293b')).toEqual({ r: 30, g: 41, b: 59 });
  });

  it('should parse rgb string format', () => {
    expect(parseRgbString('rgb(30, 41, 59)')).toEqual({ r: 30, g: 41, b: 59 });
  });

  it('should calculate distance 0 for identical colors', () => {
    const rgb = { r: 100, g: 100, b: 100 };
    expect(calculateColorDistance(rgb, rgb)).toBe(0);
  });

  it('should find nearest Tailwind color token accurately', () => {
    // #1e293b is exact slate-800
    const match = findNearestColorToken('#1e293b', TAILWIND_COLORS);
    expect(match?.tokenName).toBe('slate-800');
    expect(match?.distance).toBe(0);

    // #1e293c is almost slate-800
    const nearMatch = findNearestColorToken('#1e293c', TAILWIND_COLORS);
    expect(nearMatch?.tokenName).toBe('slate-800');
  });
});
