import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getUserWebhooks, createUserWebhook, updateUserWebhook, deleteUserWebhook } from '../services/api.js';

const EVENT_OPTIONS = [
  { value: 'sent', label: 'sent' },
  { value: 'delivered', label: 'delivered' },
  { value: 'failed', label: 'failed' },
  { value: 'inbound', label: 'inbound' },
];

export default function WebhooksSection() {
  const { theme } = useTheme();
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);

  const [hooks, setHooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [events, setEvents] = useState(['sent', 'delivered']);
  const [secret, setSecret] = useState(null);
  const [toast, setToast] = useState('');
  const [toastColor, setToastColor] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const { data } = await getUserWebhooks();
      setHooks(data.webhooks);
    } catch (e) {
      notify(e.response?.data?.error || 'Failed to load webhooks', 'red');
    } finally {
      setLoading(false);
    }
  };

  const notify = (msg, color = '') => {
    setToast(msg);
    setToastColor(color);
    setTimeout(() => setToast(''), 3500);
  };

  const toggleEvent = (ev) => {
    setEvents((prev) => (prev.includes(ev) ? prev.filter((x) => x !== ev) : [...prev, ev]));
  };

  const doCreate = async () => {
    if (!url.trim()) return notify(T('Webhook URL required', '需要 Webhook 地址'), 'red');
    if (!events.length) return notify(T('Select at least one event', '请至少选择一个事件'), 'red');
    try {
      const { data } = await createUserWebhook({ url: url.trim(), events });
      setSecret(data.webhook.secret);
      setUrl('');
      await load();
      notify(T('Webhook created — secret shown once', 'Webhook 已创建 — 密钥仅显示一次'));
    } catch (e) {
      notify(e.response?.data?.error || 'Failed', 'red');
    }
  };

  const doUpdate = async (hook) => {
    try {
      await updateUserWebhook(hook.id, { active: !hook.active });
      setHooks((prev) => prev.map((h) => (h.id === hook.id ? { ...h, active: !hook.active } : h)));
      notify(T('Webhook updated', 'Webhook 已更新'));
    } catch (e) {
      notify(e.response?.data?.error || 'Failed', 'red');
    }
  };

  const doDelete = async (id) => {
    if (!confirm(T('Delete this webhook?', '删除此 Webhook？'))) return;
    try {
      await deleteUserWebhook(id);
      setHooks((prev) => prev.filter((h) => h.id !== id));
      notify(T('Webhook deleted', 'Webhook 已删除'));
    } catch (e) {
      notify(e.response?.data?.error || 'Failed', 'red');
    }
  };

  const copySecret = () => {
    navigator.clipboard?.writeText(secret);
    notify(T('Secret copied', '密钥已复制'));
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-900 mb-1">{T('Webhooks', 'Webhooks')}</h3>
      <p className="text-sm text-slate-500 mb-3">
        {T('Get real-time notifications when messages are sent, delivered, fail or arrive. Each request includes an HMAC-SHA256 X-NexSMS-Signature header.',
           '在消息发送、送达、失败或接收时实时通知。每个请求都带有 HMAC-SHA256 X-NexSMS-Signature 签名头。')}
      </p>

      <div className="space-y-3">
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={T('https://your-server.com/nexsms-hook', 'https://your-server.com/nexsms-hook')}
          className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2"
          style={{ '--tw-ring-color': theme.primary }}
        />
        <div className="flex flex-wrap gap-2">
          {EVENT_OPTIONS.map((ev) => (
            <label key={ev.value} className="flex items-center gap-1.5 text-sm text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 cursor-pointer">
              <input
                type="checkbox"
                checked={events.includes(ev.value)}
                onChange={() => toggleEvent(ev.value)}
                className="w-3.5 h-3.5 accent-indigo-600"
              />
              {ev.label}
            </label>
          ))}
        </div>
        <button onClick={doCreate} className="px-4 py-2 text-sm text-white rounded-lg font-medium hover:opacity-90 transition"
          style={{ background: theme.primary }}>
          {T('Create webhook', '创建 Webhook')}
        </button>
      </div>

      {secret && (
        <div className="mt-3 p-3 rounded-lg bg-slate-900 text-slate-100 text-sm break-all">
          <div className="text-xs text-slate-400 mb-1">
            {T('Your webhook secret (shown once) — use it to verify signatures:', '您的 Webhook 密钥（仅显示一次）— 用于验证签名：')}
          </div>
          <div className="flex items-center gap-2">
            <code className="flex-1">{secret}</code>
            <button onClick={copySecret} className="px-3 py-1 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-white transition">
              {T('Copy', '复制')}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="mt-4 text-sm text-slate-500">{T('Loading…', '加载中…')}</div>
      ) : hooks.length === 0 ? (
        <div className="mt-4 text-sm text-slate-400">{T('No webhooks configured.', '尚未配置 Webhook。')}</div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="px-3 py-2 font-medium">{T('URL', '地址')}</th>
                <th className="px-3 py-2 font-medium">{T('Events', '事件')}</th>
                <th className="px-3 py-2 font-medium">{T('Status', '状态')}</th>
                <th className="px-3 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {hooks.map((h) => (
                <tr key={h.id} className="border-b border-slate-50">
                  <td className="px-3 py-2 font-mono text-xs text-slate-700 max-w-[220px] truncate">{h.url}</td>
                  <td className="px-3 py-2 text-slate-500 text-xs">{(h.events || []).join(', ')}</td>
                  <td className="px-3 py-2">
                    <button onClick={() => doUpdate(h)} className={`px-2 py-0.5 text-xs rounded-full ${h.active ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                      {h.active ? T('Active', '活跃') : T('Disabled', '已停用')}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => doDelete(h.id)} className="text-xs text-red-500 hover:text-red-700">
                      {T('Delete', '删除')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
