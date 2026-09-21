# Backend B — Argent

[Argent](https://docs.swmansion.com/argent/) (Apache-2.0, `@swmansion/argent`) is an MCP server that drives iOS simulators, Android emulators, physical devices and TVs. On iOS it reads the accessibility tree through its own in-process AX service, so **WebDriverAgent, Appium, `xcodebuild` and `iproxy` are not needed at all**.

Cost: a global npm install and ~80 extra tools in context, plus a lower-fidelity tree (see "Limits" below).

---

## Install

Prerequisites: Node.js 20.12+, Xcode for iOS/tvOS, `adb` on `PATH` for Android.

From the project root:
```bash
npx @swmansion/argent@latest init
```

This installs `@swmansion/argent` globally, detects the editor, registers the MCP server under the key `argent`, and copies its own skills and rules into the workspace. Claude Code must reload before the tools appear.

**Verify:**
```bash
argent --version
argent tools    # full tool list
```
The tools surface as `mcp__argent__<tool-id>` — e.g. `mcp__argent__describe`.

---

## Boot the device through Argent

This matters and is easy to get wrong. Argent applies accessibility settings to a simulator **at boot time**. A simulator that was booted by hand or by Xcode is in a *degraded* state:

- system dialogs and native modals do not appear in the tree, and
- in the worst case `describe` returns an **empty tree** on a screen that is clearly not blank.

Argent reports this in the `hint` field of the response. If you see it, or if the tree comes back empty:

```
boot-device with force=true   # reboots the simulator with the full accessibility settings
```

Sequence:
1. `mcp__argent__list-devices` — get the `udid`.
2. `mcp__argent__boot-device` — boot it (use `force: true` if it is already up but was not booted by Argent).
3. `mcp__argent__launch-app` — bring the app under audit to the foreground by bundle ID / package name.

---

## Fetch the tree

**`mcp__argent__describe`** with the `udid`. On iOS this reads the AX runtime; on Android it runs `uiautomator dump`.

On an iOS **simulator**, also call **`mcp__argent__native-describe-screen`** with an explicit `bundleId`. It returns the UIKit view tree with `accessibilityIdentifier` and `viewClassName`, which recovers some of the detail `describe` flattens away. Cross-read the two before judging an element.

To audit more than one screen, navigate with `mcp__argent__gesture-tap` (frame coordinates are normalised 0–1; tap the centre: `x + width/2`, `y + height/2`), then `mcp__argent__await-screen-idle`, then `describe` again.

---

## Limits that affect this audit

These are properties of Argent's tree, not bugs — it post-processes for tap targeting, not for accessibility auditing. Do not report a finding that the tree cannot actually support.

- **iOS traits collapse to a single role.** The mapping is first-match-wins over `header → button → searchField → link → image → staticText → tabBar → adjustable → group`. An image-button reports only `button`; `selected`, `notEnabled` and any second trait are dropped. **Audit step 4 (state) cannot be answered from `describe` alone** — read it from the code, or use the WebDriverAgent backend.
- **The iOS tree is flat.** Every element is a direct child of one synthetic root, so parent/child grouping is not visible. **Audit step 6 (grouping) cannot be answered from `describe`** — use `native-describe-screen`, read the code, or use the WebDriverAgent backend.
- **Android merges label sources.** A node's `label` is `content-desc` if present, otherwise the visible `text`. You cannot tell a properly described element from one the screen reader merely reads text off. Android also uses `uiautomator dump --compressed`, which prunes nodes. **On Android, prefer this plugin's `get_accessibility_tree_android`** — same mechanism, uncompressed, every attribute intact — and use Argent only to navigate.
- **No z-order or occlusion data.** An element listed at a point may be covered by an overlay; check a `screenshot` if something looks wrong.
- **Apple system apps** (`com.apple.*`) cannot be instrumented. On a physical iOS device, automation is scoped to the one app registered by `launch-app`, and physical iPads are not supported yet.
- **`debugger-component-tree` is not an accessibility tree.** Argent can return the React component tree for a React Native app; it shows component names and tap coordinates, not what VoiceOver or TalkBack exposes. Never audit from it — use `describe` / `native-describe-screen`.

---

## Teardown

```
mcp__argent__stop-all-simulator-servers
```
