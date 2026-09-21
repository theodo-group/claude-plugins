---
name: screen-reader-flutter
description: A skill that helps Flutter developers check the screen reader accessibility of their apps by analyzing the accessibility tree and providing feedback on potential issues.
allowed-tools: Bash Read AskUserQuestion mcp__plugin_accessibility_accessibility-tree__get_accessibility_tree_android mcp__plugin_accessibility_accessibility-tree__get_accessibility_tree_ios mcp__argent__list-devices mcp__argent__boot-device mcp__argent__launch-app mcp__argent__describe mcp__argent__native-describe-screen mcp__argent__await-screen-idle mcp__argent__gesture-tap mcp__argent__screenshot mcp__argent__stop-all-simulator-servers
disable-model-invocation: true
---

# Get the accessibility tree

The audit needs a live UI tree from a running app. There are two backends that can produce one. **Android needs no decision; iOS does.**

## Step 1 — Detect devices and backends

Run these checks in parallel:

**Android:**
```bash
adb devices
```

**iOS:**
```bash
echo "=== Simulators ===" && xcrun simctl list devices | grep "(Booted)" | sed 's/^ *//'
echo "=== Devices ===" && xcrun devicectl list devices --hide-headers 2>/dev/null | grep "connected" | grep -v "No devices found"
```

**Argent (optional iOS backend):**
```bash
argent --version 2>/dev/null || echo "argent not installed"
```
Argent is also present if `mcp__argent__describe` appears in your tool list.

Based on the results:
- If **only Android** has a device → go to "Android" below. No backend choice applies.
- If **only iOS** has a device → go to "iOS — choose a backend".
- If **both** have devices → ask the user which platform to use.
- If **neither** → stop and ask the user to connect a device or boot a simulator.

If multiple iOS simulators or devices appear, ask the user which one to target.

## Android

Call `get_accessibility_tree_android` (optionally pass a `deviceId`). It needs nothing but `adb`.

It returns the **raw, uncompressed** `uiautomator` XML: every node with `content-desc`, `text`, `class`, `clickable`, `focusable`, `enabled`, `checked` and `bounds`.

> Argent's `describe` reads Android through the same `uiautomator dump`, but with `--compressed` and with `content-desc` folded into a single `label` field alongside the visible `text` — which erases the difference between "properly described" and "the screen reader happens to read the visible text". Use the plugin tool on Android even when Argent is installed. Argent is still worth using here to *navigate* between screens (`gesture-tap`, `launch-app`) between captures.

## iOS — choose a backend

Both backends work. They trade setup cost against tree fidelity, and the right answer depends on what the user wants out of the audit. **Present both with `AskUserQuestion` and let the user decide — do not pick for them.**

| | **A — WebDriverAgent** (this plugin) | **B — Argent** |
|---|---|---|
| Setup | Appium + XCUITest driver + `xcodebuild` build of WDA; `iproxy` for physical devices | `npx @swmansion/argent@latest init` |
| First run | ~10 min, repeated after Xcode upgrades | ~2 min |
| Processes to keep alive | WDA, plus an `iproxy` terminal on device | none |
| Traits | full `traits` string preserved | collapsed to one role; `selected` / `notEnabled` and second traits dropped |
| Hierarchy | nested, parent/child preserved | flat — every element hangs off the root |
| Drives the UI | no, the user navigates by hand | yes (`gesture-tap`, `launch-app`, `boot-device`) |
| Extra context cost | 2 tools | ~80 tools |

What this means for the audit below:

- Steps **4 (state)** and **6 (grouping)** need trait detail and nesting. Only **backend A** can answer them from the tree; under backend B they must be read from the code or left unreported.
- Steps **2, 3, 5 and 7** (roles, labels, missing descriptions, hints) are answerable under **either** backend.
- Auditing several screens in one pass is only automatable under **backend B**.

**Flutter-specific caveat — say this when presenting the choice.** Flutter draws into a single canvas and only builds its semantics tree when an accessibility service is active. Backend A (XCUITest) is known to trigger it; whether Argent's AX service does is **unverified**. Backend B is therefore an experiment on Flutter/iOS, not a recommendation — `references/setup-argent.md` has a 30-second check to settle it before the audit starts.

If the user has no preference: recommend **A**. Offer **B** only if the WebDriverAgent build is a blocker for them, and require the semantics check to pass first.

Then read the matching guide and follow it:
- Backend A → `references/setup-webdriveragent.md`
- Backend B → `references/setup-argent.md`

## Fetch the tree

- **Backend A** → `get_accessibility_tree_ios` (optionally `appId`, `wdaPort`, `deviceId`). WDA must already be running and port 8100 reachable; on a physical device `iproxy 8100 8100` must be running.
- **Backend B** → `mcp__argent__describe` with the `udid`, plus `mcp__argent__native-describe-screen` with an explicit `bundleId` on a simulator.

State which backend produced the tree in your findings, and do not claim a step 4 or step 6 result that backend B's tree cannot support.

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

Flutter exposes semantic roles through the props of the `Semantics` widget, especially the prop `role`. Some native roles can also be set with other props of the Semantics widget: for example, the "button" role is set by "button: true". SemanticsRole enum values are:

* **tab**: A tab button. See also: [tabBar], which is the role for containers of tab buttons.
* **tabBar**: Contains tab buttons. See also: [tab], which is the role for tab buttons.
* **tabPanel**: The main display for a tab.
* **dialog**: A pop-up dialog.
* **alertDialog**: An alert dialog.
* **table**: A table structure containing data arranged in rows and columns. See also: [cell], [row], [columnHeader] for table-related roles.
* **cell**: A cell in a [table] that does not contain column or row header information. See also: [table], [row], [columnHeader] for table-related roles.
* **row**: A row of [cell]s or [columnHeader]s in a [table]. See also: [table], [cell], [columnHeader] for table-related roles.
* **columnHeader**: A cell in a [table] that contains header information for a column. See also: [table], [cell], [row] for table-related roles.
* **dragHandle**: A control used for dragging across content. For example, the drag handle of [ReorderableList].
* **spinButton**: A control to cycle through content on tap. For example, the next and previous month button of a [CalendarDatePicker].
* **comboBox**: An input field with a dropdown list box attached. For example, a [DropdownMenu].
* **menuBar**: A presentation of [menu] that usually remains visible and is usually presented horizontally. For example, a [MenuBar].
* **menu**: A permanently visible list of controls or a widget that can be made to open and close. For example, a [MenuAnchor] or [DropdownButton].
* **menuItem**: An item in a dropdown created by [menu] or [menuBar]. See also: [menuItemCheckbox], [menuItemRadio].
* **menuItemCheckbox**: An item with a checkbox in a dropdown created by [menu] or [menuBar]. See also: [menuItem], [menuItemRadio].
* **menuItemRadio**: An item with a radio button in a dropdown created by [menu] or [menuBar]. See also: [menuItem], [menuItemCheckbox].
* **list**: A container to display multiple [listItem]s in vertical or horizontal layout. For example, a [ListView] or [Column].
* **listItem**: An item in a [list].
* **form**: An area that represents a form.
* **tooltip**: A pop-up displayed when hovering over a component to provide contextual explanation.
* **loadingSpinner**: A graphic object that spins to indicate the application is busy. For example, a [CircularProgressIndicator].
* **progressBar**: A graphic object that shows progress with a numeric value. For example, a [LinearProgressIndicator].
* **hotKey**: A keyboard shortcut field that allows the user to enter a combination or sequence of keystrokes. For example, [Shortcuts].
* **radioGroup**: A group of radio buttons.
* **status**: A component to provide advisory information that is not important enough to justify an [alert]. For example, a loading message for a web page.
* **alert**: A component to provide important and usually time-sensitive information that requires the user’s immediate attention (e.g., invalid form input, session expiration, lost connection).
* **complementary**: A supporting section that relates to the main content (e.g., sidebars or call-out boxes).
* **contentInfo**: A footer section containing identifying information such as copyright, navigation links, and privacy statements.
* **main**: The primary content of a document, directly related to the central topic or main function.
* **navigation**: A region of a web page that contains navigation links.
* **region**: A section of content that is important but cannot be described by other landmark roles like main, contentInfo, complementary, or navigation.

Most Flutter Material/Cupertino widgets already expose correct semantics automatically. Use `Semantics` to override or extend when needed.

## 3. Does it need a role?

- Built-in widgets like `ElevatedButton`, `TextButton`, `Switch`, `Checkbox`, `Slider`, `TextField` expose correct semantics automatically — skip these.
- For custom widgets or icon-only controls, wrap with `Semantics` and set the appropriate flag if you don't see the right role in the semantics tree

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
This is also applicable for `GestureDetector` + `Text`, where a custom Button widget from the theme package is preferable. Gloabally, a `GestureDetector` should only be use in specific edge cases, when there is no other viable option.

## 4. Does it have state?

- If the element can be disabled, selected, checked, or expanded, set the corresponding `Semantics` properties.

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
```

- Consider focus order using `FocusTraversalGroup` and `FocusTraversalOrder`.
- Only add a `Semantics`, `MergeSemantics`, `ExcludeSemantics`, `FocusTraversalGroup`, or any Semantics related widget when it's necessary and you couldn't make the right behavior without it. Always prefer fixs that replace low level widgets by more clever widgets without changing the behavior (ex: don't add a `Semantics` over `GestureDetector`+`Icon` when you can replace them with a `IconButton`)
