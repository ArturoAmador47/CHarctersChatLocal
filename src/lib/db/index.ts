/**
 * Database abstraction layer.
 *
 * In Tauri: uses SQLite via @tauri-apps/plugin-sql (persistent, fast, no size limits).
 * In browser: falls back to localStorage (dev mode / web build).
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

  // Migration: import from localStorage on first run in Tauri
  importFromLocalStorage?(): Promise<void>;
}

/** Detect Tauri runtime (not available in SSR or plain browser build) */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

let _adapter: StorageAdapter | null = null;

export async function getStorage(): Promise<StorageAdapter> {
  if (_adapter) return _adapter;

  if (isTauri()) {
    const { SQLiteAdapter } = await import('./sqlite');
    _adapter = new SQLiteAdapter();
  } else {
    const { LocalStorageAdapter } = await import('./localstorage');
    _adapter = new LocalStorageAdapter();
  }

  await _adapter.init();
  return _adapter;
}
