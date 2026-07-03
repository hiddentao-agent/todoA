import { test, expect } from '@playwright/test';

test.describe('Drag & Drop Reorder', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => indexedDB.deleteDatabase('TodoApp'));
    await page.reload();

    // Add several tasks to test reordering
    const input = page.getByLabel('New task description');
    await input.fill('First task');
    await input.press('Enter');
    await input.fill('Second task');
    await input.press('Enter');
    await input.fill('Third task');
    await input.press('Enter');
  });

  test('move up button moves a task earlier in the list', async ({ page }) => {
    // Initially the order is: First, Second, Third
    const items = page.getByRole('option');
    await expect(items.nth(0)).toContainText('First task');
    await expect(items.nth(1)).toContainText('Second task');
    await expect(items.nth(2)).toContainText('Third task');

    // Move "Third task" up twice to get it to the top
    await page.getByLabel("Move 'Third task' up").click();
    await page.getByLabel("Move 'Third task' up").click();

    // Now the order should be: Third, First, Second
    await expect(items.nth(0)).toContainText('Third task');
    await expect(items.nth(1)).toContainText('First task');
    await expect(items.nth(2)).toContainText('Second task');
  });

  test('move down button moves a task later in the list', async ({ page }) => {
    // Initially the order is: First, Second, Third
    const items = page.getByRole('option');
    await expect(items.nth(0)).toContainText('First task');
    await expect(items.nth(1)).toContainText('Second task');
    await expect(items.nth(2)).toContainText('Third task');

    // Move "First task" down twice to get it to the bottom
    await page.getByLabel("Move 'First task' down").click();
    await page.getByLabel("Move 'First task' down").click();

    // Now the order should be: Second, Third, First
    await expect(items.nth(0)).toContainText('Second task');
    await expect(items.nth(1)).toContainText('Third task');
    await expect(items.nth(2)).toContainText('First task');
  });

  test('reorder persists across page reload', async ({ page }) => {
    // Move "Third task" up once so order becomes: First, Third, Second
    await page.getByLabel("Move 'Third task' up").click();

    // Reload the page
    await page.reload();

    // Verify the order persisted
    const items = page.getByRole('option');
    await expect(items.nth(0)).toContainText('First task');
    await expect(items.nth(1)).toContainText('Third task');
    await expect(items.nth(2)).toContainText('Second task');
  });

  test('move up button is disabled for the first task', async ({ page }) => {
    // The first task's move up button should be disabled
    const moveUpBtn = page.getByLabel("Move 'First task' up");
    await expect(moveUpBtn).toBeDisabled();
  });

  test('move down button is disabled for the last task', async ({ page }) => {
    // The last task's move down button should be disabled
    const moveDownBtn = page.getByLabel("Move 'Third task' down");
    await expect(moveDownBtn).toBeDisabled();
  });

  test('move up becomes disabled after moving a task to first position', async ({ page }) => {
    // "Second task" can move up initially
    const secondMoveUp = page.getByLabel("Move 'Second task' up");
    await expect(secondMoveUp).not.toBeDisabled();

    // Move it up once — it becomes first
    await secondMoveUp.click();

    // Now it should be disabled since it's first
    await expect(secondMoveUp).toBeDisabled();
  });

  test('move down becomes disabled after moving a task to last position', async ({ page }) => {
    // "Third task" is last, so its move down is disabled already
    // Let's verify "First task" can be moved to last
    const firstMoveDown = page.getByLabel("Move 'First task' down");
    await expect(firstMoveDown).not.toBeDisabled();

    // Move it down to middle
    await firstMoveDown.click();
    // Now it's second — move it down again to last
    await firstMoveDown.click();

    // Now it should be disabled since it's last
    await expect(firstMoveDown).toBeDisabled();
  });
});
