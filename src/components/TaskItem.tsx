import { useTodoStore } from '@/store';
import { useState, useRef, useEffect, useCallback } from 'preact/hooks';
import { formatDueDate, isOverdue } from '@/utils/date';
import type { Todo } from '@/db/types';
import styles from './TaskItem.module.css';

interface TaskItemProps {
  todo: Todo;
  index: number;
  totalCount: number;
  onFocusAfterDelete?: (id: number) => void;
  onMoveUp?: (id: number) => void;
  onMoveDown?: (id: number) => void;
  disabled?: boolean;
}

/**
 * Renders a single todo item with checkbox, inline editing, and delete.
 *
 * - Checkbox: 32px hit target, 20px visual, custom-styled.
 * - Double-click or Enter on focused item enters inline edit mode.
 * - Delete button moves focus to next item (previous if last) via onFocusAfterDelete.
 * - Action buttons fade in on hover/focus-within (desktop), always visible on mobile.
 * - Move up/down buttons for reordering.
 * - Due date badge with inline editing and clear.
 * - Drag handle visual affordance (drag events handled by parent).
 * - Entire item is keyboard accessible.
 */
export default function TaskItem({
  todo,
  index,
  totalCount,
  onFocusAfterDelete,
  onMoveUp,
  onMoveDown,
  disabled = false,
}: TaskItemProps) {
  const store = useTodoStore();
  const isDisabled = disabled || store.importing;
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const [editingDate, setEditingDate] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dateInputRef = useRef<HTMLInputElement>(null);

  // Destructure stable store methods to satisfy exhaustive-deps
  const { updateTodo, deleteTodo, toggleTodo } = store;

  const sessionEditKey = todo.id !== undefined ? `todo-edit-${todo.id}` : null;

  // Restore in-progress edit from sessionStorage on mount (spec §7.3 SW mid-edit safety net)
  useEffect(() => {
    if (!sessionEditKey || editing) return;
    const saved = (() => {
      try {
        return sessionStorage.getItem(sessionEditKey);
      } catch {
        return null;
      }
    })();
    if (saved !== null) {
      setEditText(saved);
      setEditing(true);
      sessionStorage.removeItem(sessionEditKey);
    }
    // Run once on mount only
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset edit text when todo changes externally
  useEffect(() => {
    if (!editing) {
      setEditText(todo.text);
    }
  }, [todo.text, editing]);

  // ---- Edit Mode ----

  const startEditing = useCallback(() => {
    if (isDisabled) return;
    setEditText(todo.text);
    setEditing(true);
    // Save to sessionStorage as safety net for SW-triggered reload
    if (sessionEditKey) {
      try {
        sessionStorage.setItem(sessionEditKey, todo.text);
      } catch {
        // sessionStorage unavailable
      }
    }
  }, [isDisabled, todo.text, sessionEditKey]);

  const handleSaveEdit = useCallback(() => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== todo.text && todo.id !== undefined) {
      updateTodo(todo.id, { text: trimmed }).catch(() => {
        /* error handled by store */
      });
    }
    setEditing(false);
    // Clear sessionStorage safety net
    if (sessionEditKey) {
      try {
        sessionStorage.removeItem(sessionEditKey);
      } catch {
        // sessionStorage unavailable
      }
    }
  }, [editText, todo, updateTodo, sessionEditKey]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setEditText(todo.text);
    // Clear sessionStorage safety net
    if (sessionEditKey) {
      try {
        sessionStorage.removeItem(sessionEditKey);
      } catch {
        // sessionStorage unavailable
      }
    }
  }, [todo.text, sessionEditKey]);

  // Focus and select all text when entering edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  // Focus date input when entering date edit mode
  useEffect(() => {
    if (editingDate && dateInputRef.current) {
      dateInputRef.current.focus();
      dateInputRef.current.showPicker?.();
    }
  }, [editingDate]);

  const handleEditInput = useCallback((e: Event) => {
    const target = e.target as HTMLInputElement;
    if (target.value.length <= 1000) {
      setEditText(target.value);
    }
  }, []);

  const handleEditKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleSaveEdit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
      }
    },
    [handleSaveEdit, cancelEdit],
  );

  // ---- Date Editing ----

  const startEditingDate = useCallback(() => {
    if (isDisabled || editing) return;
    setEditingDate(true);
  }, [isDisabled, editing]);

  const saveDate = useCallback(
    (newDate: string) => {
      if (todo.id === undefined) return;
      updateTodo(todo.id, { dueDate: newDate || null }).catch(() => {});
      setEditingDate(false);
    },
    [todo.id, updateTodo],
  );

  const handleDateChange = useCallback(
    (e: Event) => {
      const target = e.target as HTMLInputElement;
      saveDate(target.value);
    },
    [saveDate],
  );

  const handleDateKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        const target = e.target as HTMLInputElement;
        saveDate(target.value);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setEditingDate(false);
      }
    },
    [saveDate],
  );

  const handleDateBlur = useCallback(
    (e: Event) => {
      const target = e.target as HTMLInputElement;
      saveDate(target.value);
    },
    [saveDate],
  );

  const clearDate = useCallback(() => {
    if (todo.id === undefined) return;
    updateTodo(todo.id, { dueDate: null }).catch(() => {});
    setEditingDate(false);
  }, [todo.id, updateTodo]);

  // ---- Actions ----

  const handleDelete = useCallback(() => {
    if (todo.id === undefined || isDisabled) return;
    const deletedId = todo.id;
    deleteTodo(deletedId).catch(() => {
      /* error handled by store */
    });
    if (onFocusAfterDelete) {
      onFocusAfterDelete(deletedId);
    }
  }, [todo.id, isDisabled, deleteTodo, onFocusAfterDelete]);

  const handleMoveUp = useCallback(() => {
    if (todo.id !== undefined && onMoveUp) {
      onMoveUp(todo.id);
    }
  }, [todo.id, onMoveUp]);

  const handleMoveDown = useCallback(() => {
    if (todo.id !== undefined && onMoveDown) {
      onMoveDown(todo.id);
    }
  }, [todo.id, onMoveDown]);

  // ---- Keyboard on main item ----

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isDisabled || editing) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (todo.id !== undefined) {
            toggleTodo(todo.id).catch(() => {
              /* error handled by store */
            });
          }
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          handleDelete();
          break;
        case 'Enter':
          e.preventDefault();
          startEditing();
          break;
      }
    },
    [isDisabled, editing, todo.id, toggleTodo, handleDelete, startEditing],
  );

  // ---- Derived ----

  // Escape single quotes for aria attributes
  const escapedText = todo.text.replace(/'/g, '&#39;');
  const checkboxLabel = `Mark '${escapedText}' ${todo.completed ? 'incomplete' : 'complete'}`;
  const deleteLabel = `Delete '${escapedText}'`;
  const moveUpLabel = `Move '${escapedText}' up`;
  const moveDownLabel = `Move '${escapedText}' down`;

  // Guard: require an id to be usable
  if (todo.id === undefined) {
    return null;
  }

  const dueDateOverdue = todo.dueDate ? isOverdue(todo.dueDate) : false;

  return (
    <div
      class={styles.taskItem}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="option"
      aria-selected={todo.completed ? 'true' : 'false'}
      data-testid={`task-item-${todo.id}`}
    >
      {/* ---- Drag Handle ---- */}
      <div class={styles.dragHandle} aria-hidden="true">
        ⋮⋮
      </div>

      {/* ---- Checkbox ---- */}
      <label class={styles.checkboxWrapper}>
        <input
          type="checkbox"
          class={styles.checkboxInput}
          checked={todo.completed}
          aria-label={checkboxLabel}
          onChange={() => {
            if (!isDisabled && todo.id !== undefined) {
              store.toggleTodo(todo.id).catch(() => {});
            }
          }}
          disabled={isDisabled}
          tabIndex={-1}
        />
        <span
          class={`${styles.checkboxCustom} ${todo.completed ? styles.checked : ''}`}
          aria-hidden="true"
        />
      </label>

      {/* ---- Text / Edit Input ---- */}
      {editing ? (
        <div class={styles.editContainer}>
          <input
            ref={inputRef}
            class={styles.editInput}
            type="text"
            value={editText}
            onInput={handleEditInput}
            onKeyDown={handleEditKeyDown}
            onBlur={handleSaveEdit}
            maxLength={1000}
            disabled={isDisabled}
            aria-label="Edit task"
          />
          {editText.length > 900 && (
            <span class={styles.charCounter} aria-live="polite">
              {editText.length}/1000
            </span>
          )}
        </div>
      ) : (
        <span
          class={`${styles.taskText} ${todo.completed ? styles.completed : ''}`}
          onDblClick={startEditing}
        >
          {todo.text}
        </span>
      )}

      {/* ---- Due Date ---- */}
      {editingDate ? (
        <div class={styles.dateEditRow}>
          <input
            ref={dateInputRef}
            type="date"
            value={todo.dueDate || ''}
            onChange={handleDateChange}
            onKeyDown={handleDateKeyDown}
            onBlur={handleDateBlur}
            disabled={isDisabled}
            class={styles.dateInput}
          />
          <button
            type="button"
            class={styles.clearDateBtn}
            onClick={clearDate}
            disabled={isDisabled}
            aria-label="Clear due date"
          >
            ✕
          </button>
        </div>
      ) : todo.dueDate ? (
        <button
          type="button"
          class={`${styles.dueDate} ${dueDateOverdue ? styles.dueDateOverdue : ''}`}
          onClick={startEditingDate}
          disabled={isDisabled}
          aria-label={`Due date: ${formatDueDate(todo.dueDate)}. Click to edit.`}
        >
          {dueDateOverdue && <>⚠ </>}Due {formatDueDate(todo.dueDate)}
        </button>
      ) : null}

      {/* ---- Actions ---- */}
      <div class={styles.actions}>
        <button
          type="button"
          class={styles.actionBtn}
          onClick={handleMoveUp}
          disabled={isDisabled || index === 0}
          aria-label={moveUpLabel}
        >
          ↑
        </button>
        <button
          type="button"
          class={styles.actionBtn}
          onClick={handleMoveDown}
          disabled={isDisabled || index === totalCount - 1}
          aria-label={moveDownLabel}
        >
          ↓
        </button>
        <button
          class={`${styles.actionBtn} ${styles.deleteBtn}`}
          onClick={handleDelete}
          disabled={isDisabled}
          aria-label={deleteLabel}
          type="button"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
