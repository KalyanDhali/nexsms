import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import OverviewSection from '../components/admin/OverviewSection.jsx';
import ProvidersSection from '../components/admin/ProvidersSection.jsx';
import UsersSection from '../components/admin/UsersSection.jsx';
import NumbersSection from '../components/admin/NumbersSection.jsx';
import PlansSection from '../components/admin/PlansSection.jsx';
import PaymentsSection from '../components/admin/PaymentsSection.jsx';
import SettingsSection from '../components/admin/SettingsSection.jsx';

const SECTIONS = [
  { key: 'overview', icon: '📊' },
  { key: 'providers', icon: '🛰️' },
  { key: 'users', icon: '👥' },
  { key: 'numbers', icon: '📞' },
  { key: 'plans', icon: '📦' },
  { key: 'payments', icon: '💳' },
  { key: 'settings', icon: '⚙️' },
];

export default function AdminPage() {
  const { user, logout } = useAuth();
  const { lang } = useLanguage();
  const { theme } = useTheme();
  const [section, setSection] = useState('overview');
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);

  const names = {
    overview: T('Overview', '概览'),
    providers: T('Providers', '提供商'),
    users: T('Users', '用户'),
    numbers: T('Numbers', '号码'),
    plans: T('Plans', '套餐'),
    payments: T('Payments', '支付'),
    settings: T('Settings', '设置'),
  };

  const render = () => {
    switch (section) {
      case 'providers': return <ProvidersSection />;
      case 'users': return <UsersSection />;
      case 'numbers': return <NumbersSection />;
      case 'plans': return <PlansSection />;
      case 'payments': return <PaymentsSection />;
      case 'settings': return <SettingsSection />;
      default: return <OverviewSection />;
    }
  };

  return (
    <div className="h-screen flex bg-slate-50">
      <aside className="w-56 border-r border-slate-200 bg-white flex flex-col shrink-0">
        <div className="h-14 border-b border-slate-200 flex items-center gap-2.5 px-4">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm">N</span>
          <span className="font-semibold text-slate-900">{theme.siteName || 'NexSMS'}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-semibold">ADMIN</span>
        </div>
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {SECTIONS.map(({ key, icon }) => (
            <button
              key={key}
              onClick={() => setSection(key)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                section === key ? 'text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
              style={section === key ? { background: theme.primary } : {}}
            >
              <span className="text-base">{icon}</span>
              {names[key]}
            </button>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <div className="text-xs text-slate-500 mb-2 truncate">{user?.email}</div>
          <button
            onClick={logout}
            className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-red-500 hover:bg-red-50 transition"
          >
            {T('Logout', '退出')}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-6">
        {render()}
      </main>
    </div>
  );
}
