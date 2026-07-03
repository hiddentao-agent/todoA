import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTodoStore, selectFilteredTodos, selectTaskCounts } from '@/store';
import { buildSearchIndex } from '@/search';
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

  describe('loadTodos', () => {
    it('loads todos from db and sets loading to false', async () => {
      // Add todos directly to the mock DB
      const todos = [
        { id: 1, text: 'Loaded', completed: false, order: 1000, dueDate: null, createdAt: 0 },
      ];
      mockDbStore[1] = { ...todos[0], id: 1 } as Todo;

      useTodoStore.setState({ todos: [], loading: true });
      await useTodoStore.getState().loadTodos();
      const state = useTodoStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(state.todos).toHaveLength(1);
      expect(state.todos[0].text).toBe('Loaded');
    });

    it('sets error when loadTodos fails', async () => {
      const db = await import('@/db');
      const { db: mockDb } = db;
      const todosMock = mockDb.todos as unknown as Record<string, unknown>;
      const orderByMock = todosMock['orderBy'] as () => Record<string, unknown>;
      const originalImpl = orderByMock()['toArray'];

      orderByMock()['toArray'] = vi.fn().mockRejectedValue(new Error('DB error'));

      useTodoStore.setState({ todos: [], loading: true, error: null });
      await useTodoStore.getState().loadTodos();
      const state = useTodoStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBe('DB error');

      // Restore
      orderByMock()['toArray'] = originalImpl;
    });

    it('sets generic error message when non-Error is thrown', async () => {
      const db = await import('@/db');
      const { db: mockDb } = db;
      const todosMock = mockDb.todos as unknown as Record<string, unknown>;
      const orderByMock = todosMock['orderBy'] as () => Record<string, unknown>;
      const originalImpl = orderByMock()['toArray'];

      orderByMock()['toArray'] = vi.fn().mockRejectedValue('string error');

      useTodoStore.setState({ todos: [], loading: true, error: null });
      await useTodoStore.getState().loadTodos();
      const state = useTodoStore.getState();
      expect(state.error).toBe('Failed to load tasks');

      // Restore
      orderByMock()['toArray'] = originalImpl;
    });
  });

  describe('moveTodoUp / moveTodoDown', () => {
    it('moves a todo up by swapping order', async () => {
      const { addTodo, moveTodoUp } = useTodoStore.getState();
      await addTodo('First');
      await addTodo('Second');
      await addTodo('Third');
      let state = useTodoStore.getState();
      const secondId = state.todos[1].id!;

      await moveTodoUp(secondId);
      state = useTodoStore.getState();
      expect(state.todos[0].text).toBe('Second');
      expect(state.todos[1].text).toBe('First');
    });

    it('does not move first todo up', async () => {
      const { addTodo, moveTodoUp } = useTodoStore.getState();
      await addTodo('First');
      await addTodo('Second');
      let state = useTodoStore.getState();
      const firstId = state.todos[0].id!;

      await moveTodoUp(firstId);
      state = useTodoStore.getState();
      expect(state.todos[0].text).toBe('First');
    });

    it('moves a todo down by swapping order', async () => {
      const { addTodo, moveTodoDown } = useTodoStore.getState();
      await addTodo('First');
      await addTodo('Second');
      await addTodo('Third');
      let state = useTodoStore.getState();
      const firstId = state.todos[0].id!;

      await moveTodoDown(firstId);
      state = useTodoStore.getState();
      expect(state.todos[0].text).toBe('Second');
      expect(state.todos[1].text).toBe('First');
    });

    it('does not move last todo down', async () => {
      const { addTodo, moveTodoDown } = useTodoStore.getState();
      await addTodo('First');
      await addTodo('Second');
      let state = useTodoStore.getState();
      const lastId = state.todos[1].id!;

      await moveTodoDown(lastId);
      state = useTodoStore.getState();
      expect(state.todos[1].text).toBe('Second');
    });

    it('switches to manual sort mode when reordering', async () => {
      useTodoStore.setState({ sortMode: 'dueDateAsc' });
      const { addTodo, moveTodoUp } = useTodoStore.getState();
      await addTodo('First');
      await addTodo('Second');
      let state = useTodoStore.getState();
      const secondId = state.todos[1].id!;

      await moveTodoUp(secondId);
      state = useTodoStore.getState();
      expect(state.sortMode).toBe('manual');
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

  describe('importTodos', () => {
    it('replaces all todos with imported ones', async () => {
      const { addTodo, importTodos } = useTodoStore.getState();
      await addTodo('Original');
      expect(useTodoStore.getState().todos).toHaveLength(1);

      await importTodos([
        { id: 10, text: 'Imported', completed: false, order: 1000, dueDate: null, createdAt: 0 },
      ]);
      const state = useTodoStore.getState();
      expect(state.todos).toHaveLength(1);
      expect(state.todos[0].text).toBe('Imported');
    });

    it('sets importing to false after completion', async () => {
      await useTodoStore.getState().importTodos([]);
      expect(useTodoStore.getState().importing).toBe(false);
    });
  });

  describe('setSearchQuery / setDueThisWeek / setImporting', () => {
    it('sets search query', () => {
      useTodoStore.getState().setSearchQuery('test query');
      expect(useTodoStore.getState().searchQuery).toBe('test query');
    });

    it('sets due this week', () => {
      useTodoStore.getState().setDueThisWeek(true);
      expect(useTodoStore.getState().dueThisWeek).toBe(true);

      useTodoStore.getState().setDueThisWeek(false);
      expect(useTodoStore.getState().dueThisWeek).toBe(false);
    });

    it('sets importing', () => {
      useTodoStore.getState().setImporting(true);
      expect(useTodoStore.getState().importing).toBe(true);
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

  describe('error handling in write actions', () => {
    /**
     * Helper: overrides a mock method on the Dexie mock, runs the action, then restores.
     * Ensures the mock is always restored even if the test assertion fails.
     */
    async function withMockError(
      methodName: 'add' | 'update' | 'delete' | 'bulkDelete' | 'bulkAdd',
      rejectValue: unknown,
      action: () => Promise<unknown>,
      expectedError: string,
    ) {
      const db = await import('@/db');
      const { db: mockDb } = db;
      const original = mockDb.todos[methodName] as unknown;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mockDb.todos as unknown as Record<string, unknown>)[methodName] = vi
          .fn()
          .mockRejectedValue(rejectValue);
        await action();
        expect(useTodoStore.getState().error).toBe(expectedError);
      } finally {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (mockDb.todos as unknown as Record<string, unknown>)[methodName] = original;
      }
    }

    beforeEach(() => {
      useTodoStore.setState({ error: null });
    });

    describe('addTodo', () => {
      it('sets error message when Dexie add rejects with Error', async () => {
        await withMockError(
          'add',
          new Error('Add failed'),
          () => useTodoStore.getState().addTodo('Valid text'),
          'Add failed',
        );
      });

      it('sets generic error when Dexie add rejects with non-Error', async () => {
        await withMockError(
          'add',
          'string error',
          () => useTodoStore.getState().addTodo('Valid text'),
          'Failed to add task',
        );
      });
    });

    describe('updateTodo', () => {
      const setup = async () => {
        await useTodoStore.getState().addTodo('Test');
        return useTodoStore.getState().todos[0].id!;
      };

      it('sets error message when Dexie update rejects', async () => {
        const id = await setup();
        await withMockError(
          'update',
          new Error('Update failed'),
          () => useTodoStore.getState().updateTodo(id, { text: 'Updated' }),
          'Update failed',
        );
      });

      it('sets generic error when Dexie update rejects with non-Error', async () => {
        const id = await setup();
        await withMockError(
          'update',
          'string error',
          () => useTodoStore.getState().updateTodo(id, { text: 'Updated' }),
          'Failed to update task',
        );
      });
    });

    describe('deleteTodo', () => {
      const setup = async () => {
        await useTodoStore.getState().addTodo('Test');
        return useTodoStore.getState().todos[0].id!;
      };

      it('sets error message when Dexie delete rejects', async () => {
        const id = await setup();
        await withMockError(
          'delete',
          new Error('Delete failed'),
          () => useTodoStore.getState().deleteTodo(id),
          'Delete failed',
        );
      });

      it('sets generic error when Dexie delete rejects with non-Error', async () => {
        const id = await setup();
        await withMockError(
          'delete',
          'string error',
          () => useTodoStore.getState().deleteTodo(id),
          'Failed to delete task',
        );
      });
    });

    describe('toggleTodo', () => {
      const setup = async () => {
        await useTodoStore.getState().addTodo('Test');
        return useTodoStore.getState().todos[0].id!;
      };

      it('sets error message when Dexie update rejects', async () => {
        const id = await setup();
        await withMockError(
          'update',
          new Error('Toggle failed'),
          () => useTodoStore.getState().toggleTodo(id),
          'Toggle failed',
        );
      });

      it('sets generic error when Dexie toggle rejects with non-Error', async () => {
        const id = await setup();
        await withMockError(
          'update',
          'string error',
          () => useTodoStore.getState().toggleTodo(id),
          'Failed to toggle task',
        );
      });
    });

    describe('clearCompleted', () => {
      const setup = async () => {
        await useTodoStore.getState().addTodo('Done');
        const id = useTodoStore.getState().todos[0].id!;
        await useTodoStore.getState().toggleTodo(id);
        useTodoStore.setState({ error: null });
      };

      it('sets error message when Dexie bulkDelete rejects', async () => {
        await setup();
        await withMockError(
          'bulkDelete',
          new Error('Clear failed'),
          () => useTodoStore.getState().clearCompleted(),
          'Clear failed',
        );
      });

      it('sets generic error when Dexie clearCompleted rejects with non-Error', async () => {
        await setup();
        await withMockError(
          'bulkDelete',
          'string error',
          () => useTodoStore.getState().clearCompleted(),
          'Failed to clear completed tasks',
        );
      });
    });

    describe('moveTodoUp', () => {
      const setup = async () => {
        await useTodoStore.getState().addTodo('First');
        await useTodoStore.getState().addTodo('Second');
        return useTodoStore.getState().todos[1].id!;
      };

      it('sets error message when Dexie update rejects', async () => {
        const id = await setup();
        await withMockError(
          'update',
          new Error('Move up failed'),
          () => useTodoStore.getState().moveTodoUp(id),
          'Move up failed',
        );
      });
    });

    describe('moveTodoDown', () => {
      const setup = async () => {
        await useTodoStore.getState().addTodo('First');
        await useTodoStore.getState().addTodo('Second');
        return useTodoStore.getState().todos[0].id!;
      };

      it('sets error message when Dexie update rejects', async () => {
        const id = await setup();
        await withMockError(
          'update',
          new Error('Move down failed'),
          () => useTodoStore.getState().moveTodoDown(id),
          'Move down failed',
        );
      });
    });

    describe('undoClearCompleted', () => {
      const setup = async () => {
        await useTodoStore.getState().addTodo('Task');
        const id = useTodoStore.getState().todos[0].id!;
        await useTodoStore.getState().toggleTodo(id);
        await useTodoStore.getState().clearCompleted();
        // Now undoBuffer is set
        expect(useTodoStore.getState().undoBuffer).not.toBeNull();
        useTodoStore.setState({ error: null });
      };

      it('sets error message when Dexie bulkAdd rejects', async () => {
        await setup();
        await withMockError(
          'bulkAdd',
          new Error('Undo failed'),
          () => useTodoStore.getState().undoClearCompleted(),
          'Undo failed',
        );
      });

      it('sets generic error when Dexie undoClearCompleted rejects with non-Error', async () => {
        await setup();
        await withMockError(
          'bulkAdd',
          'string error',
          () => useTodoStore.getState().undoClearCompleted(),
          'Failed to undo clear',
        );
      });
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
  it('sorts by default order when sortMode is manual', () => {
    const store = makeStore({
      sortMode: 'manual',
      todos: [
        { id: 2, text: 'Second', completed: false, order: 2000, dueDate: null, createdAt: 0 },
        { id: 1, text: 'First', completed: false, order: 1000, dueDate: null, createdAt: 0 },
      ],
    });
    const result = selectFilteredTodos(store as ReturnType<typeof useTodoStore.getState>);
    expect(result[0].text).toBe('First');
    expect(result[1].text).toBe('Second');
  });

  it('filters by due this week', () => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);

    const thisWeekDate = monday.toISOString().slice(0, 10);
    const lastWeekDate = new Date(monday.getTime() - 86400000).toISOString().slice(0, 10);

    const store = makeStore({
      dueThisWeek: true,
      todos: [
        {
          id: 1,
          text: 'This week',
          completed: false,
          order: 1000,
          dueDate: thisWeekDate,
          createdAt: 0,
        },
        {
          id: 2,
          text: 'Last week',
          completed: false,
          order: 2000,
          dueDate: lastWeekDate,
          createdAt: 0,
        },
        { id: 3, text: 'No date', completed: false, order: 3000, dueDate: null, createdAt: 0 },
      ],
    });
    const result = selectFilteredTodos(store as ReturnType<typeof useTodoStore.getState>);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('This week');
  });

  it('filters by search query', () => {
    const todos: Todo[] = [
      {
        id: 1,
        text: 'Find me unique text',
        completed: false,
        order: 1000,
        dueDate: null,
        createdAt: 0,
      },
      { id: 2, text: 'Ordinary', completed: false, order: 2000, dueDate: null, createdAt: 0 },
    ];
    buildSearchIndex(todos);
    const store = makeStore({
      searchQuery: 'unique',
      todos,
    });
    const result = selectFilteredTodos(store as ReturnType<typeof useTodoStore.getState>);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe('Find me unique text');
  });

  it('filters by search query with no matches', () => {
    const todos: Todo[] = [
      { id: 1, text: 'Something else', completed: false, order: 1000, dueDate: null, createdAt: 0 },
    ];
    buildSearchIndex(todos);
    const store = makeStore({
      searchQuery: 'nonexistent',
      todos,
    });
    const result = selectFilteredTodos(store as ReturnType<typeof useTodoStore.getState>);
    expect(result).toHaveLength(0);
  });

  it('sorts null due dates to the end ascending', () => {
    const store = makeStore({
      sortMode: 'dueDateAsc',
      todos: [
        { id: 1, text: 'Null date', completed: false, order: 1000, dueDate: null, createdAt: 0 },
        {
          id: 2,
          text: 'Has date',
          completed: false,
          order: 2000,
          dueDate: '2026-06-01',
          createdAt: 0,
        },
      ],
    });
    const result = selectFilteredTodos(store as ReturnType<typeof useTodoStore.getState>);
    expect(result[0].text).toBe('Has date');
    expect(result[1].text).toBe('Null date');
  });

  it('sorts null due dates to the end descending', () => {
    const store = makeStore({
      sortMode: 'dueDateDesc',
      todos: [
        { id: 1, text: 'Null date', completed: false, order: 1000, dueDate: null, createdAt: 0 },
        {
          id: 2,
          text: 'Has date',
          completed: false,
          order: 2000,
          dueDate: '2026-06-01',
          createdAt: 0,
        },
      ],
    });
    const result = selectFilteredTodos(store as ReturnType<typeof useTodoStore.getState>);
    expect(result[0].text).toBe('Has date');
    expect(result[1].text).toBe('Null date');
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
