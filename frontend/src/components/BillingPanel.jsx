import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import {
  getWallet, getPlans, getPaymentGateways, getTransactions, getDeposits,
  subscribePlan, unsubscribePlan, createDeposit,
} from '../services/api.js';

export default function BillingPanel() {
  const { theme } = useTheme();
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);

  const [wallet, setWallet] = useState(null);
  const [sub, setSub] = useState(null);
  const [plans, setPlans] = useState([]);
  const [gateways, setGateways] = useState([]);
  const [txs, setTxs] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [toastColor, setToastColor] = useState('');

  // Subscribe flow
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [payMethod, setPayMethod] = useState('balance');
  const [gwSlug, setGwSlug] = useState('');

  // Deposit flow
  const [depositAmount, setDepositAmount] = useState(50);
  const [depositGateway, setDepositGateway] = useState('');
  const [order, setOrder] = useState(null); // active payment screen

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    try {
      const [{ data: w }, { data: p }, { data: g }, { data: t }, { data: d }] = await Promise.all([
        getWallet(), getPlans(), getPaymentGateways(), getTransactions(), getDeposits(),
      ]);
      setWallet(w.wallet);
      setSub(w.subscription);
      setPlans(p.plans);
      setGateways(g.gateways);
      setTxs(t.transactions);
      setDeposits(d.deposits);
      if (!depositGateway && g.gateways.length) setDepositGateway(g.gateways[0].slug);
      if (!gwSlug && g.gateways.length) setGwSlug(g.gateways[0].slug);
    } catch (e) {
      notify(e.response?.data?.error || 'Failed to load', 'red');
    } finally {
      setLoading(false);
    }
  };

  const notify = (msg, color = '') => {
    setToast(msg); setToastColor(color);
    setTimeout(() => setToast(''), 3000);
  };

  const doSubscribe = async () => {
    if (!selectedPlan) return;
    try {
      if (payMethod === 'balance') {
        const { data } = await subscribePlan({ planId: selectedPlan.id, payWith: 'balance' });
        notify(T('Subscribed to ' + data.subscription.plan_name, '已订阅 ' + data.subscription.plan_name));
        setSelectedPlan(null);
        loadAll();
      } else {
        const { data } = await subscribePlan({ planId: selectedPlan.id, payWith: 'deposit', gatewaySlug: gwSlug });
        setOrder({ ...data.order, gateway: data.gateway, reason: T('Plan subscription', '套餐订阅') });
        setSelectedPlan(null);
      }
    } catch (e) {
      notify(e.response?.data?.error || 'Failed', 'red');
    }
  };

  const doDeposit = async () => {
    if (!depositGateway || !depositAmount || Number(depositAmount) <= 0) {
      return notify(T('Enter amount and select gateway', '请输入金额并选择网关'), 'red');
    }
    try {
      const { data } = await createDeposit({ amount: Number(depositAmount), gatewaySlug: depositGateway });
      setOrder({ ...data.order, gateway: data.gateway, payment: data.payment, reason: T('Wallet deposit', '钱包充值') });
    } catch (e) {
      notify(e.response?.data?.error || 'Failed', 'red');
    }
  };

  const doUnsubscribe = async () => {
    if (!confirm(T('Cancel current subscription?', '取消当前订阅？'))) return;
    try {
      await unsubscribePlan();
      notify(T('Subscription cancelled', '订阅已取消'));
      loadAll();
    } catch (e) {
      notify(e.response?.data?.error || 'Failed', 'red');
    }
  };

  const copyAddress = (addr) => {
    navigator.clipboard?.writeText(addr);
    notify(T('Address copied', '地址已复制'));
  };

  const quotaPct = sub && sub.sms_quota ? Math.min(100, Math.round((sub.sms_used / sub.sms_quota) * 100)) : 0;
  const modeLabel = { prepaid: T('Prepaid', '预付费'), subscription: T('Subscription', '订阅'), hybrid: T('Hybrid', '混合') };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      {toast && (
        <div className="fixed top-16 right-6 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg" style={{ background: toastColor || theme.primary }}>
          {toast}
        </div>
      )}

      {/* Payment screen modal */}
      {order && (
        <div className="fixed inset-0 z-40 bg-black/40 flex items-center justify-center p-4" onClick={() => setOrder(null)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-bold text-slate-900">{T('Complete payment', '完成支付')}</h3>
              <button onClick={() => setOrder(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            <p className="text-xs text-slate-400 mb-4">{order.reason} · {order.gateway?.name}</p>

            <div className="text-center py-2">
              <div className="text-3xl font-bold text-slate-900">${Number(order.amount).toFixed(2)}</div>
              <div className="text-xs text-slate-400 mt-0.5">{T('Order expires in 30 min', '订单30分钟后过期')}</div>
            </div>

            {order.payment?.method === 'wallet' ? (
              <div className="mt-4">
                {order.payment.qr_code ? (
                  <div className="flex justify-center mb-4">
                    <img src={order.payment.qr_code} alt="QR" className="w-52 h-52 rounded-lg border border-slate-200" />
                  </div>
                ) : (
                  <div className="text-sm text-slate-500 text-center mb-4">{T('No QR available — use the address below', '无二维码 — 请使用下方地址')}</div>
                )}
                <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2.5 border border-slate-200">
                  <code className="flex-1 text-xs break-all font-mono text-slate-700">{order.payment.address}</code>
                  <button onClick={() => copyAddress(order.payment.address)} className="px-2 py-1 rounded bg-white border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 shrink-0">
                    {T('Copy', '复制')}
                  </button>
                </div>
                <p className="text-xs text-slate-500 mt-3">{order.payment.instructions}</p>
              </div>
            ) : (
              <div className="mt-4">
                <a href={order.payment?.payment_url} target="_blank" rel="noreferrer"
                  className="block w-full text-center px-4 py-3 rounded-lg text-white font-medium"
                  style={{ background: theme.primary }}>
                  {T('Open checkout page', '打开支付页面')}
                </a>
                <p className="text-xs text-slate-500 mt-3">{T('After payment, admin will confirm your order.', '付款后，管理员将确认您的订单。')}</p>
              </div>
            )}

            <button onClick={() => { setOrder(null); loadAll(); }} className="mt-5 w-full text-center text-sm text-slate-500 hover:text-slate-700">
              {T('I have paid', '我已支付')}
            </button>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-xl font-bold text-slate-900">{T('Billing & Wallet', '账单与钱包')}</h1>
        <p className="text-sm text-slate-500 mt-0.5 mb-6">{T('Manage your balance, subscription and deposits', '管理余额、订阅与充值')}</p>

        {loading ? (
          <div className="text-center text-slate-400 text-sm py-10">{T('Loading...', '加载中...')}</div>
        ) : (
          <>
            {/* Wallet + subscription */}
            <div className="grid md:grid-cols-2 gap-4 mb-6">
              <div className="rounded-xl p-5 text-white" style={{ background: `linear-gradient(135deg, ${theme.primary}, ${theme.secondary})` }}>
                <div className="text-sm opacity-80">{T('Available balance', '可用余额')}</div>
                <div className="text-3xl font-bold mt-1">${Number(wallet?.balance || 0).toFixed(2)}</div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/20">{wallet?.currency}</span>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-white/20">{modeLabel[wallet?.billing_mode] || wallet?.billing_mode}</span>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-900">{T('Current subscription', '当前订阅')}</h3>
                  {sub && (
                    <button onClick={doUnsubscribe} className="text-xs text-red-500 hover:text-red-600">{T('Cancel', '取消')}</button>
                  )}
                </div>
                {sub ? (
                  <>
                    <div className="text-sm text-slate-600 mt-2">
                      {sub.plan_name} · <span className="text-slate-400">{sub.plan_slug}</span>
                    </div>
                    <div className="mt-3">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>{sub.sms_used} / {sub.sms_quota} {T('SMS', '条短信')}</span>
                        <span>{quotaPct}%</span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${quotaPct}%`, background: theme.primary }} />
                      </div>
                    </div>
                    <div className="text-xs text-slate-400 mt-3">
                      {T('Renews:', '续费:')} {new Date(sub.renews_at).toLocaleDateString()}
                    </div>
                  </>
                ) : (
                  <div className="text-sm text-slate-400 mt-3 py-2">{T('No active subscription', '无活跃订阅')}</div>
                )}
              </div>
            </div>

            {/* Subscribe panel */}
            {selectedPlan && (
              <div className="bg-white rounded-xl border-2 p-5 mb-6" style={{ borderColor: theme.primary }}>
                <h3 className="font-semibold text-slate-900 mb-3">
                  {T('Subscribe to', '订阅')} {selectedPlan.name} — ${Number(selectedPlan.price).toFixed(2)}/{T('mo', '月')}
                </h3>
                <div className="flex flex-wrap gap-3 items-center">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="radio" checked={payMethod === 'balance'} onChange={() => setPayMethod('balance')} />
                    {T('Pay from balance', '余额支付')}
                    <span className="text-xs text-slate-400">(${Number(wallet?.balance || 0).toFixed(2)} {T('available', '可用')})</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input type="radio" checked={payMethod === 'deposit'} onChange={() => setPayMethod('deposit')} />
                    {T('Pay via gateway', '网关支付')}
                  </label>
                  {payMethod === 'deposit' && (
                    <select value={gwSlug} onChange={(e) => setGwSlug(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white">
                      {gateways.map((g) => <option key={g.slug} value={g.slug}>{g.name}</option>)}
                    </select>
                  )}
                  <button onClick={doSubscribe} className="px-4 py-1.5 rounded-lg text-white text-sm font-medium" style={{ background: theme.primary }}>
                    {T('Confirm', '确认')}
                  </button>
                  <button onClick={() => setSelectedPlan(null)} className="text-sm text-slate-500">{T('Cancel', '取消')}</button>
                </div>
              </div>
            )}

            {/* Plans */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              {plans.map((p) => (
                <div key={p.id} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col">
                  <div className="font-semibold text-slate-900">{p.name}</div>
                  <div className="text-3xl font-bold text-slate-900 mt-2">${Number(p.price).toFixed(2)}<span className="text-sm font-normal text-slate-400">/{T('mo', '月')}</span></div>
                  <div className="text-xs text-slate-500 mt-1">{p.description}</div>
                  <ul className="mt-4 space-y-1.5 flex-1">
                    {(p.features || []).map((feat, i) => (
                      <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                        <span className="text-green-500 mt-0.5">✓</span>{feat}
                      </li>
                    ))}
                  </ul>
                  {sub && sub.plan_id === p.id ? (
                    <div className="mt-4 px-4 py-2 rounded-lg text-center text-sm font-medium" style={{ background: theme.primary, color: '#fff' }}>
                      {T('Current plan', '当前套餐')}
                    </div>
                  ) : (
                    <button onClick={() => { setSelectedPlan(p); setPayMethod('balance'); }} className="mt-4 px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90" style={{ background: theme.primary }}>
                      {T('Subscribe', '订阅')}
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Deposit */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
              <h3 className="font-semibold text-slate-900 mb-3">{T('Deposit funds', '充值')}</h3>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{T('Amount (USD)', '金额(美元)')}</label>
                  <input type="number" value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm w-36" />
                </div>
                <div>
                  <label className="block text-xs text-slate-500 mb-1">{T('Gateway', '网关')}</label>
                  <select value={depositGateway} onChange={(e) => setDepositGateway(e.target.value)} className="border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white">
                    {gateways.map((g) => <option key={g.slug} value={g.slug}>{g.name}</option>)}
                  </select>
                </div>
                <button onClick={doDeposit} className="px-4 py-2 rounded-lg text-white text-sm font-medium" style={{ background: theme.primary }}>
                  {T('Deposit', '充值')}
                </button>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Transactions */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-900 mb-3">{T('Transactions', '交易记录')}</h3>
                {txs.length === 0 ? (
                  <div className="text-sm text-slate-400 text-center py-6">{T('No transactions yet', '暂无交易')}</div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {txs.map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-sm border-b border-slate-50 pb-2 last:border-0">
                        <div>
                          <div className="font-medium text-slate-700">{t.type}</div>
                          <div className="text-xs text-slate-400">{new Date(t.created_at).toLocaleString()}</div>
                        </div>
                        <div className={`font-medium ${Number(t.amount) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                          {Number(t.amount) >= 0 ? '+' : ''}{Number(t.amount).toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Deposits */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h3 className="font-semibold text-slate-900 mb-3">{T('Deposits', '充值记录')}</h3>
                {deposits.length === 0 ? (
                  <div className="text-sm text-slate-400 text-center py-6">{T('No deposits yet', '暂无充值')}</div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {deposits.map((d) => (
                      <div key={d.id} className="flex items-center justify-between text-sm border-b border-slate-50 pb-2 last:border-0">
                        <div>
                          <div className="font-medium text-slate-700">{d.gateway_name}</div>
                          <div className="text-xs text-slate-400">{new Date(d.created_at).toLocaleString()}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-slate-800">${Number(d.amount).toFixed(2)}</div>
                          <div className={`text-[11px] ${d.status === 'completed' ? 'text-green-600' : d.status === 'pending' ? 'text-amber-600' : 'text-red-500'}`}>{d.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
