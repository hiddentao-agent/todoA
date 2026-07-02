/** Canonical Todo entity — single source of truth. */
export interface Todo {
  /** Auto-incremented primary key (assigned by Dexie). */
  id?: number;
  /** Task description, max 1,000 characters. */
  text: string;
  /** Completion state. */
  completed: boolean;
  /** Manual sort position (float for fractional indexing). */
  order: number;
  /** ISO date "YYYY-MM-DD" or null when no due date is set. */
  dueDate: string | null;
  /** Unix timestamp in milliseconds. */
  createdAt: number;
}
