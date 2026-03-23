# Bamlab Claude Plugins

A collection of Claude Code plugins by Theodo Apps.

## Plugins

### Accessibility

A plugin to check your React Native app for accessibility features. It includes suggestions to improve accessibility and make your app more inclusive.

**Features:**

- **Color checker** — Validates color contrast ratios against WCAG 2.1, checks for color-vision deficiency issues, and flags overstimulating colors. Uses the `contrast-calculator` MCP server for accurate calculations.
- **Accessibility tree** — Fetches the live UI hierarchy from a connected Android device (via ADB) or iOS simulator (via WebDriverAgent). Uses the `accessibility-tree` MCP server.

---

## Development setup

The accessibility plugin includes an MCP server written in TypeScript that must be built before use:

```sh
cd plugins/accessibility/mcp
npm install
npm run build
```

Once your changes made, you will need to run `npm run build` before `git push`.

---

## Example usages

### Color checker

> "Check the color accessibility of my app"

> "The primary button has a `#F5A623` background with white text, does it pass WCAG AA?"

> "Find an accessible alternative to `#AAAAAA` on a white background"

> "Check all the colors in `src/theme/colors.ts` for contrast issues"

### Accessibility tree

> "Get the accessibility tree from my Android emulator and tell me what's missing"

> "My iOS app is running in the simulator, check if all interactive elements have proper accessibility labels"

> "Compare the accessibility tree before and after I navigate to the settings screen"

---

## Install

### Remote (for everyone)

Add the marketplace from GitHub, then install a plugin:

```sh
/plugin marketplace add git@github.com:bamlab/claude-plugins.git
/plugin install accessibility@bamlab-claude-plugins
```

### Local (for contributors)

First clone the repo and build the MCP server (see [Development setup](#development-setup)), then choose one of:

**Install a single plugin directly** — quickest, no marketplace needed:

```sh
/plugin install ./plugins/accessibility
```

**Add the local repo as a marketplace** — tests the full marketplace flow:

```sh
/plugin marketplace add ./path/to/claude-plugins
/plugin install accessibility@bamlab-claude-plugins
```
