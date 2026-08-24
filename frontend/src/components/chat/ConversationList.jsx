import { useLanguage } from '../../context/LanguageContext.jsx';

const AVATAR_COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500', 'bg-violet-500', 'bg-cyan-600'];

function initials(name) {
  const digits = (name.match(/\d/g) || []).slice(-4).join('');
  if (digits) return digits;
  return name.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || '?';
}

export default function ConversationList({ threads, activeId, onSelect, onNew }) {
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);

  return (
    <aside className="w-[320px] shrink-0 border-r border-slate-200 flex flex-col bg-white">
      <div className="p-3">
        <button
          onClick={onNew}
          className="w-full py-2 rounded-full border border-blue-600 text-blue-600 text-sm font-medium hover:bg-blue-50 transition"
        >
          + {T('Send new message', '发送新消息')}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {threads.map((thread, idx) => (
          <button
            key={thread.id}
            onClick={() => onSelect(thread.id)}
            className={`w-full text-left px-4 py-3 flex items-start gap-3 transition border-b border-slate-100 ${
              thread.id === activeId ? 'bg-blue-50/70' : 'hover:bg-slate-50'
            }`}
          >
            <span
              className={`w-10 h-10 shrink-0 rounded-full ${AVATAR_COLORS[idx % AVATAR_COLORS.length]} text-white text-xs font-semibold flex items-center justify-center`}
            >
              {initials(thread.name)}
            </span>
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
