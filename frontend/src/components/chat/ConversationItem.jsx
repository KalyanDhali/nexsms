import { memo } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import Avatar from './Avatar.jsx';

export function StatusTicks({ status, className = '', readAt = null }) {
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
  const read = Boolean(readAt) || status === 'read';
  return (
    <span
      className={`inline-flex items-center gap-0.5 ${sent ? '' : read ? 'text-sky-500' : 'text-sky-500'} ${className}`}
      title={read ? (isZh ? '已读' : 'Read') : sent ? (isZh ? '已发送' : 'Sent') : isZh ? '已送达' : 'Delivered'}
    >
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

function ConversationItem({ thread, active, onSelect, selectable = false, selected = false, onToggleSelect }) {
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);
  const last = thread.messages?.length ? thread.messages[thread.messages.length - 1] : null;

  return (
    <button
      onClick={() => (selectable ? onToggleSelect?.(thread.id) : onSelect(thread.id))}
      className={`w-full flex items-center gap-3 px-4 py-3.5 text-left transition border-b border-slate-100 dark:border-slate-800 group min-h-[68px] ${
        selectable
          ? selected
            ? 'bg-primary/[0.08] hover:bg-primary/[0.11]'
            : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
          : active
          ? 'bg-primary/[0.06] hover:bg-primary/[0.09]'
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
      }`}
      data-testid="conversation-item"
    >
      {selectable && (
        <span
          className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
            selected ? 'bg-primary border-primary text-white' : 'border-slate-300 dark:border-slate-600'
          }`}
          aria-label={selected ? T('Selected', '已选择') : T('Select', '选择')}
        >
          {selected && (
            <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
        </span>
      )}
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
          <span className={`flex items-center gap-1 min-w-0 ${thread.unread ? 'font-semibold text-slate-900 dark:text-white' : 'font-medium text-slate-800 dark:text-slate-200'}`}>
            {thread.pinned && (
              <svg viewBox="0 0 24 24" className="w-3 h-3 shrink-0 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label={T('Pinned', '已置顶')} role="img">
                <path d="M12 17v5" />
                <path d="M9 4h6l-1 6a2 2 0 0 0 .6 1.4L17 14H7l2.4-2.6A2 2 0 0 0 10 10L9 4z" />
              </svg>
            )}
            <span className="truncate">{thread.name}</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
            {thread.favorite && (
              <svg viewBox="0 0 24 24" className="w-3 h-3 text-amber-400" fill="currentColor" aria-label={T('Favorite', '收藏')} role="img">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            )}
            {thread.time}
            {last?.direction === 'out' && last.status && <StatusTicks status={last.status} readAt={last.readAt} className="text-slate-400 dark:text-slate-500" />}
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
