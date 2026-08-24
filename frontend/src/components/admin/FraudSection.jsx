import { useEffect, useState } from 'react';
import {
  getFraudOrders, approveFraudOrder, rejectFraudOrder,
  getBlocklist, addBlocklist, removeBlocklist,
} from '../../services/api.js';
import { Badge, Button, Field, TextInput, SectionHeader, Toast, Table, Card } from './ui.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

const RISK_COLOR = (score) => (score >= 80 ? 'red' : score >= 50 ? 'amber' : 'green');

export default function FraudSection() {
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('hold');
  const [blocklist, setBlocklist] = useState([]);
  const [newIp, setNewIp] = useState('');
  const [newReason, setNewReason] = useState('');
  const [toast, setToast] = useState('');
  const [toastColor, setToastColor] = useState('');
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);

  useEffect(() => {
    loadOrders();
    loadBlocklist();
  }, []);

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

  const statusColor = { hold: 'red', pending: 'amber', completed: 'green', failed: 'slate' };

  return (
    <div>
      <SectionHeader
        title={T('Fraud Prevention', '防欺诈')}
        subtitle={T('Risk review, flash-USDT & carding detection, IP blocklist', '风险审查、闪付USDT与盗刷检测、IP 封禁')}
      />
      <Toast message={toast} color={toastColor} />

      <div className="flex gap-2 mb-5">
        {['hold', 'pending', 'completed', ''].map((s) => (
          <button
            key={s || 'all'}
            onClick={() => { setFilter(s); }}
            className={`px-3 py-1.5 text-sm rounded-lg border transition ${
              filter === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
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
            <td className="px-4 py-3 text-xs text-slate-600">{o.user_email}</td>
            <td className="px-4 py-3 font-medium">${Number(o.amount).toFixed(2)}</td>
            <td className="px-4 py-3"><Badge color={RISK_COLOR(o.risk_score)}>{o.risk_score}</Badge></td>
            <td className="px-4 py-3">
              <div className="flex flex-wrap gap-1 max-w-xs">
                {(o.risk_flags || []).map((f, i) => (
                  <span key={i} className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 font-mono">{f}</span>
                ))}
              </div>
            </td>
            <td className="px-4 py-3 text-xs font-mono text-slate-500">{o.ip || '—'}</td>
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
          <h3 className="font-semibold text-slate-900 mb-3">{T('IP Blocklist', 'IP 封禁列表')}</h3>
          <div className="flex flex-wrap gap-2 mb-4">
            <Field label={T('IP address', 'IP 地址')}><TextInput value={newIp} onChange={(e) => setNewIp(e.target.value)} placeholder="1.2.3.4" /></Field>
            <Field label={T('Reason', '原因')}><TextInput value={newReason} onChange={(e) => setNewReason(e.target.value)} placeholder="carding" /></Field>
            <div className="flex items-end"><Button onClick={block}>{T('Block', '封禁')}</Button></div>
          </div>
          <div className="space-y-2">
            {blocklist.length === 0 ? (
              <div className="text-sm text-slate-400 text-center py-4">{T('No blocked IPs', '无被封禁 IP')}</div>
            ) : (
              blocklist.map((b) => (
                <div key={b.ip} className="flex items-center justify-between border border-slate-100 rounded-lg px-3 py-2">
                  <div>
                    <code className="text-sm font-mono text-slate-700">{b.ip}</code>
                    <div className="text-xs text-slate-400">{b.reason || '—'}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">{new Date(b.created_at).toLocaleDateString()}</span>
                    <Button variant="ghost" onClick={() => unblock(b.ip)}>{T('Unblock', '解封')}</Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>

        <Card>
          <h3 className="font-semibold text-slate-900 mb-2">{T('How it works', '工作原理')}</h3>
          <ul className="space-y-2 text-sm text-slate-600">
            <li>• {T('Deposits scored on 4 layers:', '充值按4层评分:')}</li>
            <li className="pl-4">{T('High amount above hold threshold', '超过冻结门槛的高额')}</li>
            <li className="pl-4">{T('New account (<24h) deposits', '新账户(24小时内)充值')}</li>
            <li className="pl-4">{T('IP velocity (3+ in 10 min)', 'IP 频率(10分钟内3次以上)')}</li>
            <li className="pl-4">{T('Non-round amounts (carding signal)', '非整数金额(盗刷信号)')}</li>
            <li>• {T('Score ≥ threshold auto-moves order to HOLD for review', '分数达到门槛自动进入HOLD待审查')}</li>
            <li>• {T('Flash-USDT: wallet deposits with low confirmations get a warning', '闪付USDT: 低确认数的钱包充值会收到警告')}</li>
            <li>• {T('Blocked IPs are rejected at login, register and deposit', '被封禁IP在登录、注册和充值时被拒绝')}</li>
          </ul>
          <div className="mt-3 text-xs text-slate-400">
            {T('All knobs live in Settings → Feature toggles (payment_hold threshold, risk_scoring, fraud_flash_usdt, fraud_carding, ip_blocklist)', '所有开关在 设置 → 功能开关 (payment_hold 门槛, risk_scoring, fraud_flash_usdt, fraud_carding, ip_blocklist)')}
          </div>
        </Card>
      </div>
    </div>
  );
}
