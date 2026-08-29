import { useTheme } from '../../context/ThemeContext.jsx';

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 ${className}`}>
      {children}
    </div>
  );
}

export function Badge({ children, color = 'slate' }) {
  const map = {
    slate: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300',
    green: 'bg-green-100 text-green-700',
    red: 'bg-red-100 text-red-700 dark:text-red-400',
    amber: 'bg-amber-100 text-amber-700 dark:text-amber-400',
    blue: 'bg-blue-100 text-blue-700 dark:text-blue-400',
    purple: 'bg-purple-100 text-purple-700',
  };
  return (
    <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${map[color] || map.slate}`}>
      {children}
    </span>
  );
}

export function Button({ children, onClick, variant = 'primary', className = '', type = 'button', disabled }) {
  const { theme } = useTheme();
  const base = 'px-3 py-1.5 text-sm rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed';
  const styles =
    variant === 'primary'
      ? { background: theme.primary, color: '#fff' }
      : variant === 'danger'
        ? 'bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100 border border-red-200'
        : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 border border-slate-200 dark:border-slate-800';
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${typeof styles === 'string' ? styles : ''} ${className}`} style={typeof styles === 'object' ? styles : {}}>
      {children}
    </button>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props) {
  return (
    <input
      {...props}
      className={`border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-sm w-full bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-100 ${props.className || ''}`}
    />
  );
}

export function SelectInput(props) {
  return (
    <select
      {...props}
      className={`border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-1.5 text-sm w-full bg-white dark:bg-slate-800 dark:text-slate-100 focus:outline-none ${props.className || ''}`}
    />
  );
}

export function Toast({ message, color }) {
  if (!message) return null;
  const { theme } = useTheme();
  return (
    <div
      className="fixed top-16 right-6 z-50 px-4 py-2 rounded-lg text-white text-sm shadow-lg"
      style={{ background: color || theme.primary }}
    >
      {message}
    </div>
  );
}

export function SectionHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h1>
        {subtitle && <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Table({ head, children }) {
  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
            {head.map((h, i) => (
              <th key={i} className="px-4 py-3 font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}
