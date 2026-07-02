import styles from './EmptyState.module.css';

interface EmptyStateProps {
  variant: 'noTasks' | 'allDone' | 'noCompleted' | 'noSearchResults';
  searchQuery?: string;
  onClearSearch?: () => void;
}

export function EmptyState({ variant, searchQuery, onClearSearch }: EmptyStateProps) {
  return (
    <div class={styles.container}>
      {variant === 'noTasks' && (
        <>
          <div class={styles.icon}>{'📝'}</div>
          <p class={styles.title}>No tasks yet</p>
          <p class={styles.description}>Add your first task above</p>
        </>
      )}

      {variant === 'allDone' && (
        <>
          <div class={styles.icon}>{'🎉'}</div>
          <p class={styles.title}>All done!</p>
          <p class={styles.description}>No active tasks remaining</p>
        </>
      )}

      {variant === 'noCompleted' && (
        <>
          <p class={styles.title}>Nothing completed yet</p>
          <p class={styles.description}>Complete a task to see it here</p>
        </>
      )}

      {variant === 'noSearchResults' && (
        <>
          <p class={styles.title}>No tasks match &lsquo;{searchQuery}&rsquo;</p>
          {onClearSearch && (
            <button class={styles.clearButton} onClick={onClearSearch} type="button">
              Clear search
            </button>
          )}
        </>
      )}
    </div>
  );
}
