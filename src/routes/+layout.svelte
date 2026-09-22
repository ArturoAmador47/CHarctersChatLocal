<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import Toaster from '$lib/components/Toaster.svelte';
  import { characterStore } from '$lib/stores/characters.svelte';
  import { modelsStore } from '$lib/stores/models.svelte';

  let { children } = $props();

  // A single conversation takes over the whole phone screen — it has its own back button.
  const immersive = $derived(/^\/chat\/[^/]+$/.test(page.url.pathname));

  onMount(() => {
    characterStore.load();
    modelsStore.refresh();
  });
</script>

<div class="shell" class:shell--immersive={immersive}>
  <Sidebar hideOnMobile={immersive} />
  <main class="shell__main">
    {@render children()}
  </main>
</div>

<Toaster />

<style lang="scss">
  @use '$lib/styles/variables' as *;
  @use '$lib/styles/mixins' as *;

  .shell {
    display: flex;
    min-height: 100dvh;

    @include mobile {
      flex-direction: column;
    }
  }

  .shell__main {
    flex: 1;
    min-width: 0;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;

    // Clear the fixed bottom tab bar.
    @include mobile {
      padding-bottom: calc(#{$bottom-nav-height} + env(safe-area-inset-bottom));

      .shell--immersive & {
        padding-bottom: 0;
      }
    }
  }
</style>
