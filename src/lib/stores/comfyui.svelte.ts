/**
 * ComfyUI Connection Store
 * Tracks ComfyUI server connection status and provides health checks
 */

import { checkConnection, getCheckpointModels, DEFAULT_WORKFLOW_CONFIG } from '$lib/api/comfyui';
import type { ComfyUIConnectionStatus, ComfyUIWorkflowConfig } from '$lib/types';

const CHECK_INTERVAL = 30000; // Check every 30 seconds

function createComfyUIStore() {
  let status = $state<ComfyUIConnectionStatus>('checking');
  let lastCheck = $state<Date | null>(null);
  let availableModels = $state<string[]>([]);
  let config = $state<ComfyUIWorkflowConfig>({ ...DEFAULT_WORKFLOW_CONFIG });
  let checkIntervalId: ReturnType<typeof setInterval> | null = null;

  async function check(): Promise<boolean> {
    status = 'checking';

    const connected = await checkConnection();
    status = connected ? 'connected' : 'disconnected';
    lastCheck = new Date();

    if (connected && availableModels.length === 0) {
      // Fetch available models on first successful connection
      availableModels = await getCheckpointModels();

      // If we have models and current config model isn't in the list, use the first one
      if (availableModels.length > 0 && !availableModels.includes(config.checkpointModel)) {
        config = { ...config, checkpointModel: availableModels[0] };
      }
    }

    return connected;
  }

  function startPeriodicCheck() {
    if (checkIntervalId) return;

    // Initial check
    check();

    // Periodic checks
    checkIntervalId = setInterval(check, CHECK_INTERVAL);
  }

  function stopPeriodicCheck() {
    if (checkIntervalId) {
      clearInterval(checkIntervalId);
      checkIntervalId = null;
    }
  }

  function updateConfig(updates: Partial<ComfyUIWorkflowConfig>) {
    config = { ...config, ...updates };
  }

  return {
    get status() { return status; },
    get isConnected() { return status === 'connected'; },
    get isChecking() { return status === 'checking'; },
    get lastCheck() { return lastCheck; },
    get availableModels() { return availableModels; },
    get config() { return config; },

    check,
    startPeriodicCheck,
    stopPeriodicCheck,
    updateConfig
  };
}

export const comfyuiStore = createComfyUIStore();
