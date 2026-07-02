import { useRef, useState, useCallback, useEffect } from 'preact/hooks';
import { useTodoStore } from '@/store';
import styles from './SearchInput.module.css';

interface SearchInputProps {
  inputRef?: { current: HTMLInputElement | null };
}

export function SearchInput({ inputRef }: SearchInputProps) {
  const searchQuery = useTodoStore((s) => s.searchQuery);
  const setSearchQuery = useTodoStore((s) => s.setSearchQuery);

  const [value, setValue] = useState(searchQuery);
  const internalRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync local state from store when it changes externally (e.g. clear from
  // parent or after a debounced write resolves).
  useEffect(() => {
    setValue(searchQuery);
  }, [searchQuery]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Callback ref that keeps the internal ref in sync with the forwarded ref
  // so the parent can call .focus() via the / keyboard shortcut.
  const setRef = useCallback(
    (el: HTMLInputElement | null) => {
      internalRef.current = el;
      if (inputRef) {
        inputRef.current = el;
      }
    },
    [inputRef],
  );

  const handleInput = useCallback(
    (e: Event) => {
      const newValue = (e.target as HTMLInputElement).value;
      setValue(newValue);

      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }

      debounceRef.current = setTimeout(() => {
        setSearchQuery(newValue);
      }, 150);
    },
    [setSearchQuery],
  );

  const handleClear = useCallback(() => {
    setValue('');
    setSearchQuery('');
    const input = inputRef?.current ?? internalRef.current;
    input?.focus();
  }, [setSearchQuery, inputRef]);

  return (
    <div class={styles.wrapper}>
      <div class={styles.inputContainer}>
        <svg
          class={styles.icon}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          ref={setRef}
          type="text"
          class={styles.input}
          placeholder="Search tasks..."
          aria-label="Search tasks"
          value={value}
          onInput={handleInput}
        />

        {value && (
          <button
            class={styles.clearButton}
            onClick={handleClear}
            type="button"
            aria-label="Clear search"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
}
