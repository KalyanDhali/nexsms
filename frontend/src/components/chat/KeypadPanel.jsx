import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import Avatar from './Avatar.jsx';
import { IconBackspace, IconChevronDown } from '../icons.jsx';

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
  isMobile = false,
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
  const [kbInset, setKbInset] = useState(0);

  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return;
    const update = () => {
      const lh = window.innerHeight || vv.height;
      const inset = Math.max(0, lh - vv.height);
      setKbInset(inset > 80 ? inset : 0);
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    update();
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
    };
  }, []);

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
    if (isMobile) return null;
    return (
      <div className="w-11 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hidden md:flex items-start justify-center py-4">
        <button
          onClick={onToggle}
          title={t('chat.showKeypad')}
          className="text-lg text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 w-9 h-9 rounded-full transition leading-none"
        >
          ≡
        </button>
      </div>
    );
  }

  return (
    <div
      className={`keypad-panel sidebar-right w-full shrink-0 bg-white dark:bg-slate-900 h-full flex flex-col min-h-0 min-w-0 kb-inset ${
        isMobile ? 'fixed inset-0 z-50 shadow-2xl pt-[env(safe-area-inset-top)]' : 'md:border-l border-gray-200 dark:border-slate-800 overflow-y-auto'
      }`}
      style={{ paddingBottom: kbInset }}
      data-testid="keypad-panel"
    >
      <div className="relative border-b border-gray-200 dark:border-slate-800 pt-3 pb-2 px-4 flex items-start gap-2" ref={dropdownRef}>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-gray-500 dark:text-slate-400 font-normal">{t('chat.callAs')}</div>
          <button
            onClick={() => setDropdownOpen((v) => !v)}
            className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-[#202124] dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 transition group max-w-full"
          >
            <span className="truncate">{fromNumber || t('chat.myNumbers')}</span>
            <IconChevronDown className="w-3.5 h-3.5 shrink-0" />
          </button>
        </div>
        <button
          onClick={onToggle}
          className={`${isMobile ? 'hidden' : 'hidden md:flex'} w-8 h-8 shrink-0 rounded-full text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 hover:bg-gray-100 dark:hover:bg-slate-800 items-center justify-center transition`}
          title={t('chat.hideKeypad')}
          aria-label={t('chat.hideKeypad')}
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        {dropdownOpen && (
          <div className="absolute left-4 right-4 top-full mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 py-1 z-30 max-h-52 overflow-y-auto">
            {(numbers || []).map((n) => (
              <button
                key={n.number}
                onClick={() => {
                  onFromNumberChange && onFromNumberChange(n.number);
                  setDropdownOpen(false);
                }}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-800 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
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
              <div className="px-3 py-2 text-sm text-gray-400 dark:text-slate-500">{t('chat.noNumbers')}</div>
            )}
          </div>
        )}
      </div>

      <div className="border-b border-gray-200 dark:border-slate-800 py-3.5 px-6 flex items-center justify-center">
        <input
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={t('chat.enterNumber')}
          className="text-center text-2xl font-light text-[#202124] dark:text-slate-100 placeholder-gray-300 dark:placeholder-slate-500 outline-none w-full bg-transparent"
          inputMode="tel"
        />
      </div>

      <div className={`flex-1 min-h-0 overflow-y-auto px-4 py-2 ${isMobile ? 'hidden' : 'md:block'}`}>
        {matches.map((m) => (
          <button
            key={m.id}
            onClick={() => onSelectMatch(m.id)}
            className="w-full text-left px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition flex items-center gap-2.5"
          >
            <Avatar name={m.name} src={m.avatar} size={34} />
            <span className="min-w-0">
              <span className="font-medium text-gray-800 dark:text-slate-200 text-sm block truncate">{m.name}</span>
              <span className="text-xs text-gray-400 dark:text-slate-500 block truncate">{m.preview}</span>
            </span>
          </button>
        ))}
        {matches.length === 0 && input.trim() && /^[0-9+()\s-]{7,}$/.test(input.trim()) && (
          <button
            onClick={onStartNew}
            className="w-full text-left px-2 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 text-sm text-blue-600 dark:text-blue-400 transition"
          >
            + {t('chat.newMessage')}
          </button>
        )}
      </div>

      <div className={isMobile ? 'flex-1 min-h-0 overflow-y-auto flex flex-col' : ''}>
        <div className={isMobile ? 'm-auto w-full flex flex-col' : 'flex flex-col'}>
          <div className={`grid grid-cols-3 ${isMobile ? 'gap-y-5 gap-x-3 px-4 pt-5 pb-1' : 'gap-y-6 gap-x-4 px-6 pt-8 pb-1'} text-center`}>
            {KEYS.map(([digit, letters]) =>
              digit === '#' ? (
                <button
                  key={digit}
                  type="button"
                  onClick={onBackspace}
                  className={`${isMobile ? 'w-20 h-20' : 'w-[74px] h-[74px]'} mx-auto rounded-full bg-slate-400/10 dark:bg-white/10 hover:bg-slate-400/20 dark:hover:bg-white/20 active:bg-slate-400/30 dark:active:bg-white/30 text-slate-700 dark:text-slate-100 flex items-center justify-center transition`}
                  title="Backspace"
                  aria-label="Backspace"
                >
                  <IconBackspace className="w-7 h-7" />
                </button>
              ) : (
                <button
                  key={digit}
                  type="button"
                  onClick={() => onKey(digit)}
                  data-digit={digit}
                  className={`${isMobile ? 'w-20 h-20' : 'w-[74px] h-[74px]'} mx-auto rounded-full bg-slate-400/10 dark:bg-white/10 hover:bg-slate-400/20 dark:hover:bg-white/20 active:bg-slate-400/30 dark:active:bg-white/30 flex flex-col items-center justify-center transition`}
                >
                  <span className="text-[30px] font-light text-[#202124] dark:text-slate-100 leading-none">{digit}</span>
                  {letters && (
                    <span className="text-[11px] font-semibold text-[#5f6368] dark:text-slate-400 tracking-[0.2em] uppercase mt-1">{letters}</span>
                  )}
                </button>
              )
            )}
          </div>

          <div className="flex justify-center py-5">
            <button
              onClick={() => onDial && onDial()}
              className="w-16 h-16 rounded-full bg-[#34c759] hover:bg-[#2fb356] active:scale-95 text-white flex items-center justify-center shadow-lg transition"
              title={isZh ? '拨打' : 'Call'}
              aria-label={isZh ? '拨打' : 'Call'}
            >
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div className="border-t border-gray-200 dark:border-slate-800 px-4 pt-2.5 pb-[max(0.625rem,env(safe-area-inset-bottom))] flex items-center justify-center text-xs text-[#5f6368] dark:text-slate-400">
        <button onClick={onToggle} className="hover:text-[#202124] dark:hover:text-slate-200 transition flex items-center gap-1">
          ✕ {t('chat.hideKeypad')}
        </button>
      </div>
    </div>
  );
}
