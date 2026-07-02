import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/preact';
import { afterEach, expect, vi } from 'vitest';
import { toHaveNoViolations } from 'vitest-axe/matchers';

expect.extend({ toHaveNoViolations });

afterEach(() => {
  cleanup();
});

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock BroadcastChannel
class MockBroadcastChannel {
  name: string;
  constructor(name: string) {
    this.name = name;
  }
  postMessage = vi.fn();
  close = vi.fn();
  addEventListener = vi.fn();
  removeEventListener = vi.fn();
  onmessage: ((ev: MessageEvent) => void) | null = null;
  onmessageerror: ((ev: MessageEvent) => void) | null = null;
}

Object.defineProperty(window, 'BroadcastChannel', {
  value: MockBroadcastChannel,
});

// Mock canvas to suppress axe-core color-contrast noise in jsdom
HTMLCanvasElement.prototype.getContext = vi.fn(
  () => null,
) as unknown as typeof HTMLCanvasElement.prototype.getContext;

// Suppress axe-core getComputedStyle errors for pseudo-elements in jsdom.
// jsdom does not implement getComputedStyle(elt, pseudoElt); axe's
// color-contrast check calls it for ::before/::after and throws.
const _origGetComputedStyle = window.getComputedStyle.bind(window);
window.getComputedStyle = (elt: Element, pseudoElt?: string | null) => {
  if (pseudoElt) {
    // Return a minimal style stub for pseudo-elements so axe doesn't throw.
    return {
      getPropertyValue: () => '',
      getPropertyPriority: () => '',
      length: 0,
      item: () => '',
      [Symbol.iterator]: function* () {},
    } as unknown as CSSStyleDeclaration;
  }
  return _origGetComputedStyle(elt);
};
