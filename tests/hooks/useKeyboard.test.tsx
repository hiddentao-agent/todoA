import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';

import { useKeyboard } from '@/hooks/useKeyboard';

interface HookProps {
  onSearchFocus?: () => void;
  onShortcutsOpen?: () => void;
}

function TestComponent({ onSearchFocus, onShortcutsOpen }: HookProps) {
  useKeyboard({ onSearchFocus, onShortcutsOpen });
  return (
    <div>
      <input type="text" aria-label="Test input" />
      <div data-testid="content">Content</div>
    </div>
  );
}

describe('useKeyboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls onSearchFocus when / is pressed outside input', () => {
    const onSearchFocus = vi.fn();
    render(<TestComponent onSearchFocus={onSearchFocus} />);

    fireEvent.keyDown(document, { key: '/' });

    expect(onSearchFocus).toHaveBeenCalledTimes(1);
  });

  it('prevents default when / is pressed', () => {
    const onSearchFocus = vi.fn();
    render(<TestComponent onSearchFocus={onSearchFocus} />);

    const event = new KeyboardEvent('keydown', { key: '/' });
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault');
    document.dispatchEvent(event);

    expect(preventDefaultSpy).toHaveBeenCalled();
  });

  it('calls onShortcutsOpen when ? is pressed outside input', () => {
    const onShortcutsOpen = vi.fn();
    render(<TestComponent onShortcutsOpen={onShortcutsOpen} />);

    fireEvent.keyDown(document, { key: '?' });

    expect(onShortcutsOpen).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onSearchFocus when / is pressed while typing in input', () => {
    const onSearchFocus = vi.fn();
    render(<TestComponent onSearchFocus={onSearchFocus} />);

    const input = screen.getByLabelText('Test input');
    fireEvent.keyDown(input, { key: '/' });

    expect(onSearchFocus).not.toHaveBeenCalled();
  });

  it('does NOT call onShortcutsOpen when ? is pressed while typing in input', () => {
    const onShortcutsOpen = vi.fn();
    render(<TestComponent onShortcutsOpen={onShortcutsOpen} />);

    const input = screen.getByLabelText('Test input');
    fireEvent.keyDown(input, { key: '?' });

    expect(onShortcutsOpen).not.toHaveBeenCalled();
  });

  it('removes event listener on unmount', () => {
    const onSearchFocus = vi.fn();
    const { unmount } = render(<TestComponent onSearchFocus={onSearchFocus} />);

    unmount();

    fireEvent.keyDown(document, { key: '/' });
    expect(onSearchFocus).not.toHaveBeenCalled();
  });

  it('does not call callbacks for other keys', () => {
    const onSearchFocus = vi.fn();
    const onShortcutsOpen = vi.fn();
    render(<TestComponent onSearchFocus={onSearchFocus} onShortcutsOpen={onShortcutsOpen} />);

    fireEvent.keyDown(document, { key: 'a' });
    fireEvent.keyDown(document, { key: 'Enter' });

    expect(onSearchFocus).not.toHaveBeenCalled();
    expect(onShortcutsOpen).not.toHaveBeenCalled();
  });
});
