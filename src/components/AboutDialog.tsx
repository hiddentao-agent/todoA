import { useRef, useEffect } from 'preact/hooks';
import { getFocusableElements } from '@/utils/focus';
import styles from './AboutDialog.module.css';

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

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
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      class={styles.backdrop}
      onClick={onClose}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClose();
        }
      }}
      role="button"
      tabIndex={-1}
      aria-label="Close about dialog"
    >
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        ref={dialogRef}
        class={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        onClick={(e: MouseEvent) => e.stopPropagation()}
        onKeyDown={(e: KeyboardEvent) => e.stopPropagation()}
        tabIndex={-1}
      >
        <h2 id="about-title" class={styles.title}>
          About
        </h2>
        <p class={styles.text}>Todo App — A simple task manager built with Preact.</p>
        <div class={styles.version}>Version 1.0.0</div>
        <button class={styles.closeButton} onClick={onClose} type="button" aria-label="Close">
          Close
        </button>
      </div>
    </div>
  );
}
