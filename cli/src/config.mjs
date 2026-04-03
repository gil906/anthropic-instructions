// Configuration: API key resolution and model selection
// Supports: GitHub Models, OpenAI, any OpenAI-compatible API
// Zero telemetry — nothing phones home

import { execSync } from 'child_process';

// ─── Provider Configurations ──────────────────────────────────────────────

const PROVIDERS = {
  'github': {
    name: 'GitHub Models',
    baseURL: 'https://models.inference.ai.azure.com',
    defaultModel: 'gpt-4o',
    envKey: 'GITHUB_TOKEN',
    resolveKey: resolveGitHubToken,
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'o4-mini', 'o3-mini', 'DeepSeek-R1']
  },
  'openai': {
    name: 'OpenAI',
    baseURL: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o',
    envKey: 'OPENAI_API_KEY',
    resolveKey: () => process.env.OPENAI_API_KEY,
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'o4-mini', 'o3-mini']
  },
  'ollama': {
    name: 'Ollama (local)',
    baseURL: 'http://localhost:11434/v1',
    defaultModel: 'qwen2.5-coder:7b',
    envKey: null,
    resolveKey: () => 'ollama',
    models: ['qwen2.5-coder:7b', 'llama3.2', 'codellama', 'deepseek-coder-v2']
  },
  'custom': {
    name: 'Custom OpenAI-compatible',
    baseURL: null,
    defaultModel: null,
    envKey: null,
    resolveKey: () => process.env.OPENAI_API_KEY || process.env.API_KEY,
    models: []
  }
};

// ─── GitHub Token Resolution ──────────────────────────────────────────────

function resolveGitHubToken() {
  // 1. Explicit env var
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;

  // 2. Try gh CLI auth (GitHub Copilot users will have this)
  try {
    const token = execSync('gh auth token', {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    if (token) return token;
  } catch {
    // gh not installed or not authenticated
  }

  return null;
}

// ─── Auto-detect Provider ─────────────────────────────────────────────────

export function detectProvider() {
  // Explicit provider selection via env
  const explicit = process.env.OPENCLAUDE_PROVIDER?.toLowerCase();
  if (explicit && PROVIDERS[explicit]) {
    return explicit;
  }

  // Custom endpoint
  if (process.env.OPENAI_BASE_URL || process.env.OPENCLAUDE_BASE_URL) {
    return 'custom';
  }

  // Auto-detect from available credentials
  if (process.env.OPENAI_API_KEY) return 'openai';
  if (process.env.GITHUB_TOKEN || process.env.GH_TOKEN) return 'github';

  // Try gh CLI
  try {
    execSync('gh auth token', { stdio: ['pipe', 'pipe', 'pipe'], timeout: 3000 });
    return 'github';
  } catch {
    // Not available
  }

  return null;
}

// ─── Resolve Full Config ──────────────────────────────────────────────────

export function resolveConfig() {
  const providerKey = detectProvider();

  if (!providerKey) {
    return {
      error: `No API credentials found. Set one of:
  - GITHUB_TOKEN (or run: gh auth login)   -> GitHub Models (free with Copilot)
  - OPENAI_API_KEY                          -> OpenAI
  - OPENAI_BASE_URL + OPENAI_API_KEY        -> Any OpenAI-compatible API
  - OPENCLAUDE_PROVIDER=ollama              -> Local Ollama

Run with --help for setup instructions.`
    };
  }

  const provider = PROVIDERS[providerKey];
  const apiKey = provider.resolveKey();

  if (!apiKey && providerKey !== 'ollama') {
    return {
      error: `${provider.name} selected but no API key found. Set ${provider.envKey} or authenticate via gh CLI.`
    };
  }

  const baseURL = process.env.OPENAI_BASE_URL
    || process.env.OPENCLAUDE_BASE_URL
    || provider.baseURL;

  const model = process.env.OPENCLAUDE_MODEL
    || process.env.OPENAI_MODEL
    || provider.defaultModel;

  return {
    provider: providerKey,
    providerName: provider.name,
    baseURL,
    apiKey,
    model,
    availableModels: provider.models
  };
}

// ─── Help Text ────────────────────────────────────────────────────────────

export const HELP_TEXT = `
openclaude-copilot — AI coding agent powered by GitHub Copilot / OpenAI
Based on OpenClaude (https://github.com/Gitlawb/openclaude)
Zero telemetry. Your data stays local.

USAGE:
  openclaude-copilot [options] [initial prompt]

OPTIONS:
  --help, -h              Show this help
  --model <model>         Override the model (e.g., gpt-4o, gpt-4.1)
  --provider <provider>   Force provider: github, openai, ollama, custom
  --version, -v           Show version

ENVIRONMENT VARIABLES:
  GITHUB_TOKEN            GitHub token (or use: gh auth login)
  OPENAI_API_KEY          OpenAI API key
  OPENAI_BASE_URL         Custom OpenAI-compatible endpoint
  OPENCLAUDE_MODEL        Override model name
  OPENCLAUDE_PROVIDER     Force provider selection

PROVIDERS:
  github    GitHub Models (free with GitHub Copilot subscription)
  openai    OpenAI API (requires API key)
  ollama    Local Ollama server (no API key needed)
  custom    Any OpenAI-compatible endpoint

QUICK SETUP (GitHub Copilot):
  gh auth login           # Authenticate with GitHub
  openclaude-copilot      # Auto-detects GitHub token

QUICK SETUP (OpenAI):
  export OPENAI_API_KEY=sk-your-key
  openclaude-copilot

QUICK SETUP (Ollama):
  ollama serve            # Start Ollama
  OPENCLAUDE_PROVIDER=ollama openclaude-copilot
`;
