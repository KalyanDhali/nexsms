import { useLanguage } from '../../context/LanguageContext.jsx';

const KEYS = [
  ['1', ''],
  ['2', 'ABC'],
  ['3', 'DEF'],
  ['4', 'GHI'],
  ['5', 'JKL'],
  ['6', 'MNO'],
  ['7', 'PQRS'],
  ['8', 'TUV'],
  ['9', 'WXYZ'],
  ['*', ''],
  ['0', ''],
  ['#', ''],
];

export default function Keypad({ onKey, onBackspace, onHide }) {
  const { t } = useLanguage();
  return (
    <div className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 pt-3 pb-2">
      <div className="grid grid-cols-3 gap-x-4 gap-y-1.5 max-w-sm mx-auto">
        {KEYS.map(([digit, letters]) => (
          <button
            key={digit}
            type="button"
            onClick={() => onKey(digit)}
            className="py-2 rounded-lg bg-slate-400/10 dark:bg-white/10 hover:bg-slate-400/20 dark:hover:bg-white/20 active:bg-slate-400/30 dark:active:bg-white/30 transition flex flex-col items-center"
          >
            <span className="text-lg font-medium text-slate-700 dark:text-slate-100 leading-none">{digit}</span>
            {letters && <span className="text-[9px] tracking-widest text-slate-400 dark:text-slate-400 mt-0.5">{letters}</span>}
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between max-w-sm mx-auto mt-1">
        <button type="button" onClick={onHide} className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1">
          ✕ {t('chat.hideKeypad')}
        </button>
        <button type="button" onClick={onBackspace} className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-2 py-1">
          ⌫
        </button>
      </div>
    </div>
  );
}
