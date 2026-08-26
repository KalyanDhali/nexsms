import { useLanguage } from '../../context/LanguageContext.jsx';
import Avatar from './Avatar.jsx';

const CALL_LOG = [
  { id: 1, name: '+1 (702) 246-7591', dir: 'in', time: '9:15 PM' },
  { id: 2, name: '+1 (929) 917-4865', dir: 'out', time: '8:42 PM' },
  { id: 3, name: '+1 (213) 461-4228', dir: 'missed', time: '7:58 PM' },
  { id: 4, name: '+1 (702) 246-7592', dir: 'out', time: 'Yesterday' },
];

export default function CallsPanel({ onPick, hidden }) {
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);

  return (
    <aside
      className="list-column w-full shrink-0 border-r border-slate-200 bg-white flex flex-col"
      style={hidden ? { display: 'none' } : undefined}
    >
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
            <span className="relative shrink-0">
              <Avatar name={c.name} size={40} />
              <span className={`absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full text-[10px] flex items-center justify-center text-white ${c.dir === 'in' ? 'bg-green-500' : c.dir === 'out' ? 'bg-blue-500' : 'bg-rose-500'}`}>
                {c.dir === 'in' ? '↓' : c.dir === 'out' ? '↑' : '✕'}
              </span>
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
