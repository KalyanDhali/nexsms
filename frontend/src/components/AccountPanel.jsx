import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getKyc, submitKyc, getReferral, getBonusStatus, claimBonus } from '../services/api.js';
import TemplatesSection from './TemplatesSection.jsx';
import AiSection from './AiSection.jsx';
import AnalyticsSection from './AnalyticsSection.jsx';

export default function AccountPanel() {
  const { theme } = useTheme();
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);

  const [referral, setReferral] = useState(null);
  const [bonus, setBonus] = useState({ amount: 0.25, claimed: false, loading: true });
  const [claiming, setClaiming] = useState(false);
  const [kyc, setKyc] = useState({ kyc_status: 'not_verified', submission: null });
  const [kycForm, setKycForm] = useState({ full_name: '', document_type: 'passport', document_id: '' });
  const [toast, setToast] = useState('');
  const [toastColor, setToastColor] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const [{ data: r }, { data: k }, { data: b }] = await Promise.all([getReferral(), getKyc(), getBonusStatus()]);
      setReferral(r);
      setKyc(k);
      setBonus({ amount: Number(b.amount || 0.25), claimed: !!b.claimed, loading: false });
    } catch {
      setBonus((prev) => ({ ...prev, loading: false }));
    }
  };

  const notify = (msg, color = '') => {
    setToast(msg);
    setToastColor(color);
    setTimeout(() => setToast(''), 3000);
  };

  const doClaimBonus = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const { data } = await claimBonus();
      setBonus((prev) => ({ ...prev, claimed: true }));
      notify(T(`Claimed $${Number(data.amount).toFixed(2)}!`, `已领取 $${Number(data.amount).toFixed(2)}！`));
    } catch (e) {
      notify(e.response?.data?.error || T('Claim failed', '领取失败'), 'red');
    } finally {
      setClaiming(false);
    }
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
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        {toast && (
          <div className={`p-3 rounded-lg text-sm text-white ${toastColor === 'red' ? 'bg-red-50 dark:bg-red-950/400' : ''}`}
            style={toastColor === 'red' ? undefined : { background: theme.primary }}>
            {toast}
          </div>
        )}

        {/* Daily bonus */}
        <div className="bg-gradient-to-br from-primary/10 via-white dark:via-slate-900 to-indigo-50 dark:to-slate-900 dark:from-indigo-950/30 rounded-2xl border border-primary/20 dark:border-indigo-800/50 p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-12 h-12 shrink-0 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-500/20">
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="8" width="18" height="4" rx="1" />
                <path d="M12 8v13" />
                <path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7" />
                <path d="M7.5 8a2.5 2.5 0 0 1 0-5C11 3 12 8 12 8s1-5 4.5-5a2.5 2.5 0 0 1 0 5" />
              </svg>
            </span>
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">{T('Daily bonus', '每日奖励')}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {bonus.loading
                  ? T('Loading…', '加载中…')
                  : bonus.claimed
                  ? T('Come back tomorrow for another free credit!', '明天再来领取免费奖励吧！')
                  : T(`Claim $${Number(bonus.amount).toFixed(2)} of free credit — every day.`, `每天可领取 $${Number(bonus.amount).toFixed(2)} 免费额度。`)}
              </p>
            </div>
          </div>
          <button
            onClick={doClaimBonus}
            disabled={bonus.loading || bonus.claimed || claiming}
            className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition ${
              bonus.claimed
                ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed'
                : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90 active:scale-[0.98] shadow-lg shadow-amber-500/20'
            }`}
          >
            {claiming ? '…' : bonus.claimed ? T('Claimed', '已领取') : T('Claim', '领取')}
          </button>
        </div>

        {/* Referral */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{T('Referral program', '推荐奖励')}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            {T('Invite friends and earn a percentage of their first deposit automatically.',
               '邀请好友，自动获得其首次充值的一定比例奖励。')}
          </p>
          {referral?.code ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <code className="px-3 py-2 bg-slate-100 dark:bg-slate-800 rounded-lg font-mono font-semibold text-slate-800 dark:text-slate-100">{referral.code}</code>
                <button onClick={copyLink} className="px-3 py-2 text-sm rounded-lg text-white font-medium hover:opacity-90 transition"
                  style={{ background: theme.primary }}>
                  {T('Copy invite link', '复制邀请链接')}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="px-3 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                  <div className="text-xs text-slate-400 dark:text-slate-500">{T('Friends joined', '邀请好友数')}</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-white">{referral.count ?? 0}</div>
                </div>
                <div className="px-3 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40">
                  <div className="text-xs text-emerald-600/80 dark:text-emerald-400/80">{T('Earned', '已获得')}</div>
                  <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                    ${Number(referral.earnings ?? 0).toFixed(2)}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-400 dark:text-slate-500">{T('Loading…', '加载中…')}</p>
          )}
        </div>

        {/* KYC */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-semibold text-slate-900 dark:text-white">{T('Identity verification (KYC)', '身份认证 (KYC)')}</h3>
            <span className={`px-2.5 py-1 text-xs rounded-full font-medium ${
              kyc.kyc_status === 'verified' ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
              : kyc.kyc_status === 'rejected' ? 'bg-red-50 dark:bg-red-950/40 text-red-500'
              : kyc.kyc_status === 'pending' ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
              {kycStatusLabel[kyc.kyc_status] || kyc.kyc_status}
            </span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
            {T('Verification may be required for deposits when enabled by the platform.',
               '平台开启时，充值可能需要进行身份认证。')}
          </p>

          {kyc.kyc_status !== 'verified' && kyc.kyc_status !== 'pending' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <input
                value={kycForm.full_name}
                onChange={(e) => setKycForm({ ...kycForm, full_name: e.target.value })}
                placeholder={T('Full name', '真实姓名')}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2"
              />
              <select
                value={kycForm.document_type}
                onChange={(e) => setKycForm({ ...kycForm, document_type: e.target.value })}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="passport">{T('Passport', '护照')}</option>
                <option value="national_id">{T('National ID', '身份证')}</option>
                <option value="drivers_license">{T("Driver's license", '驾照')}</option>
              </select>
              <input
                value={kycForm.document_id}
                onChange={(e) => setKycForm({ ...kycForm, document_id: e.target.value })}
                placeholder={T('Document number', '证件号码')}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2"
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
