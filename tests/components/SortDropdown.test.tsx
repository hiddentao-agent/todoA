import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { SortDropdown } from '@/components/SortDropdown';

describe('SortDropdown', () => {
  it('renders with correct label', () => {
    render(<SortDropdown sortMode="manual" onChange={vi.fn()} />);
    expect(screen.getByLabelText('Sort tasks')).toBeInTheDocument();
  });

  it('shows all three sort options', () => {
    render(<SortDropdown sortMode="manual" onChange={vi.fn()} />);
    const select = screen.getByLabelText('Sort tasks') as HTMLSelectElement;
    expect(select.options).toHaveLength(3);
    expect(select.options[0].text).toBe('Manual order');
    expect(select.options[1].text).toBe('Due date ↑');
    expect(select.options[2].text).toBe('Due date ↓');
  });

  it('reflects the current sort mode', () => {
    render(<SortDropdown sortMode="dueDateAsc" onChange={vi.fn()} />);
    const select = screen.getByLabelText('Sort tasks') as HTMLSelectElement;
    expect(select.value).toBe('dueDateAsc');
  });

  it('calls onChange on selection change', () => {
    const onChange = vi.fn();
    render(<SortDropdown sortMode="manual" onChange={onChange} />);
    const select = screen.getByLabelText('Sort tasks');
    fireEvent.change(select, { target: { value: 'dueDateDesc' } });
    expect(onChange).toHaveBeenCalledWith('dueDateDesc');
  });
});
