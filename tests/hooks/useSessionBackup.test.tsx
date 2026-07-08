import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/preact';
import { useSessionBackup } from '@/hooks/useSessionBackup';

describe('useSessionBackup', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ---- save ----

  it('save stores value to sessionStorage when key is provided', () => {
    const { result } = renderHook(() => useSessionBackup('test-key'));

    act(() => {
      result.current.save('hello world');
    });

    expect(sessionStorage.getItem('test-key')).toBe('hello world');
  });

  it('save is a no-op when key is null', () => {
    const { result } = renderHook(() => useSessionBackup(null));

    act(() => {
      result.current.save('value');
    });

    expect(sessionStorage.length).toBe(0);
  });

  it('save does not throw when sessionStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    const { result } = renderHook(() => useSessionBackup('test-key'));

    expect(() => {
      act(() => {
        result.current.save('value');
      });
    }).not.toThrow();
  });

  // ---- clear ----

  it('clear removes value from sessionStorage when key is provided', () => {
    sessionStorage.setItem('test-key', 'existing');
    const { result } = renderHook(() => useSessionBackup('test-key'));

    act(() => {
      result.current.clear();
    });

    expect(sessionStorage.getItem('test-key')).toBeNull();
  });

  it('clear is a no-op when key is null', () => {
    sessionStorage.setItem('test-key', 'existing');
    const { result } = renderHook(() => useSessionBackup(null));

    act(() => {
      result.current.clear();
    });

    // Existing entry should be untouched
    expect(sessionStorage.getItem('test-key')).toBe('existing');
  });

  it('clear does not throw when sessionStorage.removeItem throws', () => {
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new Error('access denied');
    });

    const { result } = renderHook(() => useSessionBackup('test-key'));

    expect(() => {
      act(() => {
        result.current.clear();
      });
    }).not.toThrow();
  });

  // ---- memoization ----

  it('returns stable callback references when key does not change', () => {
    const { result, rerender } = renderHook(() => useSessionBackup('test-key'));

    const { save: save1, clear: clear1 } = result.current;

    rerender();

    const { save: save2, clear: clear2 } = result.current;

    expect(save1).toBe(save2);
    expect(clear1).toBe(clear2);
  });

  it('returns new callbacks when key changes', () => {
    const { result, rerender } = renderHook(
      ({ key }) => useSessionBackup(key),
      { initialProps: { key: 'key-a' as string | null } },
    );

    const { save: saveA, clear: clearA } = result.current;

    rerender({ key: 'key-b' });

    const { save: saveB, clear: clearB } = result.current;

    expect(saveA).not.toBe(saveB);
    expect(clearA).not.toBe(clearB);
  });

  it('new save callback targets the updated key', () => {
    const { result, rerender } = renderHook(
      ({ key }) => useSessionBackup(key),
      { initialProps: { key: 'key-a' as string | null } },
    );

    rerender({ key: 'key-b' });

    act(() => {
      result.current.save('new-key-value');
    });

    expect(sessionStorage.getItem('key-a')).toBeNull();
    expect(sessionStorage.getItem('key-b')).toBe('new-key-value');
  });
});
