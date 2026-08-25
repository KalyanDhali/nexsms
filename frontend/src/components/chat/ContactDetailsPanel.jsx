import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import Avatar from './Avatar.jsx';

export default function ContactDetailsPanel({ thread, fromNumber, assignedNumber, onBack, onMessage, mobile, onClose }) {
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);
  const [copied, setCopied] = useState(false);

  if (!thread) return null;

  const copyNumber = async () => {
    try {
      await navigator.clipboard.writeText(thread.contactNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  };

  const rows = [
    { label: T('Phone number', '电话号码'), value: thread.contactNumber, mono: true },
    { label: T('Send as', '以以下号码发送'), value: assignedNumber || fromNumber, mono: true },
    { label: T('Last active', '最后活跃'), value: thread.time },
    { label: T('Messages', '消息数'), value: String(thread.messages?.length || 0) },
  ];

  const actions = [
    {
      key: 'call',
      en: 'Call',
      zh: '拨打',
      href: `tel:${thread.contactNumber}`,
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      ),
    },
    {
      key: 'message',
      en: 'Message',
      zh: '发消息',
      onClick: onMessage,
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      key: 'copy',
      en: copied ? 'Copied' : 'Copy',
      zh: copied ? '已复制' : '复制',
      onClick: copyNumber,
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
        </svg>
      ),
    },
  ];

  const content = (
    <div className="flex flex-col h-full">
      <div className="flex flex-col items-center gap-3 px-4 py-6 border-b border-slate-200 dark:border-slate-800">
        <Avatar name={thread.name} src={thread.avatar} size={72} />
        <div className="text-center">
          <div className="font-semibold text-slate-900 dark:text-white truncate max-w-full">{thread.name}</div>
          <div className="text-sm text-slate-500 dark:text-slate-400 font-mono">{thread.contactNumber}</div>
        </div>
        <div className="flex items-center gap-2">
          {actions.map((a) =>
            a.href ? (
              <a
                key={a.key}
                href={a.href}
                className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-primary hover:text-white transition flex flex-col items-center justify-center gap-0.5"
                title={isZh ? a.zh : a.en}
              >
                {a.icon}
                <span className="text-[9px] font-medium leading-none">{isZh ? a.zh : a.en}</span>
              </a>
            ) : (
              <button
                key={a.key}
                onClick={a.onClick}
                className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-primary hover:text-white transition flex flex-col items-center justify-center gap-0.5"
                title={isZh ? a.zh : a.en}
              >
                {a.icon}
                <span className="text-[9px] font-medium leading-none">{isZh ? a.zh : a.en}</span>
              </button>
            )
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/60">
            <span className="text-xs text-slate-500 dark:text-slate-400">{r.label}</span>
            <span className={`text-sm font-medium text-slate-900 dark:text-white truncate ${r.mono ? 'font-mono' : ''}`}>{r.value}</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (mobile) {
    return (
      <div className="md:hidden fixed inset-0 z-40 bg-white dark:bg-slate-900 flex flex-col">
        <div className="h-14 shrink-0 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 px-2 bg-white dark:bg-slate-900">
          <button
            onClick={onBack}
            className="w-11 h-11 shrink-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center transition"
            aria-label={T('Back', '返回')}
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
          </button>
          <span className="font-semibold text-slate-900 dark:text-white">{T('Contact details', '联系人详情')}</span>
        </div>
        {content}
      </div>
    );
  }

  return (
    <aside className="hidden md:flex w-[300px] shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex-col relative">
      <button
        onClick={onClose}
        className="absolute top-2 right-2 z-10 w-9 h-9 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center transition"
        aria-label={T('Close', '关闭')}
      >
        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
      {content}
    </aside>
  );
}
