import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getUserAnalytics } from '../services/api.js';

const STATUS_COLORS = { sent: '#10b981', delivered: '#06b6d4', received: '#8b5cf6', failed: '#ef4444', pending: '#f59e0b', scheduled: '#a855f7', cancelled: '#94a3b8' };
const STATUS_LABELS = { sent: 'Sent', delivered: 'Delivered', received: 'Received', failed: 'Failed', pending: 'Pending', scheduled: 'Scheduled', cancelled: 'Cancelled' };

function Donut({ data, theme }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  if (!total) return <div className="text-sm text-slate-400 dark:text-slate-500 text-center py-6">No data</div>;
  let acc = 0;
  const R = 40, C = 2 * Math.PI * R;
  return (
    <div className="flex items-center gap-5 flex-wrap">
      <svg viewBox="0 0 100 100" className="w-36 h-36 shrink-0 -rotate-90">
        <circle cx="50" cy="50" r={R} fill="none" stroke="#e2e8f0" strokeWidth="12" className="dark:stroke-slate-700" />
        {data.map((d) => {
          const frac = d.count / total;
          const dash = frac * C;
          const off = -acc * C;
          acc += frac;
          const col = STATUS_COLORS[d.status] || theme.primary;
          return (
            <circle key={d.status} cx="50" cy="50" r={R} fill="none" stroke={col} strokeWidth="12"
              strokeDasharray={`${dash} ${C - dash}`} strokeDashoffset={off} strokeLinecap="butt">
              <title>{`${STATUS_LABELS[d.status] || d.status}: ${d.count}`}</title>
            </circle>
          );
        })}
      </svg>
      <div className="space-y-1.5 min-w-0">
        {data.map((d) => (
          <div key={d.status} className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: STATUS_COLORS[d.status] || theme.primary }} />
            <span className="text-slate-600 dark:text-slate-300 capitalize">{STATUS_LABELS[d.status] || d.status}</span>
            <span className="text-slate-400 dark:text-slate-500 text-xs">{d.count} · {Math.round((d.count / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BarChart({ data, theme }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div>
      <div className="flex items-end gap-[2px] h-40">
        {data.map((d) => (
          <div key={d.day} className="flex-1 flex flex-col items-center gap-1 min-w-0" title={`${d.day}: ${d.count} (${d.delivered} delivered)`}>
            <div className="w-full rounded-t bg-gradient-to-t from-primary to-indigo-400 transition-all" style={{ height: `${Math.max(3, (d.count / max) * 130)}px` }} />
          </div>
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
        <span>{data[0]?.day?.slice(5)}</span>
        <span>{data[Math.floor(data.length / 2)]?.day?.slice(5)}</span>
        <span>{data[data.length - 1]?.day?.slice(5)}</span>
      </div>
    </div>
  );
}

export default function AnalyticsSection() {
  const { theme } = useTheme();
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getUserAnalytics();
        setStats(data);
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const cards = [
    { label: T('Total messages', '总消息数'), value: stats?.totals?.count ?? 0 },
    { label: T('Delivered', '已送达'), value: stats?.totals?.delivered ?? 0 },
    { label: T('Pending', '处理中'), value: stats?.totals?.pending ?? 0 },
    { label: T('Failed', '失败'), value: stats?.totals?.failed ?? 0 },
    { label: T('Spent', '已花费'), value: `$${Number(stats?.totals?.cost || 0).toFixed(4)}` },
  ];

  const deliveryRate = stats?.totals?.count ? Math.round(((stats.totals.delivered + stats.totals.sent) / stats.totals.count) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <div className="text-xs text-slate-500 dark:text-slate-400">{c.label}</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-1">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{T('Delivery status', '投递状态')}</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
            {T(`Delivery rate: ${deliveryRate}%`, `投递率：${deliveryRate}%`)}
          </p>
          {loading ? <div className="text-sm text-slate-500">{T('Loading…', '加载中…')}</div> : <Donut data={stats?.byStatus || []} theme={theme} />}
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{T('Messages per day (30d)', '每日消息数（30 天）')}</h3>
          <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">{T('Last 30 days of activity', '最近 30 天的活动')}</p>
          {loading ? (
            <div className="text-sm text-slate-500">{T('Loading…', '加载中…')}</div>
          ) : !stats?.daily?.length ? (
            <div className="text-sm text-slate-400 dark:text-slate-500">{T('No message activity yet.', '暂无消息记录。')}</div>
          ) : (
            <BarChart data={stats.daily} theme={theme} />
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-3">{T('Top numbers', '号码排行')}</h3>
        {loading ? (
          <div className="text-sm text-slate-500">{T('Loading…', '加载中…')}</div>
        ) : !stats?.topNumbers?.length ? (
          <div className="text-sm text-slate-400 dark:text-slate-500">{T('No data yet.', '暂无数据。')}</div>
        ) : (
          <div className="space-y-2">
            {stats.topNumbers.map((n, i) => {
              const maxCount = stats.topNumbers[0].count;
              return (
                <div key={n.number} className="flex items-center gap-3">
                  <span className="w-5 text-sm text-slate-400 dark:text-slate-500 text-right shrink-0">{i + 1}</span>
                  <span className="font-mono text-sm text-slate-800 dark:text-slate-100 w-28 shrink-0 truncate">{n.number}</span>
                  <div className="flex-1 h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${Math.max(6, (n.count / maxCount) * 100)}%`, background: theme.primary }} />
                  </div>
                  <span className="shrink-0 text-xs text-slate-500 dark:text-slate-400">{n.count} · ${Number(n.cost).toFixed(4)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
