import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { TaskList } from '@/components/TaskList';
import type { Todo } from '@/db/types';

// TaskItem uses store, so mock it
const mockToggleTodo = vi.fn().mockResolvedValue(undefined);
const mockDeleteTodo = vi.fn().mockResolvedValue(undefined);
const mockUpdateTodo = vi.fn().mockResolvedValue(undefined);

vi.mock('@/store', () => ({
  useTodoStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      importing: false,
      toggleTodo: mockToggleTodo,
      deleteTodo: mockDeleteTodo,
      updateTodo: mockUpdateTodo,
    };
    return selector ? selector(state) : state;
  },
}));

const baseTodos: Todo[] = [
  { id: 1, text: 'Task one', completed: false, order: 1000, dueDate: null, createdAt: 1000 },
  { id: 2, text: 'Task two', completed: true, order: 1001, dueDate: null, createdAt: 2000 },
  { id: 3, text: 'Task three', completed: false, order: 1002, dueDate: null, createdAt: 3000 },
];

const axeOptions = { rules: { 'nested-interactive': { enabled: false } } };

describe('TaskList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all tasks', async () => {
    const { container } = render(<TaskList todos={baseTodos} />);
    const results = await axe(container, axeOptions);
    expect(results).toHaveNoViolations();
    expect(screen.getByText('Task one')).toBeInTheDocument();
    expect(screen.getByText('Task two')).toBeInTheDocument();
    expect(screen.getByText('Task three')).toBeInTheDocument();
  });

  it('renders an empty list when there are no todos', () => {
    render(<TaskList todos={[]} />);
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('has listbox role and aria-label', async () => {
    const { container } = render(<TaskList todos={baseTodos} />);
    const results = await axe(container, axeOptions);
    expect(results).toHaveNoViolations();
    const listbox = screen.getByRole('listbox', { name: 'Tasks' });
    expect(listbox).toBeInTheDocument();
    expect(listbox.tagName).toBe('UL');
  });

  it('renders tasks in the given order', () => {
    render(<TaskList todos={baseTodos} />);
    const items = screen.getAllByRole('option');
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent('Task one');
    expect(items[1]).toHaveTextContent('Task two');
    expect(items[2]).toHaveTextContent('Task three');
  });

  it('passes onMoveUp and onMoveDown to TaskItem', () => {
    const onMoveUp = vi.fn();
    const onMoveDown = vi.fn();
    render(<TaskList todos={baseTodos} onMoveUp={onMoveUp} onMoveDown={onMoveDown} />);
    // Just verify the list renders without error with move handlers
    expect(screen.getByText('Task one')).toBeInTheDocument();
    expect(screen.getByText('Task three')).toBeInTheDocument();
  });

  describe('handleFocusAfterDelete', () => {
    let rafCalls: FrameRequestCallback[];
    let rafSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      rafCalls = [];
      // Cast through unknown because requestAnimationFrame has overloads that don't
      // match vitest's spy type for overloaded functions.
      rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(((
        cb: FrameRequestCallback,
      ): number => {
        rafCalls.push(cb);
        return rafCalls.length;
      }) as unknown as (...args: unknown[]) => number) as unknown as ReturnType<typeof vi.spyOn>;
    });

    afterEach(() => {
      rafSpy.mockRestore();
    });

    function flushRaf() {
      while (rafCalls.length > 0) {
        rafCalls.shift()!(0);
      }
    }

    it('focuses the next item checkbox when deleting a non-last item', () => {
      const { rerender } = render(<TaskList todos={baseTodos} />);

      // Delete "Task two" (middle item, id=2)
      fireEvent.click(screen.getByLabelText("Delete 'Task two'"));

      // Simulate the state update by re-rendering with remaining items
      const remaining = baseTodos.filter((t) => t.id !== 2);
      rerender(<TaskList todos={remaining} />);

      // Now execute the RAF callback
      flushRaf();

      // deletedIndex=1, newLength=2, targetIndex=min(1,1)=1
      // After re-render: children[0]=T1, children[1]=T3
      expect(document.activeElement).toBe(screen.getByLabelText("Mark 'Task three' complete"));
    });

    it('focuses the previous item checkbox when deleting the last item', () => {
      const { rerender } = render(<TaskList todos={baseTodos} />);

      // Delete "Task three" (last item, id=3)
      fireEvent.click(screen.getByLabelText("Delete 'Task three'"));

      // Re-render with remaining items (T1 and T2, T2 is completed)
      const remaining = baseTodos.filter((t) => t.id !== 3);
      rerender(<TaskList todos={remaining} />);

      flushRaf();

      // deletedIndex=2, newLength=2, targetIndex=min(2,1)=1
      // After re-render: children[0]=T1, children[1]=T2
      // T2 is completed, so its checkbox label is 'Mark ... incomplete'
      expect(document.activeElement).toBe(screen.getByLabelText("Mark 'Task two' incomplete"));
    });

    it('focuses the first item checkbox when deleting the first item', () => {
      const { rerender } = render(<TaskList todos={baseTodos} />);

      // Delete "Task one" (first item, id=1)
      fireEvent.click(screen.getByLabelText("Delete 'Task one'"));

      // Re-render with remaining items (T2 completed, T3)
      const remaining = baseTodos.filter((t) => t.id !== 1);
      rerender(<TaskList todos={remaining} />);

      flushRaf();

      // deletedIndex=0, newLength=2, targetIndex=min(0,1)=0
      // After re-render: children[0]=T2 (completed)
      expect(document.activeElement).toBe(screen.getByLabelText("Mark 'Task two' incomplete"));
    });

    it('does not crash when deleting from a single-item list', () => {
      const singleTodo = [baseTodos[0]];
      render(<TaskList todos={singleTodo} />);

      // Delete the only task
      // newLength=0, so handleFocusAfterDelete returns early before RAF
      expect(() => fireEvent.click(screen.getByLabelText("Delete 'Task one'"))).not.toThrow();
    });
  });
});
