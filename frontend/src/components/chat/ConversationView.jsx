import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { uploadSmsImage } from '../../services/api.js';

import ImageLightbox from './ImageLightbox.jsx';
import EmojiPicker from './EmojiPicker.jsx';

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
  onMobileBack,
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
  const [recipients, setRecipients] = useState([]);
  const [toFocused, setToFocused] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [menuFor, setMenuFor] = useState(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);
  const composerRef = useRef(null);
  const emojiRef = useRef(null);

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
    !contacts.some((th) => digits(th.name) === digits(dialInput));

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
    if (draft.trim() || mediaUrl.trim()) {
      onSend(draft, mediaUrl.trim() || null);
      setDraft('');
      setMediaUrl('');
    }
  };

  const submitCompose = (e) => {
    e.preventDefault();
    if (recipients.length && (draft.trim() || mediaUrl.trim())) {
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
        <div className="mb-2 flex items-center">
          <div className="relative shrink-0">
            <img src={mediaUrl} alt="" className="w-20 h-20 rounded-lg border border-gray-200 object-cover shadow-sm" />
            <button
              type="button"
              onClick={() => setMediaUrl('')}
              className="absolute -top-2 -right-2 bg-gray-600 hover:bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center cursor-pointer z-10 leading-none"
              title={T('Remove', '移除')}
            >
              ×
            </button>
          </div>
        </div>
      )}
      {uploadError && <div className="mb-2 text-xs text-red-500">{uploadError}</div>}
      <div className="flex items-center gap-3">
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setAttachMenu((v) => (v === 'closed' ? 'main' : 'closed'));
              setEmojiOpen(false);
            }}
            className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-500 transition"
            title={T('Attach', '添加附件')}
          >
            {uploading ? <span className="text-sm">…</span> : <span className="text-2xl leading-none text-gray-400">+</span>}
          </button>
          {attachMenu !== 'closed' && (
            <div className="absolute bottom-12 left-0 w-52 bg-white rounded-lg shadow-md border border-gray-100 py-1 z-20">
              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click();
                  setAttachMenu('closed');
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-gray-50 transition flex items-center gap-2"
              >
                <span className="w-5 text-center text-gray-500">🖼</span>
                {T('Photos', '照片')}
              </button>
              <button
                type="button"
                onClick={() => {
                  fileInputRef.current?.click();
                  setAttachMenu('closed');
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-800 hover:bg-gray-50 transition flex items-center gap-2"
              >
                <span className="w-5 text-center text-gray-500">↑</span>
                {T('Upload', '上传')}
              </button>
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

        <div className="relative" ref={emojiRef}>
          <button
            type="button"
            onClick={() => {
              setEmojiOpen((v) => !v);
              if (attachMenu !== 'closed') setAttachMenu('closed');
            }}
            className="w-9 h-9 rounded-full hover:bg-gray-100 flex items-center justify-center transition"
            title={T('Emoji', '表情')}
          >
            <svg viewBox="0 0 24 24" className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M8 14s1.5 2 4 2 4-2 4-2" />
              <line x1="9" y1="9" x2="9.01" y2="9" />
              <line x1="15" y1="9" x2="15.01" y2="9" />
            </svg>
          </button>
          {emojiOpen && (
            <EmojiPicker
              onSelect={(e) => setDraft((d) => d + e)}
            />
          )}
        </div>

        <button
          type="submit"
          disabled={!canSend || (!draft.trim() && !mediaUrl)}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
            canSend && (draft.trim() || mediaUrl) ? 'bg-[#1a73e8] text-white hover:bg-[#1765cc]' : 'bg-gray-100 text-gray-400'
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
    <div className="flex-1 flex flex-col bg-white min-w-0" style={hidden ? { display: 'none' } : undefined}>
      {!thread && composing ? (
        <div ref={composerRef} className="flex-1 flex flex-col min-h-0 bg-white">
          <div className="relative border-t border-b border-gray-200 px-4 py-3 flex items-center flex-wrap">
            {onMobileBack && (
              <button
                type="button"
                onClick={() => onMobileBack && onMobileBack()}
                className="md:hidden w-8 h-8 shrink-0 rounded-full hover:bg-gray-100 text-gray-500 flex items-center justify-center transition mr-1"
                title={T('Back', '返回')}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
              </button>
            )}
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

          <div className="flex-1 w-full overflow-y-auto" />

          {recipients.length > 0 && composerBar(submitCompose, true)}
        </div>
      ) : !thread ? (
        <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
          {T('Select a conversation to start messaging', '选择一个对话开始发送消息')}
        </div>
      ) : (
        <>
          <div className="px-5 py-3.5 border-b border-slate-200 bg-white">
            <div className="flex items-center">
              {onMobileBack && (
                <button
                  onClick={() => onMobileBack && onMobileBack()}
                  className="md:hidden w-9 h-9 shrink-0 rounded-full hover:bg-gray-100 text-gray-500 flex items-center justify-center transition mr-1"
                  title={T('Back', '返回')}
                >
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="12" x2="5" y2="12" />
                    <polyline points="12 19 5 12 12 5" />
                  </svg>
                </button>
              )}
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 truncate">{thread.name}</div>
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
                {msg.mediaUrl ? (
                  <div className="max-w-[70%]">
                    <div className="relative inline-block">
                      <img
                        src={msg.mediaUrl}
                        alt=""
                        onClick={() => setLightbox(msg.mediaUrl)}
                        className={`rounded-2xl max-w-[260px] max-h-64 object-cover shadow-sm cursor-zoom-in transition hover:opacity-90 ${msg.direction === 'out' ? '' : 'border border-slate-200'}`}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuFor(msg.id === menuFor ? null : msg.id);
                        }}
                        className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition"
                        title="More options"
                      >
                        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                          <circle cx="12" cy="5" r="1.8" />
                          <circle cx="12" cy="12" r="1.8" />
                          <circle cx="12" cy="19" r="1.8" />
                        </svg>
                      </button>
                      {menuFor === msg.id && (
                        <div
                          className="absolute top-9 right-0 z-20 bg-white rounded-lg shadow-lg border border-gray-200 py-1 w-32"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => {
                              handleSave(msg.mediaUrl);
                              setMenuFor(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-slate-700 hover:bg-gray-100 transition"
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
                      <div className={`mt-1.5 ${msg.direction === 'out' ? 'text-right' : ''}`}>
                        <span
                          className={`inline-block px-3 py-1.5 rounded-xl text-sm shadow-sm ${
                            msg.direction === 'out'
                              ? 'bg-gradient-to-r from-primary to-secondary text-white rounded-br-sm'
                              : 'bg-white text-slate-800 border border-slate-200 rounded-bl-sm'
                          }`}
                        >
                          {msg.body}
                        </span>
                      </div>
                    )}
                    <div className={`text-[10px] mt-1 text-slate-400 flex items-center gap-1 ${msg.direction === 'out' ? 'justify-end' : ''}`}>
                      {msg.time}
                      {msg.direction === 'out' && msg.status && (
                        <span>{msg.status === 'sent' ? '✓' : '✓✓'}</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                      msg.direction === 'out'
                        ? 'bg-gradient-to-r from-primary to-secondary text-white rounded-br-sm'
                        : 'bg-white text-slate-800 rounded-bl-sm border border-slate-200'
                    }`}
                  >
                    {msg.body}
                    <div className={`text-[10px] mt-1 ${msg.direction === 'out' ? 'text-white/70' : 'text-slate-400'} flex items-center gap-1`}>
                      {msg.time}
                      {msg.direction === 'out' && msg.status && (
                        <span>{msg.status === 'sent' ? '✓' : '✓✓'}</span>
                      )}
                    </div>
                  </div>
                )}
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

      {lightbox && <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />}
    </div>
  );
}
