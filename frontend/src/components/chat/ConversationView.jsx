import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { getTemplates, uploadSmsImage } from '../../services/api.js';

function NewConversation({ onStartNew, onCancel }) {
  const { t } = useLanguage();
  const [contact, setContact] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (contact.trim()) {
      onStartNew(contact.trim());
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-50">
      <div className="w-full max-w-md px-6">
        <h2 className="text-xl font-bold text-slate-900 text-center">{t('chat.newMessage')}</h2>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <input
            autoFocus
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder={t('chat.enterNumber')}
            className="w-full px-5 py-3.5 rounded-2xl border border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20 text-lg outline-none transition"
          />
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={!contact.trim()}
              className="flex-1 py-3 rounded-xl bg-gradient-to-r from-primary to-secondary text-white font-semibold disabled:opacity-40"
            >
              Start
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-6 py-3 rounded-xl border border-slate-300 text-slate-600 font-semibold"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ConversationView({ thread, onSend, onStartNew }) {
  const { t } = useLanguage();
  const [draft, setDraft] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [showTemplates, setShowTemplates] = useState(false);
  const [templates, setTemplates] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages?.length]);

  useEffect(() => {
    getTemplates().then(({ data }) => setTemplates(data.templates)).catch(() => {});
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
      const dataUrl = reader.result;
      setUploading(true);
      setUploadError('');
      try {
        const { data } = await uploadSmsImage({ filename: file.name, data: dataUrl });
        setMediaUrl(data.url);
      } catch (err) {
        setUploadError(err.response?.data?.error || 'Upload failed');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  if (!thread) {
    return <NewConversation onStartNew={onStartNew} onCancel={() => {}} />;
  }

  const submit = (e) => {
    e.preventDefault();
    if (draft.trim()) {
      onSend(draft, mediaUrl.trim() || null);
      setDraft('');
      setMediaUrl('');
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-50">
      <div className="px-5 py-3.5 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-slate-900">{thread.name}</div>
            <div className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
              {thread.messages[0]?.direction === 'in' ? 'Client' : 'Conversation'}
            </div>
          </div>
          <button className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition">
            {t('chat.myNumbers')}
          </button>
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

      <form onSubmit={submit} className="px-4 py-3 border-t border-slate-200 bg-white">
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
    </div>
  );
}
