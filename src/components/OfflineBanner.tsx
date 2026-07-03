import { useCallback } from 'preact/hooks';
import styles from './OfflineBanner.module.css';

interface OfflineBannerProps {
  onDismiss: () => void;
}

export function OfflineBanner({ onDismiss }: OfflineBannerProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onDismiss();
      }
    },
    [onDismiss],
  );

  return (
    <div class={styles.banner} role="alert">
      <span class={styles.text}>⚠ You&apos;re offline — changes saved locally.</span>
      <button
        class={styles.dismissBtn}
        onClick={onDismiss}
        onKeyDown={handleKeyDown}
        aria-label="Dismiss offline notice"
        type="button"
      >
        ✕
      </button>
    </div>
  );
}
