import { test, expect } from '@playwright/test';

test.describe('PWA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('service worker is registered', async ({ page }) => {
    const hasSW = await page.evaluate(async () => {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        return registrations.length > 0;
      }
      return false;
    });
    expect(hasSW).toBe(true);
  });

  test('manifest link exists in HTML', async ({ page }) => {
    const manifestLink = page.locator('link[rel="manifest"]');
    await expect(manifestLink).toHaveAttribute('href', '/manifest.webmanifest');
  });

  test('app loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible();
    expect(errors).toHaveLength(0);
  });

  test('app is accessible offline after first load (precaching)', async ({ page }) => {
    // First load — ensure the page rendered fully
    await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible();

    // Go offline
    await page.context().setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    // Reload — app should still load from the service worker cache
    await page.reload();

    await expect(page.getByRole('heading', { name: 'Tasks' })).toBeVisible();
  });
});
