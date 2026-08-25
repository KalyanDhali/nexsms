import { useLanguage } from '../../context/LanguageContext.jsx';
import Avatar from './Avatar.jsx';

export default function ConversationList({ threads, activeId, onSelect, onNew, hidden }) {
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);

  return (
    <aside
      className="w-full md:w-[320px] shrink-0 border-r border-slate-200 flex flex-col bg-white"
      style={hidden ? { display: 'none' } : undefined}
    >
      <div className="p-3">
        <button
          onClick={onNew}
          className="w-full py-2 rounded-full border border-blue-600 text-blue-600 text-sm font-medium hover:bg-blue-50 transition"
        >
          + {T('Send new message', '发送新消息')}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {threads.map((thread) => (
          <button
            key={thread.id}
            onClick={() => onSelect(thread.id)}
            className={`w-full text-left px-4 py-3 flex items-start gap-3 transition border-b border-slate-100 ${
              thread.id === activeId ? 'bg-blue-50/70' : 'hover:bg-slate-50'
            }`}
          >
            <Avatar name={thread.name} src={thread.avatar} size={40} />
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between gap-2">
                <span className="font-medium text-sm text-slate-900 truncate">{thread.name}</span>
                <span className="shrink-0 text-[11px] text-slate-400">{thread.time}</span>
              </span>
              <span className="flex items-center gap-2 mt-0.5">
                {thread.lastDirection === 'out' && (
                  <span className="shrink-0 text-xs text-slate-500">You:</span>
                )}
                <span className="text-xs text-slate-500 truncate">{thread.preview}</span>
                {thread.unread > 0 && (
                  <span className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center">
                    {thread.unread}
                  </span>
                )}
              </span>
            </span>
          </button>
        ))}
        {threads.length === 0 && (
          <div className="text-center text-sm text-slate-400 py-10">
            {T('No conversations found', '未找到对话')}
          </div>
        )}
      </div>
    </aside>
  );
}
