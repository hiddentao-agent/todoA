// Follow the same pattern as @testing-library/jest-dom/types/vitest.d.ts:
// import the vitest module first so that `declare module 'vitest'` acts as
// an augmentation rather than a shadowing declaration.
import 'vitest';

declare module 'vitest' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Assertion<T = unknown> {
    toHaveNoViolations(): import('vitest-axe/dist/matchers').NoViolationsMatcherResult;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): import('vitest-axe/dist/matchers').NoViolationsMatcherResult;
  }
}
