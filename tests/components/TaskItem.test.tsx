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
  text: 'Buy milk',
  completed: false,
  order: 1000,
  dueDate: null,
  createdAt: Date.now(),
};

describe('TaskItem', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockImporting = false;
    // Clear sessionStorage between tests — the component uses it for SW mid-edit safety net
    sessionStorage.clear();
  });

  it('renders task text', () => {
    render(<TaskItem todo={baseTodo} index={0} totalCount={1} />);
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
  });

  it('shows strikethrough when completed', () => {
    const completedTodo = { ...baseTodo, completed: true };
    render(<TaskItem todo={completedTodo} index={0} totalCount={1} />);
    const text = screen.getByText('Buy milk');
    expect(text.className).toContain('completed');
  });

  it('has accessible checkbox label', () => {
    render(<TaskItem todo={baseTodo} index={0} totalCount={1} />);
    expect(screen.getByLabelText("Mark 'Buy milk' complete")).toBeInTheDocument();
  });

  it('has accessible delete button label', () => {
    render(<TaskItem todo={baseTodo} index={0} totalCount={1} />);
    expect(screen.getByLabelText("Delete 'Buy milk'")).toBeInTheDocument();
  });

  it('renders single quotes directly in aria-labels', () => {
    const todoWithQuote = { ...baseTodo, text: "Don't forget" };
    render(<TaskItem todo={todoWithQuote} index={0} totalCount={1} />);
    // Preact JSX handles attribute escaping — HTML entities in DOM attributes
    // are not parsed by screen readers, so quotes stay as raw characters.
    expect(screen.getByLabelText("Mark 'Don't forget' complete")).toBeInTheDocument();
  });

  it('calls toggleTodo on checkbox click', () => {
    render(<TaskItem todo={baseTodo} index={0} totalCount={1} />);
    const checkbox = screen.getByLabelText("Mark 'Buy milk' complete");
    fireEvent.click(checkbox);
    expect(mockToggleTodo).toHaveBeenCalledWith(1);
  });

  it('calls deleteTodo on delete button click', () => {
    const onFocusAfterDelete = vi.fn();
    render(
      <TaskItem todo={baseTodo} index={0} totalCount={1} onFocusAfterDelete={onFocusAfterDelete} />,
    );
    const deleteButton = screen.getByLabelText("Delete 'Buy milk'");
    fireEvent.click(deleteButton);
    expect(mockDeleteTodo).toHaveBeenCalledWith(1);
  });

  it('enters edit mode on double-click', () => {
    render(<TaskItem todo={baseTodo} index={0} totalCount={1} />);
    const text = screen.getByText('Buy milk');
    fireEvent.dblClick(text);
    // Should show an input
    expect(screen.getByDisplayValue('Buy milk')).toBeInTheDocument();
  });

  it('disables buttons during import', () => {
    mockImporting = true;

    render(<TaskItem todo={baseTodo} index={0} totalCount={1} />);
    const deleteButton = screen.getByLabelText("Delete 'Buy milk'");
    expect(deleteButton).toBeDisabled();
  });

  // ---- Edit mode ----

  it('saves edit on Enter key press', () => {
    render(<TaskItem todo={baseTodo} index={0} totalCount={1} />);
    fireEvent.dblClick(screen.getByText('Buy milk'));

    const editInput = screen.getByDisplayValue('Buy milk') as HTMLInputElement;
    fireEvent.input(editInput, { target: { value: 'Updated milk' } });
    fireEvent.keyDown(editInput, { key: 'Enter' });

    expect(mockUpdateTodo).toHaveBeenCalledWith(1, { text: 'Updated milk' });
  });

  it('cancels edit on Escape key press', () => {
    render(<TaskItem todo={baseTodo} index={0} totalCount={1} />);
    fireEvent.dblClick(screen.getByText('Buy milk'));

    const editInput = screen.getByDisplayValue('Buy milk') as HTMLInputElement;
    fireEvent.input(editInput, { target: { value: 'Changed' } });
    fireEvent.keyDown(editInput, { key: 'Escape' });

    // Should be back in view mode, showing original text
    expect(screen.getByText('Buy milk')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Changed')).not.toBeInTheDocument();
    expect(mockUpdateTodo).not.toHaveBeenCalled();
  });

  it('saves edit on input blur', () => {
    render(<TaskItem todo={baseTodo} index={0} totalCount={1} />);
    fireEvent.dblClick(screen.getByText('Buy milk'));

    const editInput = screen.getByDisplayValue('Buy milk') as HTMLInputElement;
    fireEvent.input(editInput, { target: { value: 'Blur saved' } });
    fireEvent.blur(editInput);

    expect(mockUpdateTodo).toHaveBeenCalledWith(1, { text: 'Blur saved' });
  });

  it('shows character counter when edit text exceeds 900 characters', () => {
    render(<TaskItem todo={baseTodo} index={0} totalCount={1} />);
    fireEvent.dblClick(screen.getByText('Buy milk'));

    const editInput = screen.getByDisplayValue('Buy milk') as HTMLInputElement;
    const longText = 'a'.repeat(950);
    fireEvent.input(editInput, { target: { value: longText } });

    expect(screen.getByText('950/1000')).toBeInTheDocument();
  });

  // ---- Delete focus management ----

  it('calls onFocusAfterDelete when deleting', () => {
    const onFocusAfterDelete = vi.fn();
    render(
      <TaskItem todo={baseTodo} index={0} totalCount={2} onFocusAfterDelete={onFocusAfterDelete} />,
    );
    const deleteButton = screen.getByLabelText("Delete 'Buy milk'");
    fireEvent.click(deleteButton);
    expect(onFocusAfterDelete).toHaveBeenCalledWith(1);
  });

  // ---- Move up/down ----

  it('calls onMoveUp when move up button is clicked', () => {
    const onMoveUp = vi.fn();
    render(<TaskItem todo={baseTodo} index={1} totalCount={3} onMoveUp={onMoveUp} />);
    const upButton = screen.getByLabelText("Move 'Buy milk' up");
    fireEvent.click(upButton);
    expect(onMoveUp).toHaveBeenCalledWith(1);
  });

  it('calls onMoveDown when move down button is clicked', () => {
    const onMoveDown = vi.fn();
    render(<TaskItem todo={baseTodo} index={1} totalCount={3} onMoveDown={onMoveDown} />);
    const downButton = screen.getByLabelText("Move 'Buy milk' down");
    fireEvent.click(downButton);
    expect(onMoveDown).toHaveBeenCalledWith(1);
  });

  it('disables move up button for first item', () => {
    render(<TaskItem todo={baseTodo} index={0} totalCount={3} />);
    const upButton = screen.getByLabelText("Move 'Buy milk' up");
    expect(upButton).toBeDisabled();
  });

  it('disables move down button for last item', () => {
    render(<TaskItem todo={baseTodo} index={1} totalCount={2} />);
    const downButton = screen.getByLabelText("Move 'Buy milk' down");
    expect(downButton).toBeDisabled();
  });

  // ---- Keyboard navigation ----

  it('toggles todo on Space key press', () => {
    render(<TaskItem todo={baseTodo} index={0} totalCount={1} />);
    const item = screen.getByTestId('task-item-1');
    fireEvent.keyDown(item, { key: ' ' });
    expect(mockToggleTodo).toHaveBeenCalledWith(1);
  });

  it('deletes todo on Delete key press', () => {
    render(<TaskItem todo={baseTodo} index={0} totalCount={1} />);
    const item = screen.getByTestId('task-item-1');
    fireEvent.keyDown(item, { key: 'Delete' });
    expect(mockDeleteTodo).toHaveBeenCalledWith(1);
  });

  it('deletes todo on Backspace key press', () => {
    render(<TaskItem todo={baseTodo} index={0} totalCount={1} />);
    const item = screen.getByTestId('task-item-1');
    fireEvent.keyDown(item, { key: 'Backspace' });
    expect(mockDeleteTodo).toHaveBeenCalledWith(1);
  });

  it('enters edit mode on Enter key press', () => {
    render(<TaskItem todo={baseTodo} index={0} totalCount={1} />);
    const item = screen.getByTestId('task-item-1');
    fireEvent.keyDown(item, { key: 'Enter' });
    expect(screen.getByDisplayValue('Buy milk')).toBeInTheDocument();
  });

  it('does not toggle on Space when editing', () => {
    render(<TaskItem todo={baseTodo} index={0} totalCount={1} />);
    fireEvent.dblClick(screen.getByText('Buy milk'));

    const item = screen.getByTestId('task-item-1');
    fireEvent.keyDown(item, { key: ' ' });
    // Toggle should NOT be called since we're in edit mode
    expect(mockToggleTodo).not.toHaveBeenCalled();
  });

  // ---- Due date ----

  it('renders due date badge when todo has a due date', () => {
    const todoWithDate = {
      ...baseTodo,
      dueDate: '2026-12-25',
    };
    render(<TaskItem todo={todoWithDate} index={0} totalCount={1} />);
    expect(screen.getByText(/Due/)).toBeInTheDocument();
  });

  it('renders overdue badge when due date is past', () => {
    const overdueTodo = {
      ...baseTodo,
      dueDate: '2020-01-01',
    };
    render(<TaskItem todo={overdueTodo} index={0} totalCount={1} />);
    const badge = screen.getByText(/Due/);
    // Should contain the overdue warning icon
    expect(badge.textContent).toContain('⚠');
  });

  it('enters date edit mode on due date badge click', () => {
    const todoWithDate = {
      ...baseTodo,
      dueDate: '2026-12-25',
    };
    render(<TaskItem todo={todoWithDate} index={0} totalCount={1} />);
    const badge = screen.getByLabelText(/Due date: .+\. Click to edit\./);
    fireEvent.click(badge);
    // Date input should be visible
    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    expect(dateInput).toBeInTheDocument();
    expect(dateInput.value).toBe('2026-12-25');
  });

  it('saves date change on date picker change', () => {
    const todoWithDate = {
      ...baseTodo,
      dueDate: '2026-12-25',
    };
    render(<TaskItem todo={todoWithDate} index={0} totalCount={1} />);
    const badge = screen.getByLabelText(/Due date: .+\. Click to edit\./);
    fireEvent.click(badge);

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.change(dateInput, { target: { value: '2026-06-15' } });
    expect(mockUpdateTodo).toHaveBeenCalledWith(1, { dueDate: '2026-06-15' });
  });

  it('clears due date on clear button click', () => {
    const todoWithDate = {
      ...baseTodo,
      dueDate: '2026-12-25',
    };
    render(<TaskItem todo={todoWithDate} index={0} totalCount={1} />);
    const badge = screen.getByLabelText(/Due date: .+\. Click to edit\./);
    fireEvent.click(badge);

    const clearBtn = screen.getByLabelText('Clear due date');
    fireEvent.click(clearBtn);
    expect(mockUpdateTodo).toHaveBeenCalledWith(1, { dueDate: null });
  });

  it('cancels date edit on Escape', () => {
    const todoWithDate = {
      ...baseTodo,
      dueDate: '2026-12-25',
    };
    render(<TaskItem todo={todoWithDate} index={0} totalCount={1} />);
    const badge = screen.getByLabelText(/Due date: .+\. Click to edit\./);
    fireEvent.click(badge);

    const dateInput = document.querySelector('input[type="date"]') as HTMLInputElement;
    fireEvent.keyDown(dateInput, { key: 'Escape' });
    expect(mockUpdateTodo).not.toHaveBeenCalled();
  });

  // ---- Editing is disabled during import ----

  it('does not enter edit mode on double-click during import', () => {
    mockImporting = true;
    render(<TaskItem todo={baseTodo} index={0} totalCount={1} />);
    fireEvent.dblClick(screen.getByText('Buy milk'));
    expect(screen.queryByDisplayValue('Buy milk')).not.toBeInTheDocument();
  });

  it('does not enter date edit mode during import', () => {
    mockImporting = true;
    const todoWithDate = { ...baseTodo, dueDate: '2026-12-25' };
    render(<TaskItem todo={todoWithDate} index={0} totalCount={1} />);
    const badge = screen.getByLabelText(/Due date/);
    fireEvent.click(badge);
    expect(document.querySelector('input[type="date"]')).not.toBeInTheDocument();
  });

  // ---- Edge cases ----

  it('does not call updateTodo when saving unchanged text', () => {
    render(<TaskItem todo={baseTodo} index={0} totalCount={1} />);
    fireEvent.dblClick(screen.getByText('Buy milk'));

    // Save without changing the text
    const editInput = screen.getByDisplayValue('Buy milk') as HTMLInputElement;
    fireEvent.keyDown(editInput, { key: 'Enter' });

    expect(mockUpdateTodo).not.toHaveBeenCalled();
  });

  it('does not call updateTodo when saving empty text', () => {
    render(<TaskItem todo={baseTodo} index={0} totalCount={1} />);
    fireEvent.dblClick(screen.getByText('Buy milk'));

    const editInput = screen.getByDisplayValue('Buy milk') as HTMLInputElement;
    fireEvent.input(editInput, { target: { value: '   ' } });
    fireEvent.keyDown(editInput, { key: 'Enter' });

    expect(mockUpdateTodo).not.toHaveBeenCalled();
  });

  it('returns null for todos without an id', () => {
    const { container } = render(
      <TaskItem
        todo={{ ...baseTodo, id: undefined as unknown as number }}
        index={0}
        totalCount={1}
      />,
    );
    expect(container.innerHTML).toBe('');
  });
});
