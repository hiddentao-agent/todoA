import { test, expect } from '@playwright/test';

test.describe('Theming', () => {
  test.beforeEach(async ({ page }) => {
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
    // Wait for app to fully initialize — after SSR the effects need time to settle
    await page.waitForSelector('[aria-label="New task description"]');
    await page.waitForTimeout(100);
  });

  test('theme toggle cycles through light, dark, and system preference', async ({ page }) => {
    const toggle = page.getByLabel(/Current theme/);

    // The default theme is 'system'
    await expect(toggle).toHaveAttribute('aria-label', /^Current theme: system/);

    // Click to switch to light
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-label', /^Current theme: light/);

    // Click to switch to dark
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-label', /^Current theme: dark/);

    // Click to switch back to system
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-label', /^Current theme: system/);
  });

  test('theme preference persists across page reload', async ({ page }) => {
    const toggle = page.getByLabel(/Current theme/);

    // Switch to dark theme
    await toggle.click();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-label', /^Current theme: dark/);

    // Reload the page
    await page.reload();

    // Verify dark theme is still active
    const toggleAfterReload = page.getByLabel(/Current theme/);
    await expect(toggleAfterReload).toHaveAttribute('aria-label', /^Current theme: dark/);
  });

  test('dark theme applies correct data-theme attribute', async ({ page }) => {
    // Check initial data-theme attribute
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'system');

    const toggle = page.getByLabel(/Current theme/);

    // Switch to light
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // Switch to dark
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Switch back to system
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'system');
  });

  test('theme preference is stored in localStorage', async ({ page }) => {
    // Default theme 'system' is kept in-memory only until user explicitly chooses a theme.
    // The app does not write default values to localStorage.
    let storedTheme = await page.evaluate(() => localStorage.getItem('todo_theme'));
    expect(storedTheme).toBeNull();

    const toggle = page.getByLabel(/Current theme/);

    // Switch to light
    await toggle.click();
    storedTheme = await page.evaluate(() => localStorage.getItem('todo_theme'));
    expect(storedTheme).toBe('light');

    // Switch to dark
    await toggle.click();
    storedTheme = await page.evaluate(() => localStorage.getItem('todo_theme'));
    expect(storedTheme).toBe('dark');

    // Switch to system
    await toggle.click();
    storedTheme = await page.evaluate(() => localStorage.getItem('todo_theme'));
    expect(storedTheme).toBe('system');
  });
});
