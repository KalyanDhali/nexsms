import { useEffect, useRef } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';

/**
 * Reusable sheet. Mobile: bottom sheet (rounded top, safe-area, swipe-to-close,
 * drag handle). Desktop (md+): centered dialog. Esc / backdrop click close;
 * focus is moved into the sheet and restored on close.
 */
export default function BottomSheet({ open, onClose, title, subtitle, children, ariaLabel, footer }) {
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const sheetRef = useRef(null);
  const startY = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    const prev = document.activeElement;
    requestAnimationFrame(() => sheetRef.current?.focus());
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      if (prev && prev.focus) prev.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-end justify-center md:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || title}
    >
      <div className="absolute inset-0 bg-black/40 animate-fade" onClick={onClose} aria-hidden="true" />
      <div
        ref={sheetRef}
        tabIndex={-1}
        onTouchStart={(e) => {
          startY.current = e.touches[0].clientY;
        }}
        onTouchMove={(e) => {
          if (startY.current == null) return;
          const dy = e.touches[0].clientY - startY.current;
          if (dy > 0) e.currentTarget.style.transform = `translateY(${Math.min(dy, 120)}px)`;
        }}
        onTouchEnd={(e) => {
          const dy = e.changedTouches[0].clientY - (startY.current || 0);
          startY.current = null;
          e.currentTarget.style.transform = '';
          if (dy > 80) onClose();
        }}
        className="relative w-full md:max-w-md outline-none rounded-t-2xl md:rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xl animate-sheet-up max-h-[88dvh] overflow-y-auto overscroll-contain pb-[max(1rem,env(safe-area-inset-bottom))] md:mx-4"
      >
        <div className="md:hidden sticky top-0 pt-2.5 pb-1 flex justify-center bg-white dark:bg-slate-900 z-10">
          <span className="w-10 h-1.5 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>
        {title && (
          <div className="flex items-center justify-between px-5 pt-1 pb-2 gap-2">
            <div className="min-w-0">
              <h2 className="text-base font-semibold truncate">{title}</h2>
              {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 truncate">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label={isZh ? '关闭' : 'Close'}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        )}
        <div className="px-3 pb-2">{children}</div>
        {footer && <div className="px-3 pt-1">{footer}</div>}
      </div>
    </div>
  );
}
