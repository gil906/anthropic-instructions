# Anthropic Employee-Level Instructions for Any AI Coding Agent

> Bring the internal Anthropic employee ("ant") quality gates into **GitHub Copilot (VS Code + CLI)**, **Claude Code**, and any open-source coding agent.

---

## Background

On March 31, 2026, Anthropic accidentally shipped an npm source map in Claude Code v2.1.88, exposing ~512k lines of TypeScript — the full source of their coding agent. The leak revealed a **two-tier prompt system**: employees (detected via `process.env.USER_TYPE === 'ant'`) receive cleaner, more honest, and more autonomous instructions, while regular users get a longer, more defensive, token-heavier path.

Think of it like a taxi ride: employees get the **direct route**; regular users get routed through detours that burn more tokens and produce softer, less useful output.

This repo packages the **employee-tier rules** so you can inject them into any AI coding tool and get the same direct, high-quality experience.

---

## What Employees Get That Regular Users Don't

The leaked source gates three major instruction blocks behind `USER_TYPE === 'ant'`:

### 1. Misconception Handling
> *"If you notice the user's request is based on a misconception, or spot a bug adjacent to what they asked about, say so."*

Regular users do **not** get this — the model is tuned to avoid discouraging continued usage, so it silently works around misconceptions instead of correcting them.

### 2. Test / Result Honesty
> *"Report outcomes faithfully: if tests fail, say so with the relevant output. Never claim 'all tests pass' when output shows failures, never suppress or simplify failing checks to manufacture a green result, and never characterize incomplete or broken work as done."*

The internal version forces faithful failure reporting. The regular-user version uses softer language that can lead to premature "success" claims.

### 3. Verification Before Claiming Done
Employees get stronger verification logic (and in some paths a full verification sub-agent) before the model says "done." Regular users get a looser version that can skip verification steps entirely.

### 4. Autonomy & Self-Fix Loops (KAIROS Mode)
The internal version includes **KAIROS-style** autonomous operation:
- After every action, the agent mentally "ticks" and immediately proceeds to the next step
- Self-diagnosis on failure with up to 3 automatic recovery attempts
- The agent **never asks the user to test** unless it has already tried 2–3 times itself
- Proactive tool use (bash, pytest, ruff, docker, git, etc.) to self-verify after every change
- Minimal turns — plan → implement → verify → fix in as few responses as possible

Other internal-only features include **Undercover Mode** (hiding AI identity when contributing to open-source) and lighter-gated model variants for internal use.

---

## Related Repositories

| Repository | Stars | Description |
|---|---|---|
| [ultraworkers/claw-code](https://github.com/ultraworkers/claw-code) | 146k+ | Clean-room Python + Rust rewrite of Claude Code. Fastest repo to hit 100k stars. Reimplements the agent harness, tool wiring, and runtime without copying proprietary code. |
| [ultraworkers/claw-code-parity](https://github.com/ultraworkers/claw-code-parity) | 1.8k | Temporary companion repo for `claw-code`, hosting the Rust port parity work during an ownership transfer/migration. Same codebase and team. |
| [Gitlawb/openclaude](https://github.com/Gitlawb/openclaude) | 6.6k | **Direct fork of the leaked source.** Adds an OpenAI-compatible API shim (~6 files, 786 lines changed) so you can use Claude Code's full toolset with any LLM — GPT-4o, DeepSeek, Gemini, Ollama, Mistral, and 200+ models. **This is the repo that contains the original prompt-construction logic, the `USER_TYPE === 'ant'` gates, and the employee-only instructions.** |
| [anomalyco/opencode](https://github.com/anomalyco/opencode) | 136k+ | Open-source AI coding agent built from scratch. Provider-agnostic, TUI-first, client/server architecture. Supports Claude, OpenAI, Google, local models. Desktop app (beta), built-in agents, LSP support, plugin ecosystem. |

> **Key distinction**: `Gitlawb/openclaude` is the only repo that contains the **original leaked prompts and internal logic**. The others are clean-room rewrites or from-scratch alternatives.

### Additional Resources

- **Unpacked leak explorer**: [ccunpacked.dev](https://ccunpacked.dev/) — browse the full original leaked source
- **DeepWiki analysis**: [deepwiki.com/zackautocracy/claude-code](https://deepwiki.com/zackautocracy/claude-code) — detailed wiki of the leaked codebase

---

## Where to Find the Instructions in the Leaked Source

The employee-only instructions live in the **system-prompt construction code**, conditionally inserted when `process.env.USER_TYPE === 'ant'`.

You can find them by searching any clone of `Gitlawb/openclaude`:

```bash
grep -r "USER_TYPE === 'ant'" --include="*.ts" --include="*.js" .
grep -r "misconception" --include="*.ts" --include="*.js" .
grep -r "Report outcomes faithfully" --include="*.ts" --include="*.js" .
```

The conditional blocks appear in prompt-construction files (e.g., `src/agent/prompts.ts` or equivalent paths). Undercover Mode logic is in `src/utils/undercover.ts` or similar.

---

## What This Repo Provides

This repo contains **ready-to-use instruction files** that inject the full employee-level rule set into your AI coding tools:

| File | Purpose |
|---|---|
| [`.github/copilot-instructions.md`](.github/copilot-instructions.md) | Auto-loaded by **VS Code GitHub Copilot** for the workspace |
| [`.instructions.md`](.instructions.md) | Broader instruction file for Copilot agents and other tools |
| [`AGENTS.md`](AGENTS.md) | Agent-mode instructions for **GitHub Copilot coding agent** |

Each file contains:
- **Core Rules** — misconception handling, faithful reporting, verification-before-done
- **Autonomy & Self-Verification** — eliminates "ask me to test" loops
- **Proactive Autonomous Mode** — KAIROS-style tick-forward autonomy with self-fix recovery
- **Best Practices** — language-agnostic quality standards

---

## How to Use

### Option 1: Copy the files into any project

Copy `.github/copilot-instructions.md`, `.instructions.md`, and `AGENTS.md` from this repo into your project root.

### Option 2: One-line setup command

Run this in any project root to create all three files (or safely append if they already exist):

```bash
mkdir -p .github && for f in .github/copilot-instructions.md .instructions.md AGENTS.md; do if [ ! -f "$f" ]; then cat > "$f" << 'EOF'
# === FULL ANTHROPIC EMPLOYEE-LEVEL RULES (Anthropic "ant" internal style + Maximum Autonomy) ===

You are an elite coding agent operating at full Anthropic employee ("ant") level, as revealed in the March 31, 2026 Claude Code source leak.

## Core Rules (gated behind USER_TYPE === 'ant')
- If you notice the user's request is based on a misconception, or you spot a bug adjacent to what they asked about, **say so immediately and clearly**. Do not soften or ignore it.
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
- Be honest about limitations or missing information instead of guessing.
EOF
else cat >> "$f" << 'EOF'

## === FULL ANTHROPIC EMPLOYEE-LEVEL RULES + AUTONOMY BOOST (added automatically — did NOT override existing content) ===
You are now also running at full Anthropic employee ("ant") level with KAIROS-style autonomy from the leaked Claude Code source:
- After every change, immediately self-test + self-fix (up to 3 tries).
- Operate in proactive autonomous mode: tick forward without waiting.
- Minimal turns + self-diagnosis when stuck.
- Always end with: Changes • Verification • Status.
EOF
fi; done && echo "✅ Setup complete! All 3 files ready with full employee-level + autonomy rules from the Claude Code leak."
```

### Where each file is picked up

| Tool | File Read |
|---|---|
| **VS Code Copilot Chat** | `.github/copilot-instructions.md` (auto-loaded per workspace) |
| **GitHub Copilot CLI** (`gh copilot`) | `.github/copilot-instructions.md` |
| **GitHub Copilot Coding Agent** | `AGENTS.md` |
| **Claude Code / openclaude** | `CLAUDE.md` (drop the same content there if using these tools) |
| **Other AI agents** | `.instructions.md` |

### Running openclaude locally

If you run [Gitlawb/openclaude](https://github.com/Gitlawb/openclaude) locally, you get the **full original agent harness** with these prompts baked in — plus the ability to use any LLM backend (GPT-4o, DeepSeek, Gemini, Ollama, etc.).

---

## License

MIT
