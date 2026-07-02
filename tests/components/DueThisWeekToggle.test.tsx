import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { DueThisWeekToggle } from '@/components/DueThisWeekToggle';

describe('DueThisWeekToggle', () => {
  it('renders with correct text', () => {
    render(<DueThisWeekToggle active={false} onToggle={vi.fn()} />);
    expect(screen.getByRole('button', { name: 'Due this week' })).toBeInTheDocument();
  });

  it('reflects active state', () => {
    render(<DueThisWeekToggle active={true} onToggle={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('reflects inactive state', () => {
    render(<DueThisWeekToggle active={false} onToggle={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onToggle on click', () => {
    const onToggle = vi.fn();
    render(<DueThisWeekToggle active={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalled();
  });
});
