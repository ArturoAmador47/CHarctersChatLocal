import type { ChatMessage, OpenRouterModel } from '$lib/types';

const BASE_URL = 'https://openrouter.ai/api/v1';

function authHeaders(): Record<string, string> {
  const apiKey = import.meta.env.API_KEY as string | undefined;
  return {
    ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    'X-Title': 'ChatCharacters'
  };
}

export async function fetchModels(): Promise<OpenRouterModel[]> {
  const res = await fetch(`${BASE_URL}/models`, {
    headers: authHeaders(),
    signal: AbortSignal.timeout(5000)
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.data as OpenRouterModel[];
}

export async function checkConnection(): Promise<boolean> {
  try {
    await fetchModels();
    return true;
  } catch {
    return false;
  }
}

export interface StreamChatOptions {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  onChunk: (text: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
  signal?: AbortSignal;
}

export async function streamChat(opts: StreamChatOptions): Promise<void> {
  const { model, messages, temperature = 0.7, maxTokens = 2048, onChunk, onDone, onError, signal } = opts;

  const apiKey = import.meta.env.API_KEY as string | undefined;
  if (!apiKey) {
    onError('Missing OpenRouter API key (set API_KEY in .env)');
    return;
  }

  const payload = messages.map((m) => ({ role: m.role, content: m.content }));

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({
        model,
        messages: payload,
        temperature,
        max_tokens: maxTokens,
        stream: true
      }),
      signal
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Connection failed';
    onError(msg);
    return;
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    onError(`OpenRouter error: HTTP ${res.status}${body ? ` — ${body}` : ''}`);
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    onError('No response body');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') {
          onDone();
          return;
        }

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onChunk(content);
        } catch {
          // Skip malformed JSON chunks (e.g. OpenRouter keep-alive comments)
        }
      }
    }
  } finally {
    reader.releaseLock();
    onDone();
  }
}
