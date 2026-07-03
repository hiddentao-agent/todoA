import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { ThemeToggle } from '@/components/ThemeToggle';

let mockTheme: string = 'system';
const mockSetTheme = vi.fn();

vi.mock('@/store', () => ({
  useTodoStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      theme: mockTheme,
      setTheme: mockSetTheme,
    };
    return selector ? selector(state) : state;
  },
}));

describe('ThemeToggle', () => {
  it('renders with system theme icon and correct aria-label', async () => {
    mockTheme = 'system';
    const { container } = render(<ThemeToggle />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    const button = screen.getByRole('button');
    expect(button).toHaveAttribute(
      'aria-label',
      'Current theme: system. Click to switch to light.',
    );
    expect(button).toHaveAttribute('title', 'Theme: system');
  });

  it('cycles from system -> light -> dark -> system', async () => {
    mockTheme = 'system';
    const { container, rerender } = render(<ThemeToggle />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();

    fireEvent.click(screen.getByRole('button'));
    expect(mockSetTheme).toHaveBeenCalledWith('light');

    // Simulate store update
    mockTheme = 'light';
    rerender(<ThemeToggle />);
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Current theme: light. Click to switch to dark.',
    );

    fireEvent.click(screen.getByRole('button'));
    expect(mockSetTheme).toHaveBeenCalledWith('dark');

    mockTheme = 'dark';
    rerender(<ThemeToggle />);
    expect(screen.getByRole('button')).toHaveAttribute(
      'aria-label',
      'Current theme: dark. Click to switch to system.',
    );

    fireEvent.click(screen.getByRole('button'));
    expect(mockSetTheme).toHaveBeenCalledWith('system');
  });
});
