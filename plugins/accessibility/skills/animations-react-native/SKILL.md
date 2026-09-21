---
name: accessible-animations
description: >
  Audit, implement, and review accessible animations in React Native and Reanimated. Use whenever work involves any animated or gesture-driven UI in React Native, even if accessibility is never mentioned: entering/exiting transitions, swipe or drag interactions, toasts and snackbars, bottom sheets, popovers, loading indicators, custom sliders or scrubbers, or animated state changes. Also use for explicitly accessibility-focused work: Reduce Motion, screen reader support for animated interfaces, accessibility actions, status announcements, or color-only animated state cues.
allowed-tools: Bash Read Edit Write mcp__plugin_accessibility_accessibility-tree__get_accessibility_tree_android mcp__plugin_accessibility_accessibility-tree__get_accessibility_tree_ios
---

# Accessible Animations

Use this skill when creating, reviewing, or fixing animated UI so the animation's purpose is preserved for people who use Reduce Motion, screen readers, alternative gestures, or non-color visual cues.

## Core principle

Accessibility does **not** mean shutting all animation off. It means preserving the purpose of the interaction in a way more people can experience.

Before shipping an animation, ask:

1. Does it move? Handle Reduce Motion.
2. Does it appear, disappear, or change state? Make sure a screen reader notices.
3. Does it require a gesture? Provide an accessible action.
4. Does it auto-dismiss? Reconsider whether it should.

## Workflow

1. **Identify the purpose of the animation.** Name what the user learns or can do because the motion exists.
2. **Find accessibility risk.** Check for movement, auto-dismissal, hidden/mounted state changes, gesture-only behavior, overlays, color-only cues, and custom controls.
3. **Preserve the cue with an accessible alternative.** Prefer replacing risky motion with a gentler cue over removing meaning entirely.
4. **Expose semantic state.** Add accurate role, state, value, custom actions, announcements, and live regions where appropriate.
5. **Verify statically.** Confirm in code that props, gating, announcements, and actions are wired correctly (see "Final checklist").
6. **Verify dynamically when a device is reachable.** Use the accessibility tree to confirm state/role/label changes actually reach the accessibility layer, not just the code (see "Dynamic verification").
7. **Hand off what only a human can check.** End the work with a short manual verification list for the developer, scoped to what neither static reading nor the accessibility tree can confirm (see "Manual verification handoff").

## Reduce Motion

### Reanimated reduced behavior gotchas

When Reduce Motion is on, or `ReduceMotion.Always` is used:

| Function | Reduced behavior |
| --- | --- |
| `withTiming` | Snaps to the target |
| `withSpring` | Snaps to the target, no bounce |
| `withDecay` | Stays at the current value |
| `withDelay` | Skips the delay |
| `withRepeat` | May not start, especially infinite or even reversed repeats |
| `withSequence` | Reduced children snap, but `ReduceMotion.Never` children still animate |

**Testing gotcha:** Reanimated reads the Reduce Motion setting once and may not react to it changing while the app is running. After toggling Reduce Motion on the device, force-quit and relaunch the app before checking whether reduced variants took effect — otherwise a working implementation can look broken.

### Pattern: swap, don't strip

If the original motion may cause discomfort, replace it with a gentler transition instead of removing the cue entirely.

```tsx
const entering = reduceMotion
  ? FadeIn.delay(150)
      .duration(700)
      .easing(Easing.in(Easing.cubic))
      .reduceMotion(ReduceMotion.Never)
  : ZoomIn.duration(350);

const exiting = reduceMotion
  ? FadeOut.duration(450)
      .easing(Easing.out(Easing.cubic))
      .reduceMotion(ReduceMotion.Never)
  : ZoomOut.duration(250);
```

Here, zoom is replaced with a fade. The fade uses `ReduceMotion.Never` because it is the gentler accessible alternative.

### Essential motion

If animation is essential to understanding that work is happening, it may need to keep running:

```tsx
rotation.value = withRepeat(
  withTiming(360, {
    duration: 1000,
    easing: Easing.linear,
  }),
  -1,
  false,
  undefined,
  ReduceMotion.Never,
);
```

Use `ReduceMotion.Never` carefully. Reserve it for motion that communicates essential information.

### Avoid `ReducedMotionConfig` as a local wrapper

`ReducedMotionConfig` looks like a component, but it acts like a global config setter. If you wrap one screen with it, it can affect animations across the entire app.

## Appearing, disappearing, and changing UI

If UI appears, disappears, or changes state, screen reader users may not notice unless the change is exposed.

Avoid rendering meaningful controls only after state changes when users need to discover them. Prefer keeping the control in the accessibility tree and marking it disabled until ready.

```tsx
<View
  accessible
  accessibilityRole="button"
  accessibilityState={{disabled: !hasCode}}
  accessibilityLiveRegion="polite"
>
  <Pressable
    onPress={hasCode ? handleApply : undefined}
    disabled={!hasCode}
    style={[styles.applyBtn, !hasCode && styles.applyBtnDisabled]}
  >
    <Text>Apply</Text>
  </Pressable>
</View>
```

Announce important changes:

```tsx
AccessibilityInfo.announceForAccessibility('Apply button now available');
```

After the user performs an action, announce the result:

```tsx
AccessibilityInfo.announceForAccessibility(
  `Promo code applied. New total ${formatMoney(newTotal)}.`,
);
```

Do not over-announce routine visual changes. Announce changes that affect task completion, state, navigation, or available actions.

**Platform note.** `accessibilityLiveRegion` only works on Android; iOS ignores it. `AccessibilityInfo.announceForAccessibility` covers iOS. The presence of both on the same surface is intentional platform coverage, not redundancy — when reviewing code, do not "simplify" by removing one of the pair. When the two mechanisms could double-announce the same change on Android, prefer the live region for passive state changes and the explicit announcement for action results.

## Gesture-only interactions and custom actions

If an interaction requires a gesture, provide another accessible way to perform the same action. Swipe, drag, pan, long-press, and scrub gestures can be invisible or unavailable to screen reader users because screen readers use their own gesture systems.

Use `accessibilityActions` and `onAccessibilityAction` to expose gesture alternatives semantically. A hint can explain an action, but the action itself should be registered with the accessibility system.

```tsx
const canOpenDetails = onPress !== undefined;
const canRemove = onRemove !== undefined && !disabled;

const accessibilityActions = useMemo(
  () => (canRemove ? [{name: 'remove', label: 'Remove'}] : undefined),
  [canRemove],
);

const accessibilityHint = useMemo(() => {
  const hints: string[] = [];

  if (canOpenDetails) {
    hints.push('Double tap to open details.');
  }

  if (canRemove) {
    hints.push('Use actions to remove this item.');
  }

  return hints.length > 0 ? hints.join(' ') : undefined;
}, [canOpenDetails, canRemove]);

return (
  <Animated.View
    accessible
    accessibilityRole={canOpenDetails ? 'button' : undefined}
    accessibilityLabel={label}
    accessibilityHint={accessibilityHint}
    accessibilityActions={accessibilityActions}
    onAccessibilityAction={(event) => {
      if (event.nativeEvent.actionName === 'remove' && canRemove) {
        onRemove();
      }
    }}
  >
    {/* row content */}
  </Animated.View>
);
```

### Think in capabilities

When a component exposes multiple user-available capabilities, identify each one separately. A row might support primary activation (double tap), a custom action (actions rotor / local context menu), an adjustable value (increment/decrement gestures), or escape/dismiss. Do not assume these are always enabled together: a component can have primary activation only, custom action only, both, or neither. Gate and describe each capability according to whether it is actually available in the current state.

### Gate independently when availability can vary independently

If two actions can be enabled or disabled separately, gate them separately.

```tsx
const canActivate = onPress !== undefined && !disabled;
const canRemove = onRemove !== undefined && !disabled && !readOnly;
```

Do not gate a custom action on the primary activation handler unless it truly depends on it:

```tsx
// Risky: hides remove whenever the row has no primary press action.
accessibilityActions={onPress && canRemove ? removeActions : undefined}
```

If two capabilities always share the same availability, one shared gate is fine; do not invent state combinations that cannot occur. Do not infer availability from prop names alone. Inspect how cancellation, read-only, open-state, pending-state, and permission props are actually used before gating accessibility actions on them.

### Hints describe; actions enable

A hint should not be the only place an action exists. If a hint says "Use actions to remove this item," the `remove` action must also be registered in `accessibilityActions` with a handler. The hint explains what the user can do; `accessibilityActions` makes it available to the assistive technology.

Compose hints from currently available capabilities, as in the example above, rather than one static hint. This prevents stale hints: "Double tap…" when there is no primary action, "Use actions to remove…" when remove is unavailable, or hints describing a previous mode after the component enters selection, editing, loading, or read-only states.

### Guard the handler too

Even if an action is not exposed, guard inside `onAccessibilityAction` before performing work, as the example does with `canRemove`. This protects against stale props, recycled list rows, race conditions, and platform quirks.

### Announce completion after the action is confirmed

For destructive or structural changes, announce the result after the action has actually completed:

```tsx
onAccessibilityAction={(event) => {
  if (event.nativeEvent.actionName === 'remove' && canRemove) {
    onRemove().then(() => {
      AccessibilityInfo.announceForAccessibility('Item removed.');
    });
  }
}}
```

If the action opens a confirmation dialog, do not announce "removed" from the original row; announce from the removal path after the user confirms and the item is actually gone. After destructive or structural changes, move focus to the next logical item so the user is not left disoriented.

### Keep action props stable in high-volume UI

In recycled lists, animated rows, or memoized components, avoid creating new action arrays inline on every render; prefer `useMemo`, as in the example. This is a performance consideration rather than the core accessibility requirement, but it avoids unnecessary re-renders and native accessibility prop updates.

### Suggested test coverage for gesture fallbacks

Test the state combinations that can actually occur:

- custom action is exposed when the gesture action is available, and calls the same behavior as the gesture path
- custom action is absent when its callback is missing, or when disabled/read-only/locked/pending states disable it
- each hint appears only when its capability is available, and composed hints include all currently available capabilities
- `onAccessibilityAction` does nothing when the action is unavailable
- if the action removes or dismisses content, completion is announced after the action completes

## Adjustable controls

For sliders, steppers, scrubbers, volume controls, and other range-based controls, expose the control as adjustable and provide increment/decrement actions.

```tsx
<View
  accessible
  accessibilityRole="adjustable"
  accessibilityLabel="Volume"
  accessibilityValue={{
    min: 0,
    max: 100,
    now: value,
    text: `${value} percent`,
  }}
  accessibilityActions={[{name: 'increment'}, {name: 'decrement'}]}
  onAccessibilityAction={(event) => {
    if (event.nativeEvent.actionName === 'increment') {
      onChange(Math.min(value + 5, 100));
    }

    if (event.nativeEvent.actionName === 'decrement') {
      onChange(Math.max(value - 5, 0));
    }
  }}
>
  {/* custom slider UI */}
</View>
```

Screen reader users commonly interact with adjustable controls by swiping up/down for increments and double tapping/holding for fine adjustment.

## Custom overlays and popovers

Native modals often get escape behavior for free. Custom animated overlays do not. For custom popovers, menus, and bottom sheets, wire escape behavior explicitly.

```tsx
<Animated.View
  accessibilityViewIsModal
  importantForAccessibility="yes"
  accessibilityHint="Use escape gesture to dismiss"
  onAccessibilityEscape={onClose}
  accessibilityActions={[{name: 'escape', label: 'Dismiss menu'}]}
  onAccessibilityAction={(event) => {
    if (event.nativeEvent.actionName === 'escape') {
      onClose();
    }
  }}
>
  {/* menu content */}
</Animated.View>
```

**Platform note.** This example pairs platform-specific mechanisms on purpose. `onAccessibilityEscape` responds to the VoiceOver two-finger Z scrub on iOS; TalkBack has no equivalent gesture, so the `escape` custom action provides the Android path. Likewise `accessibilityViewIsModal` is iOS-only. Do not remove one half of a pair as redundant; each covers a platform the other cannot.

Hide non-interactive backdrops from screen readers:

```tsx
<Pressable
  onPress={onClose}
  accessible={false}
  importantForAccessibility="no"
>
  {/* backdrop */}
</Pressable>
```

## Toasts and auto-dismiss content

If the message matters, use a persistent surface: banner, inline feedback, or notification surface. A toast is acceptable only when the information is secondary or redundant, because toasts disappear before some users can read or hear them and usually cannot be recovered.

Ask: **If someone looked away and missed this message, would it matter?** If yes, do not use an auto-dismissing toast.

For important feedback, prefer a persistent banner:

```tsx
<Animated.View
  style={styles.banner}
  accessible
  accessibilityRole="alert"
  accessibilityLiveRegion="polite"
>
  <View style={{flex: 1}}>
    <Text style={styles.bannerTitle}>Badge claimed</Text>
    <Text style={styles.bannerBody}>
      You earned the Inclusive Designer badge. View it in your profile.
    </Text>
  </View>

  <Pressable
    onPress={() => setBannerVisible(false)}
    accessibilityRole="button"
    accessibilityLabel="Dismiss"
  >
    <Text>×</Text>
  </Pressable>
</Animated.View>
```

## Color is not enough

A state change communicated only by color is invisible to many users (WCAG 1.4.1). But adding extra visual cues changes the design, and that decision belongs to the user, not to the agent.

When implementing or reviewing a colour-only state change:

1. Implement the colour change as requested. Do not silently add borders, icons, opacity shifts, or text changes.
2. Always expose the state semantically regardless of visuals: `accessibilityState`, an accurate role, or an announcement. This has no visual cost and is not optional.
3. Flag the colour-only cue to the user: name the state that is colour-only, explain who misses it, and suggest one or two concrete second cues (border, icon, text, shape) they could approve. In a review, report it as a finding; in implementation, ask before adding.

Quick test: view the UI in grayscale. If the state only works in color, it does not work for everyone. That test result is what gets flagged.

## WCAG references

Useful criteria for animated and interactive UI:

| WCAG | Level | Why it matters |
| --- | --- | --- |
| 1.4.1 Use of Color | A | Color cannot be the only way to communicate state |
| 2.2.1 Timing Adjustable | A | Users need control over time-limited content |
| 2.3.3 Animation from Interactions | AAA | Motion triggered by interaction can be disabled unless essential |
| 2.5.7 Dragging Movements | AA | Dragging functionality needs a non-drag alternative |
| 4.1.2 Name, Role, Value | A | Custom controls must expose what they are and their state/value |
| 4.1.3 Status Messages | AA | Important status changes must be programmatically determinable |

## Final checklist (statically verifiable)

Verify these directly in code before finishing:

- Animations respect Reduce Motion, and gentler replacements were considered before stripping any cue.
- If motion is removed, the meaning is still preserved.
- Appearing, disappearing, or changing UI is exposed to screen readers via role/state changes, live regions, or announcements.
- Gesture-only actions are exposed through `accessibilityActions`, gated on actual availability, and guarded in the handler.
- The UI announces the result of meaningful actions, after the action completes.
- Focus management exists after destructive or structural changes.
- Custom overlays wire both the iOS escape gesture and an Android escape action.
- Important feedback is persistent instead of auto-dismissing.
- Colour-only state changes are exposed semantically and flagged to the user, with second-cue suggestions, rather than silently redesigned.
- Role, state, value, and label are accurate, and platform-paired props are not stripped as "redundant."
- Adjustable/range controls expose `accessibilityRole="adjustable"`, `accessibilityValue` (`min`/`max`/`now`/`text`), and `increment`/`decrement` actions.

## Dynamic verification (accessibility tree)

Code review only confirms that the right props are *written*; it cannot confirm they *reach the accessibility layer* on a real platform. When an Android emulator/device or iOS simulator/device is reachable, close that gap with the `accessibility-tree` MCP tools (`get_accessibility_tree_android`, `get_accessibility_tree_ios`) instead of asserting from code alone. If no device is reachable, skip this step and fall through to the manual handoff — do not block implementation work on it. For device/simulator detection and WDA setup steps, see the `screen-reader-react-native` skill.

**Workflow:**

1. Snapshot the tree in the starting state.
2. Trigger the interaction that drives the animation (tap, navigate, toggle a flag, etc.).
3. Snapshot the tree again in the end state.
4. Diff the two snapshots against what step 4 of the workflow (`Expose semantic state`) was supposed to produce.

**What the diff can confirm:**

- A node that should appear/disappear from the tree actually does (e.g. a control gated by `disabled`/`importantForAccessibility` rather than hidden, or a decorative backdrop correctly excluded).
- A changed role, label, or state (`accessibilityState`, traits) is reflected in the new snapshot, not just present in the component's props.
- The Android XML dump exposes `focused`/`focusable` attributes — use them to confirm focus actually lands on the intended node after a destructive or structural change, rather than assuming it from code.
- Text driven by an announcement-adjacent live region (`accessibilityLiveRegion`) is present with the expected content in the post-action snapshot.

**What it cannot confirm** (still requires the manual handoff below): whether an announcement actually fired and was spoken, whether Reduce Motion visually snapped vs. animated, gesture/actions-rotor behavior, timing of announcements relative to focus changes, and anything about the visual/perceptual quality of the motion itself. Do not report an item as "verified" from the tree diff if it only reflects one of these.

If a snapshot doesn't match what was expected, treat it the same as a code-review finding: fix the implementation, don't rationalize the diff.

## Manual verification handoff

Some things can only be confirmed by a human with a screen reader and device settings. After implementation or review work — and after dynamic verification where it was possible — end with a short device checklist for the developer, tailored to what changed and to what static/dynamic verification could not already confirm. Draw from:

- Toggle Reduce Motion on device, **force-quit and relaunch the app** (Reanimated may not pick up the setting change on a running app), then confirm reduced variants play (or snap) as intended and that essential motion still runs.
- With VoiceOver (iOS): confirm the element's announced name, role, and hint; confirm custom actions appear in the actions rotor; confirm two-finger Z scrub dismisses custom overlays.
- With TalkBack (Android): confirm custom actions appear in the local context menu; confirm live region announcements fire without double-announcing.
- Confirm announcements are heard at the right moment and are not clipped by focus changes.
- View the flow in grayscale and confirm every state change is still perceivable.
- Confirm focus lands somewhere sensible after deletions, dismissals, and structural changes.
- For adjustable controls, swipe up/down (VoiceOver/TalkBack) to confirm increment/decrement actually changes the value and the new value is announced.
