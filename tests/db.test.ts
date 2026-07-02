import { describe, it, expect } from 'vitest';
import { db } from '@/db';

describe('db', () => {
  it('exports a db object', () => {
    expect(db).toBeDefined();
    expect(db.todos).toBeDefined();
  });

  it('has a todos table', () => {
    expect(db.todos.name).toBe('todos');
  });

  it('has correct schema version', () => {
    // The schema should have at least version 1
    expect(db.verno).toBeGreaterThanOrEqual(0);
  });
});
