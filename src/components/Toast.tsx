import { useEffect } from 'preact/hooks';
import styles from './Toast.module.css';

interface ToastProps {
  message: string;
  onUndo: () => void;
  onDismiss: () => void;
}

export function Toast({ message, onUndo, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss();
    }, 10_000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div class={styles.toast} role="status" aria-live="polite">
      {/* Progress bar */}
      <div class={styles.progress} />

      <span class={styles.message}>{message}</span>

      <button class={styles.undoButton} onClick={onUndo} type="button">
        Undo
      </button>

      <button
        class={styles.dismissButton}
        onClick={onDismiss}
        type="button"
        aria-label="Dismiss"
      >
        &#x2715;
      </button>
    </div>
  );
}
