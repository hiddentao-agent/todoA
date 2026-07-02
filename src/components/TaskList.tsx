import { useRef } from 'preact/hooks';
import TaskItem from './TaskItem';
import type { Todo } from '@/db/types';
import styles from './TaskList.module.css';

interface TaskListProps {
  todos: Todo[];
  onMoveUp?: (id: number) => void;
  onMoveDown?: (id: number) => void;
}

export function TaskList({ todos, onMoveUp, onMoveDown }: TaskListProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const totalCount = todos.length;

  const handleFocusAfterDelete = (deletedId: number) => {
    const deletedIndex = todos.findIndex((t) => t.id === deletedId);
    if (deletedIndex === -1) return;

    const newLength = todos.length - 1;
    if (newLength <= 0) return;

    const targetIndex = Math.min(deletedIndex, newLength - 1);

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
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
        />
      ))}
    </ul>
  );
}
