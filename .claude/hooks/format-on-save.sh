#!/bin/bash
# Auto-formats files after Claude edits them.
# Used as a PostToolUse hook for Edit|Write operations.
# Auto-detects formatters — requires both the binary AND a config file to activate.

# Requires jq for JSON parsing
if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

EXTENSION="${FILE_PATH##*.}"
FORMATTED=false

# Find the project root (nearest directory with package.json or .git)
find_project_root() {
  local dir="$PWD"
  while [ "$dir" != "/" ]; do
    if [ -f "$dir/package.json" ] || [ -d "$dir/.git" ]; then
      echo "$dir"
      return
    fi
    dir=$(dirname "$dir")
  done
  echo "$PWD"
}

ROOT=$(find_project_root)

# --- Biome (JS/TS all-in-one — check first, it's faster than Prettier) ---
if [ "$FORMATTED" = false ] && [ -f "$ROOT/node_modules/.bin/biome" ] && [ -f "$ROOT/biome.json" -o -f "$ROOT/biome.jsonc" ]; then
  case "$EXTENSION" in
    js|jsx|ts|tsx|json|css)
      npx biome format --write "$FILE_PATH" 2>/dev/null && FORMATTED=true
      ;;
  esac
fi

# --- Prettier (Node.js / TypeScript) ---
if [ "$FORMATTED" = false ] && [ -f "$ROOT/node_modules/.bin/prettier" ]; then
  HAS_PRETTIER_CONFIG=false
  for cfg in .prettierrc .prettierrc.json .prettierrc.yml .prettierrc.yaml .prettierrc.js .prettierrc.cjs .prettierrc.mjs .prettierrc.toml prettier.config.js prettier.config.cjs prettier.config.mjs; do
    if [ -f "$ROOT/$cfg" ]; then
      HAS_PRETTIER_CONFIG=true
      break
    fi
  done
  # Also check package.json for "prettier" key
  if [ "$HAS_PRETTIER_CONFIG" = false ] && [ -f "$ROOT/package.json" ] && grep -q '"prettier"' "$ROOT/package.json" 2>/dev/null; then
    HAS_PRETTIER_CONFIG=true
  fi

  if [ "$HAS_PRETTIER_CONFIG" = true ]; then
    case "$EXTENSION" in
      js|jsx|ts|tsx|json|css|scss|md|yaml|yml|html)
        npx prettier --write "$FILE_PATH" 2>/dev/null && FORMATTED=true
        ;;
    esac
  fi
fi

exit 0
