import { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { getAdminApiKeys, revokeAdminApiKey } from '../../services/api.js';
import { SectionHeader, Card, Toast } from './ui.jsx';

export default function ApiKeysSection() {
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);
  const [keys, setKeys] = useState([]);
  const [toast, setToast] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getAdminApiKeys();
        setKeys(data.keys);
      } catch (e) {
        setToast(e.response?.data?.error || 'Failed');
      }
    })();
  }, []);

  const revoke = async (id) => {
    if (!confirm(T('Revoke this API key?', '撤销此 API 密钥？'))) return;
    try {
      await revokeAdminApiKey(id);
      setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, active: false } : k)));
      setToast(T('API key revoked', 'API 密钥已撤销'));
    } catch (e) {
      setToast(e.response?.data?.error || 'Failed');
    }
  };

  return (
    <div>
      <SectionHeader title={T('API keys', 'API 密钥')} subtitle={T('All user API keys across the platform', '平台内所有用户的 API 密钥')} />
      <Toast message={toast} />
      <Card>
        {!keys.length ? (
          <p className="text-sm text-slate-400">{T('No API keys', '暂无 API 密钥')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 border-b border-slate-100">
                <th className="py-2 font-medium">{T('User', '用户')}</th>
                <th className="py-2 font-medium">{T('Name', '名称')}</th>
                <th className="py-2 font-medium">{T('Key', '密钥')}</th>
                <th className="py-2 font-medium">{T('Status', '状态')}</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} className="border-b border-slate-50">
                  <td className="py-2 text-slate-800">{k.email}</td>
                  <td className="py-2 text-slate-500">{k.name}</td>
                  <td className="py-2 font-mono text-xs text-slate-500">{k.prefix}••••</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${k.active ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                      {k.active ? T('Active', '活跃') : T('Revoked', '已撤销')}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    {k.active && (
                      <button onClick={() => revoke(k.id)} className="text-xs text-red-500 hover:text-red-700">{T('Revoke', '撤销')}</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
