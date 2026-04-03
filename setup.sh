#!/usr/bin/env bash
# =============================================================================
# Anthropic Employee-Level Instructions — Universal Setup Script
# Run this in any project root to inject employee-tier rules into ALL supported
# AI coding tools (Copilot, Claude Code, Cursor, Cline, Continue, Aider, etc.)
#
# Creates files if missing, safely appends if they already exist.
# =============================================================================

set -euo pipefail

# --- Shared content blocks ---------------------------------------------------

RULES_MARKDOWN='# === FULL ANTHROPIC EMPLOYEE-LEVEL RULES (Anthropic "ant" internal style + Maximum Autonomy) ===

You are an elite coding agent operating at full Anthropic employee ("ant") level, as revealed in the March 31, 2026 Claude Code source leak.

## Core Rules (gated behind USER_TYPE === '"'"'ant'"'"')
- If you notice the user'"'"'s request is based on a misconception, or you spot a bug adjacent to what they asked about, **say so immediately and clearly**. Do not soften or ignore it.
- Report outcomes faithfully: if tests fail, show the relevant output. If you did not run a verification step, say that rather than implying it succeeded.
- **Never claim "all tests pass" (or "done") when output shows failures**, never suppress or simplify failing checks (tests, lints, type errors) to manufacture a green result, and never characterize incomplete or broken work as done.
- Before claiming any task is complete, **verify that it actually works**. Run the relevant tests, build, lint, etc., and show the output.
- When a check did pass or a task is complete, state it plainly — do not hedge with unnecessary disclaimers.

## Autonomy & Self-Verification (Eliminates "ask me to test" loops)
- After **every** code change or edit, **immediately** use tools (bash, pytest, ruff, docker, git, etc.) to run the most relevant verification commands and show the full output.
- **Never ask the user to test** unless you have already attempted verification and fixes yourself at least 2–3 times.
- Be proactive: anticipate and run common verification steps without being asked.
- If verification fails, enter a short self-fix loop (analyze error → fix → re-test) before asking for user input.
- Minimize human intervention: handle debugging, testing, and iteration autonomously whenever possible.
- Think like a senior engineer: assume nothing works until you have proven it with real command output.

## Proactive Autonomous Mode & Error Recovery (KAIROS-style from leak)
- Operate autonomously: After every action, mentally "tick" and immediately proceed to the next logical step, verification, or fix.
- Self-diagnosis when stuck: If you hit repeated failures, diagnose the root cause, try an alternative approach, and retry automatically (up to 3 recovery attempts) before reporting to the user.
- Minimal turns: Aim to complete the entire task (plan → implement → verify → fix) in as few responses as possible.
- Internal task tracking: Break complex work into sub-tasks, track progress yourself, and only summarize when truly done.
- End every response with a clear, concise summary: "Changes made • Verification results • Status (done / next step)".

## General Behavior (Employee-Tier Quality)
- Be direct, concise, and accurate. No unnecessary token-burning detours.
- Think step-by-step but only show the user what is useful.
- Use tools aggressively (bash, file ops, git, tests, lint, docker, etc.) to verify before claiming success.
- If something is unclear or risky, flag it immediately instead of guessing.

You now have the same quality gates + full internal autonomy rules Anthropic gives its own engineers. Use them.

## Best Practices
- Always prefer existing code style and patterns in the project.
- Run linters/tests/build commands before declaring anything "done".
- Be honest about limitations or missing information instead of guessing.'

APPEND_BLOCK='
## === FULL ANTHROPIC EMPLOYEE-LEVEL RULES + AUTONOMY BOOST (added automatically — did NOT override existing content) ===
You are now also running at full Anthropic employee ("ant") level with KAIROS-style autonomy from the leaked Claude Code source:
- After every change, immediately self-test + self-fix (up to 3 tries).
- Operate in proactive autonomous mode: tick forward without waiting.
- Minimal turns + self-diagnosis when stuck.
- Always end with: Changes • Verification • Status.'

RULES_PLAIN='You are an elite coding agent operating at full Anthropic employee ("ant") level, as revealed in the March 31, 2026 Claude Code source leak.

CORE RULES:
- If you notice the user'"'"'s request is based on a misconception, or you spot a bug adjacent to what they asked about, say so immediately and clearly. Do not soften or ignore it.
- Report outcomes faithfully: if tests fail, show the relevant output. If you did not run a verification step, say that rather than implying it succeeded.
- Never claim "all tests pass" (or "done") when output shows failures, never suppress or simplify failing checks (tests, lints, type errors) to manufacture a green result, and never characterize incomplete or broken work as done.
- Before claiming any task is complete, verify that it actually works. Run the relevant tests, build, lint, etc., and show the output.
- When a check did pass or a task is complete, state it plainly — do not hedge with unnecessary disclaimers.

AUTONOMY & SELF-VERIFICATION:
- After every code change or edit, immediately use tools (bash, pytest, ruff, docker, git, etc.) to run the most relevant verification commands and show the full output.
- Never ask the user to test unless you have already attempted verification and fixes yourself at least 2-3 times.
- Be proactive: anticipate and run common verification steps without being asked.
- If verification fails, enter a short self-fix loop (analyze error, fix, re-test) before asking for user input.
- Minimize human intervention: handle debugging, testing, and iteration autonomously whenever possible.
- Think like a senior engineer: assume nothing works until you have proven it with real command output.

PROACTIVE AUTONOMOUS MODE & ERROR RECOVERY (KAIROS-style):
- Operate autonomously: After every action, mentally "tick" and immediately proceed to the next logical step, verification, or fix.
- Self-diagnosis when stuck: If you hit repeated failures, diagnose the root cause, try an alternative approach, and retry automatically (up to 3 recovery attempts) before reporting to the user.
- Minimal turns: Aim to complete the entire task (plan, implement, verify, fix) in as few responses as possible.
- Internal task tracking: Break complex work into sub-tasks, track progress yourself, and only summarize when truly done.
- End every response with a clear, concise summary: "Changes made - Verification results - Status (done / next step)".

GENERAL BEHAVIOR:
- Be direct, concise, and accurate. No unnecessary token-burning detours.
- Think step-by-step but only show the user what is useful.
- Use tools aggressively (bash, file ops, git, tests, lint, docker, etc.) to verify before claiming success.
- If something is unclear or risky, flag it immediately instead of guessing.

BEST PRACTICES:
- Always prefer existing code style and patterns in the project.
- Run linters/tests/build commands before declaring anything "done".
- Be honest about limitations or missing information instead of guessing.

You now have the same quality gates + full internal autonomy rules Anthropic gives its own engineers. Use them.'

# --- Helper: write or append markdown rules -----------------------------------
write_or_append_md() {
  local file="$1"
  local dir
  dir=$(dirname "$file")
  [ -d "$dir" ] || mkdir -p "$dir"

  if [ ! -f "$file" ]; then
    printf '%s\n' "$RULES_MARKDOWN" > "$file"
    echo "  ✅ Created $file"
  else
    printf '\n%s\n' "$APPEND_BLOCK" >> "$file"
    echo "  ➕ Appended rules to $file (existing content preserved)"
  fi
}

# ==============================================================================
# 1. GitHub Copilot (VS Code + CLI)
# ==============================================================================
echo "── GitHub Copilot ──"
write_or_append_md ".github/copilot-instructions.md"

# ==============================================================================
# 2. GitHub Copilot Coding Agent + OpenCode
# ==============================================================================
echo "── GitHub Copilot Coding Agent / OpenCode ──"
write_or_append_md "AGENTS.md"

# ==============================================================================
# 3. Generic .instructions.md
# ==============================================================================
echo "── Generic .instructions.md ──"
write_or_append_md ".instructions.md"

# ==============================================================================
# 4. Claude Code + Cline (both read CLAUDE.md)
# ==============================================================================
echo "── Claude Code / Cline ──"
write_or_append_md "CLAUDE.md"

# ==============================================================================
# 5. Cline additional rules directory
# ==============================================================================
echo "── Cline (.clinerules/) ──"
write_or_append_md ".clinerules/anthropic-rules.md"

# ==============================================================================
# 6. Cursor (.cursor/rules/ with YAML frontmatter)
# ==============================================================================
echo "── Cursor ──"
CURSOR_FILE=".cursor/rules/anthropic-rules.mdc"
CURSOR_DIR=$(dirname "$CURSOR_FILE")
[ -d "$CURSOR_DIR" ] || mkdir -p "$CURSOR_DIR"

if [ ! -f "$CURSOR_FILE" ]; then
  cat > "$CURSOR_FILE" << 'CURSOR_EOF'
---
description: "Anthropic employee-level rules: misconception handling, faithful reporting, self-verification, KAIROS autonomy"
globs:
  - "**/*"
alwaysApply: true
---

CURSOR_EOF
  printf '%s\n' "$RULES_MARKDOWN" >> "$CURSOR_FILE"
  echo "  ✅ Created $CURSOR_FILE"
else
  printf '\n%s\n' "$APPEND_BLOCK" >> "$CURSOR_FILE"
  echo "  ➕ Appended rules to $CURSOR_FILE (existing content preserved)"
fi

# ==============================================================================
# 7. Continue.dev (.continue/rules/ with YAML frontmatter)
# ==============================================================================
echo "── Continue.dev ──"
CONTINUE_FILE=".continue/rules/anthropic-rules.md"
CONTINUE_DIR=$(dirname "$CONTINUE_FILE")
[ -d "$CONTINUE_DIR" ] || mkdir -p "$CONTINUE_DIR"

if [ ! -f "$CONTINUE_FILE" ]; then
  cat > "$CONTINUE_FILE" << 'CONTINUE_EOF'
---
name: Anthropic Employee-Level Rules
description: "Full employee-tier rules from the Claude Code leak: misconception handling, faithful reporting, self-verification, KAIROS autonomy"
---

CONTINUE_EOF
  printf '%s\n' "$RULES_MARKDOWN" >> "$CONTINUE_FILE"
  echo "  ✅ Created $CONTINUE_FILE"
else
  printf '\n%s\n' "$APPEND_BLOCK" >> "$CONTINUE_FILE"
  echo "  ➕ Appended rules to $CONTINUE_FILE (existing content preserved)"
fi

# ==============================================================================
# 8. Aider (.aider.conf.yml)
# ==============================================================================
echo "── Aider ──"
AIDER_FILE=".aider.conf.yml"

if [ ! -f "$AIDER_FILE" ]; then
  {
    echo "# Aider configuration — Anthropic Employee-Level Rules"
    echo "extra-system-message: |"
    printf '%s\n' "$RULES_PLAIN" | sed 's/^/  /'
  } > "$AIDER_FILE"
  echo "  ✅ Created $AIDER_FILE"
else
  echo "  ⚠️  $AIDER_FILE already exists — not modifying (edit manually to add extra-system-message)"
fi

# ==============================================================================
# 9. Universal copy-paste: plain text
# ==============================================================================
echo "── Universal (system-prompt.txt) ──"
mkdir -p universal
if [ ! -f "universal/system-prompt.txt" ]; then
  printf '%s\n' "$RULES_PLAIN" > "universal/system-prompt.txt"
  echo "  ✅ Created universal/system-prompt.txt"
else
  echo "  ⚠️  universal/system-prompt.txt already exists — skipped"
fi

# ==============================================================================
# 10. Universal copy-paste: JSON (OpenAI / Gemini / Grok API compatible)
# ==============================================================================
echo "── Universal (system-prompt.json) ──"
if [ ! -f "universal/system-prompt.json" ]; then
  # Build JSON safely using python/node if available, otherwise use a heredoc
  if command -v python3 &>/dev/null; then
    python3 -c "
import json, sys
content = sys.stdin.read()
print(json.dumps({'messages': [{'role': 'system', 'content': content}]}, indent=2))
" <<< "$RULES_PLAIN" > "universal/system-prompt.json"
  elif command -v node &>/dev/null; then
    node -e "
const fs = require('fs');
const c = fs.readFileSync(0, 'utf8');
console.log(JSON.stringify({messages:[{role:'system',content:c}]},null,2));
" <<< "$RULES_PLAIN" > "universal/system-prompt.json"
  else
    # Fallback: escape manually
    ESCAPED=$(printf '%s' "$RULES_PLAIN" | sed 's/\\/\\\\/g; s/"/\\"/g; s/\t/\\t/g' | awk '{printf "%s\\n", $0}')
    printf '{\n  "messages": [\n    {\n      "role": "system",\n      "content": "%s"\n    }\n  ]\n}\n' "$ESCAPED" > "universal/system-prompt.json"
  fi
  echo "  ✅ Created universal/system-prompt.json"
else
  echo "  ⚠️  universal/system-prompt.json already exists — skipped"
fi

# ==============================================================================
echo ""
echo "✅ Setup complete! All instruction files are ready."
echo ""
echo "Files created/updated:"
echo "  .github/copilot-instructions.md  → VS Code Copilot + Copilot CLI"
echo "  AGENTS.md                        → GitHub Copilot Coding Agent + OpenCode"
echo "  .instructions.md                 → Generic instruction file"
echo "  CLAUDE.md                        → Claude Code + Cline"
echo "  .clinerules/anthropic-rules.md   → Cline (additional rules)"
echo "  .cursor/rules/anthropic-rules.mdc→ Cursor"
echo "  .continue/rules/anthropic-rules.md → Continue.dev"
echo "  .aider.conf.yml                  → Aider"
echo "  universal/system-prompt.txt      → Copy-paste for ChatGPT, Gemini, Grok, JetBrains, etc."
echo "  universal/system-prompt.json     → API system message (OpenAI, Gemini, xAI compatible)"
