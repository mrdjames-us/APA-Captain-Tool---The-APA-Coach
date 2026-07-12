
import React, { useState } from 'react';
import {
  LayoutDashboard, Users, CalendarDays, BarChart3,
  LogOut, Menu, X, Cpu, Globe, Crosshair,
} from 'lucide-react';
import { AppUser } from '../types';

export type TabId = 'dashboard' | 'roster' | 'schedule' | 'planner' | 'history' | 'apa' | 'scouting';

interface LayoutProps {
  children:     React.ReactNode;
  activeTab:    TabId;
  setActiveTab: (t: TabId) => void;
  playerCount:  number;
  user:         AppUser;
  onLogout:     () => void;
}

const NAV: { id: TabId; label: string; icon: React.ElementType; accent?: string }[] = [
  { id: 'dashboard', label: 'Dashboard',        icon: LayoutDashboard },
  { id: 'roster',    label: 'Team Roster',      icon: Users           },
  { id: 'apa',       label: 'APA Sync',         icon: Globe           },
  { id: 'schedule',  label: 'Schedule',         icon: CalendarDays    },
  { id: 'planner',   label: 'Match Planner',    icon: Cpu             },
  { id: 'scouting',  label: 'Scouting',         icon: Crosshair       },
  { id: 'history',   label: 'Stats & History',  icon: BarChart3       },
];

export const Layout: React.FC<LayoutProps> = ({
  children, activeTab, setActiveTab, playerCount, user, onLogout,
}) => {
  const [open, setOpen] = useState(false);

  const go = (id: TabId) => { setActiveTab(id); setOpen(false); };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* ── Mobile top bar ───────────────────────────────────────── */}
      <header
        className="md:hidden flex items-center justify-between px-5 py-3 sticky top-0 z-40"
        style={{ background: 'rgba(10,31,23,0.95)', borderBottom: '1px solid rgba(57,167,201,0.12)' }}
      >
        <LogoMark />
        <button onClick={() => setOpen(true)}
          className="p-2 rounded" style={{ color: '#39A7C9' }}>
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* ── Mobile backdrop ───────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          style={{ background: 'rgba(10,31,23,0.85)', backdropFilter: 'blur(8px)' }}
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── Sidebar ───────────────────────────────────────────────── */}
      <nav
        className={`
          fixed md:sticky top-0 left-0 z-[60] h-screen w-72
          flex flex-col transition-transform duration-300
          ${open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        style={{
          background: 'rgba(9,30,22,0.97)',
          borderRight: '1px solid rgba(57,167,201,0.1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 shrink-0"
          style={{ borderBottom: '1px solid rgba(57,167,201,0.08)' }}>
          <LogoMark />
          <button onClick={() => setOpen(false)}
            className="md:hidden" style={{ color: 'rgba(57,167,201,0.5)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User card */}
        <div className="px-4 py-4 shrink-0" style={{ borderBottom: '1px solid rgba(57,167,201,0.06)' }}>
          <div className="flex items-center gap-3 px-3 py-3 rounded"
            style={{ background: 'rgba(57,167,201,0.04)', border: '1px solid rgba(57,167,201,0.1)' }}>
            <div className="relative shrink-0">
              <img
                src={user.photoURL}
                alt=""
                className="w-9 h-9 rounded"
                onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`; }}
              />
              <div
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                style={{ background: '#39C46B', boxShadow: '0 0 6px #39C46B' }}
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{user.displayName}</p>
              <p className="font-mono text-[10px] truncate" style={{ color: 'rgba(57,167,201,0.85)' }}>
                {user.provider.toUpperCase()} · {user.email.split('@')[0]}
              </p>
            </div>
          </div>
        </div>

        {/* Nav items */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(item => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => go(item.id)}
                className={`nav-item w-full flex items-center gap-3 px-4 py-3 rounded text-left text-sm font-bold ${active ? 'active' : ''}`}
                style={{ fontFamily: active ? 'Orbitron, sans-serif' : 'Inter, sans-serif', fontSize: '12px', letterSpacing: active ? '.06em' : undefined }}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 pb-6 shrink-0 space-y-4" style={{ borderTop: '1px solid rgba(57,167,201,0.06)' }}>
          {/* Team strength */}
          <div className="pt-4 px-2">
            <div className="flex justify-between items-center mb-2">
              <span className="section-label">Team Strength</span>
              <span className="font-mono text-xs" style={{ color: '#39A7C9' }}>
                {playerCount}<span style={{ color: 'rgba(239,231,214,0.3)' }}>/8</span>
              </span>
            </div>
            <div className="h-px w-full" style={{ background: 'rgba(57,167,201,0.1)' }}>
              <div
                className="h-px transition-all duration-700"
                style={{
                  width: `${Math.min((playerCount / 8) * 100, 100)}%`,
                  background: playerCount >= 8 ? '#39C46B' : '#39A7C9',
                  boxShadow: playerCount >= 8 ? '0 0 8px #39C46B' : '0 0 8px #39A7C9',
                }}
              />
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded text-sm font-bold transition-all group"
            style={{ color: 'rgba(209,74,60,0.6)', letterSpacing: '.06em', fontFamily: 'Orbitron, sans-serif', fontSize: '11px' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#D14A3C')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(209,74,60,0.6)')}
          >
            <LogOut className="w-4 h-4 transition-transform group-hover:-translate-x-0.5" />
            DISCONNECT
          </button>
        </div>
      </nav>

      {/* ── Main content ──────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
};

// A pool ball: number badge on a colored/black sphere with a highlight.
const Ball: React.FC<{ n: number; color: string; eight?: boolean; x: number }> = ({ n, color, eight, x }) => (
  <g transform={`translate(${x} 0)`}>
    <circle cx="12" cy="12" r="11" fill={eight ? '#141414' : color} />
    {!eight && <rect x="1" y="7.5" width="22" height="9" rx="1" fill={color} />}
    {!eight && <path d="M1 12a11 11 0 0 1 22 0" fill="none" />}
    <circle cx="12" cy="12" r="11" fill="url(#ballShade)" />
    <circle cx="12" cy="12" r="6.2" fill="#F4EFE2" />
    <text x="12" y="15.4" textAnchor="middle" fontSize="8.5" fontWeight="700"
      fontFamily="Oswald, sans-serif" fill="#141414">{n}</text>
    <ellipse cx="8.5" cy="7.5" rx="3.2" ry="2" fill="#ffffff" opacity="0.35" />
  </g>
);

const LogoMark = () => (
  <div className="flex items-center gap-2.5">
    <svg viewBox="0 0 44 24" className="h-7 w-auto shrink-0" style={{ filter: 'drop-shadow(0 2px 3px rgba(0,0,0,0.5))' }}>
      <defs>
        <radialGradient id="ballShade" cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.28" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.45" />
        </radialGradient>
      </defs>
      <Ball n={8} color="#141414" eight x={0} />
      <Ball n={9} color="#F2C14E" x={20} />
    </svg>
    <div>
      <span className="font-orbitron font-bold text-lg tracking-wider" style={{ color: '#F2C14E' }}>
        APA
      </span>
      <span className="font-orbitron font-semibold text-lg tracking-wider ml-1" style={{ color: '#EFE7D6' }}>
        CAPTAIN
      </span>
    </div>
  </div>
);
