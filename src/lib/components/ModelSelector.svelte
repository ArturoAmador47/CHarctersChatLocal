<script lang="ts">
  import { modelsStore } from '$lib/stores/models.svelte';

  let {
    value = $bindable(''),
    placeholder = 'Select a model…'
  }: {
    value?: string;
    placeholder?: string;
  } = $props();
</script>

<div class="selector">
  {#if modelsStore.status === 'disconnected'}
    <div class="selector__offline">
      <span class="selector__offline-icon">⚠️</span>
      <div>
        <p class="selector__offline-title">OpenRouter not connected</p>
        <p class="selector__offline-sub">Check your API_KEY in .env</p>
      </div>
      <button class="selector__retry" onclick={() => modelsStore.refresh()}>Retry</button>
    </div>
  {:else if modelsStore.status === 'checking'}
    <div class="selector__loading">
      <span class="selector__spinner"></span>
      <span>Connecting to OpenRouter…</span>
    </div>
  {:else if modelsStore.models.length === 0}
    <div class="selector__empty">
      <span>No models available</span>
      <button class="selector__retry" onclick={() => modelsStore.refresh()}>Refresh</button>
    </div>
  {:else}
    <div class="selector__field">
      <select class="selector__select" bind:value>
        <option value="">{placeholder}</option>
        {#each modelsStore.models as model}
          <option value={model.id}>{model.name ?? model.id}</option>
        {/each}
      </select>
      <span class="selector__chevron">⌄</span>
    </div>
  {/if}
</div>

<style lang="scss">
  @use '$lib/styles/variables' as *;
  @use '$lib/styles/mixins' as *;

  .selector { width: 100%; }

  .selector__field {
    position: relative;
    width: 100%;
  }

  .selector__select {
    @include input-base;
    appearance: none;
    padding-right: $space-10;
    cursor: pointer;
  }

  .selector__chevron {
    position: absolute;
    right: $space-4;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-label-secondary);
    pointer-events: none;
    font-size: 1.1rem;
  }

  .selector__offline,
  .selector__empty,
  .selector__loading {
    display: flex;
    align-items: center;
    gap: $space-3;
    padding: $space-3 $space-4;
    background: rgba(255, 149, 0, 0.08);
    border: 1.5px solid rgba(255, 149, 0, 0.2);
    border-radius: $radius-md;
    font-size: $fs-subheadline;
    color: $color-accent-orange;
  }

  .selector__offline { flex-wrap: nowrap; }

  .selector__offline-icon { font-size: 1.2rem; flex-shrink: 0; }

  .selector__offline-title {
    margin: 0 0 2px;
    font-size: $fs-subheadline;
    font-weight: 600;
    color: $color-label;
  }

  .selector__offline-sub {
    margin: 0;
    font-size: $fs-caption;
    color: $color-label-secondary;
  }

  .selector__retry {
    @include btn-ghost;
    margin-left: auto;
    font-size: $fs-footnote;
    flex-shrink: 0;
  }

  .selector__spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 149, 0, 0.3);
    border-top-color: $color-accent-orange;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
