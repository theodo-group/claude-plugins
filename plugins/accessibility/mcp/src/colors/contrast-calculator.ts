/**
 * WCAG 2.1 Contrast Ratio Calculator
 *
 * Implements the exact contrast ratio calculation algorithm
 * This tool ensures accurate accessibility analysis by following WCAG guidelines precisely.
 *
 * Supported color formats:
 * - Hex: #rgb, #rrggbb, #rgba, #rrggbbaa
 * - RGB: rgb(r, g, b) / rgba(r, g, b, a)
 * - HSL: hsl(h, s%, l%) / hsla(h, s%, l%, a)
 */

export interface ContrastResult {
  contrastRatio: number;
  passes: {
    normalText: boolean;    // ≥4.5:1
    largeText: boolean;     // ≥3:1
    disabled: boolean;      // ≥3:1
  };
  luminance: {
    foreground: number;
    background: number;
  };
  recommendation: string;
}

interface ParsedColor {
  r: number;
  g: number;
  b: number;
  a: number; // 0–1
}

/**
 * Convert hex string to RGBA values
 */
export function hexToRgba(hex: string): ParsedColor | null {
  // Remove the leading '#' if present
  const normalizedHex = hex.replace('#', '');

  // Expand 3-digit and 4-digit hex to 6-digit and 8-digit
  // #abc -> #aabbcc, #abcd -> #aabbccdd
  const expandedHex = (normalizedHex.length === 3 || normalizedHex.length === 4)
    ? normalizedHex.split('').map(c => c + c).join('')
    : normalizedHex;

  // 8-digit hex with alpha
  if (expandedHex.length === 8 && /^[0-9A-Fa-f]{8}$/.test(expandedHex)) {
    return {
      r: parseInt(expandedHex.substring(0, 2), 16),
      g: parseInt(expandedHex.substring(2, 4), 16),
      b: parseInt(expandedHex.substring(4, 6), 16),
      a: Math.round(parseInt(expandedHex.substring(6, 8), 16) / 255 * 100) / 100,
    };
  }

  // 6-digit hex without alpha
  if (expandedHex.length === 6 && /^[0-9A-Fa-f]{6}$/.test(expandedHex)) {
    return {
      r: parseInt(expandedHex.substring(0, 2), 16),
      g: parseInt(expandedHex.substring(2, 4), 16),
      b: parseInt(expandedHex.substring(4, 6), 16),
      a: 1,
    };
  }

  return null;
}

/**
 * Convert HSL (h: 0-360, s: 0-1, l: 0-1) to RGB (0-255)
 */
export function hslToRgb(hue: number, saturation: number, lightness: number): { r: number; g: number; b: number } {
  // Clamp hue to [0, 360°); double modulo handles negative inputs (e.g. -30 → 330)
  const normalizedHue = ((hue % 360) + 360) % 360;

  // Chroma represent color intensity: zero for grays, peaks at full saturation + mid lightness
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;

  // Channel that rises/falls as the hue crosses a 60° sector boundary
  const chromaRamp = chroma * (1 - Math.abs((normalizedHue / 60) % 2 - 1));

  // Shift all channels to match the target lightness
  const lightnessAdjustment = lightness - chroma / 2;

  let r = 0, g = 0, b = 0;
  if (normalizedHue < 60) {
    r = chroma; g = chromaRamp; b = 0;
  } else if (normalizedHue < 120) {
    r = chromaRamp; g = chroma; b = 0;
  } else if (normalizedHue < 180) {
    r = 0; g = chroma; b = chromaRamp;
  } else if (normalizedHue < 240) {
    r = 0; g = chromaRamp; b = chroma;
  } else if (normalizedHue < 300) {
    r = chromaRamp; g = 0; b = chroma;
  } else {
    r = chroma; g = 0; b = chromaRamp;
  }
  
  return {
    r: Math.round((r + lightnessAdjustment) * 255),
    g: Math.round((g + lightnessAdjustment) * 255),
    b: Math.round((b + lightnessAdjustment) * 255),
  };
}

/**
 * Parse any supported CSS color string into RGBA components.
 * Supports: #hex, rgb(), rgba(), hsl(), hsla()
 */
function parseColor(color: string): ParsedColor | null {
  const trimmedColor = color.trim();

  // Hex
  if (trimmedColor.startsWith('#') || /^[0-9A-Fa-f]{3,8}$/.test(trimmedColor)) {
    return hexToRgba(trimmedColor);
  }

  // rgb() / rgba() — legacy comma syntax and modern space syntax
  const rgbMatch = trimmedColor.match(
    /^rgba?\(\s*([\d.]+%?)\s*[,\s]\s*([\d.]+%?)\s*[,\s]\s*([\d.]+%?)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/
  );
  if (rgbMatch) {
    const parse = (v: string, max: number) =>
      v.endsWith('%') ? (parseFloat(v) / 100) * max : parseFloat(v);
    const alpha = rgbMatch[4] !== undefined
      ? (rgbMatch[4].endsWith('%') ? parseFloat(rgbMatch[4]) / 100 : parseFloat(rgbMatch[4]))
      : 1;
    return {
      r: Math.min(255, Math.round(parse(rgbMatch[1], 255))),
      g: Math.min(255, Math.round(parse(rgbMatch[2], 255))),
      b: Math.min(255, Math.round(parse(rgbMatch[3], 255))),
      a: alpha,
    };
  }

  // hsl() / hsla()
  const hslMatch = trimmedColor.match(
    /^hsla?\(\s*(-?[\d.]+(?:deg|rad|turn)?)\s*[,\s]\s*([\d.]+)%\s*[,\s]\s*([\d.]+)%(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/
  );
  if (hslMatch) {
    let hue = parseFloat(hslMatch[1]);
    if (hslMatch[1].endsWith('rad')) {
      hue = hue * (180 / Math.PI);
    }
    if (hslMatch[1].endsWith('turn')) {
      hue = hue * 360;
    }
    const rgb = hslToRgb(hue, parseFloat(hslMatch[2]) / 100, parseFloat(hslMatch[3]) / 100);
    const alpha = hslMatch[4] !== undefined
      ? (hslMatch[4].endsWith('%') ? parseFloat(hslMatch[4]) / 100 : parseFloat(hslMatch[4]))
      : 1;
    return { ...rgb, a: alpha };
  }

  return null;
}

/**
 * Composite a semi-transparent color over an opaque background (Porter-Duff "over").
 *
 * WCAG contrast ratios require opaque RGB values — luminance cannot be computed
 * from a color with alpha < 1, because what the eye sees is the blend of that
 * color with whatever sits behind it. This function resolves a translucent
 * foreground against a known opaque background so the result can be fed into
 * the luminance formula.
 *
 * Formula (per channel): result = fg × α + bg × (1 − α)
 *
 * @example
 * // 50%-opaque black on white renders as mid-gray
 * compositeOver({ r: 0, g: 0, b: 0, a: 0.5 }, { r: 255, g: 255, b: 255 });
 * // → { r: 128, g: 128, b: 128 }
 */
function compositeOver(
  fg: ParsedColor,
  bg: { r: number; g: number; b: number }
): { r: number; g: number; b: number } {
  const a = fg.a;
  return {
    r: Math.round(fg.r * a + bg.r * (1 - a)),
    g: Math.round(fg.g * a + bg.g * (1 - a)),
    b: Math.round(fg.b * a + bg.b * (1 - a)),
  };
}

/**
 * Convert RGB channel (0-255) to linear sRGB value
 */
function rgbToSrgb(channel8bit: number): number {
  const sRGB = channel8bit / 255;
  return sRGB <= 0.03928
    ? sRGB / 12.92
    : Math.pow((sRGB + 0.055) / 1.055, 2.4);
}

/**
 * Calculate relative luminance: L = 0.2126×R + 0.7152×G + 0.0722×B
 */
function calculateLuminance(r: number, g: number, b: number): number {
  return 0.2126 * rgbToSrgb(r) + 0.7152 * rgbToSrgb(g) + 0.0722 * rgbToSrgb(b);
}

/**
 * Calculate contrast ratio: (L1 + 0.05) / (L2 + 0.05) where L1 ≥ L2
 */
function calculateContrastRatio(luminance1: number, luminance2: number): number {
  const lighter = Math.max(luminance1, luminance2);
  const darker = Math.min(luminance1, luminance2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Generate accessibility recommendation based on contrast ratio
 */
function getRecommendation(ratio: number, passes: ContrastResult['passes']): string {
  if (passes.normalText) {
    return "✅ Passes all WCAG contrast requirements";
  } else if (passes.largeText) {
    return "⚠️ Only suitable for large text (≥24px or ≥18.67px bold / ≥18pt or ≥14pt bold)";
  } else if (ratio >= 3.0) {
    return "❌ Fails normal text requirements. Consider for disabled text only";
  } else {
    return "❌ Fails all WCAG requirements. Must be fixed for accessibility";
  }
}

/**
 * Calculate WCAG 2.1 contrast ratio between two colors.
 *
 * Accepts hex (#rgb, #rrggbb, #rgba, #rrggbbaa), rgb(), rgba(), hsl(), hsla().
 * Semi-transparent backgrounds are composited over white.
 * Semi-transparent foregrounds are composited over the resolved background.
 */
export function calculateWcagContrast(
  foreground: string,
  background: string
): ContrastResult | { error: string } {
  const fgParsed = parseColor(foreground);
  const bgParsed = parseColor(background);

  if (!fgParsed) {
    return { error: `Invalid foreground color format: ${foreground}` };
  }
  if (!bgParsed) {
    return { error: `Invalid background color format: ${background}` };
  }

  const white = { r: 255, g: 255, b: 255 };
  const bgOpaque = bgParsed.a < 1 ? compositeOver(bgParsed, white) : bgParsed;
  const fgOpaque = fgParsed.a < 1 ? compositeOver(fgParsed, bgOpaque) : fgParsed;

  const foregroundLuminance = calculateLuminance(fgOpaque.r, fgOpaque.g, fgOpaque.b);
  const backgroundLuminance = calculateLuminance(bgOpaque.r, bgOpaque.g, bgOpaque.b);
  const contrastRatio = calculateContrastRatio(foregroundLuminance, backgroundLuminance);

  const passes = {
    normalText: contrastRatio >= 4.5,
    largeText: contrastRatio >= 3.0,
    disabled: contrastRatio >= 3.0,
  };

  return {
    contrastRatio: Math.floor(contrastRatio * 100) / 100, // truncate (conservative)
    passes,
    luminance: {
      foreground: Math.round(foregroundLuminance * 1000) / 1000,
      background: Math.round(backgroundLuminance * 1000) / 1000,
    },
    recommendation: getRecommendation(contrastRatio, passes),
  };
}

/**
 * Batch calculate contrast ratios for multiple color combinations
 */
export function batchCalculateContrast(
  combinations: Array<{ foreground: string; background: string; description?: string }>
): Array<ContrastResult & { description?: string }> {
  return combinations.map(({ foreground, background, description }) => {
    const result = calculateWcagContrast(foreground, background);
    if ('error' in result) {
      return {
        contrastRatio: 0,
        passes: { normalText: false, largeText: false, disabled: false },
        luminance: { foreground: 0, background: 0 },
        recommendation: `❌ Error: ${result.error}`,
        description,
      };
    }
    return { ...result, description };
  });
}
