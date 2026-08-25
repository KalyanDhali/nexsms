import { useLanguage } from '../../context/LanguageContext.jsx';
import Avatar from './Avatar.jsx';

export default function SenderNumberSheet({ open, numbers, fromNumber, onClose, onSelect }) {
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px] animate-fade" onClick={onClose} />
      <div className="relative w-full md:max-w-md bg-white dark:bg-slate-900 rounded-t-2xl md:rounded-2xl shadow-2xl pb-[env(safe-area-inset-bottom)] animate-sheet-up">
        <div className="md:hidden flex justify-center pt-2">
          <span className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>
        <div className="px-5 pt-4 pb-2 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{T('Send as', '以以下号码发送')}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{T('Choose which number to send from', '选择发送使用的号码')}</p>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center transition"
            aria-label={T('Close', '关闭')}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="px-2 py-2 max-h-[60vh] overflow-y-auto">
          {numbers.length === 0 && (
            <div className="text-center text-sm text-slate-400 dark:text-slate-500 py-10">{T('No assigned numbers', '没有分配号码')}</div>
          )}
          {numbers.map((n) => {
            const on = n.number === fromNumber;
            return (
              <button
                key={n.id}
                onClick={() => onSelect(n)}
                className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition text-left ${
                  on ? 'bg-primary/[0.07] dark:bg-primary/20' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <Avatar name={n.number} size={40} />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-sm text-slate-900 dark:text-white font-mono">{n.number}</span>
                  <span className="block text-xs text-slate-500 dark:text-slate-400">
                    {n.primary_number ? T('Primary', '主号码') : T('Assigned', '已分配')}
                    {n.geo_country ? ` · ${n.geo_country}` : ''}
                  </span>
                </span>
                <span
                  className={`shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                    on ? 'border-primary bg-primary' : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {on && (
                    <svg viewBox="0 0 24 24" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
