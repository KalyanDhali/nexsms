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

export default function KeypadPanel({
  open,
  onToggle,
  fromNumber,
  onFromNumberChange,
  numbers,
  input,
  onInputChange,
  onKey,
  onBackspace,
  matches,
  onSelectMatch,
  onStartNew,
  onDial,
}) {
  const { t, lang } = useLanguage();
  const isZh = lang === 'zh';

  if (!open) {
    return (
      <div className="w-11 shrink-0 border-l border-slate-200 bg-white flex items-start justify-center py-4">
        <button
          onClick={onToggle}
          title={t('chat.showKeypad')}
          className="text-lg text-slate-400 hover:text-slate-600 transition leading-none"
        >
          ≡
        </button>
      </div>
    );
  }

  return (
    <div className="w-[340px] shrink-0 border-l border-slate-200 bg-white flex flex-col min-h-0">
      <div className="px-4 pt-3">
        <div className="text-xs text-slate-500">{t('chat.callAs')}</div>
        <select
          value={fromNumber}
          onChange={(e) => onFromNumberChange(e.target.value)}
          className="mt-1 w-full px-2 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-700 bg-white"
        >
          {numbers.length === 0 && <option value="">{t('chat.myNumbers')}</option>}
          {numbers.map((n) => (
            <option key={n.id} value={n.number}>
              {n.number}
            </option>
          ))}
        </select>
      </div>

      <div className="px-4 pt-3">
        <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2.5 py-1.5 focus-within:border-blue-400 transition">
          <input
            value={input}
            onChange={(e) => onInputChange(e.target.value)}
            placeholder={t('chat.enterNumber')}
            className="flex-1 text-sm outline-none"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0">
        {matches.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelectMatch(m.id)}
            className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-50 transition"
          >
            <span className="font-medium text-slate-800 text-sm block truncate">{m.name}</span>
            <span className="text-xs text-slate-400 block truncate">{m.preview}</span>
          </button>
        ))}
        {matches.length === 0 && input.trim() && /^[0-9+()\s-]{7,}$/.test(input.trim()) && (
          <button
            onClick={onStartNew}
            className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-50 text-sm text-blue-600 transition"
          >
            + {t('chat.newMessage')}
          </button>
        )}
      </div>

      <div className="px-4 pt-2">
        <div className="grid grid-cols-3 gap-x-4 gap-y-1">
          {KEYS.map(([digit, letters]) => (
            <button
              key={digit}
              type="button"
              onClick={() => onKey(digit)}
              className="py-1.5 rounded-lg hover:bg-slate-50 active:bg-slate-100 transition flex flex-col items-center"
            >
              <span className="text-lg font-medium text-slate-700 leading-none">{digit}</span>
              {letters && <span className="text-[9px] tracking-widest text-slate-400 mt-0.5">{letters}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-2 pb-1 flex justify-center">
        <button
          onClick={() => onDial && onDial()}
          className="w-full py-2.5 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          {isZh ? '拨打' : 'Call'}
        </button>
      </div>

      <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100">
        <button onClick={onToggle} className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 transition">
          ✕ {t('chat.hideKeypad')}
        </button>
        <button onClick={onBackspace} className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 transition">
          ⌫
        </button>
      </div>
    </div>
  );
}
