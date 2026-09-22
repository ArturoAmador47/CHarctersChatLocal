<script lang="ts">
  import { untrack } from 'svelte';
  import { mountOrb, type MountedOrbInstance, type OrbState, type OrbSize } from 'thinking-orbs-universal';
  import 'thinking-orbs-universal/shimmer.css';

  // Named `orbState`, not `state` — a prop called `state` shadows the `$state` rune.
  let {
    orbState = 'working',
    size = 20,
    label = ''
  }: {
    orbState?: OrbState;
    size?: OrbSize;
    label?: string;
  } = $props();

  let host = $state<HTMLElement | null>(null);
  let orb: MountedOrbInstance | null = null;

  // Mount once per host element; option changes are pushed, not remounted.
  $effect(() => {
    if (!host) return;
    const instance = mountOrb(host, untrack(() => ({ state: orbState, size })));
    orb = instance;
    return () => {
      instance.destroy();
      orb = null;
    };
  });

  $effect(() => {
    orb?.updateOptions({ state: orbState, size });
  });
</script>

<div class="orb" style="--orb-px: {size}px">
  <div class="orb__canvas" bind:this={host}></div>
  {#if label}
    <span class="t-shimmer" class:sm={size === 20} data-text={label}>{label}</span>
  {/if}
</div>

<style lang="scss">
  @use '$lib/styles/variables' as *;

  .orb {
    display: inline-flex;
    align-items: center;
    gap: $space-2;
  }

  .orb__canvas {
    width: var(--orb-px);
    height: var(--orb-px);
    flex-shrink: 0;
    line-height: 0;
  }
</style>
