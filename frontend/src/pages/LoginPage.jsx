import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

export default function LoginPage() {
  const { t, lang } = useLanguage();
  const { theme } = useTheme();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);
  const { login, completeTwoFactorLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [twoFaToken, setTwoFaToken] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await login(email, password);
    setLoading(false);
    if (res.ok) {
      navigate('/dashboard', { replace: true });
    } else if (res.twoFaRequired) {
      setTwoFaToken(res.twoFaToken);
    } else {
      setError(res.error);
    }
  };

  const handleCode = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const res = await completeTwoFactorLogin(twoFaToken, code);
    setLoading(false);
    if (res.ok) {
      navigate('/dashboard', { replace: true });
    } else {
      setError(res.error);
    }
  };

  const inputCls = "w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition";

  return (
    <div className="min-h-dvh bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-8">
          <Link to="/" className="flex items-center justify-center gap-2 mb-8">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-lg">
              {theme?.logo ? <img src={theme.logo} alt="" className="w-6 h-6 object-contain" /> : (theme?.siteName || 'NexSMS').charAt(0)}
            </span>
            <span className="text-xl font-bold text-slate-900 dark:text-white">{theme?.siteName || 'NexSMS'}</span>
          </Link>

          {twoFaToken ? (
            <>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white text-center">{T('Two-Factor Authentication', '两步验证')}</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center">
                {T('Enter the 6-digit code sent to your email', '请输入发送到您邮箱的 6 位代码')}
              </p>
              <form onSubmit={handleCode} className="mt-8 space-y-4">
                <input
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className={`${inputCls} text-center text-2xl tracking-[0.5em]`}
                  placeholder="••••••"
                  autoFocus
                />
                {error && (
                  <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading || code.length !== 6}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  {loading ? '...' : T('Verify & Sign In', '验证并登录')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTwoFaToken('');
                    setCode('');
                    setError('');
                  }}
                  className="w-full py-2 text-sm text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition"
                >
                  {T('Back to login', '返回登录')}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white text-center">{t('auth.login')}</h1>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 text-center">{t('hero.subtitle')}</p>
              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('auth.email')}</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">{t('auth.password')}</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={inputCls}
                    placeholder="••••••••"
                  />
                </div>
                {error && (
                  <div className="px-4 py-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-sm">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold hover:opacity-90 transition disabled:opacity-50"
                >
                  {loading ? '...' : t('auth.signIn')}
                </button>
              </form>
              <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
                {t('auth.noAccount')}{' '}
                <Link to="/register" className="text-primary font-semibold hover:underline">
                  {t('auth.register')}
                </Link>
              </p>
            </>
          )}
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-center gap-x-5 flex-wrap gap-y-1">
            <Link to="/terms" className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition">{T('Terms', '条款')}</Link>
            <Link to="/privacy" className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition">{T('Privacy', '隐私')}</Link>
            <Link to="/refund" className="text-xs text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition">{T('Refunds', '退款')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
