// Tool definitions and execution for the coding agent
// Inspired by OpenClaude's tool system — zero telemetry version

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'fs';
import { join, resolve, relative } from 'path';

// ─── Tool Definitions (OpenAI function-calling format) ────────────────────

export const TOOL_DEFINITIONS = [
  {
    type: 'function',
    function: {
      name: 'bash',
      description: 'Execute a shell command and return stdout/stderr. Use for running tests, builds, git commands, package managers, file operations, etc. Commands run in the current working directory.',
      parameters: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'The shell command to execute'
          },
          timeout: {
            type: 'number',
            description: 'Timeout in milliseconds (default: 30000)'
          }
        },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Read the contents of a file. Optionally specify a line range. Returns the file content as text.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Absolute or relative path to the file'
          },
          start_line: {
            type: 'number',
            description: 'Start line (1-based, inclusive). Omit to read from the beginning.'
          },
          end_line: {
            type: 'number',
            description: 'End line (1-based, inclusive). Omit to read to the end.'
          }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Create or overwrite a file with the given content. Creates parent directories if needed.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Absolute or relative path to the file'
          },
          content: {
            type: 'string',
            description: 'The full content to write to the file'
          }
        },
        required: ['path', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'edit_file',
      description: 'Replace an exact string occurrence in a file. The old_string must match exactly (including whitespace and indentation). Include enough context to uniquely identify the location.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Absolute or relative path to the file'
          },
          old_string: {
            type: 'string',
            description: 'The exact string to find and replace (must match exactly once)'
          },
          new_string: {
            type: 'string',
            description: 'The replacement string'
          }
        },
        required: ['path', 'old_string', 'new_string']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_dir',
      description: 'List the contents of a directory. Returns file/folder names with type indicators.',
      parameters: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'Absolute or relative path to the directory (default: current directory)'
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'grep',
      description: 'Search for a text pattern in files. Returns matching lines with file paths and line numbers.',
      parameters: {
        type: 'object',
        properties: {
          pattern: {
            type: 'string',
            description: 'The search pattern (supports regex)'
          },
          path: {
            type: 'string',
            description: 'Directory or file to search in (default: current directory)'
          },
          include: {
            type: 'string',
            description: 'Glob pattern for files to include (e.g., "*.ts", "*.py")'
          }
        },
        required: ['pattern']
      }
    }
  }
];

// ─── Tool Execution ───────────────────────────────────────────────────────

const MAX_OUTPUT = 50000; // 50KB max output per tool call

function truncateOutput(output, label = 'output') {
  if (output.length > MAX_OUTPUT) {
    return output.slice(0, MAX_OUTPUT) + `\n\n... [${label} truncated at ${MAX_OUTPUT} bytes]`;
  }
  return output;
}

function resolvePath(filePath, cwd) {
  if (!filePath) return cwd;
  // Security: prevent path traversal outside expected boundaries
  const resolved = resolve(cwd, filePath);
  return resolved;
}

// ─── Individual Tool Implementations ──────────────────────────────────────

function executeBash(args, cwd) {
  const { command, timeout = 30000 } = args;

  // Security: block obviously dangerous commands
  const dangerous = [
    /rm\s+-rf\s+\/(?!\w)/,  // rm -rf /
    /mkfs\./,                // mkfs
    /dd\s+if=.*of=\/dev/,   // dd to device
    /:\(\)\s*\{\s*:\|:&\s*\};\s*:/, // fork bomb
  ];
  for (const pattern of dangerous) {
    if (pattern.test(command)) {
      return { error: `Blocked: potentially dangerous command detected. Pattern: ${pattern}` };
    }
  }

  try {
    const isWindows = process.platform === 'win32';
    const shell = isWindows ? 'powershell.exe' : '/bin/bash';
    const shellArgs = isWindows ? ['-NoProfile', '-Command', command] : ['-c', command];

    const result = execSync(command, {
      cwd,
      timeout,
      maxBuffer: 1024 * 1024 * 10, // 10MB
      encoding: 'utf-8',
      shell,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env }
    });

    return { output: truncateOutput(result || '(no output)', 'stdout') };
  } catch (err) {
    const stdout = err.stdout || '';
    const stderr = err.stderr || '';
    const exitCode = err.status ?? 'unknown';
    let output = '';
    if (stdout) output += stdout;
    if (stderr) output += (output ? '\n' : '') + stderr;
    if (!output) output = err.message || 'Command failed';
    return {
      output: truncateOutput(output, 'command output'),
      exit_code: exitCode
    };
  }
}

function executeReadFile(args, cwd) {
  const { path: filePath, start_line, end_line } = args;
  const resolved = resolvePath(filePath, cwd);

  try {
    const content = readFileSync(resolved, 'utf-8');
    const lines = content.split('\n');

    if (start_line || end_line) {
      const start = Math.max(1, start_line || 1) - 1;
      const end = Math.min(lines.length, end_line || lines.length);
      const selected = lines.slice(start, end);
      const numbered = selected.map((line, i) => `${start + i + 1}: ${line}`);
      return { output: truncateOutput(numbered.join('\n'), 'file content') };
    }

    return { output: truncateOutput(content, 'file content') };
  } catch (err) {
    return { error: `Failed to read ${filePath}: ${err.message}` };
  }
}

function executeWriteFile(args, cwd) {
  const { path: filePath, content } = args;
  const resolved = resolvePath(filePath, cwd);

  try {
    // Create parent directories if needed
    const dir = resolve(resolved, '..');
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(resolved, content, 'utf-8');
    return { output: `File written: ${filePath} (${content.length} bytes)` };
  } catch (err) {
    return { error: `Failed to write ${filePath}: ${err.message}` };
  }
}

function executeEditFile(args, cwd) {
  const { path: filePath, old_string, new_string } = args;
  const resolved = resolvePath(filePath, cwd);

  try {
    const content = readFileSync(resolved, 'utf-8');
    const occurrences = content.split(old_string).length - 1;

    if (occurrences === 0) {
      return { error: `String not found in ${filePath}. Make sure old_string matches exactly.` };
    }
    if (occurrences > 1) {
      return { error: `Found ${occurrences} occurrences in ${filePath}. old_string must match exactly once. Add more context.` };
    }

    const newContent = content.replace(old_string, new_string);
    writeFileSync(resolved, newContent, 'utf-8');
    return { output: `File edited: ${filePath} (1 replacement made)` };
  } catch (err) {
    return { error: `Failed to edit ${filePath}: ${err.message}` };
  }
}

function executeListDir(args, cwd) {
  const { path: dirPath } = args;
  const resolved = resolvePath(dirPath, cwd);

  try {
    const entries = readdirSync(resolved, { withFileTypes: true });
    const formatted = entries.map(e => {
      const type = e.isDirectory() ? '📁' : '📄';
      return `${type} ${e.name}${e.isDirectory() ? '/' : ''}`;
    });
    return { output: formatted.join('\n') || '(empty directory)' };
  } catch (err) {
    return { error: `Failed to list ${dirPath || '.'}: ${err.message}` };
  }
}

function executeGrep(args, cwd) {
  const { pattern, path: searchPath, include } = args;
  const resolved = resolvePath(searchPath, cwd);

  try {
    // Try ripgrep first, fall back to grep
    const isWindows = process.platform === 'win32';
    let cmd;

    if (isWindows) {
      // Use PowerShell Select-String
      const includeArg = include ? `-Include "${include}"` : '';
      cmd = `Get-ChildItem -Recurse -File ${includeArg} "${resolved}" | Select-String -Pattern "${pattern}" | Select-Object -First 50 | ForEach-Object { "$($_.RelativePath):$($_.LineNumber): $($_.Line)" }`;
    } else {
      // Try rg first, then grep
      const includeArg = include ? `--glob "${include}"` : '';
      cmd = `rg --line-number --max-count=50 ${includeArg} "${pattern}" "${resolved}" 2>/dev/null || grep -rn --include="${include || '*'}" "${pattern}" "${resolved}" 2>/dev/null | head -50`;
    }

    const result = execSync(cmd, {
      cwd,
      timeout: 15000,
      maxBuffer: 1024 * 1024 * 5,
      encoding: 'utf-8',
      shell: isWindows ? 'powershell.exe' : '/bin/bash'
    });

    return { output: truncateOutput(result || '(no matches)', 'grep results') };
  } catch (err) {
    if (err.status === 1) {
      return { output: '(no matches found)' };
    }
    return { error: `Grep failed: ${err.message}` };
  }
}

// ─── Tool Router ──────────────────────────────────────────────────────────

export async function executeTool(name, args, cwd) {
  switch (name) {
    case 'bash':
      return executeBash(args, cwd);
    case 'read_file':
      return executeReadFile(args, cwd);
    case 'write_file':
      return executeWriteFile(args, cwd);
    case 'edit_file':
      return executeEditFile(args, cwd);
    case 'list_dir':
      return executeListDir(args, cwd);
    case 'grep':
      return executeGrep(args, cwd);
    default:
      return { error: `Unknown tool: ${name}` };
  }
}
