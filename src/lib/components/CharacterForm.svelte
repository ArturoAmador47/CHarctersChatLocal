<script lang="ts">
  import type { Character } from '$lib/types';
  import { AVATAR_COLORS } from '$lib/types';
  import ModelSelector from './ModelSelector.svelte';

  let {
    initialData,
    mode,
    onSave,
    onDelete,
    onCancel
  }: {
    initialData: Omit<Character, 'id' | 'createdAt' | 'updatedAt'> & Partial<Character>;
    mode: 'new' | 'edit';
    onSave: (c: Character) => void;
    onDelete?: () => void;
    onCancel: () => void;
  } = $props();

  // Form state
  let name = $state(initialData.name);
  let avatar = $state(initialData.avatar);
  let avatarColor = $state(initialData.avatarColor);
  let avatarImage = $state(initialData.avatarImage ?? '');
  let description = $state(initialData.description);
  let personality = $state(initialData.personality);
  let background = $state(initialData.background);
  let systemPrompt = $state(initialData.systemPrompt);
  let model = $state(initialData.model);
  let temperature = $state(initialData.temperature);
  let maxTokens = $state(initialData.maxTokens);
  let contextMessages = $state(initialData.contextMessages);

  let activeTab = $state<'personality' | 'prompt' | 'settings'>('personality');
  let showEmojiPicker = $state(false);
  let showDeleteConfirm = $state(false);
  let isSaving = $state(false);
  let imageError = $state('');

  const isValid = $derived(name.trim().length > 0 && model.trim().length > 0);

  // Common emojis for avatars
  const suggestedEmojis = [
    '🤖', '🧙‍♂️', '👽', '🦊', '🐉', '🧜‍♀️', '🕵️', '🧝', '🦸', '🧛',
    '👨‍💻', '👩‍🔬', '🧑‍🎨', '👨‍🍳', '🧑‍🚀', '🦁', '🐺', '🦅', '🐬', '🦋',
    '⚡', '🔮', '💎', '🌟', '🌙', '🔥', '❄️', '🌊', '🍄', '🎭'
  ];

  // Compress and crop image to 200×200 JPEG (~15–25 KB)
  async function handleImageUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      imageError = 'Please select an image file.';
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      imageError = 'Image must be under 20 MB.';
      return;
    }
    imageError = '';

    await new Promise<void>((resolve) => {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const img = new Image();
        img.onload = () => {
          const SIZE = 200;
          const canvas = document.createElement('canvas');
          canvas.width = SIZE;
          canvas.height = SIZE;
          const ctx = canvas.getContext('2d')!;

          // Center-crop to square
          const side = Math.min(img.width, img.height);
          const sx = (img.width - side) / 2;
          const sy = (img.height - side) / 2;
          ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);

          avatarImage = canvas.toDataURL('image/jpeg', 0.82);
          showEmojiPicker = false;
          resolve();
        };
        img.src = evt.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  }

  function removeImage() {
    avatarImage = '';
    imageError = '';
  }

  function generateSystemPrompt() {
    if (!name.trim()) return;
    const parts: string[] = [];
    parts.push(`You are ${name.trim()}.`);
    if (personality.trim()) {
      parts.push(`Your personality: ${personality.trim()}.`);
    }
    if (background.trim()) {
      parts.push(`Background: ${background.trim()}.`);
    }
    parts.push('Always stay in character. Be engaging, authentic, and consistent with your persona.');
    systemPrompt = parts.join(' ');
    activeTab = 'prompt';
  }

  function handleSave() {
    if (!isValid || isSaving) return;
    isSaving = true;
    const now = new Date().toISOString();
    const character: Character = {
      id: initialData.id ?? crypto.randomUUID(),
      name: name.trim(),
      avatar,
      avatarColor,
      avatarImage: avatarImage || undefined,
      description: description.trim(),
      personality: personality.trim(),
      background: background.trim(),
      systemPrompt: systemPrompt.trim(),
      model,
      temperature,
      maxTokens,
      contextMessages,
      createdAt: initialData.createdAt ?? now,
      updatedAt: now
    };
    onSave(character);
  }
</script>

<div class="form-page">
  <!-- Top bar -->
  <header class="topbar">
    <button class="topbar__back" onclick={onCancel} type="button">
      <span class="topbar__back-arrow">‹</span>
      <span>Characters</span>
    </button>
    <h1 class="topbar__title">
      {mode === 'new' ? 'New Character' : 'Edit Character'}
    </h1>
    <div class="topbar__actions">
      {#if mode === 'edit' && onDelete}
        <button
          class="topbar__delete"
          onclick={() => (showDeleteConfirm = true)}
          type="button"
        >
          Delete
        </button>
      {/if}
      <button
        class="topbar__save"
        onclick={handleSave}
        disabled={!isValid || isSaving}
        type="button"
      >
        {isSaving ? 'Saving…' : 'Save'}
      </button>
    </div>
  </header>

  <!-- Body -->
  <div class="form-body">
    <!-- Left panel: Identity -->
    <aside class="identity-panel">
      <!-- Avatar preview -->
      <div class="avatar-preview">
        <!-- Main avatar display -->
        {#if avatarImage}
          <!-- Image mode -->
          <div class="avatar-img-wrap">
            <img src={avatarImage} alt="Character avatar" class="avatar-img" />
            <label class="avatar-img__change" title="Change photo">
              <span>📷</span>
              <input type="file" accept="image/*" onchange={handleImageUpload} style="display:none" />
            </label>
          </div>
          <button class="avatar-remove-btn" onclick={removeImage} type="button">
            ✕ Remove photo
          </button>
        {:else}
          <!-- Emoji mode -->
          <button
            class="avatar-preview__button"
            style="background-color: {avatarColor}20; border-color: {avatarColor}40"
            onclick={() => (showEmojiPicker = !showEmojiPicker)}
            type="button"
            title="Choose avatar emoji"
          >
            <span class="avatar-preview__emoji">{avatar}</span>
            <div class="avatar-preview__overlay">
              <span>✎</span>
            </div>
          </button>

          <!-- Upload photo button -->
          <label class="avatar-upload-btn">
            <span>📷</span> Upload photo
            <input type="file" accept="image/*" onchange={handleImageUpload} style="display:none" />
          </label>

          {#if imageError}
            <p class="avatar-error">{imageError}</p>
          {/if}
        {/if}

        <!-- Emoji picker dropdown (only in emoji mode) -->
        {#if showEmojiPicker && !avatarImage}
          <div class="emoji-picker">
            <p class="emoji-picker__label">Choose avatar</p>
            <div class="emoji-picker__grid">
              {#each suggestedEmojis as emoji}
                <button
                  class="emoji-picker__item"
                  class:emoji-picker__item--active={avatar === emoji}
                  onclick={() => { avatar = emoji; showEmojiPicker = false; }}
                  type="button"
                >
                  {emoji}
                </button>
              {/each}
            </div>
            <div class="emoji-picker__custom">
              <label class="emoji-picker__custom-label">Custom emoji</label>
              <input
                type="text"
                class="emoji-picker__custom-input"
                placeholder="Type an emoji…"
                value={avatar}
                oninput={(e) => { avatar = (e.target as HTMLInputElement).value || avatar; }}
                maxlength="2"
              />
            </div>
          </div>
        {/if}
      </div>

      <!-- Color picker -->
      <div class="field">
        <label class="field__label">Color</label>
        <div class="color-grid">
          {#each AVATAR_COLORS as color}
            <button
              class="color-swatch"
              class:color-swatch--active={avatarColor === color}
              style="background-color: {color}"
              onclick={() => (avatarColor = color)}
              type="button"
              title={color}
            ></button>
          {/each}
        </div>
      </div>

      <!-- Name -->
      <div class="field">
        <label class="field__label" for="name">Name <span class="field__required">*</span></label>
        <input
          id="name"
          type="text"
          class="field__input"
          placeholder="Character name"
          bind:value={name}
          maxlength="60"
        />
      </div>

      <!-- Description -->
      <div class="field">
        <label class="field__label" for="description">Short description</label>
        <input
          id="description"
          type="text"
          class="field__input"
          placeholder="One line about this character…"
          bind:value={description}
          maxlength="120"
        />
        <span class="field__hint">{description.length}/120</span>
      </div>

      <!-- Quick info card -->
      {#if mode === 'edit' && initialData.createdAt}
        <div class="meta-card">
          <div class="meta-card__row">
            <span class="meta-card__key">Created</span>
            <span class="meta-card__val">{new Date(initialData.createdAt).toLocaleDateString()}</span>
          </div>
          <div class="meta-card__row">
            <span class="meta-card__key">Updated</span>
            <span class="meta-card__val">{new Date(initialData.updatedAt ?? initialData.createdAt).toLocaleDateString()}</span>
          </div>
        </div>
      {/if}
    </aside>

    <!-- Right panel: Behavior -->
    <section class="behavior-panel">
      <!-- Tabs -->
      <div class="tabs">
        <button
          class="tabs__tab"
          class:tabs__tab--active={activeTab === 'personality'}
          onclick={() => (activeTab = 'personality')}
          type="button"
        >
          <span>🧠</span> Personality
        </button>
        <button
          class="tabs__tab"
          class:tabs__tab--active={activeTab === 'prompt'}
          onclick={() => (activeTab = 'prompt')}
          type="button"
        >
          <span>📝</span> System Prompt
        </button>
        <button
          class="tabs__tab"
          class:tabs__tab--active={activeTab === 'settings'}
          onclick={() => (activeTab = 'settings')}
          type="button"
        >
          <span>⚙️</span> Settings
        </button>
      </div>

      <!-- Tab content -->
      <div class="tab-content">

        <!-- Personality tab -->
        {#if activeTab === 'personality'}
          <div class="tab-pane">
            <div class="field">
              <label class="field__label" for="personality">Personality & traits</label>
              <textarea
                id="personality"
                class="field__textarea"
                placeholder="Describe how this character behaves, speaks and thinks. E.g.: Witty, sarcastic, highly intelligent. Speaks in short sharp sentences. Has a dark sense of humor."
                bind:value={personality}
                rows={5}
              ></textarea>
            </div>

            <div class="field">
              <label class="field__label" for="background">Background & context</label>
              <textarea
                id="background"
                class="field__textarea"
                placeholder="The character's backstory, role, knowledge domain, and world context. E.g.: A retired NASA engineer who now consults on sci-fi films for scientific accuracy."
                bind:value={background}
                rows={5}
              ></textarea>
            </div>

            <div class="generate-bar">
              <div class="generate-bar__info">
                <span class="generate-bar__icon">✨</span>
                <div>
                  <p class="generate-bar__title">Generate System Prompt</p>
                  <p class="generate-bar__desc">Build a system prompt from the fields above</p>
                </div>
              </div>
              <button
                class="generate-bar__btn"
                onclick={generateSystemPrompt}
                disabled={!name.trim()}
                type="button"
              >
                Generate →
              </button>
            </div>
          </div>

        <!-- System Prompt tab -->
        {:else if activeTab === 'prompt'}
          <div class="tab-pane">
            <div class="field">
              <div class="field__header">
                <label class="field__label" for="systemPrompt">System prompt</label>
                <span class="field__char-count">{systemPrompt.length} chars</span>
              </div>
              <textarea
                id="systemPrompt"
                class="field__textarea field__textarea--tall"
                placeholder="You are {name || 'a character'}. Write the full system prompt here…"
                bind:value={systemPrompt}
                rows={14}
              ></textarea>
              <p class="field__hint">
                This is sent as the <code>system</code> message in every conversation. Use
                <strong>Generate →</strong> in the Personality tab to auto-build one.
              </p>
            </div>
          </div>

        <!-- Settings tab -->
        {:else}
          <div class="tab-pane">
            <!-- Model -->
            <div class="field">
              <label class="field__label">Model <span class="field__required">*</span></label>
              <ModelSelector bind:value={model} placeholder="Select an OpenRouter model…" />
              {#if !model}
                <p class="field__hint field__hint--warn">A model is required to start chatting.</p>
              {/if}
            </div>

            <!-- Temperature -->
            <div class="field">
              <div class="field__header">
                <label class="field__label" for="temperature">Temperature</label>
                <span class="field__value-badge">{temperature.toFixed(2)}</span>
              </div>
              <div class="slider-row">
                <span class="slider-row__label">Precise</span>
                <input
                  id="temperature"
                  type="range"
                  class="field__range"
                  min="0"
                  max="2"
                  step="0.05"
                  bind:value={temperature}
                />
                <span class="slider-row__label">Creative</span>
              </div>
              <p class="field__hint">
                Lower values produce consistent, focused answers. Higher values produce more varied, creative responses.
              </p>
            </div>

            <!-- Max tokens -->
            <div class="field">
              <div class="field__header">
                <label class="field__label" for="maxTokens">Max tokens</label>
                <span class="field__value-badge">{maxTokens.toLocaleString()}</span>
              </div>
              <input
                id="maxTokens"
                type="range"
                class="field__range"
                min="256"
                max="8192"
                step="256"
                bind:value={maxTokens}
              />
              <div class="range-labels">
                <span>256</span>
                <span>8 192</span>
              </div>
            </div>

            <!-- Context window -->
            <div class="field">
              <div class="field__header">
                <label class="field__label" for="context">Context messages</label>
                <span class="field__value-badge">{contextMessages} pairs</span>
              </div>
              <input
                id="context"
                type="range"
                class="field__range"
                min="4"
                max="40"
                step="2"
                bind:value={contextMessages}
              />
              <p class="field__hint">
                Number of previous message pairs sent as context. More = better memory, higher cost.
              </p>
            </div>
          </div>
        {/if}
      </div>
    </section>
  </div>
</div>

<!-- Delete confirmation modal -->
{#if showDeleteConfirm}
  <div
    class="modal-backdrop"
    role="button"
    tabindex="-1"
    onclick={() => (showDeleteConfirm = false)}
    onkeydown={(e) => e.key === 'Escape' && (showDeleteConfirm = false)}
  ></div>
  <div class="modal">
    <div class="modal__icon">🗑️</div>
    <h2 class="modal__title">Delete "{name}"?</h2>
    <p class="modal__body">This will permanently delete this character and all its chat history. This action cannot be undone.</p>
    <div class="modal__actions">
      <button class="modal__cancel" onclick={() => (showDeleteConfirm = false)} type="button">
        Cancel
      </button>
      <button class="modal__confirm" onclick={onDelete} type="button">
        Delete Character
      </button>
    </div>
  </div>
{/if}

<style lang="scss">
  @use '$lib/styles/variables' as *;
  @use '$lib/styles/mixins' as *;

  // =====================
  // Page shell
  // =====================

  .form-page {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-height: 0;
    background: var(--color-bg);
  }

  // =====================
  // Top bar
  // =====================

  .topbar {
    @include glass;
    display: flex;
    align-items: center;
    padding: $space-4 $space-6;
    border-bottom: 1px solid var(--color-separator);
    gap: $space-4;
    position: sticky;
    top: 0;
    z-index: 20;
  }

  .topbar__back {
    @include btn-ghost;
    font-size: $fs-callout;
    gap: $space-1;
    flex-shrink: 0;
  }

  .topbar__back-arrow {
    font-size: 1.4rem;
    line-height: 1;
    font-weight: 300;
  }

  .topbar__title {
    flex: 1;
    margin: 0;
    font-size: $fs-headline;
    font-weight: 600;
    color: var(--color-label);
    letter-spacing: -0.01em;
    text-align: center;
  }

  .topbar__actions {
    display: flex;
    align-items: center;
    gap: $space-3;
    flex-shrink: 0;
  }

  .topbar__delete {
    @include btn-destructive;
    font-size: $fs-subheadline;
    padding: $space-2 $space-4;
  }

  .topbar__save {
    @include btn-primary;
    font-size: $fs-subheadline;
    padding: $space-2 $space-6;
  }

  // =====================
  // Body layout
  // =====================

  .form-body {
    flex: 1;
    display: grid;
    grid-template-columns: 300px 1fr;
    gap: $space-6;
    max-width: 1000px;
    width: 100%;
    margin: 0 auto;
    padding: $space-8 $space-8;
    align-items: start;

    @media (max-width: 700px) {
      grid-template-columns: 1fr;
      padding: $space-5;
    }
  }

  // =====================
  // Identity panel (left)
  // =====================

  .identity-panel {
    display: flex;
    flex-direction: column;
    gap: $space-5;
    position: sticky;
    top: 80px;
  }

  // Avatar preview

  .avatar-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $space-4;
    position: relative;
  }

  .avatar-preview__button {
    @include btn-reset;
    width: 96px;
    height: 96px;
    border-radius: $radius-xl;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 2px solid transparent;
    cursor: pointer;
    position: relative;
    transition: all $transition-normal;

    &:hover .avatar-preview__overlay {
      opacity: 1;
    }
  }

  .avatar-preview__emoji {
    font-size: 3rem;
    line-height: 1;
    pointer-events: none;
  }

  .avatar-preview__overlay {
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background: rgba(0, 0, 0, 0.4);
    display: flex;
    align-items: center;
    justify-content: center;
    color: #FFFFFF;
    font-size: 1.25rem;
    opacity: 0;
    transition: opacity $transition-fast;
  }

  // Avatar image mode

  .avatar-img-wrap {
    position: relative;
    width: 96px;
    height: 96px;
    border-radius: $radius-xl;
    overflow: hidden;
    box-shadow: $shadow-md;
    flex-shrink: 0;

    &:hover .avatar-img__change {
      opacity: 1;
    }
  }

  .avatar-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }

  .avatar-img__change {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.4rem;
    opacity: 0;
    transition: opacity $transition-fast;
    cursor: pointer;
    border-radius: inherit;
  }

  .avatar-upload-btn {
    display: inline-flex;
    align-items: center;
    gap: $space-2;
    padding: $space-2 $space-4;
    background: var(--color-fill);
    border-radius: $radius-full;
    font-family: $font-sans;
    font-size: $fs-footnote;
    font-weight: 500;
    color: var(--color-label-secondary);
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background: var(--color-fill-secondary);
      color: var(--color-label);
    }

    @include dark {
      background: rgba(120, 120, 128, 0.36);
    }
  }

  .avatar-remove-btn {
    @include btn-reset;
    font-size: $fs-caption;
    font-weight: 500;
    color: $color-accent-red;
    cursor: pointer;
    padding: $space-1 $space-2;
    border-radius: $radius-sm;
    transition: all $transition-fast;

    &:hover {
      background: rgba($color-accent-red, 0.1);
    }
  }

  .avatar-error {
    margin: 0;
    font-size: $fs-caption;
    color: $color-accent-red;
    text-align: center;
    max-width: 200px;
  }

  // Emoji picker

  .emoji-picker {
    @include card;
    position: absolute;
    top: calc(100% + $space-3);
    left: 50%;
    transform: translateX(-50%);
    width: 280px;
    padding: $space-4;
    z-index: 30;
    box-shadow: $shadow-xl;
  }

  .emoji-picker__label {
    @include section-label;
    margin: 0 0 $space-3;
  }

  .emoji-picker__grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: $space-1;
    margin-bottom: $space-3;
  }

  .emoji-picker__item {
    @include btn-reset;
    width: 40px;
    height: 40px;
    border-radius: $radius-sm;
    font-size: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all $transition-fast;
    cursor: pointer;

    &:hover {
      background: var(--color-fill);
    }

    &--active {
      background: rgba($color-accent, 0.15);
      box-shadow: inset 0 0 0 1.5px $color-accent;
    }
  }

  .emoji-picker__custom {
    display: flex;
    flex-direction: column;
    gap: $space-2;
    padding-top: $space-3;
    border-top: 1px solid var(--color-separator);
  }

  .emoji-picker__custom-label { @include section-label; }

  .emoji-picker__custom-input {
    @include input-base;
    font-size: 1.5rem;
    text-align: center;
    padding: $space-2;
  }

  // Color grid

  .color-grid {
    display: grid;
    grid-template-columns: repeat(6, 1fr);
    gap: $space-2;
  }

  .color-swatch {
    @include btn-reset;
    width: 36px;
    height: 36px;
    border-radius: $radius-md;
    cursor: pointer;
    transition: all $transition-fast;
    position: relative;

    &:hover { transform: scale(1.12); }

    &--active {
      transform: scale(1.12);

      &::after {
        content: '';
        position: absolute;
        inset: -3px;
        border-radius: 14px;
        border: 2.5px solid currentColor;
        color: inherit;
        box-shadow: 0 0 0 2.5px var(--color-surface);
      }
    }
  }

  // Meta card

  .meta-card {
    background: var(--color-fill-tertiary);
    border-radius: $radius-md;
    padding: $space-3 $space-4;
    display: flex;
    flex-direction: column;
    gap: $space-2;
  }

  .meta-card__row {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .meta-card__key {
    font-size: $fs-footnote;
    color: var(--color-label-secondary);
  }

  .meta-card__val {
    font-size: $fs-footnote;
    font-weight: 500;
    color: var(--color-label);
  }

  // =====================
  // Behavior panel (right)
  // =====================

  .behavior-panel {
    @include card;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  // Tabs

  .tabs {
    display: flex;
    gap: 0;
    border-bottom: 1px solid var(--color-separator);
    padding: $space-3 $space-4 0;
    background: var(--color-surface);
  }

  .tabs__tab {
    @include btn-reset;
    display: flex;
    align-items: center;
    gap: $space-2;
    padding: $space-3 $space-5;
    border-radius: $radius-md $radius-md 0 0;
    font-size: $fs-callout;
    font-weight: 500;
    color: var(--color-label-secondary);
    transition: all $transition-fast;
    position: relative;
    cursor: pointer;

    &:hover:not(.tabs__tab--active) {
      color: var(--color-label);
      background: var(--color-fill-tertiary);
    }

    &--active {
      color: $color-accent;
      background: var(--color-bg);

      &::after {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 0;
        right: 0;
        height: 2px;
        background: $color-accent;
        border-radius: 2px 2px 0 0;
      }
    }
  }

  // Tab content

  .tab-content {
    background: var(--color-bg);
    flex: 1;
  }

  .tab-pane {
    display: flex;
    flex-direction: column;
    gap: $space-5;
    padding: $space-6;
  }

  // =====================
  // Fields
  // =====================

  .field {
    display: flex;
    flex-direction: column;
    gap: $space-2;
  }

  .field__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .field__label {
    font-size: $fs-subheadline;
    font-weight: 600;
    color: var(--color-label);
    letter-spacing: -0.01em;
  }

  .field__required {
    color: $color-accent-red;
    margin-left: 2px;
  }

  .field__input {
    @include input-base;
  }

  .field__textarea {
    @include input-base;
    resize: vertical;
    line-height: 1.6;
    min-height: 100px;

    &--tall { min-height: 280px; }
  }

  .field__hint {
    font-size: $fs-caption;
    color: var(--color-label-tertiary);
    margin: 0;
    line-height: 1.5;

    code {
      font-family: $font-mono;
      background: var(--color-fill);
      padding: 1px 5px;
      border-radius: 4px;
    }

    &--warn {
      color: $color-accent-orange;
    }
  }

  .field__char-count {
    font-size: $fs-caption;
    color: var(--color-label-tertiary);
    font-variant-numeric: tabular-nums;
  }

  .field__value-badge {
    font-size: $fs-subheadline;
    font-weight: 600;
    color: $color-accent;
    font-variant-numeric: tabular-nums;
  }

  // Range slider

  .field__range {
    width: 100%;
    accent-color: $color-accent;
    cursor: pointer;
    height: 4px;
    border-radius: $radius-full;
  }

  .slider-row {
    display: flex;
    align-items: center;
    gap: $space-3;
  }

  .slider-row__label {
    font-size: $fs-caption;
    color: var(--color-label-tertiary);
    flex-shrink: 0;
    width: 55px;

    &:last-child { text-align: right; }
  }

  .slider-row .field__range { flex: 1; }

  .range-labels {
    display: flex;
    justify-content: space-between;
    font-size: $fs-caption;
    color: var(--color-label-tertiary);
    margin-top: -$space-1;
  }

  // Generate bar

  .generate-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: $space-4;
    padding: $space-4 $space-5;
    background: linear-gradient(135deg, rgba($color-accent, 0.06), rgba($color-accent-purple, 0.06));
    border: 1.5px solid rgba($color-accent, 0.18);
    border-radius: $radius-lg;
  }

  .generate-bar__info {
    display: flex;
    align-items: center;
    gap: $space-3;
  }

  .generate-bar__icon {
    font-size: 1.5rem;
    flex-shrink: 0;
  }

  .generate-bar__title {
    margin: 0 0 2px;
    font-size: $fs-callout;
    font-weight: 600;
    color: var(--color-label);
  }

  .generate-bar__desc {
    margin: 0;
    font-size: $fs-caption;
    color: var(--color-label-secondary);
  }

  .generate-bar__btn {
    @include btn-primary;
    flex-shrink: 0;
    padding: $space-3 $space-5;
  }

  // =====================
  // Delete modal
  // =====================

  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(4px);
    z-index: 40;
    cursor: pointer;
  }

  .modal {
    @include card;
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 50;
    width: 340px;
    padding: $space-8 $space-6;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: $space-4;
    box-shadow: $shadow-xl;
    animation: modalIn 220ms cubic-bezier(0.34, 1.56, 0.64, 1);
  }

  @keyframes modalIn {
    from { opacity: 0; transform: translate(-50%, -50%) scale(0.92); }
    to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }

  .modal__icon { font-size: 2.5rem; }

  .modal__title {
    margin: 0;
    font-size: $fs-title-3;
    font-weight: 700;
    color: var(--color-label);
    letter-spacing: -0.02em;
  }

  .modal__body {
    margin: 0;
    font-size: $fs-callout;
    color: var(--color-label-secondary);
    line-height: 1.5;
  }

  .modal__actions {
    display: flex;
    gap: $space-3;
    width: 100%;
  }

  .modal__cancel {
    @include btn-secondary;
    flex: 1;
    justify-content: center;
  }

  .modal__confirm {
    @include btn-destructive;
    flex: 1;
    justify-content: center;
  }
</style>
