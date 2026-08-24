import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import {
  getUserProfile,
  changePassword,
  sendTwoFactorCode,
  verifyTwoFactorCode,
  getPaymentGateways,
  createDeposit,
} from '../../services/api.js';

function initialsOf(name) {
  return (name || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'U';
}

export default function ProfileMenu() {
  const { user, logout } = useAuth();
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);

  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [pwModal, setPwModal] = useState(false);
  const [fundModal, setFundModal] = useState(false);
  const [faModal, setFaModal] = useState(false);
  const [toast, setToast] = useState('');
  const [twoFa, setTwoFa] = useState(!!user?.two_factor_enabled);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setLoadingProfile(true);
    getUserProfile()
      .then(({ data }) => {
        setProfile(data);
        setTwoFa(!!data.user?.two_factor_enabled);
      })
      .catch(() => setProfile({ user, usage: { sms_sent: 0, call_minutes: 0, active_numbers: 0 }, plan: null }))
      .finally(() => setLoadingProfile(false));
  }, [open]);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const copyApiKey = async () => {
    const key = profile?.user?.api_key || user?.api_key;
    if (!key) return notify(T('No API key available', '没有可用 API 密钥'));
    await navigator.clipboard?.writeText(key);
    notify(T('API key copied', 'API 密钥已复制'));
  };

  const handleToggle2fa = () => setFaModal(true);

  const p = profile?.user || user || {};
  const usage = profile?.usage || { sms_sent: 0, call_minutes: 0, active_numbers: 0 };
  const plan = profile?.plan || null;
  const apiKey = profile?.user?.api_key || user?.api_key || '';

  const SectionTitle = ({ children }) => (
    <div className="px-4 pt-3 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{children}</div>
  );

  return (
    <div className="relative" ref={rootRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-9 h-9 shrink-0 rounded-full overflow-hidden border border-slate-200 hover:shadow transition flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-semibold"
        title={T('Profile', '个人资料')}
      >
        {p.avatar ? (
          <img src={p.avatar} alt="" className="w-full h-full object-cover" />
        ) : (
          initialsOf(p.name)
        )}
      </button>

      {toast && (
        <div className="fixed top-16 right-6 z-[60] px-4 py-2 rounded-lg text-white text-sm shadow-lg bg-gray-800">
          {toast}
        </div>
      )}

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 z-40 overflow-hidden flex flex-col max-h-[calc(100vh-80px)]">
          <div className="overflow-y-auto">
            {/* Identity header */}
            <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
              <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-sm font-semibold shrink-0">
                {p.avatar ? <img src={p.avatar} alt="" className="w-full h-full object-cover" /> : initialsOf(p.name)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm text-gray-900 truncate">{p.name || '—'}</span>
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-gray-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" title={T('Read-only', '只读')}>
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>
                <span className="block text-xs text-gray-500 truncate">{p.email || ''}</span>
              </div>
            </div>

            {/* Security & auth */}
            <SectionTitle>{T('Security & Auth', '安全与认证')}</SectionTitle>
            <div className="px-2">
              <button
                onClick={() => setPwModal(true)}
                className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition"
              >
                <span className="text-sm text-gray-800 flex items-center gap-2.5">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                  {T('Change Password', '修改密码')}
                </span>
                <span className="text-gray-300">›</span>
              </button>
              <div className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-gray-50 transition">
                <span className="text-sm text-gray-800 flex items-center gap-2.5">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5z" />
                    <path d="M12 15v3" />
                  </svg>
                  {T('Two-Factor Authentication', '两步验证 (2FA)')}
                </span>
                <button
                  onClick={handleToggle2fa}
                  className={`relative w-9 h-5 rounded-full transition ${twoFa ? 'bg-[#1a73e8]' : 'bg-gray-300'}`}
                  title={twoFa ? T('Enabled', '已启用') : T('Disabled', '已禁用')}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${twoFa ? 'left-[18px]' : 'left-0.5'}`} />
                </button>
              </div>
            </div>

            {/* Wallet & funds */}
            <SectionTitle>{T('Wallet & Funds', '钱包与资金')}</SectionTitle>
            <div className="px-2">
              <div className="px-3 py-2 flex items-center justify-between">
                <span className="text-sm text-gray-800 flex items-center gap-2.5">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="6" width="20" height="14" rx="2" />
                    <path d="M2 10h20" />
                  </svg>
                  {T('Balance', '余额')}
                </span>
                <span className="font-semibold text-sm text-gray-900">${Number(p.balance ?? 0).toFixed(2)}</span>
              </div>
              <button
                onClick={() => setFundModal(true)}
                className="mx-3 my-1.5 w-[calc(100%-24px)] px-4 py-2 rounded-lg bg-[#1a73e8] hover:bg-[#1765cc] text-white text-sm font-medium transition flex items-center justify-center gap-1.5"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {T('Add Balance / Top-up', '充值余额')}
              </button>
            </div>

            {/* Usage statistics */}
            <SectionTitle>{T('Usage', '使用统计')}</SectionTitle>
            <div className="px-4 pb-1 grid grid-cols-3 gap-2">
              {[
                { label: T('SMS Sent', '已发送短信'), value: `${usage.sms_sent.toLocaleString()} SMS` },
                { label: T('Calls Made', '通话时长'), value: `${usage.call_minutes} Mins` },
                { label: T('Active Numbers', '活跃号码'), value: `${usage.active_numbers}` },
              ].map((s) => (
                <div key={s.label} className="bg-gray-50 rounded-lg px-2 py-2.5 text-center">
                  <div className="text-sm font-bold text-gray-900">{s.value}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Proactive extras */}
            <SectionTitle>{T('Account', '账户')}</SectionTitle>
            <div className="px-2 pb-2">
              <div className="flex items-center justify-between px-3 py-2 rounded-lg">
                <span className="text-sm text-gray-800 flex items-center gap-2.5">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2l2.4 4.8 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4L4.2 7.6l5.4-.8z" />
                  </svg>
                  {T('Plan', '套餐')}
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 font-medium">
                  {plan || T('Free', '免费')}
                </span>
              </div>
              <div className="flex items-center justify-between px-3 py-2 rounded-lg">
                <span className="text-sm text-gray-800 flex items-center gap-2.5 min-w-0">
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-gray-500 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M7 9h.01M7 15h.01M11 9h6M11 15h6" />
                  </svg>
                  <span className="truncate">{T('API Key', 'API 密钥')}</span>
                </span>
                <button onClick={copyApiKey} className="text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 transition shrink-0">
                  {apiKey ? (isZh ? '复制' : 'Copy') : (isZh ? '无' : 'None')}
                </button>
              </div>
            </div>
          </div>

          {/* Footer logout */}
          <div className="border-t border-gray-100 p-2 shrink-0">
            <button
              onClick={logout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium transition"
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              {T('Logout', '退出登录')}
            </button>
          </div>
        </div>
      )}

      {pwModal && <ChangePasswordModal onClose={() => setPwModal(false)} onDone={(m) => notify(m)} />}
      {fundModal && <AddBalanceModal onClose={() => setFundModal(false)} onDone={(m) => notify(m)} />}
      {faModal && (
        <TwoFactorModal
          enabled={twoFa}
          onClose={() => setFaModal(false)}
          onDone={(enabled, msg) => {
            setTwoFa(enabled);
            notify(msg);
          }}
        />
      )}
    </div>
  );
}

function ChangePasswordModal({ onClose, onDone }) {
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (next !== confirm) return setError(T('New passwords do not match', '两次输入的新密码不一致'));
    setBusy(true);
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      onDone(T('Password changed', '密码已修改'));
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[min(92vw,400px)] p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-gray-900 mb-4">{T('Change Password', '修改密码')}</h3>
        <form onSubmit={submit} className="space-y-3">
          <input type="password" value={current} onChange={(e) => setCurrent(e.target.value)} placeholder={T('Current password', '当前密码')} className={inputCls} required />
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} placeholder={T('New password', '新密码')} className={inputCls} required />
          <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={T('Confirm new password', '确认新密码')} className={inputCls} required />
          {error && <div className="text-xs text-red-500">{error}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
              {T('Cancel', '取消')}
            </button>
            <button type="submit" disabled={busy} className="px-4 py-2 text-sm rounded-lg bg-[#1a73e8] hover:bg-[#1765cc] text-white font-medium transition disabled:opacity-60">
              {busy ? '...' : T('Save', '保存')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddBalanceModal({ onClose, onDone }) {
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);
  const [amount, setAmount] = useState(20);
  const [gateways, setGateways] = useState([]);
  const [gateway, setGateway] = useState('');
  const [order, setOrder] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getPaymentGateways()
      .then(({ data }) => {
        setGateways(data.gateways);
        if (data.gateways.length) setGateway(data.gateways[0].slug);
      })
      .catch(() => {});
  }, []);

  const deposit = async () => {
    setError('');
    if (!gateway || !amount || Number(amount) <= 0) return setError(T('Enter a valid amount', '请输入有效金额'));
    setBusy(true);
    try {
      const { data } = await createDeposit({ amount: Number(amount), gatewaySlug: gateway, currency: 'USD' });
      setOrder(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed');
    } finally {
      setBusy(false);
    }
  };

  const payUrl = order?.payment && typeof order.payment === 'string' ? order.payment : order?.payment?.url || order?.payment?.payment_url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[min(92vw,400px)] p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-gray-900 mb-4">{T('Add Balance / Top-up', '充值余额')}</h3>
        {order ? (
          <div className="space-y-3">
            <div className="text-sm text-gray-700">{T('Deposit order created', '充值订单已创建')}</div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>{T('Order', '订单号')}</span>
              <span className="font-medium text-gray-900">{(order.order?.reference || order.order?.id || '').slice(0, 12)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>{T('Amount', '金额')}</span>
              <span className="font-medium text-gray-900">${Number(order.order?.amount ?? amount).toFixed(2)}</span>
            </div>
            {payUrl && (
              <a
                href={payUrl}
                target="_blank"
                rel="noreferrer"
                className="block text-center px-4 py-2.5 rounded-lg bg-[#1a73e8] hover:bg-[#1765cc] text-white text-sm font-medium transition"
              >
                {T('Pay Now', '立即支付')}
              </a>
            )}
            {!payUrl && (
              <div className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                {T('Follow the gateway instructions to complete payment', '请按支付网关说明完成付款')}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">{T('Amount (USD)', '金额 (USD)')}</label>
              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">{T('Payment method', '支付方式')}</label>
              <select
                value={gateway}
                onChange={(e) => setGateway(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white outline-none focus:border-blue-500 transition"
              >
                {gateways.map((g) => (
                  <option key={g.id} value={g.slug}>{g.name}</option>
                ))}
              </select>
            </div>
            {error && <div className="text-xs text-red-500">{error}</div>}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
                {T('Cancel', '取消')}
              </button>
              <button type="button" onClick={deposit} disabled={busy} className="px-4 py-2 text-sm rounded-lg bg-[#1a73e8] hover:bg-[#1765cc] text-white font-medium transition disabled:opacity-60">
                {busy ? '...' : T('Continue', '继续')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function TwoFactorModal({ enabled, onClose, onDone }) {
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);

  const sendCode = async () => {
    setSending(true);
    setError('');
    try {
      const { data } = await sendTwoFactorCode();
      setSent(true);
      if (data.via === 'console') {
        setError(T('SMTP not configured — the code is shown in the server console.', '未配置 SMTP — 验证码显示在服务器控制台中。'));
      }
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to send code');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    sendCode();
  }, []);

  const confirm = async () => {
    setError('');
    if (code.length !== 6) return setError(T('Enter the 6-digit code', '请输入 6 位代码'));
    setBusy(true);
    try {
      const { data } = await verifyTwoFactorCode({ code });
      onDone(data.two_factor_enabled, data.two_factor_enabled ? T('Two-factor authentication enabled', '已启用两步验证') : T('Two-factor authentication disabled', '已禁用两步验证'));
      onClose();
    } catch (e) {
      setError(e.response?.data?.error || 'Invalid code');
    } finally {
      setBusy(false);
    }
  };

  const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition text-center text-lg tracking-[0.4em]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-[min(92vw,400px)] p-5" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-semibold text-gray-900 mb-1">{T('Two-Factor Authentication', '两步验证')}</h3>
        <p className="text-sm text-gray-500 mb-4">
          {enabled
            ? T('Enter the 6-digit code sent to your email to disable 2FA.', '请输入发送到您邮箱的 6 位代码以禁用两步验证。')
            : T('A 6-digit code has been sent to your email. Enter it below to enable 2FA.', '已向您的邮箱发送 6 位代码，请输入以启用两步验证。')}
        </p>
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          className={inputCls}
          placeholder="••••••"
          autoFocus
        />
        {error && <div className="text-xs text-red-500 mt-2">{error}</div>}
        <div className="flex justify-end gap-2 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition">
            {T('Cancel', '取消')}
          </button>
          {sent && (
            <button type="button" onClick={sendCode} disabled={sending} className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition disabled:opacity-60">
              {sending ? '...' : T('Resend code', '重新发送')}
            </button>
          )}
          <button type="button" onClick={confirm} disabled={busy} className={`px-4 py-2 text-sm rounded-lg text-white font-medium transition disabled:opacity-60 ${enabled ? 'bg-red-500 hover:bg-red-600' : 'bg-[#1a73e8] hover:bg-[#1765cc]'}`}>
            {busy ? '...' : enabled ? T('Disable', '禁用') : T('Verify & Enable', '验证并启用')}
          </button>
        </div>
      </div>
    </div>
  );
}
