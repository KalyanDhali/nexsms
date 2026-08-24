import { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';

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
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages?.length]);

  if (!thread) {
    return <NewConversation onStartNew={onStartNew} onCancel={() => {}} />;
  }

  const submit = (e) => {
    e.preventDefault();
    if (draft.trim()) {
      onSend(draft);
      setDraft('');
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

      <form onSubmit={submit} className="px-4 py-3 border-t border-slate-200 bg-white flex items-center gap-2">
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
      </form>
    </div>
  );
}
