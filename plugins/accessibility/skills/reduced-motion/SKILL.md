---
name: reduced-motion
description: Audit and fix Reduced Motion support in React Native animations. Scans for Reanimated animations missing motion alternatives, ReducedMotionConfig misuse, withRepeat gotchas, animation callback bugs, and React Navigation transition gaps. Use when adding Reduce Motion support, auditing motion accessibility, or working with Reanimated/React Navigation animation code.
---

# Reduced Motion

Scan a React Native project for animations that do not respect the Reduced Motion accessibility setting. Apply fixes following the **swap, don't strip** principle — replace problematic motion with gentler alternatives, never just disable animation.

> **This skill is part of an accessibility suite:**
>
> - `screen-reader` — roles, states, labels, grouping, hints, accessibility tree analysis
> - `colors` — contrast, color-vision deficiencies, sensory sensitivity
> - **`reduced-motion`** — ← you are here
> - `screen-reader-animations` — accessibilityActions for gestures, escape for overlays, toast patterns

---

# Step 1 — Discover animation code

Run these searches to find files that need auditing:

```bash
rg -l "react-native-reanimated" --type ts --type tsx -g '!node_modules'
rg "(withTiming|withSpring|withDecay|withDelay|withRepeat|withSequence)" --type ts --type tsx -g '!node_modules' -l
rg "(entering=|exiting=|BounceIn|SlideIn|FadeIn|ZoomIn|FlipIn|RotateIn|LightSpeedIn|PinwheelIn|RollIn|StretchIn)" --type ts --type tsx -g '!node_modules' -l
rg "ReducedMotionConfig" --type ts --type tsx -g '!node_modules'
rg "(animation:|animation=)" --type ts --type tsx -g '!node_modules' | grep -v node_modules
rg "(\.onEnd|\.onFinalize)" --type ts --type tsx -g '!node_modules' -l
```

# Step 2 — Audit each file against the rules

Read each file found. Check every rule below. Apply fixes where violations are found.

---

## Reference: Animation behavior with Reduced Motion on

Use this table when evaluating whether code handles Reduced Motion correctly:

| Function                  | Behavior when Reduced Motion is enabled                                    |
| ------------------------- | -------------------------------------------------------------------------- |
| `withTiming(toValue)`     | Snaps to `toValue` instantly                                               |
| `withSpring(toValue)`     | Snaps to `toValue` instantly — no bounce                                   |
| `withDecay({ velocity })` | Returns current value immediately                                          |
| `withDelay(delay, anim)`  | **Skips the delay**, runs child immediately                                |
| `withRepeat(anim, reps)`  | Infinite or even+reversed: **doesn't start at all**. Otherwise: runs once. |
| `withSequence(a, b, ...)` | **Only children with `ReduceMotion.Never` run**                            |

The `ReduceMotion` enum:

| Value                 | Behavior            | When to apply                                  |
| --------------------- | ------------------- | ---------------------------------------------- |
| `ReduceMotion.System` | Respects OS setting | Default for everything                         |
| `ReduceMotion.Always` | Always disabled     | Performance optimization only                  |
| `ReduceMotion.Never`  | Always plays        | Essential animations only (spinners, progress) |

---

## Rule 0 — Classify every animation as essential or decorative

**Severity:** 🔴 Critical — do this before applying any other rule

Before checking or fixing any animation, classify it:

- **Essential:** The motion itself communicates information. Removing it removes meaning. These must keep animating even with Reduced Motion on.
- **Decorative:** The motion adds polish or delight but carries no information. These should be swapped or removed.

Use this table to classify:

| Essential — keep animating                      | Decorative — swap or remove            |
| ----------------------------------------------- | -------------------------------------- |
| Loading spinners / activity indicators          | Bouncy entrance animations             |
| Progress bars (determinate and indeterminate)   | Parallax scrolling                     |
| Skeleton shimmer (communicates "loading")       | Spring overshoot on buttons            |
| Upload/download progress rings                  | Slide/zoom page transitions            |
| Countdown timers                                | Background animated gradients          |
| State-change feedback (e.g., checkmark draw-on) | Floating/breathing decorative elements |
| Drag-position tracking (finger-follow)          | Auto-playing promotional carousels     |
| Pull-to-refresh spinner                         | Confetti / celebration effects         |

For **essential animations**, apply `ReduceMotion.Never` so they always play:

```tsx
// Loading spinner — must always animate
rotation.value = withRepeat(
  withTiming(360, { duration: 1000, easing: Easing.linear }),
  -1,
  false,
  undefined,
  ReduceMotion.Never // Essential — motion IS the information
);
```

For essential animations that use aggressive motion (fast spin, bounce), provide a **gentler but still animated** alternative:

```tsx
const reduceMotion = useReducedMotion();

if (reduceMotion) {
  // Gentler alternative — still animated, less vestibular cost
  opacity.value = withRepeat(
    withTiming(0.4, { duration: 800 }),
    -1,
    true,
    undefined,
    ReduceMotion.Never
  );
} else {
  // Full spinning animation
  rotation.value = withRepeat(
    withTiming(360, { duration: 1000, easing: Easing.linear }),
    -1,
    false
  );
}
```

For **decorative animations**, apply Rules 2–3 (swap or provide static fallback).

If unsure whether an animation is essential, ask: **"If this animation were frozen on a single frame, would the user lose information?"** If yes → essential. If no → decorative.

---

## Rule 1 — `ReducedMotionConfig` must be at the app root only

**Severity:** 🔴 Critical

Search for `ReducedMotionConfig` in all files. It must appear **exactly once**, at the app root. If found inside any screen or nested component, remove it — it is a global config setter that overrides the user's preference for the entire app.

Fix — place once at root:

```tsx
// App.tsx — the ONLY location
<ReducedMotionConfig mode={ReduceMotion.System} />
```

---

## Rule 2 — Layout animations must swap, not snap

**Severity:** 🟡 Important

Find all `entering=` and `exiting=` props. If the preset is anything other than plain `FadeIn`/`FadeOut`, it needs a reduced-motion alternative.

Presets that need swapping → swap to `FadeIn`/`FadeOut`:

Slide, Bounce, Zoom, Flip, Rotate, LightSpeed, Pinwheel, Roll, Stretch, and any Fade+Direction variant (e.g., `FadeInDown`).

Already safe: plain `FadeIn`, `FadeOut`.

Apply this pattern:

```tsx
const reduceMotion = useReducedMotion();

const entering = reduceMotion
  ? FadeIn.duration(200).reduceMotion(ReduceMotion.Never)
  : BounceIn;

return <Animated.View entering={entering}>...</Animated.View>;
```

The `.reduceMotion(ReduceMotion.Never)` on the fade is required — without it the fade itself is skipped.

---

## Rule 3 — `withRepeat` with infinite/even reps needs handling

**Severity:** 🟡 Important

Search for `withRepeat(`. If reps is `-1` (infinite) or even with `reverse: true`, the animation **doesn't start at all** when Reduced Motion is on.

First, classify using Rule 0:

**If decorative** (e.g., pulsing badge, breathing glow) — provide a static fallback:

```tsx
const reduceMotion = useReducedMotion();

if (reduceMotion) {
  return <View style={{ opacity: 0.6, backgroundColor: "blue" }} />;
}

// else: run the withRepeat animation
```

**If essential** (e.g., loading spinner, progress pulse) — keep it animated with `ReduceMotion.Never`, but consider a gentler variant:

```tsx
const reduceMotion = useReducedMotion();

if (reduceMotion) {
  // Still animated, but gentler — pulsing opacity instead of spinning
  opacity.value = withRepeat(
    withTiming(0.3, { duration: 1000 }),
    -1,
    true,
    undefined,
    ReduceMotion.Never
  );
} else {
  // Full rotation animation
  rotation.value = withRepeat(
    withTiming(360, { duration: 800, easing: Easing.linear }),
    -1,
    false
  );
}
```

The key distinction: decorative repeating animations get a static fallback. Essential repeating animations get `ReduceMotion.Never` (optionally with a gentler motion variant).

---

## Rule 4 — Do not gate interactivity on animation callbacks

**Severity:** 🔴 Critical

Search for `withTiming(` and `withSpring(` with callbacks that call `runOnJS` to update state (enabling buttons, unmounting modals, advancing steps). When Reduced Motion is on, these callbacks **can fail to fire**.

Flag:

```tsx
// ❌ callback may never fire
sv.value = withTiming(1, { duration: 300 }, (finished) => {
  if (finished) runOnJS(setButtonEnabled)(true);
});
```

Fix — set state synchronously:

```tsx
const reduceMotion = useReducedMotion();

if (reduceMotion) {
  sv.value = 1;
  setButtonEnabled(true);
} else {
  sv.value = withTiming(1, { duration: 300 }, (finished) => {
    if (finished) runOnJS(setButtonEnabled)(true);
  });
}
```

---

## Rule 5 — React Navigation custom animations need fallbacks

**Severity:** 🟡 Important

Find all `animation:` options in navigator screen options. On iOS, only `"default"` and `"flip"` auto-respect Reduce Motion (routed through `UINavigationController`). All others use a custom animator with **no accessibility checks**.

Needs fix: `"fade"`, `"fade_from_bottom"`, `"slide_from_bottom"`, `"simple_push"`

No fix needed: `"default"`, `"flip"`, `"none"`

Apply:

```tsx
const reduceMotion = useReducedMotion();

<Stack.Navigator
  screenOptions={{
    animation: reduceMotion ? 'fade' : 'slide_from_bottom',
    animationDuration: reduceMotion ? 50 : undefined,
  }}
>
```

Modal presentations (`"modal"`, `"fullScreenModal"`, `"formSheet"`) are safe — UIKit handles them natively.

---

## Rule 6 — Gesture completion must respect Reduced Motion

**Severity:** 🟠 Moderate

Find `onEnd` / `onFinalize` handlers on gesture handlers. The tracking phase (finger-follow) is direct manipulation — no concern. The completion phase (snap to final position) is where Reduced Motion applies.

`withSpring` and `withTiming` default to `ReduceMotion.System`, so they handle this automatically. Flag any `ReduceMotion.Never` on completion animations that are not essential.

---

## Rule 7 — `useReducedMotion()` does not update mid-session

**Severity:** 🟠 Moderate

If code uses `useReducedMotion()` to conditionally render different UI (not just pick animation variants), the UI will not update if the user toggles the setting while the app is open. The hook reads the value at startup only.

If real-time UI updates are needed, replace with:

```tsx
function useReduceMotionLive() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setEnabled);
    const listener = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setEnabled
    );
    return () => listener.remove();
  }, []);

  return enabled;
}
```

Use `useReducedMotion()` for animation variant selection. Use `useReduceMotionLive()` for conditional rendering.
