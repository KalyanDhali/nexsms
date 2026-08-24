import { useEffect, useState } from 'react';
import { useTheme } from '../context/ThemeContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { getMyNumbers, sendBlast, uploadSmsImage } from '../services/api.js';

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

  const doSend = async () => {
    const to = recipients.split(',').map((s) => s.trim()).filter(Boolean);
    if (!to.length) return setError(T('Enter at least one recipient', '请至少输入一个收件人'));
    if (!body.trim()) return setError(T('Message body required', '需要消息内容'));
    if (!fromNumberId) return setError(T('Select a sending number', '请选择发送号码'));
    setError('');
    setSending(true);
    try {
      const { data } = await sendBlast({ to, fromNumberId, body: body.trim(), media_url: mediaUrl.trim() || null });
      setResult(data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed');
    } finally {
      setSending(false);
    }
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

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900">{T('Bulk blast', '批量群发')}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-slate-500 mb-1 block">{T('From number', '发送号码')}</label>
            <select value={fromNumberId} onChange={(e) => setFromNumberId(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white">
              {numbers.length === 0 && <option value="">{T('No assigned numbers', '无已分配号码')}</option>}
              {numbers.map((n) => <option key={n.id} value={n.id}>{n.number}</option>)}
            </select>
          </div>

          <div>
            <label className="text-xs text-slate-500 mb-1 block">{T('Recipients (comma separated, max 100)', '收件人（逗号分隔，最多 100 个）')}</label>
            <textarea value={recipients} onChange={(e) => setRecipients(e.target.value)} rows={3}
              placeholder="+14155550001, +14155550002"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 resize-none"
              style={{ '--tw-ring-color': theme.primary }} />
          </div>

          <div>
            <label className="text-xs text-slate-500 mb-1 block">{T('Message', '消息内容')}</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-none focus:ring-2 resize-none"
              style={{ '--tw-ring-color': theme.primary }} />
            <div className="mt-2 flex items-center gap-2">
              <label className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 text-slate-600 cursor-pointer hover:bg-slate-50 transition">
                {uploading ? T('Uploading…', '上传中…') : T('Attach image (MMS)', '附加图片 (MMS)')}
                <input type="file" accept="image/*" className="hidden" onChange={pickImage} disabled={uploading} />
              </label>
              {mediaUrl && (
                <div className="relative shrink-0">
                  <img src={mediaUrl} alt="" className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                  <button type="button" onClick={() => setMediaUrl('')}
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center leading-none">
                    ×
                  </button>
                </div>
              )}
            </div>
          </div>

          {error && <div className="text-sm text-red-500">{error}</div>}
          {result && (
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-sm text-slate-700">
              {T('Sent', '已发送')}: {result.sent} · {T('Scheduled', '已定时')}: {result.scheduled} · {T('Failed', '失败')}: {result.failed}
            </div>
          )}

          <button onClick={doSend} disabled={sending}
            className="w-full py-2.5 text-sm text-white rounded-lg font-semibold hover:opacity-90 transition disabled:opacity-50"
            style={{ background: theme.primary }}>
            {sending ? T('Sending…', '发送中…') : T('Send blast', '发送群发')}
          </button>
        </div>
      </div>
    </div>
  );
}
