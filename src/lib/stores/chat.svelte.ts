import { getStorage } from '$lib/db';
import { streamChat } from '$lib/api/lmstudio';
import type { Character, ChatMessage } from '$lib/types';

function createChatStore() {
  // messages keyed by characterId — loaded lazily on first access
  let sessions = $state<Record<string, ChatMessage[]>>({});
  let loadedFor = $state<Set<string>>(new Set());
  let streaming = $state(false);
  let streamingCharacterId = $state<string | null>(null);
  let abortController = $state<AbortController | null>(null);

  async function ensureLoaded(characterId: string) {
    if (loadedFor.has(characterId)) return;
    const db = await getStorage();
    const msgs = await db.getMessages(characterId, 200);
    sessions = { ...sessions, [characterId]: msgs };
    loadedFor = new Set([...loadedFor, characterId]);
  }

  function getMessages(characterId: string): ChatMessage[] {
    return sessions[characterId] ?? [];
  }

  async function loadMessages(characterId: string): Promise<ChatMessage[]> {
    await ensureLoaded(characterId);
    return sessions[characterId] ?? [];
  }

  async function clearSession(characterId: string) {
    const db = await getStorage();
    await db.deleteMessages(characterId);
    sessions = { ...sessions, [characterId]: [] };
  }

  async function send(character: Character, userText: string) {
    if (streaming) return;
    await ensureLoaded(character.id);

    const db = await getStorage();
    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: userText.trim(),
      timestamp: new Date().toISOString()
    };

    // Persist user message immediately
    await db.appendMessage(character.id, userMsg);
    sessions = { ...sessions, [character.id]: [...(sessions[character.id] ?? []), userMsg] };

    // Build context window for the API call
    const history = (sessions[character.id] ?? [])
      .filter(m => m.role !== 'system')
      .slice(-character.contextMessages * 2);

    const systemMsg: ChatMessage = {
      id: 'sys',
      role: 'system',
      content: character.systemPrompt || `You are ${character.name}. ${character.personality}`,
      timestamp: new Date().toISOString()
    };

    // Placeholder assistant message (streamed into)
    const assistantMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString()
    };
    sessions = { ...sessions, [character.id]: [...sessions[character.id], assistantMsg] };

    streaming = true;
    streamingCharacterId = character.id;
    abortController = new AbortController();

    let accumulatedContent = '';

    await streamChat({
      model: character.model,
      messages: [systemMsg, ...history],
      temperature: character.temperature,
      maxTokens: character.maxTokens,
      signal: abortController.signal,

      onChunk(text) {
        accumulatedContent += text;
        const msgs = [...(sessions[character.id] ?? [])];
        const lastIdx = msgs.length - 1;
        if (msgs[lastIdx]?.role === 'assistant') {
          msgs[lastIdx] = { ...msgs[lastIdx], content: accumulatedContent };
        }
        sessions = { ...sessions, [character.id]: msgs };
      },

      async onDone() {
        // Persist the complete assistant message
        const finalMsg = { ...assistantMsg, content: accumulatedContent };
        await db.appendMessage(character.id, finalMsg);
        // Sync in-memory with final state
        const msgs = [...(sessions[character.id] ?? [])];
        const lastIdx = msgs.findLastIndex(m => m.id === assistantMsg.id);
        if (lastIdx >= 0) msgs[lastIdx] = finalMsg;
        sessions = { ...sessions, [character.id]: msgs };

        streaming = false;
        streamingCharacterId = null;
        abortController = null;
      },

      async onError(error) {
        const errorMsg = `⚠️ Error: ${error}`;
        const msgs = [...(sessions[character.id] ?? [])];
        const lastIdx = msgs.length - 1;
        if (msgs[lastIdx]?.role === 'assistant' && msgs[lastIdx].content === '') {
          msgs[lastIdx] = { ...msgs[lastIdx], content: errorMsg };
          await db.appendMessage(character.id, msgs[lastIdx]);
        }
        sessions = { ...sessions, [character.id]: msgs };
        streaming = false;
        streamingCharacterId = null;
        abortController = null;
      }
    });
  }

  function stopStreaming() {
    abortController?.abort();
  }

  return {
    get streaming() { return streaming; },
    get streamingCharacterId() { return streamingCharacterId; },
    /** Reactive sessions map — use in $derived for automatic updates */
    get sessions() { return sessions; },
    getMessages,
    loadMessages,
    clearSession,
    send,
    stopStreaming
  };
}

export const chatStore = createChatStore();
