import type { Todo } from '@/db/types';

export const ORDER_STEP = 1000;

/** Assign a default order for a new task at the end of the list. */
export function getNextOrder(todos: Todo[]): number {
  if (todos.length === 0) return ORDER_STEP;
  const maxOrder = todos.reduce((max, t) => Math.max(max, t.order), 0);
  return maxOrder + ORDER_STEP;
}
