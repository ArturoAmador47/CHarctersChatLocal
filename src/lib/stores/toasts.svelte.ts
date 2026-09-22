export type ToastKind = 'error' | 'info';

export interface Toast {
  id: string;
  kind: ToastKind;
  title: string;
  detail?: string;
}

const AUTO_DISMISS_MS = 8000;

function createToastStore() {
  let items = $state<Toast[]>([]);

  function dismiss(id: string) {
    items = items.filter(t => t.id !== id);
  }

  function push(kind: ToastKind, title: string, detail?: string) {
    const id = crypto.randomUUID();
    items = [...items, { id, kind, title, detail }];
    setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    return id;
  }

  return {
    get items() { return items; },
    error: (title: string, detail?: string) => push('error', title, detail),
    info: (title: string, detail?: string) => push('info', title, detail),
    dismiss
  };
}

export const toastStore = createToastStore();
