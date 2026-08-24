import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getUserAnalytics } from '../services/api.js';

function BarChart({ data, theme }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex items-end gap-2 h-36">
      {data.map((d) => (
        <div key={d.day} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div className="w-full rounded-t-lg transition-all"
            style={{ height: `${Math.max(4, (d.count / max) * 100)}%`, background: theme.primary, opacity: 0.85 }} />
          <span className="text-[10px] text-slate-400 truncate max-w-full">{d.day.slice(5)}</span>
        </div>
      ))}
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
    { label: T('Failed', '失败'), value: stats?.totals?.failed ?? 0 },
    { label: T('Spent', '已花费'), value: `$${Number(stats?.totals?.cost || 0).toFixed(4)}` },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500">{c.label}</div>
            <div className="text-xl font-bold text-slate-900 mt-1">{c.value}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="font-semibold text-slate-900 mb-3">{T('Messages per day', '每日消息数')}</h3>
        {loading ? (
          <div className="text-sm text-slate-500">{T('Loading…', '加载中…')}</div>
        ) : !stats?.daily?.length ? (
          <div className="text-sm text-slate-400">{T('No message activity yet.', '暂无消息记录。')}</div>
        ) : (
          <BarChart data={stats.daily} theme={theme} />
        )}
      </div>
    </div>
  );
}
