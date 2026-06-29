<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/state';
  import CharacterForm from '$lib/components/CharacterForm.svelte';
  import { characterStore } from '$lib/stores/characters.svelte';
  import type { Character } from '$lib/types';

  const id = $derived(page.params.id ?? '');
  const character = $derived(characterStore.getById(id));

  function handleSave(updated: Character) {
    characterStore.update(id, updated);
    goto('/characters');
  }

  function handleDelete() {
    characterStore.remove(id);
    goto('/characters');
  }
</script>

{#if character}
  <CharacterForm
    initialData={character}
    mode="edit"
    onSave={handleSave}
    onDelete={handleDelete}
    onCancel={() => goto('/characters')}
  />
{:else}
  <div class="not-found">
    <h2>Character not found</h2>
    <a href="/characters">← Back to characters</a>
  </div>
{/if}

<style lang="scss">
  @use '$lib/styles/variables' as *;

  .not-found {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100dvh;
    gap: $space-4;
    color: var(--color-label-secondary);

    a {
      color: $color-accent;
      text-decoration: none;
    }
  }
</style>
