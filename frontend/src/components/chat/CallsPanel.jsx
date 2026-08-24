import { useLanguage } from '../../context/LanguageContext.jsx';

const CALL_LOG = [
  { id: 1, name: '+1 (702) 246-7591', dir: 'in', time: '9:15 PM' },
  { id: 2, name: '+1 (929) 917-4865', dir: 'out', time: '8:42 PM' },
  { id: 3, name: '+1 (213) 461-4228', dir: 'missed', time: '7:58 PM' },
  { id: 4, name: '+1 (702) 246-7592', dir: 'out', time: 'Yesterday' },
];

export default function CallsPanel({ onPick }) {
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);

  return (
    <aside className="w-[320px] shrink-0 border-r border-slate-200 bg-white flex flex-col">
      <div className="px-4 py-3 border-b border-slate-100">
        <span className="text-sm font-medium text-slate-900">{T('Recent calls', '最近通话')}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {CALL_LOG.map((c) => (
          <button
            key={c.id}
            onClick={() => onPick(c.name)}
            className="w-full flex items-center gap-3 px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition"
          >
            <span className="w-10 h-10 shrink-0 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
              {c.dir === 'in' ? '↓' : c.dir === 'out' ? '↑' : '✕'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-medium text-sm text-slate-900 truncate">{c.name}</span>
              <span className="block text-xs text-slate-400">
                {c.dir === 'in' ? T('Incoming', '来电') : c.dir === 'out' ? T('Outgoing', '去电') : T('Missed', '未接')} · {c.time}
              </span>
            </span>
          </button>
        ))}
      </div>
    </aside>
  );
}
