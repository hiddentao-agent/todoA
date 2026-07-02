import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import TaskItem from '@/components/TaskItem';
import type { Todo } from '@/db/types';

// Mock the store
const mockToggleTodo = vi.fn().mockResolvedValue(undefined);
const mockDeleteTodo = vi.fn().mockResolvedValue(undefined);
const mockUpdateTodo = vi.fn().mockResolvedValue(undefined);

let mockImporting = false;

vi.mock('@/store', () => ({
  useTodoStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      importing: mockImporting,
      toggleTodo: mockToggleTodo,
      deleteTodo: mockDeleteTodo,
      updateTodo: mockUpdateTodo,
    };
    return selector ? selector(state) : state;
  },
}));

const baseTodo: Todo = {
  id: 1,
  text: "Buy milk",
  completed: false,
  order: 1000,
  dueDate: null,
  createdAt: Date.now(),
};

describe('TaskItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockImporting = false;
  });

  it('renders task text', () => {
    render(
      <TaskItem todo={baseTodo} index={0} totalCount={1} />,
    );
    expect(screen.getByText("Buy milk")).toBeInTheDocument();
  });

  it('shows strikethrough when completed', () => {
    const completedTodo = { ...baseTodo, completed: true };
    render(
      <TaskItem todo={completedTodo} index={0} totalCount={1} />,
    );
    const text = screen.getByText("Buy milk");
    expect(text.className).toContain('completed');
  });

  it('has accessible checkbox label', () => {
    render(
      <TaskItem todo={baseTodo} index={0} totalCount={1} />,
    );
    expect(screen.getByLabelText("Mark 'Buy milk' complete")).toBeInTheDocument();
  });

  it('has accessible delete button label', () => {
    render(
      <TaskItem todo={baseTodo} index={0} totalCount={1} />,
    );
    expect(screen.getByLabelText("Delete 'Buy milk'")).toBeInTheDocument();
  });

  it('escapes single quotes in aria-labels', () => {
    const todoWithQuote = { ...baseTodo, text: "Don't forget" };
    render(
      <TaskItem todo={todoWithQuote} index={0} totalCount={1} />,
    );
    expect(screen.getByLabelText("Mark 'Don&#39;t forget' complete")).toBeInTheDocument();
  });

  it('calls toggleTodo on checkbox click', () => {
    render(
      <TaskItem todo={baseTodo} index={0} totalCount={1} />,
    );
    const checkbox = screen.getByLabelText("Mark 'Buy milk' complete");
    fireEvent.click(checkbox);
    expect(mockToggleTodo).toHaveBeenCalledWith(1);
  });

  it('calls deleteTodo on delete button click', () => {
    const onFocusAfterDelete = vi.fn();
    render(
      <TaskItem
        todo={baseTodo}
        index={0}
        totalCount={1}
        onFocusAfterDelete={onFocusAfterDelete}
      />,
    );
    const deleteButton = screen.getByLabelText("Delete 'Buy milk'");
    fireEvent.click(deleteButton);
    expect(mockDeleteTodo).toHaveBeenCalledWith(1);
  });

  it('enters edit mode on double-click', () => {
    render(
      <TaskItem todo={baseTodo} index={0} totalCount={1} />,
    );
    const text = screen.getByText("Buy milk");
    fireEvent.dblClick(text);
    // Should show an input
    expect(screen.getByDisplayValue("Buy milk")).toBeInTheDocument();
  });

  it('disables buttons during import', () => {
    mockImporting = true;

    render(
      <TaskItem todo={baseTodo} index={0} totalCount={1} />,
    );
    const deleteButton = screen.getByLabelText("Delete 'Buy milk'");
    expect(deleteButton).toBeDisabled();
  });
});
