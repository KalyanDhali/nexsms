import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import ConversationItem from './ConversationItem.jsx';

const FILTERS = [
  { key: 'all', en: 'All', zh: '全部' },
  { key: 'unread', en: 'Unread', zh: '未读' },
  { key: 'failed', en: 'Failed', zh: '失败' },
];

export default function ConversationList({ threads, activeId, onSelect, onNew, query = '', hidden, loading = false, error = false, onRetry }) {
  const { t, lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);
  const [filter, setFilter] = useState('all');

  const hasFailed = (th) => th.messages?.some((m) => m.direction === 'out' && m.status === 'failed');
  const filtered = threads.filter((th) => {
    if (filter === 'unread') return th.unread > 0;
    if (filter === 'failed') return hasFailed(th);
    return true;
  });

  return (
    <aside
      className="w-full md:w-[320px] shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900"
      style={hidden ? { display: 'none' } : undefined}
    >
      <div className="px-3 pt-3 pb-2 space-y-2">
        <button
          onClick={onNew}
          className="w-full min-h-11 flex items-center justify-center gap-2 rounded-full bg-primary text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition shadow-sm"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          {T('New message', '新消息')}
        </button>

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

      <div className="flex-1 overflow-y-auto">
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
            <svg viewBox="0 0 24 24" className="w-9 h-9 text-slate-300 dark:text-slate-700" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M12 9v4m0 4h.01" />
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            </svg>
            <p className="text-sm text-slate-400 dark:text-slate-500">{T('Could not load conversations', '无法加载对话')}</p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="min-h-11 px-5 rounded-full bg-primary text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition flex items-center gap-2"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
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
                  : T('No failed messages', '没有失败消息')}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
