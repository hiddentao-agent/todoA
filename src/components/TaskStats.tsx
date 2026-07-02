import { useTodoStore, selectTaskCounts } from '@/store';
import type { FilterMode } from '@/store/types';
import styles from './TaskStats.module.css';

interface TaskStatsProps {
  filter: FilterMode;
}

export function TaskStats({ filter }: TaskStatsProps) {
  const { total, active } = useTodoStore(selectTaskCounts);
  const completed = total - active;

  let label: string;

  if (total === 0) {
    label = '0 items';
  } else if (filter === 'all') {
    label = `${active} of ${total} items`;
  } else if (filter === 'active') {
    if (active === 0 && total > 0) {
      label = 'All done!';
    } else {
      label = `${active} item${active !== 1 ? 's' : ''} left`;
    }
  } else {
    // completed
    label = `${completed} completed`;
  }

  return (
    <div class={styles.stats} aria-live="polite" aria-atomic="true">
      {label}
    </div>
  );
}
