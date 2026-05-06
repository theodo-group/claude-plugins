---
name: colors
description: Check color usage in your app (web or React Native) for accessibility compliance, including contrast, color-vision deficiencies, and sensory sensitivity.
allowed-tools: Bash Read mcp__plugin_accessibility_contrast-calculator__calculate_contrast mcp__plugin_accessibility_contrast-calculator__batch_calculate_contrast
disable-model-invocation: true
---

# Output format  

Structure your ENTIRE response using exactly the template below. Do NOT write any prose, explanation, or analysis outside of this structure. Fill each section in order. Do NOT reorder or rename sections. If a section has no violations, include it with its skip note — never omit a section entirely.

## Color Accessibility Report

### Summary

| Check | Status |
|---|---|
| Contrast (light theme) | ✅ Pass / ❌ Fail / ⚠️ Ambiguous |
| Contrast (dark theme) | ✅ Pass / ❌ Fail / ⚠️ Ambiguous |
| Color-only indicators | ✅ Pass / ❌ Fail |
| Sensory sensitivity | ✅ Pass / ❌ Fail |

---

### 1. Contrast issues

> _Skip this section if all contrast checks passed._

**Thresholds reminder:**

| Text type | Web | React Native | Required ratio |
|---|---|---|---|
| Normal text | < 24px (or < 18.67px bold) | < 18pt (or < 14pt bold) | ≥ 4.5:1 |
| Large text | ≥ 24px (or ≥ 18.67px bold) | ≥ 18pt (or ≥ 14pt bold) | ≥ 3:1 |
| Disabled text | any | any | ≥ 3:1 |
| Focus indicator | web only | — | ≥ 3:1 |

| Element | Location | Text size | Foreground | Background | Ratio | Result |
|---|---|---|---|---|---|---|
| `<ComponentName>` | `path/to/file.tsx:42` | BOTH | `#333333` | `#FFFFFF` | 12.6:1 | ✅ |
| `<ComponentName>` | `path/to/file.tsx:88` | SMALL | `#AAAAAA` | `#FFFFFF` | 2.3:1 | ❌ |

**Ambiguous colors** _(cannot be analyzed)_:

- `path/to/file.tsx:55` — `var(--color-primary)` on `var(--surface-bg)`: unresolved CSS custom properties

---

### 2. Color-only indicators

> _Skip this section if no violations were found._

| Element | Location | Issue |
|---|---|---|
| Error message | `path/to/file.tsx:102` | Error state indicated only by red text — no icon or label |

---

### 3. Sensory sensitivity

> _Skip this section if no violations were found._

| Element | Location | Issue |
|---|---|---|
| Banner | `path/to/file.tsx:14` | Highly saturated color (`#FF0000`) used as background |

---

Would you like to know more about color accessibility or why accessibility matters? I can dive deeper into color guidelines using the `colors` skill, or explain the broader importance of accessibility with the `why-accessibility` skill.
</output-template>

</mandatory-output-format>

---

# Color Accessibility Verification Guidelines

These rules define when color usage in the application is considered **accessible**.

The guidelines align with **WCAG 2.1** and include additional constraints for color-vision deficiencies and sensory sensitivity.

---

## 0. Prerequisite rules

These rules define how the LLM must interpret color information before applying accessibility checks.

### 0.1 Ambiguous color handling

If the LLM cannot determine the actual rendered color value, it must not guess.

A color is considered ambiguous if any of the following is true:

- The color is defined through an unresolved CSS custom property (`var(--color-primary)`) or design token whose value cannot be statically resolved
- The color depends on runtime logic that cannot be statically evaluated
- The color is inherited from an unknown parent
- The color is affected by an unknown theme, mode, or configuration

If a color is ambiguous:

- The LLM must not attempt contrast or accessibility analysis
- The LLM must report the color as "not analyzable due to ambiguity"
- The report must include the reason for ambiguity (e.g. unknown theme, unresolved CSS variable)

### 0.2 Named color resolution

If a color is specified using a standard color name (e.g. black, white, red, blue, green):

- If there is no theme or configuration overriding it, the LLM must treat it as the default CSS color value
- If there is a theme, token, or configuration that can override named colors, the LLM must resolve the final value from the theme
- If resolution is not possible, the color is considered ambiguous

### 0.3 CSS color format support

The `calculate_contrast` and `batch_calculate_contrast` tools accept:

- **Hex**: `#rgb`, `#rrggbb`, `#rgba`, `#rrggbbaa`
- **RGB / RGBA**: `rgb(255, 0, 0)`, `rgba(255, 0, 0, 0.5)`
- **HSL / HSLA**: `hsl(120, 50%, 50%)`, `hsla(120, 50%, 50%, 0.8)`

Semi-transparent colors are automatically alpha-composited before contrast is computed:
- A semi-transparent **background** is composited over white
- A semi-transparent **foreground** is composited over the (resolved) background

Relative units (`em`, `rem`, `%`) and `opacity` CSS properties are **not** handled by the tool — the LLM must resolve them to absolute color values before calling the tool.

## 1. Contrast requirements (low vision)

### 1.1 Definition

A **contrast ratio** is the ratio of perceived luminance between the foreground (text, icon, or control) and background (surface behind the foreground).

**Always use the `calculate_contrast` MCP tool to compute contrast ratios.** Never calculate them manually. For multiple color pairs, use `batch_calculate_contrast` in a single call. **Do not** try to find a passing alternative for a failing color.

---

### 1.2 Text contrast rules

For every text element, the LLM must verify the contrast ratio. Size thresholds and unit resolution differ by platform:

| Rule | Web | Mobile (React Native) |
|---|---|---|
| **Normal text threshold** | < 24px / < 1.5rem (or < 18.67px / < 1.167rem bold) → **≥ 4.5:1** | < 18pt (or < 14pt bold) → **≥ 4.5:1** |
| **Large text threshold** | ≥ 24px / ≥ 1.5rem (or ≥ 18.67px / ≥ 1.167rem bold) → **≥ 3:1** | ≥ 18pt (or ≥ 14pt bold) → **≥ 3:1** |
| **Relative units** | Resolve `em`/`rem` against computed base font size (default: 16px) | Use pt units directly; 18pt ≈ 24px at 96 dpi |

Regardless of platform:

- Disabled text **must maintain a contrast ratio ≥ 3:1**
- CSS `opacity` **must not reduce** the effective contrast below the required threshold — evaluate opacity-adjusted colors, not raw values

---

### 1.3 Non-static backgrounds

If a foreground color appears on:

- An image
- A gradient
- A dynamically changing surface

Then:

- The **worst-case contrast ratio** must meet the applicable threshold
- If worst-case contrast cannot be guaranteed, the usage **must be rejected**

---

### 1.4 Color variants

For all color variants (primary, secondary, tertiary, theme variants):

- Contrast requirements **must be evaluated independently**
- A variant that fails contrast **must not be used for text or essential UI**

---

### 1.5 Focus indicators (web only)

For web applications, interactive elements (links, buttons, inputs, etc.) must have a visible focus indicator that meets contrast requirements:

- The focus indicator must have a contrast ratio ≥ 3:1 against the adjacent colors
- Focus styles set via `outline: none` or `outline: 0` without a replacement **must be rejected**

---

## 2. Color must not be the only indicator (color-vision deficiencies)

For every UI state or piece of information, we must verify that **meaning is not conveyed by color alone**.

### 2.1 Required non-color indicators

If color is used to express meaning (error, success, selected, focused, warning), then **at least one** of the following must also be present:

- Textual label
- Icon or symbol
- Shape, outline, or border change
- Pattern or positional change

---

### 2.2 Specific checks

- Error states must not rely solely on red
- Success states must not rely solely on green
- Selected or focused states must not rely solely on color changes
- Graphs and charts must combine:
  - Color
  - Labels and/or shapes

If a state is distinguishable only by color, the usage **must be rejected**.

---

## 3. Prefer simple colors (sensory sensitivity / autism)

### 3.1 Definition of acceptable colors

Colors are considered acceptable if they meet **all** of the following:

- **Low to medium saturation**
  - Must not be near maximum saturation
- **Moderate brightness**
  - Must avoid excessive use of pure white or pure black
- **Moderate contrast**
  - Must remain readable without producing harsh visual separation

---

### 3.2 Palette constraints

We must verify:

- The base color palette is **intentionally limited**
- Each color has a **documented semantic purpose**
- Decorative colors without semantic meaning **must not be introduced**
- Most surfaces use neutral colors
- Accent colors are used sparingly and intentionally

---

### 3.3 Consistency rules

Across the entire application:

- A given color **must always represent the same meaning**
- A color **must not represent conflicting states**
- Neutral colors **must not be reused** as alert or error indicators

---

### 3.4 Prohibited color usage

The following usages **must be rejected**:

- Highly saturated or fluorescent colors
- Rapidly alternating or flashing colors
- Abrupt color changes that draw attention through intensity
- Color changes combined with motion or animation
- Visually complex color effects:
  - Heavy gradients
  - Patterns
  - Color overlays
  - Text placed over complex or multicolored backgrounds
- Visually "vibrating" color combinations:
  - High-contrast complementary pairs (e.g. red on blue)

---

## 4. Dark theme requirement

All rules defined in sections **1, 2, and 3**:

- **Must be validated independently** for light mode and dark mode
- A color that passes in light mode **does not automatically pass** in dark mode
- Theme-specific color tokens **must be checked separately**

---

## 5. Decision model

A color usage is **acceptable** if and only if:

1. All applicable contrast thresholds are met
2. Meaning is not conveyed by color alone
3. Colors are simple, limited, consistent, and non-overstimulating
4. All rules pass in both light and dark themes

If any rule fails, we **must flag the usage as non-accessible**.

