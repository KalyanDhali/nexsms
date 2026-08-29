import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import ConversationItem from './ConversationItem.jsx';
import { IconPlus, IconCheck, IconBack, IconTrash, IconInfo, IconRefresh } from '../icons.jsx';

const FILTERS = [
  { key: 'all', en: 'All', zh: '全部' },
  { key: 'unread', en: 'Unread', zh: '未读' },
  { key: 'media', en: 'Media', zh: '媒体' },
  { key: 'favorites', en: 'Favorites', zh: '收藏' },
  { key: 'failed', en: 'Failed', zh: '失败' },
];

export default function ConversationList({ threads, activeId, onSelect, onNew, query = '', hidden, loading = false, error = false, onRetry, onCollapse, isMobile = false, selectable = false, selected = [], onToggleSelect, onSelectMode, onBulkDelete, onCancelSelect, onSelectAll }) {
  const { t, lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);
  const [filter, setFilter] = useState('all');

  const selectedSet = selected instanceof Set ? selected : new Set(selected || []);
  const selectedCount = selectedSet.size;

  const hasFailed = (th) => th.messages?.some((m) => m.direction === 'out' && m.status === 'failed');
  const filtered = threads.filter((th) => {
    if (filter === 'unread') return th.unread > 0;
    if (filter === 'media') return th.hasMedia;
    if (filter === 'favorites') return th.favorite;
    if (filter === 'failed') return hasFailed(th);
    return true;
  });

  return (
    <aside
      className="sidebar-left w-full shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900 min-w-0"
      style={hidden ? { display: 'none' } : undefined}
    >
      <div className="px-3 pt-3 pb-2 space-y-2">
        <div className="flex items-center gap-1.5">
          {!selectable ? (
            <>
              <button
                onClick={onNew}
                className="flex-1 min-w-0 min-h-11 flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-primary to-secondary text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition shadow-sm"
              >
                <IconPlus className="w-4 h-4" strokeWidth={2.5} />
                {T('New message', '新消息')}
              </button>
              {onSelectMode && (
                <button
                  onClick={() => onSelectMode(true)}
                  className="w-11 h-11 shrink-0 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 items-center justify-center transition flex"
                  title={T('Select', '选择')}
                  aria-label={T('Select', '选择')}
                  data-testid="select-mode-btn"
                >
                  <IconCheck className="w-5 h-5" />
                </button>
              )}
              {onCollapse && (
                <button
                  onClick={onCollapse}
                  className="hidden md:flex w-11 h-11 shrink-0 rounded-full text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 items-center justify-center transition"
                  title={T('Collapse list', '折叠列表')}
                  aria-label={T('Collapse list', '折叠列表')}
                >
                  <IconBack className="w-5 h-5" />
                </button>
              )}
            </>
          ) : (
            <>
              <div className="flex-1 min-w-0 px-2 text-sm font-semibold text-slate-700 dark:text-slate-200 truncate" data-testid="select-count">
                {selectedCount > 0
                  ? `${selectedCount} ${T('selected', '已选择')}`
                  : T('Select conversations', '选择对话')}
              </div>
              {onSelectAll && (
                <button
                  onClick={() => {
                    const allSelected = filtered.length > 0 && selectedCount === filtered.length;
                    onSelectAll(allSelected ? [] : filtered.map((t) => t.id));
                  }}
                  disabled={filtered.length === 0}
                  className="min-h-11 px-3 rounded-full text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition disabled:opacity-40 disabled:cursor-not-allowed"
                  title={T('Select all', '全选')}
                  data-testid="select-all-btn"
                >
                  {filtered.length > 0 && selectedCount === filtered.length
                    ? T('Deselect all', '取消全选')
                    : T('Select all', '全选')}
                </button>
              )}
              <button
                onClick={onBulkDelete}
                disabled={selectedCount === 0}
                className="min-h-11 px-3 flex items-center gap-1.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 text-sm font-semibold hover:bg-rose-100 dark:hover:bg-rose-950/70 transition disabled:opacity-40 disabled:cursor-not-allowed"
                title={T('Delete selected', '删除所选')}
                data-testid="bulk-delete-btn"
              >
                <IconTrash className="w-4 h-4" />
                {T('Delete', '删除')}
              </button>
              <button
                onClick={onCancelSelect}
                className="min-h-11 px-3 rounded-full text-sm font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title={T('Cancel', '取消')}
                data-testid="select-cancel-btn"
              >
                {T('Cancel', '取消')}
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 px-3 h-8 rounded-full text-xs font-medium transition border ${
                filter === f.key
                  ? 'bg-primary/10 text-primary border-primary/30 dark:bg-primary/20 dark:text-indigo-300 dark:border-primary/40'
                  : 'bg-transparent text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {isZh ? f.zh : f.en}
            </button>
          ))}
        </div>
      </div>

      <div className={`flex-1 overflow-y-auto${isMobile ? ' pb-20' : ''}`}>
        {loading ? (
          <div className="px-3 py-2 space-y-3" aria-label={T('Loading conversations', '正在加载对话')} aria-busy="true">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center gap-3 px-2 py-2 animate-pulse">
                <span className="w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-800 shrink-0" />
                <span className="flex-1 space-y-2">
                  <span className="block h-3.5 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
                  <span className="block h-3 w-full rounded bg-slate-200 dark:bg-slate-800" />
                </span>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 py-14 px-6 text-center" data-testid="list-error">
            <IconInfo className="w-9 h-9" strokeWidth={1.5} />
            <p className="text-sm text-slate-400 dark:text-slate-500">{T('Could not load conversations', '无法加载对话')}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="min-h-11 px-5 rounded-full bg-primary text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition flex items-center gap-2"
              >
                <IconRefresh className="w-4 h-4" strokeWidth={2.2} />
                {T('Try again', '重试')}
              </button>
            )}
          </div>
        ) : (
          <>
            {filtered.map((thread) => (
              <ConversationItem
                key={thread.id}
                thread={thread}
                active={thread.id === activeId}
                onSelect={onSelect}
                selectable={selectable}
                selected={selectedSet.has(thread.id)}
                onToggleSelect={onToggleSelect}
              />
            ))}
            {filtered.length === 0 && (
              <div className="text-center text-sm text-slate-400 dark:text-slate-500 py-12 px-6">
                <div className="text-3xl mb-2 text-slate-300 dark:text-slate-600">··</div>
                {query.trim()
                  ? isZh
                    ? `未找到与“${query.trim()}”相关的对话`
                    : `No conversations found for “${query.trim()}”`
                  : threads.length === 0
                  ? T('No conversations yet', '暂无对话')
                  : filter === 'unread'
                  ? T('No unread messages', '没有未读消息')
                  : filter === 'media'
                  ? T('No media conversations', '没有媒体对话')
                  : filter === 'favorites'
                  ? T('No favorite conversations', '没有收藏的对话')
                  : T('No failed messages', '没有失败消息')}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
