// Agent: the core conversation loop with tool calling
// Implements the KAIROS-style autonomous agent pattern from the Claude Code leak
// Zero telemetry — nothing phones home

import OpenAI from 'openai';
import { TOOL_DEFINITIONS, executeTool } from './tools.mjs';
import { buildSystemPrompt } from './prompt.mjs';

// ─── Agent Class ──────────────────────────────────────────────────────────

export class Agent {
  constructor(config) {
    this.config = config;
    this.client = new OpenAI({
      apiKey: config.apiKey,
      baseURL: config.baseURL,
    });
    this.model = config.model;
    this.cwd = process.cwd();
    this.messages = [];
    this.totalTokens = 0;

    // Initialize with system prompt
    this.messages.push({
      role: 'system',
      content: buildSystemPrompt(this.cwd, `${process.platform} (${process.arch})`)
    });
  }

  // ─── Send message and handle the full tool-calling loop ───────────────

  async chat(userMessage, { onText, onToolCall, onToolResult, onError, onDone }) {
    // Add user message
    this.messages.push({ role: 'user', content: userMessage });

    let iteration = 0;
    const MAX_ITERATIONS = 25; // Safety limit for tool-calling loops

    while (iteration < MAX_ITERATIONS) {
      iteration++;

      try {
        // Stream the response
        const response = await this._streamCompletion({ onText, onError });

        if (!response) {
          onError?.('No response from API');
          break;
        }

        // Check if the model wants to call tools
        if (response.tool_calls && response.tool_calls.length > 0) {
          // Add assistant message with tool calls
          this.messages.push({
            role: 'assistant',
            content: response.content || null,
            tool_calls: response.tool_calls
          });

          // Execute all tool calls
          for (const toolCall of response.tool_calls) {
            const { name, arguments: argsStr } = toolCall.function;
            let args;

            try {
              args = JSON.parse(argsStr);
            } catch {
              args = { error: `Invalid JSON arguments: ${argsStr}` };
            }

            onToolCall?.({ name, args, id: toolCall.id });

            // Execute the tool
            const result = await executeTool(name, args, this.cwd);
            const resultStr = result.error
              ? `Error: ${result.error}`
              : result.output || '(no output)';

            onToolResult?.({ name, result: resultStr, id: toolCall.id });

            // Add tool result to messages
            this.messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: resultStr
            });
          }

          // Continue the loop — model will process tool results
          continue;
        }

        // No tool calls — model is done, break the loop
        onDone?.({ iterations: iteration, tokens: this.totalTokens });
        break;

      } catch (err) {
        if (err.status === 429) {
          onError?.('Rate limited. Waiting 5 seconds...');
          await new Promise(r => setTimeout(r, 5000));
          continue;
        }
        onError?.(`API Error: ${err.message}`);
        break;
      }
    }

    if (iteration >= MAX_ITERATIONS) {
      onError?.(`Reached maximum tool-calling iterations (${MAX_ITERATIONS}). Stopping.`);
    }
  }

  // ─── Stream a single completion ───────────────────────────────────────

  async _streamCompletion({ onText, onError }) {
    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages: this.messages,
        tools: TOOL_DEFINITIONS,
        stream: true,
        temperature: 0.1,
        max_tokens: 16384,
      });

      let content = '';
      const toolCalls = [];
      let currentToolCall = null;

      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta;
        if (!delta) continue;

        // Usage tracking
        if (chunk.usage) {
          this.totalTokens += chunk.usage.total_tokens || 0;
        }

        // Text content
        if (delta.content) {
          content += delta.content;
          onText?.(delta.content);
        }

        // Tool calls (streaming)
        if (delta.tool_calls) {
          for (const tc of delta.tool_calls) {
            if (tc.index !== undefined) {
              while (toolCalls.length <= tc.index) {
                toolCalls.push({ id: '', function: { name: '', arguments: '' } });
              }
              const existing = toolCalls[tc.index];

              if (tc.id) existing.id = tc.id;
              if (tc.function?.name) existing.function.name += tc.function.name;
              if (tc.function?.arguments) existing.function.arguments += tc.function.arguments;
            }
          }
        }
      }

      const hasToolCalls = toolCalls.length > 0 && toolCalls.some(tc => tc.function.name);

      return {
        content: content || null,
        tool_calls: hasToolCalls ? toolCalls.filter(tc => tc.function.name) : null
      };
    } catch (err) {
      // If streaming fails, try non-streaming
      if (err.message?.includes('stream') || err.message?.includes('SSE')) {
        return this._nonStreamCompletion({ onText });
      }
      throw err;
    }
  }

  // ─── Non-streaming fallback ───────────────────────────────────────────

  async _nonStreamCompletion({ onText }) {
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages: this.messages,
      tools: TOOL_DEFINITIONS,
      temperature: 0.1,
      max_tokens: 16384,
    });

    const choice = response.choices?.[0];
    if (!choice) return null;

    if (response.usage) {
      this.totalTokens += response.usage.total_tokens || 0;
    }

    if (choice.message?.content) {
      onText?.(choice.message.content);
    }

    return {
      content: choice.message?.content || null,
      tool_calls: choice.message?.tool_calls?.length > 0
        ? choice.message.tool_calls
        : null
    };
  }

  // ─── Conversation management ──────────────────────────────────────────

  getMessageCount() {
    return this.messages.length;
  }

  clearHistory() {
    const systemMsg = this.messages[0];
    this.messages = [systemMsg];
    this.totalTokens = 0;
  }

  setCwd(newCwd) {
    this.cwd = newCwd;
  }
}
