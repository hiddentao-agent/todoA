import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { App } from '@/App';

// ---------- Mocks ----------

const mockLoadTodos = vi.fn().mockResolvedValue(undefined);
const mockSetFilter = vi.fn();
const mockSetSearchQuery = vi.fn();
const mockSetTheme = vi.fn();
const mockImportTodos = vi.fn();
const mockMoveTodoUp = vi.fn();
const mockMoveTodoDown = vi.fn();
const mockUndoClearCompleted = vi.fn();

interface FakeTodo {
  id: number;
  text: string;
  completed: boolean;
  order: number;
  dueDate: string | null;
  createdAt: number;
}

let mockTodos: FakeTodo[] = [];
let mockLoading = true;
let mockError: string | null = null;
let mockFilter = 'all' as string;
let mockSearchQuery = '';
let mockDueThisWeek = false;
let mockSortMode = 'manual';
let mockTheme = 'system';
let mockUndoBuffer: { tasks: FakeTodo[]; expiresAt: number } | null = null;

vi.mock('@/store', () => ({
  useTodoStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state: Record<string, unknown> = {
      todos: mockTodos,
      loading: mockLoading,
      error: mockError,
      filter: mockFilter,
      sortMode: mockSortMode,
      searchQuery: mockSearchQuery,
      dueThisWeek: mockDueThisWeek,
      theme: mockTheme,
      importing: false,
      undoBuffer: mockUndoBuffer,
      loadTodos: mockLoadTodos,
      setFilter: mockSetFilter,
      setSearchQuery: mockSetSearchQuery,
      setTheme: mockSetTheme,
      importTodos: mockImportTodos,
      moveTodoUp: mockMoveTodoUp,
      moveTodoDown: mockMoveTodoDown,
      undoClearCompleted: mockUndoClearCompleted,
      clearCompleted: vi.fn(),
      addTodo: vi.fn(),
    };
    return selector ? selector(state) : state;
  },
  selectFilteredTodos: (state: Record<string, unknown>) => {
    const todos = state.todos as FakeTodo[];
    const filter = state.filter as string;
    // Apply filter logic matching the real store
    if (filter === 'active') return todos.filter((t) => !t.completed);
    if (filter === 'completed') return todos.filter((t) => t.completed);
    return todos;
  },
  selectTaskCounts: (state: Record<string, unknown>) => {
    const todos = state.todos as FakeTodo[];
    const total = todos.length;
    const active = todos.filter((t) => !t.completed).length;
    return { total, active, completed: total - active };
  },
}));

vi.mock('@/hooks/useKeyboard', () => ({
  useKeyboard: vi.fn(),
}));

vi.mock('@/hooks/useOnlineStatus', () => ({
  useOnlineStatus: () => true,
}));

vi.mock('@/db', () => ({
  db: {
    todos: {
      orderBy: vi.fn(() => ({
        toArray: vi.fn().mockResolvedValue([]),
      })),
    },
  },
}));

vi.mock('@/utils/export', () => ({
  getExportFilename: vi.fn(),
  serializeTodos: vi.fn(),
  downloadJson: vi.fn(),
}));

vi.mock('@/utils/import', () => ({
  processImportFile: vi.fn(),
  validateFileSize: vi.fn(),
}));

const axeOptions = {
  rules: {
    'nested-interactive': { enabled: false },
    label: { enabled: false },
  },
};

// ---------- Tests ----------

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTodos = [];
    mockLoading = true;
    mockError = null;
    mockFilter = 'all';
    mockSearchQuery = '';
    mockDueThisWeek = false;
    mockSortMode = 'manual';
    mockTheme = 'system';
    mockUndoBuffer = null;
  });

  it('renders loading skeleton', () => {
    mockLoading = true;
    mockTodos = [];
    const { container } = render(<App />);
    const skeleton = container.querySelector('[aria-busy="true"]');
    expect(skeleton).toBeInTheDocument();
    expect(screen.queryByText('No tasks yet')).not.toBeInTheDocument();
  });

  it('renders error state', async () => {
    mockLoading = false;
    mockError = 'Storage unavailable';
    const { container } = render(<App />);
    const results = await axe(container, axeOptions);
    expect(results).toHaveNoViolations();
    expect(screen.getByText('Storage Unavailable')).toBeInTheDocument();
    expect(screen.getByText(/browser.*storage.*unavailable/i)).toBeInTheDocument();
    expect(screen.queryByLabelText('New task description')).not.toBeInTheDocument();
  });

  it('renders empty state when no todos exist', async () => {
    mockLoading = false;
    mockError = null;
    mockTodos = [];
    const { container } = render(<App />);
    const results = await axe(container, axeOptions);
    expect(results).toHaveNoViolations();
    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
    expect(screen.getByText('Add your first task above')).toBeInTheDocument();
    expect(screen.getByLabelText('New task description')).toBeInTheDocument();
  });

  it('renders tasks when todos exist', async () => {
    mockLoading = false;
    mockError = null;
    mockTodos = [
      { id: 1, text: 'First task', completed: false, order: 1000, dueDate: null, createdAt: 1000 },
      { id: 2, text: 'Second task', completed: true, order: 1001, dueDate: null, createdAt: 2000 },
    ];
    const { container } = render(<App />);
    const results = await axe(container, axeOptions);
    expect(results).toHaveNoViolations();
    expect(screen.getByText('First task')).toBeInTheDocument();
    expect(screen.getByText('Second task')).toBeInTheDocument();
    expect(screen.getByText('1 of 2 items')).toBeInTheDocument();
  });

  it('shows "All done!" when filter is active and all completed', () => {
    mockLoading = false;
    mockFilter = 'active';
    mockTodos = [
      { id: 1, text: 'Done task', completed: true, order: 1000, dueDate: null, createdAt: 1000 },
    ];
    render(<App />);
    // With filter='active' and all completed, selectFilteredTodos returns []
    // so hasFilteredResults is false, and it should show EmptyState with allDone variant
    // TaskStats also shows "All done!" (duplicate), so getAllByText returns 2 elements
    const allDoneElements = screen.getAllByText('All done!');
    expect(allDoneElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('No active tasks remaining')).toBeInTheDocument();
  });

  it('renders keyboard shortcuts modal when triggered', () => {
    mockLoading = false;
    mockError = null;
    mockTodos = [];
    render(<App />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Keyboard shortcuts'));
    expect(screen.getByRole('dialog', { name: 'Keyboard Shortcuts' })).toBeInTheDocument();
  });

  it('shows toast when undoBuffer is present', () => {
    mockLoading = false;
    mockError = null;
    mockTodos = [
      {
        id: 1,
        text: 'Completed task',
        completed: true,
        order: 1000,
        dueDate: null,
        createdAt: 1000,
      },
    ];
    mockUndoBuffer = {
      tasks: [
        {
          id: 1,
          text: 'Completed task',
          completed: true,
          order: 1000,
          dueDate: null,
          createdAt: 1000,
        },
      ],
      expiresAt: Date.now() + 10_000,
    };
    render(<App />);
    expect(screen.getByText(/1 completed task removed/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
  });

  it('applies theme attribute to document', () => {
    mockTheme = 'dark';
    render(<App />);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('loads todos on mount', () => {
    render(<App />);
    expect(mockLoadTodos).toHaveBeenCalledTimes(1);
  });

  it('triggers export when Export menu item is clicked', async () => {
    mockLoading = false;
    mockError = null;
    mockTodos = [
      { id: 1, text: 'Task', completed: false, order: 1000, dueDate: null, createdAt: 1000 },
    ];
    render(<App />);

    // Open settings menu
    fireEvent.click(screen.getByLabelText('Settings'));

    // Click Export in the menu
    fireEvent.click(screen.getByText('Export'));

    // Expect downloadJson to have been called (via App's handleExport)
    const exportMock = await import('@/utils/export');
    expect(exportMock.downloadJson).toHaveBeenCalled();
  });

  it('shows "Nothing completed yet" when filter is completed and none are done', () => {
    mockLoading = false;
    mockFilter = 'completed';
    mockTodos = [
      { id: 1, text: 'Active task', completed: false, order: 1000, dueDate: null, createdAt: 1000 },
    ];
    render(<App />);
    expect(screen.getByText('Nothing completed yet')).toBeInTheDocument();
    expect(screen.getByText('Complete a task to see it here')).toBeInTheDocument();
  });
});
