import { useTodoStore } from '@/store';
import { useRef, useState } from 'preact/hooks';
import styles from './AddTaskForm.module.css';

interface AddTaskFormProps {
  searchInputRef?: { current: HTMLInputElement | null };
  disabled?: boolean;
}

const MAX_LENGTH = 1000;
const CHAR_WARN_THRESHOLD = 900;

export function AddTaskForm({ searchInputRef, disabled }: AddTaskFormProps) {
  const addTodo = useTodoStore((s) => s.addTodo);
  const importing = useTodoStore((s) => s.importing);

  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  const isDisabled = disabled ?? importing;
  const charsRemaining = MAX_LENGTH - text.length;

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

    if (trimmed.length > MAX_LENGTH) {
      setValidationError('Task must be 1000 characters or fewer.');
      return;
    }

    setValidationError(null);

    await addTodo(trimmed);
    setText('');

    // Focus moves to search input when provided
    searchInputRef?.current?.focus();
  };

  return (
    <form class={styles.form} onSubmit={handleSubmit} aria-disabled={isDisabled}>
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
          autoFocus
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
      <button
        type="submit"
        class={styles.addButton}
        disabled={isDisabled}
      >
        Add
      </button>
    </form>
  );
}
