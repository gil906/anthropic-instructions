#!/usr/bin/env node
// openclaude-copilot — AI coding agent CLI
// Based on OpenClaude (https://github.com/Gitlawb/openclaude)
// Powered by GitHub Copilot / GitHub Models / OpenAI
// Uses Anthropic Employee-Level Rules from the Claude Code source leak
// ZERO TELEMETRY — your data stays entirely local.

import { createInterface } from 'readline';
import { resolveConfig, HELP_TEXT } from './config.mjs';
import { Agent } from './agent.mjs';
import {
  printBanner, printToolCall, printToolResult,
  printError, printInfo, printDivider,
  getPrompt, Spinner, colors
} from './ui.mjs';

// ─── CLI Argument Parsing ─────────────────────────────────────────────────

const args = process.argv.slice(2);
let initialPrompt = null;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];

  if (arg === '--help' || arg === '-h') {
    console.log(HELP_TEXT);
    process.exit(0);
  }

  if (arg === '--version' || arg === '-v') {
    console.log('openclaude-copilot v1.0.0');
    process.exit(0);
  }

  if (arg === '--model' && args[i + 1]) {
    process.env.OPENCLAUDE_MODEL = args[++i];
    continue;
  }

  if (arg === '--provider' && args[i + 1]) {
    process.env.OPENCLAUDE_PROVIDER = args[++i];
    continue;
  }

  // Anything else is the initial prompt
  if (!arg.startsWith('-')) {
    initialPrompt = args.slice(i).join(' ');
    break;
  }
}

// ─── Configuration ────────────────────────────────────────────────────────

const config = resolveConfig();

if (config.error) {
  console.error(colors.red('Configuration Error:\n'));
  console.error(config.error);
  console.error('\nRun with --help for setup instructions.');
  process.exit(1);
}

// ─── Agent Setup ──────────────────────────────────────────────────────────

const agent = new Agent(config);

// ─── REPL ─────────────────────────────────────────────────────────────────

printBanner(config);

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: true,
  prompt: getPrompt()
});

async function handleMessage(message) {
  const trimmed = message.trim();
  if (!trimmed) return;

  // ─── Slash Commands ───────────────────────────────────────────────────

  if (trimmed.startsWith('/')) {
    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();

    switch (cmd) {
      case '/help':
        printInfo(`
Commands:
  /help              Show this help
  /clear             Clear conversation history
  /model <name>      Switch model (e.g., /model gpt-4.1)
  /compact           Summarize and compact conversation history
  /status            Show session info
  /quit, /exit       Exit
`);
        return;

      case '/clear':
        agent.clearHistory();
        printInfo('Conversation cleared.');
        return;

      case '/model':
        if (parts[1]) {
          agent.model = parts[1];
          printInfo(`Model switched to: ${parts[1]}`);
        } else {
          printInfo(`Current model: ${agent.model}`);
          if (config.availableModels?.length) {
            printInfo(`Available: ${config.availableModels.join(', ')}`);
          }
        }
        return;

      case '/compact':
        printInfo('Compacting conversation...');
        // Keep system + last 6 messages
        const system = agent.messages[0];
        const recent = agent.messages.slice(-6);
        agent.messages = [system, ...recent];
        printInfo(`Compacted to ${agent.messages.length} messages.`);
        return;

      case '/status':
        printInfo(`
Provider:  ${config.providerName}
Model:     ${agent.model}
Messages:  ${agent.getMessageCount()}
Tokens:    ~${agent.totalTokens}
CWD:       ${process.cwd()}
`);
        return;

      case '/quit':
      case '/exit':
        printInfo('Goodbye!');
        process.exit(0);

      default:
        printError(`Unknown command: ${cmd}. Type /help for available commands.`);
        return;
    }
  }

  // ─── Send to Agent ────────────────────────────────────────────────────

  const spinner = new Spinner('Thinking');
  let streaming = false;

  await agent.chat(trimmed, {
    onText: (text) => {
      if (!streaming) {
        spinner.stop();
        streaming = true;
        process.stdout.write('\n');
      }
      process.stdout.write(text);
    },

    onToolCall: ({ name, args }) => {
      spinner.stop();
      streaming = false;
      printToolCall(name, args);
      spinner.start();
    },

    onToolResult: ({ name, result }) => {
      spinner.stop();
      printToolResult(name, result);
      spinner.start();
    },

    onError: (err) => {
      spinner.stop();
      streaming = false;
      printError(err);
    },

    onDone: ({ iterations, tokens }) => {
      spinner.stop();
      if (streaming) {
        process.stdout.write('\n');
      }
      printDivider();
    }
  });

  spinner.stop();
}

// ─── Main Loop ────────────────────────────────────────────────────────────

// Handle initial prompt if provided
if (initialPrompt) {
  process.stdout.write(`${getPrompt()}${initialPrompt}\n`);
  await handleMessage(initialPrompt);
}

// Interactive mode
rl.prompt();

rl.on('line', async (line) => {
  await handleMessage(line);
  rl.prompt();
});

rl.on('close', () => {
  printInfo('\nGoodbye!');
  process.exit(0);
});

// Graceful shutdown
process.on('SIGINT', () => {
  process.stdout.write('\n');
  printInfo('Interrupted. Type /quit to exit.');
  rl.prompt();
});
