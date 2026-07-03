import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { EmptyState } from '@/components/EmptyState';

describe('EmptyState', () => {
  it('renders noTasks variant', async () => {
    const { container } = render(<EmptyState variant="noTasks" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    expect(screen.getByText('No tasks yet')).toBeInTheDocument();
    expect(screen.getByText('Add your first task above')).toBeInTheDocument();
  });

  it('renders allDone variant', async () => {
    const { container } = render(<EmptyState variant="allDone" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    expect(screen.getByText('All done!')).toBeInTheDocument();
    expect(screen.getByText('No active tasks remaining')).toBeInTheDocument();
  });

  it('renders noCompleted variant', async () => {
    const { container } = render(<EmptyState variant="noCompleted" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    expect(screen.getByText('Nothing completed yet')).toBeInTheDocument();
    expect(screen.getByText('Complete a task to see it here')).toBeInTheDocument();
  });

  it('renders noSearchResults variant with search query', async () => {
    const { container } = render(
      <EmptyState variant="noSearchResults" searchQuery="nonexistent" />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    // The title contains &lsquo; and &rsquo; entities which render as curly quotes
    expect(screen.getByText(/No tasks match/)).toBeInTheDocument();
    // Verify the search query appears in the text
    expect(screen.getByText((content) => content.includes('nonexistent'))).toBeInTheDocument();
  });

  it('renders clear search button when onClearSearch is provided', async () => {
    const onClearSearch = vi.fn();
    const { container } = render(
      <EmptyState variant="noSearchResults" searchQuery="test" onClearSearch={onClearSearch} />,
    );
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    const clearButton = screen.getByRole('button', { name: 'Clear search' });
    expect(clearButton).toBeInTheDocument();
    fireEvent.click(clearButton);
    expect(onClearSearch).toHaveBeenCalledTimes(1);
  });

  it('does not render clear search button when onClearSearch is not provided', async () => {
    const { container } = render(<EmptyState variant="noSearchResults" searchQuery="test" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
