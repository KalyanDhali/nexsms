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
import FraudSection from '../components/admin/FraudSection.jsx';
import KycSection from '../components/admin/KycSection.jsx';
import SettingsSection from '../components/admin/SettingsSection.jsx';
import AnalyticsSection from '../components/admin/AnalyticsSection.jsx';
import ApiKeysSection from '../components/admin/ApiKeysSection.jsx';
import WhitelistSection from '../components/admin/WhitelistSection.jsx';

const SECTIONS = [
  { key: 'overview', icon: '■' },
  { key: 'analytics', icon: '≡' },
  { key: 'providers', icon: '◈' },
  { key: 'users', icon: '◉' },
  { key: 'numbers', icon: '☏' },
  { key: 'plans', icon: '▣' },
  { key: 'payments', icon: '◈' },
  { key: 'keys', icon: 'K' },
  { key: 'whitelist', icon: '◇' },
  { key: 'fraud', icon: '▲' },
  { key: 'kyc', icon: '✦' },
  { key: 'settings', icon: '⚙' },
];

export default function AdminPage() {
  const { user, logout } = useAuth();
  const { lang } = useLanguage();
  const { theme } = useTheme();
  const [section, setSection] = useState('overview');
  const [navOpen, setNavOpen] = useState(false);
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);

  const names = {
    overview: T('Overview', '概览'),
    analytics: T('Analytics', '数据分析'),
    providers: T('Providers', '提供商'),
    users: T('Users', '用户'),
    numbers: T('Numbers', '号码'),
    plans: T('Plans', '套餐'),
    payments: T('Payments', '支付'),
    keys: T('API Keys', 'API 密钥'),
    whitelist: T('IP Whitelist', 'IP 白名单'),
    fraud: T('Fraud', '防欺诈'),
    kyc: T('KYC', 'KYC'),
    settings: T('Settings', '设置'),
  };

  const render = () => {
    switch (section) {
      case 'analytics': return <AnalyticsSection />;
      case 'providers': return <ProvidersSection />;
      case 'users': return <UsersSection />;
      case 'numbers': return <NumbersSection />;
      case 'plans': return <PlansSection />;
      case 'payments': return <PaymentsSection />;
      case 'keys': return <ApiKeysSection />;
      case 'whitelist': return <WhitelistSection />;
      case 'fraud': return <FraudSection />;
      case 'kyc': return <KycSection />;
      case 'settings': return <SettingsSection />;
      default: return <OverviewSection />;
    }
  };

  return (
    <div className="h-dvh flex bg-slate-50 dark:bg-slate-950">
      {navOpen && (
        <div className="fixed inset-0 bg-black/40 z-30 lg:hidden" onClick={() => setNavOpen(false)} />
      )}
      <aside
        className={`w-56 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col shrink-0 fixed lg:static inset-y-0 left-0 z-40 transition-transform lg:translate-x-0 ${
          navOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5 px-4">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm">
            {theme.logo ? <img src={theme.logo} alt="" className="w-4 h-4 object-contain" /> : (theme.siteName || 'NexSMS').charAt(0)}
          </span>
          <span className="font-semibold text-slate-900 dark:text-white">{theme.siteName || 'NexSMS'}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold">ADMIN</span>
        </div>
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {SECTIONS.map(({ key, icon }) => (
            <button
              key={key}
              onClick={() => { setSection(key); setNavOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition ${
                section === key ? 'text-white' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
              }`}
              style={section === key ? { background: theme.primary } : {}}
            >
              <span className="text-base">{icon}</span>
              {names[key]}
            </button>
          ))}
        </nav>
        <div className="border-t border-slate-200 dark:border-slate-800 p-3">
          <div className="text-xs text-slate-500 dark:text-slate-400 mb-2 truncate">{user?.email}</div>
          <button
            onClick={logout}
            className="w-full text-left px-3 py-1.5 rounded-lg text-sm text-red-500 hover:bg-red-50 transition"
          >
            {T('Logout', '退出')}
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="lg:hidden sticky top-0 z-20 flex items-center gap-2 mb-3 -mx-1 px-1 py-3 bg-slate-50/95 dark:bg-slate-950/95 backdrop-blur">
          <button
            onClick={() => setNavOpen(true)}
            aria-label="Open admin menu"
            className="p-2 -ml-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <span className="font-semibold text-slate-900 dark:text-white">{names[section]}</span>
          {user?.email && <span className="ml-auto text-xs text-slate-400 truncate max-w-[45%]">{user.email}</span>}
        </div>
        {render()}
      </main>
    </div>
  );
}
