import { fetchModels, checkConnection } from '$lib/api/lmstudio';
import type { ConnectionStatus, LMStudioModel } from '$lib/types';

function createModelsStore() {
  let models = $state<LMStudioModel[]>([]);
  let status = $state<ConnectionStatus>('disconnected');
  let lastChecked = $state<Date | null>(null);

  async function refresh() {
    status = 'checking';
    try {
      models = await fetchModels();
      status = 'connected';
      lastChecked = new Date();
    } catch {
      models = [];
      status = 'disconnected';
    }
  }

  async function ping() {
    const ok = await checkConnection();
    status = ok ? 'connected' : 'disconnected';
    return ok;
  }

  return {
    get models() {
      return models;
    },
    get status() {
      return status;
    },
    get lastChecked() {
      return lastChecked;
    },
    refresh,
    ping
  };
}

export const modelsStore = createModelsStore();
