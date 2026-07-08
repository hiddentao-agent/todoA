import { test, expect } from '@playwright/test';
import { setupCleanApp, clickTaskCheckbox, DB_WRITE_DELAY, RELOAD_DELAY } from './helpers';

test.describe('Task CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await setupCleanApp(page);
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
    await page.waitForTimeout(DB_WRITE_DELAY);

    await clickTaskCheckbox(page, 'Buy milk');
    // Wait for the toggle to persist and re-render
    await page.waitForTimeout(DB_WRITE_DELAY);

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
    await page.waitForTimeout(DB_WRITE_DELAY);
    await input.fill('Task 2');
    await input.press('Enter');
    await page.waitForTimeout(DB_WRITE_DELAY);

    // Complete the first task via the visible label wrapper
    await clickTaskCheckbox(page, 'Task 1');
    // Wait for the toggle to persist to IndexedDB and re-render
    await page.waitForTimeout(DB_WRITE_DELAY);

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
    await page.waitForTimeout(DB_WRITE_DELAY);

    await clickTaskCheckbox(page, 'Task 1');
    await page.waitForTimeout(DB_WRITE_DELAY);

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
    await page.waitForTimeout(RELOAD_DELAY);

    await expect(page.getByText('Persistent task')).toBeVisible();
  });
});
