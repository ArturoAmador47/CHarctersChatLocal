import { getStorage } from '$lib/db';
import { streamChat } from '$lib/api/openrouter';
import { generateImage } from '$lib/api/comfyui';
import { parseImageIntent, stripImageMarkers } from '$lib/utils/imageIntentParser';
import { comfyuiStore } from '$lib/stores/comfyui.svelte';
import type { Character, ChatMessage } from '$lib/types';

function createChatStore() {
  // messages keyed by characterId — loaded lazily on first access
  let sessions = $state<Record<string, ChatMessage[]>>({});
  let loadedFor = $state<Set<string>>(new Set());
  let streaming = $state(false);
  let streamingCharacterId = $state<string | null>(null);
  let abortController = $state<AbortController | null>(null);

  // Image generation state
  let imageGenerating = $state(false);
  let imageProgress = $state(0);
  let generatingMessageId = $state<string | null>(null);

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

  // Helper to update a specific message's image state
  async function updateMessageImage(
    characterId: string,
    messageId: string,
    imageUpdate: Partial<Pick<ChatMessage, 'imageUrl' | 'imageStatus' | 'imageProgress'>>
  ) {
    const db = await getStorage();
    const msgs = [...(sessions[characterId] ?? [])];
    const idx = msgs.findIndex(m => m.id === messageId);
    if (idx >= 0) {
      msgs[idx] = { ...msgs[idx], ...imageUpdate };
      sessions = { ...sessions, [characterId]: msgs };
      // Persist the updated message
      await db.appendMessage(characterId, msgs[idx]);
    }
  }

  // Trigger image generation for a message
  async function generateImageForMessage(characterId: string, messageId: string, prompt: string) {
    if (!comfyuiStore.isConnected) {
      await updateMessageImage(characterId, messageId, {
        imageStatus: 'error',
        imageProgress: 0
      });
      return;
    }

    imageGenerating = true;
    imageProgress = 0;
    generatingMessageId = messageId;

    await generateImage({
      prompt,
      config: comfyuiStore.config,
      onProgress: (percent) => {
        imageProgress = percent;
        updateMessageImage(characterId, messageId, { imageProgress: percent });
      },
      onComplete: async (imageBase64) => {
        await updateMessageImage(characterId, messageId, {
          imageUrl: imageBase64,
          imageStatus: 'complete',
          imageProgress: 100
        });
        imageGenerating = false;
        imageProgress = 0;
        generatingMessageId = null;
      },
      onError: async (error) => {
        console.error('Image generation failed:', error);
        await updateMessageImage(characterId, messageId, {
          imageStatus: 'error',
          imageProgress: 0
        });
        imageGenerating = false;
        imageProgress = 0;
        generatingMessageId = null;
      }
    });
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
        // Check for image intent in the response
        const parsed = parseImageIntent(accumulatedContent);

        if (parsed.hasImageIntent && parsed.imageIntent) {
          // Clean the text content (remove image marker)
          const cleanContent = stripImageMarkers(accumulatedContent);

          // Persist the text message with image generating status
          const finalMsg: ChatMessage = {
            ...assistantMsg,
            content: cleanContent,
            imageStatus: 'generating',
            imagePrompt: parsed.imageIntent.prompt,
            imageProgress: 0
          };
          await db.appendMessage(character.id, finalMsg);

          // Sync in-memory
          const msgs = [...(sessions[character.id] ?? [])];
          const lastIdx = msgs.findLastIndex(m => m.id === assistantMsg.id);
          if (lastIdx >= 0) msgs[lastIdx] = finalMsg;
          sessions = { ...sessions, [character.id]: msgs };

          streaming = false;
          streamingCharacterId = null;
          abortController = null;

          // Trigger image generation (async, don't await)
          generateImageForMessage(character.id, assistantMsg.id, parsed.imageIntent.prompt);
        } else {
          // No image intent, just persist the text message
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
        }
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
    // Image generation state
    get imageGenerating() { return imageGenerating; },
    get imageProgress() { return imageProgress; },
    get generatingMessageId() { return generatingMessageId; },
    getMessages,
    loadMessages,
    clearSession,
    send,
    stopStreaming
  };
}

export const chatStore = createChatStore();
