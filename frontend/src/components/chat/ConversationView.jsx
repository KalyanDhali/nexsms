import { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { useLanguage } from '../../context/LanguageContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { uploadSmsImage, getMessageDetails, deleteMessage } from '../../services/api.js';

import BottomSheet from './BottomSheet.jsx';
import ImageLightbox from './ImageLightbox.jsx';
import EmojiPicker from './EmojiPicker.jsx';
import Avatar from './Avatar.jsx';

const MAX_RECIPIENTS = 5;
const MAX_COMPOSE_HEIGHT = 120;
const BOTTOM_THRESHOLD = 80;

const STATUS_LABEL = {
  pending: ['Sending…', '发送中…'],
  sent: ['Sent', '已发送'],
  delivered: ['Delivered', '已送达'],
  received: ['Received', '已收到'],
  read: ['Read', '已读'],
  scheduled: ['Scheduled', '已定时'],
  failed: ['Failed', '发送失败'],
  cancelled: ['Cancelled', '已取消'],
};

export default function ConversationView({
  thread,
  onSend,
  onRetry,
  onComposeSend,
  contacts,
  onPickContact,
  dialInput,
  onDialChange,
  fromNumber,
  composing,
  onCloseComposer,
  onMobileBack,
  onOpenDetails,
  onPickSender,
  hasMore,
  olderLoading,
  onLoadOlder,
  messagesLoading,
  messagesError = false,
  onRetryMessages,
  onDeleteMessage,
  hidden,
  isMobile = false,
}) {
  const { t, lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);
  const toast = useToast();
  const [draft, setDraft] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [pendingUrl, setPendingUrl] = useState('');
  const draftRef = useRef('');
  const draftKeyRef = useRef(null);
  const [attachOpen, setAttachOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [sending, setSending] = useState(false);
  const [recipients, setRecipients] = useState([]);
  const [toFocused, setToFocused] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [kbInset, setKbInset] = useState(0);

  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (!vv) return;
    const update = () => {
      const lh = window.innerHeight || vv.height;
      const inset = Math.max(0, lh - vv.height);
      setKbInset(inset > 80 ? inset : 0);
    };
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    window.addEventListener('resize', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    update();
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
    };
  }, []);

  useEffect(() => {
    if (kbInset > 0) {
      composerRef.current?.scrollIntoView({ block: 'end' });
      if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [kbInset]);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [showNewChip, setShowNewChip] = useState(false);
  const [actionsFor, setActionsFor] = useState(null);
  const [detailsFor, setDetailsFor] = useState(null);
  const [detailsData, setDetailsData] = useState(null);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const fileInputRef = useRef(null);
  const composerRef = useRef(null);
  const emojiRef = useRef(null);
  const textareaRef = useRef(null);
  const scrollRef = useRef(null);
  const stickRef = useRef(true);
  const prevHeightRef = useRef(0);
  const prevLenRef = useRef(0);
  const prevThreadIdRef = useRef(null);
  const unseenRef = useRef(0);
  const loadingOlderRef = useRef(false);
  const pressTimer = useRef(null);
  const longPressedRef = useRef(false);

  useEffect(() => {
    if (!composing) setRecipients([]);
  }, [composing]);

  useEffect(() => {
    if (hidden) {
      setSending(false);
      setUploading(false);
      setEmojiOpen(false);
      setAttachOpen(false);
    }
  }, [hidden]);

  const draftKey = thread ? `nexsms_draft_thread_${thread.id}` : composing ? 'nexsms_draft_compose' : null;

  useEffect(() => {
    const prev = draftKeyRef.current;
    if (prev && prev !== draftKey) {
      try {
        if (draftRef.current) localStorage.setItem(prev, draftRef.current);
        else localStorage.removeItem(prev);
      } catch {
        /* storage unavailable */
      }
    }
    draftKeyRef.current = draftKey;
    if (!draftKey) return;
    let saved = '';
    try {
      saved = localStorage.getItem(draftKey) || '';
    } catch {
      /* storage unavailable */
    }
    setDraft(saved);
    setMediaUrl('');
    if (pendingUrl) URL.revokeObjectURL(pendingUrl);
    setPendingUrl('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  useEffect(() => {
    draftRef.current = draft;
    if (!draftKey) return;
    if (!draft) {
      try {
        localStorage.removeItem(draftKey);
      } catch {
        /* storage unavailable */
      }
      return;
    }
    const t = setTimeout(() => {
      try {
        localStorage.setItem(draftKey, draft);
      } catch {
        /* storage unavailable */
      }
    }, 300);
    return () => clearTimeout(t);
  }, [draft, draftKey]);

  useEffect(() => {
    if (!composing) return;
    const handler = (e) => {
      if (e.target.closest('[role="dialog"]')) return;
      if (composerRef.current && !composerRef.current.contains(e.target)) {
        onCloseComposer();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [composing, onCloseComposer]);

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

  const openActions = (msg) => {
    setDeleteArmed(false);
    setActionsFor(msg);
  };

  const closeActions = () => {
    setDeleteArmed(false);
    setActionsFor(null);
  };

  const copyMessage = async (msg) => {
    const text = msg.body || '';
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      toast(T('Copied', '已复制'), 'success');
    } catch {
      toast(T('Copy failed', '复制失败'), 'error');
    }
    closeActions();
  };

  const openDetails = async (msg) => {
    setDetailsFor(msg);
    setDetailsData(null);
    closeActions();
    try {
      const { data } = await getMessageDetails(msg.id);
      setDetailsData(data.message);
    } catch {
      setDetailsData({ loadError: true });
    }
  };

  const doDelete = async (msg) => {
    if (!deleteArmed) {
      setDeleteArmed(true);
      return;
    }
    try {
      await deleteMessage(msg.id);
      if (onDeleteMessage) onDeleteMessage(msg.id);
      toast(T('Message deleted', '消息已删除'), 'success');
    } catch {
      toast(T('Delete failed', '删除失败'), 'error');
    }
    setDeleteArmed(false);
    setActionsFor(null);
  };

  const bubbleTouchProps = (msg) => ({
    onContextMenu: (e) => {
      e.preventDefault();
      openActions(msg);
    },
    onTouchStart: () => {
      longPressedRef.current = false;
      pressTimer.current = setTimeout(() => {
        longPressedRef.current = true;
        openActions(msg);
      }, 480);
    },
    onTouchMove: () => clearTimeout(pressTimer.current),
    onTouchEnd: () => clearTimeout(pressTimer.current),
  });

  const autosize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, MAX_COMPOSE_HEIGHT) + 'px';
  };

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const threadChanged = prevThreadIdRef.current !== thread?.id;
    const prevHeight = prevHeightRef.current;
    const prevLen = prevLenRef.current;
    const curLen = thread?.messages?.length || 0;
    prevHeightRef.current = el.scrollHeight;
    prevLenRef.current = curLen;

    if (threadChanged) {
      prevThreadIdRef.current = thread?.id;
      stickRef.current = true;
      unseenRef.current = 0;
      setShowNewChip(false);
      el.scrollTop = el.scrollHeight;
      return;
    }

    if (stickRef.current) {
      if (el.scrollHeight > prevHeight || curLen > prevLen) el.scrollTop = el.scrollHeight;
    } else if (prevHeight > 0) {
      // Preserve scroll position when older messages are prepended
      el.scrollTop += el.scrollHeight - prevHeight;
      if (curLen > prevLen) {
        unseenRef.current += curLen - prevLen;
        setShowNewChip(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread?.messages?.length, thread?.id]);

  useEffect(() => {
    if (!olderLoading) loadingOlderRef.current = false;
  }, [olderLoading]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD;
    stickRef.current = nearBottom;
    if (nearBottom && unseenRef.current > 0) {
      unseenRef.current = 0;
      setShowNewChip(false);
    }
    if (el.scrollTop < 40 && hasMore && !olderLoading && !loadingOlderRef.current) {
      loadingOlderRef.current = true;
      onLoadOlder && onLoadOlder(thread?.id);
    }
  };

  const goToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    stickRef.current = true;
    unseenRef.current = 0;
    setShowNewChip(false);
    el.scrollTop = el.scrollHeight;
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
  const typedDigits = digits(dialInput);
  const contactMatches =
    typedDigits.length >= 7
      ? (contacts || []).filter(
          (th) =>
            digits(th.contactNumber || th.name) === typedDigits &&
            !recipients.some((r) => digits(r) === typedDigits)
        )
      : [];
  const fullNumber =
    recipients.length < MAX_RECIPIENTS &&
    /^[0-9+()\s-]{7,}$/.test(dialInput.trim()) &&
    !recipients.some((r) => digits(r) === digits(dialInput)) &&
    contactMatches.length === 0;

  const pickFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setUploadError(T('Image must be 8 MB or smaller', '图片不能超过 8 MB'));
      return;
    }
    if (pendingUrl) URL.revokeObjectURL(pendingUrl);
    const url = URL.createObjectURL(file);
    setPendingUrl(url);
    const reader = new FileReader();
    reader.onload = async () => {
      setUploading(true);
      setUploadError('');
      try {
        const { data } = await uploadSmsImage({ filename: file.name, data: reader.result });
        URL.revokeObjectURL(url);
        setPendingUrl('');
        setMediaUrl(data.url);
      } catch {
        setUploadError(T('Upload failed. Please try again', '上传失败，请重试'));
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
    if (pendingUrl) URL.revokeObjectURL(pendingUrl);
    setPendingUrl('');
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
    if (pendingUrl) URL.revokeObjectURL(pendingUrl);
    setPendingUrl('');
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
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          openActions(msg);
        }}
        className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-black/10 dark:hover:bg-white/10 transition -mr-1"
        title={T('More options', '更多选项')}
        aria-label={T('More options', '更多选项')}
      >
        <svg viewBox="0 0 24 24" className="w-3 h-3" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.7" />
          <circle cx="12" cy="12" r="1.7" />
          <circle cx="12" cy="19" r="1.7" />
        </svg>
      </button>
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
        <div className={`flex ${isOut ? 'justify-end' : 'justify-start'}`} data-testid="message-bubble" {...bubbleTouchProps(msg)}>
          <div className="max-w-[78%] sm:max-w-[70%]">
            <div className="relative inline-block">
              <img
                src={msg.mediaUrl}
                alt=""
                loading="lazy"
                decoding="async"
                onClick={() => {
                  if (longPressedRef.current) {
                    longPressedRef.current = false;
                    return;
                  }
                  setLightbox(msg.mediaUrl);
                }}
                className={`rounded-2xl max-w-[240px] max-h-60 object-cover shadow cursor-zoom-in transition hover:opacity-90 ${isOut ? '' : 'border border-slate-200 dark:border-slate-700'}`}
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openActions(msg);
                }}
                className="absolute top-1.5 right-1.5 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition"
                title={T('More options', '更多选项')}
                aria-label={T('More options', '更多选项')}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  <circle cx="12" cy="5" r="1.8" />
                  <circle cx="12" cy="12" r="1.8" />
                  <circle cx="12" cy="19" r="1.8" />
                </svg>
              </button>
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
      <div className={`flex ${isOut ? 'justify-end' : 'justify-start'}`} data-testid="message-bubble" {...bubbleTouchProps(msg)}>
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
          {isOut && msg.status === 'failed' && (
            <div className="mt-1.5 text-[10px] leading-tight text-rose-500 dark:text-rose-400 truncate max-w-[220px]">
              {T('Send failed', '发送失败')}
            </div>
          )}
        </div>
      </div>
    );
  };

  const composerBar = (onSubmit, type) => (
    <form
      onSubmit={onSubmit}
      className="border-t border-slate-200 dark:border-slate-800 px-2 sm:px-3 pt-2 bg-white dark:bg-slate-900 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
    >
      {(mediaUrl || pendingUrl) && (
        <div className="mb-2 flex items-center gap-2">
          <div className="relative shrink-0">
            <img
              src={pendingUrl || mediaUrl}
              alt=""
              className={`w-20 h-20 rounded-lg border object-cover shadow-sm ${
                pendingUrl && !mediaUrl && uploadError
                  ? 'border-rose-400 dark:border-rose-600'
                  : 'border-slate-200 dark:border-slate-700'
              } ${pendingUrl && !mediaUrl && !uploadError ? 'opacity-60' : ''}`}
            />
            {uploading && (
              <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/30">
                <span className="block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-label={T('Uploading', '上传中')} />
              </span>
            )}
            {pendingUrl && !mediaUrl && !uploading && (
              <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/30 text-[10px] font-semibold text-white">
                {T('Failed', '失败')}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                if (pendingUrl) URL.revokeObjectURL(pendingUrl);
                setPendingUrl('');
                setMediaUrl('');
                setUploadError('');
              }}
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
      <div className="flex items-end gap-1.5">
        <div className="relative shrink-0 self-end">
          <button
            type="button"
            onClick={() => {
              setAttachOpen(true);
              setEmojiOpen(false);
            }}
            className="w-11 h-11 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 transition"
            title={T('Attach', '添加附件')}
            aria-label={T('Attach', '添加附件')}
          >
            {uploading ? (
              <span className="block w-4 h-4 border-2 border-slate-400 border-t-primary rounded-full animate-spin" />
            ) : (
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
              </svg>
            )}
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={pickFile} />

        <div className="flex-1 min-w-0 flex flex-col bg-slate-100 dark:bg-slate-800 rounded-3xl px-4 pt-2.5 pb-1 border border-slate-200 dark:border-slate-700 no-focus-ring">
          <textarea
            ref={textareaRef}
            rows={1}
            value={draft}
            autoFocus={type === 'compose'}
            enterKeyHint="send"
            onChange={(e) => {
              setDraft(e.target.value);
              autosize();
            }}
            onFocus={() => composerRef.current?.scrollIntoView({ block: 'end' })}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder={t('chat.typeMessage')}
            className="flex-1 min-w-0 bg-transparent outline-none text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 resize-none leading-5 max-h-[120px] py-0.5"
          />
          <div className="flex items-center justify-end h-4">
            {draft.length > 0 && (
              <span className={`text-[10px] leading-none ${draft.length > 160 ? 'text-amber-500 dark:text-amber-400' : 'text-slate-400 dark:text-slate-500'}`}>
                {draft.length}
              </span>
            )}
          </div>
        </div>

        <div className="relative shrink-0 self-end" ref={emojiRef}>
          <button
            type="button"
            onClick={() => {
              setEmojiOpen((v) => !v);
              setAttachOpen(false);
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
          className={`w-11 h-11 rounded-full flex items-center justify-center transition shrink-0 self-end ${
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
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13" />
              <path d="M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          )}
        </button>
      </div>
    </form>
  );

  return (
    <div className="chat-middle flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 min-w-0" data-testid="conversation-view" style={hidden ? { display: 'none' } : undefined}>
      {!thread && composing ? (
        <div ref={composerRef} className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900">
          <div className="relative border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center flex-wrap">
            {onMobileBack && isMobile && (
              <button
                type="button"
                onClick={() => onMobileBack && onMobileBack()}
                className="w-11 h-11 shrink-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center transition mr-1"
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
              value={dialInput}
              onChange={(e) => onDialChange(e.target.value)}
              onFocus={() => setToFocused(true)}
              onBlur={() => setTimeout(() => setToFocused(false), 120)}
              placeholder={T('Type a name or phone number', '输入姓名或电话号码')}
              className="flex-1 min-w-[160px] py-2 text-sm outline-none text-slate-800 dark:text-slate-100 bg-transparent placeholder-slate-400 dark:placeholder-slate-500"
            />

            {(toFocused || dialInput.trim()) && (
              <div className="absolute top-full left-4 mt-1 w-72 max-w-[calc(100%-2rem)] bg-white dark:bg-slate-800 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 z-10 overflow-hidden">
                {contactMatches.length > 0 ? (
                  contactMatches.map((cm) => (
                    <button
                      key={cm.id}
                      type="button"
                      onClick={() => onPickContact && onPickContact(cm.id)}
                      className="w-full px-4 py-3 text-left text-sm text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition flex items-center gap-2"
                    >
                      <span className="w-7 h-7 shrink-0 rounded-full bg-primary/10 text-primary font-semibold flex items-center justify-center text-xs">
                        {(cm.name || cm.contactNumber || '?').slice(0, 1).toUpperCase()}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{cm.name || cm.contactNumber}</span>
                        {cm.contactNumber && <span className="block text-xs text-slate-400 dark:text-slate-500 truncate">{cm.contactNumber}</span>}
                      </span>
                    </button>
                  ))
                ) : fullNumber ? (
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
          {kbInset > 0 && <div className="w-full shrink-0" style={{ height: kbInset }} data-testid="kb-spacer" />}
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
            {onMobileBack && isMobile && (
              <button
                onClick={() => onMobileBack && onMobileBack()}
                className="w-11 h-11 shrink-0 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center transition"
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
            {!isMobile && (
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
            )}
          </div>

          <div className="relative flex-1 min-h-0 flex flex-col">
            <div
              ref={scrollRef}
              onScroll={handleScroll}
              data-testid="thread-scroll"
              className="chat-messages-area flex-1 overflow-y-auto px-4 sm:px-6 py-5 space-y-3 bg-slate-50 dark:bg-slate-950 overscroll-contain"
            >
              {olderLoading && (
                <div className="flex justify-center py-2" aria-live="polite">
                  <span className="block w-5 h-5 border-2 border-slate-300 dark:border-slate-600 border-t-primary rounded-full animate-spin" />
                </div>
              )}
              {!olderLoading && hasMore && thread.messages.length > 0 && (
                <button
                  type="button"
                  onClick={() => onLoadOlder && onLoadOlder(thread.id)}
                  className="mx-auto block text-xs text-primary dark:text-indigo-300 hover:underline py-1"
                >
                  {T('Load older messages', '加载更早的消息')}
                </button>
              )}
              {messagesLoading && thread.messages.length === 0 ? (
                <div className="space-y-3 pt-4" aria-label="Loading messages" aria-busy="true">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className={`flex ${i % 2 ? 'justify-start' : 'justify-end'}`}>
                      <div className="h-10 w-40 rounded-2xl bg-slate-200 dark:bg-slate-800 animate-pulse" />
                    </div>
                  ))}
                </div>
              ) : (
                thread.messages.map((msg) => (
                  <div key={msg.id}>{renderBubble(msg)}</div>
                ))
              )}
              {messagesError && !messagesLoading && (
                <div className="flex flex-col items-center gap-3 py-10 px-6 text-center" data-testid="messages-error">
                  <svg viewBox="0 0 24 24" className="w-9 h-9 text-slate-300 dark:text-slate-700" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                    <path d="M12 9v4m0 4h.01" />
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  </svg>
                  <p className="text-sm text-slate-400 dark:text-slate-500">{T('Could not load messages', '无法加载消息')}</p>
                  {onRetryMessages && (
                    <button
                      type="button"
                      onClick={onRetryMessages}
                      className="min-h-11 px-5 rounded-full bg-primary text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition flex items-center gap-2"
                    >
                      <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="23 4 23 10 17 10" />
                        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                      </svg>
                      {T('Try again', '重试')}
                    </button>
                  )}
                </div>
              )}
              {!messagesLoading && !messagesError && thread.messages.length === 0 && (
                <div className="text-center text-sm text-slate-400 dark:text-slate-500 pt-20">
                  {T('Say hello to', '打个招呼给')} {thread.name}
                </div>
              )}
            </div>
            {showNewChip && (
              <button
                type="button"
                onClick={goToBottom}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 h-9 rounded-full bg-slate-900/90 dark:bg-white/90 text-white dark:text-slate-900 text-xs font-semibold shadow-lg transition hover:bg-slate-800 dark:hover:bg-white"
                aria-label={T('New messages', '新消息')}
              >
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9" />
                </svg>
                {T('New messages', '新消息')}
              </button>
            )}
          </div>

          {composerBar(submitDraft, 'draft')}
          {kbInset > 0 && <div className="w-full shrink-0" style={{ height: kbInset }} data-testid="kb-spacer" />}
        </>
      )}

      {lightbox && <ImageLightbox src={lightbox} onClose={() => setLightbox(null)} />}

      <BottomSheet open={!!actionsFor} onClose={closeActions} ariaLabel={T('Message actions', '消息操作')}>
        {actionsFor && (
          <div className="py-1" data-testid="message-actions">
            {actionsFor.mediaUrl && (
              <button
                type="button"
                onClick={() => {
                  handleSave(actionsFor.mediaUrl);
                  closeActions();
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition min-h-11"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                {T('Save image', '保存图片')}
              </button>
            )}
            <button
              type="button"
              onClick={() => copyMessage(actionsFor)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition min-h-11"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              {T('Copy', '复制')}
            </button>
            {actionsFor.direction === 'out' && actionsFor.status === 'failed' && onRetry && (
              <button
                type="button"
                onClick={() => {
                  onRetry(actionsFor);
                  closeActions();
                }}
                className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition min-h-11"
              >
                <svg viewBox="0 0 24 24" className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
                {T('Retry', '重试')}
              </button>
            )}
            <button
              type="button"
              onClick={() => openDetails(actionsFor)}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition min-h-11"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-slate-500 dark:text-slate-400 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              {T('Details', '详情')}
            </button>
            <button
              type="button"
              onClick={() => doDelete(actionsFor)}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm transition min-h-11 ${
                deleteArmed
                  ? 'bg-rose-600 text-white font-semibold'
                  : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
              }`}
            >
              <svg viewBox="0 0 24 24" className={`w-5 h-5 shrink-0 ${deleteArmed ? 'text-white' : 'text-rose-500 dark:text-rose-400'}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
              {deleteArmed ? T('Tap again to confirm', '再次点击确认删除') : T('Delete', '删除')}
            </button>
          </div>
        )}
      </BottomSheet>

      <BottomSheet
        open={!!detailsFor}
        onClose={() => setDetailsFor(null)}
        title={T('Message details', '消息详情')}
        ariaLabel={T('Message details', '消息详情')}
      >
        {detailsFor &&
          (detailsData?.loadError ? (
            <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">
              {T('Could not load details', '无法加载详情')}
            </div>
          ) : !detailsData ? (
            <div className="flex justify-center py-8">
              <span className="block w-6 h-6 border-2 border-slate-300 dark:border-slate-600 border-t-primary rounded-full animate-spin" />
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-sm" data-testid="message-details">
              <div className="flex items-center justify-between gap-4 py-3">
                <span className="text-slate-400 dark:text-slate-500">{T('Status', '状态')}</span>
                <span className="font-medium text-right">{T(...(STATUS_LABEL[detailsData.status] || ['—', '—']))}</span>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <span className="text-slate-400 dark:text-slate-500">{T('Time', '时间')}</span>
                <span className="font-medium text-right">
                  {detailsFor.ts ? new Date(detailsFor.ts).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : detailsFor.time}
                </span>
              </div>
              <div className="flex items-center justify-between gap-4 py-3">
                <span className="text-slate-400 dark:text-slate-500">{T('Direction', '方向')}</span>
                <span className="font-medium">{detailsFor.direction === 'out' ? T('Outgoing', '发出') : T('Incoming', '收到')}</span>
              </div>
              {detailsData.delivered_at && (
                <div className="flex items-center justify-between gap-4 py-3">
                  <span className="text-slate-400 dark:text-slate-500">{T('Delivered', '已送达')}</span>
                  <span className="font-medium">{new Date(detailsData.delivered_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
              )}
              {detailsData.cost != null && Number(detailsData.cost) > 0 && (
                <div className="flex items-center justify-between gap-4 py-3">
                  <span className="text-slate-400 dark:text-slate-500">{T('Cost', '费用')}</span>
                  <span className="font-medium">${Number(detailsData.cost).toFixed(4)}</span>
                </div>
              )}
              {detailsData.provider_name && (
                <div className="flex items-center justify-between gap-4 py-3">
                  <span className="text-slate-400 dark:text-slate-500">{T('Provider', '运营商')}</span>
                  <span className="font-medium text-right">{detailsData.provider_name}</span>
                </div>
              )}
              {detailsData.message_sid && (
                <div className="flex items-center justify-between gap-4 py-3">
                  <span className="text-slate-400 dark:text-slate-500">SID</span>
                  <span className="font-mono text-xs text-right break-all max-w-[60%]">{detailsData.message_sid}</span>
                </div>
              )}
            </div>
          ))}
      </BottomSheet>

      <BottomSheet open={attachOpen} onClose={() => setAttachOpen(false)} title={T('Add attachment', '添加附件')} ariaLabel={T('Add attachment', '添加附件')}>
        <button
          type="button"
          onClick={() => {
            setAttachOpen(false);
            fileInputRef.current?.click();
          }}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition text-left"
        >
          <span className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 text-lg">🖼</span>
          <span className="text-sm font-medium text-slate-900 dark:text-white">{T('Photos', '照片')}</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setAttachOpen(false);
            fileInputRef.current?.click();
          }}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 transition text-left"
        >
          <span className="w-11 h-11 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 text-lg">↑</span>
          <span className="text-sm font-medium text-slate-900 dark:text-white">{T('Upload', '上传')}</span>
        </button>
      </BottomSheet>
    </div>
  );
}
