import lunr from 'lunr';
import type { Todo } from '@/db/types';

let index: lunr.Index | null = null;

/** Rebuild the lunr search index from an array of todos. */
export function buildSearchIndex(todos: Todo[]): void {
  index = lunr(function () {
    this.ref('id');
    this.field('text');

    for (const todo of todos) {
      if (todo.id !== undefined) {
        this.add({
          id: todo.id.toString(),
          text: todo.text,
        });
      }
    }
  });
}

/** Search the index. Returns an array of { ref, score } objects. */
export function search(query: string): Array<{ ref: string; score: number }> {
  if (!index) return [];
  const trimmed = query.trim();
  if (!trimmed) return [];

  // Search without wildcards — lunr's stemmer handles morphological
  // variants (e.g. "running" matches "run"), which satisfies the PRD's
  // fuzzy-match requirement. Wildcards are incompatible with the stemmer
  // because the stemmer does not preserve the wildcard operator.
  const results = index.search(trimmed);
  return results.map((r) => ({ ref: r.ref, score: r.score }));
}
