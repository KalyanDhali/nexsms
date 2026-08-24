import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import api from '../services/api.js';

function Navbar() {
  const { t } = useLanguage();
  const { theme } = useTheme();
  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">N</span>
              <span className="text-lg font-bold text-slate-900">{theme.siteName}</span>
            </Link>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
              <a href="#features" className="hover:text-slate-900 transition">{t('nav.features')}</a>
              <a href="#pricing" className="hover:text-slate-900 transition">{t('nav.pricing')}</a>
              <a href="#security" className="hover:text-slate-900 transition">{t('nav.security')}</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-700 hover:text-slate-900 transition px-3 py-2">
              {t('nav.login')}
            </Link>
            <Link
              to="/register"
              className="text-sm font-semibold text-white px-4 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary hover:opacity-90 transition shadow-sm"
            >
              {t('nav.getStarted')}
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  const { t } = useLanguage();
  return (
    <div className="relative overflow-hidden bg-slate-950 pt-32 pb-20">
      <div className="absolute inset-0">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-primary/30 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[600px] h-[600px] rounded-full bg-secondary/30 blur-[120px]" />
      </div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight max-w-4xl mx-auto">
          {t('hero.title')}
        </h1>
        <p className="mt-6 text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto">
          {t('hero.subtitle')}
        </p>
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link
            to="/register"
            className="px-8 py-3.5 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold text-lg hover:opacity-90 transition shadow-lg"
          >
            {t('nav.getStarted')}
          </Link>
          <Link
            to="/login"
            className="px-8 py-3.5 rounded-xl border border-slate-700 text-slate-200 font-semibold text-lg hover:bg-slate-800 transition"
          >
            {t('nav.login')}
          </Link>
        </div>
        <div className="mt-16 animate-float">
          <ChatPreview />
        </div>
      </div>
    </div>
  );
}

function ChatPreview() {
  return (
    <div className="max-w-4xl mx-auto rounded-2xl border border-slate-700/60 bg-slate-900/90 shadow-2xl overflow-hidden backdrop-blur-sm">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700/60">
        <span className="w-3 h-3 rounded-full bg-red-500/70" />
        <span className="w-3 h-3 rounded-full bg-yellow-500/70" />
        <span className="w-3 h-3 rounded-full bg-green-500/70" />
        <span className="ml-4 text-xs text-slate-400">voice.nexsms.app/u/0/messages</span>
      </div>
      <div className="flex h-80">
        <div className="w-1/3 border-r border-slate-700/60 p-3 space-y-3">
          <div className="px-3 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-white text-sm font-semibold">
            + Send new message
          </div>
          {[
            ['+1 (650) 769-0192', 'Good day! Confirming your order...', true],
            ['Elizabeth Chen', 'The package arrived, thank you!', false],
            ['+1 (213) 461-4228', 'Hi Kayla! Are you available?', false],
          ].map(([name, preview, active]) => (
            <div
              key={name}
              className={`px-3 py-2.5 rounded-xl ${active ? 'bg-primary/20 border border-primary/30' : 'hover:bg-slate-800/50'} cursor-pointer transition`}
            >
              <div className="text-sm font-semibold text-slate-100">{name}</div>
              <div className="text-xs text-slate-400 truncate">{preview}</div>
            </div>
          ))}
        </div>
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-3 border-b border-slate-700/60 text-sm font-semibold text-slate-200">
            +1 (650) 769-0192
          </div>
          <div className="flex-1 p-4 space-y-3 overflow-hidden">
            <div className="flex justify-end">
              <div className="max-w-[70%] px-4 py-2.5 rounded-2xl rounded-br-sm bg-gradient-to-r from-primary to-secondary text-white text-sm">
                Hello! Your order is confirmed. Thank you!
              </div>
            </div>
            <div className="flex justify-start">
              <div className="max-w-[70%] px-4 py-2.5 rounded-2xl rounded-bl-sm bg-slate-800 text-slate-200 text-sm">
                Great, when will it arrive?
              </div>
            </div>
            <div className="flex justify-end">
              <div className="max-w-[70%] px-4 py-2.5 rounded-2xl rounded-br-sm bg-gradient-to-r from-primary to-secondary text-white text-sm">
                By Friday. Tracking: NX-4821
              </div>
            </div>
          </div>
          <div className="px-4 py-3 border-t border-slate-700/60 flex items-center gap-2">
            <div className="flex-1 px-4 py-2 rounded-xl bg-slate-800 text-slate-400 text-sm">
              Type a message...
            </div>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-primary to-secondary flex items-center justify-center text-white">
              ➤
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Features() {
  const { lang } = useLanguage();
  const { theme } = useTheme();
  const isZh = lang === 'zh';
  const items = isZh
    ? [
        ['灵活', '您的号码可在移动端、桌面端以及任何需要保持连接的地方使用。'],
        ['智能', '智能收件箱过滤垃圾信息，让重要对话始终置顶。'],
        ['易于管理', '号码分配、账单管理和全部控制尽在一个面板。'],
        ['可靠', '由多个短信提供商保驾护航的可靠投递。'],
        ['多号码', '分配多个号码，可从任意号码发送。'],
        ['开发者友好', '为开发者提供 API、Webhooks 和模板。'],
      ]
    : [
        ['Flexible', 'Your line works on mobile, desktop, and everywhere you need to stay connected.'],
        ['Helpful', 'Smart inbox filters spam and keeps important conversations on top.'],
        ['Easy to manage', 'Assign numbers, manage billing, and control everything from one panel.'],
        ['Trusted', 'Reliable delivery backed by multiple SMS providers.'],
        ['Multi-number', 'Assign multiple numbers and send from any of them.'],
        ['Integrated', 'APIs, webhooks, and templates for developers.'],
      ];
  return (
    <div id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-slate-900">
          {isZh ? '保持连接所需的一切' : 'Everything you need to stay connected'}
        </h2>
        <p className="mt-4 text-center text-lg text-slate-600 max-w-2xl mx-auto">
          {isZh ? '面向个人和企业的完整云端电话系统。' : 'A complete cloud phone system for individuals and businesses.'}
        </p>
        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(([title, desc], i) => (
            <div
              key={title}
              className="p-6 rounded-2xl border border-slate-200 bg-slate-50/50 hover:border-primary/40 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold mb-4">
                {i + 1}
              </div>
              <h3 className="text-lg font-bold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm text-slate-600 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stats() {
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const [stats, setStats] = useState({ availableNumbers: 0, activeProviders: 0, messagesSent: 0, users: 0 });
  useEffect(() => {
    api.get('/public/stats').then((r) => setStats(r.data)).catch(() => {});
  }, []);
  const items = [
    [Number(stats.availableNumbers).toLocaleString(), isZh ? '可用号码' : 'Available numbers'],
    [Number(stats.messagesSent).toLocaleString(), isZh ? '已发送短信' : 'SMS delivered'],
    [Number(stats.activeProviders).toLocaleString(), isZh ? '接入提供商' : 'SMS providers'],
    [Number(stats.users).toLocaleString(), isZh ? '活跃用户' : 'Active users'],
  ];
  return (
    <div className="bg-slate-950 py-14 border-t border-slate-800">
      <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {items.map(([num, label]) => (
          <div key={label}>
            <div className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{num}</div>
            <div className="mt-1 text-sm text-slate-400">{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Pricing() {
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const [plans, setPlans] = useState([]);

  useEffect(() => {
    api.get('/plans').then((r) => setPlans(r.data.plans || [])).catch(() => {});
  }, []);

  const planFeatures = (p) => {
    const f = Array.isArray(p.features) ? p.features : [];
    const extra = [
      `${Number(p.sms_quota).toLocaleString()} ${isZh ? '条短信/月' : 'SMS/month'}`,
      `${p.daily_limit_per_number ?? 50} ${isZh ? '条/号码/日' : 'per number/day'}`,
      ...f,
    ];
    return extra;
  };

  const mostPopular = (p) => p.slug === 'standard' || plans.length > 1 && p.sort_order === plans[Math.min(1, plans.length - 1)].sort_order;

  return (
    <div id="pricing" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-slate-900">
          {isZh ? '选择适合您的套餐' : 'Choose the right plan for you'}
        </h2>
        <p className="mt-4 text-center text-lg text-slate-600">
          {isZh ? '免费开始，或选择随业务成长的套餐。' : 'Start free or pick a plan that grows with your business.'}
        </p>
        <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.length === 0 && (
            <div className="md:col-span-3 text-center text-slate-400">
              {isZh ? '套餐加载中…' : 'Loading plans…'}
            </div>
          )}
          {plans.map((plan, i) => {
            const hot = mostPopular(plan);
            return (
              <div
                key={plan.id}
                className={`relative p-8 rounded-2xl ${
                  hot
                    ? 'bg-gradient-to-b from-primary to-secondary text-white shadow-2xl scale-105 border-0'
                    : 'bg-white border border-slate-200 text-slate-900'
                }`}
              >
                {hot && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-white text-primary text-xs font-bold shadow">
                    {isZh ? '最受欢迎' : 'MOST POPULAR'}
                  </span>
                )}
                <h3 className={`text-xl font-bold ${hot ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
                {plan.description && (
                  <p className={`mt-1 text-sm ${hot ? 'text-white/80' : 'text-slate-500'}`}>{plan.description}</p>
                )}
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">${Number(plan.price).toLocaleString()}</span>
                  <span className={hot ? 'text-white/70' : 'text-slate-500'}>/ {isZh ? '月' : 'month'}</span>
                </div>
                <ul className="mt-8 space-y-3">
                  {planFeatures(plan).map((f) => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${hot ? 'text-white/90' : 'text-slate-600'}`}>
                      <span className={hot ? 'text-white' : 'text-primary'}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={`mt-8 block text-center py-3 rounded-xl font-semibold transition ${
                    hot
                      ? 'bg-white text-primary hover:bg-slate-100'
                      : 'bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90'
                  }`}
                >
                  {isZh ? '开始使用' : 'Get started'}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Security() {
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const badges = isZh
    ? [
        ['多提供商故障转移', '单点故障自动切换，保障短信送达率。'],
        ['多层防欺诈', '风控评分、Flash-USDT 检测与 IP 黑名单。'],
        ['8 种支付网关', 'Binance Pay、Bybit、Stripe、TRC20 等自由选择。'],
        ['KYC 与合规', '可选的实名认证与号码合规管理。'],
      ]
    : [
        ['Multi-provider failover', 'Automatic failover between providers keeps your messages delivered.'],
        ['Multi-layer fraud protection', 'Risk scoring, Flash-USDT detection and IP blocklist built in.'],
        ['8 payment gateways', 'Binance Pay, Bybit, Stripe, TRC20 and more — your choice.'],
        ['KYC & compliance', 'Optional identity verification and number compliance management.'],
      ];
  return (
    <div id="security" className="py-24 bg-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-slate-900">
          {isZh ? '安全与可信赖' : 'Secure by design'}
        </h2>
        <p className="mt-4 text-center text-lg text-slate-600 max-w-2xl mx-auto">
          {isZh ? '从投递到支付，每一层都为安全与合规构建。' : 'From delivery to payments, every layer is built for security and compliance.'}
        </p>
        <div className="mt-12 grid sm:grid-cols-2 gap-6">
          {badges.map(([title, desc]) => (
            <div key={title} className="flex gap-4 p-6 rounded-2xl border border-slate-200 bg-slate-50/60">
              <div className="w-11 h-11 shrink-0 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 font-bold text-lg">
                ✓
              </div>
              <div>
                <h3 className="font-bold text-slate-900">{title}</h3>
                <p className="mt-1 text-sm text-slate-600 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Footer() {
  const { theme } = useTheme();
  return (
    <footer className="bg-slate-950 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">N</span>
          <span className="font-bold text-white">{theme.siteName}</span>
        </div>
        <p className="text-sm text-slate-500">© 2026 {theme.siteName}. All rights reserved.</p>
      </div>
    </footer>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <Features />
      <Stats />
      <Pricing />
      <Security />
      <Footer />
    </div>
  );
}
