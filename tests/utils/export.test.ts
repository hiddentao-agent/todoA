import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getExportFilename, serializeTodos, downloadJson } from '@/utils/export';

describe('export utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getExportFilename', () => {
    it('returns a filename with date and .json extension', () => {
      const filename = getExportFilename();
      expect(filename).toMatch(/^todo-backup-\d{4}-\d{2}-\d{2}\.json$/);
    });

    it('includes today date', () => {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const filename = getExportFilename();
      expect(filename).toBe(`todo-backup-${yyyy}-${mm}-${dd}.json`);
    });
  });

  describe('serializeTodos', () => {
    it('serializes todos to JSON string', () => {
      const todos = [
        { id: 1, text: 'Task 1', completed: false, order: 1000, dueDate: null, createdAt: 1000 },
      ];
      const result = serializeTodos(todos);
      const parsed = JSON.parse(result);
      expect(parsed).toEqual(todos);
    });

    it('handles empty array', () => {
      const result = serializeTodos([]);
      expect(result).toBe('[]');
    });

    it('includes all todo fields', () => {
      const todos = [
        {
          id: 1,
          text: 'Task with due date',
          completed: true,
          order: 2000,
          dueDate: '2026-07-15',
          createdAt: 2000,
        },
      ];
      const result = serializeTodos(todos);
      const parsed = JSON.parse(result);
      expect(parsed[0]).toHaveProperty('id', 1);
      expect(parsed[0]).toHaveProperty('text', 'Task with due date');
      expect(parsed[0]).toHaveProperty('completed', true);
      expect(parsed[0]).toHaveProperty('dueDate', '2026-07-15');
    });
  });

  describe('downloadJson', () => {
    beforeEach(() => {
      // Mock URL.createObjectURL and URL.revokeObjectURL
      URL.createObjectURL = vi.fn(() => 'blob:mock');
      URL.revokeObjectURL = vi.fn();
    });

    it('creates a blob and triggers download', () => {
      const appendChild = vi.fn();
      const removeChild = vi.fn();
      const click = vi.fn();

      const link = {
        href: '',
        download: '',
        click,
      } as unknown as HTMLAnchorElement;

      document.body.appendChild = appendChild;
      document.body.removeChild = removeChild;
      vi.spyOn(document, 'createElement').mockReturnValue(link);

      downloadJson('test.json', '[{"id":1}]');

      expect(URL.createObjectURL).toHaveBeenCalled();
      expect(link.download).toBe('test.json');
      expect(click).toHaveBeenCalled();
      expect(appendChild).toHaveBeenCalledWith(link);
      expect(removeChild).toHaveBeenCalledWith(link);
    });

    it('sets correct MIME type on blob', () => {
      const click = vi.fn();
      const link = { href: '', download: '', click } as unknown as HTMLAnchorElement;

      document.body.appendChild = vi.fn();
      document.body.removeChild = vi.fn();
      vi.spyOn(document, 'createElement').mockReturnValue(link);

      downloadJson('test.json', 'data');

      expect(URL.createObjectURL).toHaveBeenCalled();
      const blob = (URL.createObjectURL as ReturnType<typeof vi.fn>).mock.calls[0][0] as Blob;
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe('application/json');
    });
  });
});
