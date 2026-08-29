import { useLanguage } from '../../context/LanguageContext.jsx';
import { IconCalls, IconMessages, IconVoicemail, IconArchive, IconSpam } from '../icons.jsx';

const ICONS = {
  calls: <IconCalls size={18} />,
  messages: <IconMessages size={18} />,
  voicemail: <IconVoicemail size={18} />,
  archive: <IconArchive size={18} />,
  spam: <IconSpam size={18} />,
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
            on ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
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
          on ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200'
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
        <nav className="absolute left-0 top-0 bottom-0 w-60 max-w-[80vw] bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-xl flex flex-col p-3 gap-1 overflow-y-auto">
          <div className="flex items-center justify-between px-2 py-2 border-b border-slate-100 dark:border-slate-800 mb-2">
            <span className="font-bold text-slate-900 dark:text-white">NexSMS</span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center transition"
              title="Close"
            >
              ✕
            </button>
          </div>
          {items.map(renderItem)}
          {extraItems.length > 0 && (
            <>
              <div className="mt-2 mb-1 mx-2 border-t border-slate-100 dark:border-slate-800" />
              {extraItems.map((item) => {
                const on = active === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => onChange(item.key)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                      on ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100'
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
    <nav className="w-[88px] shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col items-center pt-3 gap-1">
      {items.map(renderItem)}
    </nav>
  );
}
