import { useTodoStore } from '@/store';
import type { ThemePreference } from '@/store/types';
import styles from './ThemeToggle.module.css';

const THEME_ICONS: Record<ThemePreference, string> = {
  system: '\u{1F5A5}\u{FE0F}',
  light: '\u{2600}\u{FE0F}',
  dark: '\u{263E}\u{FE0F}',
};

const THEME_LABELS: Record<ThemePreference, string> = {
  system: 'system',
  light: 'light',
  dark: 'dark',
};

const NEXT_THEME: Record<ThemePreference, ThemePreference> = {
  system: 'light',
  light: 'dark',
  dark: 'system',
};

export function ThemeToggle() {
  const theme = useTodoStore((s) => s.theme);
  const setTheme = useTodoStore((s) => s.setTheme);

  const next = NEXT_THEME[theme];

  const handleClick = () => {
    setTheme(next);
  };

  return (
    <button
      class={styles.toggleButton}
      onClick={handleClick}
      type="button"
      aria-label={`Current theme: ${THEME_LABELS[theme]}. Click to switch to ${THEME_LABELS[next]}.`}
      title={`Theme: ${THEME_LABELS[theme]}`}
    >
      {THEME_ICONS[theme]}
    </button>
  );
}
