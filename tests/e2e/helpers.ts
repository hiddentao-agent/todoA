import type { Page } from '@playwright/test';

/** After IndexedDB write + re-render */
export const DB_WRITE_DELAY = 150;
/** After search input (matches app's 150ms debounce) */
export const DEBOUNCE_DELAY = 200;
/** After page reload + DB hydration */
export const RELOAD_DELAY = 500;

/**
 * Set up a clean app state: clear IndexedDB, reload, and wait for the app to initialize.
 * Use this in beforeEach to ensure each test starts with a fresh database.
 */
export async function setupCleanApp(page: Page) {
  await page.goto('/');
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const req = indexedDB.deleteDatabase('TodoApp');
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
        req.onblocked = () => resolve();
      }),
  );
  await page.reload();
  await page.waitForSelector('[aria-label="New task description"]');
}

/**
 * Click the checkbox label for a task by its text.
 * The native checkbox is hidden by custom CSS (opacity:0, width:0, height:0),
 * so we click the visible label wrapper which toggles the checkbox via HTML label behavior.
 */
export async function clickTaskCheckbox(page: Page, taskText: string) {
  const label = page
    .locator('label')
    .filter({ has: page.locator(`input[aria-label="Mark '${taskText}' complete"]`) })
    .first();
  await label.click();
}
