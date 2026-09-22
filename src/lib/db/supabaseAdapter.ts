import { supabase } from './supabaseClient';
import type { StorageAdapter } from './index';
import type { Character, ChatMessage } from '$lib/types';

// ─── Row types (snake_case, matching supabase/schema.sql) ─────────────────────
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
  image_url: string | null; image_status: string | null;
  image_prompt: string | null;
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

function characterToRow(c: Character): CharacterRow {
  return {
    id: c.id, name: c.name, avatar: c.avatar,
    avatar_color: c.avatarColor,
    avatar_image: c.avatarImage ?? null,
    description: c.description, personality: c.personality,
    background: c.background, system_prompt: c.systemPrompt,
    model: c.model, temperature: c.temperature,
    max_tokens: c.maxTokens, context_messages: c.contextMessages,
    created_at: c.createdAt, updated_at: c.updatedAt
  };
}

function characterPatchToRow(patch: Partial<Character>): Partial<CharacterRow> {
  const row: Partial<CharacterRow> = {};
  if (patch.name !== undefined) row.name = patch.name;
  if (patch.avatar !== undefined) row.avatar = patch.avatar;
  if (patch.avatarColor !== undefined) row.avatar_color = patch.avatarColor;
  if (patch.avatarImage !== undefined) row.avatar_image = patch.avatarImage ?? null;
  if (patch.description !== undefined) row.description = patch.description;
  if (patch.personality !== undefined) row.personality = patch.personality;
  if (patch.background !== undefined) row.background = patch.background;
  if (patch.systemPrompt !== undefined) row.system_prompt = patch.systemPrompt;
  if (patch.model !== undefined) row.model = patch.model;
  if (patch.temperature !== undefined) row.temperature = patch.temperature;
  if (patch.maxTokens !== undefined) row.max_tokens = patch.maxTokens;
  if (patch.contextMessages !== undefined) row.context_messages = patch.contextMessages;
  return row;
}

function rowToMessage(r: MessageRow): ChatMessage {
  return {
    id: r.id,
    role: r.role as ChatMessage['role'],
    content: r.content,
    timestamp: r.timestamp,
    imageUrl: r.image_url ?? undefined,
    imageStatus: (r.image_status as ChatMessage['imageStatus']) ?? undefined,
    imagePrompt: r.image_prompt ?? undefined
  };
}

// ─── Adapter ──────────────────────────────────────────────────────────────────
export class SupabaseAdapter implements StorageAdapter {
  async init(): Promise<void> {
    // Schema is managed out-of-band via supabase/schema.sql — nothing to do here.
  }

  // ── Characters ──

  async getCharacters(): Promise<Character[]> {
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return (data as CharacterRow[]).map(rowToCharacter);
  }

  async getCharacter(id: string): Promise<Character | undefined> {
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data ? rowToCharacter(data as CharacterRow) : undefined;
  }

  async saveCharacter(c: Character): Promise<void> {
    const { error } = await supabase.from('characters').upsert(characterToRow(c));
    if (error) throw error;
  }

  async updateCharacter(id: string, patch: Partial<Character>): Promise<void> {
    const row: Partial<CharacterRow> = {
      ...characterPatchToRow(patch),
      updated_at: new Date().toISOString()
    };
    const { error } = await supabase.from('characters').update(row).eq('id', id);
    if (error) throw error;
  }

  async deleteCharacter(id: string): Promise<void> {
    const { error } = await supabase.from('characters').delete().eq('id', id);
    if (error) throw error;
  }

  // ── Messages ──

  async getMessages(characterId: string, limit = 100): Promise<ChatMessage[]> {
    // Fetch the most recent `limit` messages, then restore chronological order.
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('character_id', characterId)
      .order('timestamp', { ascending: false })
      .limit(limit);
    if (error) throw error;
    return (data as MessageRow[]).map(rowToMessage).reverse();
  }

  async appendMessage(characterId: string, msg: ChatMessage): Promise<void> {
    const { error } = await supabase.from('messages').upsert({
      id: msg.id,
      character_id: characterId,
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp,
      image_url: msg.imageUrl ?? null,
      image_status: msg.imageStatus ?? null,
      image_prompt: msg.imagePrompt ?? null
    });
    if (error) throw error;
  }

  async updateLastMessage(characterId: string, content: string): Promise<void> {
    const { data, error: selectError } = await supabase
      .from('messages')
      .select('id')
      .eq('character_id', characterId)
      .eq('role', 'assistant')
      .order('timestamp', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (selectError) throw selectError;
    if (!data) return;

    const { error } = await supabase.from('messages').update({ content }).eq('id', data.id);
    if (error) throw error;
  }

  async deleteMessages(characterId: string): Promise<void> {
    const { error } = await supabase.from('messages').delete().eq('character_id', characterId);
    if (error) throw error;
  }
}
