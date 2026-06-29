import { getStorage } from '$lib/db';
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
    } finally {
      loading = false;
    }
  }

  async function add(char: Character) {
    const db = await getStorage();
    await db.saveCharacter(char);
    characters = [char, ...characters];
  }

  async function update(id: string, patch: Partial<Character>) {
    const db = await getStorage();
    await db.updateCharacter(id, patch);
    characters = characters.map(c =>
      c.id === id ? { ...c, ...patch, updatedAt: new Date().toISOString() } : c
    );
  }

  async function remove(id: string) {
    const db = await getStorage();
    await db.deleteCharacter(id);
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
