import { describe, it, expect } from 'vitest';
import { calculateWcagContrast, batchCalculateContrast, hexToRgba, hslToRgb } from './contrast-calculator.js';

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

describe('hslToRgb', () => {
  it('covers all 6 hue sectors at their midpoints (s=1, l=0.5)', () => {
    expect(hslToRgb(30, 1, 0.5)).toEqual({ r: 255, g: 128, b: 0 });   // orange    (0–60)
    expect(hslToRgb(90, 1, 0.5)).toEqual({ r: 128, g: 255, b: 0 });   // chartreuse (60–120)
    expect(hslToRgb(150, 1, 0.5)).toEqual({ r: 0, g: 255, b: 128 });  // spring green (120–180)
    expect(hslToRgb(210, 1, 0.5)).toEqual({ r: 0, g: 128, b: 255 });  // azure     (180–240)
    expect(hslToRgb(270, 1, 0.5)).toEqual({ r: 128, g: 0, b: 255 });  // violet    (240–300)
    expect(hslToRgb(330, 1, 0.5)).toEqual({ r: 255, g: 0, b: 128 });  // rose      (300–360)
  });
  

  it('converts primary hue angles (s=1, l=0.5)', () => {
    expect(hslToRgb(0, 1, 0.5)).toEqual({ r: 255, g: 0, b: 0 });
    expect(hslToRgb(120, 1, 0.5)).toEqual({ r: 0, g: 255, b: 0 });
    expect(hslToRgb(240, 1, 0.5)).toEqual({ r: 0, g: 0, b: 255 });
  });

  it('converts secondary hue angles (s=1, l=0.5)', () => {
    expect(hslToRgb(60, 1, 0.5)).toEqual({ r: 255, g: 255, b: 0 });
    expect(hslToRgb(180, 1, 0.5)).toEqual({ r: 0, g: 255, b: 255 });
    expect(hslToRgb(300, 1, 0.5)).toEqual({ r: 255, g: 0, b: 255 });
  });

  it('dark colors (low lightness)', () => {
    expect(hslToRgb(0, 1, 0.25)).toEqual({ r: 128, g: 0, b: 0 });    // maroon
    expect(hslToRgb(120, 1, 0.25)).toEqual({ r: 0, g: 128, b: 0 });  // dark green
    expect(hslToRgb(240, 1, 0.25)).toEqual({ r: 0, g: 0, b: 128 });  // navy
  });

  it('light colors (high lightness)', () => {
    expect(hslToRgb(0, 1, 0.75)).toEqual({ r: 255, g: 128, b: 128 });   // light red / pink
    expect(hslToRgb(120, 1, 0.75)).toEqual({ r: 128, g: 255, b: 128 }); // light green
    expect(hslToRgb(240, 1, 0.75)).toEqual({ r: 128, g: 128, b: 255 }); // light blue
  });

  it('muted colors (partial saturation)', () => {
    expect(hslToRgb(0, 0.5, 0.5)).toEqual({ r: 191, g: 64, b: 64 });   // muted red
    expect(hslToRgb(120, 0.5, 0.5)).toEqual({ r: 64, g: 191, b: 64 }); // muted green
  });

  it('returns black for l=0 regardless of hue and saturation', () => {
    expect(hslToRgb(90, 1, 0)).toEqual({ r: 0, g: 0, b: 0 });
    expect(hslToRgb(210, 0.5, 0)).toEqual({ r: 0, g: 0, b: 0 });
  });

  it('returns white for l=1 regardless of hue and saturation', () => {
    expect(hslToRgb(90, 1, 1)).toEqual({ r: 255, g: 255, b: 255 });
    expect(hslToRgb(210, 0.5, 1)).toEqual({ r: 255, g: 255, b: 255 });
  });

  it('returns gray for s=0 regardless of hue', () => {
    expect(hslToRgb(90, 0, 0.5)).toEqual({ r: 128, g: 128, b: 128 });
    expect(hslToRgb(210, 0, 0.75)).toEqual({ r: 191, g: 191, b: 191 });
  });

  it('wraps hue above 360', () => {
    expect(hslToRgb(390, 1, 0.5)).toEqual(hslToRgb(30, 1, 0.5));   // orange
    expect(hslToRgb(480, 1, 0.5)).toEqual(hslToRgb(120, 1, 0.5));  // green
  });

  it('wraps negative hue', () => {
    expect(hslToRgb(-30, 1, 0.5)).toEqual(hslToRgb(330, 1, 0.5));  // rose
    expect(hslToRgb(-120, 1, 0.5)).toEqual(hslToRgb(240, 1, 0.5)); // blue
  });
});

describe('calculateWcagContrast', () => {
  describe('hex colors', () => {
    it('black on white returns 21:1', () => {
      const result = calculateWcagContrast('#000000', '#ffffff');
      expect('error' in result).toBe(false);
      if ('error' in result) return;
      expect(result.contrastRatio).toBe(21);
      expect(result.passes.normalText).toBe(true);
      expect(result.passes.largeText).toBe(true);
    });

    it('white on white returns 1:1', () => {
      const result = calculateWcagContrast('#ffffff', '#ffffff');
      expect('error' in result).toBe(false);
      if ('error' in result) return;
      expect(result.contrastRatio).toBe(1);
      expect(result.passes.normalText).toBe(false);
      expect(result.passes.largeText).toBe(false);
    });

    it('3-digit shorthand expands correctly', () => {
      const short = calculateWcagContrast('#000', '#fff');
      const full = calculateWcagContrast('#000000', '#ffffff');
      expect('error' in short).toBe(false);
      expect('error' in full).toBe(false);
      if ('error' in short || 'error' in full) return;
      expect(short.contrastRatio).toBe(full.contrastRatio);
    });

    it('#767676 on white just passes AA normal text (≥4.5)', () => {
      const result = calculateWcagContrast('#767676', '#ffffff');
      expect('error' in result).toBe(false);
      if ('error' in result) return;
      expect(result.contrastRatio).toBeGreaterThanOrEqual(4.5);
      expect(result.passes.normalText).toBe(true);
    });
  });

  describe('rgb() colors', () => {
    it('rgb() black on white matches hex result', () => {
      const rgb = calculateWcagContrast('rgb(0, 0, 0)', 'rgb(255, 255, 255)');
      const hex = calculateWcagContrast('#000000', '#ffffff');
      expect('error' in rgb).toBe(false);
      expect('error' in hex).toBe(false);
      if ('error' in rgb || 'error' in hex) return;
      expect(rgb.contrastRatio).toBe(hex.contrastRatio);
    });

    it('semi-transparent foreground is composited over background', () => {
      // rgba(0,0,0,0.5) over white composites to rgb(128,128,128)
      const result = calculateWcagContrast('rgba(0, 0, 0, 0.5)', '#ffffff');
      expect('error' in result).toBe(false);
      if ('error' in result) return;
      expect(result.contrastRatio).toBeLessThan(21);
      expect(result.contrastRatio).toBeGreaterThan(1);
    });
  });

  describe('hsl() colors', () => {
    it('hsl red matches hex red', () => {
      const hsl = calculateWcagContrast('hsl(0, 100%, 50%)', '#ffffff');
      const hex = calculateWcagContrast('#ff0000', '#ffffff');
      expect('error' in hsl).toBe(false);
      expect('error' in hex).toBe(false);
      if ('error' in hsl || 'error' in hex) return;
      expect(hsl.contrastRatio).toBe(hex.contrastRatio);
    });

    it('hsl(0, 0%, 0%) is black', () => {
      const result = calculateWcagContrast('hsl(0, 0%, 0%)', '#ffffff');
      expect('error' in result).toBe(false);
      if ('error' in result) return;
      expect(result.contrastRatio).toBe(21);
    });

    it('negative hue wraps correctly', () => {
      // hsl(-60, 100%, 50%) == hsl(300, 100%, 50%) == magenta
      const negative = calculateWcagContrast('hsl(-60, 100%, 50%)', '#ffffff');
      const positive = calculateWcagContrast('hsl(300, 100%, 50%)', '#ffffff');
      expect('error' in negative).toBe(false);
      expect('error' in positive).toBe(false);
      if ('error' in negative || 'error' in positive) return;
      expect(negative.contrastRatio).toBe(positive.contrastRatio);
    });
  });

  describe('invalid inputs', () => {
    it('returns error for invalid foreground', () => {
      const result = calculateWcagContrast('not-a-color', '#ffffff');
      expect('error' in result).toBe(true);
    });

    it('returns error for invalid background', () => {
      const result = calculateWcagContrast('#000000', 'not-a-color');
      expect('error' in result).toBe(true);
    });
  });

  describe('luminance values', () => {
    it('white has luminance 1, black has luminance 0', () => {
      const result = calculateWcagContrast('#000000', '#ffffff');
      expect('error' in result).toBe(false);
      if ('error' in result) return;
      expect(result.luminance.background).toBe(1);
      expect(result.luminance.foreground).toBe(0);
    });
  });
});

describe('batchCalculateContrast', () => {
  it('processes multiple combinations', () => {
    const results = batchCalculateContrast([
      { foreground: '#000000', background: '#ffffff', description: 'black on white' },
      { foreground: '#ffffff', background: '#ffffff', description: 'white on white' },
    ]);
    expect(results).toHaveLength(2);
    expect(results[0].contrastRatio).toBe(21);
    expect(results[0].description).toBe('black on white');
    expect(results[1].contrastRatio).toBe(1);
  });

  it('returns zero contrast ratio for invalid colors', () => {
    const results = batchCalculateContrast([
      { foreground: 'not-a-color', background: '#ffffff' },
    ]);
    expect(results[0].contrastRatio).toBe(0);
    expect(results[0].passes.normalText).toBe(false);
  });
});
