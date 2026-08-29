import { useEffect, useState } from 'react';
import { getAdminUsers, updateAdminUser } from '../../services/api.js';
import { Badge, Button, Field, TextInput, SelectInput, SectionHeader, Toast, Table } from './ui.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

export default function UsersSection() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [toast, setToast] = useState('');
  const [toastColor, setToastColor] = useState('');
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const { data } = await getAdminUsers(search ? { search } : {});
      setUsers(data.users);
    } catch (e) {
      notify(e.response?.data?.error || 'Failed', 'red');
    }
  };

  const notify = (msg, color = '') => {
    setToast(msg); setToastColor(color);
    setTimeout(() => setToast(''), 2500);
  };

  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});

  const openEdit = (u) => {
    setEditId(u.id);
    setForm({ status: u.status, balance: u.balance, billing_mode: u.billing_mode, daily_limit_override: u.daily_limit_override ?? '', name: u.name, phone: u.phone || '' });
  };

  const save = async (id) => {
    try {
      const payload = {
        status: form.status,
        billing_mode: form.billing_mode,
        balance: form.balance !== '' ? Number(form.balance) : undefined,
        daily_limit_override: form.daily_limit_override !== '' ? Number(form.daily_limit_override) : null,
        name: form.name,
        phone: form.phone || undefined,
      };
      await updateAdminUser(id, payload);
      notify(T('User updated', '用户已更新'));
      setEditId(null);
      load();
    } catch (e) {
      notify(e.response?.data?.error || 'Failed', 'red');
    }
  };

  const statusColor = { active: 'green', suspended: 'red', banned: 'red' };

  return (
    <div>
      <SectionHeader
        title={T('Users', '用户')}
        subtitle={T('Manage accounts, balances & billing modes', '管理账户、余额与计费模式')}
        actions={
          <div className="flex gap-2">
            <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder={T('Search email/name...', '搜索邮箱/姓名...')} className="w-56" />
            <Button onClick={load}>{T('Search', '搜索')}</Button>
          </div>
        }
      />
      <Toast message={toast} color={toastColor} />

      <Table head={[T('User', '用户'), T('Status', '状态'), T('Balance', '余额'), T('Billing', '计费'), T('Daily limit', '每日上限'), T('Actions', '操作')]}>
        {users.map((u) =>
          editId === u.id ? (
            <tr key={u.id} className="bg-indigo-50/40 dark:bg-indigo-950/50/40">
              <td className="px-4 py-3">
                <div className="font-medium text-slate-900 dark:text-white">{u.email}</div>
                <TextInput value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="mt-1 text-xs" />
              </td>
              <td className="px-4 py-3">
                <SelectInput value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="active">{T('Active', '启用')}</option>
                  <option value="suspended">{T('Suspended', '已暂停')}</option>
                  <option value="banned">{T('Banned', '已封禁')}</option>
                </SelectInput>
              </td>
              <td className="px-4 py-3">
                <TextInput type="number" value={form.balance} onChange={(e) => setForm({ ...form, balance: e.target.value })} className="w-28" />
              </td>
              <td className="px-4 py-3">
                <SelectInput value={form.billing_mode} onChange={(e) => setForm({ ...form, billing_mode: e.target.value })}>
                  <option value="prepaid">prepaid</option>
                  <option value="subscription">subscription</option>
                  <option value="hybrid">hybrid</option>
                </SelectInput>
              </td>
              <td className="px-4 py-3">
                <TextInput type="number" value={form.daily_limit_override} onChange={(e) => setForm({ ...form, daily_limit_override: e.target.value })} className="w-24" />
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-1.5">
                  <Button onClick={() => save(u.id)}>{T('Save', '保存')}</Button>
                  <Button variant="ghost" onClick={() => setEditId(null)}>{T('Cancel', '取消')}</Button>
                </div>
              </td>
            </tr>
          ) : (
            <tr key={u.id}>
              <td className="px-4 py-3">
                <div className="font-medium text-slate-900 dark:text-white">{u.name || '—'}</div>
                <div className="text-xs text-slate-500 dark:text-slate-400">{u.email}</div>
              </td>
              <td className="px-4 py-3"><Badge color={statusColor[u.status] || 'slate'}>{u.status}</Badge></td>
              <td className="px-4 py-3 font-medium">${Number(u.balance).toFixed(2)}</td>
              <td className="px-4 py-3"><Badge color="blue">{u.billing_mode}</Badge></td>
              <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{u.daily_limit_override ?? '—'}</td>
              <td className="px-4 py-3"><Button variant="ghost" onClick={() => openEdit(u)}>{T('Edit', '编辑')}</Button></td>
            </tr>
          )
        )}
      </Table>
    </div>
  );
}
