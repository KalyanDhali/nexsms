import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { getMyNumbers } from '../services/api.js';
import NavSidebar from '../components/chat/NavSidebar.jsx';
import ConversationList from '../components/chat/ConversationList.jsx';
import ConversationView from '../components/chat/ConversationView.jsx';
import KeypadPanel from '../components/chat/KeypadPanel.jsx';
import CallsPanel from '../components/chat/CallsPanel.jsx';
import EmptyListPanel from '../components/chat/EmptyListPanel.jsx';
import SettingsView from '../components/chat/SettingsView.jsx';
import NumbersPanel from '../components/NumbersPanel.jsx';
import BillingPanel from '../components/BillingPanel.jsx';
import ApiKeysPanel from '../components/ApiKeysPanel.jsx';
import AccountPanel from '../components/AccountPanel.jsx';
import BlastModal from '../components/BlastModal.jsx';

const mockThreads = [
  {
    id: 1,
    name: '(920) 917-4460',
    preview: 'Hello Kenji! I am Victoria, the lead at Vanker Finance. Our team no...',
    time: 'Sun',
    unread: 0,
    lastDirection: 'out',
    messages: [
      { id: 1, direction: 'out', body: 'Hello Kenji! I am Victoria, the lead at Vanker Finance. Our team no...', time: 'Sun', status: 'delivered' },
    ],
  },
  {
    id: 2,
    name: '(920) 246-7591',
    avatar: 'https://i.pravatar.cc/100?img=32',
    preview: "Good morning, David! I'm Victoria, the lead at Vanker Finance. Ou...",
    time: '9:32 PM',
    unread: 0,
    lastDirection: 'out',
    messages: [
      { id: 1, direction: 'out', body: "Good morning, David! I'm Victoria, the lead at Vanker Finance. Ou...", time: '9:32 PM', status: 'delivered' },
    ],
  },
  {
    id: 3,
    name: '+1 (213) 461-4228',
    preview: 'Hi Kayla! Are you available?',
    time: '8:30 PM',
    unread: 2,
    lastDirection: 'in',
    messages: [
      { id: 1, direction: 'in', body: 'Hi Kayla! Are you available?', time: '8:30 PM' },
      { id: 2, direction: 'out', body: 'Yes, I am! What do you need?', time: '8:32 PM', status: 'sent' },
    ],
  },
  {
    id: 4,
    name: '(920) 246-7592',
    avatar: 'https://i.pravatar.cc/100?img=47',
    preview: 'Great, talk soon!',
    time: '6:05 PM',
    unread: 0,
    lastDirection: 'out',
    messages: [
      { id: 1, direction: 'in', body: 'Can you send the details?', time: '6:00 PM' },
      { id: 2, direction: 'out', body: 'Great, talk soon!', time: '6:05 PM', status: 'sent' },
    ],
  },
];

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const { t, lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);
  const { theme } = useTheme();
  const [threads, setThreads] = useState(mockThreads);
  const [activeThread, setActiveThread] = useState(mockThreads[0].id);
  const [search, setSearch] = useState('');
  const [dialInput, setDialInput] = useState('');
  const [fromNumber, setFromNumber] = useState('');
  const [keypadOpen, setKeypadOpen] = useState(true);
  const [numbers, setNumbers] = useState([]);
  const [tab, setTab] = useState('messages');
  const [nav, setNav] = useState('messages');
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [composing, setComposing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [blastOpen, setBlastOpen] = useState(false);

  useEffect(() => {
    getMyNumbers()
      .then(({ data }) => {
        setNumbers(data.numbers);
        if (data.numbers.length) setFromNumber(data.numbers[0].number);
      })
      .catch(() => {});
  }, []);

  const active = threads.find((th) => th.id === activeThread);

  const sendMessage = (body, mediaUrl = null) => {
    if (!body.trim() && !mediaUrl) return;
    const preview = body.trim() || (isZh ? '图片' : 'Photo');
    setThreads((prev) =>
      prev.map((th) =>
        th.id === activeThread
          ? {
              ...th,
              messages: [...th.messages, { id: Date.now(), direction: 'out', body, mediaUrl, time: 'Now', status: 'sent' }],
              preview,
              lastDirection: 'out',
            }
          : th
      )
    );
  };

  const startNewThread = (contact) => {
    const newThread = {
      id: Date.now(),
      name: contact,
      preview: 'No messages yet',
      time: 'Now',
      unread: 0,
      lastDirection: 'in',
      messages: [],
    };
    setThreads((prev) => [newThread, ...prev]);
    setActiveThread(newThread.id);
    setComposing(false);
    setDialInput('');
    setSearch('');
  };

  const composeSend = ({ recipients, body, mediaUrl }) => {
    const msg = { id: Date.now(), direction: 'out', body, mediaUrl, time: 'Now', status: 'sent' };
    const preview = body.trim() || (isZh ? '图片' : 'Photo');
    if (recipients.length === 1) {
      const num = recipients[0];
      const existing = threads.find((th) => th.name === num);
      if (existing) {
        setThreads((prev) =>
          prev.map((th) =>
            th.id === existing.id
              ? { ...th, messages: [...th.messages, msg], preview, lastDirection: 'out' }
              : th
          )
        );
        setActiveThread(existing.id);
      } else {
        const nt = { id: Date.now(), name: num, preview, time: 'Now', unread: 0, lastDirection: 'out', messages: [msg] };
        setThreads((prev) => [nt, ...prev]);
        setActiveThread(nt.id);
      }
    } else {
      const nt = {
        id: Date.now(),
        name: recipients.join(', '),
        preview,
        time: 'Now',
        unread: 0,
        lastDirection: 'out',
        messages: [msg],
      };
      setThreads((prev) => [nt, ...prev]);
      setActiveThread(nt.id);
    }
    setComposing(false);
    setDialInput('');
    setSearch('');
  };

  const selectThread = (id) => {
    setActiveThread(id);
    setComposing(false);
  };

  const openComposer = () => {
    setActiveThread(null);
    setComposing(true);
    setDialInput('');
    setSearch('');
  };

  const onKey = (digit) => setDialInput((d) => d + digit);
  const onBackspace = () => setDialInput((d) => d.slice(0, -1));

  const listFilter = search.trim() || dialInput.trim();
  const filtered = threads.filter((th) =>
    th.name.toLowerCase().includes(listFilter.toLowerCase()) || th.preview.toLowerCase().includes(listFilter.toLowerCase())
  );
  const matches = dialInput.trim()
    ? threads.filter((th) => th.name.toLowerCase().includes(dialInput.toLowerCase()))
    : [];

  const renderChatArea = () => (
    <div className="flex flex-1 overflow-hidden">
      <NavSidebar active={nav} onChange={setNav} collapsed={navCollapsed} />
      {nav === 'messages' ? (
        <ConversationList
          threads={filtered}
          activeId={activeThread}
          onSelect={selectThread}
          onNew={openComposer}
        />
      ) : nav === 'calls' ? (
        <CallsPanel onPick={(name) => { setDialInput(name); setNav('messages'); openComposer(); }} />
      ) : (
        <EmptyListPanel kind={nav} />
      )}
      {nav === 'messages' ? (
        <ConversationView
          thread={active}
          onSend={sendMessage}
          onComposeSend={composeSend}
          contacts={threads}
          dialInput={dialInput}
          onDialChange={setDialInput}
          fromNumber={fromNumber}
          composing={composing}
          onCloseComposer={() => setComposing(false)}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-slate-50 text-sm text-slate-400 min-w-0">
          {nav === 'calls' ? T('Call history', '通话记录') : ''}
        </div>
      )}
      <KeypadPanel
        open={keypadOpen}
        onToggle={() => setKeypadOpen((v) => !v)}
        fromNumber={fromNumber}
        input={dialInput}
        onInputChange={setDialInput}
        onKey={onKey}
        onBackspace={onBackspace}
        matches={matches}
        onSelectMatch={selectThread}
        onStartNew={() => startNewThread(dialInput.trim())}
        onDial={() => {
          if (dialInput.trim()) setNav('calls');
        }}
      />
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-white">
      <header className="h-14 border-b border-slate-200 flex items-center gap-3 px-3 bg-white">
        <button
          onClick={() => setNavCollapsed((v) => !v)}
          className="w-9 h-9 shrink-0 rounded-full text-slate-500 hover:bg-slate-100 flex items-center justify-center text-lg transition"
          title="Menu"
        >
          ≡
        </button>
        <span className="w-7 h-7 shrink-0 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm">N</span>
        <span className="font-semibold text-slate-900 hidden md:block">{theme.siteName}</span>

        <div className="flex-1 flex justify-center px-2">
          <div className="w-full max-w-xl flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#f1f3f4] focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/40 border border-transparent focus-within:border-blue-500 transition">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 shrink-0">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={T('Search Google Voice', '搜索 Google Voice')}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#e6f4ea] text-[#137333] text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            {T('Receiving calls', '正在接听来电')}
          </span>
          <button
            onClick={() => setTab('billing')}
            className="hidden sm:block px-4 py-1.5 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition"
          >
            {T('Upgrade', '升级')}
          </button>
          <span className="text-sm font-semibold text-slate-700">${Number(user?.balance || 0).toFixed(2)}</span>
          <button
            onClick={() => setSettingsOpen(true)}
            className="w-9 h-9 shrink-0 rounded-full text-slate-500 hover:bg-slate-100 flex items-center justify-center transition"
            title={T('Settings', '设置')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          {user?.role === 'admin' && (
            <a
              href="/admin"
              className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-indigo-600 hover:bg-indigo-50 transition"
            >
              Admin
            </a>
          )}
          <button
            onClick={logout}
            className="px-3 py-1.5 text-sm rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
          >
            {isZh ? '退出' : 'Logout'}
          </button>
        </div>
      </header>

      <div className="h-11 border-b border-slate-200 flex items-center px-4 gap-1 bg-white">
        {['messages', 'numbers', 'billing', 'api', 'account'].map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition relative ${
              tab === key ? 'text-slate-900' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {key === 'messages' ? (isZh ? '消息' : 'Messages')
              : key === 'numbers' ? (isZh ? '号码' : 'Numbers')
              : key === 'billing' ? (isZh ? '账单' : 'Billing')
              : key === 'api' ? 'API'
              : (isZh ? '账户' : 'Account')}
            {tab === key && (
              <span className="absolute -bottom-[11px] left-3 right-3 h-0.5 rounded-full" style={{ background: theme.primary }} />
            )}
          </button>
        ))}
        {tab === 'messages' && (
          <button
            onClick={() => setBlastOpen(true)}
            className="ml-auto px-3 py-1.5 text-sm font-medium rounded-lg border border-slate-200 text-indigo-600 hover:bg-indigo-50 transition"
          >
            {isZh ? '批量群发' : 'Bulk blast'}
          </button>
        )}
      </div>

      {tab === 'messages' ? (
        settingsOpen ? (
          <SettingsView fromNumber={fromNumber} balance={user?.balance} onClose={() => setSettingsOpen(false)} />
        ) : (
          renderChatArea()
        )
      ) : tab === 'numbers' ? (
        <NumbersPanel />
      ) : tab === 'billing' ? (
        <BillingPanel />
      ) : tab === 'api' ? (
        <ApiKeysPanel />
      ) : (
        <AccountPanel />
      )}

      {blastOpen && <BlastModal onClose={() => setBlastOpen(false)} />}
    </div>
  );
}
