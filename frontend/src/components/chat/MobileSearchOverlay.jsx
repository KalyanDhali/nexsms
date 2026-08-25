import { useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import ConversationItem from './ConversationItem.jsx';

export default function MobileSearchOverlay({ open, query, onQueryChange, threads, onSelect, onClose }) {
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => inputRef.current?.focus());
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const q = query.trim();

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-white dark:bg-slate-900" role="dialog" aria-modal="true" aria-label={T('Search', '搜索')}>
      <div className="flex items-center gap-2 px-3 h-14 border-b border-slate-200 dark:border-slate-800 shrink-0 pb-[env(safe-area-inset-top)]">
        <button
          onClick={onClose}
          className="w-11 h-11 shrink-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center transition"
          aria-label={T('Back', '返回')}
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <div className="flex-1 min-w-0 flex items-center gap-2 px-3 py-2 rounded-full bg-slate-100 dark:bg-slate-800 focus-within:ring-2 focus-within:ring-primary/40 transition">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 shrink-0">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={T('Search conversations', '搜索对话')}
            className="flex-1 min-w-0 bg-transparent outline-none text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder:text-slate-500"
          />
          {query && (
            <button
              onClick={() => onQueryChange('')}
              className="w-7 h-7 shrink-0 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition"
              aria-label={T('Clear', '清除')}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {q ? (
          threads.length ? (
            threads.map((th) => (
              <ConversationItem
                key={th.id}
                thread={th}
                active={false}
                onSelect={(id) => {
                  onSelect(id);
                  onClose();
                }}
              />
            ))
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 py-16 px-6 text-center">
              <svg viewBox="0 0 24 24" className="w-10 h-10 text-slate-300 dark:text-slate-700" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <p className="text-sm text-slate-400 dark:text-slate-500">
                {isZh ? `未找到与“${q}”相关的对话` : `No conversations found for “${q}”`}
              </p>
            </div>
          )
        ) : (
          <div className="text-center text-sm text-slate-400 dark:text-slate-500 py-16 px-6">
            {T('Search by name, number, or message content', '按姓名、号码或消息内容搜索')}
          </div>
        )}
      </div>
    </div>
  );
}
