import { useMemo } from 'react';

const PALETTE = [
  'bg-blue-500',
  'bg-emerald-500',
  'bg-amber-500',
  'bg-rose-500',
  'bg-violet-500',
  'bg-cyan-600',
  'bg-indigo-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-orange-500',
];

function hashColor(name) {
  let h = 0;
  for (const c of name || '') h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

function initials(name) {
  const d = (name.match(/\d/g) || []).slice(-4).join('');
  if (d) return d;
  return name.replace(/[^A-Za-z]/g, '').slice(0, 2).toUpperCase() || '?';
}

export default function Avatar({ name, src, size = 40, className = '' }) {
  const color = useMemo(() => PALETTE[hashColor(name) % PALETTE.length], [name]);

  if (src) {
    return (
      <span
        className={`shrink-0 rounded-full overflow-hidden inline-flex items-center justify-center ${className}`}
        style={{ width: size, height: size }}
      >
        <img src={src} alt="" className="w-full h-full object-cover" />
      </span>
    );
  }

  return (
    <span
      className={`shrink-0 rounded-full ${color} text-white inline-flex items-center justify-center font-semibold ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.32) }}
    >
      {initials(name)}
    </span>
  );
}
