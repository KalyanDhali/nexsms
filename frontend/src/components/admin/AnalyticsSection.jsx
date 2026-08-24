import { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { getAdminAnalytics } from '../../services/api.js';
import { SectionHeader, Card, Toast } from './ui.jsx';

function BarChart({ data, color }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="flex items-end gap-1 h-40">
      {data.map((d) => (
        <div key={d.day} className="flex-1 flex flex-col items-center gap-1 min-w-0">
          <div className="w-full rounded-t-lg transition-all" style={{ height: `${Math.max(4, (d.count / max) * 100)}%`, background: color, opacity: 0.85 }} />
          <span className="text-[10px] text-slate-400 truncate max-w-full">{d.day.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsSection() {
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
    { label: T('Total messages', '总消息数'), value: data?.totals?.count ?? 0 },
    { label: T('Delivered', '已送达'), value: data?.totals?.delivered ?? 0 },
    { label: T('Failed', '失败'), value: data?.totals?.failed ?? 0 },
    { label: T('Total cost', '总成本'), value: `$${Number(data?.totals?.cost || 0).toFixed(4)}` },
  ];

  return (
    <div>
      <SectionHeader title={T('Analytics', '数据分析')} subtitle={T('Usage across all users & providers', '所有用户与提供商的用量')} />
      <Toast message={toast} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {cards.map((c) => (
          <Card key={c.label}>
            <div className="text-xs text-slate-500">{c.label}</div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{c.value}</div>
          </Card>
        ))}
      </div>

      <Card className="mb-5">
        <h3 className="font-semibold text-slate-900 mb-3">{T('Messages (last 14 days)', '消息（近 14 天）')}</h3>
        {data?.daily?.length ? <BarChart data={data.daily} color="#4F46E5" /> : <p className="text-sm text-slate-400">{T('No activity', '暂无活动')}</p>}
      </Card>

      <div className="grid md:grid-cols-2 gap-5">
        <Card>
          <h3 className="font-semibold text-slate-900 mb-3">{T('By provider', '按提供商')}</h3>
          {!data?.providers?.length ? (
            <p className="text-sm text-slate-400">{T('No data', '暂无数据')}</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500 border-b border-slate-100"><th className="py-2 font-medium">{T('Provider', '提供商')}</th><th className="py-2 font-medium">{T('Messages', '消息数')}</th><th className="py-2 font-medium">{T('Cost', '成本')}</th></tr></thead>
              <tbody>
                {data.providers.map((p) => (
                  <tr key={p.name} className="border-b border-slate-50">
                    <td className="py-2 text-slate-800">{p.name}</td>
                    <td className="py-2 text-slate-500">{p.messages}</td>
                    <td className="py-2 text-slate-500">${Number(p.cost).toFixed(4)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-900 mb-3">{T('Top users', '活跃用户')}</h3>
          {!data?.topUsers?.length ? (
            <p className="text-sm text-slate-400">{T('No data', '暂无数据')}</p>
          ) : (
            <table className="w-full text-sm">
              <thead><tr className="text-left text-slate-500 border-b border-slate-100"><th className="py-2 font-medium">{T('User', '用户')}</th><th className="py-2 font-medium">{T('Messages', '消息数')}</th><th className="py-2 font-medium">{T('Cost', '成本')}</th></tr></thead>
              <tbody>
                {data.topUsers.map((u) => (
                  <tr key={u.email} className="border-b border-slate-50">
                    <td className="py-2 text-slate-800">{u.email}</td>
                    <td className="py-2 text-slate-500">{u.messages}</td>
                    <td className="py-2 text-slate-500">${Number(u.cost).toFixed(4)}</td>
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
