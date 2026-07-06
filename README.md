# Theodo Group Claude Plugins

A collection of Claude Code plugins by Theodo.

## Plugins

- **[Accessibility](plugins/accessibility/README.md)** — Check your app for accessibility features.

---

## Development setup

Some plugins ship their own components (e.g. MCP servers) that need to be built before use — check the plugin's own README for its specific setup steps.

For example, the [accessibility plugin](plugins/accessibility/README.md#development-setup) ships an MCP server that needs to be built with `npm install && npm run build` before use.

---

## Releasing a plugin

Use the release script to build a plugin's assets (if any) and bump its version in one step:

```sh
./scripts/release.sh <plugin-name> [patch|minor|major]
```

The bump type defaults to `patch` if omitted.

**Example** — release a minor version bump of the `accessibility` plugin:

```sh
./scripts/release.sh accessibility minor    # 0.0.2 → 0.1.0
```

The script will:

1. Build the plugin's assets, if it has a build step (e.g. an MCP server)
2. Bump the version in `plugins/<plugin-name>/.claude-plugin/plugin.json`
3. Bump the version in `.claude-plugin/marketplace.json`

Then commit and tag the release:

```sh
git add plugins/accessibility/.claude-plugin/plugin.json \
        .claude-plugin/marketplace.json
git commit -m "release(accessibility): v0.1.0"
git tag "accessibility/v0.1.0"
```

---

## Install

### Remote (for everyone)

Add the marketplace from GitHub, then install a plugin:

```sh
/plugin marketplace add git@github.com:theodo-group/claude-plugins.git
/plugin install <plugin-name>@theodo-group-claude-plugins
/reload-plugins
```

For example, to install the `accessibility` plugin:

```sh
/plugin marketplace add git@github.com:theodo-group/claude-plugins.git
/plugin install accessibility@theodo-group-claude-plugins
/reload-plugins
```

### Local (for contributors)

First clone the repo and follow the plugin's own development setup (if any), then choose one of:

**Install a single plugin directly** — quickest, no marketplace needed:

```sh
/plugin install ./plugins/<plugin-name>
# example: /plugin install ./plugins/accessibility
```

**Add the local repo as a marketplace** — tests the full marketplace flow:

```sh
/plugin marketplace add ./path/to/claude-plugins
/plugin install <plugin-name>@theodo-group-claude-plugins
# example: /plugin install accessibility@theodo-group-claude-plugins
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
