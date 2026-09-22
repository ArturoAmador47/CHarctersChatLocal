<script lang="ts">
  import type { ChatMessage } from '$lib/types';

  let {
    message,
    characterAvatar = '🤖',
    characterAvatarImage = '',
    characterColor = '#007AFF',
    isStreaming = false
  }: {
    message: ChatMessage;
    characterAvatar?: string;
    characterAvatarImage?: string;
    characterColor?: string;
    isStreaming?: boolean;
  } = $props();

  let imageExpanded = $state(false);

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  function toggleImageExpand() {
    imageExpanded = !imageExpanded;
  }
</script>

<div class="bubble" class:bubble--user={message.role === 'user'} class:bubble--assistant={message.role === 'assistant'}>
  {#if message.role === 'assistant'}
    <div class="bubble__avatar" style="background-color: {characterColor}20">
      {#if characterAvatarImage}
        <img src={characterAvatarImage} alt="avatar" class="bubble__avatar-img" />
      {:else}
        <span>{characterAvatar}</span>
      {/if}
    </div>
  {/if}

  <div class="bubble__content">
    {#if message.content}
      <div class="bubble__text" class:bubble__text--streaming={isStreaming && message.role === 'assistant'}>
        {message.content}
        {#if isStreaming && message.role === 'assistant'}
          <span class="bubble__cursor"></span>
        {/if}
      </div>
    {/if}

    <!-- Image generation states -->
    {#if message.imageStatus === 'generating'}
      <div class="bubble__image-generating">
        <div class="bubble__image-spinner"></div>
        <div class="bubble__image-progress">
          <div class="bubble__image-progress-bar" style="width: {message.imageProgress ?? 0}%"></div>
        </div>
        <span class="bubble__image-status">Generating image... {message.imageProgress ?? 0}%</span>
      </div>
    {:else if message.imageStatus === 'complete' && message.imageUrl}
      <button class="bubble__image-container" onclick={toggleImageExpand} type="button">
        <img src={message.imageUrl} alt={message.imagePrompt ?? 'Generated image'} class="bubble__image" />
      </button>
    {:else if message.imageStatus === 'error'}
      <div class="bubble__image-error">
        <span>Failed to generate image</span>
        {#if message.imagePrompt}
          <span class="bubble__image-prompt">"{message.imagePrompt}"</span>
        {/if}
      </div>
    {/if}

    <div class="bubble__time">{formatTime(message.timestamp)}</div>
  </div>
</div>

<!-- Expanded image modal -->
{#if imageExpanded && message.imageUrl}
  <button class="bubble__image-modal" onclick={toggleImageExpand} type="button">
    <div class="bubble__image-modal-content">
      <img src={message.imageUrl} alt={message.imagePrompt ?? 'Generated image'} />
      <button class="bubble__image-modal-close" onclick={toggleImageExpand} type="button">
        Close
      </button>
    </div>
  </button>
{/if}

<style lang="scss">
  @use '$lib/styles/variables' as *;
  @use '$lib/styles/mixins' as *;

  .bubble {
    display: flex;
    gap: $space-3;
    max-width: 80%;
    align-items: flex-end;
    animation: fadeIn 200ms ease-out;

    &--user {
      flex-direction: row-reverse;
      margin-left: auto;
    }

    &--assistant {
      margin-right: auto;
    }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .bubble__avatar {
    width: 32px;
    height: 32px;
    border-radius: $radius-md;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1rem;
    flex-shrink: 0;
    margin-bottom: 20px;
    overflow: hidden;
  }

  .bubble__avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .bubble__content {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .bubble__text {
    padding: $space-3 $space-4;
    border-radius: $radius-lg;
    font-size: $fs-callout;
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;

    .bubble--user & {
      background: $color-accent;
      color: #FFFFFF;
      border-bottom-right-radius: 4px;
    }

    .bubble--assistant & {
      background: var(--color-surface);
      color: var(--color-label);
      border-bottom-left-radius: 4px;
      box-shadow: $shadow-sm;

      @include dark {
        background: #2C2C2E;
      }
    }
  }

  .bubble__cursor {
    display: inline-block;
    width: 2px;
    height: 1em;
    background: currentColor;
    margin-left: 2px;
    vertical-align: text-bottom;
    animation: blink 1s step-end infinite;
    opacity: 0.7;
  }

  @keyframes blink {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 0; }
  }

  .bubble__time {
    font-size: $fs-caption;
    color: var(--color-label-tertiary);
    padding: 0 $space-1;

    .bubble--user & {
      text-align: right;
    }
  }

  // Image generation styles

  .bubble__image-generating {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $space-2;
    padding: $space-4;
    background: var(--color-fill);
    border-radius: $radius-md;
    min-width: 200px;
  }

  .bubble__image-spinner {
    width: 32px;
    height: 32px;
    border: 3px solid var(--color-separator);
    border-top-color: $color-accent;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .bubble__image-progress {
    width: 100%;
    height: 4px;
    background: var(--color-separator);
    border-radius: 2px;
    overflow: hidden;
  }

  .bubble__image-progress-bar {
    height: 100%;
    background: $color-accent;
    border-radius: 2px;
    transition: width 200ms ease-out;
  }

  .bubble__image-status {
    font-size: $fs-caption;
    color: var(--color-label-secondary);
  }

  .bubble__image-container {
    display: block;
    padding: 0;
    margin: $space-2 0;
    border: none;
    background: none;
    cursor: pointer;
    border-radius: $radius-md;
    overflow: hidden;
    transition: transform $transition-fast;

    &:hover {
      transform: scale(1.02);
    }
  }

  .bubble__image {
    display: block;
    max-width: 100%;
    max-height: 400px;
    border-radius: $radius-md;
    object-fit: contain;
  }

  .bubble__image-error {
    display: flex;
    flex-direction: column;
    gap: $space-1;
    padding: $space-3;
    background: rgba($color-accent-red, 0.1);
    border-radius: $radius-md;
    color: $color-accent-red;
    font-size: $fs-caption;
  }

  .bubble__image-prompt {
    font-style: italic;
    opacity: 0.8;
  }

  // Image modal

  .bubble__image-modal {
    position: fixed;
    inset: 0;
    z-index: 1000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.85);
    padding: $space-6;
    border: none;
    cursor: pointer;
  }

  .bubble__image-modal-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $space-4;
    max-width: 90vw;
    max-height: 90vh;

    img {
      max-width: 100%;
      max-height: calc(90vh - 60px);
      object-fit: contain;
      border-radius: $radius-lg;
    }
  }

  .bubble__image-modal-close {
    padding: $space-2 $space-4;
    background: var(--color-surface);
    border: none;
    border-radius: $radius-md;
    color: var(--color-label);
    font-size: $fs-callout;
    cursor: pointer;
    transition: background $transition-fast;

    &:hover {
      background: var(--color-fill);
    }
  }
</style>
