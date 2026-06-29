<script lang="ts">
  import { page } from '$app/state';
  import { tick, onMount } from 'svelte';
  import { characterStore } from '$lib/stores/characters.svelte';
  import { chatStore } from '$lib/stores/chat.svelte';
  import MessageBubble from '$lib/components/MessageBubble.svelte';

  const characterId = $derived(page.params.characterId ?? '');
  const character = $derived(characterStore.getById(characterId));

  // Reactive: updates automatically as streaming appends chunks
  const messages = $derived(
    (chatStore.sessions[characterId] ?? []).filter(m => m.role !== 'system')
  );
  const isStreaming = $derived(!!characterId && chatStore.streamingCharacterId === characterId);

  let inputText = $state('');
  let messagesEl = $state<HTMLElement | null>(null);
  let historyLoaded = $state(false);

  onMount(async () => {
    if (characterId) {
      await chatStore.loadMessages(characterId);
      historyLoaded = true;
    }
  });

  // Auto-scroll when messages change
  $effect(() => {
    if (messages.length) {
      tick().then(() => {
        messagesEl?.scrollTo({ top: messagesEl.scrollHeight, behavior: 'smooth' });
      });
    }
  });

  async function sendMessage() {
    if (!character || !inputText.trim() || isStreaming) return;
    const text = inputText;
    inputText = '';
    await chatStore.send(character, text);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }
</script>

{#if !character}
  <div class="not-found">
    <p>Character not found.</p>
    <a href="/characters">← Characters</a>
  </div>
{:else}
  <div class="chat">
    <!-- Chat header -->
    <header class="chat__header">
      <a href="/chat" class="chat__back">‹</a>
      <div class="chat__character">
        <div
          class="chat__character-avatar"
          style="background-color: {character.avatarColor}20"
        >
          {#if character.avatarImage}
            <img src={character.avatarImage} alt={character.name} class="chat__character-avatar-img" />
          {:else}
            {character.avatar}
          {/if}
        </div>
        <div>
          <h2 class="chat__character-name">{character.name}</h2>
          {#if character.description}
            <p class="chat__character-desc">{character.description}</p>
          {/if}
        </div>
      </div>
      <div class="chat__header-actions">
        <button
          class="chat__clear"
          onclick={() => chatStore.clearSession(characterId)}
          title="Clear chat"
          type="button"
        >
          🗑
        </button>
        <a href="/characters/{characterId}" class="chat__edit" title="Edit character">
          ✎
        </a>
      </div>
    </header>

    <!-- Messages -->
    <div class="chat__messages" bind:this={messagesEl}>
      {#if messages.length === 0}
        <div class="chat__empty">
          <div class="chat__empty-avatar" style="background-color: {character.avatarColor}20">
            {#if character.avatarImage}
              <img src={character.avatarImage} alt={character.name} class="chat__empty-avatar-img" />
            {:else}
              {character.avatar}
            {/if}
          </div>
          <h3 class="chat__empty-title">Start a conversation</h3>
          <p class="chat__empty-sub">
            Say hello to <strong>{character.name}</strong>
            {#if character.description} — {character.description}{/if}
          </p>
        </div>
      {:else}
        {#each messages as message, i (message.id)}
          <MessageBubble
            {message}
            characterAvatar={character.avatar}
            characterAvatarImage={character.avatarImage ?? ''}
            characterColor={character.avatarColor}
            isStreaming={isStreaming && i === messages.length - 1 && message.role === 'assistant'}
          />
        {/each}
      {/if}
    </div>

    <!-- Input bar -->
    <div class="chat__input-bar">
      <div class="chat__input-wrap">
        <textarea
          class="chat__input"
          placeholder="Message {character.name}…"
          bind:value={inputText}
          onkeydown={handleKeydown}
          rows={1}
          disabled={isStreaming}
        ></textarea>
        {#if isStreaming}
          <button
            class="chat__stop"
            onclick={() => chatStore.stopStreaming()}
            type="button"
            title="Stop generating"
          >
            ⏹
          </button>
        {:else}
          <button
            class="chat__send"
            onclick={sendMessage}
            disabled={!inputText.trim()}
            type="button"
            title="Send"
          >
            ↑
          </button>
        {/if}
      </div>
      <p class="chat__hint">Enter to send · Shift+Enter for new line</p>
    </div>
  </div>
{/if}

<style lang="scss">
  @use 'sass:color';
  @use '$lib/styles/variables' as *;
  @use '$lib/styles/mixins' as *;

  .chat {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100dvh;
    overflow: hidden;
  }

  // Header

  .chat__header {
    @include glass;
    display: flex;
    align-items: center;
    gap: $space-4;
    padding: $space-4 $space-6;
    border-bottom: 1px solid var(--color-separator);
    flex-shrink: 0;
  }

  .chat__back {
    font-size: 1.8rem;
    font-weight: 300;
    color: $color-accent;
    text-decoration: none;
    line-height: 1;
    flex-shrink: 0;
    transition: opacity $transition-fast;

    &:hover { opacity: 0.7; }
  }

  .chat__character {
    display: flex;
    align-items: center;
    gap: $space-3;
    flex: 1;
    min-width: 0;
  }

  .chat__character-avatar {
    width: 40px;
    height: 40px;
    border-radius: $radius-md;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
    flex-shrink: 0;
    overflow: hidden;
  }

  .chat__character-avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .chat__character-name {
    margin: 0;
    font-size: $fs-headline;
    font-weight: 600;
    color: var(--color-label);
    @include truncate;
  }

  .chat__character-desc {
    margin: 0;
    font-size: $fs-caption;
    color: var(--color-label-secondary);
    @include truncate;
  }

  .chat__header-actions {
    display: flex;
    gap: $space-2;
    flex-shrink: 0;
  }

  .chat__clear,
  .chat__edit {
    @include btn-reset;
    width: 36px;
    height: 36px;
    border-radius: $radius-md;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    color: var(--color-label-secondary);
    text-decoration: none;
    transition: all $transition-fast;

    &:hover {
      background: var(--color-fill);
      color: var(--color-label);
    }
  }

  // Messages

  .chat__messages {
    flex: 1;
    overflow-y: auto;
    padding: $space-6;
    display: flex;
    flex-direction: column;
    gap: $space-4;
    scroll-behavior: smooth;
  }

  .chat__empty {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: $space-4;
    padding: $space-16 $space-8;
  }

  .chat__empty-avatar {
    width: 72px;
    height: 72px;
    border-radius: $radius-xl;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    overflow: hidden;
  }

  .chat__empty-avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .chat__empty-title {
    margin: 0;
    font-size: $fs-title-3;
    font-weight: 700;
    color: var(--color-label);
  }

  .chat__empty-sub {
    margin: 0;
    font-size: $fs-callout;
    color: var(--color-label-secondary);
    max-width: 300px;
    line-height: 1.5;
  }

  // Input bar

  .chat__input-bar {
    @include glass;
    border-top: 1px solid var(--color-separator);
    padding: $space-4 $space-6;
    display: flex;
    flex-direction: column;
    gap: $space-2;
    flex-shrink: 0;
  }

  .chat__input-wrap {
    display: flex;
    align-items: flex-end;
    gap: $space-3;
    background: var(--color-fill);
    border: 1.5px solid transparent;
    border-radius: $radius-xl;
    padding: $space-2 $space-3;
    transition: all $transition-fast;

    &:focus-within {
      background: var(--color-surface);
      border-color: $color-accent;
      box-shadow: 0 0 0 3px rgba($color-accent, 0.18);
    }

    @include dark {
      background: rgba(120, 120, 128, 0.36);

      &:focus-within {
        background: #2C2C2E;
      }
    }
  }

  .chat__input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    font-family: $font-sans;
    font-size: $fs-callout;
    color: var(--color-label);
    resize: none;
    padding: $space-2 0;
    line-height: 1.5;
    max-height: 150px;

    &::placeholder { color: var(--color-label-tertiary); }
    &:disabled { opacity: 0.5; cursor: not-allowed; }
  }

  .chat__send,
  .chat__stop {
    @include btn-reset;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    font-weight: 700;
    flex-shrink: 0;
    margin-bottom: 2px;
    transition: all $transition-fast;
  }

  .chat__send {
    background: $color-accent;
    color: #FFFFFF;

    &:disabled {
      background: var(--color-fill);
      color: var(--color-label-tertiary);
    }

    &:not(:disabled):hover {
      background: color.adjust($color-accent, $lightness: -8%);
      transform: scale(1.05);
    }
  }

  .chat__stop {
    background: rgba($color-accent-red, 0.12);
    color: $color-accent-red;

    &:hover {
      background: $color-accent-red;
      color: #FFFFFF;
    }
  }

  .chat__hint {
    margin: 0;
    font-size: $fs-caption;
    color: var(--color-label-quaternary);
    text-align: center;
  }

  // Not found

  .not-found {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: $space-4;
    color: var(--color-label-secondary);

    a { color: $color-accent; text-decoration: none; }
  }
</style>
