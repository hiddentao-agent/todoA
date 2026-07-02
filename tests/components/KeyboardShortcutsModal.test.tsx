import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal';

const axeOptions = { rules: { 'nested-interactive': { enabled: false } } };

describe('KeyboardShortcutsModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all shortcuts', async () => {
    const { container } = render(<KeyboardShortcutsModal onClose={vi.fn()} />);
    const results = await axe(container, axeOptions);
    expect(results).toHaveNoViolations();

    // Check that dialog is present
    expect(screen.getByRole('dialog', { name: 'Keyboard Shortcuts' })).toBeInTheDocument();
    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();

    // Check for specific shortcut keys and actions
    // "Enter" appears twice (add task entry + save edit), use getAllByText
    const enterElements = screen.getAllByText('Enter');
    expect(enterElements.length).toBe(2);
    expect(screen.getByText('Escape')).toBeInTheDocument();
    expect(screen.getByText('Space')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();
    expect(screen.getByText('Backspace')).toBeInTheDocument();

    // Check close button
    expect(screen.getByLabelText('Close')).toBeInTheDocument();
  });

  it('calls onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsModal onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<KeyboardShortcutsModal onClose={onClose} />);
    // The backdrop is the outermost div
    const backdrop = container.firstElementChild as HTMLElement;
    expect(backdrop).toBeInTheDocument();
    // Clicking the backdrop itself (not a child) should close
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when dialog interior is clicked', () => {
    const onClose = vi.fn();
    render(<KeyboardShortcutsModal onClose={onClose} />);
    // Click the dialog content (a child of backdrop)
    const dialog = screen.getByRole('dialog', { name: 'Keyboard Shortcuts' });
    fireEvent.click(dialog);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes when Enter or Space is pressed on backdrop', () => {
    const onClose = vi.fn();
    const { container } = render(<KeyboardShortcutsModal onClose={onClose} />);
    const backdrop = container.firstElementChild as HTMLElement;

    fireEvent.keyDown(backdrop, { key: 'Enter' });
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(backdrop, { key: ' ' });
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('focuses first focusable element on mount', () => {
    render(<KeyboardShortcutsModal onClose={vi.fn()} />);
    // Should focus the close button (first focusable in the dialog)
    const closeButton = screen.getByLabelText('Close');
    expect(document.activeElement).toBe(closeButton);
  });

  it('returns focus to previously focused element on unmount', () => {
    const button = document.createElement('button');
    button.textContent = 'Trigger';
    document.body.appendChild(button);
    button.focus();
    expect(document.activeElement).toBe(button);

    const { unmount } = render(<KeyboardShortcutsModal onClose={vi.fn()} />);
    unmount();

    expect(document.activeElement).toBe(button);
    document.body.removeChild(button);
  });

  describe('focus trap', () => {
    it('wraps focus from last to first on Tab key', () => {
      render(<KeyboardShortcutsModal onClose={vi.fn()} />);
      const closeButton = screen.getByLabelText('Close');

      // Close button is focused on mount (first/last focusable element)
      expect(document.activeElement).toBe(closeButton);

      // Tab when on first (also last) wraps to first
      fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
      expect(document.activeElement).toBe(closeButton);
    });

    it('wraps focus from first to last on Shift+Tab key', () => {
      render(<KeyboardShortcutsModal onClose={vi.fn()} />);
      const closeButton = screen.getByLabelText('Close');

      expect(document.activeElement).toBe(closeButton);

      // Shift+Tab when on first wraps to last (same element when only one)
      fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
      expect(document.activeElement).toBe(closeButton);
    });

    it('calls preventDefault when Tab wraps focus', () => {
      render(<KeyboardShortcutsModal onClose={vi.fn()} />);

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
      render(<KeyboardShortcutsModal onClose={vi.fn()} />);

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
