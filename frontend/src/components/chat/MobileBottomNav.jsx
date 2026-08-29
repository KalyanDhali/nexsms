import { useLanguage } from '../../context/LanguageContext.jsx';
import { IconHome, IconMessages, IconContacts, IconCalls, IconSettings } from '../icons.jsx';

const ITEMS = [
  {
    key: 'home',
    en: 'Home',
    zh: '首页',
    icon: () => <IconHome className="w-6 h-6" />,
  },
  {
    key: 'messages',
    en: 'Messages',
    zh: '消息',
    icon: () => <IconMessages className="w-6 h-6" />,
  },
  {
    key: 'contacts',
    en: 'Contacts',
    zh: '联系人',
    icon: () => <IconContacts className="w-6 h-6" />,
  },
  {
    key: 'calls',
    en: 'Calls',
    zh: '通话',
    icon: () => <IconCalls className="w-6 h-6" />,
  },
  {
    key: 'settings',
    en: 'Settings',
    zh: '设置',
    icon: () => <IconSettings className="w-6 h-6" />,
  },
];

export default function MobileBottomNav({ active, onChange, unreadTotal }) {
  const { lang } = useLanguage();
  const isZh = lang === 'zh';

  return (
    <nav className="fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch">
        {ITEMS.map((item) => {
          const on = active === item.key;
          return (
            <button
              key={item.key}
              onClick={() => onChange(item.key)}
              aria-label={isZh ? item.zh : item.en}
              className={`relative flex-1 min-h-[56px] flex flex-col items-center justify-center gap-0.5 transition ${
                on ? 'text-primary dark:text-indigo-400' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <span className="relative">
                {item.icon(on)}
                {item.key === 'messages' && unreadTotal > 0 && (
                  <span className="absolute -top-1 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                    {unreadTotal > 99 ? '99+' : unreadTotal}
                  </span>
                )}
              </span>
              <span className="text-[10px] leading-none">{isZh ? item.zh : item.en}</span>
              {on && <span className="absolute top-0 inset-x-4 h-0.5 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
