import {useEffect, useMemo, useState} from 'react';
import {Check, Copy, Eye, FileText, Pencil, Pin, Plus, Search, Trash2} from 'lucide-react';
import {WorkNote} from '../types/workspace';

interface NotesSectionProps {
  notes: WorkNote[];
  confirmBeforeDelete: boolean;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onChange: (next: WorkNote[]) => void;
}

function nowTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function NotesSection({
  notes,
  confirmBeforeDelete,
  copiedId,
  onCopy,
  onChange,
}: NotesSectionProps) {
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(notes[0]?.id ?? null);
  const [previewMode, setPreviewMode] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const sortedNotes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...notes]
      .filter((n) => {
        if (!q) return true;
        return (
          n.title.toLowerCase().includes(q) ||
          n.content.toLowerCase().includes(q) ||
          n.folder.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt));
  }, [notes, search]);

  useEffect(() => {
    if (notes.length > 0 && (!activeId || !notes.some((n) => n.id === activeId))) {
      setActiveId(notes[0].id);
    } else if (notes.length === 0) {
      setActiveId(null);
    }
  }, [notes, activeId]);

  const activeNote = useMemo(
    () => notes.find((n) => n.id === activeId) ?? null,
    [notes, activeId],
  );

  const createNote = () => {
    const next: WorkNote = {
      id: `note-${Date.now()}`,
      title: 'Новая заметка',
      content: '',
      folder: 'Общее',
      pinned: false,
      updatedAt: nowTimestamp(),
    };
    onChange([next, ...notes]);
    setActiveId(next.id);
    setPreviewMode(false);
  };

  const updateActive = (patch: Partial<WorkNote>) => {
    if (!activeNote) return;
    onChange(
      notes.map((n) =>
        n.id === activeNote.id ? {...n, ...patch, updatedAt: nowTimestamp()} : n,
      ),
    );
  };

  const deleteNote = (id: string) => {
    if (confirmBeforeDelete && pendingDeleteId !== id) {
      setPendingDeleteId(id);
      return;
    }
    const remaining = notes.filter((n) => n.id !== id);
    onChange(remaining);
    setPendingDeleteId(null);
    if (activeId === id) {
      setActiveId(remaining[0]?.id ?? null);
    }
  };

  const wordCount = activeNote
    ? activeNote.content.trim()
      ? activeNote.content.trim().split(/\s+/).length
      : 0
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Рабочие заметки
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Быстрые черновики, сниппеты, чеклисты и техническая документация
          </p>
        </div>
        <button
          type="button"
          onClick={createNote}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          Новая заметка
        </button>
      </div>

      {notes.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Заметок пока нет
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Создайте первую рабочую заметку для хранения инструкций или команд.
          </p>
          <button
            type="button"
            onClick={createNote}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Создать заметку
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Left Note List */}
          <div className="lg:col-span-4 flex flex-col rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
            <div className="border-b border-zinc-200 p-3 dark:border-zinc-800">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Поиск заметок..."
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
            </div>

            <div className="max-h-[540px] divide-y divide-zinc-200 overflow-y-auto dark:divide-zinc-800">
              {sortedNotes.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
                  По запросу ничего не найдено
                </div>
              ) : (
                sortedNotes.map((note) => {
                  const isActive = note.id === activeId;
                  return (
                    <button
                      key={note.id}
                      type="button"
                      onClick={() => {
                        setActiveId(note.id);
                        setPendingDeleteId(null);
                      }}
                      className={`w-full px-4 py-3 text-left transition-colors ${
                        isActive
                          ? 'bg-blue-50/70 dark:bg-blue-950/30'
                          : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={`truncate text-sm font-medium ${
                            isActive
                              ? 'text-blue-700 dark:text-blue-400'
                              : 'text-zinc-900 dark:text-zinc-100'
                          }`}
                        >
                          {note.title || 'Без названия'}
                        </span>
                        {note.pinned && (
                          <Pin className="h-3.5 w-3.5 shrink-0 text-blue-600 dark:text-blue-400" />
                        )}
                      </div>
                      <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span className="truncate">{note.folder}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums shrink-0">{note.updatedAt}</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Editor */}
          <div className="lg:col-span-8 flex flex-col rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
            {activeNote ? (
              <>
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-5 py-3 dark:border-zinc-800">
                  <div className="flex flex-1 min-w-[200px] items-center gap-3">
                    <FileText className="h-4 w-4 shrink-0 text-zinc-400" />
                    <input
                      type="text"
                      value={activeNote.title}
                      onChange={(e) => updateActive({title: e.target.value})}
                      placeholder="Заголовок заметки"
                      className="w-full bg-transparent text-base font-semibold text-zinc-900 focus:outline-none dark:text-zinc-50"
                    />
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <input
                      type="text"
                      value={activeNote.folder}
                      onChange={(e) => updateActive({folder: e.target.value})}
                      placeholder="Папка"
                      aria-label="Папка заметки"
                      className="w-28 rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-1.5 text-xs text-zinc-700 focus:border-blue-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300"
                    />

                    <button
                      type="button"
                      onClick={() => setPreviewMode((v) => !v)}
                      className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        previewMode
                          ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400'
                          : 'border-zinc-200 text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800'
                      }`}
                    >
                      {previewMode ? (
                        <>
                          <Pencil className="h-3.5 w-3.5" />
                          Редактор
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" />
                          Просмотр
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => onCopy(activeNote.content, activeNote.id)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                      title="Копировать текст"
                    >
                      {copiedId === activeNote.id ? (
                        <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => updateActive({pinned: !activeNote.pinned})}
                      className={`inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                        activeNote.pinned
                          ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400'
                          : 'text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800'
                      }`}
                      title={activeNote.pinned ? 'Открепить' : 'Закрепить'}
                    >
                      <Pin className="h-4 w-4" />
                    </button>

                    {pendingDeleteId === activeNote.id ? (
                      <button
                        type="button"
                        onClick={() => deleteNote(activeNote.id)}
                        className="inline-flex h-8 items-center rounded-lg bg-red-600 px-2.5 text-xs font-medium text-white hover:bg-red-700 whitespace-nowrap shrink-0"
                      >
                        Удалить?
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => deleteNote(activeNote.id)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                        title="Удалить заметку"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {previewMode ? (
                  <div className="min-h-[420px] p-5 text-sm leading-relaxed text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap font-sans">
                    {activeNote.content || (
                      <span className="text-zinc-400">Заметка пуста</span>
                    )}
                  </div>
                ) : (
                  <textarea
                    value={activeNote.content}
                    onChange={(e) => updateActive({content: e.target.value})}
                    placeholder="Введите текст заметки, команды или чеклист..."
                    className="min-h-[420px] w-full flex-1 resize-none bg-transparent p-5 font-mono text-sm leading-relaxed text-zinc-800 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-200"
                  />
                )}

                <div className="flex items-center justify-between border-t border-zinc-200 px-5 py-2.5 text-xs text-zinc-500 dark:border-zinc-800 dark:text-zinc-400">
                  <div className="flex items-center gap-2 tabular-nums">
                    <span>{wordCount} слов</span>
                    <span aria-hidden="true">·</span>
                    <span>{activeNote.content.length} символов</span>
                  </div>
                  <span className="tabular-nums">Обновлено: {activeNote.updatedAt}</span>
                </div>
              </>
            ) : (
              <div className="flex min-h-[420px] items-center justify-center p-6 text-sm text-zinc-500 dark:text-zinc-400">
                Выберите заметку из списка слева
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
