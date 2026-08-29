import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { getNotifications, markAllNotificationsRead, markNotificationRead } from '../services/api.js';

function TypeIcon({ type }) {
  const cls = 'w-4 h-4';
  const props = { viewBox: '0 0 24 24', className: cls, fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (type === 'payment') return <svg {...props}><path d="M3 3h18v18H3z" /><path d="M3 9h18" /><path d="M8 14h4" /></svg>;
  if (type === 'kyc') return <svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" /></svg>;
  return <svg {...props}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></svg>;
}

export default function NotificationBell({ onRefreshKey }) {
  const { lang } = useLanguage();
  const { theme } = useTheme();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);
  const wrapRef = useRef(null);

  const load = async () => {
    try {
      const { data } = await getNotifications();
      setItems(data.notifications);
      setUnread(data.unread);
    } catch {
      // silent
    }
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 20000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (onRefreshKey) load();
  }, [onRefreshKey]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markAll = async () => {
    await markAllNotificationsRead();
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnread(0);
  };

  const openOne = async (n) => {
    if (!n.read) {
      await markNotificationRead(n.id).catch(() => {});
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
    }
  };

  const fmt = (ts) => {
    const d = new Date(ts);
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60000) return T('now', '刚刚');
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return d.toLocaleDateString();
  };

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
        className="relative w-10 h-10 md:w-9 md:h-9 shrink-0 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition"
        title={T('Notifications', '通知')}
        aria-label={T('Notifications', '通知')}
      >
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-slate-900">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-[60] w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-fade">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-100 dark:border-slate-700">
            <span className="text-sm font-semibold text-slate-900 dark:text-white">
              {T('Notifications', '通知')}
              {unread > 0 && <span className="ml-1.5 text-xs font-normal text-rose-500">({unread})</span>}
            </span>
            {unread > 0 && (
              <button onClick={markAll} className="text-xs text-primary dark:text-indigo-300 hover:underline">
                {T('Mark all read', '全部已读')}
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto overscroll-contain">
            {loading ? (
              <div className="text-center text-sm text-slate-400 py-8">{T('Loading…', '加载中…')}</div>
            ) : items.length === 0 ? (
              <div className="text-center text-sm text-slate-400 dark:text-slate-500 py-10">
                {T('No notifications yet', '暂无通知')}
              </div>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  onClick={() => openOne(n)}
                  className={`w-full flex items-start gap-2.5 px-4 py-3 text-left border-b border-slate-50 dark:border-slate-700/50 transition hover:bg-slate-50 dark:hover:bg-slate-700/40 ${n.read ? 'opacity-60' : ''}`}
                >
                  <span className="w-8 h-8 shrink-0 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-300">
                    <TypeIcon type={n.type} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-800 dark:text-slate-100">{n.title}</span>
                    {n.body && <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2 break-words">{n.body}</span>}
                  </span>
                  <span className="shrink-0 text-[10px] text-slate-400">{fmt(n.created_at)}</span>
                  {!n.read && <span className="shrink-0 mt-1 w-2 h-2 rounded-full" style={{ background: theme.primary }} />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
