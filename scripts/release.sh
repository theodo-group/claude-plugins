#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

usage() {
  echo "Usage: $0 <plugin-name> [patch|minor|major]"
  echo "  plugin-name  Name of the plugin (e.g. accessibility)"
  echo "  bump         Version bump type (default: patch)"
  exit 1
}

if [[ $# -lt 1 ]]; then
  usage
fi

PLUGIN_NAME="$1"
BUMP="${2:-patch}"

if [[ ! "$BUMP" =~ ^(patch|minor|major)$ ]]; then
  echo "Error: bump must be patch, minor, or major (got '$BUMP')"
  usage
fi

PLUGIN_DIR="$REPO_ROOT/plugins/$PLUGIN_NAME"
PLUGIN_JSON="$PLUGIN_DIR/.claude-plugin/plugin.json"
MARKETPLACE_JSON="$REPO_ROOT/.claude-plugin/marketplace.json"

if [[ ! -d "$PLUGIN_DIR" ]]; then
  echo "Error: plugin directory not found: $PLUGIN_DIR"
  exit 1
fi

if [[ ! -f "$PLUGIN_JSON" ]]; then
  echo "Error: plugin.json not found: $PLUGIN_JSON"
  exit 1
fi

# ── Helpers ────────────────────────────────────────────────────────────────────

bump_version() {
  local version="$1"
  local bump="$2"
  local major minor patch
  IFS='.' read -r major minor patch <<< "$version"
  case "$bump" in
    major) echo "$((major + 1)).0.0" ;;
    minor) echo "${major}.$((minor + 1)).0" ;;
    patch) echo "${major}.${minor}.$((patch + 1))" ;;
  esac
}

update_json_version() {
  local file="$1"
  local old_version="$2"
  local new_version="$3"
  # Replace "version": "X.Y.Z" (first occurrence only, via temp file)
  if command -v python3 &>/dev/null; then
    python3 - "$file" "$new_version" <<'PY'
import sys, json
path, new_version = sys.argv[1], sys.argv[2]
with open(path) as f:
    data = json.load(f)
data['version'] = new_version
with open(path, 'w') as f:
    json.dump(data, f, indent=4)
    f.write('\n')
PY
  else
    sed -i '' "s/\"version\": \"${old_version}\"/\"version\": \"${new_version}\"/" "$file"
  fi
}

update_marketplace_version() {
  local file="$1"
  local plugin_name="$2"
  local new_version="$3"
  python3 - "$file" "$plugin_name" "$new_version" <<'PY'
import sys, json
path, plugin_name, new_version = sys.argv[1], sys.argv[2], sys.argv[3]
with open(path) as f:
    data = json.load(f)
for plugin in data.get('plugins', []):
    if plugin['name'] == plugin_name:
        plugin['version'] = new_version
        break
with open(path, 'w') as f:
    json.dump(data, f, indent=4)
    f.write('\n')
PY
}

# ── Read current version ────────────────────────────────────────────────────────

CURRENT_VERSION=$(python3 -c "import json; print(json.load(open('$PLUGIN_JSON'))['version'])")
NEW_VERSION=$(bump_version "$CURRENT_VERSION" "$BUMP")

echo "Plugin  : $PLUGIN_NAME"
echo "Version : $CURRENT_VERSION → $NEW_VERSION ($BUMP bump)"
echo ""

# ── Build MCP ──────────────────────────────────────────────────────────────────

MCP_DIR="$PLUGIN_DIR/mcp"
if [[ -d "$MCP_DIR" && -f "$MCP_DIR/package.json" ]]; then
  echo "► Building MCP server…"
  (cd "$MCP_DIR" && npm install --silent && npm run build)
  echo "  Done."
else
  echo "  No mcp/ directory found — skipping build."
fi

# ── Bump versions ──────────────────────────────────────────────────────────────

echo ""
echo "► Updating $PLUGIN_JSON"
update_json_version "$PLUGIN_JSON" "$CURRENT_VERSION" "$NEW_VERSION"

echo "► Updating $MARKETPLACE_JSON"
update_marketplace_version "$MARKETPLACE_JSON" "$PLUGIN_NAME" "$NEW_VERSION"

echo ""
echo "Release $PLUGIN_NAME@$NEW_VERSION ready."
echo "Next steps:"
echo "  git add plugins/$PLUGIN_NAME/.claude-plugin/plugin.json \\"
echo "        plugins/$PLUGIN_NAME/mcp/dist \\"
echo "        .claude-plugin/marketplace.json"
echo "  git commit -m \"release($PLUGIN_NAME): v$NEW_VERSION\""
echo "  git tag \"$PLUGIN_NAME/v$NEW_VERSION\""
