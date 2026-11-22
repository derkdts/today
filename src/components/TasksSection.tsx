import {useMemo, useState} from 'react';
import {CheckCircle2, Circle, Clock, Plus, Search, Trash2} from 'lucide-react';
import {TaskPriority, TaskStatus, WorkTask} from '../types/workspace';

interface TasksSectionProps {
  tasks: WorkTask[];
  compact: boolean;
  confirmBeforeDelete: boolean;
  onChange: (next: WorkTask[]) => void;
}

const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: 'К выполнению',
  in_progress: 'В работе',
  done: 'Готово',
};

const PRIORITY_LABELS: Record<TaskPriority, string> = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
};

const PRIORITY_TEXT_CLASS: Record<TaskPriority, string> = {
  low: 'text-zinc-500 dark:text-zinc-400',
  medium: 'text-amber-600 dark:text-amber-400',
  high: 'text-red-600 dark:text-red-400',
};

export function TasksSection({
  tasks,
  compact,
  confirmBeforeDelete,
  onChange,
}: TasksSectionProps) {
  const [filter, setFilter] = useState<'all' | TaskStatus>('all');
  const [search, setSearch] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newPriority, setNewPriority] = useState<TaskPriority>('medium');
  const [newDueDate, setNewDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [newCategory, setNewCategory] = useState('Разработка');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const counts = useMemo(() => {
    return {
      all: tasks.length,
      todo: tasks.filter((t) => t.status === 'todo').length,
      in_progress: tasks.filter((t) => t.status === 'in_progress').length,
      done: tasks.filter((t) => t.status === 'done').length,
    };
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const q = search.trim().toLowerCase();
    const priorityRank: Record<TaskPriority, number> = {high: 0, medium: 1, low: 2};
    const statusRank: Record<TaskStatus, number> = {in_progress: 0, todo: 1, done: 2};

    return [...tasks]
      .filter((t) => {
        if (filter !== 'all' && t.status !== filter) return false;
        if (!q) return true;
        return (
          t.title.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
        );
      })
      .sort(
        (a, b) =>
          statusRank[a.status] - statusRank[b.status] ||
          priorityRank[a.priority] - priorityRank[b.priority],
      );
  }, [tasks, filter, search]);

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    const next: WorkTask = {
      id: `tsk-${Date.now()}`,
      title: trimmed,
      status: 'todo',
      priority: newPriority,
      dueDate: newDueDate,
      category: newCategory.trim() || 'Работа',
      createdAt: new Date().toISOString().slice(0, 10),
    };
    onChange([next, ...tasks]);
    setNewTitle('');
  };

  const cycleStatus = (id: string) => {
    const order: TaskStatus[] = ['todo', 'in_progress', 'done'];
    onChange(
      tasks.map((t) => {
        if (t.id !== id) return t;
        const idx = order.indexOf(t.status);
        return {...t, status: order[(idx + 1) % order.length]};
      }),
    );
  };

  const setStatus = (id: string, status: TaskStatus) => {
    onChange(tasks.map((t) => (t.id === id ? {...t, status} : t)));
  };

  const deleteTask = (id: string) => {
    if (confirmBeforeDelete && pendingDeleteId !== id) {
      setPendingDeleteId(id);
      return;
    }
    onChange(tasks.filter((t) => t.id !== id));
    setPendingDeleteId(null);
  };

  const clearCompleted = () => {
    onChange(tasks.filter((t) => t.status !== 'done'));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Рабочие задачи
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Планирование спринтов, приоритетов и текущих поручений
          </p>
        </div>
        {counts.done > 0 && (
          <button
            type="button"
            onClick={clearCompleted}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0"
          >
            Очистить выполненные ({counts.done})
          </button>
        )}
      </div>

      {/* Quick Add Task Bar */}
      <form
        onSubmit={addTask}
        className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Добавить новую задачу..."
            className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
          />

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="Категория"
              aria-label="Категория задачи"
              className="w-32 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-800 focus:border-blue-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
            />

            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value as TaskPriority)}
              aria-label="Приоритет"
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-800 focus:border-blue-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
            >
              <option value="low">Приоритет: Низкий</option>
              <option value="medium">Приоритет: Средний</option>
              <option value="high">Приоритет: Высокий</option>
            </select>

            <input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              aria-label="Срок выполнения"
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-800 focus:border-blue-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
            />

            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              Добавить
            </button>
          </div>
        </div>
      </form>

      {/* Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
          {(
            [
              {id: 'all', label: `Все (${counts.all})`},
              {id: 'todo', label: `К выполнению (${counts.todo})`},
              {id: 'in_progress', label: `В работе (${counts.in_progress})`},
              {id: 'done', label: `Готово (${counts.done})`},
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(tab.id)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium tabular-nums transition-colors whitespace-nowrap shrink-0 ${
                filter === tab.id
                  ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-50'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по задачам..."
            className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
      </div>

      {/* Tasks Table */}
      {filteredTasks.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Нет задач в выбранной категории
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Добавьте задачу выше или переключите фильтр статуса.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredTasks.map((task) => (
              <div
                key={task.id}
                className={`flex flex-col gap-3 transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 sm:flex-row sm:items-center sm:justify-between ${
                  compact ? 'px-4 py-2.5' : 'px-5 py-3.5'
                }`}
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <button
                    type="button"
                    onClick={() => cycleStatus(task.id)}
                    className="mt-0.5 shrink-0 text-zinc-500 hover:text-blue-600 dark:text-zinc-400 dark:hover:text-blue-400"
                    title="Переключить статус"
                  >
                    {task.status === 'done' ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    ) : task.status === 'in_progress' ? (
                      <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    ) : (
                      <Circle className="h-5 w-5" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm font-medium ${
                        task.status === 'done'
                          ? 'text-zinc-400 line-through dark:text-zinc-500'
                          : 'text-zinc-900 dark:text-zinc-100'
                      }`}
                    >
                      {task.title}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                      <span>{task.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className={`font-medium ${PRIORITY_TEXT_CLASS[task.priority]}`}>
                        {PRIORITY_LABELS[task.priority]} приоритет
                      </span>
                      {task.dueDate && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="tabular-nums">Срок: {task.dueDate}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={task.status}
                    onChange={(e) => setStatus(task.id, e.target.value as TaskStatus)}
                    aria-label="Статус задачи"
                    className="rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs font-medium text-zinc-700 focus:border-blue-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                  >
                    <option value="todo">{STATUS_LABELS.todo}</option>
                    <option value="in_progress">{STATUS_LABELS.in_progress}</option>
                    <option value="done">{STATUS_LABELS.done}</option>
                  </select>

                  {pendingDeleteId === task.id ? (
                    <button
                      type="button"
                      onClick={() => deleteTask(task.id)}
                      className="inline-flex h-8 items-center rounded-lg bg-red-600 px-2.5 text-xs font-medium text-white hover:bg-red-700 whitespace-nowrap shrink-0"
                    >
                      Удалить?
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => deleteTask(task.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                      title="Удалить задачу"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
