---
name: screen-reader
description: Analyze and fix screen reader accessibility in React Native apps. Gets the accessibility tree from a connected device, walks through each component to check roles, states, labels, grouping, hints, focus order, and dynamic content. Use when auditing screen reader support or fixing VoiceOver/TalkBack issues.
---

# Get the accessibility tree

Get the accessibility tree from the user's connected device using the MCP tools:

- For **Android**: call `get_accessibility_tree_android` (optionally pass a `deviceId`).
- For **iOS**: call `get_accessibility_tree_ios` (optionally pass an `appId` and `wdaPort`). WebDriverAgent must already be running on the simulator.

# Then, analyze the code referencing the accessibility tree

Walk through the screen top-to-bottom. For each element in the accessibility tree, find the corresponding component in the code and run through steps 1–9.

> **This skill is part of an accessibility suite:**
>
> - **`screen-reader`** — ← you are here
> - `colors` — contrast, color-vision deficiencies, sensory sensitivity
> - `reduced-motion` — Reanimated animation swapping, ReducedMotionConfig, navigation transitions
> - `screen-reader-animations` — accessibilityActions for gestures, escape for overlays, toast patterns, focus after animations

---

## 1. Identify the component

Start at the top left of the screen and identify the first component. If it has multiple interactive elements, split them into separate components.

Example:

```jsx
<HStack>
  <Text style={styles.header}>Customers</Text>
  <Pressable>
    <Icon name="plus" />
  </Pressable>
</HStack>
```

This is 2 components: a header and a button. Take special attention to interactive elements inside other interactive elements. This requires a refactor to remove the nesting first while keeping the UX.

---

## 2. Determine the type of component

Included but not limited to:

- **adjustable**: Used when an element can be "adjusted" (e.g. a slider, handles for bottom sheets).
- **alert** (Android only): Used when an element contains important text to be presented to the user.
- **button**: Used when the element should be treated as a button.
- **checkbox**: Used when an element represents a checkbox that can be checked, unchecked, or have a mixed checked state.
- **combobox** (Android only): Used when an element represents a combo box, which allows the user to select among several choices.
- **header**: Used when an element acts as a header for a content section (e.g. the title of a navigation bar).
- **image**: Used when the element should be treated as an image. Can be combined with a button or link.
- **imagebutton**: Used when the element should be treated as a button and is also an image.
- **keyboardkey** (iOS only): Used when the element acts as a keyboard key.
- **link**: Used when the element should be treated as a link.
- **menu** (Android only): Used when the component is a menu of choices.
- **menubar** (Android only): Used when a component is a container of multiple menus.
- **menuitem** (Android only): Used to represent an item within a menu.
- **progressbar**: Used to represent a component that indicates the progress of a task.
- **radio**: Used to represent a radio button. This needs accessibilityState.
- **radiogroup**: Used to represent a group of radio buttons.
- **scrollbar** (Android only): Used to represent a scroll bar.
- **search** (iOS only): Used when a text field element should also be treated as a search field.
- **spinbutton** (Android only): Used to represent a button that opens a list of choices.
- **summary**: Used when an element can be used to provide a quick summary of current conditions in the app when the app first launches.
- **switch**: Used to represent a switch that can be turned on and off.
- **tab** (Android only): Used to represent a tab.
- **tablist** (Android only): Used to represent a list of tabs.
- **text**: Used when the element should be treated as static text that cannot change.
- **timer** (iOS): Used to represent a timer.
- **togglebutton**: Used to represent a toggle button. Should be used with accessibilityState checked to indicate if the button is toggled on or off.
- **toolbar** (Android only): Used to represent a toolbar (a container of action buttons or components).

---

## 3. Does it need a role?

- Skip for TextInputs or Tab Navigation.
- Otherwise, add the appropriate role directly on the component (e.g., header role on the Text component, button role on Pressable).

Example:

```jsx
<HStack>
  <Text style={styles.header} accessibilityRole="header">
    Customers
  </Text>
  <Pressable accessibilityRole="button">
    <Icon name="plus" />
  </Pressable>
</HStack>
```

---

## 4. Does it have state?

If the element can be disabled, selected, checked, busy, or expanded, add `accessibilityState`.

Note: on iOS if a component has `accessibilityState={{ expanded: false }}`, the device does not provide the state "collapsed", and the hint should be adjusted accordingly.

Examples:

```jsx
<TouchableOpacity
  accessibilityState={{ disabled: isDisabled }}
  disabled={isDisabled}
  style={{ backgroundColor: "#ccc", padding: 12, borderRadius: 8 }}
>
  <Text>Submit</Text>
</TouchableOpacity>
```

```jsx
<TouchableOpacity accessibilityState={{ selected }} style={{ padding: 12 }}>
  <Text>Home</Text>
</TouchableOpacity>
```

```jsx
<View
  accessibilityLabel="Loading profile data"
  accessibilityState={{ busy }}
  style={{ padding: 12 }}
>
  <ActivityIndicator size="large" />
</View>
```

```jsx
<TouchableOpacity
  accessibilityRole="checkbox"
  accessibilityState={{ checked }}
  onPress={() => setChecked(!checked)}
  style={{
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  }}
>
  <Icon
    name={checked ? "checkbox-checked" : "checkbox"}
    size={24}
    color={checked ? "#333" : "#999"}
    style={{ marginRight: 8 }}
  />
  <Text>Email Notifications</Text>
</TouchableOpacity>
```

```jsx
<View style={{ padding: 12 }}>
  <Pressable
    onPress={() => setExpanded(!expanded)}
    accessibilityRole="button"
    accessibilityState={{ expanded }}
    accessibilityHint={
      expanded
        ? "Double tap to collapse details"
        : "Double tap to expand details"
    }
    hitSlop={8}
    style={{ flexDirection: "row", alignItems: "center" }}
  >
    <Icon
      name={expanded ? "chevron-up" : "chevron-down"}
      size={22}
      style={{ marginRight: 6 }}
    />
    <Text style={{ fontWeight: "600" }}>
      {expanded ? "Hide details" : "Show details"}
    </Text>
  </Pressable>

  <View
    accessible
    importantForAccessibility={expanded ? "yes" : "no-hide-descendants"}
    style={{ marginTop: expanded ? 8 : 0 }}
  >
    {expanded && (
      <Text style={{ lineHeight: 20 }}>
        This section contains additional info about your order.
      </Text>
    )}
  </View>
</View>
```

---

## 5. Does it contain non-text items?

- If purely decorative → set `importantForAccessibility="no"` and `accessibilityElementsHidden={true}`. You can also set `accessible={false}` on individual elements, but **never use it on elements that wrap other components** — it hides all children from the accessibility tree.
- If not decorative → add `accessibilityLabel` or `accessibilityHint`.
- Example: For a coupon code with a copy icon → label the code, and use a hint like "double tap to copy"

---

## 6. Does it need to be grouped?

Use `accessible={true}` on the wrapping View to group elements (e.g., for table rows, card components, list items with multiple text elements).

```jsx
<View accessible={true}>
  <Text>{label}</Text>
  <Text>{value}</Text>
</View>
```

**Grouping rules:**

- Group elements that should be read as a single unit (e.g., a product card with name + price + rating)
- Do **not** group elements that contain interactive children — the interactive elements become unreachable
- If a grouped view needs to be interactive, put the interaction on the group itself, not on children inside it

---

## 7. Is it obvious what the element does?

If not, and the element is an interactive element (button, radio, checkbox, switch...) add `accessibilityHint`.

❌ Over-hinted (BAD):

```jsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Save"
  accessibilityHint="Double tap to save" // Redundant!
/>
```

✅ No hint needed (GOOD):

```jsx
<Pressable accessibilityRole="button" accessibilityLabel="Save" />
```

✅ Hint adds information (GOOD):

```jsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel="PROMO2024"
  accessibilityHint="Double tap to copy code to clipboard"
/>
```

**Hint rules:**

- Never repeat the role ("double tap to activate" is redundant — VoiceOver already says that for buttons)
- Never repeat the label
- Only add a hint when the action is non-obvious from the label + role
- Keep hints short and action-oriented

---

## 8. Check focus order against the accessibility tree

Compare the accessibility tree output from the MCP tool against the visual layout. Flag any mismatches.

### How screen readers determine reading order

Both VoiceOver and TalkBack follow the **view tree order** (derived from JSX render order), not the visual layout. There is no cross-platform equivalent to `tabIndex`.

**The rule: render order must match intended reading order.**

### Patterns that cause focus order problems

**8.1 — `zIndex` does not change accessibility order**

`zIndex` only changes visual stacking. If an overlay is defined early in the JSX but visually appears on top, the screen reader reads it first — before the content it overlays.

Flag this pattern:

```jsx
// ❌ Header is read first even though it visually overlays content
<View>
  <OverlayHeader style={{ position: "absolute", zIndex: 10 }} />
  <ScrollView>{/* content */}</ScrollView>
</View>
```

Fix — place overlays last in the JSX tree:

```jsx
// ✅ Content is read first, then the overlay
<View>
  <ScrollView>{/* content */}</ScrollView>
  <OverlayHeader style={{ position: "absolute", zIndex: 10 }} />
</View>
```

**8.2 — `flexDirection: 'row-reverse'` and `'column-reverse'` break reading order**

These reverse the visual layout but the accessibility tree still follows the original render order. Screen reader users hear items in the opposite order from what is displayed.

Flag any use of `row-reverse` or `column-reverse` on containers with accessible children. Fix by reordering the JSX to match the intended reading order and using standard flex direction.

**8.3 — Overlays must hide background content from screen readers**

When a modal, sheet, or overlay is open, screen reader users can swipe past it into invisible background content unless it is explicitly hidden.

Fix — hide background and trap focus:

```jsx
<View style={{ flex: 1 }}>
  {/* Background content — hidden when overlay is open */}
  <View
    accessibilityElementsHidden={isOverlayOpen}
    importantForAccessibility={isOverlayOpen ? "no-hide-descendants" : "auto"}
  >
    {/* main content */}
  </View>

  {/* Overlay — last in tree, traps focus */}
  {isOverlayOpen && (
    <View accessibilityViewIsModal={true} importantForAccessibility="yes">
      {/* overlay content */}
    </View>
  )}
</View>
```

Platform prop mapping:

| Behavior                                | iOS                                  | Android                                           |
| --------------------------------------- | ------------------------------------ | ------------------------------------------------- |
| Hide subtree from screen reader         | `accessibilityElementsHidden={true}` | `importantForAccessibility="no-hide-descendants"` |
| Trap focus inside this view             | `accessibilityViewIsModal={true}`    | No equivalent — hide siblings instead             |
| Ignore this view only (children remain) | N/A                                  | `importantForAccessibility="no"`                  |

**8.4 — `experimental_accessibilityOrder`**

React Native has an experimental API for custom focus order using `nativeID`s. It is behind a feature flag and unstable — do not rely on it. If the code uses it, verify it works on both platforms. The third-party `react-native-a11y-order` package exists but is not part of core React Native.

The safest approach remains: **align JSX render order with intended reading order.**

---

## 9. Check dynamic content

Content that changes at runtime must be announced to screen readers. Without explicit handling, screen readers have no way to know that new content appeared, content changed, or content was removed.

### 9.1 — Elements that appear or disappear

When an element appears on screen (conditional rendering, API response, expanding section), check:

- Does the screen reader know it appeared? Use `accessibilityLiveRegion` or `AccessibilityInfo.announceForAccessibility()`.
- Does focus need to move to it? Use `AccessibilityInfo.setAccessibilityFocus()`.

When an element is removed from screen, check:

- Was it the focused element? If so, focus must be explicitly moved to the next logical element.
- Does the screen reader know it was removed? Announce the result if the removal was an action (e.g., "Item deleted").

### 9.2 — Loading states

Shimmer, skeleton screens, and spinners are invisible to screen readers without explicit labeling.

For any loading pattern, verify:

- Loading start is announced: `AccessibilityInfo.announceForAccessibility('Loading')`
- Loading end is announced: `AccessibilityInfo.announceForAccessibility('Content loaded')`
- Spinners have `accessibilityLabel` describing what is loading
- Skeleton/shimmer views have `accessibilityLabel="Loading content"` and `accessible={true}`

### 9.3 — Error messages and validation

Error messages that appear dynamically (form validation, network errors) must be announced.

Check that error views have:

- `accessibilityLiveRegion="assertive"` (Android) — interrupts current speech to announce
- `accessibilityRole="alert"` — semantically marks as an alert
- Or use `AccessibilityInfo.announceForAccessibility()` when the error appears

```jsx
{
  error && (
    <Text
      accessibilityRole="alert"
      accessibilityLiveRegion="assertive"
      accessible
    >
      {error}
    </Text>
  );
}
```

### 9.4 — `accessibilityLiveRegion` values

| Value         | Behavior                                | When to use                                |
| ------------- | --------------------------------------- | ------------------------------------------ |
| `"none"`      | No announcement (default)               | Static content                             |
| `"polite"`    | Announces after current speech finishes | Non-urgent updates (counters, status text) |
| `"assertive"` | Interrupts current speech immediately   | Errors, alerts, critical state changes     |

Note: `accessibilityLiveRegion` is primarily an Android prop. On iOS, use `AccessibilityInfo.announceForAccessibility()` for equivalent behavior.

---

## 10. Check focus management

When elements appear, disappear, or the screen changes, verify that focus is explicitly managed.

### 10.1 — When to set focus

Set focus explicitly in these situations:

- A modal or overlay opens → focus the first meaningful element inside it
- A modal or overlay closes → focus the element that triggered it, or the next logical element
- An item is deleted from a list → focus the next item in the list
- A new screen appears after navigation → focus the screen header or primary content
- An error appears → focus the error message
- A form section expands → focus the first field in the expanded section

### 10.2 — How to set focus

```jsx
import { AccessibilityInfo, findNodeHandle } from "react-native";

// Using a ref
const targetRef = useRef(null);

const setFocus = () => {
  const node = findNodeHandle(targetRef.current);
  if (node) {
    AccessibilityInfo.setAccessibilityFocus(node);
  }
};
```

### 10.3 — Timing

Do not set focus during animations or transitions. Wait for the interaction to complete:

```jsx
import { InteractionManager } from "react-native";

InteractionManager.runAfterInteractions(() => {
  const node = findNodeHandle(ref.current);
  if (node) {
    setTimeout(() => {
      AccessibilityInfo.setAccessibilityFocus(node);
    }, 100);
  }
});
```

The small `setTimeout` ensures the view hierarchy has settled after the interaction completes.

---

## 11. Common anti-patterns to flag

### 11.1 — `accessible={false}` on a wrapper

```jsx
// ❌ Hides ALL children from screen reader
<View accessible={false}>
  <Text>Important info</Text>
  <Pressable>
    <Text>Action button</Text>
  </Pressable>
</View>
```

Never use `accessible={false}` on a wrapper that contains meaningful children. Use it only on individual decorative elements.

### 11.2 — Interactive elements inside interactive elements

```jsx
// ❌ Nested interactives — inner button is unreachable by screen reader
<Pressable onPress={navigateToDetail}>
  <Text>Product name</Text>
  <Pressable onPress={addToCart}>
    <Text>Add to cart</Text>
  </Pressable>
</Pressable>
```

Refactor to remove nesting. Either:

- Make the outer element non-interactive and give each child its own interaction
- Or separate them into distinct accessible elements

### 11.3 — Missing labels on icon-only buttons

```jsx
// ❌ VoiceOver says "button" — useless
<Pressable accessibilityRole="button" onPress={onClose}>
  <Icon name="x" />
</Pressable>
```

Fix:

```jsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Close"
  onPress={onClose}
>
  <Icon name="x" />
</Pressable>
```

### 11.4 — Decorative images not hidden

```jsx
// ❌ VoiceOver reads the image as "image" with no useful info
<Image source={decorativeBanner} />
```

Fix:

```jsx
<Image
  source={decorativeBanner}
  accessible={false}
  accessibilityElementsHidden={true}
  importantForAccessibility="no"
/>
```

### 11.5 — Grouping that swallows interactive children

```jsx
// ❌ The button inside becomes unreachable
<View accessible={true} accessibilityLabel="Order summary">
  <Text>Total: $42.00</Text>
  <Pressable onPress={viewDetails}>
    <Text>View details</Text>
  </Pressable>
</View>
```

If a container is grouped with `accessible={true}`, all children become a single accessible element. Interactive children are no longer individually focusable. Either remove the grouping or move the interaction to the group level.

### 11.6 — `accessibilityLabel` that duplicates visible text

```jsx
// ❌ Screen reader says "Save Save button" (label + visible text + role)
<Pressable accessibilityRole="button" accessibilityLabel="Save">
  <Text>Save</Text>
</Pressable>
```

If the visible text is sufficient, do not add a redundant `accessibilityLabel`. The label is for when the visible content is insufficient (icon-only, abbreviated, or context-dependent).

---

## After analysis, verify with the accessibility tree

After applying fixes, call the MCP tool again to get the updated accessibility tree. Walk through it to verify:

1. Every interactive element is reachable
2. Elements are read in the correct order (matching visual layout)
3. Roles are correct for each component type
4. States are present and accurate
5. Labels are meaningful and not redundant
6. No interactive elements are hidden or swallowed by grouping
7. No background content is reachable when an overlay is open
