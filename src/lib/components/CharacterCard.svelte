<script lang="ts">
  import type { Character } from '$lib/types';

  let { character, onclick }: { character: Character; onclick?: () => void } = $props();
</script>

<button class="card" {onclick} type="button">
  <div class="card__avatar" style="background-color: {character.avatarColor}20; border-color: {character.avatarColor}30">
    {#if character.avatarImage}
      <img src={character.avatarImage} alt={character.name} class="card__avatar-img" />
    {:else}
      <span class="card__avatar-emoji">{character.avatar}</span>
    {/if}
  </div>
  <div class="card__body">
    <h3 class="card__name">{character.name}</h3>
    <p class="card__description">{character.description || 'No description'}</p>
  </div>
  <div class="card__actions">
    <span class="card__arrow">›</span>
  </div>
</button>

<style lang="scss">
  @use '$lib/styles/variables' as *;
  @use '$lib/styles/mixins' as *;

  .card {
    @include card-hover;
    @include btn-reset;
    width: 100%;
    display: flex;
    align-items: center;
    gap: $space-4;
    padding: $space-4;
    text-align: left;
    cursor: pointer;
  }

  .card__avatar {
    width: 52px;
    height: 52px;
    border-radius: $radius-lg;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1.5px solid transparent;
    flex-shrink: 0;
  }

  .card__avatar-emoji {
    font-size: 1.75rem;
    line-height: 1;
  }

  .card__avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: $radius-md;
    display: block;
  }

  .card__body {
    flex: 1;
    min-width: 0;
  }

  .card__name {
    margin: 0 0 4px;
    font-size: $fs-headline;
    font-weight: 600;
    color: var(--color-label);
    @include truncate;
  }

  .card__description {
    margin: 0;
    font-size: $fs-subheadline;
    color: var(--color-label-secondary);
    @include truncate;
  }

  .card__actions {
    flex-shrink: 0;
  }

  .card__arrow {
    font-size: 1.25rem;
    color: var(--color-label-tertiary);
    font-weight: 300;
  }
</style>
