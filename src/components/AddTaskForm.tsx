import { useTodoStore } from '@/store';
import { useRef, useState, useEffect } from 'preact/hooks';
import { MAX_TASK_LENGTH, CHAR_WARN_THRESHOLD } from '@/constants';
import styles from './AddTaskForm.module.css';

interface AddTaskFormProps {
  disabled?: boolean;
}

export function AddTaskForm({ disabled }: AddTaskFormProps) {
  const addTodo = useTodoStore((s) => s.addTodo);
  const importing = useTodoStore((s) => s.importing);

  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const isDisabled = disabled || importing;
  const charsRemaining = MAX_TASK_LENGTH - text.length;

  // Auto-focus the task input on mount (replaces autoFocus attribute for a11y)
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleInput = (e: Event) => {
    const value = (e.target as HTMLInputElement).value;
    setText(value);
    if (validationError) {
      setValidationError(null);
    }
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();

    const trimmed = text.trim();

    if (!trimmed) {
      setValidationError('Please enter a task description.');
      return;
    }

    if (trimmed.length > MAX_TASK_LENGTH) {
      setValidationError(`Task must be ${MAX_TASK_LENGTH} characters or fewer.`);
      return;
    }

    setValidationError(null);

    const newId = await addTodo(trimmed, dueDate || undefined);
    setText('');
    setDueDate('');

    // Focus moves to the new task's checkbox per spec AC1.2
    if (newId !== undefined) {
      requestAnimationFrame(() => {
        const el = document.querySelector(
          `[data-testid="task-item-${newId}"] input[type="checkbox"]`,
        );
        if (el instanceof HTMLElement) {
          el.focus();
        }
      });
    }
  };

  return (
    <form class={styles.form} onSubmit={handleSubmit}>
      <div class={styles.inputWrapper}>
        <input
          ref={inputRef}
          type="text"
          class={`${styles.input}${validationError ? ` ${styles.inputError}` : ''}`}
          aria-label="New task description"
          aria-invalid={validationError ? 'true' : undefined}
          aria-describedby={validationError ? 'task-validation-error' : undefined}
          placeholder="What needs to be done?"
          value={text}
          onInput={handleInput}
          disabled={isDisabled}
        />
        {validationError && (
          <small id="task-validation-error" class={styles.validationError} role="alert">
            {validationError}
          </small>
        )}
        {text.length > CHAR_WARN_THRESHOLD && (
          <span class={styles.charCounter} aria-live="polite">
            {charsRemaining}
          </span>
        )}
      </div>
      <div class={styles.dateRow}>
        <input
          type="date"
          class={styles.dateInput}
          aria-label="Due date (optional)"
          value={dueDate}
          onInput={(e: Event) => setDueDate((e.target as HTMLInputElement).value)}
          disabled={isDisabled}
        />
        <button type="submit" class={styles.addButton} disabled={isDisabled}>
          Add
        </button>
      </div>
    </form>
  );
}
