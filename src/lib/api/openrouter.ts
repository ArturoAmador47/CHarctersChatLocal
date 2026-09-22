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

/** Turns an OpenRouter HTTP failure into something a user can act on. */
async function describeHttpError(res: Response, model: string): Promise<string> {
  let apiMessage = '';
  try {
    const body = await res.json();
    apiMessage = body?.error?.message ?? body?.message ?? '';
  } catch {
    // Non-JSON body — fall through to the status-based message.
  }

  switch (res.status) {
    // OpenRouter reports an unknown model id as 400, not 404.
    case 400:
      return apiMessage || 'OpenRouter rejected the request.';
    case 401:
      return 'Invalid or missing OpenRouter API key. Check API_KEY in your .env file.';
    case 402:
      return 'Your OpenRouter account is out of credits. Add credits to keep chatting.';
    case 403:
      return apiMessage || 'OpenRouter refused this request. The model may require extra access.';
    case 404:
      return `Model "${model}" is not available on OpenRouter. Pick another one in the character settings.`;
    case 408:
      return 'OpenRouter timed out. Try again.';
    case 429:
      return 'Rate limited by OpenRouter. Wait a few seconds and try again.';
    case 502:
    case 503:
      return `The provider behind "${model}" is unavailable right now. Try again or pick another model.`;
    default:
      return apiMessage
        ? `OpenRouter error (${res.status}): ${apiMessage}`
        : `OpenRouter returned HTTP ${res.status}.`;
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
    onError('No OpenRouter API key configured. Add API_KEY to your .env file and restart the dev server.');
    return;
  }

  if (!model) {
    onError('This character has no model selected. Edit the character and pick one.');
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
    if (err instanceof DOMException && err.name === 'AbortError') {
      onDone();
      return;
    }
    onError("Couldn't reach OpenRouter. Check your internet connection and try again.");
    return;
  }

  if (!res.ok) {
    onError(await describeHttpError(res, model));
    return;
  }

  const reader = res.body?.getReader();
  if (!reader) {
    onError('OpenRouter returned an empty response.');
    return;
  }

  const decoder = new TextDecoder();
  let buffer = '';
  let streamError = '';

  try {
    stream: while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ')) continue;

        const data = trimmed.slice(6);
        if (data === '[DONE]') break stream;

        try {
          const parsed = JSON.parse(data);
          // Providers can report a mid-stream failure instead of closing.
          if (parsed.error) {
            streamError = parsed.error.message ?? 'The model stopped mid-response.';
            break stream;
          }
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) onChunk(content);
        } catch {
          // Skip malformed JSON chunks (e.g. OpenRouter keep-alive comments)
        }
      }
    }
  } catch (err: unknown) {
    if (!(err instanceof DOMException && err.name === 'AbortError')) {
      streamError = 'The connection to OpenRouter dropped mid-response.';
    }
  } finally {
    reader.releaseLock();
    if (streamError) onError(streamError);
    else onDone();
  }
}
