<script lang="ts">
  import { goto } from '$app/navigation';
  import { characterStore } from '$lib/stores/characters.svelte';
  import CharacterCard from '$lib/components/CharacterCard.svelte';
</script>

<div class="page">
  <!-- Header -->
  <header class="page__header">
    <div class="page__header-content">
      <div>
        <h1 class="page__title">Characters</h1>
        <p class="page__subtitle">
          {characterStore.list.length} character{characterStore.list.length !== 1 ? 's' : ''} defined
        </p>
      </div>
      <a href="/characters/new" class="btn-primary">
        <span>＋</span> New Character
      </a>
    </div>
  </header>

  <!-- Content -->
  <div class="page__content">
    {#if characterStore.list.length === 0}
      <!-- Empty state -->
      <div class="empty">
        <div class="empty__icon">🎭</div>
        <h2 class="empty__title">No characters yet</h2>
        <p class="empty__description">
          Create your first AI character with a custom personality, backstory and behavior.
        </p>
        <a href="/characters/new" class="btn-primary">Create Character</a>
      </div>
    {:else}
      <div class="grid">
        {#each characterStore.list as character (character.id)}
          <div class="grid__item">
            <CharacterCard
              {character}
              onclick={() => goto(`/characters/${character.id}`)}
            />
            <a
              href="/chat/{character.id}"
              class="chat-btn"
              title="Chat with {character.name}"
            >
              <span>💬</span>
              <span>Chat</span>
            </a>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style lang="scss">
  @use '$lib/styles/variables' as *;
  @use '$lib/styles/mixins' as *;

  .page {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
  }

  .page__header {
    @include glass;
    border-bottom: 1px solid var(--color-separator);
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .page__header-content {
    max-width: 900px;
    margin: 0 auto;
    padding: $space-5 $space-8;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $space-4;
  }

  .page__title {
    margin: 0 0 2px;
    font-size: $fs-title-2;
    font-weight: 700;
    color: var(--color-label);
    letter-spacing: -0.03em;
  }

  .page__subtitle {
    margin: 0;
    font-size: $fs-subheadline;
    color: var(--color-label-secondary);
  }

  .btn-primary {
    @include btn-primary;
    text-decoration: none;
    display: inline-flex;
  }

  .page__content {
    flex: 1;
    max-width: 900px;
    width: 100%;
    margin: 0 auto;
    padding: $space-8;
  }

  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: $space-16 $space-8;
    gap: $space-4;
  }

  .empty__icon {
    font-size: 4rem;
    line-height: 1;
    filter: grayscale(0.2);
  }

  .empty__title {
    margin: 0;
    font-size: $fs-title-3;
    font-weight: 700;
    color: var(--color-label);
    letter-spacing: -0.02em;
  }

  .empty__description {
    margin: 0;
    font-size: $fs-body;
    color: var(--color-label-secondary);
    max-width: 360px;
    line-height: 1.6;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: $space-4;
  }

  .grid__item {
    display: flex;
    flex-direction: column;
    gap: $space-2;
  }

  .chat-btn {
    @include btn-secondary;
    text-decoration: none;
    justify-content: center;
    padding: $space-3;
    gap: $space-2;
    border-radius: $radius-md;
    font-size: $fs-subheadline;
  }
</style>
