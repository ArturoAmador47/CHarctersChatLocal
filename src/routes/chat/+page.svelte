<script lang="ts">
  import { characterStore } from '$lib/stores/characters.svelte';
  import { goto } from '$app/navigation';
</script>

<div class="select-page">
  <div class="select-page__icon">💬</div>
  <h1 class="select-page__title">Select a character to chat</h1>
  <p class="select-page__sub">Choose a character from the list below</p>

  <div class="select-page__list">
    {#each characterStore.list as character}
      <button
        class="character-item"
        onclick={() => goto(`/chat/${character.id}`)}
        type="button"
      >
        <div
          class="character-item__avatar"
          style="background-color: {character.avatarColor}20"
        >
          {character.avatar}
        </div>
        <div class="character-item__info">
          <span class="character-item__name">{character.name}</span>
          <span class="character-item__desc">{character.description || 'No description'}</span>
        </div>
        <span class="character-item__arrow">›</span>
      </button>
    {/each}

    {#if characterStore.list.length === 0}
      <p class="select-page__empty">
        No characters yet. <a href="/characters/new">Create one →</a>
      </p>
    {/if}
  </div>
</div>

<style lang="scss">
  @use '$lib/styles/variables' as *;
  @use '$lib/styles/mixins' as *;

  .select-page {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: $space-8;
    gap: $space-4;
    text-align: center;
  }

  .select-page__icon { font-size: 3rem; }

  .select-page__title {
    margin: 0;
    font-size: $fs-title-3;
    font-weight: 700;
    color: var(--color-label);
  }

  .select-page__sub {
    margin: 0;
    color: var(--color-label-secondary);
  }

  .select-page__list {
    width: 100%;
    max-width: 480px;
    display: flex;
    flex-direction: column;
    gap: $space-3;
    margin-top: $space-4;
  }

  .select-page__empty {
    color: var(--color-label-secondary);
    a { color: $color-accent; text-decoration: none; }
  }

  .character-item {
    @include btn-reset;
    @include card;
    width: 100%;
    display: flex;
    align-items: center;
    gap: $space-4;
    padding: $space-4;
    cursor: pointer;
    transition: all $transition-fast;
    text-align: left;

    &:hover {
      transform: translateY(-1px);
      box-shadow: $shadow-lg;
    }
  }

  .character-item__avatar {
    width: 44px;
    height: 44px;
    border-radius: $radius-md;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .character-item__info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .character-item__name {
    font-size: $fs-callout;
    font-weight: 600;
    color: var(--color-label);
    @include truncate;
  }

  .character-item__desc {
    font-size: $fs-subheadline;
    color: var(--color-label-secondary);
    @include truncate;
  }

  .character-item__arrow {
    font-size: 1.25rem;
    color: var(--color-label-tertiary);
  }
</style>
