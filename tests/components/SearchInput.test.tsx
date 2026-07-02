import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { SearchInput } from '@/components/SearchInput';

let mockSearchQuery = '';
const mockSetSearchQuery = vi.fn();

vi.mock('@/store', () => ({
  useTodoStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      searchQuery: mockSearchQuery,
      setSearchQuery: mockSetSearchQuery,
    };
    return selector ? selector(state) : state;
  },
}));

describe('SearchInput', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchQuery = '';
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders search input with placeholder', async () => {
    const { container } = render(<SearchInput />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    const input = screen.getByLabelText('Search tasks') as HTMLInputElement;
    expect(input).toBeInTheDocument();
    expect(input.placeholder).toBe('Search tasks...');
  });

  it('updates local value on input and debounces store update', () => {
    vi.useFakeTimers();
    render(<SearchInput />);
    const input = screen.getByLabelText('Search tasks') as HTMLInputElement;

    fireEvent.input(input, { target: { value: 'hello' } });

    // Immediately shows the value locally
    expect(input.value).toBe('hello');

    // Store should not have been called yet (debounced)
    expect(mockSetSearchQuery).not.toHaveBeenCalled();

    // Advance past the 150ms debounce
    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(mockSetSearchQuery).toHaveBeenCalledWith('hello');
  });

  it('shows clear button when value is present', async () => {
    mockSearchQuery = 'test';
    const { container } = render(<SearchInput />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
  });

  it('does not show clear button when value is empty', async () => {
    mockSearchQuery = '';
    const { container } = render(<SearchInput />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
  });

  it('clears search and focuses input on clear button click', () => {
    mockSearchQuery = 'test';
    render(<SearchInput />);

    const clearButton = screen.getByLabelText('Clear search');
    fireEvent.click(clearButton);

    // Should clear store
    expect(mockSetSearchQuery).toHaveBeenCalledWith('');

    // Input should be empty
    const input = screen.getByLabelText('Search tasks') as HTMLInputElement;
    expect(input.value).toBe('');
  });

  it('syncs from store when it changes externally', () => {
    const { rerender } = render(<SearchInput />);
    const input = screen.getByLabelText('Search tasks') as HTMLInputElement;
    expect(input.value).toBe('');

    // Simulate store change
    mockSearchQuery = 'synced';
    rerender(<SearchInput />);

    expect(input.value).toBe('synced');
  });

  it('forwards inputRef to parent', () => {
    const inputRef = { current: null as HTMLInputElement | null };
    render(<SearchInput inputRef={inputRef} />);
    expect(inputRef.current).toBeInstanceOf(HTMLInputElement);
    expect(inputRef.current?.tagName).toBe('INPUT');
  });

  it('clears pending debounce on unmount', () => {
    vi.useFakeTimers();
    const { unmount } = render(<SearchInput />);
    const input = screen.getByLabelText('Search tasks') as HTMLInputElement;

    fireEvent.input(input, { target: { value: 'hello' } });

    unmount();

    // Advance time — should not crash
    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(mockSetSearchQuery).not.toHaveBeenCalled();
  });

  it('clears previous debounce timer on rapid input', () => {
    vi.useFakeTimers();
    render(<SearchInput />);
    const input = screen.getByLabelText('Search tasks') as HTMLInputElement;

    // Rapidly type characters — each call should clear the previous debounce
    fireEvent.input(input, { target: { value: 'h' } });
    fireEvent.input(input, { target: { value: 'he' } });
    fireEvent.input(input, { target: { value: 'hel' } });
    fireEvent.input(input, { target: { value: 'hell' } });
    fireEvent.input(input, { target: { value: 'hello' } });

    // Only the last input's debounce should fire
    act(() => {
      vi.advanceTimersByTime(150);
    });

    expect(mockSetSearchQuery).toHaveBeenCalledTimes(1);
    expect(mockSetSearchQuery).toHaveBeenCalledWith('hello');
  });

  it('clears search with forwarded inputRef', () => {
    mockSearchQuery = 'test';
    const inputRef = { current: null as HTMLInputElement | null };
    render(<SearchInput inputRef={inputRef} />);

    const clearButton = screen.getByLabelText('Clear search');
    fireEvent.click(clearButton);

    // Should clear store
    expect(mockSetSearchQuery).toHaveBeenCalledWith('');
    const input = screen.getByLabelText('Search tasks') as HTMLInputElement;
    expect(input.value).toBe('');
  });
});
