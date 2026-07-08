import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { App } from '@/App';
import type { Todo } from '@/db/types';

// ---------- Mocks ----------

const mockLoadTodos = vi.fn().mockResolvedValue(undefined);
const mockSetFilter = vi.fn();
const mockSetSearchQuery = vi.fn();
const mockSetTheme = vi.fn();
const mockImportTodos = vi.fn();
const mockMoveTodoUp = vi.fn();
const mockMoveTodoDown = vi.fn();
const mockUndoClearCompleted = vi.fn();

let mockTodos: Todo[] = [];
let mockLoading = true;
let mockError: string | null = null;
let mockFilter = 'all' as string;
let mockSearchQuery = '';
let mockDueThisWeek = false;
let mockSortMode = 'manual';
let mockTheme = 'system';
let mockUndoBuffer: { tasks: Todo[]; expiresAt: number } | null = null;

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
    const todos = state.todos as Todo[];
    const filter = state.filter as string;
    // Apply filter logic matching the real store
    if (filter === 'active') return todos.filter((t) => !t.completed);
    if (filter === 'completed') return todos.filter((t) => t.completed);
    return todos;
  },
  selectTaskCounts: (state: Record<string, unknown>) => {
    const todos = state.todos as Todo[];
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
    // Verify error screen uses CSS modules, not inline styles
    const errorContainer = container.querySelector('[class*="errorScreen"]');
    expect(errorContainer).toBeInTheDocument();
    // Error screen should NOT have inline display:flex override
    expect((errorContainer as HTMLElement)?.style?.display).not.toBe('flex');
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

  // ---- Import flow ----

  it('shows toast on import file size validation error', async () => {
    mockLoading = false;
    const { validateFileSize } = await import('@/utils/import');
    vi.mocked(validateFileSize).mockReturnValue({ message: 'File too large (max 2 MB).' });

    const { container } = render(<App />);

    // Open settings and trigger import via file input
    fireEvent.click(screen.getByLabelText('Settings'));
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(['{}'], 'large.json', { type: 'application/json' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText(/File too large/)).toBeInTheDocument();
  });

  it('shows toast on import parse error', async () => {
    mockLoading = false;
    const { validateFileSize, processImportFile } = await import('@/utils/import');
    vi.mocked(validateFileSize).mockReturnValue(null);
    vi.mocked(processImportFile).mockReturnValue({ message: 'Invalid JSON content.' });

    const { container } = render(<App />);

    fireEvent.click(screen.getByLabelText('Settings'));
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(['{invalid}'], 'bad.json', { type: 'application/json' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Invalid JSON content/)).toBeInTheDocument();
    });
  });

  it('successfully imports tasks after confirmation', async () => {
    mockLoading = false;
    const { validateFileSize, processImportFile } = await import('@/utils/import');
    vi.mocked(validateFileSize).mockReturnValue(null);
    vi.mocked(processImportFile).mockReturnValue({
      todos: [
        { text: 'Imported task', completed: false, order: 1000, dueDate: null, createdAt: 1000 },
      ],
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    const { container } = render(<App />);

    fireEvent.click(screen.getByLabelText('Settings'));
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(
      [
        '{"todos":[{"text":"Imported task","completed":false,"order":1000,"dueDate":null,"createdAt":1000}]}',
      ],
      'todos.json',
      { type: 'application/json' },
    );
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(mockImportTodos).toHaveBeenCalled();
      expect(screen.getByText(/Imported 1 task/)).toBeInTheDocument();
    });
  });

  it('does not import when user cancels confirmation', async () => {
    mockLoading = false;
    const { validateFileSize, processImportFile } = await import('@/utils/import');
    vi.mocked(validateFileSize).mockReturnValue(null);
    vi.mocked(processImportFile).mockReturnValue({
      todos: [
        { text: 'Imported task', completed: false, order: 1000, dueDate: null, createdAt: 1000 },
      ],
    });
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    const { container } = render(<App />);

    fireEvent.click(screen.getByLabelText('Settings'));
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(['{}'], 'todos.json', { type: 'application/json' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      // FileReader fires, processImportFile is called, confirm returns false
      expect(mockImportTodos).not.toHaveBeenCalled();
    });
  });

  it('shows toast when importTodos throws', async () => {
    mockLoading = false;
    const { validateFileSize, processImportFile } = await import('@/utils/import');
    vi.mocked(validateFileSize).mockReturnValue(null);
    vi.mocked(processImportFile).mockReturnValue({
      todos: [
        { text: 'Imported task', completed: false, order: 1000, dueDate: null, createdAt: 1000 },
      ],
    });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    // Set importTodos to reject BEFORE render so the component captures the throwing version
    mockImportTodos.mockImplementation(() => Promise.reject(new Error('DB error')));

    const { container } = render(<App />);

    fireEvent.click(screen.getByLabelText('Settings'));
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(['{}'], 'todos.json', { type: 'application/json' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Import failed/)).toBeInTheDocument();
    });

    // Restore default behavior
    mockImportTodos.mockResolvedValue(undefined);
  });

  it('shows toast on FileReader error', async () => {
    mockLoading = false;
    const { validateFileSize } = await import('@/utils/import');
    vi.mocked(validateFileSize).mockReturnValue(null);

    // Mock FileReader to trigger error
    const originalFileReader = globalThis.FileReader;
    const mockReader = {
      onload: null as ((e: ProgressEvent<FileReader>) => void) | null,
      onerror: null as ((e: ProgressEvent<FileReader>) => void) | null,
      readAsText: vi.fn(function (this: typeof mockReader) {
        // Fire the error event
        Promise.resolve().then(() => {
          this.onerror?.(new ProgressEvent('error') as ProgressEvent<FileReader>);
        });
      }),
      result: null,
    } as unknown as FileReader;
    vi.stubGlobal(
      'FileReader',
      vi.fn(() => mockReader),
    );

    const { container } = render(<App />);

    fireEvent.click(screen.getByLabelText('Settings'));
    const fileInput = container.querySelector<HTMLInputElement>('input[type="file"]')!;
    const file = new File(['{}'], 'todos.json', { type: 'application/json' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Failed to read file/)).toBeInTheDocument();
    });

    vi.stubGlobal('FileReader', originalFileReader);
  });

  // ---- Search input renders in toolbar ----

  it('renders search input when todos are loaded', () => {
    mockLoading = false;
    mockTodos = [
      { id: 1, text: 'Task', completed: false, order: 1000, dueDate: null, createdAt: 1000 },
    ];
    render(<App />);

    // SearchInput renders a text input with aria-label "Search tasks"
    expect(screen.getByLabelText('Search tasks')).toBeInTheDocument();
  });

  // ---- Export with real db data ----

  it('exports all tasks from db', async () => {
    mockLoading = false;
    mockTodos = [
      { id: 1, text: 'Task A', completed: false, order: 1000, dueDate: null, createdAt: 1000 },
    ];
    render(<App />);

    fireEvent.click(screen.getByLabelText('Settings'));
    fireEvent.click(screen.getByText('Export'));

    const exportMock = await import('@/utils/export');
    expect(exportMock.downloadJson).toHaveBeenCalled();
    expect(exportMock.serializeTodos).toHaveBeenCalled();
  });
});
