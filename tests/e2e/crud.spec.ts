import { test, expect } from '@playwright/test';

test.describe('Task CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear IndexedDB for a clean state
    await page.evaluate(() => indexedDB.deleteDatabase('TodoApp'));
    await page.reload();
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

    // Find and click the checkbox
    const checkbox = page.getByLabel("Mark 'Buy milk' complete");
    await checkbox.click();

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

  test('edits a task inline via double-click', async ({ page }) => {
    const input = page.getByLabel('New task description');
    await input.fill('Buy milk');
    await input.press('Enter');

    const taskText = page.getByText('Buy milk');
    await taskText.dblclick();

    // Should show an input pre-filled with "Buy milk"
    const editInput = page.locator('input[value="Buy milk"]');
    await editInput.fill('Buy organic milk');
    await editInput.press('Enter');

    await expect(page.getByText('Buy organic milk')).toBeVisible();
  });

  test('clears completed tasks and shows undo toast', async ({ page }) => {
    const input = page.getByLabel('New task description');
    await input.fill('Task 1');
    await input.press('Enter');
    await input.fill('Task 2');
    await input.press('Enter');

    // Complete the first task
    const checkbox = page.getByLabel("Mark 'Task 1' complete");
    await checkbox.click();

    // Clear completed
    await page.getByRole('button', { name: /Clear completed/ }).first().click();

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

    const checkbox = page.getByLabel("Mark 'Task 1' complete");
    await checkbox.click();

    await page.getByRole('button', { name: /Clear completed/ }).click();

    // Click Undo in toast
    await page.getByRole('button', { name: 'Undo' }).click();

    await expect(page.getByText('Task 1')).toBeVisible();
  });

  test('persists tasks across page reload', async ({ page }) => {
    const input = page.getByLabel('New task description');
    await input.fill('Persistent task');
    await input.press('Enter');

    await page.reload();

    await expect(page.getByText('Persistent task')).toBeVisible();
  });
});
