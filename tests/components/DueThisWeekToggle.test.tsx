import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { DueThisWeekToggle } from '@/components/DueThisWeekToggle';

describe('DueThisWeekToggle', () => {
  it('renders with correct text', async () => {
    const { container } = render(<DueThisWeekToggle active={false} onToggle={vi.fn()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    expect(screen.getByRole('button', { name: 'Due this week' })).toBeInTheDocument();
  });

  it('reflects active state', async () => {
    const { container } = render(<DueThisWeekToggle active={true} onToggle={vi.fn()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
  });

  it('reflects inactive state', async () => {
    const { container } = render(<DueThisWeekToggle active={false} onToggle={vi.fn()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('calls onToggle on click', async () => {
    const onToggle = vi.fn();
    const { container } = render(<DueThisWeekToggle active={false} onToggle={onToggle} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    fireEvent.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalled();
  });
});
