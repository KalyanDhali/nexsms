import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getApiKeys, createApiKey, revokeApiKey } from '../services/api.js';
import WebhooksSection from './WebhooksSection.jsx';

export default function ApiKeysPanel() {
  const { theme } = useTheme();
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);

  const [keys, setKeys] = useState([]);
  const [name, setName] = useState('');
  const [rawKey, setRawKey] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [toastColor, setToastColor] = useState('');

  useEffect(() => {
    loadKeys();
  }, []);

  const loadKeys = async () => {
    try {
      const { data } = await getApiKeys();
      setKeys(data.keys);
    } catch (e) {
      notify(e.response?.data?.error || 'Failed to load keys', 'red');
    } finally {
      setLoading(false);
    }
  };

  const notify = (msg, color = '') => {
    setToast(msg);
    setToastColor(color);
    setTimeout(() => setToast(''), 3000);
  };

  const doCreate = async () => {
    try {
      const { data } = await createApiKey({ name: name.trim() || 'Default' });
      setRawKey(data.rawKey);
      setKeys((prev) => [
        { id: data.key.id, name: data.key.name, prefix: data.key.prefix, active: true, created_at: new Date().toISOString() },
        ...prev,
      ]);
      setName('');
      notify(T('API key created — copy it now, it is shown only once', 'API 密钥已创建 — 请立即复制，仅显示一次'));
    } catch (e) {
      notify(e.response?.data?.error || 'Failed', 'red');
    }
  };

  const doRevoke = async (id) => {
    if (!confirm(T('Revoke this API key? Applications using it will stop working.', '撤销此 API 密钥？使用它的应用将停止工作。'))) return;
    try {
      await revokeApiKey(id);
      setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, active: false } : k)));
      notify(T('API key revoked', 'API 密钥已撤销'));
    } catch (e) {
      notify(e.response?.data?.error || 'Failed', 'red');
    }
  };

  const copyRaw = () => {
    navigator.clipboard?.writeText(rawKey);
    notify(T('Key copied — store it securely', '密钥已复制 — 请妥善保管'));
  };

  const fmtDate = (s) => (s ? new Date(s).toLocaleString() : '—');

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {toast && (
          <div className={`p-3 rounded-lg text-sm text-white ${toastColor === 'red' ? 'bg-red-50 dark:bg-red-950/400' : ''}`}
            style={toastColor === 'red' ? undefined : { background: theme.primary }}>
            {toast}
          </div>
        )}

        {/* Create key */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{T('API Access', 'API 访问')}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            {T('Programmatically send SMS from your numbers via the NexSMS API.',
               '通过 NexSMS API 从您的号码编程发送短信。')}
          </p>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={T('Key name (e.g. Production)', '密钥名称（如 生产环境）')}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2"
              style={{ '--tw-ring-color': theme.primary }}
            />
            <button onClick={doCreate} className="px-4 py-2 text-sm text-white rounded-lg font-medium hover:opacity-90 transition"
              style={{ background: theme.primary }}>
              {T('Generate key', '生成密钥')}
            </button>
          </div>

          {rawKey && (
            <div className="mt-3 p-3 rounded-lg bg-slate-900 text-slate-100 text-sm break-all">
              <div className="text-xs text-slate-400 dark:text-slate-500 mb-1">{T('Your API key (shown once):', '您的 API 密钥（仅显示一次）：')}</div>
              <div className="flex items-center gap-2">
                <code className="flex-1">{rawKey}</code>
                <button onClick={copyRaw} className="px-3 py-1 text-xs rounded-lg bg-white/10 hover:bg-white/20 text-white transition">
                  {T('Copy', '复制')}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Keys list */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="font-semibold text-slate-900 dark:text-white">{T('Your API keys', '您的 API 密钥')}</h3>
          </div>
          {loading ? (
            <div className="p-4 text-sm text-slate-500 dark:text-slate-400">{T('Loading…', '加载中…')}</div>
          ) : keys.length === 0 ? (
            <div className="p-4 text-sm text-slate-500 dark:text-slate-400">{T('No keys yet. Generate one above.', '暂无密钥，请在上面生成。')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-4 py-2 font-medium whitespace-nowrap">{T('Name', '名称')}</th>
                    <th className="px-4 py-2 font-medium whitespace-nowrap">{T('Key', '密钥')}</th>
                    <th className="px-4 py-2 font-medium whitespace-nowrap">{T('Last used', '最后使用')}</th>
                    <th className="px-4 py-2 font-medium whitespace-nowrap">{T('Status', '状态')}</th>
                    <th className="px-4 py-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {keys.map((k) => (
                    <tr key={k.id} className="border-b border-slate-50">
                      <td className="px-4 py-2 text-slate-800 dark:text-slate-100 whitespace-nowrap">{k.name}</td>
                      <td className="px-4 py-2 font-mono text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">{k.prefix}••••</td>
                      <td className="px-4 py-2 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">{k.last_used_at ? fmtDate(k.last_used_at) : T('Never', '从未')}</td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-xs rounded-full ${k.active ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-950/40 text-red-500'}`}>
                          {k.active ? T('Active', '活跃') : T('Revoked', '已撤销')}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-right whitespace-nowrap">
                        {k.active && (
                          <button onClick={() => doRevoke(k.id)} className="text-xs text-red-500 hover:text-red-700">
                            {T('Revoke', '撤销')}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <WebhooksSection />

        {/* Docs */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">{T('Quick start', '快速开始')}</h3>
          <pre className="text-xs bg-slate-900 text-slate-100 p-3 rounded-lg overflow-x-auto">
{`# ${T('Send an SMS', '发送短信')}
curl -X POST https://your-domain.com/api/v1/sms/send \\
  -H "Authorization: Bearer nex_live_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"to":"+14155550000","from":"+14159998877","body":"Hello from NexSMS"}'

# ${T('Delivery status', '投递状态')}
curl https://your-domain.com/api/v1/sms/:messageId \\
  -H "Authorization: Bearer nex_live_YOUR_KEY"

# ${T('Balance & quota', '余额与配额')}
curl https://your-domain.com/api/v1/balance \\
  -H "Authorization: Bearer nex_live_YOUR_KEY"`}
          </pre>
        </div>
      </div>
    </div>
  );
}
