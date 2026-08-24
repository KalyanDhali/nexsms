import { useLanguage } from '../../context/LanguageContext.jsx';

export default function ConversationList({ threads, activeId, onSelect, search, onSearch, onNew }) {
  const { t } = useLanguage();

  return (
    <aside className="w-80 border-r border-slate-200 flex flex-col bg-white">
      <div className="p-3">
        <button
          onClick={onNew}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-sm font-semibold hover:opacity-90 transition"
        >
          + {t('chat.newMessage')}
        </button>
      </div>
      <div className="px-3 pb-2">
        <input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={t('chat.enterNumber')}
          className="w-full px-4 py-2 rounded-xl bg-slate-100 border border-transparent focus:border-primary focus:bg-white text-sm outline-none transition"
        />
      </div>
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {threads.map((thread) => (
          <button
            key={thread.id}
            onClick={() => onSelect(thread.id)}
            className={`w-full text-left px-3 py-3 rounded-xl transition ${
              thread.id === activeId ? 'bg-primary/10 border border-primary/30' : 'hover:bg-slate-50 border border-transparent'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-semibold text-sm text-slate-900 truncate">{thread.name}</span>
              {thread.unread > 0 && (
                <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                  {thread.unread}
                </span>
              )}
            </div>
            <div className="flex items-center justify-between gap-2 mt-1">
              <span className="text-xs text-slate-500 truncate">{thread.preview}</span>
              <span className="shrink-0 text-[10px] text-slate-400">{thread.time}</span>
            </div>
          </button>
        ))}
        {threads.length === 0 && (
          <div className="text-center text-sm text-slate-400 py-10">
            {search ? 'No conversations found' : 'No conversations yet'}
          </div>
        )}
      </div>
    </aside>
  );
}
