# Accessibility

A plugin to check your mobile app (React Native or Flutter) for accessibility features. It includes suggestions to improve accessibility and make your app more inclusive.

## Scope & positioning

This plugin is an open source educational resource for mobile accessibility. The initial focus was React Native, and the scope is expanding to include Flutter and eventually native iOS/Android as well. The goal is to help developers understand how to build and validate more accessible mobile experiences through practical guidance, examples, and checks.

Importantly, it does not claim to automatically make an app accessible or guarantee compliance. The intended positioning is closer to: "a practical learning and enablement resource that helps developers identify, understand, and improve accessibility issues in mobile apps."

## Features

- **Why accessibility** — Helps you make the ethical, legal, and business case for accessibility to stakeholders, tailored to your audience and context.
- **Color checker** — Validates color contrast ratios against WCAG 2.1, checks for color-vision deficiency issues, and flags overstimulating colors. Uses the `contrast-calculator` MCP server for accurate calculations.
- **Screen reader accessibility (React Native)** — Fetches the live UI hierarchy from a connected Android device (via ADB) or iOS simulator (via WebDriverAgent) and flags missing labels, roles, and other screen-reader issues in React Native apps. Uses the `accessibility-tree` MCP server.
- **Screen reader accessibility (Flutter)** — Same accessibility-tree analysis as above, tailored to Flutter's semantics tree and widget conventions.

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
