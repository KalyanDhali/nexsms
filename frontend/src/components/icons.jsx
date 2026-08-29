import { useId } from 'react';

function Icon({ colors, size = 18, className = '', strokeWidth = 1.8, children }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const gid = `ic-${uid}`;
  return (
    <svg
      viewBox="0 0 24 24"
      width={className ? undefined : size}
      height={className ? undefined : size}
      className={className}
      fill="none"
      stroke={`url(#${gid})`}
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={colors[0]} />
          <stop offset="100%" stopColor={colors[1]} />
        </linearGradient>
      </defs>
      {children}
    </svg>
  );
}

const PHONE_PATH =
  'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z';

export const IconMessages = (p) => (
  <Icon colors={['#3b82f6', '#06b6d4']} {...p}>
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </Icon>
);

export const IconCalls = (p) => (
  <Icon colors={['#22c55e', '#14b8a6']} {...p}>
    <path d={PHONE_PATH} />
  </Icon>
);

export const IconVoicemail = (p) => (
  <Icon colors={['#8b5cf6', '#a855f7']} {...p}>
    <path d="M12 8a3 3 0 0 0-3-3 3 3 0 0 0-3 3v3a3 3 0 0 0 6 0V8z" />
    <path d="M6 11a3 3 0 0 0-3 3v1a6 6 0 0 0 6 6h6a6 6 0 0 0 6-6v-1a3 3 0 0 0-3-3" />
    <path d="M6 8v3M12 8v3" />
  </Icon>
);

export const IconArchive = (p) => (
  <Icon colors={['#f59e0b', '#f97316']} {...p}>
    <path d="M21 8v13H3V8" />
    <path d="M1 3h22v5H1z" />
    <path d="M10 12h4" />
  </Icon>
);

export const IconSpam = (p) => (
  <Icon colors={['#f43f5e', '#ef4444']} {...p}>
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </Icon>
);

export const IconHome = (p) => (
  <Icon colors={['#6366f1', '#8b5cf6']} {...p}>
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </Icon>
);

export const IconContacts = (p) => (
  <Icon colors={['#06b6d4', '#14b8a6']} {...p}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </Icon>
);

export const IconNumbers = (p) => (
  <Icon colors={['#22c55e', '#84cc16']} {...p}>
    <path d={PHONE_PATH} />
  </Icon>
);

export const IconSettings = (p) => (
  <Icon colors={['#3b82f6', '#6366f1']} {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Icon>
);

export const IconMic = (p) => (
  <Icon colors={['#f43f5e', '#ec4899']} {...p}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
  </Icon>
);

export const IconMute = (p) => (
  <Icon colors={['#f59e0b', '#f97316']} {...p}>
    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" y1="19" x2="12" y2="23" />
    <line x1="4" y1="4" x2="20" y2="20" />
  </Icon>
);

export const IconEndCall = (p) => (
  <Icon colors={['#ef4444', '#dc2626']} {...p}>
    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" />
  </Icon>
);

export const IconSend = (p) => (
  <Icon colors={['#22c55e', '#14b8a6']} {...p}>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </Icon>
);

export const IconBackspace = (p) => (
  <Icon colors={['#64748b', '#94a3b8']} {...p}>
    <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
    <line x1="18" y1="9" x2="12" y2="15" />
    <line x1="12" y1="9" x2="18" y2="15" />
  </Icon>
);

export const IconSearch = (p) => (
  <Icon colors={['#0ea5e9', '#3b82f6']} {...p}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </Icon>
);

export const IconPlus = (p) => (
  <Icon colors={['#10b981', '#22c55e']} {...p}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </Icon>
);

export const IconTrash = (p) => (
  <Icon colors={['#f43f5e', '#ef4444']} {...p}>
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
  </Icon>
);

export const IconDownload = (p) => (
  <Icon colors={['#0ea5e9', '#6366f1']} {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </Icon>
);

export const IconRefresh = (p) => (
  <Icon colors={['#6366f1', '#8b5cf6']} {...p}>
    <polyline points="23 4 23 10 17 10" />
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
  </Icon>
);

export const IconClose = (p) => (
  <Icon colors={['#94a3b8', '#64748b']} {...p}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </Icon>
);

export const IconBack = (p) => (
  <Icon colors={['#64748b', '#475569']} {...p}>
    <polyline points="15 18 9 12 15 6" />
  </Icon>
);

export const IconChevronDown = (p) => (
  <Icon colors={['#64748b', '#94a3b8']} {...p}>
    <polyline points="6 9 12 15 18 9" />
  </Icon>
);

export const IconChevronRight = (p) => (
  <Icon colors={['#94a3b8', '#64748b']} {...p}>
    <polyline points="9 18 15 12 9 6" />
  </Icon>
);

export const IconCheck = (p) => (
  <Icon colors={['#10b981', '#22c55e']} {...p}>
    <polyline points="20 6 9 17 4 12" />
  </Icon>
);

export const IconInfo = (p) => (
  <Icon colors={['#0ea5e9', '#3b82f6']} {...p}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </Icon>
);

export const IconUser = (p) => (
  <Icon colors={['#06b6d4', '#3b82f6']} {...p}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Icon>
);

export const IconMoon = (p) => (
  <Icon colors={['#6366f1', '#8b5cf6']} {...p}>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </Icon>
);

export const IconSun = (p) => (
  <Icon colors={['#f59e0b', '#fbbf24']} {...p}>
    <circle cx="12" cy="12" r="5" />
    <line x1="12" y1="1" x2="12" y2="3" />
    <line x1="12" y1="21" x2="12" y2="23" />
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
    <line x1="1" y1="12" x2="3" y2="12" />
    <line x1="21" y1="12" x2="23" y2="12" />
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
  </Icon>
);

export const IconBell = (p) => (
  <Icon colors={['#f43f5e', '#ec4899']} {...p}>
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </Icon>
);

export const IconLogout = (p) => (
  <Icon colors={['#ef4444', '#f43f5e']} {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </Icon>
);

export const IconKeypad = (p) => (
  <Icon colors={['#22c55e', '#84cc16']} {...p}>
    <rect x="2" y="3" width="6" height="6" rx="1" />
    <rect x="9" y="3" width="6" height="6" rx="1" />
    <rect x="16" y="3" width="6" height="6" rx="1" />
    <rect x="2" y="10" width="6" height="6" rx="1" />
    <rect x="9" y="10" width="6" height="6" rx="1" />
    <rect x="16" y="10" width="6" height="6" rx="1" />
    <rect x="2" y="17" width="6" height="6" rx="1" />
    <rect x="9" y="17" width="6" height="6" rx="1" />
    <rect x="16" y="17" width="6" height="6" rx="1" />
  </Icon>
);

export const IconFilter = (p) => (
  <Icon colors={['#8b5cf6', '#a855f7']} {...p}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </Icon>
);

export const IconStar = (p) => (
  <Icon colors={['#fbbf24', '#f59e0b']} {...p}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </Icon>
);

export const IconShield = (p) => (
  <Icon colors={['#10b981', '#14b8a6']} {...p}>
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </Icon>
);

export const IconCard = (p) => (
  <Icon colors={['#3b82f6', '#6366f1']} {...p}>
    <rect x="1" y="4" width="22" height="16" rx="2" />
    <line x1="1" y1="10" x2="23" y2="10" />
  </Icon>
);

export const IconDocument = (p) => (
  <Icon colors={['#0ea5e9', '#3b82f6']} {...p}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </Icon>
);

export const IconCopy = (p) => (
  <Icon colors={['#64748b', '#94a3b8']} {...p}>
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </Icon>
);

export const IconClock = (p) => (
  <Icon colors={['#f59e0b', '#f97316']} {...p}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </Icon>
);

export const IconMenu = (p) => (
  <Icon colors={['#64748b', '#94a3b8']} {...p}>
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </Icon>
);

export const IconLock = (p) => (
  <Icon colors={['#6366f1', '#8b5cf6']} {...p}>
    <rect x="3" y="11" width="18" height="11" rx="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </Icon>
);
