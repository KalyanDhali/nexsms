import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import api from '../services/api.js';

function Navbar() {
  const { t, lang } = useLanguage();
  const isZh = lang === 'zh';
  const { theme } = useTheme();
  return (
    <nav className="fixed top-0 inset-x-0 z-50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">N</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white">{theme.siteName}</span>
            </Link>
            <div className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
              <a href="#features" className="hover:text-slate-900 dark:hover:text-white transition">{t('nav.features')}</a>
              <a href="#pricing" className="hover:text-slate-900 dark:hover:text-white transition">{t('nav.pricing')}</a>
              <a href="#security" className="hover:text-slate-900 dark:hover:text-white transition">{t('nav.security')}</a>
              <a href="#reviews" className="hover:text-slate-900 dark:hover:text-white transition">{isZh ? '评价' : 'Reviews'}</a>
              <a href="#faq" className="hover:text-slate-900 dark:hover:text-white transition">{isZh ? '常见问题' : 'FAQ'}</a>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition px-3 py-2">
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
    <div id="features" className="py-24 bg-white dark:bg-slate-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-slate-900 dark:text-white">
          {isZh ? '保持连接所需的一切' : 'Everything you need to stay connected'}
        </h2>
        <p className="mt-4 text-center text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          {isZh ? '面向个人和企业的完整云端电话系统。' : 'A complete cloud phone system for individuals and businesses.'}
        </p>
        <div className="mt-16 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map(([title, desc], i) => (
            <div
              key={title}
              className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 hover:border-primary/40 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold mb-4">
                {i + 1}
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{desc}</p>
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
    <div id="pricing" className="py-24 bg-slate-50 dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-slate-900 dark:text-white">
          {isZh ? '选择适合您的套餐' : 'Choose the right plan for you'}
        </h2>
        <p className="mt-4 text-center text-lg text-slate-600 dark:text-slate-300">
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
                    : 'bg-white dark:bg-slate-900 dark:border-slate-700 border border-slate-200 text-slate-900 dark:text-white'
                }`}
              >
                {hot && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-white text-primary text-xs font-bold shadow">
                    {isZh ? '最受欢迎' : 'MOST POPULAR'}
                  </span>
                )}
                <h3 className={`text-xl font-bold ${hot ? 'text-white' : 'text-slate-900 dark:text-white'}`}>{plan.name}</h3>
                {plan.description && (
                  <p className={`mt-1 text-sm ${hot ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>{plan.description}</p>
                )}
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold">${Number(plan.price).toLocaleString()}</span>
                  <span className={hot ? 'text-white/70' : 'text-slate-500 dark:text-slate-400'}>/ {isZh ? '月' : 'month'}</span>
                </div>
                <ul className="mt-8 space-y-3">
                  {planFeatures(plan).map((f) => (
                    <li key={f} className={`flex items-center gap-2 text-sm ${hot ? 'text-white/90' : 'text-slate-600 dark:text-slate-300'}`}>
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
    <div id="security" className="py-24 bg-white dark:bg-slate-950">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-slate-900 dark:text-white">
          {isZh ? '安全与可信赖' : 'Secure by design'}
        </h2>
        <p className="mt-4 text-center text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">
          {isZh ? '从投递到支付，每一层都为安全与合规构建。' : 'From delivery to payments, every layer is built for security and compliance.'}
        </p>
        <div className="mt-12 grid sm:grid-cols-2 gap-6">
          {badges.map(([title, desc]) => (
            <div key={title} className="flex gap-4 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60">
              <div className="w-11 h-11 shrink-0 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-lg">
                ✓
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white">{title}</h3>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Faq() {
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const [open, setOpen] = useState(0);
  const items = isZh
    ? [
        ['我可以免费开始吗？', '可以。您可免费注册并测试我们的短信发送。需要正式发送时再充值或选择套餐。'],
        ['号码是如何分配的？', '我们提供一个号码池。管理员可将号码分配给您，系统也支持自助分配（如开启）。每个号码都有每日发送上限。'],
        ['支持哪些支付方式？', '我们支持多种支付网关，包括银行卡、加密货币（USDT、BTC、TRC20 等）以及币安支付、Stripe 等。'],
        ['发送失败会扣费吗？', '已发送的消息会按运营商计费。失败的消息可能不产生费用，具体取决于运营商状态报告。'],
        ['什么是批量群发？', '您可以向联系人列表或号码列表一次性群发短信，并设置每批间隔以避免触发限流。'],
        ['我可以自定义品牌吗？', '可以。管理员可设置站点名称、Logo、主题色与字体，整个界面会随之更新。'],
        ['短信多久能送达？', '大多数消息在几秒内送达。实际速度取决于运营商与目标网络。'],
      ]
    : [
        ['Can I start for free?', 'Yes. Register free and test SMS sending. When you are ready to send for real, top up or pick a plan.'],
        ['How are numbers assigned?', 'We maintain a number pool. An administrator can assign a number to you, and self-assignment is also available when enabled. Each number has a daily send limit.'],
        ['Which payment methods are supported?', 'We support multiple gateways including cards, crypto (USDT, BTC, TRC20 and more) as well as Binance Pay, Stripe and others.'],
        ['Am I charged for failed messages?', 'Messages that are sent are billed by the carrier. Failed messages may not be charged, depending on the carrier status report.'],
        ['What is bulk blast?', 'Send one message to a whole contact list or number list at once, with configurable delays between batches to stay within rate limits.'],
        ['Can I customise the branding?', 'Yes. Administrators can set the site name, logo, theme colours and font, and the whole interface updates.'],
        ['How fast are messages delivered?', 'Most messages arrive within seconds. Actual speed depends on the carrier and destination network.'],
      ];
  return (
    <div id="faq" className="py-24 bg-slate-50 dark:bg-slate-900 scroll-mt-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-slate-900 dark:text-white">
          {isZh ? '常见问题' : 'Frequently asked questions'}
        </h2>
        <p className="mt-4 text-center text-lg text-slate-600 dark:text-slate-300">
          {isZh ? '关于 NexSMS 的常见问题' : 'Common questions about NexSMS'}
        </p>
        <div className="mt-12 space-y-3">
          {items.map(([q, a], i) => (
            <div key={q} className="border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 overflow-hidden">
              <button
                onClick={() => setOpen(open === i ? -1 : i)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
              >
                <span className="font-semibold text-slate-900 dark:text-white">{q}</span>
                <span className={`shrink-0 w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm transition-transform ${open === i ? 'rotate-45' : ''}`}>+</span>
              </button>
              {open === i && (
                <div className="px-5 pb-5 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{a}</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Reviews() {
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const items = isZh
    ? [
        ['陈晓','跨境电商运营','群发功能很稳，定时发送和按批间隔很贴心，客户短信送达率比之前用的服务高很多。',5],
        ['李娜','独立开发者','API 和 Webhook 接入很简单，文档清晰，一小时就接好了我的通知系统。',5],
        ['Alex','市场经理','多号码管理太方便了，团队每人一个号码，客服再也不会混线。',4],
        ['Sophie','电商店主','充值和账单很透明，客服回复也快。退款政策也清楚，用得很放心。',5],
        ['王强','机构负责人','定时发送和按批间隔让我们的营销活动井井有条，客户很满意。',5],
        ['赵敏','客服主管','Webhook 把收到的短信直接接入我们的 CRM，每周省下大量手动操作。',4],
      ]
    : [
        ['James Carter','E-commerce Operations','The bulk blast with configurable delays is rock solid. Delivery rates are noticeably better than the service we used before.',5],
        ['Priya Nair','Independent Developer','The API and webhooks were trivial to integrate. Clear docs — I had my notification system wired up within the hour.',4],
        ['Alex R.','Marketing Manager','Multi-number management is a lifesaver. Each teammate has their own number so support conversations never mix. Our team couldn\'t be happier.',5],
        ['Emma L.','Online Store Owner','Billing is transparent and support responds fast. The refund policy is clear too, which makes me confident using it.',5],
        ['Tomás R.','Agency Owner','Scheduling and per-send delays let us stagger campaigns like clockwork. Clients notice the difference.',5],
        ['Aisha K.','Support Team Lead','Webhooks route inbound messages straight into our CRM. Saved us hours of manual work every week.',4],
      ];

  const [perView, setPerView] = useState(1);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchX = useRef(null);

  useEffect(() => {
    const update = () => setPerView(window.innerWidth >= 1024 ? 3 : window.innerWidth >= 640 ? 2 : 1);
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const pages = [];
  for (let i = 0; i < items.length; i += perView) pages.push(items.slice(i, i + perView));
  const pageCount = Math.max(1, pages.length);

  useEffect(() => {
    if (index > pageCount - 1) setIndex(pageCount - 1);
  }, [index, pageCount]);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % pageCount), 5000);
    return () => clearInterval(id);
  }, [paused, pageCount]);

  const go = (d) => setIndex((i) => (i + d + pageCount) % pageCount);

  const reviewCard = ([name, role, text, stars]) => (
    <div key={name} className="p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/60 flex flex-col h-full">
      <div className="flex items-center gap-1 text-amber-400 mb-4" aria-label={`${stars} stars`}>
        {[1,2,3,4,5].map((s) => (
          <svg key={s} viewBox="0 0 20 20" className={`w-4 h-4 ${s <= stars ? 'fill-amber-400' : 'fill-slate-300 dark:fill-slate-700'}`}><path d="M10 1l2.6 5.3 5.9.9-4.3 4.1 1 5.8L10 14.9 4.8 17.1l1-5.8L1.5 7.2l5.9-.9z"/></svg>
        ))}
      </div>
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300 flex-1">"{text}"</p>
      <div className="mt-5 flex items-center gap-3">
        <span className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm">{name.charAt(0)}</span>
        <div>
          <div className="text-sm font-semibold text-slate-900 dark:text-white">{name}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{role}</div>
        </div>
      </div>
    </div>
  );

  const arrowCls = "absolute top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-indigo-600 dark:hover:text-indigo-400 transition disabled:opacity-30 disabled:cursor-not-allowed z-10";

  return (
    <div id="reviews" className="py-24 bg-white dark:bg-slate-950 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-slate-900 dark:text-white">
          {isZh ? '用户评价' : 'What our users say'}
        </h2>
        <p className="mt-4 text-center text-lg text-slate-600 dark:text-slate-300">
          {isZh ? '来自真实用户的反馈' : 'Feedback from real users'}
        </p>
        <div
          className="mt-16 relative"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onTouchStart={(e) => { touchX.current = e.touches[0].clientX; }}
          onTouchEnd={(e) => {
            if (touchX.current == null) return;
            const dx = e.changedTouches[0].clientX - touchX.current;
            touchX.current = null;
            if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
          }}
        >
          <button
            type="button"
            onClick={() => go(-1)}
            disabled={pageCount <= 1}
            className={`${arrowCls} left-0 sm:-left-4`}
            aria-label={isZh ? '上一条' : 'Previous reviews'}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <button
            type="button"
            onClick={() => go(1)}
            disabled={pageCount <= 1}
            className={`${arrowCls} right-0 sm:-right-4`}
            aria-label={isZh ? '下一条' : 'Next reviews'}
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
          </button>

          <div className="overflow-hidden rounded-2xl">
            <div
              className="flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${index * 100}%)` }}
            >
              {pages.map((page, pi) => (
                <div key={pi} className="w-full shrink-0 grid gap-6 px-1 sm:px-2" style={{ gridTemplateColumns: `repeat(${perView}, minmax(0, 1fr))` }}>
                  {page.map(reviewCard)}
                </div>
              ))}
            </div>
          </div>

          {pageCount > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              {pages.map((_, pi) => (
                <button
                  key={pi}
                  type="button"
                  onClick={() => setIndex(pi)}
                  className={`h-2 rounded-full transition-all duration-300 ${pi === index ? 'w-7 bg-indigo-500 dark:bg-indigo-400' : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600'}`}
                  aria-label={isZh ? `转到第 ${pi + 1} 页` : `Go to slide ${pi + 1}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Footer() {
  const { theme } = useTheme();
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const links = [
    { to: '/terms', label: isZh ? '服务条款' : 'Terms' },
    { to: '/privacy', label: isZh ? '隐私政策' : 'Privacy' },
    { to: '/refund', label: isZh ? '退款政策' : 'Refunds' },
    { to: '/#faq', label: isZh ? '常见问题' : 'FAQ' },
    { to: '/#reviews', label: isZh ? '用户评价' : 'Reviews' },
  ];
  return (
    <footer className="bg-slate-950 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold">N</span>
            <span className="font-bold text-white">{theme.siteName}</span>
          </div>
          <p className="text-sm text-slate-500">© 2026 {theme.siteName}. All rights reserved.</p>
        </div>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {links.map((l) => (
            <Link key={l.to} to={l.to} className="text-sm text-slate-400 hover:text-white transition">{l.label}</Link>
          ))}
        </div>
      </div>
    </footer>
  );
}

export default function HomePage() {
  const { hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '');
      const el = document.getElementById(id);
      if (el) {
        setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    }
  }, [hash]);
  return (
    <div className="min-h-dvh bg-white dark:bg-slate-950">
      <Navbar />
      <Hero />
      <Features />
      <Stats />
      <Pricing />
      <Security />
      <Reviews />
      <Faq />
      <Footer />
    </div>
  );
}
