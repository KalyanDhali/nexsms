import { useEffect, useState } from 'react';
import { getAdminStats } from '../../services/api.js';
import { Card } from './ui.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

const STAT_ICONS = {
  users: '👥',
  numbers: '📞',
  providers: '🛰️',
  messages: '💬',
  pendingDeposits: '⏳',
  activeSubscriptions: '📦',
};

export default function OverviewSection() {
  const [stats, setStats] = useState(null);
  const { lang } = useLanguage();
  const isZh = lang === 'zh';

  useEffect(() => {
    getAdminStats().then(({ data }) => setStats(data.stats)).catch(() => {});
  }, []);

  const labels = {
    users: isZh ? '用户' : 'Users',
    numbers: isZh ? '号码' : 'Numbers',
    providers: isZh ? '提供商' : 'Providers',
    messages: isZh ? '消息' : 'Messages',
    pendingDeposits: isZh ? '待处理充值' : 'Pending deposits',
    activeSubscriptions: isZh ? '活跃订阅' : 'Active subscriptions',
  };

  const money = (v) => `$${Number(v).toFixed(2)}`;

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-1">{isZh ? '仪表盘' : 'Dashboard'}</h1>
      <p className="text-sm text-slate-500 mb-6">{isZh ? '系统概览' : 'System overview'}</p>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
        {stats &&
          Object.entries(labels).map(([key, label]) => (
            <Card key={key}>
              <div className="text-2xl mb-2">{STAT_ICONS[key]}</div>
              <div className="text-2xl font-bold text-slate-900">
                {key === 'revenue' ? money(stats[key] || 0) : stats[key] ?? 0}
              </div>
              <div className="text-xs text-slate-500 mt-1">{label}</div>
            </Card>
          ))}
        <Card>
          <div className="text-2xl mb-2">💰</div>
          <div className="text-2xl font-bold text-slate-900">{money(stats?.revenue || 0)}</div>
          <div className="text-xs text-slate-500 mt-1">{isZh ? '总收入' : 'Total revenue'}</div>
        </Card>
      </div>

      {!stats && (
        <div className="text-sm text-slate-400 text-center py-10">{isZh ? '加载中...' : 'Loading...'}</div>
      )}
    </div>
  );
}
