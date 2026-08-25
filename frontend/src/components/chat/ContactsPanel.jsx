import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import Avatar from './Avatar.jsx';

export default function ContactsPanel({ threads, onSelect, hidden }) {
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);
  const [query, setQuery] = useState('');

  const list = threads.filter((t) =>
    (t.contactNumber || t.name || '').toLowerCase().includes(query.trim().toLowerCase())
  );

  return (
    <aside
      className="w-full md:w-[320px] shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900"
      style={hidden ? { display: 'none' } : undefined}
    >
      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 space-y-2">
        <span className="text-sm font-medium text-slate-900 dark:text-white">{T('Contacts', '联系人')}</span>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 focus-within:ring-2 focus-within:ring-primary/30 transition">
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={T('Search contacts', '搜索联系人')}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-slate-100"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {list.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className="w-full flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition min-h-[60px]"
          >
            <Avatar name={t.contactNumber || t.name} size={40} />
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-sm text-slate-900 dark:text-white truncate">{t.contactNumber || t.name}</span>
              <span className="block text-xs text-slate-400 dark:text-slate-500 truncate">{t.preview}</span>
            </span>
            <span className="shrink-0 text-[11px] text-slate-400 dark:text-slate-500">{t.time}</span>
          </button>
        ))}
        {list.length === 0 && (
          <div className="text-center text-sm text-slate-400 dark:text-slate-500 py-10">
            {threads.length === 0 ? T('No contacts yet', '暂无联系人') : T('No matches', '没有匹配项')}
          </div>
        )}
      </div>
    </aside>
  );
}
