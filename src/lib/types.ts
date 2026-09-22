export interface Character {
  id: string;
  name: string;
  avatar: string;        // emoji fallback
  avatarColor: string;   // hex color for background
  avatarImage?: string;  // base64 JPEG, max 200x200 — overrides emoji when present
  description: string;
  personality: string;
  background: string;
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  contextMessages: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  // Image generation fields
  imageUrl?: string;              // data:image/png;base64,...
  imageStatus?: 'generating' | 'complete' | 'error';
  imagePrompt?: string;           // Prompt used for generation
  imageProgress?: number;         // 0-100 progress percentage
}

export interface ComfyUIWorkflowConfig {
  checkpointModel: string;
  sampler: string;
  steps: number;
  cfgScale: number;
  width: number;
  height: number;
  seed?: number;
}

export type ComfyUIConnectionStatus = 'connected' | 'disconnected' | 'checking';

export interface ChatSession {
  characterId: string;
  messages: ChatMessage[];
  updatedAt: string;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  created?: number;
  description?: string;
  context_length?: number;
}

export interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

export type ConnectionStatus = 'connected' | 'disconnected' | 'checking';

export const AVATAR_COLORS = [
  '#007AFF', '#34C759', '#FF9500', '#FF3B30',
  '#AF52DE', '#FF2D55', '#30B0C7', '#5E5CE6',
  '#BF5AF2', '#FF6961', '#32ADE6', '#FFD60A'
];

export const DEFAULT_CHARACTER: Omit<Character, 'id' | 'createdAt' | 'updatedAt'> = {
  name: '',
  avatar: '🤖',
  avatarColor: '#007AFF',
  description: '',
  personality: '',
  background: '',
  systemPrompt: '',
  model: '',
  temperature: 0.7,
  maxTokens: 2048,
  contextMessages: 20
};
