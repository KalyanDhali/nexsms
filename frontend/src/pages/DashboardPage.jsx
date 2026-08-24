import { useState } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import ConversationList from '../components/chat/ConversationList.jsx';
import ConversationView from '../components/chat/ConversationView.jsx';

const mockThreads = [
  {
    id: 1,
    name: '+1 (650) 769-0192',
    preview: 'Good day! Confirming your order...',
    time: '10:16 PM',
    unread: 1,
    active: true,
    messages: [
      { id: 1, direction: 'out', body: 'Hello! Your order is confirmed. Thank you!', time: '10:04 PM', status: 'delivered' },
      { id: 2, direction: 'in', body: 'Great, when will it arrive?', time: '10:10 PM' },
      { id: 3, direction: 'out', body: 'By Friday. Tracking: NX-4821', time: '10:15 PM', status: 'delivered' },
    ],
  },
  {
    id: 2,
    name: 'Elizabeth Chen',
    preview: 'The package arrived, thank you!',
    time: '9:42 PM',
    unread: 0,
    messages: [
      { id: 1, direction: 'in', body: 'The package arrived, thank you! Everything looks great.', time: '9:42 PM' },
    ],
  },
  {
    id: 3,
    name: '+1 (213) 461-4228',
    preview: 'Hi Kayla! Are you available?',
    time: '8:30 PM',
    unread: 0,
    messages: [
      { id: 1, direction: 'in', body: 'Hi Kayla! Are you available?', time: '8:30 PM' },
      { id: 2, direction: 'out', body: 'Yes, I am! What do you need?', time: '8:32 PM', status: 'sent' },
    ],
  },
];

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [threads, setThreads] = useState(mockThreads);
  const [activeThread, setActiveThread] = useState(mockThreads[0].id);
  const [search, setSearch] = useState('');

  const active = threads.find((th) => th.id === activeThread);

  const sendMessage = (body) => {
    if (!body.trim()) return;
    setThreads((prev) =>
      prev.map((th) =>
        th.id === activeThread
          ? {
              ...th,
              messages: [...th.messages, { id: Date.now(), direction: 'out', body, time: 'Now', status: 'sent' }],
              preview: body,
            }
          : th
      )
    );
  };

  const filtered = threads.filter((th) =>
    th.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-screen flex flex-col bg-white">
      <header className="h-14 border-b border-slate-200 flex items-center justify-between px-4 bg-white">
        <div className="flex items-center gap-3">
          <span className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm">N</span>
          <span className="font-semibold text-slate-900">{theme.siteName}</span>
          <div className="ml-6 hidden sm:flex items-center gap-2 text-sm text-slate-500">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            {user?.email}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-slate-700">${Number(user?.balance || 0).toFixed(2)}</span>
          <button
            onClick={logout}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
          >
            {t('nav.login') === 'Sign in' ? 'Logout' : '退出'}
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <ConversationList
          threads={filtered}
          activeId={activeThread}
          onSelect={setActiveThread}
          search={search}
          onSearch={setSearch}
          onNew={() => setActiveThread(null)}
        />
        <ConversationView
          thread={active}
          onSend={sendMessage}
          onStartNew={(contact) => {
            const newThread = {
              id: Date.now(),
              name: contact,
              preview: 'No messages yet',
              time: 'Now',
              unread: 0,
              messages: [],
            };
            setThreads((prev) => [newThread, ...prev]);
            setActiveThread(newThread.id);
          }}
        />
      </div>
    </div>
  );
}
