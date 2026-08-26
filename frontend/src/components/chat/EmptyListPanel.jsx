import { useLanguage } from '../../context/LanguageContext.jsx';

const META = {
  voicemail: { en: 'No voicemail', zh: '暂无语音信箱', subEn: 'Voicemail will appear here', subZh: '语音信箱将显示在这里' },
  archive: { en: 'No archived conversations', zh: '暂无归档对话', subEn: 'Archived threads will appear here', subZh: '归档对话将显示在这里' },
  spam: { en: 'No spam', zh: '暂无垃圾信息', subEn: 'Spam & blocked senders appear here', subZh: '垃圾与已阻止的发件人显示在这里' },
};

export default function EmptyListPanel({ kind, hidden }) {
  const { lang } = useLanguage();
  const isZh = lang === 'zh';
  const m = META[kind] || META.archive;

  return (
    <aside
      className="list-column w-full shrink-0 border-r border-slate-200 bg-white flex flex-col"
      style={hidden ? { display: 'none' } : undefined}
    >
      <div className="px-4 py-3 border-b border-slate-100">
        <span className="text-sm font-medium text-slate-900">{isZh ? m.zh : m.en}</span>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center px-8">
        <span className="text-3xl text-slate-300">··</span>
        <span className="text-sm text-slate-500">{isZh ? m.subZh : m.subEn}</span>
      </div>
    </aside>
  );
}
