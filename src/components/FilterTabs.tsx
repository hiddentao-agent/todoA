import type { FilterMode } from '@/store/types';
import styles from './FilterTabs.module.css';

interface FilterTabsProps {
  filter: FilterMode;
  onChange: (filter: FilterMode) => void;
}

const FILTERS: { value: FilterMode; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
];

export function FilterTabs({ filter, onChange }: FilterTabsProps) {
  return (
    <div class={styles.tablist} role="tablist" aria-label="Filter tasks">
      {FILTERS.map((tab) => {
        const isActive = filter === tab.value;
        return (
          <button
            key={tab.value}
            role="tab"
            aria-selected={isActive}
            class={`${styles.tab} ${isActive ? styles.tabActive : styles.tabInactive}`}
            onClick={() => onChange(tab.value)}
            type="button"
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
