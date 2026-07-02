import { useEffect, useRef } from 'preact/hooks';
import styles from './KeyboardShortcutsModal.module.css';

interface KeyboardShortcutsModalProps {
  onClose: () => void;
}

interface ShortcutEntry {
  keys: string[];
  action: string;
}

const SHORTCUTS: ShortcutEntry[] = [
  { keys: ['Enter'], action: 'Add task (in input) or edit task (when focused)' },
  { keys: ['Enter'], action: 'Save edit (in edit mode)' },
  { keys: ['Escape'], action: 'Discard edit or close modal' },
  { keys: ['Space'], action: 'Toggle task complete' },
  { keys: ['Delete', 'Backspace'], action: 'Delete focused task' },
  { keys: ['Ctrl', '↑'], action: 'Move task up' },
  { keys: ['Ctrl', '↓'], action: 'Move task down' },
  { keys: ['/'], action: 'Focus search' },
  { keys: ['?'], action: 'Show this dialog' },
];

/**
 * Renders a keyboard shortcuts reference modal.
 *
 * - Opens via `?` key elsewhere in the app.
 * - Focus trap: Tab cycles within the dialog; Escape closes it.
 * - Returns focus to the previously focused element on close.
 */
export default function KeyboardShortcutsModal({ onClose }: KeyboardShortcutsModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const dialog = dialogRef.current;
    if (dialog) {
      const focusable = getFocusableElements(dialog);
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        dialog.focus();
      }
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab' && dialog) {
        const focusable = getFocusableElements(dialog);
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, [onClose]);

  function handleBackdropClick(e: MouseEvent) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  return (
    <div class={styles.backdrop} onClick={handleBackdropClick}>
      <div
        ref={dialogRef}
        class={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
      >
        {/* Header */}
        <div class={styles.header}>
          <h2 id="modal-title" class={styles.title}>
            Keyboard Shortcuts
          </h2>
          <button
            class={styles.closeButton}
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            &#x2715;
          </button>
        </div>

        {/* Shortcuts Table */}
        <table class={styles.table}>
          <thead>
            <tr class={styles.tableRow}>
              <th class={styles.tableCell}>Key</th>
              <th class={styles.tableCell}>Action</th>
            </tr>
          </thead>
          <tbody>
            {SHORTCUTS.map((shortcut, index) => (
              <tr key={index} class={styles.tableRow}>
                <td class={styles.tableCell}>
                  {shortcut.keys.map((key, ki) => (
                    <span key={ki}>
                      {ki > 0 && <span> + </span>}
                      <kbd>{key}</kbd>
                    </span>
                  ))}
                </td>
                <td class={styles.tableCell}>{shortcut.action}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Returns all focusable elements within a container.
 */
function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  );
}
