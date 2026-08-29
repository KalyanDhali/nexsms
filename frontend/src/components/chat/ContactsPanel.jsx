import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { useTheme } from '../../context/ThemeContext.jsx';
import Avatar from './Avatar.jsx';
import { IconSearch, IconDownload } from '../icons.jsx';
import {
  getContacts,
  createContact,
  updateContact,
  deleteContact,
  importContacts,
  getContactGroups,
  createContactGroup,
  deleteContactGroup,
  blastContactGroup,
} from '../../services/api.js';

const AVATAR_COLORS = ['bg-indigo-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-sky-500', 'bg-violet-500'];

export default function ContactsPanel({ threads, onSelect, onStartNew, hidden }) {
  const { lang } = useLanguage();
  const { theme } = useTheme();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);

  const [contacts, setContacts] = useState([]);
  const [groups, setGroups] = useState([]);
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [editing, setEditing] = useState(null);
  const [groupModal, setGroupModal] = useState(false);
  const [blastFor, setBlastFor] = useState(null);
  const [newGroupName, setNewGroupName] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', email: '', company: '', notes: '', groups: [] });
  const fileRef = useRef(null);

  const loadAll = async () => {
    try {
      const [c, g] = await Promise.all([getContacts(query), getContactGroups()]);
      setContacts(c.data.contacts);
      setGroups(g.data.groups);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const notify = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const threadByPhone = (phone) =>
    threads.find((t) => (t.contactNumber || '').replace(/\D/g, '') === String(phone).replace(/\D/g, ''));

  const openContact = (c) => {
    const existing = threadByPhone(c.phone);
    if (existing) onSelect(existing.id);
    else if (onStartNew) onStartNew(c.phone);
  };

  const saveContact = async () => {
    if (!form.phone.trim()) return notify(T('Phone number is required', '电话号码是必填项'));
    try {
      if (editing?.id) await updateContact(editing.id, { ...form, groups: form.groups.map(String) });
      else await createContact({ ...form, groups: form.groups.map(String) });
      setEditing(null);
      setForm({ name: '', phone: '', email: '', company: '', notes: '', groups: [] });
      loadAll();
      notify(editing?.id ? T('Contact updated', '联系人已更新') : T('Contact added', '联系人已添加'));
    } catch (e) {
      notify(e.response?.data?.error || T('Failed to save', '保存失败'));
    }
  };

  const removeContact = async (c) => {
    if (!confirm(T('Delete this contact?', '删除此联系人？'))) return;
    try {
      await deleteContact(c.id);
      setContacts((prev) => prev.filter((x) => x.id !== c.id));
      notify(T('Contact deleted', '联系人已删除'));
    } catch {
      notify(T('Delete failed', '删除失败'));
    }
  };

  const addGroup = async () => {
    if (!newGroupName.trim()) return;
    try {
      await createContactGroup(newGroupName.trim());
      setNewGroupName('');
      const { data } = await getContactGroups();
      setGroups(data.groups);
      notify(T('Group created', '分组已创建'));
    } catch (e) {
      notify(e.response?.data?.error || T('Failed', '失败'));
    }
  };

  const removeGroup = async (g) => {
    if (!confirm(T(`Delete group "${g.name}"? Contacts are kept.`, `删除分组 "${g.name}"？联系人会保留。`))) return;
    try {
      await deleteContactGroup(g.id);
      setGroups((prev) => prev.filter((x) => x.id !== g.id));
      if (filter === g.id) setFilter('all');
      notify(T('Group deleted', '分组已删除'));
    } catch {
      notify(T('Delete failed', '删除失败'));
    }
  };

  const onImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    const header = lines[0].toLowerCase();
    const hasHeader = /name|phone|number|email/.test(header) && !/^[0-9+]/.test(lines[0].trim());
    const rows = (hasHeader ? lines.slice(1) : lines).map((l) => {
      const [name = '', phone = '', email = '', company = ''] = l.split(',').map((s) => s.trim());
      return { name, phone, email, company };
    });
    if (!rows.length) return notify(T('No rows found in file', '文件中没有数据'));
    try {
      const { data } = await importContacts(rows);
      notify(T(`Imported ${data.added}, skipped ${data.skipped}`, `导入 ${data.added} 个，跳过 ${data.skipped} 个`));
      loadAll();
    } catch (err) {
      notify(err.response?.data?.error || T('Import failed', '导入失败'));
    }
    e.target.value = '';
  };

  const doBlast = async () => {
    if (!blastFor) return;
    try {
      const body = document.getElementById('blast-body')?.value || '';
      const fromNumberId = document.getElementById('blast-from')?.value;
      if (!body.trim() || !fromNumberId) return notify(T('Body and sender required', '需要填写内容并选择发送号码'));
      const { data } = await blastContactGroup(blastFor.id, { body, fromNumberId });
      notify(T(`Sent to ${data.sent}/${data.total}, failed ${data.failed}`, `已发送 ${data.sent}/${data.total}，失败 ${data.failed}`));
      setBlastFor(null);
    } catch (err) {
      notify(err.response?.data?.error || T('Blast failed', '发送失败'));
    }
  };

  const filtered = contacts.filter((c) => {
    if (filter === 'all') return true;
    return (c.group_ids || []).includes(filter);
  }).filter((c) =>
    (c.name || '').toLowerCase().includes(query.trim().toLowerCase()) ||
    (c.phone || '').toLowerCase().includes(query.trim().toLowerCase())
  );

  const colorOf = (id) => AVATAR_COLORS[([...id].reduce((a, ch) => a + ch.charCodeAt(0), 0)) % AVATAR_COLORS.length];

  return (
    <aside
      className="list-column w-full shrink-0 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-white dark:bg-slate-900"
      style={hidden ? { display: 'none' } : undefined}
    >
      {toast && (
        <div className="fixed top-16 right-4 left-4 sm:left-auto z-[80] px-4 py-2 rounded-lg text-white text-sm shadow-lg text-center"
          style={{ background: theme.primary }}>
          {toast}
        </div>
      )}

      <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-slate-900 dark:text-white">
            {T('Contacts', '联系人')} <span className="text-slate-400">({contacts.length})</span>
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => fileRef.current?.click()}
              className="w-8 h-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center transition"
              title={T('Import CSV', '导入 CSV')}
              aria-label={T('Import CSV', '导入 CSV')}
            >
              <IconDownload className="w-[18px] h-[18px]" strokeWidth={2} />
            </button>
            <button
              onClick={() => { setEditing({}); setForm({ name: '', phone: '', email: '', company: '', notes: '', groups: [] }); }}
              className="w-8 h-8 rounded-full text-white flex items-center justify-center transition hover:opacity-90"
              style={{ background: theme.primary }}
              title={T('Add contact', '添加联系人')}
              aria-label={T('Add contact', '添加联系人')}
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
            </button>
          </div>
        </div>
        <input type="file" accept=".csv,.txt" ref={fileRef} className="hidden" onChange={onImportFile} />
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 focus-within:ring-2 focus-within:ring-primary/30 transition">
          <IconSearch className="w-4 h-4 shrink-0" strokeWidth={2} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={T('Search contacts', '搜索联系人')}
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-slate-100"
          />
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 -mx-1 px-1">
          <button
            onClick={() => setFilter('all')}
            className={`shrink-0 px-2.5 py-1 text-xs rounded-full transition ${
              filter === 'all' ? 'text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
            style={filter === 'all' ? { background: theme.primary } : {}}
          >
            {T('All', '全部')}
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setFilter(filter === g.id ? 'all' : g.id)}
              className={`shrink-0 px-2.5 py-1 text-xs rounded-full transition flex items-center gap-1 ${
                filter === g.id ? 'text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
              style={filter === g.id ? { background: theme.primary } : {}}
            >
              {g.name} <span className="opacity-70">({g.member_count})</span>
            </button>
          ))}
          <button
            onClick={() => setGroupModal(true)}
            className="shrink-0 px-2.5 py-1 text-xs rounded-full border border-dashed border-slate-300 dark:border-slate-600 text-slate-500 dark:text-slate-400 transition"
            title={T('Manage groups', '管理分组')}
          >
            + {T('Groups', '分组')}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="text-center text-sm text-slate-400 py-10">{T('Loading…', '加载中…')}</div>
        ) : filtered.length === 0 ? (
          <div className="text-center text-sm text-slate-400 dark:text-slate-500 py-10">
            {contacts.length === 0 ? T('No contacts yet. Use + to add.', '暂无联系人，点 + 添加。') : T('No matches', '没有匹配项')}
          </div>
        ) : (
          filtered.map((c) => (
            <div key={c.id} className="border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition min-h-[64px]">
              <button
                onClick={() => openContact(c)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left"
              >
                <span className={`w-10 h-10 shrink-0 rounded-full ${colorOf(c.id)} flex items-center justify-center text-white font-semibold text-sm`}>
                  {(c.name || c.phone).slice(0, 1).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-sm text-slate-900 dark:text-white truncate">{c.name || c.phone}</span>
                  <span className="block text-xs text-slate-400 dark:text-slate-500 truncate">{c.phone}{c.email ? ` · ${c.email}` : ''}</span>
                  {(c.group_names || []).length > 0 && (
                    <span className="mt-0.5 flex gap-1 overflow-hidden">
                      {c.group_names.slice(0, 3).map((g) => (
                        <span key={g} className="shrink-0 px-1.5 py-0.5 text-[10px] rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">{g}</span>
                      ))}
                    </span>
                  )}
                </span>
                <span className="shrink-0 text-[10px] text-slate-400">{c.msg_count ? `${c.msg_count} msgs` : ''}</span>
              </button>
              <div className="flex items-center gap-1 px-14 pb-2">
                <button
                  onClick={() => openContact(c)}
                  className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary dark:text-indigo-300 font-medium hover:bg-primary/20 transition"
                >
                  {T('Message', '发消息')}
                </button>
                <button
                  onClick={() => { setEditing(c); setForm({ name: c.name || '', phone: c.phone, email: c.email || '', company: c.company || '', notes: c.notes || '', groups: c.group_ids || [] }); }}
                  className="text-[11px] px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  {T('Edit', '编辑')}
                </button>
                <button
                  onClick={() => removeContact(c)}
                  className="text-[11px] px-2 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/70 transition"
                >
                  {T('Delete', '删除')}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add/Edit contact modal */}
      {editing !== null && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/50" onClick={() => setEditing(null)}>
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-t-2xl md:rounded-2xl p-5 max-h-[88dvh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">
                {editing?.id ? T('Edit contact', '编辑联系人') : T('New contact', '新建联系人')}
              </h3>
              <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl leading-none">×</button>
            </div>
            <div className="space-y-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={T('Name', '姓名')}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={T('Phone number *', '电话号码 *')}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder={T('Email', '邮箱')} type="email"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder={T('Company', '公司')}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <div>
                <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{T('Groups', '分组')}</label>
                <div className="flex flex-wrap gap-1.5">
                  {groups.map((g) => (
                    <button key={g.id} type="button"
                      onClick={() => setForm((f) => ({ ...f, groups: f.groups.includes(g.id) ? f.groups.filter((x) => x !== g.id) : [...f.groups, g.id] }))}
                      className={`px-2.5 py-1 text-xs rounded-full transition ${form.groups.includes(g.id) ? 'text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'}`}
                      style={form.groups.includes(g.id) ? { background: theme.primary } : {}}>
                      {g.name}
                    </button>
                  ))}
                  {groups.length === 0 && <span className="text-xs text-slate-400">{T('No groups yet', '暂无分组')}</span>}
                </div>
              </div>
              <button onClick={saveContact}
                className="w-full py-2.5 rounded-lg text-white text-sm font-medium hover:opacity-90 transition"
                style={{ background: theme.primary }}>
                {editing?.id ? T('Save changes', '保存修改') : T('Add contact', '添加联系人')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Group manager */}
      {groupModal && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/50" onClick={() => setGroupModal(false)}>
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-t-2xl md:rounded-2xl p-5 max-h-[88dvh] overflow-y-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-slate-900 dark:text-white">{T('Manage groups', '管理分组')}</h3>
              <button onClick={() => setGroupModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl leading-none">×</button>
            </div>
            <div className="flex gap-2 mb-3">
              <input value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addGroup(); }}
                placeholder={T('New group name', '新分组名称')}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/30" />
              <button onClick={addGroup} className="px-3 py-2 rounded-lg text-white text-sm font-medium" style={{ background: theme.primary }}>{T('Add', '添加')}</button>
            </div>
            <div className="space-y-2">
              {groups.map((g) => (
                <div key={g.id} className="flex items-center justify-between px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-800">
                  <span className="text-sm text-slate-800 dark:text-slate-200">
                    {g.name} <span className="text-xs text-slate-400">({g.member_count})</span>
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setBlastFor(g)}
                      className="text-[11px] px-2 py-1 rounded-full bg-primary/10 text-primary dark:text-indigo-300 font-medium hover:bg-primary/20 transition"
                    >
                      {T('Send SMS', '群发')}
                    </button>
                    <button onClick={() => removeGroup(g)} className="text-[11px] px-2 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-500 hover:bg-rose-100 transition">
                      {T('Delete', '删除')}
                    </button>
                  </div>
                </div>
              ))}
              {groups.length === 0 && <p className="text-sm text-slate-400 text-center py-4">{T('No groups yet', '暂无分组')}</p>}
            </div>
          </div>
        </div>
      )}

      {/* Blast to group */}
      {blastFor && (
        <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center bg-black/50" onClick={() => setBlastFor(null)}>
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-t-2xl md:rounded-2xl p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h3 className="font-semibold text-slate-900 dark:text-white">{T('Send to group', '发送到分组')}: {blastFor.name}</h3>
              <button onClick={() => setBlastFor(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xl leading-none">×</button>
            </div>
            <p className="text-xs text-slate-400 mb-3">{T(`${blastFor.member_count} contacts`, `${blastFor.member_count} 个联系人`)}</p>
            <BlastSender onSend={doBlast} />
          </div>
        </div>
      )}
    </aside>
  );
}

function BlastSender({ onSend }) {
  const { lang } = useLanguage();
  const { theme } = useTheme();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);
  const [fromOptions, setFromOptions] = useState([]);

  useEffect(() => {
    import('../../services/api.js').then(({ getMyNumbers }) =>
      getMyNumbers().then(({ data }) => setFromOptions(data.numbers || []))
    ).catch(() => {});
  }, []);

  return (
    <div className="space-y-3">
      <textarea id="blast-body" rows={3}
        placeholder={T('Message to all contacts in this group…', '发送给该分组所有联系人的内容…')}
        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none" />
      <select id="blast-from"
        className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none">
        <option value="">{T('From number…', '选择发送号码…')}</option>
        {fromOptions.map((n) => <option key={n.id} value={n.id}>{n.number}{n.primary_number ? ` (${T('primary', '主号')})` : ''}</option>)}
      </select>
      <button onClick={onSend} className="w-full py-2.5 rounded-lg text-white text-sm font-medium hover:opacity-90 transition" style={{ background: theme.primary }}>
        {T('Send to group', '发送到分组')}
      </button>
    </div>
  );
}
