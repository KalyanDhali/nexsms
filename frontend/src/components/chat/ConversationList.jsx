import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import ConversationItem from './ConversationItem.jsx';

const FILTERS = [
  { key: 'all', en: 'All', zh: '全部' },
  { key: 'unread', en: 'Unread', zh: '未读' },
  { key: 'failed', en: 'Failed', zh: '失败' },
];

export default function ConversationList({ threads, activeId, onSelect, onNew, hidden }) {
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
        {filtered.map((thread) => (
          <ConversationItem
            key={thread.id}
            thread={thread}
            active={thread.id === activeId}
            onClick={() => onSelect(thread.id)}
          />
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-sm text-slate-400 dark:text-slate-500 py-12 px-6">
            <div className="text-3xl mb-2 text-slate-300 dark:text-slate-600">··</div>
            {threads.length === 0
              ? T('No conversations yet', '暂无对话')
              : filter === 'unread'
              ? T('No unread messages', '没有未读消息')
              : T('No failed messages', '没有失败消息')}
          </div>
        )}
      </div>
    </aside>
  );
}
