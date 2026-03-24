---
name: screen-reader-flutter
description: A skill that helps Flutter developers check the screen reader accessibility of their apps by analyzing the accessibility tree and providing feedback on potential issues.
---

# Get the accessibility tree

Get the accessibility tree from the user's connected device using the MCP tools:

- For **Android**: call `get_accessibility_tree_android` (optionally pass a `deviceId`).
- For **iOS**: call `get_accessibility_tree_ios` (optionally pass an `appId` and `wdaPort`). WebDriverAgent must already be running on the simulator.

# Then, analyze the code referencing the accessibility tree

## 1. Identify the first component

Start at the top left of the screen, and identify the first component. If it has multiple interactive elements, split them into separate components.

Example:

```dart
Row(
  children: [
    Text('Customers', style: theme.textTheme.headlineSmall),
    IconButton(
      icon: Icon(Icons.add),
      onPressed: onAdd,
    ),
  ],
)
```

This is likely 2 components: a header and a button. Take special attention to interactive elements inside other interactive elements — this will require a refactor to remove the nesting first while keeping the UX.

## 2. Determine the type of component

Flutter exposes semantic roles through `SemanticsProperties` and the `Semantics` widget. Common roles:

- **button**: An element that triggers an action (use `button: true`).
- **link**: A tappable element that navigates to a URL (use `link: true`).
- **header**: A section heading (use `header: true`).
- **image**: A purely visual element (use `image: true`; combine with a label for non-decorative images).
- **textField**: An editable text input (use `textField: true`).
- **checkbox**: A toggleable element with checked state (use `checked`).
- **radio**: A radio button within a group (use `inMutuallyExclusiveGroup: true` + `checked`).
- **toggleButton** / **switch**: An on/off toggle (use `toggled`).
- **slider** / **adjustable**: A draggable value control (use `slider: true`).
- **progressBar**: Indicates task progress (use `liveRegion: true` if value changes dynamically).
- **tab**: A tab within a tab bar (use `selected` to indicate active tab).

Most Flutter Material/Cupertino widgets already expose correct semantics automatically. Use `Semantics` to override or extend when needed.

## 3. Does it need a role?

- Built-in widgets like `ElevatedButton`, `TextButton`, `Switch`, `Checkbox`, `Slider`, `TextField` expose correct semantics automatically — skip these.
- For custom widgets or icon-only controls, wrap with `Semantics` and set the appropriate flag.

Example:

```dart
Row(
  children: [
    Semantics(
      header: true,
      child: Text('Customers', style: theme.textTheme.headlineSmall),
    ),
    Semantics(
      button: true,
      label: 'Add customer',
      child: GestureDetector(
        onTap: onAdd,
        child: Icon(Icons.add),
      ),
    ),
  ],
)
```

Prefer `IconButton` over a raw `GestureDetector` + `Icon` — it already sets button semantics and accepts a `tooltip` as the accessible label.

## 4. Does it have state?

- If the element can be disabled, selected, checked, busy, or expanded, set the corresponding `Semantics` properties.
- For `expanded`/`collapsed`: Flutter does not announce "collapsed" by default when `expanded: false`; add a `hint` that reflects the current state.

Examples:

```dart
// Disabled button
Semantics(
  enabled: false,
  child: ElevatedButton(onPressed: null, child: Text('Submit')),
)
```

```dart
// Selected tab
Semantics(
  selected: isSelected,
  child: GestureDetector(onTap: onTap, child: Text('Home')),
)
```

```dart
// Busy / loading
Semantics(
  label: 'Loading profile data',
  liveRegion: true,
  child: CircularProgressIndicator(),
)
```

```dart
// Checkbox
Semantics(
  checked: isChecked,
  child: GestureDetector(
    onTap: () => setState(() => isChecked = !isChecked),
    child: Row(
      children: [
        Icon(isChecked ? Icons.check_box : Icons.check_box_outline_blank),
        Text('Email Notifications'),
      ],
    ),
  ),
)
```

```dart
// Expandable section
Semantics(
  button: true,
  expanded: isExpanded,
  hint: isExpanded ? 'Double tap to collapse details' : 'Double tap to expand details',
  child: GestureDetector(
    onTap: () => setState(() => isExpanded = !isExpanded),
    child: Row(
      children: [
        Icon(isExpanded ? Icons.expand_less : Icons.expand_more),
        Text(isExpanded ? 'Hide details' : 'Show details'),
      ],
    ),
  ),
)
```

## 5. Does it contain non-text items?

- If purely decorative → use `ExcludeSemantics` to hide it, or set `Semantics(excludeSemantics: true)`.
- If not decorative → add a `label` in `Semantics`.
- Example: For a coupon code with a copy icon → label the row, and use a hint like "double tap to copy".

```dart
// Decorative image
ExcludeSemantics(
  child: Image.asset('assets/banner.png'),
)

// Meaningful icon
Semantics(
  label: 'Promo code PROMO2024',
  hint: 'Double tap to copy code to clipboard',
  button: true,
  child: GestureDetector(
    onTap: copyToClipboard,
    child: Row(
      children: [
        Text('PROMO2024'),
        Icon(Icons.copy),
      ],
    ),
  ),
)
```

## 6. Does it need to be grouped?

- Use `MergeSemantics` to group child elements into a single accessibility node (e.g., for list rows with a label and a value).

```dart
MergeSemantics(
  child: Row(
    children: [
      Text(label),
      Text(value),
    ],
  ),
)
```

- Use `Semantics(container: true)` when you need a grouping node without merging child semantics.

## 7. Is it obvious what the element does?

- If not, and the element is interactive (button, checkbox, switch…), add a `hint`.
- Hints should describe the action, not repeat the label.

```dart
// ❌ Over-hinted (BAD)
Semantics(
  button: true,
  label: 'Save',
  hint: 'Double tap to save', // Redundant!
  child: ElevatedButton(onPressed: onSave, child: Text('Save')),
)

// ✅ No hint needed (GOOD)
Semantics(
  button: true,
  label: 'Save',
  child: ElevatedButton(onPressed: onSave, child: Text('Save')),
)

// ✅ Hint adds value (GOOD)
Semantics(
  button: true,
  label: 'PROMO2024',
  hint: 'Double tap to copy code to clipboard',
  child: GestureDetector(onTap: copyToClipboard, child: Text('PROMO2024')),
)
```

Still To Add details around

- Test with TalkBack (Android) and VoiceOver (iOS).
- Consider focus order using `FocusTraversalGroup` and `FocusTraversalOrder`.
