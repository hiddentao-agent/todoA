import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/preact';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';

function TestComponent() {
  const online = useOnlineStatus();
  return <div data-testid="status">{online ? 'online' : 'offline'}</div>;
}

describe('useOnlineStatus', () => {
  afterEach(() => {
    // Reset navigator.onLine to default
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
  });

  it('returns true when navigator.onLine is true', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
    render(<TestComponent />);
    expect(screen.getByTestId('status')).toHaveTextContent('online');
  });

  it('returns false when navigator.onLine is false', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });
    render(<TestComponent />);
    expect(screen.getByTestId('status')).toHaveTextContent('offline');
  });

  it('updates to false when offline event fires', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
    render(<TestComponent />);
    expect(screen.getByTestId('status')).toHaveTextContent('online');

    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    expect(screen.getByTestId('status')).toHaveTextContent('offline');
  });

  it('updates to true when online event fires', () => {
    Object.defineProperty(navigator, 'onLine', {
      value: false,
      writable: true,
      configurable: true,
    });
    render(<TestComponent />);
    expect(screen.getByTestId('status')).toHaveTextContent('offline');

    Object.defineProperty(navigator, 'onLine', {
      value: true,
      writable: true,
      configurable: true,
    });
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    expect(screen.getByTestId('status')).toHaveTextContent('online');
  });
});
