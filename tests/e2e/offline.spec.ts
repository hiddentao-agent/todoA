import { test, expect } from '@playwright/test';
import { setupCleanApp, DB_WRITE_DELAY } from './helpers';

test.describe('Offline', () => {
  test.beforeEach(async ({ page }) => {
    await setupCleanApp(page);
  });

  test('shows offline banner when network is disconnected', async ({ page }) => {
    await page.context().setOffline(true);
    // The hook listens for the offline event; dispatch it explicitly for reliability
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    await expect(page.getByText(/You're offline/)).toBeVisible();
  });

  test('offline banner can be dismissed', async ({ page }) => {
    await page.context().setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    await expect(page.getByText(/You're offline/)).toBeVisible();

    const dismissBtn = page.getByLabel('Dismiss offline notice');
    await dismissBtn.click();

    await expect(page.getByText(/You're offline/)).not.toBeVisible();
  });

  test('tasks can still be added while offline', async ({ page }) => {
    await page.context().setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    // Tasks are stored in IndexedDB, which works offline
    const input = page.getByLabel('New task description');
    await input.fill('Offline task');
    await input.press('Enter');

    await expect(page.getByText('Offline task')).toBeVisible();
  });

  test('offline banner reappears after going offline again (dismissed state resets when back online)', async ({
    page,
  }) => {
    // Go offline for the first time
    await page.context().setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));
    await expect(page.getByText(/You're offline/)).toBeVisible();

    // Dismiss the banner
    await page.getByLabel('Dismiss offline notice').click();
    await expect(page.getByText(/You're offline/)).not.toBeVisible();

    // Go back online — this resets the dismissed state
    await page.context().setOffline(false);
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await page.waitForTimeout(DB_WRITE_DELAY);

    // Go offline again
    await page.context().setOffline(true);
    await page.evaluate(() => window.dispatchEvent(new Event('offline')));

    // Banner should reappear
    await expect(page.getByText(/You're offline/)).toBeVisible();
  });
});
