import {useMemo, useState} from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Pencil,
  Pin,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {WorkLink} from '../types/workspace';
import {openExternalUrl} from '../lib/tauriBridge';

interface LinksSectionProps {
  links: WorkLink[];
  compact: boolean;
  confirmBeforeDelete: boolean;
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
  onChange: (next: WorkLink[]) => void;
}

const DEFAULT_CATEGORIES = ['Все', 'Основные'];

export function LinksSection({
  links,
  compact,
  confirmBeforeDelete,
  copiedId,
  onCopy,
  onChange,
}: LinksSectionProps) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Все');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [category, setCategory] = useState('Основные');
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');

  const categories = useMemo(() => {
    const custom = Array.from(new Set(links.map((l) => l.category).filter(Boolean)));
    const merged = new Set([...DEFAULT_CATEGORIES, ...custom]);
    return Array.from(merged);
  }, [links]);

  const filteredLinks = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...links]
      .filter((item) => {
        if (selectedCategory !== 'Все' && item.category !== selectedCategory) return false;
        if (!q) return true;
        return (
          item.title.toLowerCase().includes(q) ||
          item.url.toLowerCase().includes(q) ||
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => Number(b.pinned) - Number(a.pinned));
  }, [links, search, selectedCategory]);

  const openNewForm = () => {
    setEditingId(null);
    setTitle('');
    setUrl('');
    setCategory(selectedCategory !== 'Все' ? selectedCategory : 'Основные');
    setDescription('');
    setFormError('');
    setIsFormOpen(true);
  };

  const openEditForm = (item: WorkLink) => {
    setEditingId(item.id);
    setTitle(item.title);
    setUrl(item.url);
    setCategory(item.category);
    setDescription(item.description);
    setFormError('');
    setIsFormOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = title.trim();
    let trimmedUrl = url.trim();
    if (!trimmedTitle) {
      setFormError('Укажите название ссылки');
      return;
    }
    if (!trimmedUrl) {
      setFormError('Укажите URL');
      return;
    }
    if (!/^https?:\/\//i.test(trimmedUrl)) {
      trimmedUrl = `https://${trimmedUrl}`;
    }
    try {
      const parsed = new URL(trimmedUrl);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        setFormError('Поддерживаются только http:// и https:// адреса');
        return;
      }
      trimmedUrl = parsed.toString();
    } catch {
      setFormError('Некорректный формат URL');
      return;
    }

    if (editingId) {
      onChange(
        links.map((l) =>
          l.id === editingId
            ? {
                ...l,
                title: trimmedTitle,
                url: trimmedUrl,
                category: category.trim() || 'Сервисы',
                description: description.trim(),
              }
            : l,
        ),
      );
    } else {
      const today = new Date().toISOString().slice(0, 10);
      const next: WorkLink = {
        id: `lnk-${Date.now()}`,
        title: trimmedTitle,
        url: trimmedUrl,
        category: category.trim() || 'Сервисы',
        description: description.trim(),
        pinned: false,
        createdAt: today,
      };
      onChange([next, ...links]);
    }
    setIsFormOpen(false);
  };

  const togglePin = (id: string) => {
    onChange(links.map((l) => (l.id === id ? {...l, pinned: !l.pinned} : l)));
  };

  const handleDelete = (id: string) => {
    if (confirmBeforeDelete && pendingDeleteId !== id) {
      setPendingDeleteId(id);
      return;
    }
    onChange(links.filter((l) => l.id !== id));
    setPendingDeleteId(null);
  };

  const getDomain = (rawUrl: string) => {
    try {
      return new URL(rawUrl).hostname.replace(/^www\./, '');
    } catch {
      return rawUrl;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Рабочие ссылки
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Быстрый доступ к стендам, репозиториям и внутренней документации
          </p>
        </div>
        <button
          type="button"
          onClick={openNewForm}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          Добавить ссылку
        </button>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-zinc-100 p-1 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                selectedCategory === cat
                  ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-50'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="relative w-full lg:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по названию или URL..."
            className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
      </div>

      {/* Add / Edit Form */}
      {isFormOpen && (
        <form
          onSubmit={handleSave}
          className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {editingId ? 'Редактировать ссылку' : 'Новая ссылка'}
            </h2>
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
              aria-label="Закрыть форму"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Название
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Например: Grafana Prod"
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                URL адрес
              </label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://grafana.internal"
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Категория
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                list="link-categories-datalist"
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              />
              <datalist id="link-categories-datalist">
                {DEFAULT_CATEGORIES.filter((c) => c !== 'Все').map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Описание (необязательно)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Краткая пометка по доступу или окружению"
                className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
              />
            </div>
          </div>

          {formError && (
            <p className="mt-3 text-xs font-medium text-red-600 dark:text-red-400">{formError}</p>
          )}

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
            >
              Сохранить
            </button>
          </div>
        </form>
      )}

      {/* Links List / Table */}
      {filteredLinks.length === 0 ? (
        <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Ссылки не найдены
          </p>
          <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
            Измените параметры поиска или добавьте новую рабочую ссылку.
          </p>
          <button
            type="button"
            onClick={openNewForm}
            className="mt-4 inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            <Plus className="h-3.5 w-3.5" />
            Добавить первую ссылку
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800">
            {filteredLinks.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col gap-3 transition-colors hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 sm:flex-row sm:items-center sm:justify-between ${
                  compact ? 'px-4 py-2.5' : 'px-5 py-4'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openExternalUrl(item.url)}
                      className="truncate text-left text-sm font-semibold text-zinc-900 hover:text-blue-600 dark:text-zinc-100 dark:hover:text-blue-400"
                    >
                      {item.title}
                    </button>
                    {item.pinned && (
                      <span className="text-xs font-medium text-blue-600 dark:text-blue-400 whitespace-nowrap shrink-0">
                        · Закреплено
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                    <span className="font-mono">{getDomain(item.url)}</span>
                    <span aria-hidden="true">·</span>
                    <span>{item.category}</span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{item.createdAt}</span>
                    {item.description && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="truncate max-w-md">{item.description}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openExternalUrl(item.url)}
                    className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0"
                    title="Открыть ссылку"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Открыть
                  </button>

                  <button
                    type="button"
                    onClick={() => onCopy(item.url, item.id)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    title="Копировать URL"
                  >
                    {copiedId === item.id ? (
                      <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => togglePin(item.id)}
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                      item.pinned
                        ? 'text-blue-600 bg-blue-50 dark:bg-blue-950/50 dark:text-blue-400'
                        : 'text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800'
                    }`}
                    title={item.pinned ? 'Открепить' : 'Закрепить'}
                  >
                    <Pin className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => openEditForm(item)}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
                    title="Редактировать"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  {pendingDeleteId === item.id ? (
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="inline-flex h-9 items-center rounded-lg bg-red-600 px-2.5 text-xs font-medium text-white hover:bg-red-700 whitespace-nowrap shrink-0"
                    >
                      Удалить?
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                      title="Удалить"
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
