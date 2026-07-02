import { create } from 'zustand';
import { db } from '@/db';
import type { Todo } from '@/db/types';
import { buildSearchIndex, search } from '@/search';
import { getWeekBounds } from '@/utils/date';
import { getNextOrder } from '@/utils/order';
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
  addTodo: (text: string, dueDate?: string) => Promise<void>;
  updateTodo: (id: number, updates: Partial<Todo>) => Promise<void>;
  deleteTodo: (id: number) => Promise<void>;
  toggleTodo: (id: number) => Promise<void>;
  clearCompleted: () => Promise<void>;
  undoClearCompleted: () => Promise<void>;
  reorderTodo: (id: number, newOrder: number) => Promise<void>;
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
        error:
          err instanceof Error
            ? err.message
            : 'Failed to load tasks',
      });
    }
  },

  addTodo: async (text, dueDate) => {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 1000) return;

    const state = get();
    const order = getNextOrder(state.todos);

    const todo: Omit<Todo, 'id'> = {
      text: trimmed,
      completed: false,
      order,
      dueDate: dueDate ?? null,
      createdAt: Date.now(),
    };

    await db.todos.add(todo as Todo);
    const todos = await db.todos.orderBy('order').toArray();
    set({ todos });
    buildSearchIndex(todos);
  },

  updateTodo: async (id, updates) => {
    const { text } = updates;
    if (text !== undefined) {
      const trimmed = text.trim();
      if (!trimmed || trimmed.length > 1000) return;
      updates.text = trimmed;
    }

    await db.todos.update(id, updates);
    const todos = await db.todos.orderBy('order').toArray();
    set({ todos });
    buildSearchIndex(todos);
  },

  deleteTodo: async (id) => {
    await db.todos.delete(id);
    const todos = await db.todos.orderBy('order').toArray();
    set({ todos });
    buildSearchIndex(todos);
  },

  toggleTodo: async (id) => {
    const todo = get().todos.find((t) => t.id === id);
    if (!todo) return;
    await db.todos.update(id, { completed: !todo.completed });
    const todos = await db.todos.orderBy('order').toArray();
    set({ todos });
    buildSearchIndex(todos);
  },

  clearCompleted: async () => {
    const state = get();
    const completed = state.todos.filter((t) => t.completed);
    if (completed.length === 0) return;

    const undoBuffer: UndoBuffer = {
      tasks: [...completed],
      expiresAt: Date.now() + 10_000,
    };

    await db.todos.bulkDelete(completed.map((t) => t.id!));
    const todos = await db.todos.orderBy('order').toArray();
    set({ todos, undoBuffer });
    buildSearchIndex(todos);
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
    await db.todos.bulkAdd(restored);
    const todos = await db.todos.orderBy('order').toArray();
    set({ todos, undoBuffer: null });
    buildSearchIndex(todos);
  },

  reorderTodo: async (id, newOrder) => {
    await db.todos.update(id, { order: newOrder });
    const todos = await db.todos.orderBy('order').toArray();
    set({ todos });
  },

  importTodos: async (importedTodos) => {
    set({ importing: true });
    try {
      await db.todos.clear();
      await db.todos.bulkAdd(importedTodos);
      const todos = await db.todos.orderBy('order').toArray();
      set({ todos, importing: false });
      buildSearchIndex(todos);
    } catch (err) {
      set({ importing: false });
      // Re-read from DB to restore any remaining state
      const todos = await db.todos.orderBy('order').toArray();
      set({ todos });
      buildSearchIndex(todos);
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
