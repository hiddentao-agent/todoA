import { test, expect } from '@playwright/test';

test.describe('Task CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear IndexedDB for a clean state — must await completion before reload
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
    // Wait for app to fully initialize
    await page.waitForSelector('[aria-label="New task description"]');
  });

  test('shows empty state on first load', async ({ page }) => {
    await expect(page.getByText('No tasks yet')).toBeVisible();
    await expect(page.getByText('Add your first task above')).toBeVisible();
  });

  test('adds a task by typing and pressing Enter', async ({ page }) => {
    const input = page.getByLabel('New task description');
    await input.fill('Buy milk');
    await input.press('Enter');

    await expect(page.getByText('Buy milk')).toBeVisible();
    await expect(input).toHaveValue('');
  });

  test('adds a task by clicking Add button', async ({ page }) => {
    const input = page.getByLabel('New task description');
    await input.fill('Buy milk');
    await page.getByRole('button', { name: 'Add' }).click();

    await expect(page.getByText('Buy milk')).toBeVisible();
  });

  test('rejects empty task text', async ({ page }) => {
    const input = page.getByLabel('New task description');
    await input.fill('   ');
    await input.press('Enter');

    await expect(page.getByText('Please enter a task description')).toBeVisible();
    await expect(page.getByText('No tasks yet')).toBeVisible();
  });

  test('toggles task completion via checkbox', async ({ page }) => {
    const input = page.getByLabel('New task description');
    await input.fill('Buy milk');
    await input.press('Enter');
    // Wait for the task to be written to IndexedDB and rendered
    await page.waitForTimeout(150);

    // The native checkbox is hidden by custom CSS (opacity:0, width:0, height:0).
    // Click the visible label wrapper which toggles the checkbox via HTML label behavior.
    const checkboxLabel = page
      .locator('label')
      .filter({ has: page.locator('input[aria-label="Mark \'Buy milk\' complete"]') })
      .first();
    await checkboxLabel.click();
    // Wait for the toggle to persist and re-render
    await page.waitForTimeout(150);

    // Verify completed styling
    const taskItem = page.getByText('Buy milk');
    await expect(taskItem).toHaveClass(/completed/);
  });

  test('deletes a task via delete button', async ({ page }) => {
    const input = page.getByLabel('New task description');
    await input.fill('Buy milk');
    await input.press('Enter');

    const deleteButton = page.getByLabel("Delete 'Buy milk'");
    await deleteButton.click();

    await expect(page.getByText('Buy milk')).not.toBeVisible();
    await expect(page.getByText('No tasks yet')).toBeVisible();
  });

  test('task item renders with correct ARIA role', async ({ page }) => {
    const input = page.getByLabel('New task description');
    await input.fill('Buy milk');
    await input.press('Enter');

    // Verify the task is created and visible
    await expect(page.getByText('Buy milk')).toBeVisible();

    // Verify the task item has the correct ARIA role (option within listbox)
    const taskOption = page
      .getByRole('listbox')
      .getByRole('option')
      .filter({ hasText: 'Buy milk' });
    await expect(taskOption).toBeVisible();
  });

  test('clears completed tasks and shows undo toast', async ({ page }) => {
    const input = page.getByLabel('New task description');
    await input.fill('Task 1');
    await input.press('Enter');
    await page.waitForTimeout(150);
    await input.fill('Task 2');
    await input.press('Enter');
    await page.waitForTimeout(150);

    // Complete the first task via the visible label wrapper
    const cbLabel = page
      .locator('label')
      .filter({ has: page.locator('input[aria-label="Mark \'Task 1\' complete"]') })
      .first();
    await cbLabel.click();
    // Wait for the toggle to persist to IndexedDB and re-render
    await page.waitForTimeout(150);

    // Clear completed
    await page
      .getByRole('button', { name: /Clear completed/ })
      .first()
      .click();

    // Toast should appear
    await expect(page.getByText(/completed task/)).toBeVisible();

    // Task 2 should remain
    await expect(page.getByText('Task 2')).toBeVisible();
    await expect(page.getByText('Task 1')).not.toBeVisible();
  });

  test('undo restores cleared tasks', async ({ page }) => {
    const input = page.getByLabel('New task description');
    await input.fill('Task 1');
    await input.press('Enter');
    await page.waitForTimeout(150);

    const cbLabel = page
      .locator('label')
      .filter({ has: page.locator('input[aria-label="Mark \'Task 1\' complete"]') })
      .first();
    await cbLabel.click();
    await page.waitForTimeout(150);

    await page.getByRole('button', { name: /Clear completed/ }).click();

    // Click Undo in toast
    await page.getByRole('button', { name: 'Undo' }).click();

    await expect(page.getByText('Task 1')).toBeVisible();
  });

  test('persists tasks across page reload', async ({ page }) => {
    const input = page.getByLabel('New task description');
    await input.fill('Persistent task');
    await input.press('Enter');
    // Wait for the task to be visible (indicating it was written to IndexedDB and rendered)
    await expect(page.getByText('Persistent task')).toBeVisible();

    await page.reload();
    // Wait for the app to mount and load tasks from IndexedDB
    await page.waitForSelector('[aria-label="New task description"]');
    // Wait for the skeleton loader to disappear (loading completes) or for the task to appear
    await page
      .locator('[aria-busy="true"]')
      .waitFor({ state: 'hidden', timeout: 5000 })
      .catch(() => {});
    // Use waitForTimeout as a fallback for the final IndexedDB read + render
    await page.waitForTimeout(500);

    await expect(page.getByText('Persistent task')).toBeVisible();
  });
});
