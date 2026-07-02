import { useEffect } from 'preact/hooks';

interface KeyboardActions {
  onSearchFocus?: () => void;
  onShortcutsOpen?: () => void;
}

/**
 * Global keyboard shortcut handler.
 * Handles shortcuts that fire regardless of focused element,
 * except when the user is typing in an input/textarea.
 */
export function useKeyboard(actions: KeyboardActions): void {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      const tag = target.tagName.toLowerCase();
      const isInput = tag === 'input' || tag === 'textarea' || target.isContentEditable;

      // / — focus search (only when not typing)
      if (
        e.key === '/' &&
        !isInput &&
        actions.onSearchFocus
      ) {
        e.preventDefault();
        actions.onSearchFocus();
        return;
      }

      // ? — open keyboard shortcuts modal (only when not typing)
      if (
        e.key === '?' &&
        !e.shiftKey &&
        !isInput &&
        actions.onShortcutsOpen
      ) {
        e.preventDefault();
        actions.onShortcutsOpen();
        return;
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [actions]);
}
