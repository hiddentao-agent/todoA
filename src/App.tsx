import { useEffect, useCallback, useRef, useState } from 'preact/hooks';
import { useTodoStore, selectFilteredTodos, selectTaskCounts } from '@/store';
import { useKeyboard } from '@/hooks/useKeyboard';
import { db } from '@/db';
import { getExportFilename, serializeTodos, downloadJson } from '@/utils/export';
import { processImportFile, validateFileSize } from '@/utils/import';
import { AddTaskForm } from '@/components/AddTaskForm';
import { TaskList } from '@/components/TaskList';
import { TaskStats } from '@/components/TaskStats';
import { ClearCompletedButton } from '@/components/ClearCompletedButton';
import { Toast } from '@/components/Toast';
import { EmptyState } from '@/components/EmptyState';
import { FilterTabs } from '@/components/FilterTabs';
import { SearchInput } from '@/components/SearchInput';
import { SortDropdown } from '@/components/SortDropdown';
import { DueThisWeekToggle } from '@/components/DueThisWeekToggle';
import { ThemeToggle } from '@/components/ThemeToggle';
import { SettingsMenu } from '@/components/SettingsMenu';
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal';
import { AppShell } from '@/components/AppShell';
import styles from './App.module.css';

export function App() {
  const loadTodos = useTodoStore((s) => s.loadTodos);
  const loading = useTodoStore((s) => s.loading);
  const error = useTodoStore((s) => s.error);
  const filter = useTodoStore((s) => s.filter);
  const sortMode = useTodoStore((s) => s.sortMode);
  const searchQuery = useTodoStore((s) => s.searchQuery);
  const dueThisWeek = useTodoStore((s) => s.dueThisWeek);
  const theme = useTodoStore((s) => s.theme);
  const todos = useTodoStore(selectFilteredTodos);
  const counts = useTodoStore(selectTaskCounts);
  const allTodos = useTodoStore((s) => s.todos);
  const setFilter = useTodoStore((s) => s.setFilter);
  const setSortMode = useTodoStore((s) => s.setSortMode);
  const setSearchQuery = useTodoStore((s) => s.setSearchQuery);
  const setDueThisWeek = useTodoStore((s) => s.setDueThisWeek);
  const importTodos = useTodoStore((s) => s.importTodos);
  const moveTodoUp = useTodoStore((s) => s.moveTodoUp);
  const moveTodoDown = useTodoStore((s) => s.moveTodoDown);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const [toast, setToast] = useState<{
    message: string;
    onUndo?: () => void;
  } | null>(null);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

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

  const handleShortcutsOpen = useCallback(() => {
    setShortcutsOpen(true);
  }, []);

  useKeyboard({
    onSearchFocus: handleSearchFocus,
    onShortcutsOpen: handleShortcutsOpen,
  });

  // Export
  const handleExport = useCallback(async () => {
    const all = await db.todos.orderBy('order').toArray();
    const filename = getExportFilename();
    const content = serializeTodos(all);
    downloadJson(filename, content);
  }, []);

  // Import
  const handleImport = useCallback(
    async (file: File) => {
      // Gate 1: File size
      const sizeError = validateFileSize(file);
      if (sizeError) {
        setToast({ message: sizeError.message });
        return;
      }

      // Read file
      const reader = new FileReader();
      reader.onload = async (e) => {
        const rawText = e.target?.result as string;
        const result = processImportFile(rawText);

        if ('message' in result) {
          setToast({ message: result.message });
          return;
        }

        // Confirmation prompt
        const confirmed = window.confirm(
          `This will replace your ${allTodos.length} current task${allTodos.length !== 1 ? 's' : ''} with ${result.todos.length} imported task${result.todos.length !== 1 ? 's' : ''}. This cannot be undone.`,
        );

        if (!confirmed) return;

        try {
          await importTodos(result.todos);
          setToast({
            message: `Imported ${result.todos.length} task${result.todos.length !== 1 ? 's' : ''}.`,
          });
        } catch {
          setToast({ message: 'Import failed. Please try again.' });
        }
      };
      reader.onerror = () => {
        setToast({ message: 'Failed to read file.' });
      };
      reader.readAsText(file);
    },
    [allTodos.length, importTodos],
  );

  // Storage unavailable error screen
  if (error) {
    return (
      <div class={styles.errorScreen}>
        <div class={styles.errorContent}>
          <div class={styles.errorIcon}>⚠</div>
          <h1 class={styles.errorTitle}>Storage Unavailable</h1>
          <p class={styles.errorMessage}>
            Your browser&apos;s storage is unavailable. Please enable IndexedDB and reload.
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
    <AppShell>
      <div class={styles.appContainer}>
        {/* Header */}
        <header class={styles.appHeader}>
          <h1 class={styles.appHeading}>Tasks</h1>
          <div class={styles.headerActions}>
            <button
              class={styles.headerBtn}
              onClick={handleShortcutsOpen}
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts (?)"
              type="button"
            >
              ?
            </button>
            <ThemeToggle />
            <SettingsMenu
              onExport={handleExport}
              onImport={handleImport}
              onShortcutsOpen={handleShortcutsOpen}
            />
          </div>
        </header>

        {/* Add Task Form */}
        <AddTaskForm />

        {/* Toolbar */}
        <div class={styles.toolbar}>
          <SearchInput inputRef={searchInputRef} />
          <div class={styles.toolbarControls}>
            <FilterTabs filter={filter} onChange={setFilter} />
            <DueThisWeekToggle active={dueThisWeek} onToggle={() => setDueThisWeek(!dueThisWeek)} />
            <SortDropdown sortMode={sortMode} onChange={setSortMode} />
          </div>
        </div>

        {/* Task Stats */}
        <TaskStats filter={filter} />

        {/* Task List or Empty State */}
        {loading ? (
          <div class={styles.skeletonList} aria-busy="true">
            {[1, 2, 3].map((i) => (
              <div key={i} class={styles.skeletonItem} />
            ))}
          </div>
        ) : hasFilteredResults ? (
          <TaskList todos={todos} onMoveUp={moveTodoUp} onMoveDown={moveTodoDown} />
        ) : (
          <EmptyState
            variant={emptyVariant}
            searchQuery={searchQuery}
            onClearSearch={() => setSearchQuery('')}
          />
        )}

        {/* Clear Completed Button */}
        {counts.completed > 0 && <ClearCompletedButton count={counts.completed} />}

        {/* Keyboard Shortcuts Modal */}
        {shortcutsOpen && <KeyboardShortcutsModal onClose={() => setShortcutsOpen(false)} />}

        {/* Toast */}
        {toast && (
          <Toast
            message={toast.message}
            onUndo={toast.onUndo || (() => setToast(null))}
            onDismiss={() => setToast(null)}
          />
        )}

        {/* Live region for announcements */}
        <div class="sr-only" aria-live="polite" aria-atomic="true" />
      </div>
    </AppShell>
  );
}
