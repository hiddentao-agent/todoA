import { useTodoStore } from '@/store';
import styles from './ClearCompletedButton.module.css';

interface ClearCompletedButtonProps {
  count: number;
}

export function ClearCompletedButton({ count }: ClearCompletedButtonProps) {
  const clearCompleted = useTodoStore((s) => s.clearCompleted);
  const importing = useTodoStore((s) => s.importing);

  if (count <= 0) return null;

  return (
    <div class={styles.wrapper}>
      <button
        class={styles.button}
        onClick={clearCompleted}
        disabled={importing}
        type="button"
      >
        Clear completed ({count})
      </button>
    </div>
  );
}
