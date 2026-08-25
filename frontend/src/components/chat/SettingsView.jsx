import { useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';

function Toggle({ on, onChange, disabled }) {
  return (
    <button
      onClick={() => !disabled && onChange(!on)}
      className={`relative w-9 h-5 rounded-full transition shrink-0 ${on ? 'bg-blue-600' : 'bg-slate-300'} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <span
        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${on ? 'left-[18px]' : 'left-0.5'}`}
      />
    </button>
  );
}

const SECTIONS = [
  { key: 'account', label: 'Account', zh: '账户' },
  { key: 'calls', label: 'Calls', zh: '通话' },
  { key: 'voicemail', label: 'Voicemail', zh: '语音信箱' },
  { key: 'payments', label: 'Payments', zh: '付款' },
  { key: 'security', label: 'Security', zh: '安全' },
  { key: 'privacy', label: 'Privacy & Terms', zh: '隐私与条款' },
];

export default function SettingsView({ fromNumber, balance, onClose }) {
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);
  const [tab, setTab] = useState('account');
  const [opts, setOpts] = useState({
    forwardEmail: true,
    callForwarding: true,
    missedAlerts: false,
    voicemailEmail: true,
    twoStep: false,
    promo: false,
  });
  const setOpt = (key) => setOpts((o) => ({ ...o, [key]: !o[key] }));

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-200 bg-white">
        <button onClick={onClose} className="text-sm text-blue-600 hover:bg-blue-50 rounded-full px-3 py-1 transition">
          ← {T('Back to Voice', '返回 Voice')}
        </button>
        <span className="text-lg font-semibold text-slate-900">Voice Settings</span>
      </div>
      <div className="flex flex-col md:flex-row flex-1 min-h-0">
        <aside className="w-full md:w-60 shrink-0 md:border-r border-b md:border-b-0 border-slate-200 bg-white py-3 flex md:flex-col overflow-x-auto">
          {SECTIONS.map((s) => (
            <button
              key={s.key}
              onClick={() => setTab(s.key)}
              className={`whitespace-nowrap shrink-0 w-full text-left px-5 py-2.5 text-sm transition md:border-l-[3px] border-b-2 md:border-b-0 ${
                tab === s.key
                  ? 'border-blue-600 text-blue-600 bg-blue-50/60 font-medium'
                  : 'border-transparent text-slate-600 hover:bg-slate-50'
              }`}
            >
              {T(s.label, s.zh)}
            </button>
          ))}
        </aside>

        <div className="flex-1 overflow-y-auto bg-[#f8f9fa] p-4 md:p-6">
          {tab === 'account' && (
            <div className="max-w-2xl space-y-4">
              <h3 className="text-base font-semibold text-slate-900">{T('Account Info', '账户信息')}</h3>
              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-slate-600">{T('Google Voice Number', 'Google Voice 号码')}</span>
                  <span className="font-medium text-slate-900">{fromNumber || T('Not assigned', '未分配')}</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-slate-600">{T('Devices', '设备')}</span>
                  <span className="font-medium text-slate-900">1 device (Web)</span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-slate-600">{T('Linked numbers', '关联号码')}</span>
                  <span className="font-medium text-slate-900">+1 (929) 917-4865</span>
                </div>
              </div>

              <h3 className="text-base font-semibold text-slate-900">{T('Messages Options', '消息选项')}</h3>
              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm text-slate-800">{T('Forward messages to email', '将消息转发到邮箱')}</div>
                    <div className="text-xs text-slate-400">{T('Receive copies of your text messages', '接收短信副本')}</div>
                  </div>
                  <Toggle on={opts.forwardEmail} onChange={() => setOpt('forwardEmail')} />
                </div>
              </div>
            </div>
          )}

          {tab === 'calls' && (
            <div className="max-w-2xl space-y-4">
              <h3 className="text-base font-semibold text-slate-900">{T('Calls Options', '通话选项')}</h3>
              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm text-slate-800">{T('Call forwarding', '呼叫转移')}</div>
                    <div className="text-xs text-slate-400">{T('Forward calls to your linked number', '将通话转接到关联号码')}</div>
                  </div>
                  <Toggle on={opts.callForwarding} onChange={() => setOpt('callForwarding')} />
                </div>
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm text-slate-800">{T('Get alerts for missed calls', '未接来电提醒')}</div>
                    <div className="text-xs text-slate-400">{T('Email me when I miss a call', '未接来电时发送邮件')}</div>
                  </div>
                  <Toggle on={opts.missedAlerts} onChange={() => setOpt('missedAlerts')} />
                </div>
              </div>
            </div>
          )}

          {tab === 'voicemail' && (
            <div className="max-w-2xl space-y-4">
              <h3 className="text-base font-semibold text-slate-900">{T('Voicemail Options', '语音信箱选项')}</h3>
              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm text-slate-800">{T('Forward voicemail to email', '将语音信箱转发到邮箱')}</div>
                    <div className="text-xs text-slate-400">{T('Receive transcriptions by email', '通过邮件接收转录')}</div>
                  </div>
                  <Toggle on={opts.voicemailEmail} onChange={() => setOpt('voicemailEmail')} />
                </div>
                <div className="px-4 py-3">
                  <div className="text-sm text-slate-800">{T('Voicemail greeting', '语音信箱问候语')}</div>
                  <textarea
                    defaultValue="Hi, you have reached my Google Voice number. Please leave a message."
                    rows={3}
                    className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none transition"
                  />
                </div>
              </div>
            </div>
          )}

          {tab === 'payments' && (
            <div className="max-w-2xl space-y-4">
              <h3 className="text-base font-semibold text-slate-900">{T('Payments', '付款')}</h3>
              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-slate-600">{T('Credit balance', '账户余额')}</span>
                  <span className="font-semibold text-slate-900">${Number(balance || 0).toFixed(2)}</span>
                </div>
                <div className="px-4 py-4">
                  <button className="px-5 py-2 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition">
                    {T('Upgrade', '升级')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab === 'security' && (
            <div className="max-w-2xl space-y-4">
              <h3 className="text-base font-semibold text-slate-900">{T('Security', '安全')}</h3>
              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                <div className="flex items-center justify-between px-4 py-3">
                  <div>
                    <div className="text-sm text-slate-800">{T('2-Step verification', '两步验证')}</div>
                    <div className="text-xs text-slate-400">{T('Extra security for your account', '为账户提供额外保护')}</div>
                  </div>
                  <Toggle on={opts.twoStep} onChange={() => setOpt('twoStep')} />
                </div>
              </div>
            </div>
          )}

          {tab === 'privacy' && (
            <div className="max-w-2xl space-y-4">
              <h3 className="text-base font-semibold text-slate-900">{T('Privacy & Terms', '隐私与条款')}</h3>
              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100">
                <button className="w-full text-left px-4 py-3 text-sm text-slate-800 hover:bg-slate-50 transition">
                  {T('Google Privacy Policy', 'Google 隐私政策')}
                </button>
                <button className="w-full text-left px-4 py-3 text-sm text-slate-800 hover:bg-slate-50 transition">
                  {T('Terms of Service', '服务条款')}
                </button>
                <button className="w-full text-left px-4 py-3 text-sm text-slate-800 hover:bg-slate-50 transition">
                  {T('Messaging rates & policies', '短信费率与政策')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
