import { useEffect, useState } from 'react';
import { getAdminPlans, createPlan, updatePlan, deletePlan } from '../../services/api.js';
import { Badge, Button, Field, TextInput, SelectInput, SectionHeader, Toast, Table, Card } from './ui.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

const empty = { name: '', slug: '', price: 0, sms_quota: 0, daily_limit_per_number: 0, description: '', features: '', active: true, sort_order: 0 };

export default function PlansSection() {
  const [plans, setPlans] = useState([]);
  const [editing, setEditing] = useState(null);
  const [f, setF] = useState(empty);
  const [toast, setToast] = useState('');
  const [toastColor, setToastColor] = useState('');
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try {
      const { data } = await getAdminPlans();
      setPlans(data.plans);
    } catch (e) { notify(e.response?.data?.error || 'Failed', 'red'); }
  };

  const notify = (msg, color = '') => {
    setToast(msg); setToastColor(color);
    setTimeout(() => setToast(''), 2500);
  };

  const openNew = () => { setEditing(null); setF(empty); };
  const openEdit = (p) => {
    setEditing(p);
    setF({ ...p, features: (p.features || []).join(', ') });
  };

  const save = async () => {
    try {
      const payload = {
        name: f.name, slug: f.slug, price: Number(f.price), sms_quota: Number(f.sms_quota),
        daily_limit_per_number: Number(f.daily_limit_per_number), description: f.description,
        features: f.features ? f.features.split(',').map((x) => x.trim()).filter(Boolean) : [],
        active: f.active, sort_order: Number(f.sort_order),
      };
      if (editing) {
        await updatePlan(editing.id, payload);
        notify(T('Plan updated', '套餐已更新'));
      } else {
        await createPlan(payload);
        notify(T('Plan created', '套餐已创建'));
      }
      setEditing(null);
      load();
    } catch (e) { notify(e.response?.data?.error || 'Failed', 'red'); }
  };

  const remove = async (id) => {
    if (!confirm(T('Delete this plan?', '删除此套餐？'))) return;
    try {
      await deletePlan(id);
      notify(T('Plan deleted', '套餐已删除'));
      load();
    } catch (e) { notify(e.response?.data?.error || 'Failed', 'red'); }
  };

  return (
    <div>
      <SectionHeader
        title={T('Plans', '套餐')}
        subtitle={T('Pricing plans & SMS quotas', '定价套餐与短信额度')}
        actions={<Button onClick={openNew}>{T('+ New plan', '+ 新建套餐')}</Button>}
      />
      <Toast message={toast} color={toastColor} />

      {(editing !== null || !plans.length) && (
        <Card className="mb-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Field label={T('Name', '名称')}><TextInput value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
            <Field label="Slug"><TextInput value={f.slug} onChange={(e) => setF({ ...f, slug: e.target.value })} /></Field>
            <Field label={T('Price ($/mo)', '价格(美元/月)')}><TextInput type="number" value={f.price} onChange={(e) => setF({ ...f, price: e.target.value })} /></Field>
            <Field label={T('SMS quota', '短信额度')}><TextInput type="number" value={f.sms_quota} onChange={(e) => setF({ ...f, sms_quota: e.target.value })} /></Field>
            <Field label={T('Daily limit/num', '每号每日上限')}><TextInput type="number" value={f.daily_limit_per_number} onChange={(e) => setF({ ...f, daily_limit_per_number: e.target.value })} /></Field>
            <Field label={T('Sort order', '排序')}><TextInput type="number" value={f.sort_order} onChange={(e) => setF({ ...f, sort_order: e.target.value })} /></Field>
            <Field label={T('Active', '启用')}>
              <SelectInput value={f.active} onChange={(e) => setF({ ...f, active: e.target.value === 'true' })}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </SelectInput>
            </Field>
            <Field label={T('Description', '描述')}><TextInput value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
            <div className="col-span-2">
              <Field label={T('Features (comma separated)', '功能(逗号分隔)')}>
                <TextInput value={f.features} onChange={(e) => setF({ ...f, features: e.target.value })} placeholder="1 number, 1000 SMS/month" />
              </Field>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={save}>{editing ? T('Save', '保存') : T('Create', '创建')}</Button>
            {editing && <Button variant="ghost" onClick={() => { setEditing(null); }}>{T('Cancel', '取消')}</Button>}
          </div>
        </Card>
      )}

      <Table head={[T('Plan', '套餐'), T('Price', '价格'), T('Quota', '额度'), T('Daily/num', '每日/号'), T('Status', '状态'), T('Actions', '操作')]}>
        {plans.map((p) => (
          <tr key={p.id}>
            <td className="px-4 py-3">
              <div className="font-medium text-slate-900 dark:text-white">{p.name}</div>
              <div className="text-xs text-slate-400 dark:text-slate-500">{p.slug}</div>
            </td>
            <td className="px-4 py-3 font-medium">${Number(p.price).toFixed(2)}</td>
            <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{p.sms_quota}</td>
            <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{p.daily_limit_per_number}</td>
            <td className="px-4 py-3"><Badge color={p.active ? 'green' : 'slate'}>{p.active ? T('Active', '启用') : T('Inactive', '禁用')}</Badge></td>
            <td className="px-4 py-3">
              <div className="flex gap-1.5">
                <Button variant="ghost" onClick={() => openEdit(p)}>{T('Edit', '编辑')}</Button>
                <Button variant="danger" onClick={() => remove(p.id)}>{T('Delete', '删除')}</Button>
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
