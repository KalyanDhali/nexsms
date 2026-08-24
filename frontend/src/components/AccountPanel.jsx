import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getKyc, submitKyc, getReferral } from '../services/api.js';
import TemplatesSection from './TemplatesSection.jsx';
import AiSection from './AiSection.jsx';
import AnalyticsSection from './AnalyticsSection.jsx';

export default function AccountPanel() {
  const { theme } = useTheme();
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);

  const [referral, setReferral] = useState(null);
  const [kyc, setKyc] = useState({ kyc_status: 'not_verified', submission: null });
  const [kycForm, setKycForm] = useState({ full_name: '', document_type: 'passport', document_id: '' });
  const [toast, setToast] = useState('');
  const [toastColor, setToastColor] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [{ data: r }, { data: k }] = await Promise.all([getReferral(), getKyc()]);
      setReferral(r);
      setKyc(k);
    } catch {
      // silent
    }
  };

  const notify = (msg, color = '') => {
    setToast(msg);
    setToastColor(color);
    setTimeout(() => setToast(''), 3000);
  };

  const copyLink = () => {
    navigator.clipboard?.writeText(referral?.url || '');
    notify(T('Invite link copied', '邀请链接已复制'));
  };

  const doSubmitKyc = async () => {
    if (!kycForm.full_name || !kycForm.document_id) {
      return notify(T('Fill in all fields', '请填写所有字段'), 'red');
    }
    try {
      await submitKyc(kycForm);
      notify(T('Submitted — awaiting review', '已提交 — 等待审核'));
      load();
    } catch (e) {
      notify(e.response?.data?.error || 'Failed', 'red');
    }
  };

  const kycStatusLabel = {
    not_verified: T('Not verified', '未认证'),
    pending: T('Pending review', '审核中'),
    verified: T('Verified', '已认证'),
    rejected: T('Rejected', '已拒绝'),
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {toast && (
          <div className={`p-3 rounded-lg text-sm text-white ${toastColor === 'red' ? 'bg-red-500' : ''}`}
            style={toastColor === 'red' ? undefined : { background: theme.primary }}>
            {toast}
          </div>
        )}

        {/* Referral */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-900 mb-1">{T('Referral program', '推荐奖励')}</h3>
          <p className="text-sm text-slate-500 mb-3">
            {T('Invite friends and earn a percentage of their first deposit automatically.',
               '邀请好友，自动获得其首次充值的一定比例奖励。')}
          </p>
          {referral?.code ? (
            <div className="flex items-center gap-2">
              <code className="px-3 py-2 bg-slate-100 rounded-lg font-mono font-semibold text-slate-800">{referral.code}</code>
              <button onClick={copyLink} className="px-3 py-2 text-sm rounded-lg text-white font-medium hover:opacity-90 transition"
                style={{ background: theme.primary }}>
                {T('Copy invite link', '复制邀请链接')}
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-400">{T('Loading…', '加载中…')}</p>
          )}
        </div>

        {/* KYC */}
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-slate-900">{T('Identity verification (KYC)', '身份认证 (KYC)')}</h3>
            <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${
              kyc.kyc_status === 'verified' ? 'bg-emerald-50 text-emerald-600'
              : kyc.kyc_status === 'rejected' ? 'bg-red-50 text-red-500'
              : kyc.kyc_status === 'pending' ? 'bg-amber-50 text-amber-600'
              : 'bg-slate-100 text-slate-500'}`}>
              {kycStatusLabel[kyc.kyc_status] || kyc.kyc_status}
            </span>
          </div>
          <p className="text-sm text-slate-500 mb-3">
            {T('Verification may be required for deposits when enabled by the platform.',
               '平台开启时，充值可能需要进行身份认证。')}
          </p>

          {kyc.kyc_status !== 'verified' && kyc.kyc_status !== 'pending' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={kycForm.full_name}
                onChange={(e) => setKycForm({ ...kycForm, full_name: e.target.value })}
                placeholder={T('Full name', '真实姓名')}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2"
              />
              <select
                value={kycForm.document_type}
                onChange={(e) => setKycForm({ ...kycForm, document_type: e.target.value })}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white"
              >
                <option value="passport">{T('Passport', '护照')}</option>
                <option value="national_id">{T('National ID', '身份证')}</option>
                <option value="drivers_license">{T("Driver's license", '驾照')}</option>
              </select>
              <input
                value={kycForm.document_id}
                onChange={(e) => setKycForm({ ...kycForm, document_id: e.target.value })}
                placeholder={T('Document number', '证件号码')}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2"
              />
              <div className="md:col-span-3">
                <button onClick={doSubmitKyc} className="px-4 py-2 text-sm text-white rounded-lg font-medium hover:opacity-90 transition"
                  style={{ background: theme.primary }}>
                  {T('Submit for verification', '提交认证')}
                </button>
              </div>
            </div>
          )}

          {kyc.submission?.status === 'rejected' && kyc.submission.note && (
            <p className="text-xs text-red-500 mt-2">
              {T('Rejection reason', '拒绝原因')}: {kyc.submission.note}
            </p>
          )}
        </div>

        {/* Analytics */}
        <AnalyticsSection />

        {/* Templates */}
        <TemplatesSection />

        {/* AI auto-reply */}
        <AiSection />
      </div>
    </div>
  );
}
