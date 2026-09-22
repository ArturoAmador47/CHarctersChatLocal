<script lang="ts">
  import { goto } from '$app/navigation';
  import CharacterForm from '$lib/components/CharacterForm.svelte';
  import { characterStore } from '$lib/stores/characters.svelte';
  import type { Character } from '$lib/types';
  import { DEFAULT_CHARACTER } from '$lib/types';

  // Only leave the form once the character is actually persisted — a failed
  // save keeps the user here with their input intact (the store toasts why).
  async function handleSave(character: Character) {
    try {
      await characterStore.add(character);
    } catch {
      return;
    }
    goto('/characters');
  }
</script>

<CharacterForm
  initialData={{ ...DEFAULT_CHARACTER }}
  mode="new"
  onSave={handleSave}
  onCancel={() => goto('/characters')}
/>
