import { describe, it, expect } from 'vitest';
import { processImportFile, validateFileSize } from '@/utils/import';

describe('processImportFile', () => {
  it('accepts valid JSON with all required fields', () => {
    const json = JSON.stringify([
      { text: 'Buy milk', completed: false, order: 1000, dueDate: null, createdAt: 1000000 },
      { text: 'Walk dog', completed: true, order: 2000, dueDate: '2026-07-15', createdAt: 2000000 },
    ]);
    const result = processImportFile(json);
    expect('todos' in result).toBe(true);
    if ('todos' in result) {
      expect(result.todos).toHaveLength(2);
      expect(result.todos[0].text).toBe('Buy milk');
      expect(result.todos[1].dueDate).toBe('2026-07-15');
    }
  });

  it('strips __proto__ keys', () => {
    // Use a raw JSON string so __proto__ is an own property after JSON.parse,
    // not a syntactic accessor processed at object-construction time.
    const json =
      '[{"text":"Test","completed":false,"order":0,"createdAt":0,"__proto__":{"isAdmin":true}}]';
    const result = processImportFile(json);
    if ('todos' in result) {
      const todo = result.todos[0] as unknown as Record<string, unknown>;
      // __proto__ key should be stripped as an own property
      expect(Object.prototype.hasOwnProperty.call(todo, '__proto__')).toBe(false);
    }
    // Verify no prototype pollution on Object.prototype
    expect(({} as Record<string, unknown>).isAdmin).toBeUndefined();
  });

  it('strips constructor and prototype keys', () => {
    const json = JSON.stringify([
      {
        text: 'Test',
        completed: false,
        order: 0,
        createdAt: 0,
        constructor: 'evil',
        prototype: { pollute: true },
      },
    ]);
    const result = processImportFile(json);
    if ('todos' in result) {
      const todo = result.todos[0] as unknown as Record<string, unknown>;
      // These keys should be stripped as own properties
      expect(Object.prototype.hasOwnProperty.call(todo, 'constructor')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(todo, 'prototype')).toBe(false);
    }
  });

  it('rejects non-array JSON', () => {
    const result = processImportFile('{"text":"test"}');
    expect('message' in result).toBe(true);
    if ('message' in result) {
      expect(result.message).toContain('Expected an array');
    }
  });

  it('rejects malformed JSON', () => {
    const result = processImportFile('not json at all');
    expect('message' in result).toBe(true);
    if ('message' in result) {
      expect(result.message).toContain('Invalid JSON');
    }
  });

  it('rejects items with HTML tags in text', () => {
    const json = JSON.stringify([
      { text: '<script>alert("xss")</script>', completed: false, order: 0, createdAt: 0 },
    ]);
    const result = processImportFile(json);
    expect('message' in result).toBe(true);
    if ('message' in result) {
      expect(result.message).toContain('HTML');
    }
  });

  it('rejects items with HTML entities in text', () => {
    const json = JSON.stringify([
      { text: 'Safe &lt;script&gt;', completed: false, order: 0, createdAt: 0 },
    ]);
    const result = processImportFile(json);
    expect('message' in result).toBe(true);
    if ('message' in result) {
      expect(result.message).toContain('HTML');
    }
  });

  it('rejects empty text', () => {
    const json = JSON.stringify([{ text: '   ', completed: false, order: 0, createdAt: 0 }]);
    const result = processImportFile(json);
    expect('message' in result).toBe(true);
  });

  it('rejects text over 1000 chars', () => {
    const json = JSON.stringify([
      { text: 'a'.repeat(1001), completed: false, order: 0, createdAt: 0 },
    ]);
    const result = processImportFile(json);
    expect('message' in result).toBe(true);
    if ('message' in result) {
      expect(result.message).toContain('too long');
    }
  });

  it('rejects item count over 50,000', () => {
    const items = Array.from({ length: 50001 }, (_, i) => ({
      text: `Task ${i}`,
      completed: false,
      order: i,
      createdAt: 0,
    }));
    const result = processImportFile(JSON.stringify(items));
    expect('message' in result).toBe(true);
    if ('message' in result) {
      expect(result.message).toContain('50,000');
    }
  });

  it('applies defaults for missing optional fields', () => {
    const json = JSON.stringify([{ text: 'Only text', completed: false, order: 1000 }]);
    const result = processImportFile(json);
    if ('todos' in result) {
      expect(result.todos[0].dueDate).toBeNull();
      expect(result.todos[0].createdAt).toBeGreaterThan(0);
    }
  });

  it('sets invalid dueDate to null', () => {
    const json = JSON.stringify([
      { text: 'Test', completed: false, order: 0, createdAt: 0, dueDate: 'invalid' },
    ]);
    const result = processImportFile(json);
    if ('todos' in result) {
      expect(result.todos[0].dueDate).toBeNull();
    }
  });

  it('silently drops unknown fields', () => {
    const json = JSON.stringify([
      { text: 'Test', completed: false, order: 0, createdAt: 0, extraField: 'should be dropped' },
    ]);
    const result = processImportFile(json);
    if ('todos' in result) {
      expect((result.todos[0] as unknown as Record<string, unknown>).extraField).toBeUndefined();
    }
  });

  it('accepts empty array', () => {
    const result = processImportFile('[]');
    if ('todos' in result) {
      expect(result.todos).toHaveLength(0);
    }
  });

  it('coerces truthy/falsy completed', () => {
    const json = JSON.stringify([
      { text: 'A', completed: 1, order: 0, createdAt: 0 },
      { text: 'B', completed: 0, order: 1000, createdAt: 0 },
    ]);
    const result = processImportFile(json);
    if ('todos' in result) {
      expect(result.todos[0].completed).toBe(true);
      expect(result.todos[1].completed).toBe(false);
    }
  });

  it('coerces string "true"/"false" completed correctly', () => {
    const json = JSON.stringify([
      { text: 'A', completed: 'true', order: 0, createdAt: 0 },
      { text: 'B', completed: 'false', order: 1000, createdAt: 0 },
    ]);
    const result = processImportFile(json);
    if ('todos' in result) {
      expect(result.todos[0].completed).toBe(true);
      expect(result.todos[1].completed).toBe(false);
    }
  });

  it('uses sequential order when order is missing', () => {
    const json = JSON.stringify([
      { text: 'A', completed: false, createdAt: 0 },
      { text: 'B', completed: false, createdAt: 0 },
    ]);
    const result = processImportFile(json);
    if ('todos' in result) {
      expect(result.todos[0].order).toBe(1000);
      expect(result.todos[1].order).toBe(2000);
    }
  });
});

describe('validateFileSize', () => {
  it('rejects files over 5 MB', () => {
    const result = validateFileSize({ size: 6 * 1024 * 1024 } as File);
    expect(result).not.toBeNull();
    if (result) {
      expect(result.message).toContain('5 MB');
    }
  });

  it('accepts files under 5 MB', () => {
    const result = validateFileSize({ size: 1024 } as File);
    expect(result).toBeNull();
  });
});
