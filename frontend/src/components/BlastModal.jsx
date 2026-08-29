import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getMyNumbers, sendBlast, sendSms, uploadSmsImage } from '../services/api.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function BlastModal({ onClose }) {
  const { theme } = useTheme();
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const T = (en, zh) => (isZh ? zh : en);

  const [numbers, setNumbers] = useState([]);
  const [fromNumberId, setFromNumberId] = useState('');
  const [recipients, setRecipients] = useState('');
  const [body, setBody] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  // Staggered (timer) mode
  const [delayNum, setDelayNum] = useState(0);
  const [delayUnit, setDelayUnit] = useState('s');
  const [progress, setProgress] = useState(null); // { sent, failed, total, statuses }
  const stopRef = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await getMyNumbers();
        setNumbers(data.numbers);
        if (data.numbers.length) setFromNumberId(data.numbers[0].id);
      } catch {
        setError(T('Failed to load your numbers', '加载号码失败'));
      }
    })();
  }, []);

  const delayMs = delayNum > 0 ? delayNum * (delayUnit === 'm' ? 60000 : 1000) : 0;

  const parseRecipients = () =>
    recipients.split(',').map((s) => s.trim()).filter(Boolean);

  const validate = () => {
    const to = parseRecipients();
    if (!to.length) return { err: T('Enter at least one recipient', '请至少输入一个收件人') };
    if (!body.trim()) return { err: T('Message body required', '需要消息内容') };
    if (!fromNumberId) return { err: T('Select a sending number', '请选择发送号码') };
    return { to };
  };

  const doSend = async () => {
    const { to, err } = validate();
    if (err) return setError(err);
    setError('');
    setResult(null);

    if (delayMs <= 0) {
      // Instant bulk — existing backend blast
      setSending(true);
      try {
        const { data } = await sendBlast({ to, fromNumberId, body: body.trim(), media_url: mediaUrl.trim() || null });
        setResult(data);
      } catch (e) {
        setError(e.response?.data?.error || 'Failed');
      } finally {
        setSending(false);
      }
      return;
    }

    // Staggered mode — send one by one with a delay; each number is
    // attempted exactly once (removed from the pending list), so no
    // duplicates, and sent/failed counts update live.
    stopRef.current = false;
    const statuses = Object.fromEntries(to.map((n) => [n, { state: 'pending' }]));
    setProgress({ sent: 0, failed: 0, total: to.length, statuses });
    setSending(true);

    for (let i = 0; i < to.length; i++) {
      const n = to[i];
      if (stopRef.current) break;
      setProgress((p) => ({ ...p, statuses: { ...p.statuses, [n]: { state: 'sending' } } }));
      try {
        await sendSms({ to: n, fromNumberId, body: body.trim(), media_url: mediaUrl.trim() || null });
        setProgress((p) => ({ ...p, sent: p.sent + 1, statuses: { ...p.statuses, [n]: { state: 'sent' } } }));
      } catch (e) {
        setProgress((p) => ({
          ...p,
          failed: p.failed + 1,
          statuses: { ...p.statuses, [n]: { state: 'failed', error: e.response?.data?.error || 'Failed' } },
        }));
      }
      if (delayMs > 0 && i < to.length - 1 && !stopRef.current) {
        await sleep(delayMs);
      }
    }
    setSending(false);
  };

  const doStop = () => {
    stopRef.current = true;
  };

  const pickImage = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) return setError(T('Image too large (max 8MB)', '图片过大（最大 8MB）'));
    const reader = new FileReader();
    reader.onload = async () => {
      setUploading(true);
      setError('');
      try {
        const { data } = await uploadSmsImage({ filename: file.name, data: reader.result });
        setMediaUrl(data.url);
      } catch (err) {
        setError(err.response?.data?.error || 'Upload failed');
      } finally {
        setUploading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const fmt = (n) => {
    try { return new Intl.NumberFormat(lang === 'zh' ? 'zh-CN' : 'en-US').format(n); } catch { return String(n); }
  };

  const stateLabel = {
    pending: T('Pending', '等待'),
    sending: T('Sending…', '发送中…'),
    sent: T('Sent', '已发送'),
    failed: T('Failed', '失败'),
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{T('Bulk blast', '批量群发')}</h3>
          <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 text-xl leading-none">×</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">{T('From number', '发送号码')}</label>
            <select value={fromNumberId} onChange={(e) => setFromNumberId(e.target.value)} disabled={sending}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 dark:text-slate-100">
              {numbers.length === 0 && <option value="">{T('No assigned numbers', '无已分配号码')}</option>}
              {numbers.map((n) => <option key={n.id} value={n.id}>{n.number}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">{T('Recipients (comma separated, max 100)', '收件人（逗号分隔，最多 100 个）')}</label>
            <textarea value={recipients} onChange={(e) => setRecipients(e.target.value)} rows={3} disabled={sending}
              placeholder="+14155550001, +14155550002"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 resize-none"
              style={{ '--tw-ring-color': theme.primary }} />
          </div>

          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">{T('Message', '消息内容')}</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} disabled={sending}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 resize-none"
              style={{ '--tw-ring-color': theme.primary }} />
            <div className="mt-2 flex items-center gap-2">
              <label className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
                {uploading ? T('Uploading…', '上传中…') : T('Attach image (MMS)', '附加图片 (MMS)')}
                <input type="file" accept="image/*" className="hidden" onChange={pickImage} disabled={uploading} />
              </label>
              {mediaUrl && (
                <div className="relative shrink-0">
                  <img src={mediaUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-slate-200 dark:border-slate-800" />
                  <button type="button" onClick={() => setMediaUrl('')}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center leading-none hover:bg-red-600">
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">{T('Delay between sends', '发送间隔')}</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={60}
                value={delayNum}
                disabled={sending}
                onChange={(e) => setDelayNum(Math.max(0, Number(e.target.value) || 0))}
                className="w-20 px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 resize-none"
                style={{ '--tw-ring-color': theme.primary }}
              />
              <select
                value={delayUnit}
                disabled={sending}
                onChange={(e) => setDelayUnit(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="s">{T('seconds', '秒')}</option>
                <option value="m">{T('minutes', '分钟')}</option>
              </select>
              <span className="text-xs text-slate-400 dark:text-slate-500">
                {delayNum > 0
                  ? T('Each SMS sends one by one. Sent numbers are removed from the list, so no duplicates.', '每条短信逐一发送。已发送的号码会自动从列表中移除，不会重复发送。')
                  : T('0 = send all instantly', '0 = 立即全部发送')}
              </span>
            </div>
          </div>

          {progress && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {T('Live progress', '实时进度')}
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-emerald-600 dark:text-emerald-400">✓ {T('Sent', '已发送')}: {fmt(progress.sent)}</span>
                  <span className="text-rose-500">✗ {T('Failed', '失败')}: {fmt(progress.failed)}</span>
                  <span className="text-slate-400">{T('Pending', '剩余')}: {fmt(progress.total - progress.sent - progress.failed)}</span>
                </div>
              </div>
              <div className="h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden mb-2">
                <div className="h-full rounded-full transition-all" style={{ width: `${progress.total ? Math.round(((progress.sent + progress.failed) / progress.total) * 100) : 0}%`, background: theme.primary }} />
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1">
                {Object.entries(progress.statuses).map(([num, st]) => (
                  <div key={num} className="flex items-center justify-between text-xs">
                    <span className={`font-mono ${st.state === 'sent' ? 'text-emerald-600 dark:text-emerald-400' : st.state === 'failed' ? 'text-rose-500' : st.state === 'sending' ? 'text-indigo-500' : 'text-slate-400'}`}>{num}</span>
                    <span className="flex items-center gap-1">
                      {st.state === 'sending' && <span className="w-3 h-3 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin inline-block" />}
                      {stateLabel[st.state]}
                      {st.error && <span className="text-slate-400 ml-1">({st.error})</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && <div className="text-sm text-red-500">{error}</div>}
          {result && (
            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-200">
              {T('Sent', '已发送')}: {result.sent} · {T('Scheduled', '已定时')}: {result.scheduled} · {T('Failed', '失败')}: {result.failed}
            </div>
          )}

          {sending && progress ? (
            <button onClick={doStop}
              className="w-full py-2.5 text-sm rounded-lg font-semibold border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition">
              {T('Stop sending', '停止发送')}
            </button>
          ) : (
            <button onClick={doSend} disabled={sending}
              className="w-full py-2.5 text-sm text-white rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
              style={{ background: theme.primary }}>
              {sending ? T('Sending…', '发送中…') : T('Send blast', '发送群发')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
