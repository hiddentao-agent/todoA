import type { Todo } from '@/db/types';
import { getTodayISO } from '@/utils/date';

/**
 * Generate the export filename: todo-backup-<YYYY-MM-DD>.json
 * The filename is static and date-only — never incorporates user input or task data.
 */
export function getExportFilename(): string {
  return `todo-backup-${getTodayISO()}.json`;
}

/** Serialize todos to a JSON string for export. */
export function serializeTodos(todos: Todo[]): string {
  return JSON.stringify(todos, null, 2);
}

/** Trigger a browser download of a JSON file. */
export function downloadJson(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
