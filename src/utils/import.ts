import type { Todo } from '@/db/types';
import { isValidDateString } from '@/utils/date';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_ITEM_COUNT = 50_000;
const MAX_TEXT_LENGTH = 1_000;
const HTML_TAG_RE = /<[a-zA-Z]/;
const HTML_ENTITY_RE = /&[#a-zA-Z]/;

/** Keys to strip for prototype pollution prevention. */
const POLLUTION_KEYS = ['__proto__', 'constructor', 'prototype'];

export interface ImportError {
  message: string;
}

export interface ImportSuccess {
  todos: Todo[];
}

/**
 * Strip prototype-pollution keys recursively from parsed JSON.
 * Returns a new clean copy — does not mutate the input.
 * Must run before any other processing.
 */
function stripPollution(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map(stripPollution);
  }
  const clean: Record<string, unknown> = {};
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    if ((POLLUTION_KEYS as readonly string[]).includes(key)) continue;
    clean[key] = stripPollution((obj as Record<string, unknown>)[key]);
  }
  return clean;
}

/**
 * Validate and sanitize imported data.
 * Returns ImportSuccess with sanitized todos, or ImportError on failure.
 * All checks run before touching existing data.
 */
export function processImportFile(rawText: string): ImportSuccess | ImportError {
  // Gate 2: Parse JSON
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { message: 'Invalid JSON file.' };
  }

  // Gate 3: Prototype pollution prevention
  parsed = stripPollution(parsed);

  // Gate 4: Must be an array
  if (!Array.isArray(parsed)) {
    return { message: 'Invalid format. Expected an array of tasks.' };
  }

  // Gate 5: Item count cap
  if (parsed.length > MAX_ITEM_COUNT) {
    return {
      message: `Too many tasks. Maximum is ${MAX_ITEM_COUNT.toLocaleString()} per import.`,
    };
  }

  const todos: Todo[] = [];

  // Gate 6: Field validation per item
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    if (item === null || typeof item !== 'object') {
      return { message: `Item ${i + 1}: expected an object.` };
    }

    const record = item as Record<string, unknown>;

    // Validate text
    const text = record.text;
    if (typeof text !== 'string') {
      return { message: `Item ${i + 1}: "text" is required and must be a string.` };
    }
    const trimmed = text.trim();
    if (trimmed.length === 0) {
      return { message: `Item ${i + 1}: "text" must not be empty.` };
    }
    if (trimmed.length > MAX_TEXT_LENGTH) {
      return {
        message: `Item ${i + 1}: Task text too long (max ${MAX_TEXT_LENGTH} characters).`,
      };
    }
    // Reject HTML/entity injection
    if (HTML_TAG_RE.test(trimmed) || HTML_ENTITY_RE.test(trimmed)) {
      return {
        message: `Item ${i + 1}: task text may not contain HTML or entities.`,
      };
    }

    // Validate completed — handle string "true"/"false" explicitly so
    // Boolean("false") doesn't coerce to true.
    const completed =
      typeof record.completed === 'boolean'
        ? record.completed
        : record.completed === 'true'
          ? true
          : record.completed === 'false'
            ? false
            : false;

    // Validate order
    let order: number;
    if (typeof record.order === 'number' && isFinite(record.order)) {
      order = record.order;
    } else {
      order = (i + 1) * 1000;
    }

    // Validate dueDate
    let dueDate: string | null = null;
    if (record.dueDate !== undefined && record.dueDate !== null) {
      if (typeof record.dueDate === 'string' && isValidDateString(record.dueDate)) {
        dueDate = record.dueDate;
      }
      // Invalid date → set to null silently
    }

    // Validate createdAt
    let createdAt: number;
    if (typeof record.createdAt === 'number' && isFinite(record.createdAt)) {
      createdAt = record.createdAt;
    } else {
      createdAt = Date.now();
    }

    todos.push({
      text: trimmed,
      completed,
      order,
      dueDate,
      createdAt,
    });
  }

  return { todos };
}

/** Validate file size before reading. */
export function validateFileSize(file: File): ImportError | null {
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = MAX_FILE_SIZE / (1024 * 1024);
    return { message: `File too large. Maximum size is ${sizeMB} MB.` };
  }
  return null;
}
