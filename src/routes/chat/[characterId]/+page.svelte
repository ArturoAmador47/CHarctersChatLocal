<script lang="ts">
  import { page } from '$app/state';
  import { tick, onMount, untrack } from 'svelte';
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

  // How far from the bottom still counts as "following the conversation".
  const AT_BOTTOM_SLACK_PX = 80;

  let inputText = $state('');
  let messagesEl = $state<HTMLElement | null>(null);
  let historyLoaded = $state(false);
  let atBottom = $state(true);

  onMount(async () => {
    if (characterId) {
      await chatStore.loadMessages(characterId);
      historyLoaded = true;
    }
  });

  function scrollToBottom(behavior: ScrollBehavior = 'smooth') {
    messagesEl?.scrollTo({ top: messagesEl.scrollHeight, behavior });
  }

  function handleScroll() {
    if (!messagesEl) return;
    const distance = messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight;
    atBottom = distance <= AT_BOTTOM_SLACK_PX;
  }

  // Follow new messages only while the user is already at the bottom, so
  // scrolling up to re-read history isn't yanked away mid-stream.
  $effect(() => {
    if (!messages.length) return;
    void messages;
    if (!untrack(() => atBottom)) return;
    tick().then(() => scrollToBottom('smooth'));
  });

  async function sendMessage() {
    if (!character || !inputText.trim() || isStreaming) return;
    const text = inputText;
    inputText = '';
    // Sending is an explicit action — always jump back to the live end.
    atBottom = true;
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
        <div class="chat__character-text">
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
    <div class="chat__messages" bind:this={messagesEl} onscroll={handleScroll}>
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

    <!-- Jump back to the newest message -->
    {#if !atBottom && messages.length > 0}
      <button
        class="chat__to-bottom"
        onclick={() => scrollToBottom('smooth')}
        type="button"
        title="Scroll to latest"
        aria-label="Scroll to latest message"
      >
        ↓
      </button>
    {/if}

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
    height: 100%;
    min-height: 0;
    overflow: hidden;
    position: relative;
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

    @include mobile {
      gap: $space-2;
      padding: $space-3 $space-4;
      padding-top: calc(#{$space-3} + env(safe-area-inset-top));
    }
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

    @include mobile {
      width: 34px;
      height: 34px;
      font-size: 1.2rem;
    }
  }

  .chat__character-avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  // Without min-width: 0 this flex child refuses to shrink, so the truncation
  // on the name/description below never kicks in and the text overflows.
  .chat__character-text {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
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

    @include mobile {
      font-size: 11px;
    }
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
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    // Bottom padding clears the floating input bar that overlays this pane.
    padding: $space-6 $space-6 104px;
    display: flex;
    flex-direction: column;
    gap: $space-4;
    scroll-behavior: smooth;

    @include mobile {
      padding: $space-4 $space-3;
      padding-bottom: calc(92px + env(safe-area-inset-bottom));
      gap: $space-3;
    }
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

    @include mobile {
      padding: $space-8 $space-4;
    }
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

  // Jump-to-latest button

  .chat__to-bottom {
    @include btn-reset;
    position: absolute;
    bottom: 112px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 25;
    width: 34px;
    height: 34px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-label);

    background: rgba(255, 255, 255, 0.62);
    backdrop-filter: blur(28px) saturate(1.9);
    -webkit-backdrop-filter: blur(28px) saturate(1.9);
    border: 1px solid rgba(255, 255, 255, 0.75);
    box-shadow:
      0 6px 20px rgba(0, 0, 0, 0.16),
      inset 0 1px 0 rgba(255, 255, 255, 0.85);
    transition: all $transition-fast;
    animation: toBottomIn 150ms ease-out;

    &:hover {
      background: $color-accent;
      color: #FFFFFF;
      border-color: transparent;
    }

    @include dark {
      background: rgba(44, 44, 48, 0.62);
      border-color: rgba(255, 255, 255, 0.14);
      box-shadow:
        0 6px 20px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);
    }

    @include mobile {
      bottom: calc(100px + env(safe-area-inset-bottom));
    }
  }

  @keyframes toBottomIn {
    from { opacity: 0; transform: translate(-50%, 6px); }
    to { opacity: 1; transform: translate(-50%, 0); }
  }

  // Input bar

  // Floats over the conversation so messages scroll behind the glass.
  .chat__input-bar {
    position: absolute;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 20;
    padding: $space-3 $space-6 $space-4;
    display: flex;
    flex-direction: column;
    gap: $space-2;
    pointer-events: none;

    // Soft scrim so text passing underneath never collides with the pill.
    &::before {
      content: '';
      position: absolute;
      inset: -$space-8 0 0;
      background: linear-gradient(
        to bottom,
        rgba(245, 245, 247, 0) 0%,
        rgba(245, 245, 247, 0.75) 55%,
        rgba(245, 245, 247, 0.95) 100%
      );
      pointer-events: none;
      z-index: -1;

      @include dark {
        background: linear-gradient(
          to bottom,
          rgba(0, 0, 0, 0) 0%,
          rgba(0, 0, 0, 0.75) 55%,
          rgba(0, 0, 0, 0.95) 100%
        );
      }
    }

    // Children stay interactive even though the bar itself lets clicks through.
    > * {
      pointer-events: auto;
    }

    @include mobile {
      padding: $space-3 $space-3;
      padding-bottom: calc(#{$space-3} + env(safe-area-inset-bottom));
    }
  }

  // Liquid glass pill, after the iOS Messages compose field.
  .chat__input-wrap {
    display: flex;
    align-items: flex-end;
    gap: $space-2;
    padding: $space-2 $space-2 $space-2 $space-4;
    border-radius: $radius-full;

    background: rgba(255, 255, 255, 0.62);
    backdrop-filter: blur(28px) saturate(1.9);
    -webkit-backdrop-filter: blur(28px) saturate(1.9);
    border: 1px solid rgba(255, 255, 255, 0.75);
    box-shadow:
      0 8px 28px rgba(0, 0, 0, 0.12),
      0 1px 2px rgba(0, 0, 0, 0.06),
      inset 0 1px 0 rgba(255, 255, 255, 0.85);
    transition: box-shadow $transition-normal, border-color $transition-normal;

    &:focus-within {
      border-color: rgba($color-accent, 0.55);
      box-shadow:
        0 10px 32px rgba(0, 0, 0, 0.16),
        0 0 0 3px rgba($color-accent, 0.16),
        inset 0 1px 0 rgba(255, 255, 255, 0.9);
    }

    @include dark {
      background: rgba(44, 44, 48, 0.58);
      border-color: rgba(255, 255, 255, 0.14);
      box-shadow:
        0 8px 28px rgba(0, 0, 0, 0.5),
        inset 0 1px 0 rgba(255, 255, 255, 0.1);

      &:focus-within {
        border-color: rgba($color-accent, 0.6);
        box-shadow:
          0 10px 32px rgba(0, 0, 0, 0.55),
          0 0 0 3px rgba($color-accent, 0.22),
          inset 0 1px 0 rgba(255, 255, 255, 0.12);
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

    // Keyboard shortcuts don't apply on a touch keyboard.
    @include mobile {
      display: none;
    }
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
