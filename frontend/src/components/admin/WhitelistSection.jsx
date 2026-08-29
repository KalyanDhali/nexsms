import { useEffect, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { getAdminWhitelist, addAdminWhitelist, removeAdminWhitelist } from '../../services/api.js';
import { SectionHeader, Card, Toast } from './ui.jsx';

export default function WhitelistSection() {
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);
  const [ips, setIps] = useState([]);
  const [ip, setIp] = useState('');
  const [note, setNote] = useState('');
  const [toast, setToast] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const { data } = await getAdminWhitelist();
      setIps(data.whitelist);
    } catch (e) {
      setToast(e.response?.data?.error || 'Failed');
    }
  };

  const add = async () => {
    if (!ip.trim()) return;
    try {
      await addAdminWhitelist({ ip: ip.trim(), note: note.trim() || null });
      setIp('');
      setNote('');
      load();
      setToast(T('IP whitelisted', 'IP 已加入白名单'));
    } catch (e) {
      setToast(e.response?.data?.error || 'Failed');
    }
  };

  const remove = async (entry) => {
    if (!confirm(T('Remove this IP from the whitelist?', '从白名单中移除此 IP？'))) return;
    try {
      await removeAdminWhitelist(entry.ip);
      load();
      setToast(T('IP removed', 'IP 已移除'));
    } catch (e) {
      setToast(e.response?.data?.error || 'Failed');
    }
  };

  return (
    <div>
      <SectionHeader title={T('IP whitelist', 'IP 白名单')} subtitle={T('Admin API access is restricted to these IPs when the admin_ip_whitelist toggle is on', '当 admin_ip_whitelist 开关开启时，仅这些 IP 可访问管理 API')} />
      <Toast message={toast} />
      <Card className="mb-5">
        <div className="flex gap-2">
          <input
            value={ip}
            onChange={(e) => setIp(e.target.value)}
            placeholder={T('IP address (e.g. 203.0.113.7)', 'IP 地址（如 203.0.113.7）')}
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={T('Note', '备注')}
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2"
          />
          <button onClick={add} className="px-4 py-2 text-sm text-white rounded-lg font-medium hover:opacity-90 transition bg-indigo-600">
            {T('Add', '添加')}
          </button>
        </div>
      </Card>
      <Card>
        {!ips.length ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">{T('No IPs whitelisted. Warning: enabling the toggle with an empty list locks out all admin access.', '白名单为空。警告：启用开关但列表为空将锁定所有管理访问。')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800">
                <th className="py-2 font-medium">{T('IP', 'IP')}</th>
                <th className="py-2 font-medium">{T('Note', '备注')}</th>
                <th className="py-2 font-medium">{T('Added', '添加时间')}</th>
                <th className="py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {ips.map((entry) => (
                <tr key={entry.ip} className="border-b border-slate-50">
                  <td className="py-2 font-mono text-slate-800 dark:text-slate-100">{entry.ip}</td>
                  <td className="py-2 text-slate-500 dark:text-slate-400">{entry.note || '—'}</td>
                  <td className="py-2 text-xs text-slate-400 dark:text-slate-500">{new Date(entry.created_at).toLocaleString()}</td>
                  <td className="py-2 text-right">
                    <button onClick={() => remove(entry)} className="text-xs text-red-500 hover:text-red-700">{T('Remove', '移除')}</button>
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
