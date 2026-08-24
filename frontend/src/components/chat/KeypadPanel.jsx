import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import Avatar from './Avatar.jsx';

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
  ['0', '+'],
  ['#', ''],
];

export default function KeypadPanel({
  open,
  onToggle,
  fromNumber,
  numbers,
  onFromNumberChange,
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
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

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
      <div className="relative border-b border-gray-200 px-4 py-2.5" ref={dropdownRef}>
        <div className="text-xs text-gray-500">{t('chat.callAs')}</div>
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          className="mt-0.5 flex items-center gap-1.5 text-sm font-semibold text-gray-800 hover:text-blue-600 transition group"
        >
          <span className="truncate">{fromNumber || t('chat.myNumbers')}</span>
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        {dropdownOpen && (
          <div className="absolute left-4 right-4 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-30 max-h-52 overflow-y-auto">
            {(numbers || []).map((n) => (
              <button
                key={n.number}
                onClick={() => {
                  onFromNumberChange && onFromNumberChange(n.number);
                  setDropdownOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-800 hover:bg-gray-50 transition"
              >
                <span className="truncate">{n.number}</span>
                {n.number === fromNumber && (
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-blue-600 shrink-0" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </button>
            ))}
            {(numbers || []).length === 0 && (
              <div className="px-3 py-2 text-sm text-gray-400">{t('chat.noNumbers')}</div>
            )}
          </div>
        )}
      </div>

      <div className="border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
        <input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={t('chat.enterNumber')}
          className="outline-none text-sm text-gray-800 placeholder-gray-500 w-full mr-2 bg-transparent"
        />
        <button
          onClick={() => onDial && onDial()}
          className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 shrink-0 hover:bg-gray-300 transition"
          title={isZh ? '拨打' : 'Call'}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 min-h-0">
        {matches.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelectMatch(m.id)}
            className="w-full text-left px-2 py-2 rounded-lg hover:bg-slate-50 transition flex items-center gap-2.5"
          >
            <Avatar name={m.name} src={m.avatar} size={34} />
            <span className="min-w-0">
              <span className="font-medium text-slate-800 text-sm block truncate">{m.name}</span>
              <span className="text-xs text-slate-400 block truncate">{m.preview}</span>
            </span>
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

      <div className="px-4 pt-3">
        <div className="grid grid-cols-3 gap-x-4 gap-y-2.5">
          {KEYS.map(([digit, letters]) => (
            <button
              key={digit}
              type="button"
              onClick={() => onKey(digit)}
              className="py-3 rounded-full hover:bg-gray-100 active:bg-gray-200 transition flex flex-col items-center"
            >
              <span className="text-xl font-bold text-slate-700 leading-none">{digit}</span>
              {letters && <span className="text-[9px] tracking-widest text-gray-400 mt-1 font-medium">{letters}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-2 pb-1 flex justify-center">
        <button
          onClick={() => onDial && onDial()}
          className="w-full py-2.5 rounded-full bg-[#1e8e3e] text-white text-sm font-semibold flex items-center justify-center gap-2 hover:shadow-lg transition"
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
