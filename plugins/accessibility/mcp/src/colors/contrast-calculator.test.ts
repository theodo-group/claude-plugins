import { describe, it, expect } from 'vitest';
import { hexToRgba } from './contrast-calculator.js';

describe('hexToRgba', () => {
  it('parses 6-digit hex', () => {
    expect(hexToRgba('#ff0000')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(hexToRgba('#1a2b3c')).toEqual({ r: 26, g: 43, b: 60, a: 1 });
    expect(hexToRgba('#7f3fbf')).toEqual({ r: 127, g: 63, b: 191, a: 1 });
  });

  it('is case-insensitive', () => {
    expect(hexToRgba('#FF8000')).toEqual(hexToRgba('#ff8000'));
    expect(hexToRgba('#Ff8000')).toEqual(hexToRgba('#ff8000'));
    expect(hexToRgba('#AABBCC')).toEqual({ r: 170, g: 187, b: 204, a: 1 });
  });

  it('parses 3-digit hex by doubling each digit', () => {
    expect(hexToRgba('#f00')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(hexToRgba('#abc')).toEqual({ r: 170, g: 187, b: 204, a: 1 });
    expect(hexToRgba('#48f')).toEqual({ r: 68, g: 136, b: 255, a: 1 });
  });

  it('parses 8-digit hex with alpha', () => {
    expect(hexToRgba('#ff000080')).toEqual({ r: 255, g: 0, b: 0, a: 0.5 });
    expect(hexToRgba('#1a2b3c4d')).toEqual({ r: 26, g: 43, b: 60, a: 0.3 });
    expect(hexToRgba('#ffffff00')).toEqual({ r: 255, g: 255, b: 255, a: 0 });
  });

  it('parses 4-digit hex with alpha', () => {
    expect(hexToRgba('#f00f')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(hexToRgba('#f000')).toEqual({ r: 255, g: 0, b: 0, a: 0 });
    expect(hexToRgba('#8888')).toEqual({ r: 136, g: 136, b: 136, a: 0.53 });
  });

  it('works without leading #', () => {
    expect(hexToRgba('ff0000')).toEqual({ r: 255, g: 0, b: 0, a: 1 });
    expect(hexToRgba('1a2b3c')).toEqual({ r: 26, g: 43, b: 60, a: 1 });
  });

  it('returns null for invalid hex', () => {
    expect(hexToRgba('#gg0000')).toBeNull();
    expect(hexToRgba('#12345')).toBeNull();   // 5 digits
    expect(hexToRgba('#1234567')).toBeNull(); // 7 digits
  });
});