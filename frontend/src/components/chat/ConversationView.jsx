import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { uploadSmsImage } from '../../services/api.js';

import ImageLightbox from './ImageLightbox.jsx';
import EmojiPicker from './EmojiPicker.jsx';
import Avatar from './Avatar.jsx';

const MAX_RECIPIENTS = 5;
const MAX_COMPOSE_HEIGHT = 120;

export default function ConversationView({
  thread,
  onSend,
  onRetry,
  onComposeSend,
  contacts,
  dialInput,
  onDialChange,
  fromNumber,
  composing,
  onCloseComposer,
  onMobileBack,
  onOpenDetails,
  onPickSender,
  hidden,
}) {
  const { t, lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);
  const [draft, setDraft] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [attachMenu, setAttachMenu] = useState('closed');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [sending, setSending] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [toFocused, setToFocused] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [menuFor, setMenuFor] = useState(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);
  const composerRef = useRef(null);
  const emojiRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages?.length, sending]);

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

  useEffect(() => {
    if (!menuFor) return;
    const handler = () => setMenuFor(null);
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuFor]);

  useEffect(() => {
    if (!emojiOpen) return;
    const handler = (e) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target)) {
        setEmojiOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [emojiOpen]);

  const autosize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, MAX_COMPOSE_HEIGHT) + 'px';
  };

  const handleSave = async (url) => {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      a.download = url.split('/').pop() || 'image.jpg';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      window.open(url, '_blank');
    }
  };

  const digits = (s) => (s || '').replace(/[^0-9]/g, '');
  const fullNumber =
    recipients.length < MAX_RECIPIENTS &&
    /^[0-9+()\s-]{7,}$/.test(dialInput.trim()) &&
    !recipients.some((r) => digits(r) === digits(dialInput)) &&
    !contacts.some((th) => digits(th.contactNumber || th.name) === digits(dialInput));

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

  const submitDraft = async (e) => {
    e.preventDefault();
    if (!(draft.trim() || mediaUrl.trim()) || sending) return;
    const body = draft;
    const url = mediaUrl.trim() || null;
    setSending(true);
    try {
      await onSend(body, url);
    } finally {
      setSending(false);
    }
    setDraft('');
    setMediaUrl('');
    requestAnimationFrame(() => {
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
    });
  };

  const submitCompose = async (e) => {
    e.preventDefault();
    if (!recipients.length || !(draft.trim() || mediaUrl.trim()) || sending) return;
    const body = draft;
    const url = mediaUrl.trim() || null;
    setSending(true);
    try {
      await onComposeSend({ recipients, body, mediaUrl: url });
    } finally {
      setSending(false);
    }
    setDraft('');
    setMediaUrl('');
  };

  const addRecipient = (num) => {
    if (!num || recipients.length >= MAX_RECIPIENTS) return;
    setRecipients((r) => (r.includes(num) ? r : [...r, num]));
    onDialChange('');
  };

  const removeRecipient = (num) => setRecipients((r) => r.filter((x) => x !== num));

  const canSend = !sending && !uploading;

  const statusTicks = (status) => {
    if (status === 'failed') {
      return (
        <span className="inline-flex items-center text-rose-300" title={T('Failed', '失败')}>
          <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </span>
      );
    }
    const delivered = status === 'delivered' || status === 'read';
    const pending = status === 'pending' || status === 'scheduled';
    return (
      <span className={`inline-flex items-center gap-px ${delivered ? 'text-sky-300' : pending ? 'text-white/60' : 'text-white/85'}`} title={status}>
        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        {delivered && (
          <svg viewBox="0 0 24 24" className="w-3 h-3 -ml-1" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </span>
    );
  };

  const messageMeta = (msg) => (
    <span className={`inline-flex items-center gap-1 text-[10px] ${msg.direction === 'out' ? 'text-white/70 dark:text-white/60' : 'text-slate-400 dark:text-slate-500'}`}>
      <span>{msg.time}</span>
      {msg.direction === 'out' && msg.status && statusTicks(msg.status)}
    </span>
  );

  const retryRow = (msg) => (
    <button
      type="button"
      onClick={() => onRetry && onRetry(msg)}
      className={`mt-1.5 inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold transition ${
        msg.direction === 'out'
          ? 'bg-white/15 text-white hover:bg-white/25'
          : 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 dark:hover:bg-rose-900/40'
      }`}
    >
      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10" />
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
      </svg>
      {T('Retry', '重试')}
    </button>
  );

  const renderBubble = (msg) => {
    const isOut = msg.direction === 'out';
    if (msg.mediaUrl) {
      return (
        <div className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
          <div className="max-w-[78%] sm:max-w-[70%]">
            <div className="relative inline-block">
              <img
                src={msg.mediaUrl}
                alt=""
                onClick={() => setLightbox(msg.mediaUrl)}
                className={`rounded-2xl max-w-[240px] max-h-60 object-cover shadow cursor-zoom-in transition hover:opacity-90 ${isOut ? '' : 'border border-slate-200 dark:border-slate-700'}`}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuFor(msg.id === menuFor ? null : msg.id);
                }}
                className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition"
                title="More options"
                aria-label="More options"
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <circle cx="12" cy="5" r="1.8" />
                  <circle cx="12" cy="12" r="1.8" />
                  <circle cx="12" cy="19" r="1.8" />
                </svg>
              </button>
              {menuFor === msg.id && (
                <div
                  className="absolute top-9 right-0 z-20 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-1 w-32"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => {
                      handleSave(msg.mediaUrl);
                      setMenuFor(null);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 transition"
                  >
                    <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="7 10 12 15 17 10" />
                      <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                    {T('Save', '保存')}
                  </button>
                </div>
              )}
            </div>
            {msg.body && (
              <div className={`mt-1.5 ${isOut ? 'text-right' : ''}`}>
                <span
                  className={`inline-block px-3 py-1.5 rounded-xl text-sm shadow-sm ${
                    isOut
                      ? 'bg-gradient-to-r from-primary to-secondary text-white rounded-br-sm'
                      : 'bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-bl-sm'
                  }`}
                >
                  {msg.body}
                </span>
              </div>
            )}
            <div className={`mt-1 flex items-center gap-1 ${isOut ? 'justify-end' : ''}`}>{messageMeta(msg)}</div>
            {isOut && msg.status === 'failed' && retryRow(msg)}
          </div>
        </div>
      );
    }
    return (
      <div className={`flex ${isOut ? 'justify-end' : 'justify-start'}`}>
        <div
          className={`max-w-[80%] sm:max-w-[70%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
            isOut
              ? 'bg-gradient-to-r from-primary to-secondary text-white rounded-br-sm'
              : 'bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100 rounded-bl-sm border border-slate-200 dark:border-slate-700'
          } ${msg.status === 'failed' ? 'ring-1 ring-rose-400/60' : ''}`}
        >
          <span className="whitespace-pre-wrap break-words">{msg.body}</span>
          <div className={`mt-1 flex items-center gap-1 justify-end`}>{messageMeta(msg)}</div>
          {isOut && msg.status === 'failed' && retryRow(msg)}
          {isOut && msg.status === 'failed' && msg.error && (
            <div className="mt-1.5 text-[10px] leading-tight text-rose-500 dark:text-rose-400 truncate max-w-[220px]" title={msg.error}>
              {T('Send failed', '发送失败')}
            </div>
          )}
        </div>
      </div>
    );
  };

  const composerBar = (onSubmit, type) => (
    <form onSubmit={onSubmit} className="border-t border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      {mediaUrl && (
        <div className="mb-2 flex items-center">
          <div className="relative shrink-0">
            <img src={mediaUrl} alt="" className="w-20 h-20 rounded-lg border border-slate-200 dark:border-slate-700 object-cover shadow-sm" />
            <button
              type="button"
              onClick={() => setMediaUrl('')}
              className="absolute -top-2 -right-2 bg-slate-600 hover:bg-rose-500 text-white rounded-full w-6 h-6 flex items-center justify-center cursor-pointer z-10 leading-none"
              title={T('Remove', '移除')}
              aria-label={T('Remove', '移除')}
            >
              ×
            </button>
          </div>
        </div>
      )}
      {uploadError && <div className="mb-2 text-xs text-rose-500">{uploadError}</div>}
      <div className="flex items-end gap-2">
        <div className="relative shrink-0 self-center">
          <button
            type="button"
            onClick={() => {
              setAttachMenu((v) => (v === 'closed' ? 'main' : 'closed'));
              setEmojiOpen(false);
            }}
            className="w-11 h-11 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 transition"
            title={T('Attach', '添加附件')}
            aria-label={T('Attach', '添加附件')}
          >
            {uploading ? (
              <span className="block w-4 h-4 border-2 border-slate-400 border-t-primary rounded-full animate-spin" />
            ) : (
              <span className="text-2xl leading-none">+</span>
            )}
          </button>
          {attachMenu !== 'closed' && (
            <div className="absolute bottom-12 left-0 w-52 bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-100 dark:border-slate-700 py-1 z-20">
              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click();
                  setAttachMenu('closed');
                }}
                className="w-full text-left px-4 py-2 text-sm text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-2"
              >
                <span className="w-5 text-center text-slate-500 dark:text-slate-400">🖼</span>
                {T('Photos', '照片')}
              </button>
              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click();
                  setAttachMenu('closed');
                }}
                className="w-full text-left px-4 py-2 text-sm text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-2"
              >
                <span className="w-5 text-center text-slate-500 dark:text-slate-400">↑</span>
                {T('Upload', '上传')}
              </button>
            </div>
          )}
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />

        <div className="flex-1 min-w-0 flex flex-col bg-slate-100 dark:bg-slate-800 rounded-3xl px-4 pt-2 pb-1.5 border border-transparent focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:ring-2 focus-within:ring-primary/30 transition">
          <textarea
            ref={textareaRef}
            rows={1}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              autosize();
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={t('chat.typeMessage')}
            className="flex-1 min-w-0 bg-transparent outline-none text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-none leading-5 max-h-[120px] py-1"
          />
          <div className="flex items-center justify-end h-4">
            {draft.length > 0 && (
              <span className={`text-[10px] leading-none ${draft.length > 160 ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`}>
                {draft.length}
              </span>
            )}
          </div>
        </div>

        <div className="relative shrink-0 self-center" ref={emojiRef}>
          <button
            type="button"
            onClick={() => {
              setEmojiOpen((v) => !v);
              if (attachMenu !== 'closed') setAttachMenu('closed');
            }}
            className="w-11 h-11 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition"
            title={T('Emoji', '表情')}
            aria-label={T('Emoji', '表情')}
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-slate-500 dark:text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </button>
          {emojiOpen && <EmojiPicker onSelect={(e) => setDraft((d) => d + e)} />}
        </div>

        <button
          type="submit"
          disabled={!canSend || (!draft.trim() && !mediaUrl)}
          className={`w-11 h-11 rounded-full flex items-center justify-center transition shrink-0 ${
            canSend && (draft.trim() || mediaUrl)
              ? 'bg-primary text-white hover:opacity-90 active:scale-95'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-400 dark:text-slate-500 cursor-not-allowed'
          }`}
          title={T('Send', '发送')}
          aria-label={T('Send', '发送')}
        >
          {sending ? (
            <span className="block w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" />
          ) : (
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </button>
      </div>
    </form>
  );

  return (
    <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 min-w-0" style={hidden ? { display: 'none' } : undefined}>
      {!thread && composing ? (
        <div ref={composerRef} className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900">
          <div className="relative border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center flex-wrap">
            {onMobileBack && (
              <button
                type="button"
                onClick={() => onMobileBack && onMobileBack()}
                className="md:hidden w-11 h-11 shrink-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center transition mr-1"
                title={T('Back', '返回')}
                aria-label={T('Back', '返回')}
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
              </button>
            )}
            <span className="text-slate-700 dark:text-slate-200 font-medium mr-2 shrink-0 text-sm">{t('chat.to')}:</span>
            {recipients.map((r) => (
              <span
                key={r}
                className="flex items-center gap-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full px-3 py-1 text-sm mr-1.5"
              >
                {r}
                <button
                  type="button"
                  onClick={() => removeRecipient(r)}
                  className="w-5 h-5 rounded-full hover:bg-primary/20 text-primary opacity-70 hover:opacity-100 flex items-center justify-center leading-none"
                  aria-label={T('Remove', '移除')}
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
              className="flex-1 min-w-[160px] py-2 text-sm outline-none text-slate-800 dark:text-slate-100 bg-transparent placeholder-slate-400 dark:placeholder-slate-500"
            />

            {(toFocused || dialInput.trim()) && (
              <div className="absolute top-full left-4 mt-1 w-72 max-w-[calc(100%-2rem)] bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 z-10 overflow-hidden">
                {fullNumber ? (
                  <button
                    onClick={() => addRecipient(dialInput.trim())}
                    className="w-full px-4 py-3 text-left text-sm text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-2"
                  >
                    <span className="w-7 h-7 shrink-0 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center">+</span>
                    <span className="truncate">
                      {T('Send new message to', '发送新消息给')} <b>{dialInput.trim()}</b>
                    </span>
                  </button>
                ) : (
                  <div className="p-6 text-center text-slate-500 dark:text-slate-400 text-sm">{t('chat.noContacts')}</div>
                )}
              </div>
            )}
          </div>

          <div className="border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 py-1.5 px-4 flex items-center justify-between gap-2">
            <span>
              {recipients.length >= MAX_RECIPIENTS
                ? T('Maximum 5 recipients', '最多 5 个收件人')
                : t('chat.addRecipients')}
            </span>
            <button
              type="button"
              onClick={() => onPickSender && onPickSender()}
              className="shrink-0 flex items-center gap-1 px-2 h-7 rounded-full bg-primary/10 text-primary dark:text-indigo-300 text-[11px] font-medium transition hover:bg-primary/20"
              title={T('Change sender number', '更改发送号码')}
            >
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              {T('From: ', '发送自：')}
              <span className="max-w-[110px] truncate font-mono">{fromNumber || T('Pick', '选择')}</span>
            </button>
          </div>

          <div className="flex-1 w-full overflow-y-auto" />

          {recipients.length > 0 && composerBar(submitCompose, 'compose')}
        </div>
      ) : !thread ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-2 text-sm text-slate-400 dark:text-slate-500">
          <svg viewBox="0 0 24 24" className="w-10 h-10 text-slate-300 dark:text-slate-700" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {T('Select a conversation to start messaging', '选择一个对话开始发送消息')}
        </div>
      ) : (
        <>
          <div className="px-3 sm:px-5 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2 shrink-0">
            {onMobileBack && (
              <button
                onClick={() => onMobileBack && onMobileBack()}
                className="md:hidden w-11 h-11 shrink-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center transition"
                title={T('Back', '返回')}
                aria-label={T('Back', '返回')}
              >
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
              </button>
            )}
            <button
              onClick={() => onOpenDetails && onOpenDetails()}
              className="shrink-0 flex items-center gap-2.5 min-w-0 text-left"
              aria-label={T('Contact details', '联系人详情')}
            >
              <Avatar name={thread.name} src={thread.avatar} size={38} />
              <span className="min-w-0">
                <span className="block font-semibold text-slate-900 dark:text-white truncate text-sm">{thread.name}</span>
                <span className="block text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                  {thread.assignedNumber || fromNumber ? (
                    <>{thread.assignedNumber || fromNumber}</>
                  ) : (
                    thread.messages[0]?.direction === 'in' ? T('Client', '客户') : T('Conversation', '对话')
                  )}
                </span>
              </span>
            </button>
            <span className="flex-1" />
            <button
              onClick={() => onOpenDetails && onOpenDetails()}
              className="hidden md:flex w-11 h-11 shrink-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 items-center justify-center transition"
              title={T('Details', '详情')}
              aria-label={T('Details', '详情')}
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="1" />
                <circle cx="19" cy="12" r="1" />
                <circle cx="5" cy="12" r="1" />
              </svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-3 bg-slate-50 dark:bg-slate-950">
            {thread.messages.map((msg) => (
              <div key={msg.id}>{renderBubble(msg)}</div>
            ))}
            {thread.messages.length === 0 && (
              <div className="text-center text-sm text-slate-400 dark:text-slate-500 pt-20">
                {T('Say hello to', '打个招呼给')} {thread.name}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {composerBar(submitDraft, 'draft')}
        </>
      )}

      {lightbox && <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
