import { test, expect } from '@playwright/test';

test.describe('Theming', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => indexedDB.deleteDatabase('TodoApp'));
    await page.reload();
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
    let dataTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(dataTheme).toBe('system');

    const toggle = page.getByLabel(/Current theme/);

    // Switch to light
    await toggle.click();
    dataTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(dataTheme).toBe('light');

    // Switch to dark
    await toggle.click();
    dataTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(dataTheme).toBe('dark');

    // Switch back to system
    await toggle.click();
    dataTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(dataTheme).toBe('system');
  });

  test('theme preference is stored in localStorage', async ({ page }) => {
    // Default should be 'system'
    let storedTheme = await page.evaluate(() => localStorage.getItem('todo_theme'));
    expect(storedTheme).toBe('system');

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
