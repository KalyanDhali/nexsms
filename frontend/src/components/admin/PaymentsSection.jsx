import { useEffect, useState } from 'react';
import {
  getAdminGateways, createGateway, updateGateway, getAdminDeposits, confirmDeposit,
} from '../../services/api.js';
import { Badge, Button, Field, TextInput, SelectInput, SectionHeader, Toast, Table, Card } from './ui.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

const QR_MODES = ['auto', 'manual', 'off'];

export default function PaymentsSection() {
  const [gateways, setGateways] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [tab, setTab] = useState('gateways');
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [toast, setToast] = useState('');
  const [toastColor, setToastColor] = useState('');
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);

  const emptyGw = { name: '', slug: '', type: 'wallet', active: true, fee_percent: 0, priority: 0, qr_mode: 'auto', min_amount: '', max_amount: '', min_confirmations: 0, wallet_address: '', credentials: '{}' };

  useEffect(() => {
    loadGateways();
    loadDeposits();
  }, []);

  const loadGateways = async () => {
    try {
      const { data } = await getAdminGateways();
      setGateways(data.gateways);
    } catch (e) { notify(e.response?.data?.error || 'Failed', 'red'); }
  };

  const loadDeposits = async () => {
    try {
      const { data } = await getAdminDeposits();
      setDeposits(data.deposits);
    } catch (e) { notify(e.response?.data?.error || 'Failed', 'red'); }
  };

  const notify = (msg, color = '') => {
    setToast(msg); setToastColor(color);
    setTimeout(() => setToast(''), 2500);
  };

  const openNew = () => { setEditId('new'); setForm(emptyGw); };
  const openEdit = (g) => {
    setEditId(g.id);
    setForm({ ...g, credentials: JSON.stringify(g.credentials || {}, null, 1), min_amount: g.min_amount ?? '', max_amount: g.max_amount ?? '', wallet_address: g.wallet_address || '' });
  };

  const save = async () => {
    try {
      const payload = {
        name: form.name, slug: form.slug, type: form.type, active: form.active,
        fee_percent: Number(form.fee_percent || 0), priority: Number(form.priority || 0),
        qr_mode: form.qr_mode, min_amount: form.min_amount !== '' ? Number(form.min_amount) : null,
        max_amount: form.max_amount !== '' ? Number(form.max_amount) : null,
        min_confirmations: Number(form.min_confirmations || 0),
        wallet_address: form.wallet_address || null,
        credentials: form.credentials ? JSON.parse(form.credentials) : {},
      };
      if (editId === 'new') {
        await createGateway(payload);
        notify(T('Gateway added', '支付网关已添加'));
      } else {
        await updateGateway(editId, payload);
        notify(T('Gateway updated', '支付网关已更新'));
      }
      setEditId(null);
      loadGateways();
    } catch (e) {
      notify(e.response?.data?.error || e.message || 'Failed', 'red');
    }
  };

  const confirm = async (id, txid) => {
    try {
      await confirmDeposit(id, txid ? { txid } : {});
      notify(T('Deposit confirmed', '充值已确认'));
      loadDeposits();
    } catch (e) { notify(e.response?.data?.error || 'Failed', 'red'); }
  };

  const statusColor = { pending: 'amber', completed: 'green', failed: 'red', expired: 'slate' };

  return (
    <div>
      <SectionHeader
        title={T('Payments', '支付')}
        subtitle={T('Payment gateways & deposits', '支付网关与充值记录')}
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setTab('gateways')} className={tab === 'gateways' ? 'ring-2 ring-indigo-200' : ''}>{T('Gateways', '网关')}</Button>
            <Button variant="ghost" onClick={() => setTab('deposits')} className={tab === 'deposits' ? 'ring-2 ring-indigo-200' : ''}>{T('Deposits', '充值')}</Button>
            {tab === 'gateways' && <Button onClick={openNew}>{T('+ Gateway', '+ 网关')}</Button>}
          </div>
        }
      />
      <Toast message={toast} color={toastColor} />

      {tab === 'gateways' ? (
        <>
          {editId !== null && (
            <Card className="mb-5">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Field label={T('Name', '名称')}><TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
                <Field label="Slug"><TextInput value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
                <Field label={T('Type', '类型')}>
                  <SelectInput value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="wallet">wallet</option>
                    <option value="api">api</option>
                  </SelectInput>
                </Field>
                <Field label={T('Active', '启用')}>
                  <SelectInput value={form.active} onChange={(e) => setForm({ ...form, active: e.target.value === 'true' })}>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </SelectInput>
                </Field>
                <Field label={T('Fee %', '手续费%')}><TextInput type="number" value={form.fee_percent} onChange={(e) => setForm({ ...form, fee_percent: e.target.value })} /></Field>
                <Field label={T('Priority', '优先级')}><TextInput type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} /></Field>
                <Field label={T('QR mode', '二维码模式')}>
                  <SelectInput value={form.qr_mode} onChange={(e) => setForm({ ...form, qr_mode: e.target.value })}>
                    {QR_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
                  </SelectInput>
                </Field>
                <Field label={T('Min confirmations', '最小确认数')}><TextInput type="number" value={form.min_confirmations} onChange={(e) => setForm({ ...form, min_confirmations: e.target.value })} /></Field>
                <Field label={T('Min amount', '最小金额')}><TextInput type="number" value={form.min_amount} onChange={(e) => setForm({ ...form, min_amount: e.target.value })} /></Field>
                <Field label={T('Max amount', '最大金额')}><TextInput type="number" value={form.max_amount} onChange={(e) => setForm({ ...form, max_amount: e.target.value })} /></Field>
                {form.type === 'wallet' && <Field label={T('Wallet address', '钱包地址')}><TextInput value={form.wallet_address} onChange={(e) => setForm({ ...form, wallet_address: e.target.value })} /></Field>}
                <div className="col-span-2">
                  <Field label={T('Credentials JSON', '凭据 JSON')}>
                    <textarea value={form.credentials} onChange={(e) => setForm({ ...form, credentials: e.target.value })}
                      className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm w-full h-16 font-mono text-xs" />
                  </Field>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={save}>{T('Save', '保存')}</Button>
                <Button variant="ghost" onClick={() => setEditId(null)}>{T('Cancel', '取消')}</Button>
              </div>
            </Card>
          )}

          <Table head={[T('Gateway', '网关'), T('Type', '类型'), T('Fee', '费用'), T('QR mode', '二维码'), T('Status', '状态'), T('Actions', '操作')]}>
            {gateways.map((g) => (
              <tr key={g.id}>
                <td className="px-4 py-3">
                  <div className="font-medium text-slate-900">{g.name}</div>
                  <div className="text-xs text-slate-400">{g.slug}</div>
                </td>
                <td className="px-4 py-3"><code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{g.type}</code></td>
                <td className="px-4 py-3 text-slate-500">{g.fee_percent}%</td>
                <td className="px-4 py-3 text-slate-500">{g.qr_mode}</td>
                <td className="px-4 py-3"><Badge color={g.active ? 'green' : 'slate'}>{g.active ? T('Active', '启用') : T('Off', '禁用')}</Badge></td>
                <td className="px-4 py-3"><Button variant="ghost" onClick={() => openEdit(g)}>{T('Edit', '编辑')}</Button></td>
              </tr>
            ))}
          </Table>
        </>
      ) : (
        <Table head={[T('User', '用户'), T('Gateway', '网关'), T('Amount', '金额'), T('Status', '状态'), T('TxID', '交易ID'), T('Created', '创建时间'), T('Actions', '操作')]}>
          {deposits.map((d) => (
            <tr key={d.id}>
              <td className="px-4 py-3 text-xs text-slate-500">{d.user_email}</td>
              <td className="px-4 py-3">{d.gateway_name}</td>
              <td className="px-4 py-3 font-medium">${Number(d.amount).toFixed(2)}</td>
              <td className="px-4 py-3"><Badge color={statusColor[d.status]}>{d.status}</Badge></td>
              <td className="px-4 py-3 text-xs text-slate-400 font-mono">{d.txid ? d.txid.slice(0, 18) + '…' : '—'}</td>
              <td className="px-4 py-3 text-xs text-slate-400">{new Date(d.created_at).toLocaleString()}</td>
              <td className="px-4 py-3">
                {d.status === 'pending' && (
                  <Button onClick={() => confirm(d.id)}>{T('Confirm', '确认')}</Button>
                )}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </div>
  );
}
