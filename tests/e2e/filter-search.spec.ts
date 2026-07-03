import { test, expect } from '@playwright/test';

test.describe('Filter, Search & Sort', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => indexedDB.deleteDatabase('TodoApp'));
    await page.reload();

    // Add some test tasks
    const input = page.getByLabel('New task description');
    await input.fill('Buy milk');
    await input.press('Enter');
    await input.fill('Walk the dog');
    await input.press('Enter');
    await input.fill('Write code');
    await input.press('Enter');

    // Complete the first task
    await page.getByLabel("Mark 'Buy milk' complete").click();
  });

  test('filter tabs filter tasks correctly', async ({ page }) => {
    // All filter (default) shows all 3
    await expect(page.getByText('Buy milk')).toBeVisible();
    await expect(page.getByText('Walk the dog')).toBeVisible();
    await expect(page.getByText('Write code')).toBeVisible();

    // Active filter shows 2
    await page.getByRole('tab', { name: 'Active' }).click();
    await expect(page.getByText('Buy milk')).not.toBeVisible();
    await expect(page.getByText('Walk the dog')).toBeVisible();
    await expect(page.getByText('Write code')).toBeVisible();

    // Completed filter shows 1
    await page.getByRole('tab', { name: 'Completed' }).click();
    await expect(page.getByText('Buy milk')).toBeVisible();
    await expect(page.getByText('Walk the dog')).not.toBeVisible();
    await expect(page.getByText('Write code')).not.toBeVisible();
  });

  test('filter tabs have correct aria attributes', async ({ page }) => {
    const allTab = page.getByRole('tab', { name: 'All' });
    await expect(allTab).toHaveAttribute('aria-selected', 'true');

    await page.getByRole('tab', { name: 'Active' }).click();
    await expect(allTab).toHaveAttribute('aria-selected', 'false');
  });

  test('search filters tasks by text', async ({ page }) => {
    const searchInput = page.getByLabel('Search tasks');
    await searchInput.fill('milk');
    // Wait for debounce
    await page.waitForTimeout(200);

    await expect(page.getByText('Buy milk')).toBeVisible();
    await expect(page.getByText('Walk the dog')).not.toBeVisible();
    await expect(page.getByText('Write code')).not.toBeVisible();
  });

  test('clear search restores all tasks', async ({ page }) => {
    const searchInput = page.getByLabel('Search tasks');
    await searchInput.fill('milk');
    await page.waitForTimeout(200);

    // Clear by clicking the clear button (✕)
    await page.locator('button[aria-label="Clear search"]').click();

    await expect(page.getByText('Buy milk')).toBeVisible();
    await expect(page.getByText('Walk the dog')).toBeVisible();
    await expect(page.getByText('Write code')).toBeVisible();
  });

  test('search respects active filter', async ({ page }) => {
    // Switch to Active filter
    await page.getByRole('tab', { name: 'Active' }).click();

    const searchInput = page.getByLabel('Search tasks');
    await searchInput.fill('milk');
    await page.waitForTimeout(200);

    // milk is completed, so shouldn't show under Active filter
    await expect(page.getByText('Buy milk')).not.toBeVisible();
  });

  test('no search results shows empty state', async ({ page }) => {
    const searchInput = page.getByLabel('Search tasks');
    await searchInput.fill('zzz_nonexistent');
    await page.waitForTimeout(200);

    await expect(page.getByText(/No tasks match/)).toBeVisible();
  });

  test('sort dropdown changes task order', async ({ page }) => {
    // To test sort, we need tasks with due dates — this will be more meaningful in Phase 3
    // For now, verify the sort dropdown exists and is functional
    const sortSelect = page.getByLabel('Sort tasks');
    await expect(sortSelect).toBeVisible();
    await sortSelect.selectOption('dueDateAsc');
    await expect(sortSelect).toHaveValue('dueDateAsc');
  });

  test('due this week toggle is present', async ({ page }) => {
    const toggle = page.getByRole('button', { name: 'Due this week' });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  });
});
