import { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { getAdminAnalytics } from '../../services/api.js';
import { SectionHeader, Card, Toast } from './ui.jsx';

const STATUS_COLORS = {
  sent: '#4F46E5',
  delivered: '#10B981',
  failed: '#EF4444',
  queued: '#F59E0B',
  pending: '#F59E0B',
  received: '#06B6D4',
  scheduled: '#8B5CF6',
  cancelled: '#94A3B8',
};

const STATUS_LABELS = (isZh) => ({
  sent: isZh ? '已发送' : 'Sent',
  delivered: isZh ? '已送达' : 'Delivered',
  failed: isZh ? '失败' : 'Failed',
  queued: isZh ? '排队中' : 'Queued',
  pending: isZh ? '等待中' : 'Pending',
  received: isZh ? '已接收' : 'Received',
  scheduled: isZh ? '已计划' : 'Scheduled',
  cancelled: isZh ? '已取消' : 'Cancelled',
});

function Donut({ data, isZh }) {
  const total = data.reduce((a, d) => a + d.count, 0);
  if (!total) return <p className="text-sm text-slate-400 dark:text-slate-500">{'No data'}</p>;
  let acc = 0;
  const segments = data.map((d) => {
    const seg = { ...d, start: (acc / total) * 100, end: ((acc + d.count) / total) * 100 };
    acc += d.count;
    return seg;
  });
  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 36 36" className="w-32 h-32 -rotate-90 shrink-0">
        {segments.map((s, i) => (
          <circle
            key={i}
            cx="18" cy="18" r="15.915"
            fill="none"
            strokeWidth="5.5"
            stroke={(STATUS_COLORS[s.status] || '#94A3B8')}
            strokeDasharray={`${Math.max(0, s.end - s.start)} ${100 - Math.max(0, s.end - s.start)}`}
            strokeDashoffset={-s.start}
          />
        ))}
      </svg>
      <div className="space-y-1.5">
        {segments.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[s.status] || '#94A3B8' }} />
            <span className="text-slate-600 dark:text-slate-300">{STATUS_LABELS(isZh)[s.status] || s.status}</span>
            <span className="text-slate-400 dark:text-slate-500">{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TopNumbers({ data }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  const colors = [
    { from: '#6366F1', to: '#8B5CF6' },
    { from: '#10B981', to: '#06B6D4' },
    { from: '#F59E0B', to: '#F97316' },
    { from: '#EF4444', to: '#EC4899' },
    { from: '#3B82F6', to: '#06B6D4' },
  ];
  return (
    <div className="space-y-3">
      {data.map((d, i) => {
        const c = colors[i % colors.length];
        return (
          <div key={d.number}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="font-mono text-slate-700 dark:text-slate-200">{d.number}</span>
              <span className="text-slate-400 dark:text-slate-500">{d.count} · ${Number(d.cost).toFixed(4)}</span>
            </div>
            <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${(d.count / max) * 100}%`, background: `linear-gradient(90deg, ${c.from}, ${c.to})` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LineChart({ data, series }) {
  const [hover, setHover] = useState(null);
  const W = 640;
  const H = 240;
  const PT = 14;
  const PR = 14;
  const PB = 28;
  const PL = 42;
  const iw = W - PL - PR;
  const ih = H - PT - PB;
  const all = data.flatMap((d) => series.map((s) => Number(d[s.key] || 0)));
  const max = Math.max(1, ...all);
  const n = data.length;
  const x = (i) => PL + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v) => PT + ih - (Number(v) / max) * ih;
  const line = (key) => data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join(' ');
  const area = (key) => `${line(key)} L${x(n - 1).toFixed(1)},${PT + ih} L${x(0).toFixed(1)},${PT + ih} Z`;
  const gridY = [0, 0.25, 0.5, 0.75, 1].map((f) => PT + ih - f * ih);

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-label="line chart">
        <defs>
          {series.map((s, i) => (
            <linearGradient key={i} id={`lg-${i}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
            </linearGradient>
          ))}
        </defs>
        {gridY.map((gy, i) => (
          <line key={i} x1={PL} y1={gy} x2={W - PR} y2={gy} stroke="currentColor" strokeOpacity="0.08" strokeWidth="1" />
        ))}
        {gridY.map((gy, i) => (
          <text key={i} x={PL - 6} y={gy + 3.5} textAnchor="end" fontSize="10" fill="currentColor" fillOpacity="0.45">
            {Math.round(max * (1 - i / 4))}
          </text>
        ))}
        {series.map((s, i) => (
          <path key={`a${i}`} d={area(s.key)} fill={`url(#lg-${i})`} />
        ))}
        {series.map((s, i) => (
          <path key={`l${i}`} d={line(s.key)} fill="none" stroke={s.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {data.map((d, i) => (
          <circle key={`c${i}`} cx={x(i)} cy={y(d[series[0].key])} r="3" fill={series[0].color} opacity={hover === i ? 1 : 0} />
        ))}
        {data.length > 0 && n > 1 && data.map((d, i) => (
          <text key={`x${i}`} x={x(i)} y={H - 8} textAnchor="middle" fontSize="10" fill="currentColor" fillOpacity="0.45">
            {d.day.slice(5)}
          </text>
        ))}
        {hover != null && (
          <line x1={x(hover)} y1={PT} x2={x(hover)} y2={PT + ih} stroke="#94A3B8" strokeWidth="1" strokeDasharray="4 3" opacity="0.7" />
        )}
        <rect
          x={PL}
          y={PT}
          width={iw}
          height={ih}
          fill="transparent"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const px = ((e.clientX - rect.left) / rect.width) * iw + PL;
            let best = 0;
            let bd = Infinity;
            data.forEach((d, i) => {
              const dist = Math.abs(x(i) - px);
              if (dist < bd) { bd = dist; best = i; }
            });
            setHover(best);
          }}
          onMouseLeave={() => setHover(null)}
        />
      </svg>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        {series.map((s, i) => (
          <span key={i} className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
            {s.name}
            {hover != null && <b className="text-slate-800 dark:text-slate-100">{data[hover][s.key]}</b>}
          </span>
        ))}
      </div>
    </div>
  );
}

function CostBars({ data }) {
  const max = Math.max(0.0001, ...data.map((d) => Number(d.cost || 0)));
  const n = data.length;
  return (
    <div className="flex items-end gap-1 h-40">
      {data.map((d, i) => (
        <div key={d.day} className="flex-1 flex flex-col items-center gap-1 min-w-0 group" title={`${d.day}: $${Number(d.cost).toFixed(4)}`}>
          <div
            className="w-full rounded-t-lg transition-all"
            style={{
              height: `${Math.max(2, (Number(d.cost) / max) * 100)}%`,
              background: 'linear-gradient(180deg, #F59E0B, #EF4444)',
              opacity: 0.85,
            }}
          />
          <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-full">{d.day.slice(5)}</span>
        </div>
      ))}
      <span className="sr-only">{n} bars</span>
    </div>
  );
}

function AnalyticsSection() {
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);
  const [data, setData] = useState(null);
  const [toast, setToast] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getAdminAnalytics();
        setData(data);
      } catch (e) {
        setToast(e.response?.data?.error || 'Failed');
      }
    })();
  }, []);

  const cards = [
    { label: T('Total messages', '总消息数'), value: data?.totals?.count ?? 0, icon: '💬', grad: 'from-blue-500 to-indigo-600' },
    { label: T('Delivered', '已送达'), value: data?.totals?.delivered ?? 0, icon: '✅', grad: 'from-emerald-500 to-teal-600' },
    { label: T('Failed', '失败'), value: data?.totals?.failed ?? 0, icon: '❌', grad: 'from-rose-500 to-pink-600' },
    { label: T('Total cost', '总成本'), value: `$${Number(data?.totals?.cost || 0).toFixed(4)}`, icon: '💸', grad: 'from-amber-500 to-orange-600' },
  ];

  return (
    <div>
      <SectionHeader title={T('Analytics', '数据分析')} subtitle={T('Usage across all users & providers', '所有用户与提供商的用量')} />
      <Toast message={toast} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {cards.map((c) => (
          <Card key={c.label} className="relative overflow-hidden">
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${c.grad}`} />
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${c.grad} flex items-center justify-center text-lg shadow-sm shrink-0`}>
                {c.icon}
              </div>
              <div className="min-w-0">
                <div className="text-xl font-bold text-slate-900 dark:text-white truncate">{c.value}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{c.label}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-5">
        <Card>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3">{T('Delivery breakdown', '送达构成')}</h3>
          {data?.byStatus?.length ? <Donut data={data.byStatus} isZh={isZh} /> : <p className="text-sm text-slate-400 dark:text-slate-500">{T('No data', '暂无数据')}</p>}
        </Card>
        <Card>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3">{T('Top recipient numbers', '热门接收号码')}</h3>
          {data?.topNumbers?.length ? <TopNumbers data={data.topNumbers} /> : <p className="text-sm text-slate-400 dark:text-slate-500">{T('No data', '暂无数据')}</p>}
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-5 mb-5">
        <Card>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3">{T('Message volume (14 days)', '消息量（近 14 天）')}</h3>
          {data?.daily?.length ? (
            <LineChart
              data={data.daily}
              series={[
                { key: 'count', color: '#6366F1', name: T('Total', '总数') },
                { key: 'delivered', color: '#10B981', name: T('Delivered', '已送达') },
                { key: 'failed', color: '#EF4444', name: T('Failed', '失败') },
              ]}
            />
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500">{T('No activity', '暂无活动')}</p>
          )}
        </Card>
        <Card>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3">{T('Daily cost (14 days)', '每日成本（近 14 天）')}</h3>
          {data?.daily?.length ? <CostBars data={data.daily} /> : <p className="text-sm text-slate-400 dark:text-slate-500">{T('No activity', '暂无活动')}</p>}
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
            <span>{T('Last 14 days', '近 14 天')}</span>
            <span className="font-semibold text-amber-600 dark:text-amber-400">${Number(data?.totals?.cost || 0).toFixed(4)}</span>
          </div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3">{T('By provider', '按提供商')}</h3>
          {!data?.providers?.length ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">{T('No data', '暂无数据')}</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800"><th className="py-2 font-medium">{T('Provider', '提供商')}</th><th className="py-2 font-medium">{T('Messages', '消息数')}</th><th className="py-2 font-medium">{T('Cost', '成本')}</th></tr></thead>
              <tbody>
                {data.providers.map((p, i) => (
                  <tr key={p.name} className="border-b border-slate-50">
                    <td className="py-2 flex items-center gap-2 text-slate-800 dark:text-slate-100">
                      <span className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: `linear-gradient(135deg, ${['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'][i % 6]}, ${['#8B5CF6', '#06B6D4', '#F97316', '#EC4899', '#3B82F6', '#6366F1'][i % 6]})` }}>
                        {(p.name || '?').slice(0, 1).toUpperCase()}
                      </span>
                      {p.name}
                    </td>
                    <td className="py-2 text-slate-500 dark:text-slate-400">{p.messages}</td>
                    <td className="py-2 text-slate-500 dark:text-slate-400">${Number(p.cost).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3">{T('Top users', '活跃用户')}</h3>
          {!data?.topUsers?.length ? (
            <p className="text-sm text-slate-400 dark:text-slate-500">{T('No data', '暂无数据')}</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800"><th className="py-2 font-medium">{T('User', '用户')}</th><th className="py-2 font-medium">{T('Messages', '消息数')}</th><th className="py-2 font-medium">{T('Cost', '成本')}</th></tr></thead>
              <tbody>
                {data.topUsers.map((u, i) => (
                  <tr key={u.email} className="border-b border-slate-50">
                    <td className="py-2 flex items-center gap-2 text-slate-800 dark:text-slate-100">
                      <span className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-[11px] font-bold text-white shrink-0">
                        {(u.email || '?').slice(0, 1).toUpperCase()}
                      </span>
                      <span className="truncate max-w-[160px]">{u.email}</span>
                    </td>
                    <td className="py-2 text-slate-500 dark:text-slate-400">{u.messages}</td>
                    <td className="py-2 text-slate-500 dark:text-slate-400">${Number(u.cost).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  );
}

export default AnalyticsSection;
