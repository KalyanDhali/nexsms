import { useEffect, useState } from 'react';
import {
  getFraudOrders, approveFraudOrder, rejectFraudOrder,
  getBlocklist, addBlocklist, removeBlocklist,
  getAdminToggles, updateAdminToggle, getAdminSettings, updateAdminSetting,
} from '../../services/api.js';
import { Badge, Button, Field, TextInput, SectionHeader, Toast, Table, Card } from './ui.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

const RISK_COLOR = (score) => (score >= 80 ? 'red' : score >= 50 ? 'amber' : 'green');

const FRAUD_RULES = ['risk_scoring', 'payment_hold', 'fraud_flash_usdt', 'fraud_carding', 'ip_blocklist', 'message_filter'];

const RULE_LABEL = (key, isZh) => ({
  risk_scoring: isZh ? '风险评分引擎' : 'Risk scoring engine',
  payment_hold: isZh ? '付款自动冻结' : 'Payment auto-hold',
  fraud_flash_usdt: isZh ? '闪付USDT检测' : 'Flash-USDT detection',
  fraud_carding: isZh ? '盗刷信号检测' : 'Carding signal detection',
  ip_blocklist: isZh ? 'IP 封禁' : 'IP blocklist',
  message_filter: isZh ? '消息过滤' : 'Message filter',
}[key] || key);

export default function FraudSection() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('hold');
  const [blocklist, setBlocklist] = useState([]);
  const [newIp, setNewIp] = useState('');
  const [newReason, setNewReason] = useState('');
  const [rules, setRules] = useState([]);
  const [holdThreshold, setHoldThreshold] = useState(100);
  const [toast, setToast] = useState('');
  const [toastColor, setToastColor] = useState('');
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);

  useEffect(() => {
    loadOrders();
    loadBlocklist();
    loadRules();
  }, []);

  const loadRules = async () => {
    try {
      const [{ data: tg }, { data: s }] = await Promise.all([getAdminToggles(), getAdminSettings()]);
      setRules(tg.toggles.filter((t) => FRAUD_RULES.includes(t.key)));
      const hold = tg.toggles.find((t) => t.key === 'payment_hold');
      setHoldThreshold(hold?.config?.threshold ?? s.settings?.payment_hold?.threshold ?? 100);
    } catch { /* ignore */ }
  };

  const loadOrders = async () => {
    try {
      const { data } = await getFraudOrders(filter ? { status: filter } : {});
      setOrders(data.orders);
    } catch (e) { notify(e.response?.data?.error || 'Failed', 'red'); }
  };

  const loadBlocklist = async () => {
    try {
      const { data } = await getBlocklist();
      setBlocklist(data.blocklist);
    } catch (e) { notify(e.response?.data?.error || 'Failed', 'red'); }
  };

  const notify = (msg, color = '') => {
    setToast(msg); setToastColor(color);
    setTimeout(() => setToast(''), 3000);
  };

  const approve = async (id) => {
    try {
      const { data } = await approveFraudOrder(id, {});
      notify(data.warning || T('Approved', '已批准'), data.warning ? 'red' : '');
      loadOrders();
    } catch (e) { notify(e.response?.data?.error || 'Failed', 'red'); }
  };

  const reject = async (id) => {
    try {
      await rejectFraudOrder(id);
      notify(T('Rejected', '已拒绝'));
      loadOrders();
    } catch (e) { notify(e.response?.data?.error || 'Failed', 'red'); }
  };

  const block = async () => {
    if (!newIp) return notify(T('Enter IP', '请输入 IP'), 'red');
    try {
      await addBlocklist({ ip: newIp, reason: newReason || null });
      notify(T('IP blocked', 'IP 已封禁'));
      setNewIp(''); setNewReason('');
      loadBlocklist();
    } catch (e) { notify(e.response?.data?.error || 'Failed', 'red'); }
  };

  const unblock = async (ip) => {
    try {
      await removeBlocklist(ip);
      notify(T('IP unblocked', 'IP 已解封'));
      loadBlocklist();
    } catch (e) { notify(e.response?.data?.error || 'Failed', 'red'); }
  };

  const toggleRule = async (key, enabled) => {
    try {
      const rule = rules.find((r) => r.key === key);
      const config = key === 'payment_hold' ? { ...(rule?.config || {}), threshold: Number(holdThreshold) } : rule?.config;
      await updateAdminToggle(key, { enabled, config });
      setRules((prev) => prev.map((r) => (r.key === key ? { ...r, enabled } : r)));
      notify(T('Rule updated', '规则已更新'));
    } catch (e) { notify(e.response?.data?.error || 'Failed', 'red'); }
  };

  const saveHoldThreshold = async () => {
    try {
      const rule = rules.find((r) => r.key === 'payment_hold');
      await updateAdminToggle('payment_hold', { enabled: rule?.enabled ?? true, config: { threshold: Number(holdThreshold) } });
      notify(T('Hold threshold saved', '冻结门槛已保存'));
    } catch (e) { notify(e.response?.data?.error || 'Failed', 'red'); }
  };

  const statusColor = { hold: 'red', pending: 'amber', completed: 'green', failed: 'slate' };

  return (
    <div>
      <SectionHeader
        title={T('Fraud Prevention', '防欺诈')}
        subtitle={T('Risk review, flash-USDT & carding detection, IP blocklist', '风险审查、闪付USDT与盗刷检测、IP 封禁')}
      />
      <Toast message={toast} color={toastColor} />

      <Card className="mb-5">
        <h3 className="font-semibold text-slate-900 dark:text-white mb-3">{T('Fraud rules', '防欺诈规则')}</h3>
        <div className="grid md:grid-cols-2 gap-3">
          {rules.map((r) => (
            <label key={r.key} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-slate-100 dark:border-slate-800">
              <span className="text-sm text-slate-700 dark:text-slate-200">{RULE_LABEL(r.key, isZh)} <span className="text-[10px] text-slate-400 font-mono ml-1">{r.key}</span></span>
              <input type="checkbox" checked={r.enabled} onChange={(e) => toggleRule(r.key, e.target.checked)} className="w-4 h-4 accent-indigo-600" />
            </label>
          ))}
        </div>
        <div className="mt-3 flex items-end gap-3 flex-wrap">
          <Field label={T('Auto-HOLD score threshold', '自动冻结分数门槛')}>
            <TextInput type="number" value={holdThreshold} onChange={(e) => setHoldThreshold(e.target.value)} className="w-36" />
          </Field>
          <Button onClick={saveHoldThreshold}>{T('Save threshold', '保存门槛')}</Button>
        </div>
      </Card>

      <div className="flex gap-2 mb-5">
        {['hold', 'pending', 'completed', ''].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => { setFilter(s); }}
            className={`px-3 py-1.5 text-sm rounded-lg border transition ${
              filter === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/60'
            }`}
          >
            {s === '' ? T('All', '全部') : s}
          </button>
        ))}
        <Button onClick={loadOrders}>{T('Refresh', '刷新')}</Button>
      </div>

      <Table head={[T('User', '用户'), T('Amount', '金额'), T('Risk', '风险分'), T('Flags', '标记'), T('IP', 'IP'), T('Status', '状态'), T('Actions', '操作')]}>
        {orders.map((o) => (
          <tr key={o.id}>
            <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">{o.user_email}</td>
            <td className="px-4 py-3 font-medium">${Number(o.amount).toFixed(2)}</td>
            <td className="px-4 py-3"><Badge color={RISK_COLOR(o.risk_score)}>{o.risk_score}</Badge></td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-1 max-w-xs">
                {(o.risk_flags || []).map((f, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 font-mono">{f}</span>
                ))}
              </div>
            </td>
            <td className="px-4 py-3 text-xs font-mono text-slate-500 dark:text-slate-400">{o.ip || '—'}</td>
            <td className="px-4 py-3"><Badge color={statusColor[o.status]}>{o.status}</Badge></td>
            <td className="px-4 py-3">
              <div className="flex gap-1.5">
                {(o.status === 'hold' || o.status === 'pending') && (
                  <>
                    <Button onClick={() => approve(o.id)}>{T('Approve', '批准')}</Button>
                    <Button variant="danger" onClick={() => reject(o.id)}>{T('Reject', '拒绝')}</Button>
                  </>
                )}
              </div>
            </td>
          </tr>
        ))}
      </Table>

      <div className="grid md:grid-cols-2 gap-4 mt-6">
        <Card>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-3">{T('IP Blocklist', 'IP 封禁列表')}</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            <Field label={T('IP address', 'IP 地址')}><TextInput value={newIp} onChange={(e) => setNewIp(e.target.value)} placeholder="1.2.3.4" /></Field>
            <Field label={T('Reason', '原因')}><TextInput value={newReason} onChange={(e) => setNewReason(e.target.value)} placeholder="carding" /></Field>
            <div className="flex items-end"><Button onClick={block}>{T('Block', '封禁')}</Button></div>
          </div>
          <div className="space-y-2">
            {blocklist.length === 0 ? (
              <div className="text-sm text-slate-400 dark:text-slate-500 text-center py-4">{T('No blocked IPs', '无被封禁 IP')}</div>
            ) : (
              blocklist.map((b) => (
                <div key={b.ip} className="flex items-center justify-between border border-slate-100 dark:border-slate-800 rounded-lg px-3 py-2">
                  <div>
                    <code className="text-sm font-mono text-slate-700 dark:text-slate-200">{b.ip}</code>
                    <div className="text-xs text-slate-400 dark:text-slate-500">{b.reason || '—'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400 dark:text-slate-500">{new Date(b.created_at).toLocaleDateString()}</span>
                    <Button variant="ghost" onClick={() => unblock(b.ip)}>{T('Unblock', '解封')}</Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{T('How it works', '工作原理')}</h3>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
            <li>• {T('Deposits scored on 4 layers:', '充值按4层评分:')}</li>
            <li className="pl-4">{T('High amount above hold threshold', '超过冻结门槛的高额')}</li>
            <li className="pl-4">{T('New account (<24h) deposits', '新账户(24小时内)充值')}</li>
            <li className="pl-4">{T('IP velocity (3+ in 10 min)', 'IP 频率(10分钟内3次以上)')}</li>
            <li className="pl-4">{T('Non-round amounts (carding signal)', '非整数金额(盗刷信号)')}</li>
            <li>• {T('Score ≥ threshold auto-moves order to HOLD for review', '分数达到门槛自动进入HOLD待审查')}</li>
            <li>• {T('Flash-USDT: wallet deposits with low confirmations get a warning', '闪付USDT: 低确认数的钱包充值会收到警告')}</li>
            <li>• {T('Blocked IPs are rejected at login, register and deposit', '被封禁IP在登录、注册和充值时被拒绝')}</li>
          </ul>
          <div className="mt-3 text-xs text-slate-400 dark:text-slate-500">
            {T('All knobs live in Settings → Feature toggles (payment_hold threshold, risk_scoring, fraud_flash_usdt, fraud_carding, ip_blocklist)', '所有开关在 设置 → 功能开关 (payment_hold 门槛, risk_scoring, fraud_flash_usdt, fraud_carding, ip_blocklist)')}
          </div>
        </Card>
      </div>
    </div>
  );
}
