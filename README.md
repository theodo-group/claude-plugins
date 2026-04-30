# Theodo Group Claude Plugins

A collection of Claude Code plugins by Theodo.

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

## Releasing a plugin

Use the release script to build the MCP server and bump the plugin version in one step:

```sh
./scripts/release.sh <plugin-name> [patch|minor|major]
```

The bump type defaults to `patch` if omitted.

**Examples:**

```sh
./scripts/release.sh accessibility          # 0.0.2 → 0.0.3
./scripts/release.sh accessibility minor    # 0.0.2 → 0.1.0
./scripts/release.sh accessibility major    # 0.0.2 → 1.0.0
```

The script will:

1. Build the MCP server (`npm install && npm run build`)
2. Bump the version in `plugins/<plugin>/.claude-plugin/plugin.json`
3. Bump the version in `.claude-plugin/marketplace.json`

Then commit and tag the release:

```sh
git add plugins/accessibility/.claude-plugin/plugin.json \
        plugins/accessibility/mcp/dist \
        .claude-plugin/marketplace.json
git commit -m "release(accessibility): v0.0.3"
git tag "accessibility/v0.0.3"
```

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

### Accessibility tree

> "Get the accessibility tree from my Android emulator and tell me what's missing"

> "My iOS app is running in the simulator, check if all interactive elements have proper accessibility labels"

> "Compare the accessibility tree before and after I navigate to the settings screen"

---

## Install

### Remote (for everyone)

Add the marketplace from GitHub, then install a plugin:

```sh
/plugin marketplace add git@github.com:theodo-group/claude-plugins.git
/plugin install accessibility@theodo-group-claude-plugins
/reload-plugins
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
/plugin install accessibility@theodo-group-claude-plugins
/reload-plugins
```

Or you can also add then manually

1.

```sh
/plugin
```

2. Go to marketplace tab (tap twice on keyboard right arrow)
3. Add marketplace with relative path
4.

```sh
/plugin
```

5. Go to marketplace tab (tap twice on keyboard right arrow)
6. Select theodo marketplace
7. Add plugin
