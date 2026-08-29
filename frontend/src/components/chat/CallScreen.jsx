import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import Avatar from './Avatar.jsx';
import { startRingback, stopRingback, playConnectBeep, stopAllAudio } from '../../utils/callAudio.js';
import { IconMic, IconMute, IconSend, IconEndCall } from '../icons.jsx';

const GREETING = "Hello! You've reached the demo line. How are you today?";
const PROMPT = 'Are you still there?';
const REPLIES = [
  'That sounds great!',
  'Interesting, please go on.',
  'Got it, thanks for sharing.',
  'Haha, okay, understood.',
  'Sure, I will make a note of that.',
  'Nice to hear from you!',
];
const KEYWORD_REPLIES = [
  { re: /\b(hi|hello|hey|hola)\b/gi, reply: 'Hi there! How can I help you?' },
  { re: /\b(bye|goodbye|see you|later)\b/gi, reply: 'Goodbye! Thanks for calling.' },
  { re: /\b(price|cost|rate|pricing)\b/gi, reply: 'Check our pricing page for the latest rates.' },
  { re: /\b(help|support|assist)\b/gi, reply: 'Our support team will reach out shortly.' },
  { re: /\b(demo|test|sms|message)\b/gi, reply: 'Yes, this is the NexSMS demo line.' },
];

function pickReply(text) {
  for (const r of KEYWORD_REPLIES) {
    if (r.re.test(text || '')) return r.reply;
  }
  return REPLIES[Math.floor(Math.random() * REPLIES.length)];
}

export default function CallScreen({ call, fromNumber, onEnd }) {
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);
  const [muted, setMuted] = useState(false);
  const [transcript, setTranscript] = useState([]);
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const mutedRef = useRef(false);
  const transcriptRef = useRef([]);
  const greetedRef = useRef(false);
  const promptTimerRef = useRef(null);
  const recRef = useRef(null);
  const scrollRef = useRef(null);

  const addBubble = (side, text) => {
    const next = [...transcriptRef.current, { side, text, id: Date.now() + Math.random() }];
    transcriptRef.current = next;
    setTranscript(next);
  };

  const calleeSpeak = (text) => {
    addBubble('callee', text);
    if (mutedRef.current) return;
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = isZh ? 'zh-CN' : 'en-US';
      u.rate = 1;
      u.pitch = 1;
      window.speechSynthesis.speak(u);
    }
  };

  useEffect(() => {
    if (!call) return;
    if (call.status === 'calling') {
      if (muted) stopRingback();
      else startRingback();
    } else if (call.status === 'connected') {
      stopRingback();
      if (!muted) playConnectBeep();
    }
    return () => stopRingback();
  }, [call?.status, muted]);

  useEffect(() => {
    if (call?.status !== 'connected' || greetedRef.current) return;
    greetedRef.current = true;
    calleeSpeak(GREETING);
    promptTimerRef.current = setTimeout(() => {
      if (transcriptRef.current.length <= 1) calleeSpeak(PROMPT);
    }, 8000);
  }, [call?.status]);

  useEffect(() => {
    if (muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }, [muted]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [transcript]);

  useEffect(
    () => () => {
      if (promptTimerRef.current) clearTimeout(promptTimerRef.current);
      recRef.current?.stop?.();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
      stopAllAudio();
    },
    []
  );

  if (!call) return null;

  const connected = call.status === 'connected';
  const mm = String(Math.floor((call.seconds || 0) / 60)).padStart(2, '0');
  const ss = String((call.seconds || 0) % 60).padStart(2, '0');
  const hasSR = typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const setMutedBoth = (v) => {
    mutedRef.current = v;
    setMuted(v);
  };

  const sendMessage = () => {
    const text = input.trim();
    if (!text) return;
    addBubble('you', text);
    setInput('');
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel();
    const reply = pickReply(text);
    setTimeout(() => calleeSpeak(reply), 600);
  };

  const toggleMic = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (listening) {
      recRef.current?.stop();
      setListening(false);
      return;
    }
    const rec = new SR();
    rec.lang = isZh ? 'zh-CN' : 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onresult = (e) => {
      const text = e.results?.[0]?.[0]?.transcript?.trim();
      if (text) {
        addBubble('you', text);
        const reply = pickReply(text);
        setTimeout(() => calleeSpeak(reply), 600);
      }
      setListening(false);
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setListening(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex flex-col items-center bg-gradient-to-b from-slate-900 via-slate-800 to-slate-950 text-white"
      data-testid="call-screen"
    >
      {fromNumber ? (
        <div className="text-slate-400 text-xs mt-6">
          {T('Calling from', '从')} {fromNumber}
        </div>
      ) : (
        <div className="h-4 mt-6" />
      )}

      <div className="flex items-center gap-3 mt-4">
        <Avatar name={call.number} size={64} />
        <div className="text-left">
          <div className="text-2xl font-semibold tracking-wide">{call.number}</div>
          <div className="text-slate-400 text-sm">
            {connected ? `${T('Connected', '通话中')} · ${mm}:${ss}` : T('Calling…', '正在呼叫…')}
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="w-full max-w-sm flex-1 min-h-0 overflow-y-auto my-4 px-6 space-y-2"
        data-testid="call-transcript"
      >
        {transcript.map((b) => (
          <div key={b.id} className={`flex ${b.side === 'you' ? 'justify-end' : 'justify-start'}`}>
            <span
              className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                b.side === 'you'
                  ? 'bg-[#34c759] text-white rounded-br-md'
                  : 'bg-white/10 text-white rounded-bl-md'
              }`}
            >
              {b.text}
            </span>
          </div>
        ))}
        {transcript.length === 0 && (
          <div className="text-center text-xs text-slate-500 pt-4">{T('No speech yet…', '暂无语音…')}</div>
        )}
      </div>

      <div className="w-full max-w-sm px-6 flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder={connected ? T('Say something…', '说点什么…') : T('Wait for connection…', '等待接通…')}
          disabled={!connected}
          className="flex-1 min-w-0 h-11 px-4 rounded-full bg-white/10 text-white placeholder-slate-400 outline-none text-sm focus:bg-white/15 transition"
          data-testid="call-input"
        />
        {hasSR && (
          <button
            onClick={toggleMic}
            className={`w-11 h-11 shrink-0 rounded-full flex items-center justify-center transition ${
              listening ? 'bg-rose-500 text-white animate-pulse' : 'bg-white/10 text-slate-200 hover:bg-white/20'
            }`}
            title={listening ? T('Stop', '停止') : T('Talk', '说话')}
            aria-label={listening ? T('Stop', '停止') : T('Talk', '说话')}
            data-testid="call-mic"
          >
            <IconMic className="w-5 h-5" />
          </button>
        )}
        <button
          onClick={sendMessage}
          disabled={!connected || !input.trim()}
          className="w-11 h-11 shrink-0 rounded-full bg-gradient-to-br from-[#34c759] to-[#14b8a6] hover:opacity-90 disabled:opacity-40 flex items-center justify-center transition active:scale-95"
          title={T('Send', '发送')}
          aria-label={T('Send', '发送')}
          data-testid="call-send"
        >
          <IconSend className="w-5 h-5" strokeWidth={2} />
        </button>
      </div>

      <div className="flex items-center gap-6 mt-6">
        <button
          onClick={() => setMutedBoth(!muted)}
          className="w-14 h-14 rounded-full bg-white/10 hover:bg-white/20 flex flex-col items-center justify-center gap-1 transition active:scale-95"
          title={muted ? T('Unmute', '取消静音') : T('Mute', '静音')}
          aria-label={muted ? T('Unmute', '取消静音') : T('Mute', '静音')}
          data-testid="call-mute"
        >
          {muted ? <IconMute className="w-6 h-6" /> : <IconMic className="w-6 h-6" />}
          <span className="text-[10px]">{muted ? T('Muted', '已静音') : T('Mute', '静音')}</span>
        </button>

        <button
          onClick={onEnd}
          className="w-16 h-16 rounded-full bg-gradient-to-br from-rose-500 to-red-600 hover:opacity-90 text-white flex items-center justify-center shadow-lg transition active:scale-95"
          title={T('End call', '挂断')}
          aria-label={T('End call', '挂断')}
          data-testid="call-end"
        >
          <IconEndCall className="w-7 h-7" strokeWidth={2} />
        </button>
      </div>

      <div className="mt-5 mb-4 text-xs text-slate-500 flex items-center gap-2">
        <span>{T('Demo call', '演示通话')}</span>
        <span className="text-slate-600">·</span>
        <button
          onClick={() => {
            if (typeof window !== 'undefined') window.location.href = `tel:${call.number}`;
          }}
          className="text-slate-300 hover:text-white underline underline-offset-2 transition"
          title={T('Dial this number with the phone dialer', '用手机拨号器拨打此号码')}
          data-testid="call-dial-phone"
        >
          {T('Dial via phone', '用手机拨打')}
        </button>
      </div>
    </div>
  );
}
