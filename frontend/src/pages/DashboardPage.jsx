import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import { useDarkMode } from '../context/DarkModeContext.jsx';
import { getMyNumbers, getConversations, getConversationMessages, sendSms } from '../services/api.js';
import NavSidebar from '../components/chat/NavSidebar.jsx';
import ConversationList from '../components/chat/ConversationList.jsx';
import ConversationView from '../components/chat/ConversationView.jsx';
import KeypadPanel from '../components/chat/KeypadPanel.jsx';
import ProfileMenu from '../components/chat/ProfileMenu.jsx';
import CallsPanel from '../components/chat/CallsPanel.jsx';
import EmptyListPanel from '../components/chat/EmptyListPanel.jsx';
import ContactsPanel from '../components/chat/ContactsPanel.jsx';
import MobileBottomNav from '../components/chat/MobileBottomNav.jsx';
import ContactDetailsPanel from '../components/chat/ContactDetailsPanel.jsx';
import SenderNumberSheet from '../components/chat/SenderNumberSheet.jsx';
import MobileSearchOverlay from '../components/chat/MobileSearchOverlay.jsx';
import SettingsView from '../components/chat/SettingsView.jsx';
import NumbersPanel from '../components/NumbersPanel.jsx';
import BillingPanel from '../components/BillingPanel.jsx';
import ApiKeysPanel from '../components/ApiKeysPanel.jsx';
import AccountPanel from '../components/AccountPanel.jsx';
import BlastModal from '../components/BlastModal.jsx';

function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = () => setMatches(mql.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);
  return matches;
}

const formatTime = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  }
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yest.';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
};

const mapMessage = (m) => ({
  id: m.id,
  direction: m.direction,
  body: m.body,
  mediaUrl: m.media_url,
  status: m.status,
  error: m.error,
  time: formatTime(m.time || m.created_at),
  ts: m.time || m.created_at,
});

export default function DashboardPage() {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);
  const { theme } = useTheme();
  const { dark, setDark } = useDarkMode();
  const toast = useToast();

  const [threads, setThreads] = useState([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [threadsError, setThreadsError] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [dialInput, setDialInput] = useState('');
  const [fromNumber, setFromNumber] = useState('');
  const [fromNumberId, setFromNumberId] = useState('');
  const [keypadOpen, setKeypadOpen] = useState(
    () => typeof window !== 'undefined' && !window.matchMedia('(max-width: 767px)').matches
  );
  const [numbers, setNumbers] = useState([]);
  const [tab, setTab] = useState('messages');
  const [nav, setNav] = useState('messages');
  const [navCollapsed, setNavCollapsed] = useState(false);
  const [composing, setComposing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [blastOpen, setBlastOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [senderSheetOpen, setSenderSheetOpen] = useState(false);
  const [bnav, setBnav] = useState('home');
  const isMobile = useMediaQuery('(max-width: 767px)');
  const [navOpen, setNavOpen] = useState(false);
  const [mobileView, setMobileView] = useState('list');
  const [listCollapsed, setListCollapsed] = useState(false);

  const msgsCache = useRef({});
  const threadsRef = useRef([]);
  const activeIdRef = useRef(null);
  const convsRef = useRef([]);
  const hasMoreRef = useRef({});
  const [olderLoading, setOlderLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [offline, setOffline] = useState(() => typeof navigator !== 'undefined' && navigator.onLine === false);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  useEffect(() => {
    threadsRef.current = threads;
  }, [threads]);

  const buildThread = (conv, msgs) => {
    const list = msgs || msgsCache.current[conv.id] || [];
    const number = conv.contact_number || conv.contactNumber || '';
    return {
      id: conv.id,
      name: conv.contact_name || conv.name || number,
      contactNumber: number,
      numberId: conv.number_id || conv.numberId,
      assignedNumber: conv.assigned_number || conv.assignedNumber,
      preview: conv.last_message || (list.length ? list[list.length - 1].body : ''),
      time: formatTime(conv.last_message_at || conv.updated_at || conv.time),
      unread: conv.unread_count || conv.unread || 0,
      lastDirection: list.length ? list[list.length - 1].direction : 'in',
      messages: list,
    };
  };

  const refreshConversations = async () => {
    try {
      const { data } = await getConversations();
      convsRef.current = data.conversations;
      setThreads(data.conversations.map((c) => buildThread(c)));
      setThreadsError('');
    } catch {
      setThreadsError('failed');
    } finally {
      setThreadsLoading(false);
    }
  };

  const mergeLatestIntoCache = (id, mapped) => {
    const cur = msgsCache.current[id] || [];
    const freshIds = new Set(mapped.map((m) => m.id));
    const freshOutBodies = new Set(mapped.filter((m) => m.direction === 'out').map((m) => m.body));
    const older = cur.filter(
      (m) => !freshIds.has(m.id) && !(m.id.startsWith('tmp-') && freshOutBodies.has(m.body))
    );
    return [...older, ...mapped].sort((a, b) => ((a.ts || '') < (b.ts || '') ? -1 : 1));
  };

  const loadMessages = async (id, silent = false) => {
    if (!silent) setMessagesLoading(true);
    try {
      const { data } = await getConversationMessages(id, { limit: 100 });
      const mapped = (data.messages || []).map(mapMessage);
      hasMoreRef.current[id] = Boolean(data.hasMore);
      const merged = silent ? mergeLatestIntoCache(id, mapped) : mapped;
      msgsCache.current[id] = merged;
      if (id === activeIdRef.current) {
        setMessages(merged);
        setHasMore(Boolean(data.hasMore));
      }
      const conv = convsRef.current.find((c) => c.id === id);
      if (conv) setThreads((prev) => prev.map((t) => (t.id === id ? buildThread(conv, merged) : t)));
      setMessagesError('');
    } catch {
      setMessagesError('failed');
    } finally {
      if (!silent) setMessagesLoading(false);
    }
  };

  const loadOlderMessages = async (id) => {
    if (olderLoading || !hasMoreRef.current[id]) return;
    const cache = msgsCache.current[id] || [];
    const before = cache[0]?.ts;
    if (!before) return;
    setOlderLoading(true);
    try {
      const { data } = await getConversationMessages(id, { limit: 100, before });
      if (!data.messages.length) {
        hasMoreRef.current[id] = false;
        if (id === activeIdRef.current) setHasMore(false);
        return;
      }
      const mapped = (data.messages || []).map(mapMessage);
      const existing = new Set(msgsCache.current[id].map((m) => m.id));
      const older = mapped.filter((m) => !existing.has(m.id));
      const merged = [...older, ...msgsCache.current[id]].sort((a, b) => ((a.ts || '') < (b.ts || '') ? -1 : 1));
      msgsCache.current[id] = merged;
      hasMoreRef.current[id] = Boolean(data.hasMore);
      if (id === activeIdRef.current) {
        setMessages(merged);
        setHasMore(Boolean(data.hasMore));
      }
      setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, messages: merged } : t)));
    } catch {
      /* offline */
    } finally {
      setOlderLoading(false);
    }
  };

  useEffect(() => {
    refreshConversations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      refreshConversations();
      if (activeIdRef.current) loadMessages(activeIdRef.current, true);
    }, 15000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const findMsgInCache = (id) => {
    for (const convId of Object.keys(msgsCache.current)) {
      const idx = (msgsCache.current[convId] || []).findIndex((m) => m.id === id);
      if (idx !== -1) return { convId, idx };
    }
    return null;
  };

  const bumpThread = (id, patch) => {
    setThreads((prev) => {
      const list = prev.slice();
      const idx = list.findIndex((t) => t.id === id);
      if (idx === -1) return list;
      list[idx] = { ...list[idx], ...patch };
      if (idx === 0) return list;
      const [t] = list.splice(idx, 1);
      list.unshift(t);
      return list;
    });
  };

  const applyStatusPatch = (event) => {
    const { conversationId, message } = event;
    const found = findMsgInCache(message.id);
    if (!found) return;
    const { convId, idx } = found;
    const cur = (msgsCache.current[convId] || []).slice();
    cur[idx] = { ...cur[idx], ...message, time: cur[idx].time };
    msgsCache.current[convId] = cur;
    if (convId === activeIdRef.current) setMessages(cur);
    setThreads((prev) => prev.map((t) => (t.id === convId ? { ...t, messages: cur } : t)));
  };

  const applyCreatedMessage = (event) => {
    const { conversationId, message } = event;
    if (findMsgInCache(message.id)) return;
    const cur = (msgsCache.current[conversationId] || []).slice();
    const isOut = message.direction === 'out';

    if (isOut) {
      // Reconcile with an optimistic pending message (temp id or retry-in-flight)
      // that has the same body/media so realtime never duplicates our own sends.
      for (let i = cur.length - 1; i >= 0; i--) {
        const m = cur[i];
        if (m.status === 'pending' && m.body === message.body && (m.mediaUrl || null) === (message.media_url || null)) {
          cur[i] = { ...m, id: message.id, time: formatTime(message.created_at) };
          msgsCache.current[conversationId] = cur;
          if (conversationId === activeIdRef.current) setMessages(cur);
          bumpThread(conversationId, { messages: cur, preview: message.body || cur[i].body, lastDirection: 'out', time: 'Now' });
          return;
        }
      }
    }

    const mapped = {
      id: message.id,
      direction: message.direction,
      body: message.body,
      mediaUrl: message.media_url || null,
      status: message.status,
      error: message.error || '',
      time: formatTime(message.created_at || message.time),
    };
    const merged = [...cur, mapped];
    msgsCache.current[conversationId] = merged;
    if (conversationId === activeIdRef.current) setMessages(merged);
    bumpThread(conversationId, { messages: merged, preview: message.body || mapped.body, lastDirection: message.direction, time: 'Now' });
  };

  const applyInboundMessage = (event) => {
    const { conversationId, message } = event;
    if (findMsgInCache(message.id)) {
      if (conversationId !== activeIdRef.current) {
        bumpThread(conversationId, { unread: (threadsRef.current.find((t) => t.id === conversationId)?.unread || 0) + 1 });
      }
      return;
    }
    const cur = (msgsCache.current[conversationId] || []).slice();
    const mapped = {
      id: message.id,
      direction: 'in',
      body: message.body,
      mediaUrl: message.media_url || null,
      status: 'received',
      error: '',
      time: formatTime(message.created_at),
    };
    const merged = [...cur, mapped];
    msgsCache.current[conversationId] = merged;
    const isActive = conversationId === activeIdRef.current;
    if (isActive) setMessages(merged);
    bumpThread(conversationId, {
      messages: merged,
      preview: message.body || mapped.body,
      lastDirection: 'in',
      time: 'Now',
      unread: isActive ? 0 : (threadsRef.current.find((t) => t.id === conversationId)?.unread || 0) + 1,
    });
  };

  const handleRealtimeEvent = (event) => {
    if (!event || !event.type) return;
    if (event.type === 'message.new') applyInboundMessage(event);
    else if (event.type === 'message.created') applyCreatedMessage(event);
    else if (event.type === 'message.updated') applyStatusPatch(event);
    else if (event.type === 'message.deleted') applyDeletedMessage(event);
  };

  const removeMessage = (id) => {
    for (const convId of Object.keys(msgsCache.current)) {
      const idx = (msgsCache.current[convId] || []).findIndex((m) => m.id === id);
      if (idx !== -1) {
        const cur = msgsCache.current[convId].slice();
        cur.splice(idx, 1);
        msgsCache.current[convId] = cur;
        if (convId === activeIdRef.current) setMessages(cur);
        setThreads((prev) => prev.map((t) => (t.id === convId ? { ...t, messages: cur } : t)));
        return;
      }
    }
  };

  const applyDeletedMessage = (event) => {
    removeMessage(event.message?.id);
  };

  useEffect(() => {
    let es = null;
    let retryTimer = null;
    let stopped = false;

    const connect = () => {
      const token = localStorage.getItem('nexsms_access_token');
      if (!token || stopped) return;
      try {
        es = new EventSource(`/api/realtime/events?token=${encodeURIComponent(token)}`);
      } catch {
        retryTimer = setTimeout(connect, 5000);
        return;
      }
      es.onmessage = (e) => {
        try {
          handleRealtimeEvent(JSON.parse(e.data));
        } catch {
          /* malformed frame */
        }
      };
      es.onerror = () => {
        if (stopped) return;
        es.close();
        retryTimer = setTimeout(connect, 5000);
      };
    };

    connect();
    return () => {
      stopped = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (es) es.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    getMyNumbers()
      .then(({ data }) => {
        setNumbers(data.numbers);
        const savedId = localStorage.getItem('nexsms_last_from_number');
        const saved = data.numbers.find((n) => n.id === savedId);
        const first = [...data.numbers].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0];
        const chosen = saved || data.numbers.find((n) => n.primary_number) || first;
        if (chosen) {
          setFromNumber(chosen.number);
          setFromNumberId(chosen.id);
        }
      })
      .catch(() => {});
  }, []);

  const appendToConv = (id, msg) => {
    const cur = msgsCache.current[id] || [];
    msgsCache.current[id] = [...cur, msg];
    if (id === activeIdRef.current) setMessages(msgsCache.current[id]);
    setThreads((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              messages: msgsCache.current[id],
              preview: msg.body || (isZh ? '图片' : 'Photo'),
              time: 'Now',
              lastDirection: 'out',
            }
          : t
      )
    );
  };

  const patchMsg = (id, msgId, patch) => {
    const cur = (msgsCache.current[id] || []).map((m) => (m.id === msgId ? { ...m, ...patch } : m));
    msgsCache.current[id] = cur;
    if (id === activeIdRef.current) setMessages(cur);
    setThreads((prev) => prev.map((t) => (t.id === id ? { ...t, messages: cur } : t)));
  };

  const sendMessage = async (body, mediaUrl = null) => {
    const conv = threadsRef.current.find((t) => t.id === activeIdRef.current);
    if (!conv) return;
    const tmpId = `tmp-${Date.now()}`;
    appendToConv(conv.id, { id: tmpId, direction: 'out', body, mediaUrl, status: 'pending', error: '', time: 'Now' });
    try {
      const { data } = await sendSms({ to: conv.contactNumber, fromNumberId: conv.numberId, body, mediaUrl });
      patchMsg(conv.id, tmpId, { status: data.status || 'sent', id: data.messageId || tmpId });
      if (data.status === 'failed') toast(T('Message could not be sent', '消息发送失败'), 'error');
      else toast(T('Message sent', '消息已发送'), 'success');
    } catch {
      patchMsg(conv.id, tmpId, { status: 'failed', error: 'Failed to send' });
      toast(T('Message could not be sent', '消息发送失败'), 'error');
    }
    refreshConversations();
  };

  const retryMessage = async (msg) => {
    const conv = threadsRef.current.find((t) => t.id === activeIdRef.current);
    if (!conv) return;
    patchMsg(conv.id, msg.id, { status: 'pending', error: '' });
    try {
      const { data } = await sendSms({ to: conv.contactNumber, fromNumberId: conv.numberId, body: msg.body, mediaUrl: msg.mediaUrl });
      patchMsg(conv.id, msg.id, { status: data.status || 'sent', id: data.messageId || msg.id });
      if (data.status === 'failed') toast(T('Message could not be sent', '消息发送失败'), 'error');
      else toast(T('Message sent', '消息已发送'), 'success');
    } catch {
      patchMsg(conv.id, msg.id, { status: 'failed', error: 'Failed to send' });
      toast(T('Message could not be sent', '消息发送失败'), 'error');
    }
    refreshConversations();
  };

  const composeSend = async ({ recipients, body, mediaUrl }) => {
    const fId = fromNumberId || numbers.find((n) => n.primary_number)?.id || numbers[0]?.id;
    if (!fId) {
      setSenderSheetOpen(true);
      return;
    }
    const next = [...threadsRef.current];
    let failedCount = 0;
    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i];
      let data;
      let ok = false;
      try {
        ({ data } = await sendSms({ to: r, fromNumberId: fId, body, mediaUrl }));
        ok = true;
      } catch {
        data = {};
      }
      if (!ok || data.status === 'failed') failedCount++;
      const msg = {
        id: data.messageId || `tmp-${Date.now()}-${r}`,
        direction: 'out',
        body,
        mediaUrl,
        status: ok ? data.status || 'sent' : 'failed',
        error: ok ? '' : 'Failed to send',
        time: 'Now',
      };
      const idx = next.findIndex((t) => t.contactNumber === r);
      if (idx >= 0) {
        next[idx] = {
          ...next[idx],
          messages: [...next[idx].messages, msg],
          preview: body || (isZh ? '图片' : 'Photo'),
          time: 'Now',
          lastDirection: 'out',
        };
      } else {
        const nt = {
          id: `tmp-${Date.now()}-${r}`,
          name: r,
          contactNumber: r,
          numberId: fId,
          preview: body || (isZh ? '图片' : 'Photo'),
          time: 'Now',
          unread: 0,
          lastDirection: 'out',
          messages: [msg],
        };
        next.unshift(nt);
      }
      if (i === 0) {
        const target = next.find((t) => t.contactNumber === r);
        activeIdRef.current = target.id;
        msgsCache.current[target.id] = target.messages;
        setActiveId(target.id);
        setMessages(target.messages);
      }
    }
    threadsRef.current = next;
    setThreads(next);
    refreshConversations();
    setComposing(false);
    setDialInput('');
    setSearch('');
    setSearchInput('');
    if (failedCount === 0) {
      toast(T('Message sent', '消息已发送'), 'success');
    } else {
      toast(T('Some messages could not be sent', '部分消息发送失败'), 'error');
    }
    if (isMobile) {
      setMobileView('thread');
      setKeypadOpen(false);
    }
    setBnav('home');
  };

  const selectThread = (id) => {
    setActiveId(id);
    activeIdRef.current = id;
    setComposing(false);
    setMessagesError('');
    const cached = msgsCache.current[id];
    setMessages(cached || []);
    loadMessages(id, Boolean(cached));
    if (isMobile) {
      setMobileView('thread');
      setKeypadOpen(false);
    }
    setBnav('home');
    setDetailsOpen(false);
  };

  const openComposer = () => {
    if (!fromNumberId && !numbers.length) {
      setSenderSheetOpen(true);
      return;
    }
    setActiveId(null);
    activeIdRef.current = null;
    setComposing(true);
    setDialInput('');
    setSearch('');
    setSearchInput('');
    if (isMobile) setMobileView('thread');
    setBnav('home');
  };

  const startNewThread = (contact) => {
    if (!fromNumberId && !numbers.length) {
      setSenderSheetOpen(true);
      return;
    }
    setActiveId(null);
    activeIdRef.current = null;
    setComposing(true);
    setDialInput(contact || '');
    setSearch('');
    setSearchInput('');
    if (isMobile) {
      setMobileView('thread');
      setKeypadOpen(false);
    }
    setBnav('home');
  };

  const handleMobileBack = () => {
    if (mobileView === 'details') {
      setMobileView('thread');
      return;
    }
    setMobileView('list');
    setComposing(false);
    setKeypadOpen(false);
  };

  const openDetails = () => {
    if (isMobile) setMobileView('details');
    else {
      setKeypadOpen(false);
      setDetailsOpen((v) => !v);
    }
  };

  const selectSenderNumber = (n) => {
    setFromNumber(n.number);
    setFromNumberId(n.id);
    localStorage.setItem('nexsms_last_from_number', n.id);
    setSenderSheetOpen(false);
    toast(T('From number changed', '发送号码已更改'), 'success');
  };

  const handleFromNumberChange = (num) => {
    setFromNumber(num);
    const n = numbers.find((x) => x.number === num);
    if (n) {
      setFromNumberId(n.id);
      localStorage.setItem('nexsms_last_from_number', n.id);
    }
  };

  const onKey = (digit) => setDialInput((d) => d + digit);
  const onBackspace = () => setDialInput((d) => d.slice(0, -1));

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 120);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const listFilter = search.trim() || dialInput.trim();
  const filtered = threads.filter((th) =>
    ((th.name || '').toLowerCase().includes(listFilter.toLowerCase()) ||
      (th.preview || '').toLowerCase().includes(listFilter.toLowerCase()) ||
      (th.contactNumber || '').toLowerCase().includes(listFilter.toLowerCase()))
  );
  const matches = dialInput.trim()
    ? threads.filter((th) => (th.name || '').toLowerCase().includes(dialInput.toLowerCase()))
    : [];

  const active = threads.find((th) => th.id === activeId);
  const unreadTotal = threads.reduce((s, t) => s + (t.unread || 0), 0);

  const handleBnav = (key) => {
    setBnav(key);
    setNavOpen(false);
    if (key === 'home' || key === 'messages') {
      setTab('messages');
      setNav('messages');
      setMobileView('list');
      setComposing(false);
      setKeypadOpen(false);
    } else if (key === 'contacts') {
      setTab('messages');
      setNav('contacts');
      setMobileView('list');
      setComposing(false);
      setKeypadOpen(false);
    } else if (key === 'numbers') {
      setTab('numbers');
      setMobileView('list');
    } else if (key === 'settings') {
      setTab('messages');
      setMobileView('list');
      setSettingsOpen(true);
    }
  };

  const chatGridCls = [
    'chat-grid desktop-min-width flex flex-1 overflow-hidden relative',
    !isMobile && listCollapsed ? 'no-list' : '',
    !isMobile && !keypadOpen ? 'no-keypad' : '',
  ].filter(Boolean).join(' ');

  const renderChatArea = () => (
    <div className={chatGridCls}>
      {isMobile ? (
        navOpen && (
          <NavSidebar
            active={nav}
            onChange={(k) => {
              if (['billing', 'api', 'account'].includes(k)) setTab(k);
              else setNav(k);
              setNavOpen(false);
              setMobileView('list');
              setBnav('home');
            }}
            collapsed={false}
            drawer
            onClose={() => setNavOpen(false)}
            extraItems={[
              { key: 'numbers', label: 'Numbers', zh: '号码' },
              { key: 'billing', label: 'Billing', zh: '账单' },
              { key: 'api', label: 'API', zh: 'API' },
              { key: 'account', label: 'Account', zh: '账户' },
            ]}
          />
        )
      ) : (
        <NavSidebar active={nav} onChange={setNav} collapsed={navCollapsed} />
      )}
      {nav === 'messages' ? (
        isMobile || !listCollapsed ? (
          <ConversationList
            threads={filtered}
            activeId={activeId}
            onSelect={selectThread}
            onNew={openComposer}
            query={search}
            loading={threadsLoading}
            error={!!threadsError}
            onRetry={refreshConversations}
            onCollapse={() => setListCollapsed(true)}
            hidden={isMobile && mobileView === 'thread'}
          />
        ) : (
          <div className="w-11 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-start justify-center py-4 animate-fade">
            <button
              onClick={() => setListCollapsed(false)}
              title={T('Show conversations', '显示对话')}
              aria-label={T('Show conversations', '显示对话')}
              className="text-lg text-slate-400 hover:text-slate-600 transition leading-none"
            >
              ≡
            </button>
          </div>
        )
      ) : nav === 'calls' ? (
        <CallsPanel onPick={(name) => { setDialInput(name); setNav('messages'); startNewThread(name); }} hidden={isMobile && mobileView === 'thread'} />
      ) : nav === 'contacts' ? (
        <ContactsPanel threads={threads} onSelect={selectThread} hidden={isMobile && mobileView === 'thread'} />
      ) : (
        <EmptyListPanel kind={nav} hidden={isMobile && mobileView === 'thread'} />
      )}
      {nav === 'messages' ? (
        <ConversationView
          thread={active}
          onSend={sendMessage}
          onRetry={retryMessage}
          onComposeSend={composeSend}
          contacts={threads}
          onPickContact={selectThread}
          dialInput={dialInput}
          onDialChange={setDialInput}
          fromNumber={fromNumber}
          composing={composing}
          onCloseComposer={() => setComposing(false)}
          onMobileBack={handleMobileBack}
          onOpenDetails={openDetails}
          onPickSender={() => setSenderSheetOpen(true)}
          hasMore={hasMore}
          olderLoading={olderLoading}
          onLoadOlder={loadOlderMessages}
          messagesLoading={messagesLoading}
          messagesError={!!messagesError}
          onRetryMessages={() => activeId && loadMessages(activeId)}
          onDeleteMessage={removeMessage}
          hidden={isMobile && mobileView === 'list'}
        />
      ) : (
        <div className="flex-1 flex items-center justify-center bg-slate-50 dark:bg-slate-950 text-sm text-slate-400 min-w-0 hidden md:flex">
          {nav === 'calls' ? T('Call history', '通话记录') : nav === 'contacts' ? T('Contacts', '联系人') : ''}
        </div>
      )}
      {nav === 'messages' && active && detailsOpen && (
        <ContactDetailsPanel
          thread={active}
          fromNumber={fromNumber}
          assignedNumber={active.assignedNumber}
          onBack={handleMobileBack}
          onMessage={() => setDetailsOpen(false)}
          onClose={() => setDetailsOpen(false)}
        />
      )}
      <KeypadPanel
        open={keypadOpen}
        onToggle={() => setKeypadOpen((v) => !v)}
        fromNumber={fromNumber}
        numbers={numbers}
        onFromNumberChange={handleFromNumberChange}
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
      {isMobile && !keypadOpen && nav === 'messages' && mobileView !== 'details' && (
        <button
          onClick={() => setKeypadOpen(true)}
          className="absolute bottom-24 right-4 w-14 h-14 rounded-full bg-primary text-white shadow-xl flex items-center justify-center transition active:scale-95 z-30"
          title={T('Dial pad', '拨号盘')}
          aria-label={T('Dial pad', '拨号盘')}
        >
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.61 21 3 13.39 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.24.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2z" />
          </svg>
        </button>
      )}
    </div>
  );

  return (
    <div className="app-shell bg-white dark:bg-slate-900">
      <header className="desktop-min-width h-14 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 px-3 bg-white dark:bg-slate-900 shrink-0 min-w-0">
        <button
          onClick={() => (isMobile ? setNavOpen(true) : setNavCollapsed((v) => !v))}
          className="w-11 h-11 md:w-9 md:h-9 shrink-0 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-lg transition"
          title="Menu"
          aria-label="Menu"
        >
          ≡
        </button>
        <span className="w-7 h-7 shrink-0 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold text-sm">N</span>
        <span className="font-semibold text-slate-900 dark:text-white hidden md:block">{theme.siteName}</span>

        <div className="flex-1 flex justify-center px-2 min-w-0">
          <button
            onClick={() => {
              setSearchInput(search);
              setSearchOpen(true);
            }}
            className="md:hidden w-11 h-11 shrink-0 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition"
            title={T('Search', '搜索')}
            aria-label={T('Search', '搜索')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </button>
          <div className="hidden md:flex w-full max-w-xl items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 focus-within:bg-white dark:focus-within:bg-slate-800 focus-within:ring-2 focus-within:ring-primary/40 border border-transparent focus-within:border-primary transition">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 shrink-0">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={T('Search conversations', '搜索对话')}
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-slate-100 min-w-0"
            />
            {searchInput !== search && (
              <span className="block w-3.5 h-3.5 border-2 border-slate-300 dark:border-slate-600 border-t-primary rounded-full animate-spin shrink-0" aria-label={T('Searching', '搜索中')} />
            )}
            {searchInput && (
              <button
                onClick={() => {
                  setSearchInput('');
                  setSearch('');
                }}
                className="w-6 h-6 shrink-0 rounded-full text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition"
                title={T('Clear', '清除')}
                aria-label={T('Clear search', '清除搜索')}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <span className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
            {T('Receiving calls', '正在接听来电')}
          </span>
          <button
            onClick={() => setTab('billing')}
            className="hidden sm:block px-4 py-1.5 rounded-full bg-primary text-white text-sm font-medium hover:opacity-90 transition"
          >
            {T('Upgrade', '升级')}
          </button>
          <span className="hidden md:block text-sm font-semibold text-slate-700 dark:text-slate-300">${Number(user?.balance || 0).toFixed(2)}</span>
          <button
            onClick={() => setDark((v) => !v)}
            className="w-11 h-11 md:w-9 md:h-9 shrink-0 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition"
            title={dark ? T('Light mode', '浅色模式') : T('Dark mode', '深色模式')}
            aria-label={dark ? T('Light mode', '浅色模式') : T('Dark mode', '深色模式')}
          >
            {dark ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" />
                <line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" />
                <line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
          <button
            onClick={() => {
              setTab('messages');
              setSettingsOpen(true);
            }}
            className="w-11 h-11 md:w-9 md:h-9 shrink-0 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center transition"
            title={T('Settings', '设置')}
            aria-label={T('Settings', '设置')}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
          {user?.role === 'admin' && (
            <a
              href="/admin"
              className="px-3 min-h-11 flex items-center text-sm rounded-lg border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition"
            >
              Admin
            </a>
          )}
          <ProfileMenu />
        </div>
      </header>

      {offline && (
        <div
          role="status"
          data-testid="offline-banner"
          className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-b border-amber-200 dark:border-amber-800 shrink-0"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.58 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
          {T("You're offline", '当前离线')}
          <span className="opacity-80">·</span>
          <span className="opacity-90">{T('messages will be sent once back online', '恢复联网后消息将自动发送')}</span>
        </div>
      )}

      <div className="desktop-min-width hidden md:flex h-11 border-b border-slate-200 dark:border-slate-800 items-center px-4 gap-1 bg-white dark:bg-slate-900 overflow-x-auto no-scrollbar shrink-0 min-w-0">
        {['messages', 'numbers', 'billing', 'api', 'account'].map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`h-full px-4 text-sm font-medium rounded-lg transition relative shrink-0 whitespace-nowrap flex items-center ${
              tab === key ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
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
            className="ml-auto shrink-0 px-3 min-h-11 flex items-center text-sm font-medium rounded-lg border border-slate-200 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition"
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

      {isMobile && !settingsOpen && !keypadOpen && mobileView === 'list' && (
        <MobileBottomNav active={bnav} onChange={handleBnav} unreadTotal={unreadTotal} />
      )}

      <SenderNumberSheet
        open={senderSheetOpen}
        numbers={numbers}
        fromNumber={fromNumber}
        onClose={() => setSenderSheetOpen(false)}
        onSelect={selectSenderNumber}
      />

      <MobileSearchOverlay
        open={searchOpen}
        query={searchInput}
        onQueryChange={setSearchInput}
        threads={filtered}
        onSelect={selectThread}
        onClose={() => setSearchOpen(false)}
      />

      {isMobile && mobileView === 'details' && active && (
        <ContactDetailsPanel
          thread={active}
          fromNumber={fromNumber}
          assignedNumber={active.assignedNumber}
          onBack={handleMobileBack}
          onMessage={() => setMobileView('thread')}
          mobile
          onClose={() => setMobileView('thread')}
        />
      )}

      {blastOpen && <BlastModal onClose={() => setBlastOpen(false)} />}
    </div>
  );
}
