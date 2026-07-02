import type { Todo } from '@/db/types';

const ORDER_STEP = 1000;
const MIN_ORDER_GAP = 1e-10;

/**
 * Calculate the order value for a task inserted between two adjacent tasks.
 * Uses fractional indexing: (prev.order + next.order) / 2.
 * If precision is exhausted, reindexes the entire list with integer spacing.
 */
export function calculateInsertOrder(
  prev: Todo | undefined,
  next: Todo | undefined,
  allTodos: Todo[],
): { order: number; reindexedTodos?: Todo[] } {
  const prevOrder = prev?.order ?? 0;
  const nextOrder = next?.order ?? (prevOrder + ORDER_STEP);
  const mid = (prevOrder + nextOrder) / 2;

  // If precision is still available, use the midpoint.
  if (mid - prevOrder > MIN_ORDER_GAP && nextOrder - mid > MIN_ORDER_GAP) {
    return { order: mid };
  }

  // Reindex: assign evenly spaced integer orders.
  const reindexedTodos = allTodos.map((t, i) => ({
    ...t,
    order: (i + 1) * ORDER_STEP,
  }));
  const idx = prev ? allTodos.findIndex((t) => t.id === prev.id) + 1 : 0;

  return {
    order: (idx + 1) * ORDER_STEP,
    reindexedTodos,
  };
}

/** Assign a default order for a new task at the end of the list. */
export function getNextOrder(todos: Todo[]): number {
  if (todos.length === 0) return ORDER_STEP;
  const maxOrder = todos.reduce((max, t) => Math.max(max, t.order), 0);
  return maxOrder + ORDER_STEP;
}
