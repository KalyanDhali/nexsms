import { useEffect, useState } from 'react';
import { getAdminStats } from '../../services/api.js';
import { Card } from './ui.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

const STATS = [
  { key: 'users', icon: '👥', grad: 'from-blue-500 to-indigo-600' },
  { key: 'numbers', icon: '📞', grad: 'from-emerald-500 to-teal-600' },
  { key: 'providers', icon: '🛰️', grad: 'from-purple-500 to-fuchsia-600' },
  { key: 'messages', icon: '💬', grad: 'from-amber-500 to-orange-600' },
  { key: 'pendingDeposits', icon: '⏳', grad: 'from-rose-500 to-pink-600' },
  { key: 'activeSubscriptions', icon: '📦', grad: 'from-cyan-500 to-sky-600' },
  { key: 'revenue', icon: '💰', grad: 'from-emerald-500 to-green-600' },
];

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
    revenue: isZh ? '总收入' : 'Total revenue',
  };

  const money = (v) => `$${Number(v).toFixed(2)}`;

  const fmt = (key, v) => (key === 'revenue' ? money(v || 0) : v ?? 0);

  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{isZh ? '仪表盘' : 'Dashboard'}</h1>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{isZh ? '系统概览' : 'System overview'}</p>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-7 gap-3 md:gap-4 mb-6">
        {STATS.map(({ key, icon, grad, tint }) => (
          <Card key={key} className="relative overflow-hidden">
            <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${grad}`} />
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-lg shadow-sm mb-3`}>
              <span className="drop-shadow-sm">{icon}</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
              {fmt(key, stats?.[key])}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate">{labels[key]}</div>
          </Card>
        ))}
      </div>

      {!stats && (
        <div className="text-sm text-slate-400 dark:text-slate-500 text-center py-10">{isZh ? '加载中...' : 'Loading...'}</div>
      )}
    </div>
  );
}
