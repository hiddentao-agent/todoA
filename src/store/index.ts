import { create } from 'zustand';
import { db } from '@/db';
import type { Todo } from '@/db/types';
import { buildSearchIndex, search } from '@/search';
import { getWeekBounds } from '@/utils/date';
import { getNextOrder } from '@/utils/order';
import { MAX_TASK_LENGTH } from '@/constants';
import {
  type FilterMode,
  type SortMode,
  type ThemePreference,
  type UndoBuffer,
  ALLOWED_SORT_VALUES,
  ALLOWED_THEME_VALUES,
  DEFAULT_SORT,
  DEFAULT_THEME,
} from './types';

export interface TodoStore {
  // Data
  todos: Todo[];
  loading: boolean;
  error: string | null;

  // UI state
  filter: FilterMode;
  sortMode: SortMode;
  searchQuery: string;
  dueThisWeek: boolean;

  // Import lock
  importing: boolean;

  // Undo
  undoBuffer: UndoBuffer | null;

  // Theme
  theme: ThemePreference;

  // Actions
  loadTodos: () => Promise<void>;
  addTodo: (text: string, dueDate?: string) => Promise<number | undefined>;
  updateTodo: (id: number, updates: Partial<Todo>) => Promise<void>;
  deleteTodo: (id: number) => Promise<void>;
  toggleTodo: (id: number) => Promise<void>;
  clearCompleted: () => Promise<void>;
  undoClearCompleted: () => Promise<void>;
  moveTodoUp: (id: number) => Promise<void>;
  moveTodoDown: (id: number) => Promise<void>;
  importTodos: (todos: Todo[]) => Promise<void>;

  // UI actions (synchronous)
  setFilter: (filter: FilterMode) => void;
  setSortMode: (mode: SortMode) => void;
  setSearchQuery: (query: string) => void;
  setDueThisWeek: (value: boolean) => void;
  setImporting: (value: boolean) => void;
  setTheme: (theme: ThemePreference) => void;
}

function readValidatedTheme(): ThemePreference {
  try {
    const raw = localStorage.getItem('todo_theme');
    if (raw && (ALLOWED_THEME_VALUES as readonly string[]).includes(raw)) {
      return raw as ThemePreference;
    }
  } catch {
    // localStorage unavailable
  }
  return DEFAULT_THEME;
}

function readValidatedSort(): SortMode {
  try {
    const raw = localStorage.getItem('todo_sort');
    if (raw && (ALLOWED_SORT_VALUES as readonly string[]).includes(raw)) {
      return raw as SortMode;
    }
    // Overwrite invalid value
    if (raw) localStorage.setItem('todo_sort', DEFAULT_SORT);
  } catch {
    // localStorage unavailable
  }
  return DEFAULT_SORT;
}

/**
 * Refresh the in-memory todos array from the database and rebuild the search index.
 * Used after every mutation to keep the UI and search in sync with the DB.
 *
 * Accepts optional extraState to merge into set() — used by clearCompleted
 * (sets undoBuffer), undoClearCompleted (clears undoBuffer), and importTodos
 * (clears importing flag).
 */
async function refreshTodos(
  set: (partial: Partial<TodoStore>) => void,
  extraState?: Partial<TodoStore>,
): Promise<void> {
  const todos = await db.todos.orderBy('order').toArray();
  set({ todos, error: null, ...extraState });
  buildSearchIndex(todos);
}

/**
 * Swap the order of a todo with its neighbour in the given direction.
 * Shared by moveTodoUp and moveTodoDown to eliminate ~30 lines of duplication.
 */
async function swapTodoOrder(
  get: () => TodoStore,
  set: (partial: Partial<TodoStore> | ((state: TodoStore) => Partial<TodoStore>)) => void,
  id: number,
  direction: 'up' | 'down',
): Promise<void> {
  const state = get();
  const sorted = [...state.todos].sort((a, b) => a.order - b.order);
  const idx = sorted.findIndex((t) => t.id === id);
  if (idx < 0) return;

  const offset = direction === 'up' ? -1 : 1;
  if (idx + offset < 0 || idx + offset >= sorted.length) return;

  const neighbor = sorted[idx + offset];
  const current = sorted[idx];
  // Swap orders
  try {
    await db.todos.update(neighbor.id!, { order: current.order });
    await db.todos.update(current.id!, { order: neighbor.order });
    const todos = await db.todos.orderBy('order').toArray();
    set({ todos, error: null });
    // Switch back to manual sort when manually reordering
    if (state.sortMode !== 'manual') {
      get().setSortMode('manual');
    }
  } catch (err) {
    set({
      error: err instanceof Error ? err.message : `Failed to move task ${direction}`,
    });
  }
}

export const useTodoStore = create<TodoStore>((set, get) => ({
  // Data
  todos: [],
  loading: true,
  error: null,

  // UI state
  filter: 'all',
  sortMode: readValidatedSort(),
  searchQuery: '',
  dueThisWeek: false,

  // Import lock
  importing: false,

  // Undo
  undoBuffer: null,

  // Theme
  theme: readValidatedTheme(),

  // Actions
  loadTodos: async () => {
    try {
      set({ loading: true, error: null });
      const todos = await db.todos.orderBy('order').toArray();
      set({ todos, loading: false });
      buildSearchIndex(todos);
    } catch (err) {
      set({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load tasks',
      });
    }
  },

  addTodo: async (text, dueDate) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > MAX_TASK_LENGTH) return undefined;

    const state = get();
    const order = getNextOrder(state.todos);

    const todo: Omit<Todo, 'id'> = {
      text: trimmed,
      completed: false,
      order,
      dueDate: dueDate ?? null,
      createdAt: Date.now(),
    };

    try {
      const newId = await db.todos.add(todo as Todo);
      await refreshTodos(set);
      return newId as number;
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to add task',
      });
      return undefined;
    }
  },

  updateTodo: async (id, updates) => {
    const { text } = updates;
    if (text !== undefined) {
      const trimmed = text.trim();
      if (!trimmed || trimmed.length > MAX_TASK_LENGTH) return;
      updates.text = trimmed;
    }

    try {
      await db.todos.update(id, updates);
      await refreshTodos(set);
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to update task',
      });
    }
  },

  deleteTodo: async (id) => {
    try {
      await db.todos.delete(id);
      await refreshTodos(set);
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to delete task',
      });
    }
  },

  toggleTodo: async (id) => {
    const todo = get().todos.find((t) => t.id === id);
    if (!todo) return;
    try {
      await db.todos.update(id, { completed: !todo.completed });
      await refreshTodos(set);
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to toggle task',
      });
    }
  },

  clearCompleted: async () => {
    const state = get();
    const completed = state.todos.filter((t) => t.completed);
    if (completed.length === 0) return;

    const undoBuffer: UndoBuffer = {
      tasks: [...completed],
      expiresAt: Date.now() + 10_000,
    };

    try {
      await db.todos.bulkDelete(completed.map((t) => t.id!));
      await refreshTodos(set, { undoBuffer });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to clear completed tasks',
      });
    }
  },

  undoClearCompleted: async () => {
    const state = get();
    if (!state.undoBuffer || Date.now() > state.undoBuffer.expiresAt) {
      set({ undoBuffer: null });
      return;
    }

    const { tasks } = state.undoBuffer;
    // Strip ids so Dexie assigns new ones
    const restored = tasks.map(({ id: _id, ...rest }) => rest as Todo);
    try {
      await db.todos.bulkAdd(restored);
      await refreshTodos(set, { undoBuffer: null });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to undo clear',
      });
    }
  },

  moveTodoUp: (id) => swapTodoOrder(get, set, id, 'up'),
  moveTodoDown: (id) => swapTodoOrder(get, set, id, 'down'),

  importTodos: async (importedTodos) => {
    set({ importing: true });
    try {
      await db.todos.clear();
      await db.todos.bulkAdd(importedTodos);
      await refreshTodos(set, { importing: false });
    } catch (err) {
      // Re-read from DB to restore any remaining state
      await refreshTodos(set, { importing: false });
      throw err;
    }
  },

  // UI actions
  setFilter: (filter) => set({ filter }),
  setSortMode: (mode) => {
    try {
      localStorage.setItem('todo_sort', mode);
    } catch {
      // localStorage unavailable — state change is still applied
    }
    set({ sortMode: mode });
  },
  setSearchQuery: (query) => set({ searchQuery: query }),
  setDueThisWeek: (value) => set({ dueThisWeek: value }),
  setImporting: (value) => set({ importing: value }),
  setTheme: (theme) => {
    try {
      localStorage.setItem('todo_theme', theme);
    } catch {
      // localStorage unavailable
    }
    set({ theme });
  },
}));

// Selectors

export function selectFilteredTodos(state: TodoStore): Todo[] {
  let result = state.todos;

  // Apply status filter
  if (state.filter === 'active') {
    result = result.filter((t) => !t.completed);
  } else if (state.filter === 'completed') {
    result = result.filter((t) => t.completed);
  }

  // Apply "Due this week" filter
  if (state.dueThisWeek) {
    const { monday, sunday } = getWeekBounds(new Date());
    result = result.filter((t) => {
      if (!t.dueDate) return false;
      const d = new Date(t.dueDate + 'T00:00:00');
      return d >= monday && d <= sunday;
    });
  }

  // Apply search filter
  if (state.searchQuery.trim()) {
    const results = search(state.searchQuery.trim());
    const matchedIds = new Set(results.map((r) => parseInt(r.ref)));
    result = result.filter((t) => matchedIds.has(t.id!));
  }

  // Apply sort
  if (state.sortMode === 'dueDateAsc') {
    result = [...result].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return a.order - b.order;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    });
  } else if (state.sortMode === 'dueDateDesc') {
    result = [...result].sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return a.order - b.order;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return b.dueDate.localeCompare(a.dueDate);
    });
  } else {
    result = [...result].sort((a, b) => a.order - b.order);
  }

  return result;
}

export function selectTaskCounts(state: TodoStore) {
  const total = state.todos.length;
  const active = state.todos.filter((t) => !t.completed).length;
  const completed = total - active;
  return { total, active, completed };
}
