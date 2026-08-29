import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../services/api.js';

const CATEGORIES = ['otp', 'welcome', 'notification', 'reminder', 'payment', 'general'];

const CAT_LABEL = (c, isZh) => ({
  otp: isZh ? '验证码' : 'OTP',
  welcome: isZh ? '欢迎' : 'Welcome',
  notification: isZh ? '通知' : 'Notification',
  reminder: isZh ? '提醒' : 'Reminder',
  payment: isZh ? '支付' : 'Payment',
  general: isZh ? '通用' : 'General',
}[c] || c);

const CAT_EMOJI = {
  otp: 'Key',
  welcome: 'Hi',
  notification: 'Bell',
  reminder: 'Clock',
  payment: 'Card',
  general: 'Text',
};

export default function TemplatesSection() {
  const { theme } = useTheme();
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [form, setForm] = useState({ name: '', category: 'general', body: '' });
  const [editing, setEditing] = useState(null);
  const [toast, setToast] = useState('');
  const [toastColor, setToastColor] = useState('');

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      const { data } = await getTemplates();
      setTemplates(data.templates);
    } catch (e) {
      notify(e.response?.data?.error || 'Failed to load templates', 'red');
    } finally {
      setLoading(false);
    }
  };

  const notify = (msg, color = '') => {
    setToast(msg);
    setToastColor(color);
    setTimeout(() => setToast(''), 3000);
  };

  const startEdit = (tmpl) => {
    setEditing(tmpl.id);
    setForm({ name: tmpl.name, category: tmpl.category, body: tmpl.body });
  };

  const save = async () => {
    if (!form.name.trim() || !form.body.trim()) return notify(T('Name and body required', '需要名称和内容'), 'red');
    try {
      if (editing) {
        await updateTemplate(editing, form);
        notify(T('Template updated', '模板已更新'));
      } else {
        await createTemplate(form);
        notify(T('Template created', '模板已创建'));
      }
      setForm({ name: '', category: 'general', body: '' });
      setEditing(null);
      load();
    } catch (e) {
      notify(e.response?.data?.error || 'Failed', 'red');
    }
  };

  const doDelete = async (id) => {
    if (!confirm(T('Delete this template?', '删除此模板？'))) return;
    try {
      await deleteTemplate(id);
      load();
      notify(T('Template deleted', '模板已删除'));
    } catch (e) {
      notify(e.response?.data?.error || 'Failed', 'red');
    }
  };

  const copyBody = async (t) => {
    try {
      await navigator.clipboard.writeText(t.body);
      notify(T('Copied to clipboard', '已复制到剪贴板'));
    } catch {
      notify(t.body, 'red');
    }
  };

  const counts = CATEGORIES.reduce((a, c) => {
    a[c] = templates.filter((t) => t.category === c).length;
    return a;
  }, {});
  const shown = filter === 'all' ? templates : templates.filter((t) => t.category === filter);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
      <h3 className="font-semibold text-slate-900 dark:text-white mb-1">{T('Template store', '模板商店')}</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
        {T('Reusable messages with variables like {{code}}, {{name}}. System templates are shown with a badge; click to copy.',
           '可复用消息，支持 {{code}}、{{name}} 等变量。系统模板会带有标记，点击即可复制。')}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder={T('Name', '名称')}
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2"
          style={{ '--tw-ring-color': theme.primary }}
        />
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 dark:text-slate-100"
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{CAT_LABEL(c, isZh)}</option>)}
        </select>
        <input
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          placeholder={T('Body (e.g. Hi {{name}}!)', '内容（如 您好 {{name}}！）')}
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 md:col-span-2"
          style={{ '--tw-ring-color': theme.primary }}
        />
        <button onClick={save} className="px-4 py-2 text-sm text-white rounded-lg font-medium hover:opacity-90 transition"
          style={{ background: theme.primary }}>
          {editing ? T('Save changes', '保存修改') : T('Create template', '创建模板')}
        </button>
      </div>
      {editing && (
        <button onClick={() => { setEditing(null); setForm({ name: '', category: 'general', body: '' }); }} className="mt-2 text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
          {T('Cancel editing', '取消编辑')}
        </button>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 text-xs rounded-full font-medium border transition ${
            filter === 'all'
              ? 'text-white border-transparent'
              : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
          }`}
          style={filter === 'all' ? { background: theme.primary } : {}}
        >
          {T('All', '全部')} <span className="opacity-70">({templates.length})</span>
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3 py-1.5 text-xs rounded-full font-medium border transition ${
              filter === c
                ? 'text-white border-transparent'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300'
            }`}
            style={filter === c ? { background: theme.primary } : {}}
          >
            {CAT_EMOJI[c]} {CAT_LABEL(c, isZh)} <span className="opacity-70">({counts[c] || 0})</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="mt-4 text-sm text-slate-500 dark:text-slate-400">{T('Loading…', '加载中…')}</div>
      ) : shown.length === 0 ? (
        <div className="mt-4 text-sm text-slate-400 dark:text-slate-500">{T('No templates in this category.', '此分类暂无模板。')}</div>
      ) : (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {shown.map((t) => (
            <div
              key={t.id}
              className="border border-slate-200 dark:border-slate-800 rounded-lg p-3 cursor-pointer transition hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm"
              onClick={() => copyBody(t)}
              title={T('Click to copy', '点击复制')}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {t.name}
                  {t.user_id === null && (
                    <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-semibold align-middle">
                      {T('System', '系统')}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                    {CAT_LABEL(t.category, isZh)}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{T('Copy', '复制')}</span>
                  {t.user_id !== null && (
                    <>
                      <button onClick={(e) => { e.stopPropagation(); startEdit(t); }} className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">{T('Edit', '编辑')}</button>
                      <button onClick={(e) => { e.stopPropagation(); doDelete(t.id); }} className="text-xs text-red-500 hover:text-red-700">{T('Delete', '删除')}</button>
                    </>
                  )}
                </div>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-300 break-words">{t.body}</div>
            </div>
          ))}
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 text-sm text-white px-4 py-2 rounded-lg shadow-lg" style={{ background: toastColor || theme.primary }}>
          {toast}
        </div>
      )}
    </div>
  );
}
