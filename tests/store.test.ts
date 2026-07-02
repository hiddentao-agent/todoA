import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTodoStore, selectFilteredTodos, selectTaskCounts } from '@/store';
import type { Todo } from '@/db/types';

// Mock Dexie with a resettable in-memory store
let mockDbStore: Record<number, Todo> = {};
let mockNextId = 1;

function resetMockDb() {
  mockDbStore = {};
  mockNextId = 1;
}

vi.mock('@/db', () => ({
  db: {
    todos: {
      orderBy: vi.fn().mockReturnValue({
        toArray: vi
          .fn()
          .mockImplementation(async () =>
            Object.values(mockDbStore).sort((a, b) => a.order - b.order),
          ),
      }),
      add: vi.fn().mockImplementation(async (todo: Omit<Todo, 'id'>) => {
        const id = mockNextId++;
        const newTodo = { ...todo, id } as Todo;
        mockDbStore[id] = newTodo;
        return id;
      }),
      update: vi.fn().mockImplementation(async (id: number, updates: Partial<Todo>) => {
        if (mockDbStore[id]) {
          mockDbStore[id] = { ...mockDbStore[id], ...updates };
        }
      }),
      delete: vi.fn().mockImplementation(async (id: number) => {
        delete mockDbStore[id];
      }),
      bulkDelete: vi.fn().mockImplementation(async (ids: number[]) => {
        for (const id of ids) {
          delete mockDbStore[id];
        }
      }),
      bulkAdd: vi.fn().mockImplementation(async (todos: Todo[]) => {
        for (const todo of todos) {
          const id = mockNextId++;
          mockDbStore[id] = { ...todo, id } as Todo;
        }
      }),
      clear: vi.fn().mockImplementation(async () => {
        mockDbStore = {};
        mockNextId = 1;
      }),
    },
  },
}));

describe('TodoStore', () => {
  beforeEach(() => {
    resetMockDb();
    useTodoStore.setState({
      todos: [],
      loading: false,
      error: null,
      filter: 'all',
      sortMode: 'manual',
      searchQuery: '',
      dueThisWeek: false,
      importing: false,
      undoBuffer: null,
      theme: 'system',
    });
  });

  describe('addTodo', () => {
    it('adds a task with trimmed text', async () => {
      const { addTodo } = useTodoStore.getState();
      await addTodo('  Buy milk  ');
      const { todos } = useTodoStore.getState();
      expect(todos).toHaveLength(1);
      expect(todos[0].text).toBe('Buy milk');
      expect(todos[0].completed).toBe(false);
    });

    it('rejects empty text', async () => {
      const { addTodo } = useTodoStore.getState();
      await addTodo('   ');
      const { todos } = useTodoStore.getState();
      expect(todos).toHaveLength(0);
    });

    it('rejects text over 1000 chars', async () => {
      const { addTodo } = useTodoStore.getState();
      await addTodo('a'.repeat(1001));
      const { todos } = useTodoStore.getState();
      expect(todos).toHaveLength(0);
    });

    it('assigns increasing order values', async () => {
      const { addTodo } = useTodoStore.getState();
      await addTodo('First');
      await addTodo('Second');
      const { todos } = useTodoStore.getState();
      expect(todos).toHaveLength(2);
      expect(todos[1].order).toBeGreaterThan(todos[0].order);
    });
  });

  describe('toggleTodo', () => {
    it('toggles completion state', async () => {
      const { addTodo, toggleTodo } = useTodoStore.getState();
      await addTodo('Test');
      const { todos: afterAdd } = useTodoStore.getState();
      const id = afterAdd[0].id!;

      await toggleTodo(id);
      expect(useTodoStore.getState().todos[0].completed).toBe(true);

      await toggleTodo(id);
      expect(useTodoStore.getState().todos[0].completed).toBe(false);
    });
  });

  describe('deleteTodo', () => {
    it('removes a task', async () => {
      const { addTodo, deleteTodo } = useTodoStore.getState();
      await addTodo('Test');
      let state = useTodoStore.getState();
      expect(state.todos).toHaveLength(1);

      await deleteTodo(state.todos[0].id!);
      state = useTodoStore.getState();
      expect(state.todos).toHaveLength(0);
    });
  });

  describe('updateTodo', () => {
    it('updates task text', async () => {
      const { addTodo, updateTodo } = useTodoStore.getState();
      await addTodo('Original');
      const { todos } = useTodoStore.getState();
      const id = todos[0].id!;

      await updateTodo(id, { text: 'Updated' });
      expect(useTodoStore.getState().todos[0].text).toBe('Updated');
    });

    it('rejects empty text update', async () => {
      const { addTodo } = useTodoStore.getState();
      await addTodo('Original');
      const state = useTodoStore.getState();
      const id = state.todos[0].id!;
      const originalText = state.todos[0].text;

      await useTodoStore.getState().updateTodo(id, { text: '   ' });
      expect(useTodoStore.getState().todos[0].text).toBe(originalText);
    });
  });

  describe('clearCompleted / undoClearCompleted', () => {
    it('clears completed tasks and creates undo buffer', async () => {
      const { addTodo } = useTodoStore.getState();
      await addTodo('Active');
      await addTodo('Done');
      let state = useTodoStore.getState();
      // Toggle second task to completed
      await useTodoStore.getState().toggleTodo(state.todos[1].id!);

      await useTodoStore.getState().clearCompleted();

      state = useTodoStore.getState();
      expect(state.todos).toHaveLength(1);
      expect(state.todos[0].text).toBe('Active');
      expect(state.undoBuffer).not.toBeNull();
      expect(state.undoBuffer!.tasks).toHaveLength(1);
    });

    it('undo restores cleared tasks', async () => {
      const { addTodo } = useTodoStore.getState();
      await addTodo('Active');
      await addTodo('Done');
      let state = useTodoStore.getState();
      await useTodoStore.getState().toggleTodo(state.todos[1].id!);

      await useTodoStore.getState().clearCompleted();
      await useTodoStore.getState().undoClearCompleted();

      state = useTodoStore.getState();
      expect(state.todos).toHaveLength(2);
      expect(state.undoBuffer).toBeNull();
    });
  });

  describe('setTheme', () => {
    it('persists theme to localStorage', () => {
      const { setTheme } = useTodoStore.getState();
      setTheme('dark');
      expect(localStorage.setItem).toHaveBeenCalledWith('todo_theme', 'dark');
      expect(useTodoStore.getState().theme).toBe('dark');
    });
  });

  describe('setSortMode', () => {
    it('persists sort to localStorage', () => {
      const { setSortMode } = useTodoStore.getState();
      setSortMode('dueDateAsc');
      expect(localStorage.setItem).toHaveBeenCalledWith('todo_sort', 'dueDateAsc');
    });
  });
});

describe('selectFilteredTodos', () => {
  function makeStore(overrides: Partial<ReturnType<typeof useTodoStore.getState>> = {}) {
    return {
      todos: [] as Todo[],
      loading: false,
      error: null,
      filter: 'all' as const,
      sortMode: 'manual' as const,
      searchQuery: '',
      dueThisWeek: false,
      importing: false,
      undoBuffer: null,
      theme: 'system' as const,
      ...overrides,
    };
  }

  it('filters active tasks', () => {
    const store = makeStore({
      filter: 'active',
      todos: [
        { id: 1, text: 'Active', completed: false, order: 1000, dueDate: null, createdAt: 0 },
        { id: 2, text: 'Done', completed: true, order: 2000, dueDate: null, createdAt: 0 },
      ],
    });
    const result = selectFilteredTodos(store as ReturnType<typeof useTodoStore.getState>);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Active');
  });

  it('filters completed tasks', () => {
    const store = makeStore({
      filter: 'completed',
      todos: [
        { id: 1, text: 'Active', completed: false, order: 1000, dueDate: null, createdAt: 0 },
        { id: 2, text: 'Done', completed: true, order: 2000, dueDate: null, createdAt: 0 },
      ],
    });
    const result = selectFilteredTodos(store as ReturnType<typeof useTodoStore.getState>);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Done');
  });

  it('sorts by due date ascending', () => {
    const store = makeStore({
      sortMode: 'dueDateAsc',
      todos: [
        {
          id: 1,
          text: 'Later',
          completed: false,
          order: 1000,
          dueDate: '2026-12-25',
          createdAt: 0,
        },
        {
          id: 2,
          text: 'Earlier',
          completed: false,
          order: 2000,
          dueDate: '2026-01-01',
          createdAt: 0,
        },
        { id: 3, text: 'No date', completed: false, order: 3000, dueDate: null, createdAt: 0 },
      ],
    });
    const result = selectFilteredTodos(store as ReturnType<typeof useTodoStore.getState>);
    expect(result[0].text).toBe('Earlier');
    expect(result[1].text).toBe('Later');
    expect(result[2].text).toBe('No date');
  });

  it('sorts by due date descending', () => {
    const store = makeStore({
      sortMode: 'dueDateDesc',
      todos: [
        {
          id: 1,
          text: 'Early',
          completed: false,
          order: 1000,
          dueDate: '2026-01-01',
          createdAt: 0,
        },
        { id: 2, text: 'Late', completed: false, order: 2000, dueDate: '2026-12-25', createdAt: 0 },
      ],
    });
    const result = selectFilteredTodos(store as ReturnType<typeof useTodoStore.getState>);
    expect(result[0].text).toBe('Late');
    expect(result[1].text).toBe('Early');
  });
});

describe('selectTaskCounts', () => {
  it('computes correct counts', () => {
    const store = {
      todos: [
        { id: 1, text: 'A', completed: false, order: 1000, dueDate: null, createdAt: 0 },
        { id: 2, text: 'B', completed: true, order: 2000, dueDate: null, createdAt: 0 },
        { id: 3, text: 'C', completed: false, order: 3000, dueDate: null, createdAt: 0 },
      ],
    };
    const counts = selectTaskCounts(store as ReturnType<typeof useTodoStore.getState>);
    expect(counts.total).toBe(3);
    expect(counts.active).toBe(2);
    expect(counts.completed).toBe(1);
  });
});
