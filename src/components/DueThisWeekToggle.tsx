import styles from './DueThisWeekToggle.module.css';

interface DueThisWeekToggleProps {
  active: boolean;
  onToggle: () => void;
}

export function DueThisWeekToggle({ active, onToggle }: DueThisWeekToggleProps) {
  return (
    <button
      class={`${styles.toggle} ${active ? styles.active : styles.inactive}`}
      onClick={onToggle}
      aria-pressed={active}
      type="button"
    >
      Due this week
    </button>
  );
}
