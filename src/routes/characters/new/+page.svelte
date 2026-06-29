<script lang="ts">
  import { goto } from '$app/navigation';
  import CharacterForm from '$lib/components/CharacterForm.svelte';
  import { characterStore } from '$lib/stores/characters.svelte';
  import type { Character } from '$lib/types';
  import { DEFAULT_CHARACTER } from '$lib/types';

  function handleSave(character: Character) {
    characterStore.add(character);
    goto('/characters');
  }
</script>

<CharacterForm
  initialData={{ ...DEFAULT_CHARACTER }}
  mode="new"
  onSave={handleSave}
  onCancel={() => goto('/characters')}
/>
