import { describe, it, expect } from 'vitest';
import { calculateInsertOrder, getNextOrder } from '@/utils/order';
import type { Todo } from '@/db/types';

function makeTodo(id: number, order: number): Todo {
  return {
    id,
    text: `Task ${id}`,
    completed: false,
    order,
    dueDate: null,
    createdAt: Date.now(),
  };
}

describe('getNextOrder', () => {
  it('returns 1000 for an empty list', () => {
    expect(getNextOrder([])).toBe(1000);
  });

  it('returns max + 1000 for non-empty list', () => {
    const todos = [makeTodo(1, 500), makeTodo(2, 1500)];
    expect(getNextOrder(todos)).toBe(2500);
  });
});

describe('calculateInsertOrder', () => {
  it('returns midpoint between prev and next', () => {
    const prev = makeTodo(1, 1000);
    const next = makeTodo(2, 2000);
    const result = calculateInsertOrder(prev, next, [prev, next]);
    expect(result.order).toBe(1500);
    expect(result.reindexedTodos).toBeUndefined();
  });

  it('inserts before first item', () => {
    const next = makeTodo(1, 1000);
    const result = calculateInsertOrder(undefined, next, [next]);
    expect(result.order).toBe(500);
  });

  it('inserts after last item', () => {
    const prev = makeTodo(1, 1000);
    // When prev=1000 and no next, nextOrder = 1000+1000=2000
    // midpoint = (1000+2000)/2 = 1500
    const result = calculateInsertOrder(prev, undefined, [prev]);
    expect(result.order).toBe(1500);
  });

  it('reindexes when precision is exhausted', () => {
    // Very close orders
    const prev = makeTodo(1, 1000);
    const next = makeTodo(2, 1000.0000000001);
    const result = calculateInsertOrder(prev, next, [prev, next]);
    expect(result.reindexedTodos).toBeDefined();
    expect(result.reindexedTodos).toHaveLength(2);
  });
});
