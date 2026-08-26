import { useLanguage } from '../../context/LanguageContext.jsx';

const ICONS = {
  calls: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  messages: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  voicemail: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 8a3 3 0 0 0-3-3 3 3 0 0 0-3 3v3a3 3 0 0 0 6 0V8z" />
      <path d="M6 11a3 3 0 0 0-3 3v1a6 6 0 0 0 6 6h6a6 6 0 0 0 6-6v-1a3 3 0 0 0-3-3" />
      <path d="M6 8v3M12 8v3" />
    </svg>
  ),
  archive: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8v13H3V8" />
      <path d="M1 3h22v5H1z" />
      <path d="M10 12h4" />
    </svg>
  ),
  spam: (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  ),
};

export default function NavSidebar({ active, onChange, collapsed, drawer, onClose, extraItems = [] }) {
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  if (!drawer && collapsed) return null;
  const items = [
    { key: 'calls', label: 'Calls', zh: '通话' },
    { key: 'messages', label: 'Messages', zh: '消息' },
    { key: 'voicemail', label: 'Voicemail', zh: '语音信箱' },
    { key: 'archive', label: 'Archive', zh: '归档' },
    { key: 'spam', label: 'Spam', zh: '垃圾' },
  ];

  const renderItem = (item) => {
    const on = active === item.key;
    if (drawer) {
      return (
        <button
          key={item.key}
          onClick={() => onChange(item.key)}
          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
            on ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          {ICONS[item.key]}
          <span>{isZh ? item.zh : item.label}</span>
        </button>
      );
    }
    return (
      <button
        key={item.key}
        onClick={() => onChange(item.key)}
        className={`w-[72px] py-2 rounded-xl flex flex-col items-center justify-center gap-1 transition ${
          on ? 'bg-blue-50 text-blue-600' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
        }`}
      >
        {ICONS[item.key]}
        <span className="text-[10px] leading-none">{isZh ? item.zh : item.label}</span>
      </button>
    );
  };

  if (drawer) {
    return (
      <div className="fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/30" onClick={onClose} />
        <nav className="absolute left-0 top-0 bottom-0 w-60 max-w-[80vw] bg-white border-r border-slate-200 shadow-xl flex flex-col p-3 gap-1 overflow-y-auto">
          <div className="flex items-center justify-between px-2 py-2 border-b border-slate-100 mb-2">
            <span className="font-bold text-slate-900">NexSMS</span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-slate-100 text-slate-500 flex items-center justify-center transition"
              title="Close"
            >
              ✕
            </button>
          </div>
          {items.map(renderItem)}
          {extraItems.length > 0 && (
            <>
              <div className="mt-2 mb-1 mx-2 border-t border-slate-100" />
              {extraItems.map((item) => {
                const on = active === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => onChange(item.key)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                      on ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <span className="w-[18px] text-center text-base leading-none">·</span>
                    <span>{isZh ? item.zh : item.label}</span>
                  </button>
                );
              })}
            </>
          )}
        </nav>
      </div>
    );
  }

  return (
    <nav className="w-[88px] shrink-0 border-r border-slate-200 bg-white flex flex-col items-center pt-3 gap-1">
      {items.map(renderItem)}
    </nav>
  );
}
