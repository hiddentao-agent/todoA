import Dexie, { type Table } from 'dexie';
import type { Todo } from './types';

export class TodoDB extends Dexie {
  todos!: Table<Todo, number>;

  constructor() {
    super('TodoApp');
    this.version(1).stores({
      todos: '++id, completed, order, createdAt, dueDate',
    });
  }
}

export const db = new TodoDB();
