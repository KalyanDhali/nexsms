import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { getTemplates, uploadSmsImage, getMyNumbers } from '../../services/api.js';
import Keypad from './Keypad.jsx';

export default function ConversationView({ thread, onSend, onStartNew }) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState('');
  const [contact, setContact] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [keypadOpen, setKeypadOpen] = useState(true);
  const [numbers, setNumbers] = useState([]);
  const [fromNumber, setFromNumber] = useState('');
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages?.length]);

  useEffect(() => {
    getTemplates().then(({ data }) => setTemplates(data.templates)).catch(() => {});
    getMyNumbers()
      .then(({ data }) => {
        setNumbers(data.numbers);
        if (data.numbers.length) setFromNumber(data.numbers[0].number);
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

  const startNew = (e) => {
    e.preventDefault();
    if (contact.trim()) {
      onStartNew(contact.trim());
      setContact('');
    }
  };

  // Google Voice style: keypad appends to the active text target
  const onKey = (digit) => {
    if (!thread) {
      setContact((c) => c + digit);
    } else {
      setDraft((d) => d + digit);
    }
  };

  const onBackspace = () => {
    if (!thread) {
      setContact((c) => c.slice(0, -1));
    } else {
      setDraft((d) => d.slice(0, -1));
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50">
      {!thread ? (
        <form onSubmit={startNew} className="flex-1 flex flex-col min-h-0">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-white">
            <div className="font-semibold text-slate-900">{t('chat.newMessage')}</div>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-sm text-slate-500 shrink-0">{t('chat.to')}:</span>
              <input
                autoFocus
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                placeholder={t('chat.enterNumber')}
                className="flex-1 px-3 py-2 rounded-xl border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 text-sm outline-none transition"
              />
              <button
                type="submit"
                disabled={!contact.trim()}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-primary to-secondary text-white text-sm font-semibold disabled:opacity-40"
              >
                {t('chat.start')}
              </button>
            </div>
            <div className="mt-1.5 text-xs text-slate-400">{t('chat.addRecipients')}</div>
          </div>
          <div className="flex-1 flex items-center justify-center text-sm text-slate-400">
            {t('chat.noContacts')}
          </div>
          {keypadOpen && <Keypad onKey={onKey} onBackspace={onBackspace} onHide={() => setKeypadOpen(false)} />}
          {!keypadOpen && (
            <button type="button" onClick={() => setKeypadOpen(true)} className="border-t border-slate-200 bg-white py-1.5 text-xs text-slate-500 hover:text-slate-700">
              {t('chat.showKeypad')}
            </button>
          )}
        </form>
      ) : (
        <>
          <div className="px-5 py-3.5 border-b border-slate-200 bg-white">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-slate-900">{thread.name}</div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                  {thread.messages[0]?.direction === 'in' ? 'Client' : 'Conversation'}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400 hidden sm:inline">{t('chat.sendAs')}:</span>
                <select
                  value={fromNumber}
                  onChange={(e) => setFromNumber(e.target.value)}
                  className="px-2 py-1 text-xs rounded-lg border border-slate-200 text-slate-600 bg-white"
                >
                  {numbers.length === 0 && <option value="">{t('chat.myNumbers')}</option>}
                  {numbers.map((n) => <option key={n.id} value={n.number}>{n.number}</option>)}
                </select>
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

          <form onSubmit={submitDraft} className="px-4 pt-3 pb-1 border-t border-slate-200 bg-white">
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
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTemplates((v) => !v)}
                  className="h-10 px-3 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm transition"
                  title="Templates"
                >
                  ▤
                </button>
                {showTemplates && (
                  <div className="absolute bottom-12 left-0 w-72 max-h-72 overflow-y-auto bg-white border border-slate-200 rounded-xl shadow-lg z-20 py-1">
                    {templates.length === 0 && <div className="px-4 py-2 text-sm text-slate-400">No templates</div>}
                    {templates.map((tmpl) => (
                      <button
                        key={tmpl.id}
                        type="button"
                        onClick={() => {
                          setDraft(tmpl.body);
                          setShowTemplates(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 text-sm"
                      >
                        <span className="font-medium text-slate-800">{tmpl.name}</span>
                        <span className="block text-xs text-slate-400 truncate">{tmpl.body}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className={`h-10 px-3 rounded-xl border text-sm transition ${uploading ? 'opacity-50' : 'text-slate-500 hover:bg-slate-50'}`}
                title="Attach image (MMS)"
              >
                {uploading ? '…' : '▣'}
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t('chat.typeMessage')}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 focus:bg-white border border-transparent focus:border-primary text-sm outline-none transition"
              />
              <button
                type="submit"
                disabled={!draft.trim()}
                className="w-10 h-10 rounded-xl bg-gradient-to-r from-primary to-secondary text-white flex items-center justify-center disabled:opacity-40 hover:opacity-90 transition"
              >
                ➤
              </button>
            </div>
          </form>

          {keypadOpen ? (
            <Keypad onKey={onKey} onBackspace={onBackspace} onHide={() => setKeypadOpen(false)} />
          ) : (
            <button type="button" onClick={() => setKeypadOpen(true)} className="border-t border-slate-200 bg-white py-1.5 text-xs text-slate-500 hover:text-slate-700">
              {t('chat.showKeypad')}
            </button>
          )}
        </>
      )}
    </div>
  );
}
