/**
 * Database abstraction layer.
 *
 * Backed by Supabase (Postgres) — see supabase/schema.sql for the table
 * definitions and src/lib/db/supabaseClient.ts for the client setup.
 */

import type { Character, ChatMessage } from '$lib/types';

export interface StorageAdapter {
  // Lifecycle
  init(): Promise<void>;

  // Characters
  getCharacters(): Promise<Character[]>;
  getCharacter(id: string): Promise<Character | undefined>;
  saveCharacter(c: Character): Promise<void>;
  updateCharacter(id: string, patch: Partial<Character>): Promise<void>;
  deleteCharacter(id: string): Promise<void>;

  // Messages
  getMessages(characterId: string, limit?: number): Promise<ChatMessage[]>;
  appendMessage(characterId: string, msg: ChatMessage): Promise<void>;
  updateLastMessage(characterId: string, content: string): Promise<void>;
  deleteMessages(characterId: string): Promise<void>;
}

let _adapter: StorageAdapter | null = null;

export async function getStorage(): Promise<StorageAdapter> {
  if (_adapter) return _adapter;

  const { SupabaseAdapter } = await import('./supabaseAdapter');
  _adapter = new SupabaseAdapter();
  await _adapter.init();
  return _adapter;
}
