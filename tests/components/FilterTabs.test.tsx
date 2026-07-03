import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { FilterTabs } from '@/components/FilterTabs';

describe('FilterTabs', () => {
  it('renders all three tabs', async () => {
    const { container } = render(<FilterTabs filter="all" onChange={vi.fn()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Active' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Completed' })).toBeInTheDocument();
  });

  it('marks the active tab as selected', async () => {
    const { container } = render(<FilterTabs filter="active" onChange={vi.fn()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Active' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Completed' })).toHaveAttribute(
      'aria-selected',
      'false',
    );
  });

  it('calls onChange with the clicked tab value', async () => {
    const onChange = vi.fn();
    const { container } = render(<FilterTabs filter="all" onChange={onChange} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    fireEvent.click(screen.getByRole('tab', { name: 'Completed' }));
    expect(onChange).toHaveBeenCalledWith('completed');
  });

  it('renders with tablist role', async () => {
    const { container } = render(<FilterTabs filter="all" onChange={vi.fn()} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });
});
