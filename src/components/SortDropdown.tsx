import type { SortMode } from '@/store/types';
import styles from './SortDropdown.module.css';

interface SortDropdownProps {
  sortMode: SortMode;
  onChange: (mode: SortMode) => void;
}

export function SortDropdown({ sortMode, onChange }: SortDropdownProps) {
  return (
    <select
      class={styles.sortSelect}
      value={sortMode}
      onChange={(e) => {
        onChange((e.target as HTMLSelectElement).value as SortMode);
      }}
      aria-label="Sort tasks"
    >
      <option value="manual">Manual order</option>
      <option value="dueDateAsc">Due date ↑</option>
      <option value="dueDateDesc">Due date ↓</option>
    </select>
  );
}
