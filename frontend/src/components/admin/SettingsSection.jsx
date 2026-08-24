import { useEffect, useState } from 'react';
import {
  getBillingSettings, getAdminSettings, getAdminToggles,
  updateAdminSetting, updateAdminToggle, updateAdminSetting as updateSetting,
} from '../../services/api.js';
import { Button, Field, TextInput, SelectInput, SectionHeader, Toast, Card } from './ui.jsx';
import { useLanguage } from '../../context/LanguageContext.jsx';

export default function SettingsSection() {
  const [billing, setBilling] = useState(null);
  const [settings, setSettings] = useState({});
  const [toggles, setToggles] = useState([]);
  const [theme, setTheme] = useState({});
  const [smsRate, setSmsRate] = useState('');
  const [payPerSmsDaily, setPayPerSmsDaily] = useState('');
  const [burstPerSec, setBurstPerSec] = useState('');
  const [toast, setToast] = useState('');
  const [toastColor, setToastColor] = useState('');
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);

  useEffect(() => {
    (async () => {
      try {
        const [{ data: b }, { data: s }, { data: tg }] = await Promise.all([
          getBillingSettings(), getAdminSettings(), getAdminToggles(),
        ]);
        setBilling(b.billing);
        setSettings(s.settings);
        setTheme(s.settings.theme || {});
        setToggles(tg.toggles);
        setSmsRate(s.settings.sms_rate?.rate ?? '');
        setPayPerSmsDaily(s.settings.pay_per_sms_limit?.daily ?? '');
        setBurstPerSec(s.settings.burst_limit?.perSecond ?? '');
      } catch (e) { notify(e.response?.data?.error || 'Failed', 'red'); }
    })();
  }, []);

  const notify = (msg, color = '') => {
    setToast(msg); setToastColor(color);
    setTimeout(() => setToast(''), 2500);
  };

  const saveTheme = async () => {
    await updateSetting('theme', theme);
    notify(T('Theme saved', '主题已保存'));
  };

  const saveBilling = async () => {
    await updateSetting('billing', billing);
    notify(T('Billing settings saved', '计费设置已保存'));
  };

  const saveRates = async () => {
    await Promise.all([
      updateSetting('sms_rate', { rate: Number(smsRate) }),
      updateSetting('pay_per_sms_limit', { daily: Number(payPerSmsDaily) }),
      updateSetting('burst_limit', { perSecond: Number(burstPerSec) }),
    ]);
    notify(T('Rate settings saved', '费率设置已保存'));
  };

  const toggle = async (key, enabled) => {
    await updateAdminToggle(key, { enabled });
    setToggles((prev) => prev.map((t) => (t.key === key ? { ...t, enabled } : t)));
    notify(T('Toggle updated', '开关已更新'));
  };

  const groupLabels = {
    fraud: T('Fraud prevention', '防欺诈'),
    billing: T('Billing & plans', '计费与套餐'),
    comms: T('Features', '功能'),
    security: T('Security', '安全'),
    misc: T('Other', '其他'),
  };
  const groupFor = (key) => {
    if (key.startsWith('fraud') || key === 'risk_scoring' || key === 'payment_hold' || key === 'ip_blocklist' || key === 'message_filter') return 'fraud';
    if (key.startsWith('kyc') || key === 'ip_blocklist') return 'security';
    if (key.startsWith('admin_') || key === 'bulk_blast' || key === 'ai_features' || key === 'user_api' || key === 'sms_scheduling' || key === 'mm_support' || key === 'self_assign' || key === 'multi_currency' || key === 'number_expiry' || key === 'referral') return 'comms';
    return 'misc';
  };
  const groups = [...new Set(toggles.map((t) => groupFor(t.key)))];

  return (
    <div>
      <SectionHeader title={T('Settings', '设置')} subtitle={T('Billing, theme, rates & feature toggles', '计费、主题、费率与功能开关')} />
      <Toast message={toast} color={toastColor} />

      {billing && (
        <Card className="mb-5">
          <h3 className="font-semibold text-slate-900 mb-3">{T('Billing modes', '计费模式')}</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {['prepaid', 'subscription', 'hybrid'].map((mode) => (
              <label key={mode} className="flex items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={!!billing[mode]} onChange={(e) => setBilling({ ...billing, [mode]: e.target.checked })} />
                {mode}
              </label>
            ))}
            <Field label={T('Quota exhausted', '配额用尽时')}>
              <SelectInput value={billing.quotaExhausted} onChange={(e) => setBilling({ ...billing, quotaExhausted: e.target.value })}>
                <option value="block">block</option>
                <option value="charge">charge</option>
              </SelectInput>
            </Field>
            <div className="flex items-end"><Button onClick={saveBilling}>{T('Save', '保存')}</Button></div>
          </div>
        </Card>
      )}

      <Card className="mb-5">
        <h3 className="font-semibold text-slate-900 mb-3">{T('Theme', '主题')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label={T('Primary color', '主色')}><input type="color" value={theme.primaryColor || '#4F46E5'} onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })} className="h-9 w-full rounded-lg border border-slate-200 cursor-pointer" /></Field>
          <Field label={T('Secondary color', '辅色')}><input type="color" value={theme.secondaryColor || '#7C3AED'} onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })} className="h-9 w-full rounded-lg border border-slate-200 cursor-pointer" /></Field>
          <Field label={T('Font', '字体')}>
            <SelectInput value={theme.font || 'Inter'} onChange={(e) => setTheme({ ...theme, font: e.target.value })}>
              {['Inter', 'Roboto', 'Poppins', 'Georgia', 'monospace'].map((f) => <option key={f} value={f}>{f}</option>)}
            </SelectInput>
          </Field>
          <div className="flex items-end"><Button onClick={saveTheme}>{T('Save theme', '保存主题')}</Button></div>
        </div>
      </Card>

      <Card className="mb-5">
        <h3 className="font-semibold text-slate-900 mb-3">{T('Rates', '费率')}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Field label={T('SMS rate ($)', '短信费率(美元)')}><TextInput type="number" step="0.0001" value={smsRate} onChange={(e) => setSmsRate(e.target.value)} /></Field>
          <Field label={T('Pay-per-SMS daily limit', '按条计费每日上限')}><TextInput type="number" value={payPerSmsDaily} onChange={(e) => setPayPerSmsDaily(e.target.value)} /></Field>
          <Field label={T('Burst per second', '每秒爆发限制')}><TextInput type="number" value={burstPerSec} onChange={(e) => setBurstPerSec(e.target.value)} /></Field>
          <div className="flex items-end"><Button onClick={saveRates}>{T('Save', '保存')}</Button></div>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold text-slate-900 mb-3">{T('Feature toggles', '功能开关')}</h3>
        <div className="grid md:grid-cols-3 gap-6">
          {groups.map((grp) => (
            <div key={grp}>
              <h4 className="text-xs uppercase tracking-wide text-slate-400 font-semibold mb-2">{groupLabels[grp] || grp}</h4>
              <div className="space-y-2">
                {toggles.filter((t) => groupFor(t.key) === grp).map((t) => (
                  <label key={t.key} className="flex items-center justify-between gap-2 py-1.5 border-b border-slate-50 last:border-0">
                    <span className="text-sm text-slate-700 font-mono">{t.key}</span>
                    <input type="checkbox" checked={t.enabled} onChange={(e) => toggle(t.key, e.target.checked)} className="w-4 h-4 accent-indigo-600" />
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
