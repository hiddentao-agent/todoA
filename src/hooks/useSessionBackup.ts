import { useCallback } from 'preact/hooks';

/**
 * Encapsulates sessionStorage backup with null-key guard and try/catch safety.
 * Returns stable `save` and `clear` callbacks keyed on the `key` parameter.
 *
 * Used by TaskItem to persist in-progress edits across service-worker-triggered
 * reloads (spec §7.3 SW mid-edit safety net).
 */
export function useSessionBackup(key: string | null) {
  const save = useCallback(
    (value: string) => {
      if (key) {
        try {
          sessionStorage.setItem(key, value);
        } catch {
          // sessionStorage unavailable
        }
      }
    },
    [key],
  );

  const clear = useCallback(() => {
    if (key) {
      try {
        sessionStorage.removeItem(key);
      } catch {
        // sessionStorage unavailable
      }
    }
  }, [key]);

  return { save, clear };
}
