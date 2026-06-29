/**
 * localStorage adapter — used in browser/dev mode.
 * Keeps 100% parity with the SQLiteAdapter interface.
 */
import type { StorageAdapter } from './index';
import type { Character, ChatMessage } from '$lib/types';

const KEY_CHARS = 'cc_characters';
const keyChat = (id: string) => `cc_chat_${id}`;

export class LocalStorageAdapter implements StorageAdapter {
  private chars: Character[] = [];
  private messages: Record<string, ChatMessage[]> = {};

  async init(): Promise<void> {
    try {
      const raw = localStorage.getItem(KEY_CHARS);
      this.chars = raw ? JSON.parse(raw) : [];
    } catch { this.chars = []; }
  }

  private persistChars() {
    localStorage.setItem(KEY_CHARS, JSON.stringify(this.chars));
  }

  private persistMessages(characterId: string) {
    const session = { characterId, messages: this.messages[characterId] ?? [], updatedAt: new Date().toISOString() };
    localStorage.setItem(keyChat(characterId), JSON.stringify(session));
  }

  private loadMessages(characterId: string): ChatMessage[] {
    if (this.messages[characterId]) return this.messages[characterId];
    try {
      const raw = localStorage.getItem(keyChat(characterId));
      const msgs: ChatMessage[] = raw ? (JSON.parse(raw).messages ?? []) : [];
      this.messages[characterId] = msgs;
      return msgs;
    } catch { return []; }
  }

  // ── Characters ──

  async getCharacters(): Promise<Character[]> {
    return [...this.chars].sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  async getCharacter(id: string): Promise<Character | undefined> {
    return this.chars.find(c => c.id === id);
  }

  async saveCharacter(c: Character): Promise<void> {
    const idx = this.chars.findIndex(x => x.id === c.id);
    if (idx >= 0) this.chars[idx] = c;
    else this.chars = [...this.chars, c];
    this.persistChars();
  }

  async updateCharacter(id: string, patch: Partial<Character>): Promise<void> {
    const idx = this.chars.findIndex(x => x.id === id);
    if (idx < 0) return;
    this.chars[idx] = { ...this.chars[idx], ...patch, updatedAt: new Date().toISOString() };
    this.persistChars();
  }

  async deleteCharacter(id: string): Promise<void> {
    this.chars = this.chars.filter(c => c.id !== id);
    delete this.messages[id];
    this.persistChars();
    localStorage.removeItem(keyChat(id));
  }

  // ── Messages ──

  async getMessages(characterId: string, limit = 100): Promise<ChatMessage[]> {
    const msgs = this.loadMessages(characterId);
    return msgs.slice(-limit);
  }

  async appendMessage(characterId: string, msg: ChatMessage): Promise<void> {
    const msgs = this.loadMessages(characterId);
    this.messages[characterId] = [...msgs, msg];
    this.persistMessages(characterId);
  }

  async updateLastMessage(characterId: string, content: string): Promise<void> {
    const msgs = this.loadMessages(characterId);
    const last = msgs.findLastIndex(m => m.role === 'assistant');
    if (last >= 0) msgs[last] = { ...msgs[last], content };
    this.messages[characterId] = msgs;
    this.persistMessages(characterId);
  }

  async deleteMessages(characterId: string): Promise<void> {
    this.messages[characterId] = [];
    this.persistMessages(characterId);
  }
}
