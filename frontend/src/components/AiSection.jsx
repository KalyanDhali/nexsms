import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getAiRules, createAiRule, updateAiRule, deleteAiRule, getAiSuggestions } from '../services/api.js';

export default function AiSection() {
  const { theme } = useTheme();
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);

  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ trigger_keyword: '', reply: '' });
  const [suggestText, setSuggestText] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [toast, setToast] = useState('');
  const [toastColor, setToastColor] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const { data } = await getAiRules();
      setRules(data.rules);
    } catch (e) {
      notify(e.response?.data?.error || 'Failed to load rules', 'red');
    } finally {
      setLoading(false);
    }
  };

  const notify = (msg, color = '') => {
    setToast(msg);
    setToastColor(color);
    setTimeout(() => setToast(''), 3000);
  };

  const add = async () => {
    if (!form.trigger_keyword.trim() || !form.reply.trim()) return notify(T('Keyword and reply required', '需要关键词和回复'), 'red');
    try {
      await createAiRule(form);
      setForm({ trigger_keyword: '', reply: '' });
      load();
      notify(T('Auto-reply rule created', '自动回复规则已创建'));
    } catch (e) {
      notify(e.response?.data?.error || 'Failed', 'red');
    }
  };

  const toggle = async (rule) => {
    try {
      await updateAiRule(rule.id, { enabled: !rule.enabled });
      setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, enabled: !rule.enabled } : r)));
    } catch (e) {
      notify(e.response?.data?.error || 'Failed', 'red');
    }
  };

  const remove = async (id) => {
    if (!confirm(T('Delete this rule?', '删除此规则？'))) return;
    try {
      await deleteAiRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (e) {
      notify(e.response?.data?.error || 'Failed', 'red');
    }
  };

  const suggest = async () => {
    if (!suggestText.trim()) return;
    try {
      const { data } = await getAiSuggestions(suggestText.trim());
      setSuggestions(data.suggestions || []);
    } catch (e) {
      notify(e.response?.data?.error || 'Failed', 'red');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="font-semibold text-slate-900 mb-1">{T('AI auto-reply', 'AI 自动回复')}</h3>
        <p className="text-sm text-slate-500 mb-3">
          {T('When an inbound SMS matches a keyword, NexSMS replies automatically. Config-driven, no external AI needed.',
             '当收到的短信命中关键词时，NexSMS 会自动回复。配置驱动，无需外部 AI。')}
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            value={form.trigger_keyword}
            onChange={(e) => setForm({ ...form, trigger_keyword: e.target.value })}
            placeholder={T('Trigger keyword (e.g. price)', '触发关键词（如 price）')}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': theme.primary }}
          />
          <input
            value={form.reply}
            onChange={(e) => setForm({ ...form, reply: e.target.value })}
            placeholder={T('Auto reply message', '自动回复内容')}
            className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 md:col-span-1"
            style={{ '--tw-ring-color': theme.primary }}
          />
          <button onClick={add} className="px-4 py-2 text-sm text-white rounded-lg font-medium hover:opacity-90 transition"
            style={{ background: theme.primary }}>
            {T('Add rule', '添加规则')}
          </button>
        </div>

        {loading ? (
          <div className="mt-4 text-sm text-slate-500">{T('Loading…', '加载中…')}</div>
        ) : rules.length === 0 ? (
          <div className="mt-4 text-sm text-slate-400">{T('No auto-reply rules yet.', '暂无自动回复规则。')}</div>
        ) : (
          <div className="mt-4 space-y-2">
            {rules.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 border border-slate-200 rounded-lg px-3 py-2">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="px-2 py-0.5 text-xs rounded-lg bg-indigo-50 text-indigo-600 font-mono shrink-0">{r.trigger_keyword}</span>
                  <span className="text-sm text-slate-600 truncate">{r.reply}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <label className="flex items-center gap-1.5 text-xs text-slate-500">
                    <input type="checkbox" checked={!!r.enabled} onChange={() => toggle(r)} className="w-3.5 h-3.5 accent-indigo-600" />
                    {T('Active', '启用')}
                  </label>
                  <button onClick={() => remove(r.id)} className="text-xs text-red-500 hover:text-red-700">{T('Delete', '删除')}</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h3 className="font-semibold text-slate-900 mb-1">{T('Reply suggestions', '回复建议')}</h3>
        <p className="text-sm text-slate-500 mb-3">
          {T('Paste an inbound message to get suggested replies from your templates and rules.',
             '粘贴收到的消息，获取基于您的模板和规则的回复建议。')}
        </p>
        <div className="flex gap-2">
          <input
            value={suggestText}
            onChange={(e) => setSuggestText(e.target.value)}
            placeholder={T('Inbound message text…', '收到的消息内容…')}
            className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2"
            style={{ '--tw-ring-color': theme.primary }}
          />
          <button onClick={suggest} className="px-4 py-2 text-sm text-white rounded-lg font-medium hover:opacity-90 transition"
            style={{ background: theme.primary }}>
            {T('Suggest', '建议')}
          </button>
        </div>
        {suggestions.length > 0 && (
          <div className="mt-3 space-y-2">
            {suggestions.map((s, i) => (
              <div key={i} className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm text-slate-700">{s}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
