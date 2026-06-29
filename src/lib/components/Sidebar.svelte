<script lang="ts">
  import { page } from '$app/state';
  import { characterStore } from '$lib/stores/characters.svelte';
  import { modelsStore } from '$lib/stores/models.svelte';

  const navItems = [
    { href: '/characters', label: 'Characters', icon: '🎭' },
    { href: '/chat', label: 'Chats', icon: '💬' }
  ];
</script>

<aside class="sidebar">
  <!-- App Header -->
  <div class="sidebar__header">
    <div class="sidebar__logo">
      <span class="sidebar__logo-icon">✨</span>
      <span class="sidebar__logo-text">ChatCharacters</span>
    </div>
  </div>

  <!-- Navigation -->
  <nav class="sidebar__nav">
    <div class="sidebar__section-label">Navigation</div>
    {#each navItems as item}
      <a
        href={item.href}
        class="sidebar__item"
        class:sidebar__item--active={page.url.pathname.startsWith(item.href)}
      >
        <span class="sidebar__item-icon">{item.icon}</span>
        <span class="sidebar__item-label">{item.label}</span>
        {#if item.href === '/characters'}
          <span class="sidebar__badge">{characterStore.list.length}</span>
        {/if}
      </a>
    {/each}
  </nav>

  <!-- Connection Status -->
  <div class="sidebar__footer">
    <div class="sidebar__connection">
      <div
        class="sidebar__connection-dot"
        class:sidebar__connection-dot--connected={modelsStore.status === 'connected'}
        class:sidebar__connection-dot--checking={modelsStore.status === 'checking'}
      ></div>
      <div class="sidebar__connection-info">
        <span class="sidebar__connection-label">LM Studio</span>
        <span class="sidebar__connection-status">
          {#if modelsStore.status === 'connected'}
            {modelsStore.models.length} model{modelsStore.models.length !== 1 ? 's' : ''}
          {:else if modelsStore.status === 'checking'}
            Connecting…
          {:else}
            Disconnected
          {/if}
        </span>
      </div>
      <button
        class="sidebar__connection-btn"
        onclick={() => modelsStore.refresh()}
        title="Refresh connection"
      >
        ↺
      </button>
    </div>
  </div>
</aside>

<style lang="scss">
  @use '$lib/styles/variables' as *;
  @use '$lib/styles/mixins' as *;

  .sidebar {
    display: flex;
    flex-direction: column;
    width: $sidebar-width;
    min-width: $sidebar-width;
    height: 100dvh;
    background: $color-sidebar;
    position: sticky;
    top: 0;
    overflow: hidden;
  }

  .sidebar__header {
    padding: $space-6 $space-5 $space-4;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  }

  .sidebar__logo {
    display: flex;
    align-items: center;
    gap: $space-3;
  }

  .sidebar__logo-icon {
    font-size: 1.5rem;
    line-height: 1;
  }

  .sidebar__logo-text {
    font-size: $fs-headline;
    font-weight: 700;
    color: #FFFFFF;
    letter-spacing: -0.02em;
  }

  .sidebar__nav {
    flex: 1;
    padding: $space-4 $space-3;
    display: flex;
    flex-direction: column;
    gap: $space-1;
    overflow-y: auto;
  }

  .sidebar__section-label {
    @include section-label;
    color: rgba(235, 235, 245, 0.4);
    padding: 0 $space-3;
    margin-bottom: $space-2;
  }

  .sidebar__item {
    display: flex;
    align-items: center;
    gap: $space-3;
    padding: $space-3 $space-3;
    border-radius: $radius-md;
    color: rgba(235, 235, 245, 0.7);
    text-decoration: none;
    font-size: $fs-callout;
    font-weight: 500;
    transition: all $transition-fast;
    position: relative;

    &:hover {
      background: rgba(255, 255, 255, 0.07);
      color: #FFFFFF;
    }

    &--active {
      background: $color-sidebar-item-active;
      color: #FFFFFF;
    }
  }

  .sidebar__item-icon {
    font-size: 1.1rem;
    line-height: 1;
    flex-shrink: 0;
  }

  .sidebar__item-label {
    flex: 1;
  }

  .sidebar__badge {
    font-size: $fs-caption;
    font-weight: 600;
    color: rgba(235, 235, 245, 0.5);
    background: rgba(255, 255, 255, 0.08);
    padding: 2px 7px;
    border-radius: $radius-full;
  }

  .sidebar__footer {
    padding: $space-4;
    border-top: 1px solid rgba(255, 255, 255, 0.06);
  }

  .sidebar__connection {
    display: flex;
    align-items: center;
    gap: $space-3;
    padding: $space-3;
    border-radius: $radius-md;
    background: rgba(255, 255, 255, 0.04);
  }

  .sidebar__connection-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: rgba(235, 235, 245, 0.3);
    flex-shrink: 0;
    transition: background $transition-normal;

    &--connected {
      background: $color-accent-green;
      box-shadow: 0 0 6px rgba($color-accent-green, 0.6);
    }

    &--checking {
      background: $color-accent-orange;
      animation: pulse 1.2s ease-in-out infinite;
    }
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .sidebar__connection-info {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .sidebar__connection-label {
    font-size: $fs-footnote;
    font-weight: 600;
    color: rgba(235, 235, 245, 0.8);
  }

  .sidebar__connection-status {
    font-size: $fs-caption;
    color: rgba(235, 235, 245, 0.4);
  }

  .sidebar__connection-btn {
    @include btn-reset;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: $radius-sm;
    color: rgba(235, 235, 245, 0.5);
    font-size: 1rem;
    transition: all $transition-fast;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #FFFFFF;
    }
  }
</style>
