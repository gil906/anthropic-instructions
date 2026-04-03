// Terminal UI: colors, formatting, input handling
// No external dependencies — uses ANSI escape codes directly

// ─── ANSI Colors ──────────────────────────────────────────────────────────

const ESC = '\x1b[';

export const colors = {
  reset: `${ESC}0m`,
  bold: `${ESC}1m`,
  dim: `${ESC}2m`,
  italic: `${ESC}3m`,
  underline: `${ESC}4m`,

  red: (s) => `${ESC}31m${s}${ESC}0m`,
  green: (s) => `${ESC}32m${s}${ESC}0m`,
  yellow: (s) => `${ESC}33m${s}${ESC}0m`,
  blue: (s) => `${ESC}34m${s}${ESC}0m`,
  magenta: (s) => `${ESC}35m${s}${ESC}0m`,
  cyan: (s) => `${ESC}36m${s}${ESC}0m`,
  gray: (s) => `${ESC}90m${s}${ESC}0m`,
  white: (s) => `${ESC}97m${s}${ESC}0m`,

  bgBlue: (s) => `${ESC}44m${ESC}97m ${s} ${ESC}0m`,
  bgGreen: (s) => `${ESC}42m${ESC}97m ${s} ${ESC}0m`,
  bgRed: (s) => `${ESC}41m${ESC}97m ${s} ${ESC}0m`,
  bgYellow: (s) => `${ESC}43m${ESC}30m ${s} ${ESC}0m`,
  bgMagenta: (s) => `${ESC}45m${ESC}97m ${s} ${ESC}0m`,
};

// ─── UI Components ────────────────────────────────────────────────────────

export function printBanner(config) {
  const banner = `
${colors.magenta('╔══════════════════════════════════════════════════════════════╗')}
${colors.magenta('║')}  ${colors.bold(colors.white('OpenClaude Copilot'))} — AI Coding Agent                      ${colors.magenta('║')}
${colors.magenta('║')}  ${colors.gray('Based on OpenClaude • Anthropic Employee-Level Rules')}       ${colors.magenta('║')}
${colors.magenta('║')}  ${colors.gray('Zero telemetry • Your data stays local')}                     ${colors.magenta('║')}
${colors.magenta('╚══════════════════════════════════════════════════════════════╝')}

  ${colors.gray('Provider:')} ${colors.cyan(config.providerName)}
  ${colors.gray('Model:   ')} ${colors.cyan(config.model)}
  ${colors.gray('CWD:     ')} ${colors.cyan(process.cwd())}

  ${colors.gray('Type your prompt and press Enter. Commands:')}
  ${colors.gray('/help  /clear  /model <name>  /quit')}
`;
  process.stdout.write(banner);
}

export function printToolCall(name, args) {
  const icon = {
    bash: '⚡',
    read_file: '📖',
    write_file: '✏️',
    edit_file: '🔧',
    list_dir: '📁',
    grep: '🔍'
  }[name] || '🔨';

  let summary;
  switch (name) {
    case 'bash':
      summary = args.command?.length > 80
        ? args.command.slice(0, 80) + '...'
        : args.command;
      break;
    case 'read_file':
      summary = args.path + (args.start_line ? ` (lines ${args.start_line}-${args.end_line || 'end'})` : '');
      break;
    case 'write_file':
      summary = `${args.path} (${args.content?.length || 0} bytes)`;
      break;
    case 'edit_file':
      summary = args.path;
      break;
    case 'list_dir':
      summary = args.path || '.';
      break;
    case 'grep':
      summary = `"${args.pattern}" in ${args.path || '.'}`;
      break;
    default:
      summary = JSON.stringify(args).slice(0, 80);
  }

  process.stdout.write(`\n${colors.yellow(`${icon} ${name}`)}: ${colors.gray(summary)}\n`);
}

export function printToolResult(name, result) {
  // Show first few lines of output
  const lines = result.split('\n');
  const preview = lines.slice(0, 10).join('\n');
  const more = lines.length > 10 ? `\n${colors.gray(`  ... (${lines.length - 10} more lines)`)}` : '';

  process.stdout.write(`${colors.gray(preview)}${more}\n`);
}

export function printError(message) {
  process.stdout.write(`\n${colors.red('✗ Error:')} ${message}\n`);
}

export function printInfo(message) {
  process.stdout.write(`${colors.gray(message)}\n`);
}

export function printDivider() {
  process.stdout.write(`${colors.gray('─'.repeat(60))}\n`);
}

// ─── Prompt ───────────────────────────────────────────────────────────────

export function getPrompt() {
  return `\n${colors.green('❯')} `;
}

// ─── Spinner ──────────────────────────────────────────────────────────────

const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export class Spinner {
  constructor(text = 'Thinking') {
    this.text = text;
    this.frame = 0;
    this.interval = null;
  }

  start() {
    this.interval = setInterval(() => {
      const frame = SPINNER_FRAMES[this.frame % SPINNER_FRAMES.length];
      process.stdout.write(`\r${colors.magenta(frame)} ${colors.gray(this.text)}   `);
      this.frame++;
    }, 80);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      process.stdout.write('\r' + ' '.repeat(this.text.length + 10) + '\r');
    }
  }
}
