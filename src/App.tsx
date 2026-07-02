import { useEffect, useCallback, useRef, useState } from 'preact/hooks';
import { useTodoStore, selectFilteredTodos, selectTaskCounts } from '@/store';
import { useKeyboard } from '@/hooks/useKeyboard';
import { AddTaskForm } from '@/components/AddTaskForm';
import { TaskList } from '@/components/TaskList';
import { TaskStats } from '@/components/TaskStats';
import { ClearCompletedButton } from '@/components/ClearCompletedButton';
import { Toast } from '@/components/Toast';
import { EmptyState } from '@/components/EmptyState';

export function App() {
  const loadTodos = useTodoStore((s) => s.loadTodos);
  const loading = useTodoStore((s) => s.loading);
  const error = useTodoStore((s) => s.error);
  const filter = useTodoStore((s) => s.filter);
  const searchQuery = useTodoStore((s) => s.searchQuery);
  const theme = useTodoStore((s) => s.theme);
  const todos = useTodoStore(selectFilteredTodos);
  const counts = useTodoStore(selectTaskCounts);
  const setSearchQuery = useTodoStore((s) => s.setSearchQuery);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const [toast, setToast] = useState<{
    message: string;
    onUndo: () => void;
  } | null>(null);

  // Subscribe to undo buffer for toast
  const undoBuffer = useTodoStore((s) => s.undoBuffer);
  const undoClearCompleted = useTodoStore((s) => s.undoClearCompleted);

  useEffect(() => {
    if (undoBuffer) {
      const count = undoBuffer.tasks.length;
      setToast({
        message: `${count} completed task${count !== 1 ? 's' : ''} removed.`,
        onUndo: () => {
          undoClearCompleted();
          setToast(null);
        },
      });
      // Auto-dismiss after 10s
      const timer = setTimeout(() => setToast(null), 10_000);
      return () => clearTimeout(timer);
    }
  }, [undoBuffer, undoClearCompleted]);

  // Load todos on mount
  useEffect(() => {
    loadTodos();
  }, [loadTodos]);

  // Apply theme
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Keyboard shortcuts
  const handleSearchFocus = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  useKeyboard({
    onSearchFocus: handleSearchFocus,
  });

  // Storage unavailable error screen
  if (error) {
    return (
      <div class="app-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh' }}>
        <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--space-4)' }}>⚠</div>
          <h1 style={{ fontSize: 'var(--text-xl)', marginBottom: 'var(--space-3)', color: 'var(--color-text)' }}>
            Storage Unavailable
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px' }}>
            Your browser's storage is unavailable. Please enable IndexedDB and reload.
          </p>
        </div>
      </div>
    );
  }

  // Determine empty state variant
  const hasAnyTodos = counts.total > 0;
  const hasFilteredResults = todos.length > 0;
  const isSearching = searchQuery.trim().length > 0;

  let emptyVariant: 'noTasks' | 'allDone' | 'noCompleted' | 'noSearchResults' = 'noTasks';
  if (isSearching && !hasFilteredResults) {
    emptyVariant = 'noSearchResults';
  } else if (filter === 'active' && hasAnyTodos && !hasFilteredResults) {
    emptyVariant = 'allDone';
  } else if (filter === 'completed' && hasAnyTodos && !hasFilteredResults) {
    emptyVariant = 'noCompleted';
  } else if (!hasAnyTodos) {
    emptyVariant = 'noTasks';
  }

  return (
    <div class="app-container">
      {/* Header */}
      <header class="app-header">
        <h1 class="app-heading">Tasks</h1>
      </header>

      {/* Add Task Form */}
      <AddTaskForm searchInputRef={searchInputRef} />

      {/* Task Stats */}
      <TaskStats filter={filter} />

      {/* Task List or Empty State */}
      {loading ? (
        <div class="skeleton-list" aria-busy="true">
          {[1, 2, 3].map((i) => (
            <div key={i} class="skeleton-item" />
          ))}
        </div>
      ) : hasFilteredResults ? (
        <TaskList todos={todos} />
      ) : (
        <EmptyState variant={emptyVariant} searchQuery={searchQuery} onClearSearch={() => setSearchQuery('')} />
      )}

      {/* Clear Completed Button */}
      {counts.completed > 0 && <ClearCompletedButton count={counts.completed} />}

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} onUndo={toast.onUndo} onDismiss={() => setToast(null)} />
      )}

      {/* Live region for announcements */}
      <div class="sr-only" aria-live="polite" aria-atomic="true" />
    </div>
  );
}
