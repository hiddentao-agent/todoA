import styles from './UpdatePrompt.module.css';

interface UpdatePromptProps {
  onRefresh: () => void;
  onDismiss: () => void;
}

export function UpdatePrompt({ onRefresh, onDismiss }: UpdatePromptProps) {
  return (
    <div class={styles.prompt} role="status">
      <span class={styles.text}>A new version is available.</span>
      <div class={styles.actions}>
        <button class={styles.refreshBtn} onClick={onRefresh} type="button">
          Refresh
        </button>
        <button class={styles.dismissBtn} onClick={onDismiss} type="button">
          Dismiss
        </button>
      </div>
    </div>
  );
}
