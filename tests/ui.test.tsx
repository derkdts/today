import assert from 'node:assert/strict';
import {describe, it} from 'node:test';
import {renderToStaticMarkup} from 'react-dom/server';
import App from '../src/App';
import {Base64Section} from '../src/components/Base64Section';
import {LinksSection} from '../src/components/LinksSection';
import {NotesSection} from '../src/components/NotesSection';
import {OAuthCodesSection} from '../src/components/OAuthCodesSection';
import {PasswordGeneratorSection} from '../src/components/PasswordGeneratorSection';
import {SettingsSection} from '../src/components/SettingsSection';
import {TasksSection} from '../src/components/TasksSection';
import {DEFAULT_WORKSPACE} from '../src/data/defaults';

const noop = () => {};

describe('WorkDesk UI Component Rendering', () => {
  it('renders App shell with all 7 navigation items', () => {
    const html = renderToStaticMarkup(<App />);
    assert.match(html, /WorkDesk/);
    assert.match(html, /Ссылки/);
    assert.match(html, /Заметки/);
    assert.match(html, /Задачи/);
    assert.match(html, /Генератор паролей/);
    assert.match(html, /OAuth \/ 2FA коды/);
    assert.match(html, /Base64/);
    assert.match(html, /Настройки/);
  });

  it('renders LinksSection with populated and empty states', () => {
    const populated = renderToStaticMarkup(
      <LinksSection
        links={DEFAULT_WORKSPACE.links}
        compact={false}
        confirmBeforeDelete={true}
        copiedId={null}
        onCopy={noop}
        onChange={noop}
      />,
    );
    assert.match(populated, /Рабочие ссылки/);
    assert.match(populated, /Tauri v2 Документация/);

    const empty = renderToStaticMarkup(
      <LinksSection
        links={[]}
        compact={false}
        confirmBeforeDelete={true}
        copiedId={null}
        onCopy={noop}
        onChange={noop}
      />,
    );
    assert.match(empty, /Ссылки не найдены/);
  });

  it('renders NotesSection with editor and stats', () => {
    const html = renderToStaticMarkup(
      <NotesSection
        notes={DEFAULT_WORKSPACE.notes}
        confirmBeforeDelete={true}
        copiedId={null}
        onCopy={noop}
        onChange={noop}
      />,
    );
    assert.match(html, /Рабочие заметки/);
    assert.match(html, /Чеклист релиза Tauri v2/);
    assert.match(html, /слов/);
  });

  it('renders TasksSection with status filter counts', () => {
    const html = renderToStaticMarkup(
      <TasksSection
        tasks={DEFAULT_WORKSPACE.tasks}
        compact={false}
        confirmBeforeDelete={true}
        onChange={noop}
      />,
    );
    assert.match(html, /Рабочие задачи/);
    assert.match(html, /Все \(4\)/);
    assert.match(html, /В работе \(1\)/);
  });

  it('renders PasswordGeneratorSection controls', () => {
    const html = renderToStaticMarkup(
      <PasswordGeneratorSection
        copiedId={null}
        onCopy={noop}
        clipboardAutoClearSec={30}
      />,
    );
    assert.match(html, /Генератор паролей/);
    assert.match(html, /Символьный пароль/);
    assert.match(html, /Кодовая фраза/);
    assert.match(html, /Энтропия:/);
  });

  it('renders OAuthCodesSection with TOTP accounts', () => {
    const html = renderToStaticMarkup(
      <OAuthCodesSection
        accounts={DEFAULT_WORKSPACE.totpAccounts}
        confirmBeforeDelete={true}
        copiedId={null}
        onCopy={noop}
        onChange={noop}
      />,
    );
    assert.match(html, /OAuth и 2FA коды/);
    assert.match(html, /GitHub/);
    assert.match(html, /Cloudflare/);
  });

  it('renders Base64Section encode/decode panes', () => {
    const html = renderToStaticMarkup(
      <Base64Section copiedId={null} onCopy={noop} />,
    );
    assert.match(html, /Кодирование и декодирование Base64/);
    assert.match(html, /URL-Safe/);
    assert.match(html, /байт/);
  });

  it('renders SettingsSection with theme, backup, and CI/CD metadata', () => {
    const html = renderToStaticMarkup(
      <SettingsSection
        settings={DEFAULT_WORKSPACE.settings}
        workspace={DEFAULT_WORKSPACE}
        onUpdateSettings={noop}
        onImportWorkspace={noop}
        onResetWorkspace={noop}
      />,
    );
    assert.match(html, /Настройки приложения/);
    assert.match(html, /Экспортировать JSON/);
    assert.match(html, /\.github\/workflows\/build\.yml/);
  });
});
