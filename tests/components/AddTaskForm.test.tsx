import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/preact';
import { AddTaskForm } from '@/components/AddTaskForm';

const mockAddTodo = vi.fn().mockResolvedValue(undefined);
let mockImporting = false;

vi.mock('@/store', () => ({
  useTodoStore: (selector?: (state: Record<string, unknown>) => unknown) => {
    const state = {
      importing: mockImporting,
      addTodo: mockAddTodo,
    };
    return selector ? selector(state) : state;
  },
}));

describe('AddTaskForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockImporting = false;
  });

  function getForm() {
    return document.querySelector('form')!;
  }

  function getInput() {
    return screen.getByLabelText('New task description') as HTMLInputElement;
  }

  it('renders input and Add button', () => {
    render(<AddTaskForm />);
    expect(screen.getByLabelText('New task description')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add' })).toBeInTheDocument();
  });

  it('calls addTodo on form submit via Enter', () => {
    render(<AddTaskForm />);
    const input = getInput();
    fireEvent.input(input, { target: { value: 'Buy milk' } });
    fireEvent.submit(getForm());
    expect(mockAddTodo).toHaveBeenCalledWith('Buy milk');
  });

  it('calls addTodo on Add button click', () => {
    render(<AddTaskForm />);
    const input = getInput();
    fireEvent.input(input, { target: { value: 'Buy milk' } });
    fireEvent.click(screen.getByRole('button', { name: 'Add' }));
    expect(mockAddTodo).toHaveBeenCalledWith('Buy milk');
  });

  it('shows validation error for empty input', () => {
    render(<AddTaskForm />);
    const input = getInput();
    fireEvent.input(input, { target: { value: '   ' } });
    fireEvent.submit(getForm());
    // Error appears inside a <small> element with role="alert"
    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a task description.');
    expect(mockAddTodo).not.toHaveBeenCalled();
  });

  it('shows validation error for text over 1000 chars', () => {
    render(<AddTaskForm />);
    const input = getInput();
    fireEvent.input(input, { target: { value: 'a'.repeat(1001) } });
    fireEvent.submit(getForm());
    expect(screen.getByRole('alert')).toHaveTextContent(/1000/);
    expect(mockAddTodo).not.toHaveBeenCalled();
  });

  it('clears input after successful add', async () => {
    render(<AddTaskForm />);
    const input = getInput();
    fireEvent.input(input, { target: { value: 'Buy milk' } });
    fireEvent.submit(getForm());
    // Wait for the async addTodo to resolve and setText('') to propagate
    await vi.waitFor(() => {
      expect(input.value).toBe('');
    });
  });

  it('disables during import', () => {
    mockImporting = true;
    render(<AddTaskForm />);
    expect(screen.getByLabelText('New task description')).toBeDisabled();
  });
});
