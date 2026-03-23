/**
 * WCAG 2.1 Contrast Ratio Calculator
 *
 * Implements the exact contrast ratio calculation algorithm as specified in Colors.md
 * This tool ensures accurate accessibility analysis by following WCAG guidelines precisely.
 */
/**
 * Convert hex color to RGB values (0-255)
 */
function hexToRgb(hex) {
    // Remove # if present
    hex = hex.replace('#', '');
    // Handle 3-digit hex
    if (hex.length === 3) {
        hex = hex.split('').map(char => char + char).join('');
    }
    // Validate hex format
    if (hex.length !== 6 || !/^[0-9A-Fa-f]{6}$/.test(hex)) {
        return null;
    }
    return {
        r: parseInt(hex.substr(0, 2), 16),
        g: parseInt(hex.substr(2, 2), 16),
        b: parseInt(hex.substr(4, 2), 16)
    };
}
/**
 * Convert RGB channel to sRGB linear value
 * Implements the exact formula from Colors.md Section 1.1
 */
function rgbToSrgb(channel8bit) {
    const sRGB = channel8bit / 255;
    if (sRGB <= 0.03928) {
        return sRGB / 12.92;
    }
    else {
        return Math.pow((sRGB + 0.055) / 1.055, 2.4);
    }
}
/**
 * Calculate relative luminance according to WCAG formula
 * L = 0.2126 × R + 0.7152 × G + 0.0722 × B
 */
function calculateLuminance(r, g, b) {
    const rLinear = rgbToSrgb(r);
    const gLinear = rgbToSrgb(g);
    const bLinear = rgbToSrgb(b);
    return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}
/**
 * Calculate contrast ratio between two colors
 * Formula: (L1 + 0.05) / (L2 + 0.05) where L1 is the lighter color
 */
function calculateContrastRatio(luminance1, luminance2) {
    const lighter = Math.max(luminance1, luminance2);
    const darker = Math.min(luminance1, luminance2);
    return (lighter + 0.05) / (darker + 0.05);
}
/**
 * Generate accessibility recommendation based on contrast ratio
 */
function getRecommendation(ratio, passes) {
    if (passes.normalText) {
        return "✅ Passes all WCAG contrast requirements";
    }
    else if (passes.largeText) {
        return "⚠️ Only suitable for large text (≥18pt or ≥14pt bold)";
    }
    else if (ratio >= 3.0) {
        return "❌ Fails normal text requirements. Consider for disabled text only";
    }
    else {
        return "❌ Fails all WCAG requirements. Must be fixed for accessibility";
    }
}
/**
 * Main function to calculate contrast ratio between foreground and background colors
 *
 * @param foregroundHex - Foreground color in hex format (e.g., "#000000" or "000000")
 * @param backgroundHex - Background color in hex format (e.g., "#ffffff" or "ffffff")
 * @returns ContrastResult with detailed analysis
 */
export function calculateWcagContrast(foregroundHex, backgroundHex) {
    // Convert hex to RGB
    const foregroundRgb = hexToRgb(foregroundHex);
    const backgroundRgb = hexToRgb(backgroundHex);
    if (!foregroundRgb) {
        return { error: `Invalid foreground color format: ${foregroundHex}` };
    }
    if (!backgroundRgb) {
        return { error: `Invalid background color format: ${backgroundHex}` };
    }
    // Calculate luminance for both colors
    const foregroundLuminance = calculateLuminance(foregroundRgb.r, foregroundRgb.g, foregroundRgb.b);
    const backgroundLuminance = calculateLuminance(backgroundRgb.r, backgroundRgb.g, backgroundRgb.b);
    // Calculate contrast ratio
    const contrastRatio = calculateContrastRatio(foregroundLuminance, backgroundLuminance);
    // Determine WCAG compliance
    const passes = {
        normalText: contrastRatio >= 4.5,
        largeText: contrastRatio >= 3.0,
        disabled: contrastRatio >= 3.0
    };
    const recommendation = getRecommendation(contrastRatio, passes);
    return {
        contrastRatio: Math.floor(contrastRatio * 100) / 100, // Truncate to 2 decimal places (more conservative)
        passes,
        luminance: {
            foreground: Math.round(foregroundLuminance * 1000) / 1000,
            background: Math.round(backgroundLuminance * 1000) / 1000
        },
        recommendation
    };
}
/**
 * Batch calculate contrast ratios for multiple color combinations
 */
export function batchCalculateContrast(combinations) {
    return combinations.map(({ foreground, background, description }) => {
        const result = calculateWcagContrast(foreground, background);
        if ('error' in result) {
            return {
                contrastRatio: 0,
                passes: { normalText: false, largeText: false, disabled: false },
                luminance: { foreground: 0, background: 0 },
                recommendation: `❌ Error: ${result.error}`,
                description
            };
        }
        return { ...result, description };
    });
}
/**
 * Find accessible color alternatives that meet WCAG requirements
 * This function adjusts lightness to find the closest accessible version
 */
export function findAccessibleAlternative(targetHex, backgroundHex, requirement = 'normal') {
    const targetRgb = hexToRgb(targetHex);
    const backgroundRgb = hexToRgb(backgroundHex);
    if (!targetRgb || !backgroundRgb) {
        return { error: "Invalid color format" };
    }
    const requiredRatio = requirement === 'normal' ? 4.5 : 3.0;
    const backgroundLuminance = calculateLuminance(backgroundRgb.r, backgroundRgb.g, backgroundRgb.b);
    // Try adjusting brightness while maintaining hue and saturation
    for (let factor = 0.1; factor <= 2.0; factor += 0.05) {
        const adjustedR = Math.min(255, Math.max(0, Math.round(targetRgb.r * factor)));
        const adjustedG = Math.min(255, Math.max(0, Math.round(targetRgb.g * factor)));
        const adjustedB = Math.min(255, Math.max(0, Math.round(targetRgb.b * factor)));
        const adjustedLuminance = calculateLuminance(adjustedR, adjustedG, adjustedB);
        const contrastRatio = calculateContrastRatio(adjustedLuminance, backgroundLuminance);
        if (contrastRatio >= requiredRatio) {
            const hex = [adjustedR, adjustedG, adjustedB]
                .map(channel => channel.toString(16).padStart(2, '0'))
                .join('');
            return {
                color: `#${hex}`,
                contrastRatio: Math.round(contrastRatio * 100) / 100
            };
        }
    }
    return { error: "Could not find accessible alternative within reasonable range" };
}
