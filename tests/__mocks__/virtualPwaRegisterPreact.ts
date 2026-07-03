import { vi } from 'vitest';

// Configurable mock values — tests can import and modify these
export const mockNeedRefresh: [boolean, (v: boolean) => void] = [false, vi.fn()];
export const mockUpdateServiceWorker = vi.fn();

export function useRegisterSW() {
  return {
    needRefresh: mockNeedRefresh,
    offlineReady: [false, vi.fn()],
    updateServiceWorker: mockUpdateServiceWorker,
  };
}
