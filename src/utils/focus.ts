/**
 * Returns all focusable elements within a container.
 * Used by modal dialogs and focus-trap implementations.
 */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    ),
  );
}
