import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/preact';
import { axe } from 'vitest-axe';
import { TaskStats } from '@/components/TaskStats';
import type { Todo } from '@/db/types';

type FakeTodo = Pick<Todo, 'id' | 'text' | 'completed'>;

let mockTodos: FakeTodo[] = [];

vi.mock('@/store', () => ({
  useTodoStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = { todos: mockTodos };
    return selector ? selector(state) : state;
  },
  selectTaskCounts: (state: { todos: FakeTodo[] }) => {
    const total = state.todos.length;
    const active = state.todos.filter((t) => !t.completed).length;
    return { total, active, completed: total - active };
  },
}));

function setTodos(completed: number, active: number) {
  const todos: FakeTodo[] = [];
  for (let i = 0; i < completed; i++) {
    todos.push({ id: i, text: `Done ${i}`, completed: true });
  }
  for (let i = 0; i < active; i++) {
    todos.push({ id: i + completed, text: `Active ${i}`, completed: false });
  }
  mockTodos = todos;
}

describe('TaskStats', () => {
  it('shows "0 items" when total is 0 regardless of filter', async () => {
    setTodos(0, 0);
    const { container } = render(<TaskStats filter="all" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    expect(screen.getByText('0 items')).toBeInTheDocument();
  });

  it('shows active/total for "all" filter', async () => {
    setTodos(2, 3);
    const { container } = render(<TaskStats filter="all" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    expect(screen.getByText('3 of 5 items')).toBeInTheDocument();
  });

  it('shows "All done!" for active filter when all todos are completed and total > 0', async () => {
    setTodos(3, 0);
    const { container } = render(<TaskStats filter="active" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    expect(screen.getByText('All done!')).toBeInTheDocument();
  });

  it('shows remaining count for active filter with plural', async () => {
    setTodos(1, 3);
    const { container } = render(<TaskStats filter="active" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    expect(screen.getByText('3 items left')).toBeInTheDocument();
  });

  it('shows "1 item left" for singular', async () => {
    setTodos(0, 1);
    const { container } = render(<TaskStats filter="active" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    expect(screen.getByText('1 item left')).toBeInTheDocument();
  });

  it('shows completed count for completed filter', async () => {
    setTodos(4, 2);
    const { container } = render(<TaskStats filter="completed" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    expect(screen.getByText('4 completed')).toBeInTheDocument();
  });

  it('has aria-live="polite" and aria-atomic="true"', async () => {
    setTodos(1, 1);
    const { container } = render(<TaskStats filter="all" />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
    const statsEl = screen.getByText('1 of 2 items');
    expect(statsEl).toHaveAttribute('aria-live', 'polite');
    expect(statsEl).toHaveAttribute('aria-atomic', 'true');
  });
});
