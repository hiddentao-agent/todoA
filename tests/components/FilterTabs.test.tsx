import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { FilterTabs } from '@/components/FilterTabs';

describe('FilterTabs', () => {
  it('renders all three tabs', () => {
    render(<FilterTabs filter="all" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'All' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Active' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Completed' })).toBeInTheDocument();
  });

  it('marks the active tab as selected', () => {
    render(<FilterTabs filter="active" onChange={vi.fn()} />);
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'false');
    expect(screen.getByRole('tab', { name: 'Active' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'Completed' })).toHaveAttribute('aria-selected', 'false');
  });

  it('calls onChange with the clicked tab value', () => {
    const onChange = vi.fn();
    render(<FilterTabs filter="all" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Completed' }));
    expect(onChange).toHaveBeenCalledWith('completed');
  });

  it('renders with tablist role', () => {
    render(<FilterTabs filter="all" onChange={vi.fn()} />);
    expect(screen.getByRole('tablist')).toBeInTheDocument();
  });
});
