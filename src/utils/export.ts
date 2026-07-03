import type { Todo } from '@/db/types';

/**
 * Generate the export filename: todo-backup-<YYYY-MM-DD>.json
 * The filename is static and date-only — never incorporates user input or task data.
 */
export function getExportFilename(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `todo-backup-${yyyy}-${mm}-${dd}.json`;
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
