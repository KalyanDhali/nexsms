import { useEffect, useState } from 'react';
import {
  getAdminProviders, createProvider, updateProvider, toggleProvider,
  providerHealthCheck, providerTestConnection,
} from '../../services/api.js';
import { Card, Badge, Button, Field, TextInput, SelectInput, SectionHeader, Toast, Table } from './ui.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

const TYPES = ['twilio', 'singlehouse', 'plivo', 'telnyx'];

export default function ProvidersSection() {
  const [providers, setProviders] = useState([]);
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState('');
  const [toastColor, setToastColor] = useState('');
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);

  const form = {
    name: '',
    type: 'twilio',
    priority: 0,
    accountSid: '',
    authToken: '',
    apiKey: '',
    apiSecret: '',
    baseUrl: '',
    credentials: '{}',
    active: true,
  };
  const [f, setF] = useState(form);

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const { data } = await getAdminProviders();
      setProviders(data.providers);
    } catch (e) {
      notify(e.response?.data?.error || 'Failed', 'red');
    }
  };

  const notify = (msg, color = '') => {
    setToast(msg);
    setToastColor(color);
    setTimeout(() => setToast(''), 2500);
  };

  const openNew = () => { setEditing(null); setF(form); };
  const openEdit = (p) => {
    setEditing(p);
    setF({
      name: p.name, type: p.type, priority: p.priority, active: p.active,
      accountSid: p.credentials?.accountSid || '', authToken: p.credentials?.authToken || '',
      apiKey: p.credentials?.apiKey || '', apiSecret: p.credentials?.apiSecret || '',
      baseUrl: p.credentials?.baseUrl || '',
      credentials: JSON.stringify(p.credentials || {}),
    });
  };

  const buildCredentials = () => {
    const base = JSON.parse(f.credentials || '{}');
    const flat = {};
    if (f.accountSid) flat.accountSid = f.accountSid;
    if (f.authToken) flat.authToken = f.authToken;
    if (f.apiKey) flat.apiKey = f.apiKey;
    if (f.apiSecret) flat.apiSecret = f.apiSecret;
    if (f.baseUrl) flat.baseUrl = f.baseUrl;
    return JSON.stringify({ ...base, ...flat });
  };

  const save = async () => {
    try {
      const payload = { name: f.name, type: f.type, priority: Number(f.priority), active: f.active, credentials: buildCredentials() };
      if (editing) {
        await updateProvider(editing.id, payload);
        notify(T('Provider updated', '提供商已更新'));
      } else {
        await createProvider(payload);
        notify(T('Provider added', '提供商已添加'));
      }
      setEditing(null);
      load();
    } catch (e) {
      notify(e.response?.data?.error || 'Failed', 'red');
    }
  };

  const toggle = async (p) => {
    await toggleProvider(p.id, { active: !p.active });
    load();
  };

  const health = async (p) => {
    const { data } = await providerHealthCheck(p.id);
    notify(`${T('Health:', '状态:')} ${data.health}${data.error ? ' — ' + data.error : ''}`, data.health === 'ok' ? '' : 'red');
    load();
  };

  const testConn = async () => {
    try {
      const { data } = await providerTestConnection({ type: f.type, credentials: buildCredentials() });
      notify(data.success ? T('Connection OK', '连接成功') : `${T('Failed:', '失败:')} ${data.error}`, data.success ? '' : 'red');
    } catch (e) {
      notify(e.response?.data?.error || 'Test failed', 'red');
    }
  };

  const healthColor = { ok: 'green', down: 'red', unknown: 'slate' };
  const statusColor = (active) => (active ? 'green' : 'red');

  return (
    <div>
      <SectionHeader
        title={T('Providers', '提供商')}
        subtitle={T('SMS gateway providers & failover routing', '短信网关提供商与故障转移路由')}
        actions={<Button onClick={openNew}>{T('+ Add provider', '+ 添加提供商')}</Button>}
      />
      <Toast message={toast} color={toastColor} />

      {editing !== null || !providers.length ? (
        <Card className="mb-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Field label={T('Name', '名称')}><TextInput value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="My Twilio" /></Field>
            <Field label={T('Type', '类型')}>
              <SelectInput value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}>
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </SelectInput>
            </Field>
            <Field label={T('Priority', '优先级')}><TextInput type="number" value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value })} /></Field>
            {f.type === 'twilio' && (
              <>
                <Field label="Account SID"><TextInput value={f.accountSid} onChange={(e) => setF({ ...f, accountSid: e.target.value })} /></Field>
                <Field label="Auth Token"><TextInput type="password" value={f.authToken} onChange={(e) => setF({ ...f, authToken: e.target.value })} /></Field>
              </>
            )}
            {(f.type === 'plivo' || f.type === 'telnyx') && (
              <>
                <Field label={f.type === 'plivo' ? 'Auth ID' : 'API Key'}><TextInput value={f.apiKey} onChange={(e) => setF({ ...f, apiKey: e.target.value })} /></Field>
                <Field label={f.type === 'plivo' ? 'Auth Token' : 'API Secret'}><TextInput type="password" value={f.apiSecret} onChange={(e) => setF({ ...f, apiSecret: e.target.value })} /></Field>
              </>
            )}
            {f.type === 'singlehouse' && (
              <Field label="Base URL"><TextInput value={f.baseUrl} onChange={(e) => setF({ ...f, baseUrl: e.target.value })} placeholder="https://dashboard.singlehouse.com" /></Field>
            )}
            <Field label={T('Active', '启用')}>
              <SelectInput value={f.active} onChange={(e) => setF({ ...f, active: e.target.value === 'true' })}>
                <option value="true">Yes</option>
                <option value="false">No</option>
              </SelectInput>
            </Field>
          </div>
          <div className="flex gap-2 mt-4">
            <Button onClick={save}>{editing ? T('Save', '保存') : T('Create', '创建')}</Button>
            <Button variant="ghost" onClick={testConn}>{T('Test connection', '测试连接')}</Button>
            {editing && <Button variant="ghost" onClick={() => { setEditing(null); }}>{T('Cancel', '取消')}</Button>}
          </div>
        </Card>
      ) : null}

      <Table head={[T('Name', '名称'), T('Type', '类型'), T('Priority', '优先级'), T('Health', '状态'), T('Status', '启用状态'), T('Actions', '操作')]}>
        {providers.map((p) => (
          <tr key={p.id}>
            <td className="px-4 py-3 font-medium text-slate-900">{p.name}</td>
            <td className="px-4 py-3"><code className="text-xs bg-slate-100 px-1.5 py-0.5 rounded">{p.type}</code></td>
            <td className="px-4 py-3 text-slate-500">{p.priority}</td>
            <td className="px-4 py-3"><Badge color={healthColor[p.health]}>{p.health}</Badge></td>
            <td className="px-4 py-3"><Badge color={statusColor(p.active)}>{p.active ? T('Active', '启用') : T('Off', '禁用')}</Badge></td>
            <td className="px-4 py-3">
              <div className="flex gap-1.5">
                <Button variant="ghost" onClick={() => health(p)}>{T('Health', '检测')}</Button>
                <Button variant="ghost" onClick={() => openEdit(p)}>{T('Edit', '编辑')}</Button>
                <Button variant={p.active ? 'danger' : 'ghost'} onClick={() => toggle(p)}>{p.active ? T('Disable', '禁用') : T('Enable', '启用')}</Button>
              </div>
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
