<script lang="ts">
  import '../app.css';
  import { onMount, onDestroy } from 'svelte';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import { characterStore } from '$lib/stores/characters.svelte';
  import { modelsStore } from '$lib/stores/models.svelte';
  import { comfyuiStore } from '$lib/stores/comfyui.svelte';

  let { children } = $props();

  onMount(() => {
    characterStore.load();
    modelsStore.refresh();
    comfyuiStore.startPeriodicCheck();
  });

  onDestroy(() => {
    comfyuiStore.stopPeriodicCheck();
  });
</script>

<div class="shell">
  <Sidebar />
  <main class="shell__main">
    {@render children()}
  </main>
</div>

<style lang="scss">
  @use '$lib/styles/variables' as *;

  .shell {
    display: flex;
    min-height: 100dvh;
  }

  .shell__main {
    flex: 1;
    min-width: 0;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
  }
</style>
