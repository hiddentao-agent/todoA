import { describe, it, expect, beforeEach } from 'vitest';
import { buildSearchIndex, search } from '@/search';
import type { Todo } from '@/db/types';

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
    const todos: Todo[] = [
      { id: 1, text: 'Buy groceries', completed: false, order: 1000, dueDate: null, createdAt: 0 },
    ];
    buildSearchIndex(todos);

    const results = search('');
    expect(results).toHaveLength(0);
  });

  it('returns empty results for whitespace-only query', () => {
    const todos: Todo[] = [
      { id: 1, text: 'Buy groceries', completed: false, order: 1000, dueDate: null, createdAt: 0 },
    ];
    buildSearchIndex(todos);

    const results = search('   ');
    expect(results).toHaveLength(0);
  });

  it('finds tasks by exact text match', () => {
    const todos: Todo[] = [
      { id: 1, text: 'Buy groceries', completed: false, order: 1000, dueDate: null, createdAt: 0 },
      { id: 2, text: 'Walk the dog', completed: false, order: 2000, dueDate: null, createdAt: 0 },
    ];
    buildSearchIndex(todos);

    const results = search('groceries');
    expect(results).toHaveLength(1);
    expect(results[0].ref).toBe('1');
  });

  it('finds tasks using stemming (morphological matching)', () => {
    const todos: Todo[] = [
      {
        id: 1,
        text: 'Running errands',
        completed: false,
        order: 1000,
        dueDate: null,
        createdAt: 0,
      },
    ];
    buildSearchIndex(todos);

    // lunr stemmer reduces "running" to "run" so searching "run" finds "running"
    const results = search('run');
    expect(results).toHaveLength(1);
    expect(results[0].ref).toBe('1');
  });

  it('returns multiple matches', () => {
    const todos: Todo[] = [
      { id: 1, text: 'Buy milk', completed: false, order: 1000, dueDate: null, createdAt: 0 },
      { id: 2, text: 'Buy bread', completed: false, order: 2000, dueDate: null, createdAt: 0 },
      { id: 3, text: 'Walk dog', completed: false, order: 3000, dueDate: null, createdAt: 0 },
    ];
    buildSearchIndex(todos);

    const results = search('buy');
    expect(results).toHaveLength(2);
  });

  it('rebuilds index when buildSearchIndex is called again', () => {
    const todos1: Todo[] = [
      { id: 1, text: 'First set', completed: false, order: 1000, dueDate: null, createdAt: 0 },
    ];
    buildSearchIndex(todos1);

    const todos2: Todo[] = [
      { id: 2, text: 'Second set', completed: false, order: 1000, dueDate: null, createdAt: 0 },
    ];
    buildSearchIndex(todos2);

    const results = search('First');
    expect(results).toHaveLength(0);

    const results2 = search('Second');
    expect(results2).toHaveLength(1);
  });

  it('is case insensitive', () => {
    const todos: Todo[] = [
      { id: 1, text: 'GROCERIES', completed: false, order: 1000, dueDate: null, createdAt: 0 },
    ];
    buildSearchIndex(todos);

    const results = search('groceries');
    expect(results).toHaveLength(1);
  });
});
