/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// vitest-axe/matchers.d.ts incorrectly uses `export type *` which strips value
// exports. Override to restore the runtime matcher export.
declare module 'vitest-axe/matchers' {
  export {
    toHaveNoViolations,
    type AxeMatchers,
    type NoViolationsMatcherResult,
  } from 'vitest-axe/dist/matchers';
}

// Test mock for virtual:pwa-register/preact — the mock at
// tests/__mocks__/virtualPwaRegisterPreact.ts re-exports these values.
declare module 'virtual:pwa-register/preact' {
  export {
    mockNeedRefresh,
    mockUpdateServiceWorker,
  } from '../tests/__mocks__/virtualPwaRegisterPreact';
}
