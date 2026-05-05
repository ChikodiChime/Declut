#!/bin/bash
# Reminds to run pnpm db:push after editing schema files.
# Used as a PostToolUse hook for Edit|Write operations.
# This hook only outputs a reminder — it never blocks.

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Check if the edited file is a schema file
case "$FILE_PATH" in
  */packages/db/src/schema/*.ts|*/packages/db/src/schema/**/*.ts)
    echo "Schema file modified: $(basename "$FILE_PATH"). Remember to run 'pnpm db:push' to apply changes to the database."
    ;;
esac

exit 0
