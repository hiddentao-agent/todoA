import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { Toast } from '@/components/Toast';

describe('Toast', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders with message', async () => {
    const { container } = render(
      <Toast message="Task deleted." onUndo={vi.fn()} onDismiss={vi.fn()} />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    expect(screen.getByText('Task deleted.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('calls onUndo when Undo button is clicked', async () => {
    const onUndo = vi.fn();
    const onDismiss = vi.fn();
    render(<Toast message="Task deleted." onUndo={onUndo} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('calls onDismiss when Dismiss button is clicked', async () => {
    const onDismiss = vi.fn();
    render(<Toast message="Task deleted." onUndo={vi.fn()} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('auto-dismisses after 10 seconds', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<Toast message="Task deleted." onUndo={vi.fn()} onDismiss={onDismiss} />);

    expect(onDismiss).not.toHaveBeenCalled();

    vi.advanceTimersByTime(10_000);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('does not call onDismiss before timeout elapses', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(<Toast message="Task deleted." onUndo={vi.fn()} onDismiss={onDismiss} />);

    vi.advanceTimersByTime(5_000);
    expect(onDismiss).not.toHaveBeenCalled();
  });
});
