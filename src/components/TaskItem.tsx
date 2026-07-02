import { useTodoStore } from '@/store';
import { useState, useRef, useEffect, useCallback } from 'preact/hooks';
import type { Todo } from '@/db/types';
import styles from './TaskItem.module.css';

interface TaskItemProps {
  todo: Todo;
  index: number;
  totalCount: number;
  onFocusAfterDelete?: (id: number) => void;
  disabled?: boolean;
}

/**
 * Renders a single todo item with checkbox, inline editing, and delete.
 *
 * - Checkbox: 32px hit target, 20px visual, custom-styled.
 * - Double-click or Enter on focused item enters inline edit mode.
 * - Delete button moves focus to next item (previous if last) via onFocusAfterDelete.
 * - Action buttons fade in on hover/focus-within (desktop), always visible on mobile.
 * - Entire item is keyboard accessible.
 */
export default function TaskItem({
  todo,
  index: _index,
  totalCount: _totalCount,
  onFocusAfterDelete,
  disabled = false,
}: TaskItemProps) {
  const store = useTodoStore();
  const isDisabled = disabled || store.importing;
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(todo.text);
  const inputRef = useRef<HTMLInputElement>(null);

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
  }, [isDisabled, todo.text]);

  const handleSaveEdit = useCallback(() => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== todo.text && todo.id !== undefined) {
      store.updateTodo(todo.id, { text: trimmed }).catch(() => {
        /* error handled by store */
      });
    }
    setEditing(false);
  }, [editText, todo, store.updateTodo]);

  const cancelEdit = useCallback(() => {
    setEditing(false);
    setEditText(todo.text);
  }, [todo.text]);

  // Focus and select all text when entering edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

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

  // ---- Actions ----

  const handleDelete = useCallback(() => {
    if (todo.id === undefined || isDisabled) return;
    const deletedId = todo.id;
    store.deleteTodo(deletedId).catch(() => {
      /* error handled by store */
    });
    if (onFocusAfterDelete) {
      onFocusAfterDelete(deletedId);
    }
  }, [todo.id, isDisabled, store.deleteTodo, onFocusAfterDelete]);

  // ---- Keyboard on main item ----

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (isDisabled || editing) return;

      switch (e.key) {
        case ' ':
          e.preventDefault();
          if (todo.id !== undefined) {
            store.toggleTodo(todo.id).catch(() => {
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
    [isDisabled, editing, todo.id, store.toggleTodo, handleDelete, startEditing],
  );

  // ---- Derived ----

  // Escape single quotes for aria attributes
  const escapedText = todo.text.replace(/'/g, '&#39;');
  const checkboxLabel = `Mark '${escapedText}' ${todo.completed ? 'incomplete' : 'complete'}`;
  const deleteLabel = `Delete '${escapedText}'`;

  // Guard: require an id to be usable
  if (todo.id === undefined) {
    return null;
  }

  return (
    <div
      class={styles.taskItem}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="listitem"
      data-testid={`task-item-${todo.id}`}
    >
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

      {/* ---- Actions ---- */}
      <div class={styles.actions}>
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
