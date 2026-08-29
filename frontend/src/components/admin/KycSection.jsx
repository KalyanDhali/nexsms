import { useEffect, useState } from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { adminGetKyc, adminApproveKyc, adminRejectKyc } from '../../services/api.js';
import { Badge, Button, Field, SectionHeader, Toast, Table, Card } from './ui.jsx';

const STATUS_STYLE = {
  pending: { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-600 dark:text-amber-400' },
  approved: { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-600 dark:text-emerald-400' },
  rejected: { bg: 'bg-red-50 dark:bg-red-950/40', text: 'text-red-500' },
};

export default function KycSection() {
  const { theme } = useTheme();
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);

  const [filter, setFilter] = useState('pending');
  const [subs, setSubs] = useState([]);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectingId, setRejectingId] = useState(null);
  const [toast, setToast] = useState('');
  const [toastColor, setToastColor] = useState('');

  const load = async (f = filter) => {
    try {
      const { data } = await adminGetKyc({ status: f });
      setSubs(data.submissions);
    } catch (e) {
      notify(e.response?.data?.error || 'Failed to load', 'red');
    }
  };
  useEffect(() => { load(); }, []);

  const notify = (msg, color = '') => {
    setToast(msg); setToastColor(color);
    setTimeout(() => setToast(''), 3000);
  };

  const approve = async (id) => {
    try {
      await adminApproveKyc(id);
      notify(T('Approved — user marked verified', '已批准 — 用户标记为已认证'));
      load();
    } catch (e) { notify(e.response?.data?.error || 'Failed', 'red'); }
  };

  const reject = async (id) => {
    try {
      await adminRejectKyc(id, { note: rejectNote || null });
      notify(T('Rejected', '已拒绝'));
      setRejectNote(''); setRejectingId(null);
      load();
    } catch (e) { notify(e.response?.data?.error || 'Failed', 'red'); }
  };

  const docLabel = (t) => ({ passport: T('Passport', '护照'), national_id: T('National ID', '身份证'), drivers_license: T("Driver's license", '驾照') }[t] || t);

  return (
    <div>
      <SectionHeader title={T('KYC Verification', 'KYC 认证')} subtitle={T('Review and verify identity submissions', '审核身份认证提交')} />
      <Toast color={toastColor} msg={toast} />
      <Card className="mb-5">
        <div className="flex gap-2">
          {['pending', 'approved', 'rejected'].map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); load(f); }}
              className={`px-3 py-1.5 text-sm rounded-lg transition ${filter === f ? 'text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'}`}
              style={filter === f ? { background: theme.primary } : {}}
            >
              {f === 'pending' ? T('Pending', '待审核') : f === 'approved' ? T('Approved', '已通过') : T('Rejected', '已拒绝')}
            </button>
          ))}
        </div>
      </Card>

      <Table head={[T('User', '用户'), T('Name', '姓名'), T('Document', '证件'), T('Submitted', '提交时间'), T('Status', '状态'), T('Actions', '操作')]}>
        {subs.length === 0 ? (
          <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500 text-sm">{T('Nothing here', '暂无记录')}</td></tr>
        ) : subs.map((s) => (
          <tr key={s.id}>
            <td className="px-4 py-2.5 text-slate-800 dark:text-slate-100">{s.email}</td>
            <td className="px-4 py-2.5 text-slate-700 dark:text-slate-200">{s.full_name}</td>
            <td className="px-4 py-2.5 text-slate-600 dark:text-slate-300 text-sm">{docLabel(s.document_type)} · <span className="font-mono">{s.document_id}</span></td>
            <td className="px-4 py-2.5 text-slate-500 dark:text-slate-400 text-sm">{new Date(s.submitted_at).toLocaleString()}</td>
            <td className="px-4 py-2.5">
              <Badge bg={STATUS_STYLE[s.status]?.bg} color={STATUS_STYLE[s.status]?.text}>
                {s.status}
              </Badge>
            </td>
            <td className="px-4 py-2.5">
              {s.status === 'pending' ? (
                <div className="flex gap-2 items-center">
                  <Button onClick={() => approve(s.id)}>{T('Approve', '通过')}</Button>
                  <input
                    value={rejectingId === s.id ? rejectNote : ''}
                    onChange={(e) => { setRejectingId(s.id); setRejectNote(e.target.value); }}
                    placeholder={T('Reason (optional)', '原因（可选）')}
                    className="px-2 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none"
                  />
                  <Button variant="danger" onClick={() => reject(s.id)}>{T('Reject', '拒绝')}</Button>
                </div>
              ) : (
                <span className="text-xs text-slate-400 dark:text-slate-500">{s.note || '—'}</span>
              )}
            </td>
          </tr>
        ))}
      </Table>
    </div>
  );
}
