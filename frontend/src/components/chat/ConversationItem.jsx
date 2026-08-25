import { memo } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import Avatar from './Avatar.jsx';

export function StatusTicks({ status, className = '' }) {
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  if (status === 'failed') {
    return (
      <span className={`inline-flex items-center gap-0.5 text-rose-500 ${className}`} title={isZh ? '发送失败' : 'Failed'}>
        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="15" y1="9" x2="9" y2="15" />
          <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
      </span>
    );
  }
  const sent = status === 'sent' || status === 'pending' || status === 'scheduled';
  return (
    <span className={`inline-flex items-center gap-0.5 ${sent ? '' : 'text-sky-500'} ${className}`} title={status}>
      <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      {!sent && (
        <svg viewBox="0 0 24 24" className="w-3 h-3 -ml-1" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )}
    </span>
  );
}

function ConversationItem({ thread, active, onSelect }) {
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);
  const last = thread.messages?.length ? thread.messages[thread.messages.length - 1] : null;

  return (
    <button
      onClick={() => onSelect(thread.id)}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition border-b border-slate-100 dark:border-slate-800 group min-h-[68px] ${
        active
          ? 'bg-primary/[0.06] hover:bg-primary/[0.09]'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
      }`}
    >
      <div className="relative shrink-0">
        <Avatar name={thread.name} src={thread.avatar} size={44} />
        {thread.unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center shadow">
            !
          </span>
        )}
      </div>

      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className={`text-sm truncate ${thread.unread ? 'font-semibold text-slate-900 dark:text-white' : 'font-medium text-slate-800 dark:text-slate-200'}`}>
            {thread.name}
          </span>
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
            {thread.time}
            {last?.direction === 'out' && last.status && <StatusTicks status={last.status} className="text-slate-400 dark:text-slate-500" />}
          </span>
        </span>
        <span className="flex items-center justify-between gap-2 mt-0.5">
          <span className={`text-xs truncate ${thread.unread ? 'text-slate-600 dark:text-slate-300 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>
            {last?.direction === 'out' && <span className="text-slate-400 dark:text-slate-500">{T('You: ', '我：')}</span>}
            {thread.preview}
          </span>
          {thread.unread > 0 && (
            <span className="shrink-0 min-w-[20px] h-[20px] px-1.5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
              {thread.unread > 99 ? '99+' : thread.unread}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}

export default memo(ConversationItem);
