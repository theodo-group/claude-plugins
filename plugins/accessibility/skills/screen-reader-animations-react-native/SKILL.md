---
name: screen-reader-animations
description: Audit and fix screen reader accessibility for animated React Native components. Covers accessibilityActions for swipe gestures, adjustable role for sliders, escape gesture for custom overlays, toast-to-banner conversion, focus management after transitions, and announcements for loading states. Use when making animations work with VoiceOver/TalkBack, or auditing gesture/overlay/toast components for screen reader users.
---

# Screen Reader Animations

Scan a React Native project for animated components that do not work with screen readers. Screen readers (VoiceOver, TalkBack) replace the standard gesture system entirely — if the only interaction path is a gesture, screen reader users have no path at all.

Screen readers and Reduced Motion are **independent settings**. This skill covers the screen reader side. For Reduced Motion, use `reduced-motion`.

> **This skill is part of an accessibility suite:**
>
> - `screen-reader` — roles, states, labels, grouping, hints, accessibility tree analysis
> - `colors` — contrast, color-vision deficiencies, sensory sensitivity
> - `reduced-motion` — Reanimated animation swapping, ReducedMotionConfig, navigation transitions
> - **`screen-reader-animations`** — ← you are here

---

# Step 1 — Discover components that need screen reader support

```bash
rg "(PanGestureHandler|Gesture\.Pan|Swipeable|swipe)" --type ts --type tsx -g '!node_modules' -l
rg "(Slider|slider|stepper|scrubber|range)" --type ts --type tsx -g '!node_modules' -l
rg -i "(bottom.?sheet|overlay|action.?sheet|drawer)" --type ts --type tsx -g '!node_modules' -l
rg -i "(toast|snackbar|notification.*popup)" --type ts --type tsx -g '!node_modules' -l
rg -i "(shimmer|skeleton|placeholder)" --type ts --type tsx -g '!node_modules' -l
rg "(accessibilityActions|onAccessibilityAction|onAccessibilityEscape|accessibilityLiveRegion|announceForAccessibility)" --type ts --type tsx -g '!node_modules' -l
```

# Step 2 — Audit each file against the rules

Read each file found. Check every applicable rule. Apply fixes where violations are found.

---

## Reference: How screen readers replace gestures

| Standard gesture | VoiceOver (iOS)                                | TalkBack (Android)                       |
| ---------------- | ---------------------------------------------- | ---------------------------------------- |
| Swipe to delete  | Rotor → "Actions" → swipe up/down → double-tap | Local context menu (swipe up-then-right) |
| Drag slider      | Swipe up/down one finger on focused element    | Swipe up/down on focused element         |
| Dismiss modal    | Two-finger Z-scrub                             | Local context menu → "Dismiss"           |
| Tap              | Double-tap                                     | Double-tap                               |
| Scroll           | Three-finger swipe                             | Two-finger swipe                         |

---

## Rule 1 — Swipeable rows must have `accessibilityActions`

**Severity:** 🔴 Critical

Find all `PanGestureHandler`, `Gesture.Pan()`, `Swipeable`, or swipe patterns. If a swipe triggers an action (delete, archive, dismiss), verify the component has `accessibilityActions` and `onAccessibilityAction`. Without these, the action does not exist for screen reader users.

Apply:

```tsx
<Animated.View
  accessible
  accessibilityLabel={`${item.title}, ${item.quantity} for $${item.price}`}
  accessibilityActions={[{ name: "delete", label: "Remove from basket" }]}
  onAccessibilityAction={(event) => {
    if (event.nativeEvent.actionName === "delete") {
      onSwipe();
      AccessibilityInfo.announceForAccessibility(
        `${item.title} removed from basket`
      );
    }
  }}
>
  {/* gesture/animation code unchanged */}
</Animated.View>
```

After the action completes, also verify:

- The result is announced: `AccessibilityInfo.announceForAccessibility()`
- Focus moves to the next logical element: `AccessibilityInfo.setAccessibilityFocus()`

For reorderable lists, add increment/decrement actions:

```tsx
accessibilityActions={[
  { name: 'increment', label: 'Move up' },
  { name: 'decrement', label: 'Move down' },
]}
```

---

## Rule 2 — Custom sliders/steppers must use `accessibilityRole="adjustable"`

**Severity:** 🔴 Critical

Find any custom slider, scrubber, quantity stepper, or carousel that snaps to values. If it uses `PanGestureHandler` or similar for value changes, the gesture is invisible to screen readers. Verify it has `accessibilityRole="adjustable"`, `accessibilityValue`, and increment/decrement actions.

Apply:

```tsx
<View
  accessible
  accessibilityRole="adjustable"
  accessibilityLabel="Volume"
  accessibilityValue={{ min: 0, max: 100, now: volume, text: `${volume}%` }}
  accessibilityActions={[{ name: "increment" }, { name: "decrement" }]}
  onAccessibilityAction={(event) => {
    if (event.nativeEvent.actionName === "increment") {
      setVolume(Math.min(volume + step, max));
    } else if (event.nativeEvent.actionName === "decrement") {
      setVolume(Math.max(volume - step, min));
    }
  }}
>
  {/* animated slider visual unchanged */}
</View>
```

---

## Rule 3 — Custom overlays/sheets must support the escape gesture

**Severity:** 🔴 Critical

Find any custom bottom sheet, modal, overlay, action sheet, or tutorial card that is NOT using the built-in `Modal` component or React Navigation's `presentation: 'modal'`. Native modals auto-wire the dismiss gesture. Custom overlays do not — screen reader users are trapped.

Verify the component has all three:

1. `onAccessibilityEscape` — iOS two-finger Z-scrub
2. `accessibilityActions` with `escape` — TalkBack context menu
3. `accessibilityViewIsModal={true}` — traps focus inside overlay

Apply:

```tsx
<View
  accessible
  accessibilityViewIsModal={true}
  importantForAccessibility="yes"
  onAccessibilityEscape={onDismiss}
  accessibilityActions={[{ name: "escape", label: "Dismiss" }]}
  onAccessibilityAction={(event) => {
    if (event.nativeEvent.actionName === "escape") {
      onDismiss();
    }
  }}
>
  {/* overlay content */}
</View>
```

Also verify that background content behind the overlay is hidden from screen readers. See `screen-reader` skill, step 8.3.

---

## Rule 4 — Toasts with important info must be accessible or replaced

**Severity:** 🟡 Important

Find all toast/snackbar components. Apply this test: **if a screen reader user missed this message, would it matter?**

- If info is redundant (e.g., "Saved" when saved state is visible elsewhere) → toast is acceptable, but add `accessibilityLiveRegion="assertive"` and `accessibilityRole="alert"`.
- If info is unique (e.g., "Connection lost", error messages, "Your address was updated") → replace with a persistent banner that has a dismiss button.

Toast fix:

```tsx
<View accessibilityLiveRegion="assertive" accessibilityRole="alert" accessible>
  <Text>{message}</Text>
</View>
```

Banner fix:

```tsx
<View accessible accessibilityRole="alert" accessibilityLiveRegion="assertive">
  <Text>{message}</Text>
  <Pressable
    onPress={onDismiss}
    accessibilityLabel="Dismiss notification"
    accessibilityRole="button"
  >
    <Text>Dismiss</Text>
  </Pressable>
</View>
```

---

## Rule 5 — Focus must be managed after navigation transitions

**Severity:** 🟡 Important

Screen readers try to focus elements immediately during transitions — even mid-animation. After any screen transition, verify focus lands on the correct element (usually the screen header).

Apply — gate focus on transition completion:

```tsx
function useAccessibilityFocus() {
  const ref = useRef(null);

  useFocusEffect(
    useCallback(() => {
      const task = InteractionManager.runAfterInteractions(() => {
        if (ref.current) {
          const node = findNodeHandle(ref.current);
          if (node) {
            setTimeout(() => {
              AccessibilityInfo.setAccessibilityFocus(node);
            }, 100);
          }
        }
      });
      return () => task.cancel();
    }, [])
  );

  return ref;
}
```

---

## Rule 6 — Shimmer/skeleton loading must announce state changes

**Severity:** 🟡 Important

Find shimmer/skeleton components. They are invisible to screen readers. Verify they announce loading start and content arrival.

Apply:

```tsx
useEffect(() => {
  if (isLoading) {
    AccessibilityInfo.announceForAccessibility("Loading content");
  } else {
    AccessibilityInfo.announceForAccessibility("Content loaded");
  }
}, [isLoading]);
```

Shimmer views should also have `accessibilityLabel="Loading content"` and `accessible={true}`.

---

## Rule 7 — Pull-to-refresh must announce state

**Severity:** 🟡 Important

Find `RefreshControl` usage. The gesture works for screen readers but is completely silent.

Apply:

```tsx
onRefresh={() => {
  setRefreshing(true);
  AccessibilityInfo.announceForAccessibility('Refreshing');
  fetchData().then(() => {
    setRefreshing(false);
    AccessibilityInfo.announceForAccessibility('Refresh complete');
  });
}}
```

---

## Rule 8 — Spinners must have descriptive labels

**Severity:** 🟡 Important

Find all `ActivityIndicator` and custom spinner components. Without `accessibilityLabel`, VoiceOver says only "Activity indicator".

Apply `accessibilityLabel` describing what is loading. Announce completion.

---

## Rule 9 — Toggle animations must not delay state announcements

**Severity:** 🟠 Moderate

Find toggle/switch components with async state updates (e.g., network confirmation). VoiceOver announces the state immediately on tap — if the state updates asynchronously, the announcement is wrong.

Fix — update state optimistically, correct on failure:

```tsx
onValueChange={(newValue) => {
  setIsEnabled(newValue); // Optimistic
  updateServer(newValue).catch(() => {
    setIsEnabled(!newValue);
    AccessibilityInfo.announceForAccessibility(
      `Setting reverted to ${!newValue ? 'off' : 'on'}`
    );
  });
}}
```
