/**
 * ComfyUI API Client
 * Handles communication with ComfyUI for image generation
 */

import type { ComfyUIWorkflowConfig } from '$lib/types';

const COMFYUI_BASE_URL = 'http://localhost:8188';
const COMFYUI_WS_URL = 'ws://localhost:8188/ws';

export const DEFAULT_WORKFLOW_CONFIG: ComfyUIWorkflowConfig = {
  checkpointModel: 'v1-5-pruned-emaonly.safetensors',
  sampler: 'euler',
  steps: 20,
  cfgScale: 7,
  width: 512,
  height: 512
};

/**
 * Check if ComfyUI server is running
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const res = await fetch(`${COMFYUI_BASE_URL}/system_stats`, {
      signal: AbortSignal.timeout(3000)
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Get available checkpoint models from ComfyUI
 */
export async function getCheckpointModels(): Promise<string[]> {
  try {
    const res = await fetch(`${COMFYUI_BASE_URL}/object_info/CheckpointLoaderSimple`);
    if (!res.ok) return [];
    const data = await res.json();
    return data?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] ?? [];
  } catch {
    return [];
  }
}

/**
 * Build a simple txt2img workflow for ComfyUI
 */
function buildWorkflow(prompt: string, config: ComfyUIWorkflowConfig): Record<string, unknown> {
  const seed = config.seed ?? Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);

  return {
    "3": {
      "class_type": "KSampler",
      "inputs": {
        "cfg": config.cfgScale,
        "denoise": 1,
        "latent_image": ["5", 0],
        "model": ["4", 0],
        "negative": ["7", 0],
        "positive": ["6", 0],
        "sampler_name": config.sampler,
        "scheduler": "normal",
        "seed": seed,
        "steps": config.steps
      }
    },
    "4": {
      "class_type": "CheckpointLoaderSimple",
      "inputs": {
        "ckpt_name": config.checkpointModel
      }
    },
    "5": {
      "class_type": "EmptyLatentImage",
      "inputs": {
        "batch_size": 1,
        "height": config.height,
        "width": config.width
      }
    },
    "6": {
      "class_type": "CLIPTextEncode",
      "inputs": {
        "clip": ["4", 1],
        "text": prompt
      }
    },
    "7": {
      "class_type": "CLIPTextEncode",
      "inputs": {
        "clip": ["4", 1],
        "text": "ugly, blurry, low quality, distorted"
      }
    },
    "8": {
      "class_type": "VAEDecode",
      "inputs": {
        "samples": ["3", 0],
        "vae": ["4", 2]
      }
    },
    "9": {
      "class_type": "SaveImage",
      "inputs": {
        "filename_prefix": "chatcharacters",
        "images": ["8", 0]
      }
    }
  };
}

export interface GenerateImageOptions {
  prompt: string;
  config?: Partial<ComfyUIWorkflowConfig>;
  onProgress?: (percent: number) => void;
  onComplete?: (imageBase64: string) => void;
  onError?: (error: string) => void;
  signal?: AbortSignal;
}

/**
 * Generate an image using ComfyUI
 * Uses WebSocket for real-time progress updates
 */
export async function generateImage(opts: GenerateImageOptions): Promise<string | null> {
  const {
    prompt,
    config = {},
    onProgress,
    onComplete,
    onError,
    signal
  } = opts;

  const fullConfig: ComfyUIWorkflowConfig = { ...DEFAULT_WORKFLOW_CONFIG, ...config };
  const workflow = buildWorkflow(prompt, fullConfig);
  const clientId = crypto.randomUUID();

  return new Promise((resolve) => {
    let ws: WebSocket | null = null;
    let promptId: string | null = null;
    let resolved = false;

    const cleanup = () => {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };

    const handleError = (error: string) => {
      if (resolved) return;
      resolved = true;
      cleanup();
      onError?.(error);
      resolve(null);
    };

    // Handle abort signal
    if (signal) {
      signal.addEventListener('abort', () => {
        handleError('Generation cancelled');
      });
    }

    // Connect WebSocket for progress updates
    try {
      ws = new WebSocket(`${COMFYUI_WS_URL}?clientId=${clientId}`);
    } catch (err) {
      handleError('Failed to connect to ComfyUI WebSocket');
      return;
    }

    ws.onopen = async () => {
      // Queue the prompt
      try {
        const res = await fetch(`${COMFYUI_BASE_URL}/prompt`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: workflow,
            client_id: clientId
          }),
          signal
        });

        if (!res.ok) {
          const errorText = await res.text();
          handleError(`ComfyUI error: ${errorText}`);
          return;
        }

        const data = await res.json();
        promptId = data.prompt_id;

        if (!promptId) {
          handleError('No prompt ID received from ComfyUI');
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Failed to queue prompt';
        handleError(msg);
      }
    };

    ws.onmessage = async (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === 'progress') {
          const { value, max } = message.data;
          const percent = Math.round((value / max) * 100);
          onProgress?.(percent);
        }

        if (message.type === 'executing' && message.data.node === null && message.data.prompt_id === promptId) {
          // Execution complete, fetch the image
          try {
            const historyRes = await fetch(`${COMFYUI_BASE_URL}/history/${promptId}`);
            if (!historyRes.ok) {
              handleError('Failed to fetch generation history');
              return;
            }

            const history = await historyRes.json();
            const outputs = history[promptId!]?.outputs;

            if (!outputs) {
              handleError('No outputs in generation history');
              return;
            }

            // Find the SaveImage output (node 9)
            const imageOutput = outputs['9'];
            if (!imageOutput?.images?.[0]) {
              handleError('No image in output');
              return;
            }

            const imageInfo = imageOutput.images[0];

            // Fetch the actual image
            const imageRes = await fetch(
              `${COMFYUI_BASE_URL}/view?filename=${encodeURIComponent(imageInfo.filename)}&subfolder=${encodeURIComponent(imageInfo.subfolder || '')}&type=${encodeURIComponent(imageInfo.type || 'output')}`
            );

            if (!imageRes.ok) {
              handleError('Failed to fetch generated image');
              return;
            }

            const imageBlob = await imageRes.blob();
            const reader = new FileReader();

            reader.onload = () => {
              if (resolved) return;
              resolved = true;
              cleanup();

              const base64 = reader.result as string;
              onComplete?.(base64);
              resolve(base64);
            };

            reader.onerror = () => {
              handleError('Failed to read image data');
            };

            reader.readAsDataURL(imageBlob);
          } catch (err) {
            const msg = err instanceof Error ? err.message : 'Failed to retrieve image';
            handleError(msg);
          }
        }

        if (message.type === 'execution_error') {
          handleError(message.data.exception_message || 'ComfyUI execution error');
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    ws.onerror = () => {
      handleError('WebSocket connection error');
    };

    ws.onclose = () => {
      if (!resolved) {
        handleError('WebSocket connection closed unexpectedly');
      }
    };

    // Timeout after 5 minutes
    setTimeout(() => {
      if (!resolved) {
        handleError('Image generation timed out');
      }
    }, 5 * 60 * 1000);
  });
}

/**
 * Cancel a running generation by prompt ID
 */
export async function cancelGeneration(promptId: string): Promise<void> {
  try {
    await fetch(`${COMFYUI_BASE_URL}/interrupt`, {
      method: 'POST'
    });
  } catch {
    // Ignore errors
  }
}
