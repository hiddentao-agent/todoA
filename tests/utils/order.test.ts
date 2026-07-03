import { describe, it, expect } from 'vitest';
import { getNextOrder } from '@/utils/order';
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
