import Database from '@tauri-apps/plugin-sql';
import type { StorageAdapter } from './index';
import type { Character, ChatMessage } from '$lib/types';

const DB_PATH = 'sqlite:chatcharacters.db';

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS characters (
    id               TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    avatar           TEXT NOT NULL DEFAULT '🤖',
    avatar_color     TEXT NOT NULL DEFAULT '#007AFF',
    avatar_image     TEXT,
    description      TEXT NOT NULL DEFAULT '',
    personality      TEXT NOT NULL DEFAULT '',
    background       TEXT NOT NULL DEFAULT '',
    system_prompt    TEXT NOT NULL DEFAULT '',
    model            TEXT NOT NULL DEFAULT '',
    temperature      REAL NOT NULL DEFAULT 0.7,
    max_tokens       INTEGER NOT NULL DEFAULT 2048,
    context_messages INTEGER NOT NULL DEFAULT 20,
    created_at       TEXT NOT NULL,
    updated_at       TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS messages (
    id           TEXT PRIMARY KEY,
    character_id TEXT NOT NULL REFERENCES characters(id) ON DELETE CASCADE,
    role         TEXT NOT NULL,
    content      TEXT NOT NULL,
    timestamp    TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_messages_char
    ON messages (character_id, timestamp);
`;

// ─── Row types ────────────────────────────────────────────────────────────────
interface CharacterRow {
  id: string; name: string; avatar: string; avatar_color: string;
  avatar_image: string | null; description: string; personality: string;
  background: string; system_prompt: string; model: string;
  temperature: number; max_tokens: number; context_messages: number;
  created_at: string; updated_at: string;
}

interface MessageRow {
  id: string; character_id: string; role: string;
  content: string; timestamp: string;
}

function rowToCharacter(r: CharacterRow): Character {
  return {
    id: r.id, name: r.name, avatar: r.avatar,
    avatarColor: r.avatar_color,
    avatarImage: r.avatar_image ?? undefined,
    description: r.description, personality: r.personality,
    background: r.background, systemPrompt: r.system_prompt,
    model: r.model, temperature: r.temperature,
    maxTokens: r.max_tokens, contextMessages: r.context_messages,
    createdAt: r.created_at, updatedAt: r.updated_at
  };
}

function rowToMessage(r: MessageRow): ChatMessage {
  return {
    id: r.id,
    role: r.role as ChatMessage['role'],
    content: r.content,
    timestamp: r.timestamp
  };
}

// ─── Adapter ──────────────────────────────────────────────────────────────────
export class SQLiteAdapter implements StorageAdapter {
  private db!: Database;

  async init(): Promise<void> {
    this.db = await Database.load(DB_PATH);
    // Execute each statement separately (plugin-sql doesn't support multi-statement)
    for (const stmt of SCHEMA.split(';').map(s => s.trim()).filter(Boolean)) {
      await this.db.execute(stmt + ';');
    }
    await this.importFromLocalStorage();
  }

  // ── Characters ──

  async getCharacters(): Promise<Character[]> {
    const rows = await this.db.select<CharacterRow[]>(
      'SELECT * FROM characters ORDER BY updated_at DESC'
    );
    return rows.map(rowToCharacter);
  }

  async getCharacter(id: string): Promise<Character | undefined> {
    const rows = await this.db.select<CharacterRow[]>(
      'SELECT * FROM characters WHERE id = ?', [id]
    );
    return rows[0] ? rowToCharacter(rows[0]) : undefined;
  }

  async saveCharacter(c: Character): Promise<void> {
    await this.db.execute(
      `INSERT OR REPLACE INTO characters
        (id, name, avatar, avatar_color, avatar_image, description, personality,
         background, system_prompt, model, temperature, max_tokens, context_messages,
         created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [c.id, c.name, c.avatar, c.avatarColor, c.avatarImage ?? null,
       c.description, c.personality, c.background, c.systemPrompt,
       c.model, c.temperature, c.maxTokens, c.contextMessages,
       c.createdAt, c.updatedAt]
    );
  }

  async updateCharacter(id: string, patch: Partial<Character>): Promise<void> {
    const current = await this.getCharacter(id);
    if (!current) return;
    const updated: Character = {
      ...current, ...patch,
      updatedAt: new Date().toISOString()
    };
    await this.saveCharacter(updated);
  }

  async deleteCharacter(id: string): Promise<void> {
    await this.db.execute('DELETE FROM characters WHERE id = ?', [id]);
  }

  // ── Messages ──

  async getMessages(characterId: string, limit = 100): Promise<ChatMessage[]> {
    const rows = await this.db.select<MessageRow[]>(
      `SELECT * FROM messages WHERE character_id = ?
       ORDER BY timestamp ASC LIMIT ?`,
      [characterId, limit]
    );
    return rows.map(rowToMessage);
  }

  async appendMessage(characterId: string, msg: ChatMessage): Promise<void> {
    await this.db.execute(
      `INSERT OR REPLACE INTO messages (id, character_id, role, content, timestamp)
       VALUES (?,?,?,?,?)`,
      [msg.id, characterId, msg.role, msg.content, msg.timestamp]
    );
  }

  async updateLastMessage(characterId: string, content: string): Promise<void> {
    await this.db.execute(
      `UPDATE messages SET content = ?
       WHERE id = (
         SELECT id FROM messages
         WHERE character_id = ? AND role = 'assistant'
         ORDER BY timestamp DESC LIMIT 1
       )`,
      [content, characterId]
    );
  }

  async deleteMessages(characterId: string): Promise<void> {
    await this.db.execute(
      'DELETE FROM messages WHERE character_id = ?', [characterId]
    );
  }

  // ── One-time migration from localStorage ──────────────────────────────────

  async importFromLocalStorage(): Promise<void> {
    const MIGRATED_KEY = 'cc_migrated_to_sqlite';
    if (typeof localStorage === 'undefined') return;
    if (localStorage.getItem(MIGRATED_KEY)) return;

    try {
      // Import characters
      const rawChars = localStorage.getItem('cc_characters');
      if (rawChars) {
        const chars: Character[] = JSON.parse(rawChars);
        for (const c of chars) {
          await this.saveCharacter(c);

          // Import chat history for this character
          const rawMsgs = localStorage.getItem(`cc_chat_${c.id}`);
          if (rawMsgs) {
            const session = JSON.parse(rawMsgs);
            const msgs: ChatMessage[] = session.messages ?? [];
            for (const m of msgs) {
              await this.appendMessage(c.id, m);
            }
          }
        }
        console.info(`[DB] Migrated ${chars.length} characters from localStorage to SQLite`);
      }
    } catch (err) {
      console.warn('[DB] Migration from localStorage failed:', err);
    }

    localStorage.setItem(MIGRATED_KEY, '1');
  }
}
