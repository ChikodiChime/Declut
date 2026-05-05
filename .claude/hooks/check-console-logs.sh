#!/bin/bash
# Catches console.log statements left in production code.
# Used as a PreToolUse hook for Edit|Write operations.
# Allows console.log in: realtime workers, seed files, scripts, test files.
# Exit 2 = block. Exit 0 = allow.

if ! command -v jq >/dev/null 2>&1; then
  exit 0
fi

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Allow console.log in these paths — it's intentional there
case "$FILE_PATH" in
  */realtime/src/workers/*|*/realtime/src/index.ts)
    exit 0 ;;
  */seeds/*|*/seed-*.ts)
    exit 0 ;;
  *.test.ts|*.test.tsx|*.spec.ts|*.spec.tsx|*__tests__/*)
    exit 0 ;;
  */scripts/*)
    exit 0 ;;
esac

# Extract the content being written
if [ "$TOOL_NAME" = "Write" ]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // empty')
elif [ "$TOOL_NAME" = "Edit" ]; then
  CONTENT=$(echo "$INPUT" | jq -r '.tool_input.new_string // empty')
else
  exit 0
fi

if [ -z "$CONTENT" ]; then
  exit 0
fi

# Check for console.log (but not console.error or console.warn — those are intentional)
if echo "$CONTENT" | grep -qE 'console\.log\('; then
  REASON="console.log() detected in production code ($FILE_PATH). Use a proper logger or remove before committing. If this is intentional debugging, allow this action."
  echo "{\"hookSpecificOutput\":{\"hookEventName\":\"PreToolUse\",\"permissionDecision\":\"ask\",\"permissionDecisionReason\":\"$REASON\"}}"
  exit 2
fi

exit 0
