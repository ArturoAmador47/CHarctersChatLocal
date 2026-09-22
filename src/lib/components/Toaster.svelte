<script lang="ts">
  import { toastStore } from '$lib/stores/toasts.svelte';
</script>

<div class="toaster" role="region" aria-live="polite" aria-label="Notifications">
  {#each toastStore.items as toast (toast.id)}
    <div class="toast" class:toast--error={toast.kind === 'error'}>
      <span class="toast__icon">{toast.kind === 'error' ? '⚠️' : 'ℹ️'}</span>
      <div class="toast__body">
        <p class="toast__title">{toast.title}</p>
        {#if toast.detail}
          <p class="toast__detail">{toast.detail}</p>
        {/if}
      </div>
      <button
        class="toast__close"
        onclick={() => toastStore.dismiss(toast.id)}
        type="button"
        aria-label="Dismiss notification"
      >
        ✕
      </button>
    </div>
  {/each}
</div>

<style lang="scss">
  @use '$lib/styles/variables' as *;
  @use '$lib/styles/mixins' as *;

  .toaster {
    position: fixed;
    top: $space-4;
    right: $space-4;
    z-index: 200;
    display: flex;
    flex-direction: column;
    gap: $space-2;
    width: min(380px, calc(100vw - #{$space-8}));
    pointer-events: none;

    @include mobile {
      top: calc(#{$space-3} + env(safe-area-inset-top));
      left: $space-3;
      right: $space-3;
      width: auto;
    }
  }

  .toast {
    @include card;
    pointer-events: auto;
    display: flex;
    align-items: flex-start;
    gap: $space-3;
    padding: $space-3 $space-4;
    border-left: 3px solid var(--color-label-tertiary);
    animation: toastIn 180ms ease-out;

    &--error {
      border-left-color: $color-accent-red;
    }
  }

  @keyframes toastIn {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .toast__icon {
    font-size: 1rem;
    line-height: 1.4;
    flex-shrink: 0;
  }

  .toast__body {
    flex: 1;
    min-width: 0;
  }

  .toast__title {
    margin: 0;
    font-size: $fs-subheadline;
    font-weight: 600;
    color: var(--color-label);
  }

  .toast__detail {
    margin: 2px 0 0;
    font-size: $fs-caption;
    color: var(--color-label-secondary);
    line-height: 1.45;
    word-break: break-word;
  }

  .toast__close {
    @include btn-reset;
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    border-radius: $radius-sm;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: $fs-caption;
    color: var(--color-label-tertiary);

    &:hover {
      background: var(--color-fill);
      color: var(--color-label);
    }
  }
</style>
