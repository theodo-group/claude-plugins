# Accessibility

A plugin to check your mobile app (React Native or Flutter) for accessibility features. It includes suggestions to improve accessibility and make your app more inclusive.

## Scope & positioning

This plugin is an open source educational resource for mobile accessibility. The initial focus was React Native, and the scope is expanding to include Flutter and eventually native iOS/Android as well. The goal is to help developers understand how to build and validate more accessible mobile experiences through practical guidance, examples, and checks.

Importantly, it does not claim to automatically make an app accessible or guarantee compliance. The intended positioning is closer to: "a practical learning and enablement resource that helps developers identify, understand, and improve accessibility issues in mobile apps."

## Features

- **Why accessibility** — Helps you make the ethical, legal, and business case for accessibility to stakeholders, tailored to your audience and context.
- **Color checker** — Validates color contrast ratios against WCAG 2.1, checks for color-vision deficiency issues, and flags overstimulating colors. Uses the `contrast-calculator` MCP server for accurate calculations.
- **Screen reader accessibility (React Native)** — Fetches the live UI hierarchy from a connected Android device or iOS simulator/device and flags missing labels, roles, and other screen-reader issues in React Native apps. On iOS you choose the backend: this plugin's `accessibility-tree` MCP server (WebDriverAgent) or [Argent](https://docs.swmansion.com/argent/) — see [Choosing an iOS backend](#choosing-an-ios-backend).
- **Screen reader accessibility (Flutter)** — Same accessibility-tree analysis as above, tailored to Flutter's semantics tree and widget conventions. Backend A (WebDriverAgent) is the default here; Argent is offered but gated behind a check, because Flutter only builds its semantics tree while an accessibility service is active and Argent's iOS AX read is unverified against it.

---

## Choosing an iOS backend

Reading the iOS accessibility tree needs something running on the device. The screen-reader skills support two backends and **ask you which one to use** — neither is installed or assumed by default.

| | **A — WebDriverAgent** (bundled) | **B — Argent** (external) |
|---|---|---|
| Install | Appium + XCUITest driver + `xcodebuild` build of WDA; `iproxy` on physical devices | `npx @swmansion/argent@latest init` |
| First run | ~10 min, and again after Xcode upgrades | ~2 min |
| Processes to keep alive | WDA, plus an `iproxy` terminal on device | none |
| Accessibility traits | full `traits` string preserved | collapsed to a single role; `selected` / `notEnabled` dropped |
| Tree shape | nested, parent/child preserved | flat |
| Navigates the app for you | no | yes |
| Context cost | 2 MCP tools | ~80 MCP tools |

Rule of thumb:

- **Backend A** when the audit must prove grouping (`accessible={true}` wrappers) or `accessibilityState` from the device itself. Those checks depend on nesting and on multiple traits per element, which backend B's tree does not carry.
- **Backend B** for a fast first pass, or when auditing several screens in one go — it can drive the UI between captures.

**Android is not affected.** `get_accessibility_tree_android` only needs `adb` and returns the raw uncompressed `uiautomator` dump. Argent reads Android through the same `uiautomator dump` but passes `--compressed` and merges `content-desc` into the visible text, which hides exactly what this audit looks for — so the skills use the bundled tool on Android either way.

Setup instructions for both live in each skill's `references/` folder:
`skills/screen-reader-*/references/setup-webdriveragent.md` and `setup-argent.md`.

> Note: those two guides are duplicated across the `screen-reader-react-native` and `screen-reader-flutter` skills (skills bundle their own resources). Keep them in sync when editing; only the last bullet of `setup-argent.md` is framework-specific.

**On Flutter**, backend A is the default. Argent itself is framework-agnostic (it reads `uiautomator` and the iOS AX runtime, not React internals), but Flutter only builds its semantics tree while an accessibility service is attached — `uiautomator` is one, XCUITest is one, and whether Argent's iOS AX service is one has not been verified. The Flutter skill therefore asks for a quick `describe` sanity check before letting the audit proceed on backend B.

**Color checking is unaffected by this choice** — Argent exposes no contrast or color tools, so the `contrast-calculator` MCP server is used regardless.

---

## Development setup

This plugin includes an MCP server written in TypeScript that must be built before use:

```sh
cd plugins/accessibility/mcp
npm install
npm run build
```

Once your changes made, you will need to run `npm run build` before `git push`.

---

## Example usages

### Why accessibility

> "I'm not sure why accessibility matters — can you explain it to me?"

> "What does accessibility actually mean for a mobile app?"

> "Make the case for accessibility to my product manager — we're building a banking app in France"

> "My client says accessibility isn't a priority. What are the legal risks for an e-commerce app in the EU?"

### Color checker

> "Check the color accessibility of my app"

> "The primary button has a `#F5A623` background with white text, does it pass WCAG AA?"

> "Find an accessible alternative to `#AAAAAA` on a white background"

> "Check all the colors in `src/theme/colors.ts` for contrast issues"

### Screen reader accessibility

> "Get the accessibility tree from my Android emulator and tell me what's missing"

> "My iOS app is running in the simulator, check if all interactive elements have proper accessibility labels"

> "Compare the accessibility tree before and after I navigate to the settings screen"

> "This is a Flutter app, check the semantics tree for missing labels"

> "Use Argent instead of WebDriverAgent for this audit — I don't want to build WDA"

> "Which iOS backend should I use if I care about grouping and accessibilityState?"

---

## Install

See the [main README](../../README.md#install) for general installation instructions. This plugin's name is `accessibility`:

```sh
/plugin install accessibility@theodo-group-claude-plugins
```

## Releasing

See the [main README](../../README.md#releasing-a-plugin) for the release script. Example:

```sh
./scripts/release.sh accessibility          # 0.0.2 → 0.0.3
./scripts/release.sh accessibility minor    # 0.0.2 → 0.1.0
./scripts/release.sh accessibility major    # 0.0.2 → 1.0.0
```
