import { Link } from 'react-router-dom';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

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
  const { theme } = useTheme();
  const items = [
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
          Everything you need to stay connected
        </h2>
        <p className="mt-4 text-center text-lg text-slate-600 max-w-2xl mx-auto">
          A complete cloud phone system for individuals and businesses.
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

function Pricing() {
  const { t } = useLanguage();
  const plans = [
    { name: 'Starter', price: '$10', features: ['1 number', '1,000 SMS/month', 'Unlimited US texting', '24/7 support'] },
    { name: 'Standard', price: '$20', features: ['Up to 10 numbers', '5,000 SMS/month', 'Voicemail transcription', 'Priority support'] },
    { name: 'Premier', price: '$30', features: ['Unlimited numbers', '15,000 SMS/month', 'Advanced reporting', 'Dedicated support'] },
  ];
  return (
    <div id="pricing" className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-center text-slate-900">
          Choose the right plan for you
        </h2>
        <p className="mt-4 text-center text-lg text-slate-600">
          Start free or pick a plan that grows with your business.
        </p>
        <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <div
              key={plan.name}
              className={`relative p-8 rounded-2xl ${
                i === 1
                  ? 'bg-gradient-to-b from-primary to-secondary text-white shadow-2xl scale-105 border-0'
                  : 'bg-white border border-slate-200 text-slate-900'
              }`}
            >
              {i === 1 && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-white text-primary text-xs font-bold shadow">
                  MOST POPULAR
                </span>
              )}
              <h3 className={`text-xl font-bold ${i === 1 ? 'text-white' : 'text-slate-900'}`}>{plan.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">{plan.price}</span>
                <span className={i === 1 ? 'text-white/70' : 'text-slate-500'}>/ user / month</span>
              </div>
              <ul className="mt-8 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className={`flex items-center gap-2 text-sm ${i === 1 ? 'text-white/90' : 'text-slate-600'}`}>
                    <span className={i === 1 ? 'text-white' : 'text-primary'}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link
                to="/register"
                className={`mt-8 block text-center py-3 rounded-xl font-semibold transition ${
                  i === 1
                    ? 'bg-white text-primary hover:bg-slate-100'
                    : 'bg-gradient-to-r from-primary to-secondary text-white hover:opacity-90'
                }`}
              >
                {t('nav.getStarted')}
              </Link>
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
      <Pricing />
      <Footer />
    </div>
  );
}
