---
name: screen-reader-react-native
description: >
  Audit, implement, and fix screen reader accessibility (VoiceOver/TalkBack) for React Native apps by comparing the live accessibility tree against source code. Use whenever work touches accessibilityLabel, accessibilityRole, accessibilityState, accessibilityHint, accessible/importantForAccessibility, custom or icon-only controls, or grouped content (table rows, cards, list items) — even if accessibility is never mentioned explicitly. Also for explicit requests: "check screen reader support," "is this accessible to VoiceOver/TalkBack," "fix missing labels/roles," or auditing an existing screen.
allowed-tools: Bash Read Edit Write Grep Glob mcp__plugin_accessibility_accessibility-tree__get_accessibility_tree_android mcp__plugin_accessibility_accessibility-tree__get_accessibility_tree_ios
---

# Screen Reader Accessibility (React Native)

Use this skill when creating, reviewing, or fixing React Native UI so it is properly exposed to VoiceOver (iOS) and TalkBack (Android): correct roles, accurate state, meaningful labels/hints, sensible grouping, and a sane reading order.

## Core principle

Source code alone does not guarantee what a screen reader actually announces — a wrapping `View`, a platform-only prop, or a swallowed label can silently break accessibility even when the JSX looks correct. Treat the live accessibility tree as ground truth, and the source as what you edit to match it.

## Workflow

1. **Fetch the accessibility tree before analyzing anything.** See "Device setup and tree fetch" — auto-detect available devices/simulators and fetch via the MCP tools. If neither Android nor iOS is reachable, stop and ask the user to connect a device or boot a simulator; do not fall back to source-only analysis.
2. **Walk components in reading order**, top-left to bottom-right, cross-referencing each against the fetched tree and splitting nested interactive elements into separate components. See "Identifying components."
3. **Classify and apply the correct role** for each component. See "Roles" and "Applying a role."
4. **Expose state** — disabled, selected, checked, busy, expanded — via `accessibilityState`. See "State."
5. **Label or hide non-text content, and group related content** that should read as one unit. See "Labels, hints, and grouping."
6. **Verify statically** against the "Final checklist" below.
7. **Re-fetch the tree and diff** against the pre-edit snapshot to confirm each fix actually reached the accessibility layer. See "Dynamic verification."
8. **Hand off what only a human with a screen reader can confirm.** See "Manual verification handoff."

## Device setup and tree fetch

### Prerequisites

Run both checks in parallel to auto-detect available devices:

**Android:**
```bash
adb devices
```

**iOS:**
```bash
echo "=== Simulators ===" && xcrun simctl list devices | grep "(Booted)" | sed 's/^ *//'
echo "=== Devices ===" && xcrun devicectl list devices --hide-headers 2>/dev/null | grep "connected" | grep -v "No devices found"
```

Based on the results:
- If **only Android** has a device → proceed with the Android MCP tool directly (no further setup needed).
- If **only iOS** has a device → proceed with the iOS setup below.
- If **both** have devices → ask the user which platform to use.
- If **neither** → stop and ask the user to connect a device or boot a simulator.

### iOS setup

Check what's available — if multiple results appear, ask the user which one to use. Stop and ask the user to boot a simulator or connect a physical device if nothing appears.

Then follow the setup for the chosen target:

#### If simulator

**Check if WDA is installed**:
```bash
xcrun simctl listapps booted | grep -i "WebDriverAgentRunner"
```
If not installed, check Appium and the XCUITest driver are available:
```bash
appium driver list --installed | grep xcuitest
```
If not, install them:
```bash
npm install -g appium && appium driver install xcuitest
```
Then build WDA (no code signing needed for simulator) and install it:
```bash
xcodebuild \
  -project "$(find ~/.appium -name WebDriverAgent.xcodeproj | head -1)" \
  -scheme WebDriverAgentRunner \
  -destination "id=<UDID>" \
  build-for-testing && \
xcrun simctl install booted "$(find ~/Library/Developer/Xcode/DerivedData -path "*/Debug-iphonesimulator/WebDriverAgentRunner-Runner.app" | grep -v "Index.noindex" | head -1)"
# grep -v "Index.noindex" excludes Xcode's internal indexing folder which contains incomplete binaries (no bundle ID) — we want the real build output
```

**Check if WDA is running**:
```bash
curl -s http://localhost:8100/status
```
If not running, launch it:
```bash
xcrun simctl launch <UDID> com.facebook.WebDriverAgentRunner.xctrunner
```

#### If physical device

**Check if WDA is installed** (use the UDID from the device detection step):
```bash
xcrun devicectl device info apps --device <UDID> 2>&1 | grep -i "WebDriverAgentRunner"
```
If not installed, check Appium and the XCUITest driver are available:
```bash
appium driver list --installed | grep xcuitest
```
If not, install them:
```bash
npm install -g appium && appium driver install xcuitest
```
Then build WDA and install it on the device (a `DEVELOPMENT_TEAM` is required for physical devices — ask the user for their Team ID, visible in Xcode under Signing & Capabilities):
```bash
xcodebuild \
  -project "$(find ~/.appium -name WebDriverAgent.xcodeproj | head -1)" \
  -scheme WebDriverAgentRunner \
  -destination "id=<UDID>" \
  DEVELOPMENT_TEAM=<TEAM_ID> \
  build-for-testing && \
xcrun devicectl device install app --device <UDID> \
  "$(find ~/Library/Developer/Xcode/DerivedData -path "*/Debug-iphoneos/WebDriverAgentRunner-Runner.app" | grep -v "Index.noindex" | head -1)"
# grep -v "Index.noindex" excludes Xcode's internal indexing folder which contains incomplete binaries (no bundle ID) — we want the real build output
```
If Xcode shows a certificate trust error, the user must go to **Settings → General → VPN & Device Management** on the device and trust their developer certificate, then re-run.

**Forward the WDA port** — WDA runs on the device and must be tunnelled to localhost. Ask the user to run this in a separate terminal and leave it running:
```bash
iproxy 8100 8100
```

**Check if WDA is running**:
```bash
curl -s http://localhost:8100/status
```
If not running, launch it:
```bash
xcrun devicectl device process launch --device <UDID> com.facebook.WebDriverAgentRunner.xctrunner
```

### Fetch the tree

- For **Android**: call `get_accessibility_tree_android` (optionally pass a `deviceId`).
- For **iOS**: call `get_accessibility_tree_ios` (optionally pass an `appId`, `wdaPort`, and `deviceId`). WebDriverAgent must already be running and port 8100 must be reachable (for physical devices, `iproxy 8100 8100` must be running).

Keep this first snapshot — it's the baseline for the diff in "Dynamic verification."

## Identifying components

Start at the top left of the screen and identify the first component, cross-referencing it against the matching node in the tree fetched in step 1 — the tree tells you what's actually exposed right now (a label, a role, or nothing at all), which the checklists below then evaluate against what it should expose. If it has multiple interactive elements, split them into separate components — pay special attention to interactive elements nested inside other interactive elements, which need a refactor to remove the nesting while preserving the UX.

A component present in source but missing from the tree entirely (not just unlabeled) usually means a wrapping element is swallowing it — treat that as a finding on its own, not just an unlabeled node.

```jsx
<HStack>
  <Text style={styles.header}>Customers</Text>
  <Pressable>
    <Icon name="plus" />
  </Pressable>
</HStack>
```

This is 2 components: a header and a button.

Overlapping or absolutely-positioned elements (`zIndex`, custom overlays) can render in a different order for a screen reader than they appear visually — walking reading order from source alone can miss this, which is one reason to prefer the live tree (see "Dynamic verification") over static reading order assumptions whenever a device is reachable.

## Roles

Determine the type of component using `accessibilityRole`. Common values, including but not limited to:

| Role | Platform | When to use |
| --- | --- | --- |
| `adjustable` | both | An element that can be "adjusted" (e.g. a slider, bottom sheet handles) |
| `alert` | Android only | An element that contains important text to present to the user |
| `button` | both | The element should be treated as a button |
| `checkbox` | both | Can be checked, unchecked, or mixed — needs `accessibilityState` |
| `combobox` | Android only | Lets the user select among several choices |
| `header` | both | Acts as a header for a content section (e.g. a nav bar title) |
| `image` | both | Should be treated as an image; can combine with `button` or `link` |
| `imagebutton` | both | Should be treated as both a button and an image |
| `keyboardkey` | iOS only | Acts as a keyboard key |
| `link` | both | Should be treated as a link |
| `menu` | Android only | A menu of choices |
| `menubar` | Android only | A container of multiple menus |
| `menuitem` | Android only | An item within a menu |
| `progressbar` | both | Indicates the progress of a task |
| `radio` | both | A radio button — needs `accessibilityState` |
| `radiogroup` | both | A group of radio buttons |
| `scrollbar` | Android only | A scroll bar |
| `search` | iOS only | A text field that should be treated as a search field |
| `spinbutton` | Android only | A button that opens a list of choices |
| `summary` | iOS only | Provides a quick summary of current conditions when the app first launches |
| `switch` | both | Can be turned on and off |
| `tab` | Android only | A tab |
| `tablist` | Android only | A list of tabs |
| `text` | both | Static text that cannot change |
| `timer` | iOS only | Represents a timer |
| `togglebutton` | both | A toggle button — pair with `accessibilityState={{checked}}` |
| `toolbar` | Android only | A container of action buttons or components |

## Applying a role

- Skip for `TextInput`s or tab navigation — these already carry an implicit role.
- Otherwise, add the role directly on the component (e.g. `header` on the `Text`, `button` on the `Pressable`).

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

## State

If the element can be disabled, selected, checked, busy, or expanded, add `accessibilityState`.

**iOS note:** if a component has `accessibilityState={{expanded: false}}`, iOS does not announce a "collapsed" state — adjust the hint accordingly instead of relying on the state alone.

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
  style={{ flexDirection: "row", alignItems: "center", padding: 12 }}
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
      expanded ? "Double tap to collapse details" : "Double tap to expand details"
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

## Labels, hints, and grouping

**Non-text content:**
- Purely decorative → set `importantForAccessibility="no"` and `accessibilityElementsHidden={true}`. `accessible={false}` also works on individual elements, but never use it on an element that wraps other components — it can hide descendants that should still be reachable.
- Not decorative → add `accessibilityLabel` or `accessibilityHint`. Example: for a coupon code with a copy icon, label the code itself and hint "double tap to copy."

**Grouping:**
Use `accessible={true}` on a wrapping `View` to make related elements read as one unit (e.g. a table row):

```jsx
<View accessible={true}>
  <Text>{label}</Text>
  <Text>{value}</Text>
</View>
```

**Hints:**
Add `accessibilityHint` only when the action isn't already obvious from role + label. An interactive element (button, radio, checkbox, switch, …) that already announces what it does from its role and label does not need a hint restating that.

❌ Redundant — role + label already convey "activates save":
```jsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel="Save"
  accessibilityHint="Double tap to save"
/>
```

✅ No hint needed:
```jsx
<Pressable accessibilityRole="button" accessibilityLabel="Save" />
```

✅ Hint adds information the label alone doesn't convey:
```jsx
<Pressable
  accessibilityRole="button"
  accessibilityLabel="PROMO2024"
  accessibilityHint="Double tap to copy code to clipboard"
/>
```

## WCAG references

| WCAG | Level | Why it matters |
| --- | --- | --- |
| 1.1.1 Non-text Content | A | Images, icons, and controls need a text alternative |
| 1.3.1 Info and Relationships | A | Grouping and structure must be programmatically determinable |
| 2.4.6 Headings and Labels | AA | Headers and labels must describe their content/purpose |
| 4.1.2 Name, Role, Value | A | Every component must expose an accurate name, role, and state |

## Final checklist (statically verifiable)

Verify these directly in code before finishing:

- Every interactive element has an `accessibilityRole` appropriate to its platform (skip `TextInput`s and tab navigation).
- Nested interactive elements have been refactored so no interactive element is nested inside another.
- Every element that can be disabled, selected, checked, busy, or expanded exposes that via `accessibilityState`.
- Non-text content is either labeled/hinted or explicitly hidden (`importantForAccessibility="no"` + `accessibilityElementsHidden`), never left unlabeled.
- `accessible={false}` is never applied to a wrapping element that has descendants meant to stay reachable.
- Related content that should read as one unit is grouped with `accessible={true}` on the wrapper.
- Hints exist only where role + label don't already make the action obvious, and don't restate what the role/label already say.

## Dynamic verification (accessibility tree)

Code review only confirms the right props are *written*; it cannot confirm they *reach the accessibility layer* on a real platform. Use the pre-edit snapshot from "Fetch the tree" and the `accessibility-tree` MCP tools to close that gap.

**Workflow:**

1. Match each node in the pre-edit tree to a component in the source, and match each component you plan to check to a node in the tree. If the matching component isn't already open, use `Glob` to enumerate candidate screen/component files (e.g. `**/*.tsx`) and `Grep` for the tree node's visible text, label, or `testID` to locate it. A component with `accessible={false}` or `importantForAccessibility="no"` won't appear at all — confirm that's intentional (decorative) and not a real control silently missing from the tree.
2. Apply the fixes from the checklist above directly in source.
3. Re-fetch the tree and diff it against the pre-edit snapshot.
4. Confirm the expected label, role, state, and grouping actually changed in the new snapshot — a code edit does not guarantee the native accessibility layer picked it up on every platform quirk.

**What the diff can confirm:** a node's `label`/`role`/`state` changed as expected; a decorative element is absent from the tree while a real control is present; grouped children now appear as a single node instead of separate ones.

**What it cannot confirm** (see "Manual verification handoff"): whether a hint or label sounds natural when spoken, VoiceOver/TalkBack swipe/reading order across overlapping or `zIndex`-ed elements, and actual screen reader navigation feel.

If a snapshot doesn't match what was expected, treat it as a finding: fix the implementation, don't rationalize the diff.

## Manual verification handoff

Some things can only be confirmed by a human with a screen reader and device settings. End the work with a short device checklist tailored to what changed:

- With VoiceOver (iOS) and TalkBack (Android), swipe through the screen and confirm the reading order matches the visual/logical order — especially around overlapping or `zIndex`-ed elements, which the tree diff won't reliably catch.
- Listen to labels and hints together and confirm they don't sound redundant or awkward when spoken back to back.
- Confirm grouped content (table rows, cards) reads as one coherent announcement, not fragmented pieces.
- Confirm state-dependent hints (e.g. expand/collapse) update correctly after the interaction that changes the state.
