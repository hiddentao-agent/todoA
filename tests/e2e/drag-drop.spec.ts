import { test, expect } from '@playwright/test';

test.describe('Drag & Drop Reorder', () => {
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
    // Wait for app to fully initialize
    await page.waitForSelector('[aria-label="New task description"]');

    // Add several tasks to test reordering
    const input = page.getByLabel('New task description');
    await input.fill('First task');
    await input.press('Enter');
    await page.waitForTimeout(150);
    await input.fill('Second task');
    await input.press('Enter');
    await page.waitForTimeout(150);
    await input.fill('Third task');
    await input.press('Enter');
    await page.waitForTimeout(150);
  });

  test('tasks are created in correct order', async ({ page }) => {
    // Scope within the task listbox to avoid matching sort dropdown <option> elements
    const items = page.getByRole('listbox').getByRole('option');
    await expect(items).toHaveCount(3);
    await expect(items.nth(0)).toContainText('First task');
    await expect(items.nth(1)).toContainText('Second task');
    await expect(items.nth(2)).toContainText('Third task');
  });

  test('move up button is disabled for the first task', async ({ page }) => {
    const moveUpBtn = page.getByLabel("Move 'First task' up");
    await expect(moveUpBtn).toBeDisabled();
  });

  test('move down button is disabled for the last task', async ({ page }) => {
    const moveDownBtn = page.getByLabel("Move 'Third task' down");
    await expect(moveDownBtn).toBeDisabled();
  });

  test('move up is enabled for non-first tasks', async ({ page }) => {
    const secondMoveUp = page.getByLabel("Move 'Second task' up");
    await expect(secondMoveUp).not.toBeDisabled();
  });

  test('move down is enabled for non-last tasks', async ({ page }) => {
    const secondMoveDown = page.getByLabel("Move 'Second task' down");
    await expect(secondMoveDown).not.toBeDisabled();
  });

  test('task reordering via keyboard shortcut updates button disabled state', async ({ page }) => {
    // Second task move up should be enabled initially
    const secondMoveUp = page.getByLabel("Move 'Second task' up");
    await expect(secondMoveUp).not.toBeDisabled();

    // Focus the second task and press Ctrl+ArrowUp to move it up
    const items = page.getByRole('listbox').getByRole('option');
    await items.nth(1).focus();
    await page.keyboard.press('Control+ArrowUp');

    // After moving to first position, its move up button should be disabled
    await expect(secondMoveUp).toBeDisabled();
  });

  test('task order persists across page reload', async ({ page }) => {
    const items = page.getByRole('listbox').getByRole('option');
    await expect(items.nth(0)).toContainText('First task');
    await expect(items.nth(1)).toContainText('Second task');
    await expect(items.nth(2)).toContainText('Third task');

    // Reload the page
    await page.reload();
    await page.waitForSelector('[aria-label="New task description"]');

    // Verify the order persisted
    const itemsAfter = page.getByRole('listbox').getByRole('option');
    await expect(itemsAfter).toHaveCount(3);
    await expect(itemsAfter.nth(0)).toContainText('First task');
    await expect(itemsAfter.nth(1)).toContainText('Second task');
    await expect(itemsAfter.nth(2)).toContainText('Third task');
  });
});
