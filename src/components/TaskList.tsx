import { useRef } from 'preact/hooks';
import TaskItem from './TaskItem';
import type { Todo } from '@/db/types';
import styles from './TaskList.module.css';

interface TaskListProps {
  todos: Todo[];
}

export function TaskList({ todos }: TaskListProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const totalCount = todos.length;

  const handleFocusAfterDelete = (deletedId: number) => {
    // Find the index of the deleted todo within the current array
    // (which has not yet been updated by the store)
    const deletedIndex = todos.findIndex((t) => t.id === deletedId);
    if (deletedIndex === -1) return;

    const newLength = todos.length - 1;
    if (newLength <= 0) return;

    // If there is a task at the same index position (shifted up), focus it;
    // otherwise focus the previous task (deleted was the last item).
    const targetIndex = Math.min(deletedIndex, newLength - 1);

    // Wait for the DOM to reflect the updated list after re-render
    requestAnimationFrame(() => {
      const list = listRef.current;
      if (!list) return;
      const target = list.children[targetIndex] as HTMLElement | undefined;
      if (!target) return;
      const checkbox = target.querySelector(
        'input[type="checkbox"]',
      ) as HTMLElement | null;
      checkbox?.focus();
    });
  };

  return (
    <ul role="list" aria-label="Tasks" ref={listRef} class={styles.taskList}>
      {todos.map((todo, index) => (
        <TaskItem
          key={todo.id}
          todo={todo}
          index={index}
          totalCount={totalCount}
          onFocusAfterDelete={handleFocusAfterDelete}
        />
      ))}
    </ul>
  );
}
