import { useEffect, useState } from 'react';
import {
  getPoolNumbers, getPoolStats, createNumber, assignNumber, revokeNumber, blockNumber,
  getAdminUsers, getAdminToggles, updateAdminToggle, updateNumberPricing,
} from '../../services/api.js';
import { Badge, Button, Field, TextInput, SelectInput, SectionHeader, Toast, Table, Card } from './ui.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

function fmtPrice(v) {
  if (v == null) return '—';
  const n = Number(v);
  return `${n.toFixed(n % 1 === 0 ? 0 : 2)} USDT`;
}

export default function NumbersSection() {
  const [numbers, setNumbers] = useState([]);
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [filters, setFilters] = useState({ status: '' });
  const [toast, setToast] = useState('');
  const [toastColor, setToastColor] = useState('');
  const [newNumber, setNewNumber] = useState({ number: '', geo_country: 'US', geo_area_code: '', monthly_cost: 0, did_price: '', did_lease_days: 30, did_note: '' });
  const [assignTo, setAssignTo] = useState({ numberId: '', userId: '' });
  const [didStoreOn, setDidStoreOn] = useState(false);
  const [priceNum, setPriceNum] = useState(null);
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);

  useEffect(() => {
    load();
    getAdminUsers().then(({ data }) => setUsers(data.users)).catch(() => {});
    getAdminToggles().then(({ data }) => {
      const t = data.toggles?.find((x) => x.key === 'did_store');
      if (t) setDidStoreOn(t.enabled);
    }).catch(() => {});
  }, []);

  const load = async () => {
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v));
      const [{ data }, { data: s }] = await Promise.all([getPoolNumbers(params), getPoolStats()]);
      setNumbers(data.numbers);
      setStats(s.stats);
    } catch (e) {
      notify(e.response?.data?.error || 'Failed', 'red');
    }
  };

  const notify = (msg, color = '') => {
    setToast(msg); setToastColor(color);
    setTimeout(() => setToast(''), 2500);
  };

  const toggleDidStore = async () => {
    try {
      await updateAdminToggle('did_store', { enabled: !didStoreOn });
      setDidStoreOn(!didStoreOn);
      notify(T('DID store updated', '号码商店状态已更新'));
    } catch (e) {
      notify(e.response?.data?.error || 'Failed', 'red');
    }
  };

  const create = async () => {
    try {
      await createNumber({
        number: newNumber.number,
        geo_country: newNumber.geo_country,
        geo_area_code: newNumber.geo_area_code || null,
        monthly_cost: Number(newNumber.monthly_cost || 0),
        did_price: newNumber.did_price === '' ? null : Number(newNumber.did_price),
        did_lease_days: Number(newNumber.did_lease_days || 30),
        did_note: newNumber.did_note || null,
      });
      notify(T('Number added', '号码已添加'));
      setNewNumber({ number: '', geo_country: 'US', geo_area_code: '', monthly_cost: 0, did_price: '', did_lease_days: 30, did_note: '' });
      load();
    } catch (e) {
      notify(e.response?.data?.error || 'Failed', 'red');
    }
  };

  const savePricing = async () => {
    try {
      await updateNumberPricing(priceNum.id, {
        did_price: priceNum.did_price === '' ? null : Number(priceNum.did_price),
        did_lease_days: Number(priceNum.did_lease_days || 30),
        did_note: priceNum.did_note || null,
      });
      notify(T('Pricing saved', '定价已保存'));
      setPriceNum(null);
      load();
    } catch (e) {
      notify(e.response?.data?.error || 'Failed', 'red');
    }
  };

  const assign = async () => {
    if (!assignTo.numberId || !assignTo.userId) return notify(T('Select number and user', '请选择号码和用户'), 'red');
    try {
      await assignNumber(assignTo.numberId, { userId: assignTo.userId });
      notify(T('Number assigned', '号码已分配'));
      setAssignTo({ numberId: '', userId: '' });
      load();
    } catch (e) {
      notify(e.response?.data?.error || 'Failed', 'red');
    }
  };

  const act = async (fn, okMsg) => {
    try {
      await fn();
      notify(okMsg);
      load();
    } catch (e) {
      notify(e.response?.data?.error || 'Failed', 'red');
    }
  };

  const statusColor = { available: 'green', assigned: 'blue', blocked: 'red' };
  const displayPrice = (n) => (n.did_price != null ? n.did_price : n.monthly_cost);

  return (
    <div>
      <SectionHeader
        title={T('Numbers', '号码池')}
        subtitle={T('Number pool management & assignment', '号码池管理与分配')}
      />
      <Toast message={toast} color={toastColor} />

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        {['available', 'assigned', 'blocked', 'total'].map((k) => (
          <Card key={k} className="text-center">
            <div className="text-2xl font-bold text-slate-900 dark:text-white">{stats[k] ?? 0}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{T(k, k === 'total' ? '总计' : k)}</div>
          </Card>
        ))}
      </div>

      <Card className="mb-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="text-sm font-medium text-slate-900 dark:text-white">{T('DID store', '号码商店')}</div>
          <button
            onClick={toggleDidStore}
            className={`relative w-11 h-6 rounded-full transition ${didStoreOn ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-700'}`}
            aria-pressed={didStoreOn}
          >
            <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${didStoreOn ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {T('Allow users to rent numbers from the store using their balance.', '允许用户从号码商店用余额租用号码。')}
        </p>
      </Card>

      <Card className="mb-5">
        <div className="text-sm font-medium text-slate-900 dark:text-white mb-3">{T('Add number', '添加号码')}</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Field label={T('Number', '号码')}><TextInput value={newNumber.number} onChange={(e) => setNewNumber({ ...newNumber, number: e.target.value })} placeholder="+14155550000" /></Field>
          <Field label={T('Country', '国家')}><TextInput value={newNumber.geo_country} onChange={(e) => setNewNumber({ ...newNumber, geo_country: e.target.value })} /></Field>
          <Field label={T('Area code', '区号')}><TextInput value={newNumber.geo_area_code} onChange={(e) => setNewNumber({ ...newNumber, geo_area_code: e.target.value })} /></Field>
          <Field label={T('Monthly cost', '月费')}><TextInput type="number" value={newNumber.monthly_cost} onChange={(e) => setNewNumber({ ...newNumber, monthly_cost: e.target.value })} /></Field>
          <Field label={T('Rent price (USDT)', '租用价格 (USDT)')}><TextInput type="number" value={newNumber.did_price} onChange={(e) => setNewNumber({ ...newNumber, did_price: e.target.value })} /></Field>
          <Field label={T('Lease days', '租期天数')}><TextInput type="number" value={newNumber.did_lease_days} onChange={(e) => setNewNumber({ ...newNumber, did_lease_days: e.target.value })} /></Field>
          <Field label={T('Note', '备注')}><TextInput value={newNumber.did_note} onChange={(e) => setNewNumber({ ...newNumber, did_note: e.target.value })} /></Field>
          <div className="flex items-end"><Button onClick={create}>{T('Add', '添加')}</Button></div>
        </div>
      </Card>

      <Card className="mb-5">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Field label={T('Assign number to user', '分配号码给用户')}>
            <SelectInput value={assignTo.numberId} onChange={(e) => setAssignTo({ ...assignTo, numberId: e.target.value })}>
              <option value="">{T('Select number...', '选择号码...')}</option>
              {numbers.filter((n) => n.status === 'available').map((n) => <option key={n.id} value={n.id}>{n.number}</option>)}
            </SelectInput>
          </Field>
          <Field label={T('User', '用户')}>
            <SelectInput value={assignTo.userId} onChange={(e) => setAssignTo({ ...assignTo, userId: e.target.value })}>
              <option value="">{T('Select user...', '选择用户...')}</option>
              {users.map((u) => <option key={u.id} value={u.id}>{u.email}</option>)}
            </SelectInput>
          </Field>
          <div className="flex items-end"><Button onClick={assign}>{T('Assign', '分配')}</Button></div>
        </div>
      </Card>

      <div className="flex gap-2 mb-4">
        <SelectInput value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })} className="w-40">
          <option value="">{T('All statuses', '全部状态')}</option>
          <option value="available">available</option>
          <option value="assigned">assigned</option>
          <option value="blocked">blocked</option>
        </SelectInput>
        <Button onClick={load}>{T('Filter', '筛选')}</Button>
      </div>

      <Table head={[T('Number', '号码'), T('Country', '国家'), T('Area', '区号'), T('Price', '价格'), T('Status', '状态'), T('Assigned to', '分配对象'), T('Primary', '主号'), T('Actions', '操作')]}>
        {numbers.map((n) => (
          <tr key={n.id}>
            <td className="px-4 py-3 font-medium text-slate-900 dark:text-white">{n.number}</td>
            <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{n.geo_country}</td>
            <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{n.geo_area_code || '—'}</td>
            <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{fmtPrice(displayPrice(n))}</td>
            <td className="px-4 py-3"><Badge color={statusColor[n.status]}>{n.status}</Badge></td>
            <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{n.assigned_user_email || '—'}</td>
            <td className="px-4 py-3">{n.primary_number ? <Badge color="purple">{T('Primary', '主号')}</Badge> : '—'}</td>
            <td className="px-4 py-3">
              <div className="flex gap-1.5 flex-wrap">
                <Button variant="ghost" onClick={() => setPriceNum({ id: n.id, number: n.number, did_price: n.did_price != null ? n.did_price : '', did_lease_days: n.did_lease_days || 30, did_note: n.did_note || '' })}>{T('Pricing', '定价')}</Button>
                {n.status === 'available' && <Button variant="ghost" onClick={() => setAssignTo({ numberId: n.id, userId: '' })}>{T('Assign', '分配')}</Button>}
                {n.status === 'assigned' && <Button variant="ghost" onClick={() => act(() => revokeNumber(n.id), T('Revoked', '已收回'))}>{T('Revoke', '收回')}</Button>}
                <Button variant={n.status === 'blocked' ? 'ghost' : 'danger'} onClick={() => act(() => blockNumber(n.id, n.status !== 'blocked'), n.status === 'blocked' ? T('Unblocked', '已解封') : T('Blocked', '已封禁'))}>
                  {n.status === 'blocked' ? T('Unblock', '解封') : T('Block', '封禁')}
                </Button>
              </div>
            </td>
          </tr>
        ))}
      </Table>

      {priceNum && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setPriceNum(null)}>
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xl p-5"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="font-semibold text-slate-900 dark:text-white">{T('DID pricing', '号码定价')}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{priceNum.number}</div>
              </div>
              <button onClick={() => setPriceNum(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl leading-none">×</button>
            </div>
            <div className="space-y-3">
              <Field label={T('Rent price (USDT)', '租用价格 (USDT)')}>
                <TextInput type="number" value={priceNum.did_price} onChange={(e) => setPriceNum({ ...priceNum, did_price: e.target.value })} placeholder="0" />
              </Field>
              <Field label={T('Lease days', '租期天数')}>
                <TextInput type="number" value={priceNum.did_lease_days} onChange={(e) => setPriceNum({ ...priceNum, did_lease_days: e.target.value })} />
              </Field>
              <Field label={T('Note', '备注')}>
                <TextInput value={priceNum.did_note} onChange={(e) => setPriceNum({ ...priceNum, did_note: e.target.value })} placeholder={T('Optional label shown to users', '显示给用户的备注')} />
              </Field>
              <div className="flex gap-2 pt-1">
                <Button onClick={savePricing}>{T('Save', '保存')}</Button>
                <Button variant="ghost" onClick={() => setPriceNum(null)}>{T('Cancel', '取消')}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
