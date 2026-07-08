import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { AboutDialog } from '@/components/AboutDialog';

describe('AboutDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when open is false', () => {
    render(<AboutDialog open={false} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog when open is true', () => {
    render(<AboutDialog open={true} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog', { name: 'About' })).toBeInTheDocument();
    expect(
      screen.getByText('Todo App — A simple task manager built with Preact.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Version 1.0.0')).toBeInTheDocument();
  });

  it('has correct aria attributes', () => {
    render(<AboutDialog open={true} onClose={vi.fn()} />);
    const dialog = screen.getByRole('dialog', { name: 'About' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveAttribute('aria-labelledby', 'about-title');
  });

  it('calls onClose when close button is clicked', () => {
    const onClose = vi.fn();
    render(<AboutDialog open={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on backdrop click', () => {
    const onClose = vi.fn();
    render(<AboutDialog open={true} onClose={onClose} />);
    fireEvent.click(screen.getByLabelText('Close about dialog'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Escape key', () => {
    const onClose = vi.fn();
    render(<AboutDialog open={true} onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Enter key when backdrop is focused', () => {
    const onClose = vi.fn();
    render(<AboutDialog open={true} onClose={onClose} />);
    fireEvent.keyDown(screen.getByLabelText('Close about dialog'), { key: 'Enter' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose on Space key when backdrop is focused', () => {
    const onClose = vi.fn();
    render(<AboutDialog open={true} onClose={onClose} />);
    fireEvent.keyDown(screen.getByLabelText('Close about dialog'), { key: ' ' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when clicking inside the dialog', () => {
    const onClose = vi.fn();
    render(<AboutDialog open={true} onClose={onClose} />);
    fireEvent.click(screen.getByRole('dialog', { name: 'About' }));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('auto-focuses the close button on open', () => {
    render(<AboutDialog open={true} onClose={vi.fn()} />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Close' }));
  });

  it('toggles between open and closed states', () => {
    const onClose = vi.fn();
    const { rerender } = render(<AboutDialog open={true} onClose={onClose} />);
    expect(screen.getByRole('dialog', { name: 'About' })).toBeInTheDocument();

    rerender(<AboutDialog open={false} onClose={onClose} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(<AboutDialog open={true} onClose={onClose} />);
    expect(screen.getByRole('dialog', { name: 'About' })).toBeInTheDocument();
  });

  describe('focus trap', () => {
    it('wraps focus from last to first on Tab key', () => {
      render(<AboutDialog open={true} onClose={vi.fn()} />);
      const closeButton = screen.getByRole('button', { name: 'Close' });

      // Close button is focused on mount (only focusable element in the dialog)
      expect(document.activeElement).toBe(closeButton);

      // Tab when on last (also first) wraps to first
      fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
      expect(document.activeElement).toBe(closeButton);
    });

    it('wraps focus from first to last on Shift+Tab key', () => {
      render(<AboutDialog open={true} onClose={vi.fn()} />);
      const closeButton = screen.getByRole('button', { name: 'Close' });

      expect(document.activeElement).toBe(closeButton);

      // Shift+Tab when on first wraps to last (same element when only one)
      fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(closeButton);
    });

    it('calls preventDefault when Tab wraps focus', () => {
      render(<AboutDialog open={true} onClose={vi.fn()} />);

      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: false,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    });

    it('calls preventDefault when Shift+Tab wraps focus', () => {
      render(<AboutDialog open={true} onClose={vi.fn()} />);

      const event = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true,
        bubbles: true,
        cancelable: true,
      });
      document.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
    });
  });
});
