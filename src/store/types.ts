import type { Todo } from '@/db/types';

export type FilterMode = 'all' | 'active' | 'completed';
export type SortMode = 'manual' | 'dueDateAsc' | 'dueDateDesc';
export type ThemePreference = 'system' | 'light' | 'dark';

export interface UndoBuffer {
  tasks: Todo[];
  expiresAt: number;
}

export const ALLOWED_THEME_VALUES: readonly ThemePreference[] = [
  'system',
  'light',
  'dark',
] as const;

export const ALLOWED_SORT_VALUES: readonly SortMode[] = [
  'manual',
  'dueDateAsc',
  'dueDateDesc',
] as const;

export const DEFAULT_THEME: ThemePreference = 'system';
export const DEFAULT_SORT: SortMode = 'manual';
