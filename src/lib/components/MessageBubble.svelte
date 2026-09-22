<script lang="ts">
  import ThinkingOrb from '$lib/components/ThinkingOrb.svelte';
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

  function formatTime(iso: string): string {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
    {#if !message.content && isStreaming && message.role === 'assistant'}
      <div class="bubble__text bubble__text--pending">
        <ThinkingOrb orbState="composing" size={20} label="Thinking…" />
      </div>
    {:else if message.content}
      <div class="bubble__text" class:bubble__text--streaming={isStreaming && message.role === 'assistant'}>
        {message.content}
        {#if isStreaming && message.role === 'assistant'}
          <span class="bubble__cursor"></span>
        {/if}
      </div>
    {/if}

    {#if message.content}
      <div class="bubble__time">{formatTime(message.timestamp)}</div>
    {/if}
  </div>
</div>

<style lang="scss">
  @use '$lib/styles/variables' as *;
  @use '$lib/styles/mixins' as *;

  .bubble {
    display: flex;
    gap: $space-3;
    max-width: 80%;
    min-width: 0;
    align-items: flex-end;
    animation: fadeIn 200ms ease-out;

    &--user {
      flex-direction: row-reverse;
      margin-left: auto;
    }

    &--assistant {
      margin-right: auto;
    }

    @include mobile {
      max-width: 92%;
      gap: $space-2;
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
    min-width: 0;
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

  .bubble__text--pending {
    display: inline-flex;
    align-items: center;
    padding-top: $space-2;
    padding-bottom: $space-2;
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
</style>
