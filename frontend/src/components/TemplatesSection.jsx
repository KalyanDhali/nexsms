import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getTemplates, createTemplate, updateTemplate, deleteTemplate } from '../services/api.js';

const CATEGORIES = ['otp', 'welcome', 'notification', 'reminder', 'payment', 'general'];

export default function TemplatesSection() {
  const { theme } = useTheme();
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
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

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h3 className="font-semibold text-slate-900 mb-1">{T('Message templates', '消息模板')}</h3>
      <p className="text-sm text-slate-500 mb-3">
        {T('Reusable messages with variables like {{code}}, {{name}}. System templates are shown with a badge.',
           '可复用消息，支持 {{code}}、{{name}} 等变量。系统模板会带有标记。')}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder={T('Name', '名称')}
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2"
          style={{ '--tw-ring-color': theme.primary }}
        />
        <select
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white"
        >
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          value={form.body}
          onChange={(e) => setForm({ ...form, body: e.target.value })}
          placeholder={T('Body (e.g. Hi {{name}}!)', '内容（如 您好 {{name}}！）')}
          className="px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 md:col-span-2"
          style={{ '--tw-ring-color': theme.primary }}
        />
        <button onClick={save} className="px-4 py-2 text-sm text-white rounded-lg font-medium hover:opacity-90 transition"
          style={{ background: theme.primary }}>
          {editing ? T('Save changes', '保存修改') : T('Create template', '创建模板')}
        </button>
      </div>
      {editing && (
        <button onClick={() => { setEditing(null); setForm({ name: '', category: 'general', body: '' }); }} className="mt-2 text-xs text-slate-500 hover:text-slate-700">
          {T('Cancel editing', '取消编辑')}
        </button>
      )}

      {loading ? (
        <div className="mt-4 text-sm text-slate-500">{T('Loading…', '加载中…')}</div>
      ) : templates.length === 0 ? (
        <div className="mt-4 text-sm text-slate-400">{T('No templates yet.', '暂无模板。')}</div>
      ) : (
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map((t) => (
            <div key={t.id} className="border border-slate-200 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-semibold text-slate-800">
                  {t.name}
                  {t.user_id === null && (
                    <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-600 font-semibold align-middle">
                      {T('System', '系统')}
                    </span>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  {t.user_id !== null && (
                    <>
                      <button onClick={() => startEdit(t)} className="text-xs text-slate-500 hover:text-slate-700">{T('Edit', '编辑')}</button>
                      <button onClick={() => doDelete(t.id)} className="text-xs text-red-500 hover:text-red-700">{T('Delete', '删除')}</button>
                    </>
                  )}
                </div>
              </div>
              <div className="text-xs text-slate-400 mb-1">{t.category}</div>
              <div className="text-sm text-slate-600 break-words">{t.body}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
