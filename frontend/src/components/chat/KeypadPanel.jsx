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
    <div className="w-80 shrink-0 border-l border-gray-200 bg-white h-full flex flex-col justify-between min-h-0">
      <div className="relative border-b border-gray-200 pt-3 pb-2 px-4" ref={dropdownRef}>
        <div className="text-xs text-gray-500 font-normal">{t('chat.callAs')}</div>
        <button
          onClick={() => setDropdownOpen((v) => !v)}
          className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-[#202124] hover:text-blue-600 transition group"
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

      <div className="border-b border-gray-200 py-2.5 px-4 flex items-center justify-between">
        <input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={t('chat.enterNumber')}
          className="text-sm placeholder-gray-500 outline-none w-full mr-2 bg-transparent text-[#202124]"
        />
        <button
          onClick={() => onDial && onDial()}
          className="w-8 h-8 rounded-full bg-[#f1f3f4] text-gray-500 flex items-center justify-center shrink-0 hover:bg-gray-200 transition"
          title={isZh ? '拨打' : 'Call'}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-2">
        {matches.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelectMatch(m.id)}
            className="w-full text-left px-2 py-2 rounded-lg hover:bg-gray-50 transition flex items-center gap-2.5"
          >
            <Avatar name={m.name} src={m.avatar} size={34} />
            <span className="min-w-0">
              <span className="font-medium text-gray-800 text-sm block truncate">{m.name}</span>
              <span className="text-xs text-gray-400 block truncate">{m.preview}</span>
            </span>
          </button>
        ))}
        {matches.length === 0 && input.trim() && /^[0-9+()\s-]{7,}$/.test(input.trim()) && (
          <button
            onClick={onStartNew}
            className="w-full text-left px-2 py-2 rounded-lg hover:bg-gray-50 text-sm text-blue-600 transition"
          >
            + {t('chat.newMessage')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-y-6 gap-x-4 px-8 pt-10 pb-6 text-center">
        {KEYS.map(([digit, letters]) => (
          <button
            key={digit}
            type="button"
            onClick={() => onKey(digit)}
            className="w-14 h-14 mx-auto rounded-full hover:bg-gray-100 active:bg-gray-200 flex flex-col items-center justify-center transition"
          >
            <span className="text-2xl font-semibold text-[#202124] leading-tight">{digit}</span>
            {letters && (
              <span className="text-[10px] font-bold text-[#5f6368] tracking-widest uppercase mt-0.5">{letters}</span>
            )}
          </button>
        ))}
      </div>

      <div className="px-6 pb-4">
        <button
          onClick={() => onDial && onDial()}
          className="w-full bg-[#0d9d58] hover:bg-[#0b8a4d] text-white py-3 rounded-full flex items-center justify-center gap-2 font-medium shadow-sm transition"
        >
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          {isZh ? '拨打' : 'Call'}
        </button>
      </div>

      <div className="border-t border-gray-200 px-4 py-2.5 flex items-center justify-between text-xs text-[#5f6368]">
        <button onClick={onToggle} className="hover:text-[#202124] transition flex items-center gap-1">
          ✕ {t('chat.hideKeypad')}
        </button>
        <button onClick={onBackspace} className="hover:text-[#202124] transition text-base leading-none" title="Backspace">
          ⌫
        </button>
      </div>
    </div>
  );
}
