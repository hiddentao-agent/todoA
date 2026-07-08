import { describe, it, expect, beforeEach } from 'vitest';
import { buildSearchIndex, search } from '@/search';
import type { Todo } from '@/db/types';

function mkTodo(id: number, text: string, overrides?: Partial<Todo>): Todo {
  return { id, text, completed: false, order: 1000, dueDate: null, createdAt: 0, ...overrides };
}

// Module-level test (no beforeEach) to cover the !index guard
it('returns empty results when no search index has been built', () => {
  const results = search('test');
  expect(results).toHaveLength(0);
});

describe('search', () => {
  beforeEach(() => {
    buildSearchIndex([]);
  });

  it('returns empty results when index is empty', () => {
    const results = search('anything');
    expect(results).toHaveLength(0);
  });

  it('returns empty results for empty query', () => {
    const todos: Todo[] = [mkTodo(1, 'Buy groceries')];
    buildSearchIndex(todos);

    const results = search('');
    expect(results).toHaveLength(0);
  });

  it('returns empty results for whitespace-only query', () => {
    const todos: Todo[] = [mkTodo(1, 'Buy groceries')];
    buildSearchIndex(todos);

    const results = search('   ');
    expect(results).toHaveLength(0);
  });

  it('finds tasks by exact text match', () => {
    const todos: Todo[] = [mkTodo(1, 'Buy groceries'), mkTodo(2, 'Walk the dog', { order: 2000 })];
    buildSearchIndex(todos);

    const results = search('groceries');
    expect(results).toHaveLength(1);
    expect(results[0].ref).toBe('1');
  });

  it('finds tasks using stemming (morphological matching)', () => {
    const todos: Todo[] = [mkTodo(1, 'Running errands')];
    buildSearchIndex(todos);

    // lunr stemmer reduces "running" to "run" so searching "run" finds "running"
    const results = search('run');
    expect(results).toHaveLength(1);
    expect(results[0].ref).toBe('1');
  });

  it('returns multiple matches', () => {
    const todos: Todo[] = [
      mkTodo(1, 'Buy milk'),
      mkTodo(2, 'Buy bread', { order: 2000 }),
      mkTodo(3, 'Walk dog', { order: 3000 }),
    ];
    buildSearchIndex(todos);

    const results = search('buy');
    expect(results).toHaveLength(2);
  });

  it('rebuilds index when buildSearchIndex is called again', () => {
    const todos1: Todo[] = [mkTodo(1, 'First set')];
    buildSearchIndex(todos1);

    const todos2: Todo[] = [mkTodo(2, 'Second set')];
    buildSearchIndex(todos2);

    const results = search('First');
    expect(results).toHaveLength(0);

    const results2 = search('Second');
    expect(results2).toHaveLength(1);
  });

  it('is case insensitive', () => {
    const todos: Todo[] = [mkTodo(1, 'GROCERIES')];
    buildSearchIndex(todos);

    const results = search('groceries');
    expect(results).toHaveLength(1);
  });
});
