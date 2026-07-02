import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { ClearCompletedButton } from '@/components/ClearCompletedButton';

const mockClearCompleted = vi.fn().mockResolvedValue(undefined);
let mockImporting = false;

vi.mock('@/store', () => ({
  useTodoStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      clearCompleted: mockClearCompleted,
      importing: mockImporting,
    };
    return selector ? selector(state) : state;
  },
}));

describe('ClearCompletedButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockImporting = false;
  });

  it('renders with count', async () => {
    const { container } = render(<ClearCompletedButton count={3} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    const button = screen.getByRole('button', { name: 'Clear completed (3)' });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('returns null when count is 0', () => {
    const { container } = render(<ClearCompletedButton count={0} />);
    expect(container.innerHTML).toBe('');
  });

  it('returns null when count is negative', () => {
    const { container } = render(<ClearCompletedButton count={-1} />);
    expect(container.innerHTML).toBe('');
  });

  it('calls clearCompleted on click', async () => {
    const { container } = render(<ClearCompletedButton count={3} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    fireEvent.click(screen.getByRole('button'));
    expect(mockClearCompleted).toHaveBeenCalledTimes(1);
  });

  it('is disabled when importing', async () => {
    mockImporting = true;
    const { container } = render(<ClearCompletedButton count={3} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
