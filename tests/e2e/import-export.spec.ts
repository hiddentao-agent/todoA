import { test, expect } from '@playwright/test';

/** Encode a string as bytes for Playwright's setFiles FilePayload. */
function strToPayload(name: string, content: string, mimeType = 'application/json') {
  return {
    name,
    mimeType,
    // Playwright's FilePayload.buffer is typed as Buffer, but Uint8Array works at runtime.
    buffer: new TextEncoder().encode(content) as unknown as Buffer,
  };
}

test.describe('Import & Export', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => indexedDB.deleteDatabase('TodoApp'));
    await page.reload();
  });

  test('export downloads a file with correct naming pattern', async ({ page }) => {
    const input = page.getByLabel('New task description');
    await input.fill('Export test task');
    await input.press('Enter');

    await page.getByLabel('Settings').click();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'Export' }).click();

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^todo-backup-\d{4}-\d{2}-\d{2}\.json$/);
  });

  test('import of valid JSON replaces current tasks', async ({ page }) => {
    const input = page.getByLabel('New task description');
    await input.fill('Old task');
    await input.press('Enter');
    await expect(page.getByText('Old task')).toBeVisible();

    const importData = JSON.stringify([
      { text: 'Imported task 1', completed: false, order: 1000, dueDate: null, createdAt: Date.now() },
      { text: 'Imported task 2', completed: true, order: 2000, dueDate: null, createdAt: Date.now() },
    ]);

    page.on('dialog', (dialog) => {
      expect(dialog.message()).toContain('replace your 1 current task');
      dialog.accept();
    });

    await page.getByLabel('Settings').click();

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('menuitem', { name: 'Import' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(strToPayload('backup.json', importData));

    await expect(page.getByText('Imported task 1')).toBeVisible();
    await expect(page.getByText('Imported task 2')).toBeVisible();
    await expect(page.getByText('Old task')).not.toBeVisible();
    await expect(page.getByText(/Imported 2 tasks/)).toBeVisible();
  });

  test('import of malformed JSON shows error', async ({ page }) => {
    await page.getByLabel('Settings').click();

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('menuitem', { name: 'Import' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(strToPayload('bad.json', '{ not valid json }'));

    await expect(page.getByText('Invalid JSON file.')).toBeVisible();
    await expect(page.getByText('No tasks yet')).toBeVisible();
  });

  test('import of file with HTML in task text is rejected', async ({ page }) => {
    const importData = JSON.stringify([
      { text: '<script>alert("xss")</script>', completed: false, order: 1000, dueDate: null, createdAt: Date.now() },
    ]);

    await page.getByLabel('Settings').click();

    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByRole('menuitem', { name: 'Import' }).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles(strToPayload('malicious.json', importData));

    await expect(page.getByText(/may not contain HTML/)).toBeVisible();
    await expect(page.getByText('No tasks yet')).toBeVisible();
  });

  test('export produces parseable JSON', async ({ page }) => {
    const input = page.getByLabel('New task description');
    await input.fill('Task Alpha');
    await input.press('Enter');
    await input.fill('Task Beta');
    await input.press('Enter');

    // Complete the second task
    await page.getByLabel("Mark 'Task Beta' complete").click();

    // Export
    await page.getByLabel('Settings').click();
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: 'Export' }).click();
    const download = await downloadPromise;

    // Read the download content via a new page that loads it
    // Playwright downloads provide a stream; we verify by reading it as text
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk as Buffer);
    }
    const exportedText = Buffer.concat(chunks).toString('utf-8');
    const data = JSON.parse(exportedText);

    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBe(2);
    const beta = data.find((t: { text: string }) => t.text === 'Task Beta');
    expect(beta.completed).toBe(true);
  });
});
