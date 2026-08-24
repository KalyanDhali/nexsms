import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { getTemplates, uploadSmsImage, getMyNumbers } from '../../services/api.js';

const MAX_RECIPIENTS = 5;

export default function ConversationView({
  thread,
  onSend,
  onComposeSend,
  contacts,
  dialInput,
  onDialChange,
  fromNumber,
  composing,
  onCloseComposer,
}) {
  const { t, lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);
  const [draft, setDraft] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [attachMenu, setAttachMenu] = useState('closed');
  const [templates, setTemplates] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [numbers, setNumbers] = useState([]);
  const [recipients, setRecipients] = useState([]);
  const [toFocused, setToFocused] = useState(false);
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);
  const composerRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages?.length]);

  useEffect(() => {
    if (!composing) setRecipients([]);
  }, [composing]);

  useEffect(() => {
    if (!composing) return;
    const handler = (e) => {
      if (composerRef.current && !composerRef.current.contains(e.target)) {
        onCloseComposer();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [composing, onCloseComposer]);

  const digits = (s) => (s || '').replace(/[^0-9]/g, '');
  const fullNumber =
    recipients.length < MAX_RECIPIENTS &&
    /^[0-9+()\s-]{7,}$/.test(dialInput.trim()) &&
    !recipients.some((r) => digits(r) === digits(dialInput)) &&
    !contacts.some((th) => digits(th.name) === digits(dialInput));

  useEffect(() => {
    getTemplates().then(({ data }) => setTemplates(data.templates)).catch(() => {});
    getMyNumbers()
      .then(({ data }) => {
        setNumbers(data.numbers);
      })
      .catch(() => {});
  }, []);

  const pickFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setUploadError(t('chat.imageTooLarge'));
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      setUploading(true);
      setUploadError('');
      try {
        const { data } = await uploadSmsImage({ filename: file.name, data: reader.result });
        setMediaUrl(data.url);
      } catch (err) {
        setUploadError(err.response?.data?.error || 'Upload failed');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const submitDraft = (e) => {
    e.preventDefault();
    if (draft.trim()) {
      onSend(draft, mediaUrl.trim() || null);
      setDraft('');
      setMediaUrl('');
    }
  };

  const submitCompose = (e) => {
    e.preventDefault();
    if (recipients.length && draft.trim()) {
      onComposeSend({ recipients, body: draft.trim(), mediaUrl: mediaUrl.trim() || null });
      setDraft('');
      setMediaUrl('');
    }
  };

  const addRecipient = (num) => {
    if (!num || recipients.length >= MAX_RECIPIENTS) return;
    setRecipients((r) => (r.includes(num) ? r : [...r, num]));
    onDialChange('');
  };

  const removeRecipient = (num) => setRecipients((r) => r.filter((x) => x !== num));

  const composerBar = (onSubmit, canSend) => (
    <form onSubmit={onSubmit} className="border-t border-gray-200 p-3 bg-white">
      {mediaUrl && (
        <div className="mb-2 flex items-center gap-2">
          <div className="relative shrink-0">
            <img src={mediaUrl} alt="" className="w-14 h-14 rounded-lg object-cover border border-slate-200" />
            <button
              type="button"
              onClick={() => setMediaUrl('')}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center leading-none"
            >
              ×
            </button>
          </div>
          <input
            value={mediaUrl}
            onChange={(e) => setMediaUrl(e.target.value)}
            placeholder={t('chat.mediaUrl')}
            className="flex-1 px-4 py-2 rounded-xl bg-slate-100 focus:bg-white border border-transparent focus:border-primary text-sm outline-none transition"
          />
        </div>
      )}
      {uploadError && <div className="mb-2 text-xs text-red-500">{uploadError}</div>}
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => setAttachMenu((v) => (v === 'closed' ? 'main' : 'closed'))}
            className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition"
            title={T('Attach', '添加附件')}
          >
            {uploading ? <span className="text-sm">…</span> : <span className="text-2xl leading-none text-gray-400">+</span>}
          </button>
          {attachMenu !== 'closed' && (
            <div className="absolute bottom-12 left-0 w-52 bg-white rounded-lg shadow-md border border-gray-100 py-1 z-20">
              {attachMenu === 'main' ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      fileInputRef.current?.click();
                      setAttachMenu('closed');
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-gray-50 transition"
                  >
                    {T('Photos', '照片')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttachMenu('templates')}
                    className="w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-gray-50 transition"
                  >
                    {T('Templates', '模板')}
                  </button>
                </>
              ) : (
                <>
                  <div className="px-4 py-1.5 text-[11px] text-gray-400 uppercase tracking-wide">{T('Templates', '模板')}</div>
                  {templates.length === 0 && <div className="px-4 py-2 text-sm text-gray-400">{T('No templates', '暂无模板')}</div>}
                  {templates.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => {
                        setDraft(tmpl.body);
                        setAttachMenu('closed');
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-50 text-sm"
                    >
                      <span className="font-medium text-gray-800 block">{tmpl.name}</span>
                      <span className="text-xs text-gray-400 truncate block">{tmpl.body}</span>
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAttachMenu('main')}
                    className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-gray-50 transition"
                  >
                    ← {T('Back', '返回')}
                  </button>
                </>
              )}
            </div>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />

        <div className="flex-1 flex items-center bg-[#f1f3f4] rounded-full px-5 py-2 border border-transparent focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500 transition">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t('chat.typeMessage')}
            className="flex-1 bg-transparent outline-none text-sm text-gray-800 placeholder-gray-500"
          />
        </div>

        <button
          type="submit"
          disabled={!canSend || !draft.trim()}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
            canSend && draft.trim() ? 'bg-[#1a73e8] text-white hover:bg-[#1765cc]' : 'bg-gray-100 text-gray-400'
          }`}
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </form>
  );

  return (
    <div className="flex-1 flex flex-col bg-white min-w-0">
      {!thread && composing ? (
        <div ref={composerRef} className="flex-1 flex flex-col min-h-0 bg-white">
          <div className="relative border-t border-b border-gray-200 px-4 py-3 flex items-center flex-wrap">
            <span className="text-gray-700 font-medium mr-2 shrink-0">{t('chat.to')}:</span>
            {recipients.map((r) => (
              <span
                key={r}
                className="flex items-center gap-1.5 bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] rounded-full px-3 py-1 text-sm mr-1.5"
              >
                {r}
                <button
                  type="button"
                  onClick={() => removeRecipient(r)}
                  className="w-4 h-4 rounded-full hover:bg-blue-100 text-[#1a73e8] opacity-70 hover:opacity-100 flex items-center justify-center leading-none"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              autoFocus
              value={dialInput}
              onChange={(e) => onDialChange(e.target.value)}
              onFocus={() => setToFocused(true)}
              onBlur={() => setTimeout(() => setToFocused(false), 120)}
              placeholder={T('Type a name or phone number', '输入姓名或电话号码')}
              className="flex-1 min-w-[160px] py-2 text-sm outline-none text-gray-800 placeholder-gray-500"
            />

            {(toFocused || dialInput.trim()) && (
              <div className="absolute top-full left-4 mt-1 w-72 bg-white rounded-lg shadow-md border border-gray-100 z-10 overflow-hidden">
                {fullNumber ? (
                  <button
                    onClick={() => addRecipient(dialInput.trim())}
                    className="w-full px-4 py-3 text-left text-sm text-gray-800 hover:bg-gray-50 transition flex items-center gap-2"
                  >
                    <span className="w-7 h-7 shrink-0 rounded-full bg-blue-50 text-blue-600 font-semibold flex items-center justify-center">+</span>
                    <span className="truncate">
                      {T('Send new message to', '发送新消息给')} <b>{dialInput.trim()}</b>
                    </span>
                  </button>
                ) : (
                  <div className="p-6 text-center text-gray-500 text-sm">{t('chat.noContacts')}</div>
                )}
              </div>
            )}
          </div>

          <div className="border-b border-gray-200 text-xs text-gray-500 py-1.5 px-4">
            {recipients.length >= MAX_RECIPIENTS
              ? T('Maximum 5 recipients', '最多 5 个收件人')
              : t('chat.addRecipients')}
          </div>

          {recipients.length > 0 && composerBar(submitCompose, true)}
        </div>
      ) : !thread ? (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
          {T('Select a conversation to start messaging', '选择一个对话开始发送消息')}
        </div>
      ) : (
        <>
          <div className="px-5 py-3.5 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900">{thread.name}</div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  {fromNumber ? `${t('chat.sendAs')}: ${fromNumber}` : (thread.messages[0]?.direction === 'in' ? 'Client' : 'Conversation')}
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {thread.messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.direction === 'out' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                    msg.direction === 'out'
                      ? 'bg-gradient-to-r from-primary to-secondary text-white rounded-br-sm'
                      : 'bg-white text-slate-800 rounded-bl-sm border border-slate-200'
                  }`}
                >
                  {msg.mediaUrl && (
                    <img src={msg.mediaUrl} alt="" className="rounded-xl mb-1.5 max-w-[220px] max-h-48 object-cover" />
                  )}
                  {msg.body}
                  <div className={`text-[10px] mt-1 ${msg.direction === 'out' ? 'text-white/70' : 'text-slate-400'} flex items-center gap-1`}>
                    {msg.time}
                    {msg.direction === 'out' && msg.status && (
                      <span>{msg.status === 'sent' ? '✓' : '✓✓'}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {thread.messages.length === 0 && (
              <div className="text-center text-sm text-slate-400 pt-20">
                Say hello to {thread.name}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {composerBar(submitDraft, true)}
        </>
      )}
    </div>
  );
}
