import { useLanguage } from '../../context/LanguageContext.jsx';
import BottomSheet from './BottomSheet.jsx';
import Avatar from './Avatar.jsx';

export default function SenderNumberSheet({ open, numbers, fromNumber, onClose, onSelect }) {
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title={T('Send as', '以以下号码发送')}
      subtitle={T('Choose which number to send from', '选择发送使用的号码')}
      ariaLabel={T('Choose sender number', '选择发送号码')}
    >
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
    </BottomSheet>
  );
}
