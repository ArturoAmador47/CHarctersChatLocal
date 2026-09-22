import { getStorage } from '$lib/db';
import { describeDbError } from '$lib/db/errors';
import { toastStore } from '$lib/stores/toasts.svelte';
import type { Character } from '$lib/types';

function createCharacterStore() {
  let characters = $state<Character[]>([]);
  let initialized = $state(false);
  let loading = $state(false);

  async function load() {
    loading = true;
    try {
      const db = await getStorage();
      characters = await db.getCharacters();
      initialized = true;
    } catch (err) {
      toastStore.error("Couldn't load your characters", describeDbError(err));
    } finally {
      loading = false;
    }
  }

  async function add(char: Character) {
    const db = await getStorage();
    try {
      await db.saveCharacter(char);
    } catch (err) {
      toastStore.error(`"${char.name}" wasn't saved`, describeDbError(err));
      throw err;
    }
    characters = [char, ...characters];
  }

  async function update(id: string, patch: Partial<Character>) {
    const db = await getStorage();
    try {
      await db.updateCharacter(id, patch);
    } catch (err) {
      toastStore.error("Your changes weren't saved", describeDbError(err));
      throw err;
    }
    characters = characters.map(c =>
      c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c
    );
  }

  async function remove(id: string) {
    const db = await getStorage();
    try {
      await db.deleteCharacter(id);
    } catch (err) {
      toastStore.error("The character wasn't deleted", describeDbError(err));
      throw err;
    }
    characters = characters.filter(c => c.id !== id);
  }

  function getById(id: string): Character | undefined {
    return characters.find(c => c.id === id);
  }

  return {
    get list() { return characters; },
    get initialized() { return initialized; },
    get loading() { return loading; },
    load,
    add,
    update,
    remove,
    getById
  };
}

export const characterStore = createCharacterStore();
