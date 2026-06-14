
import React, { useState } from 'react';
import {
  LayoutDashboard, Users, CalendarDays, BarChart3,
  LogOut, Menu, X, Cpu,
} from 'lucide-react';
import { AppUser } from '../types';

export type TabId = 'dashboard' | 'roster' | 'schedule' | 'planner' | 'history';

interface LayoutProps {
  children:     React.ReactNode;
  activeTab:    TabId;
  setActiveTab: (t: TabId) => void;
  playerCount:  number;
  user:         AppUser;
  onLogout:     () => void;
}

const NAV: { id: TabId; label: string; icon: React.ElementType; accent?: string }[] = [
  { id: 'dashboard', label: 'Command Board',   icon: LayoutDashboard },
  { id: 'roster',    label: 'Team Roster',      icon: Users           },
  { id: 'schedule',  label: 'Schedule',         icon: CalendarDays    },
  { id: 'planner',   label: 'Match Planner',    icon: Cpu             },
  { id: 'history',   label: 'Tactical History', icon: BarChart3       },
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
        style={{ background: 'rgba(0,0,8,0.95)', borderBottom: '1px solid rgba(0,229,255,0.12)' }}
      >
        <LogoMark />
        <button onClick={() => setOpen(true)}
          className="p-2 rounded" style={{ color: '#00E5FF' }}>
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* ── Mobile backdrop ───────────────────────────────────────── */}
      {open && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          style={{ background: 'rgba(0,0,8,0.85)', backdropFilter: 'blur(8px)' }}
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
          background: 'rgba(0,2,14,0.97)',
          borderRight: '1px solid rgba(0,229,255,0.1)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 shrink-0"
          style={{ borderBottom: '1px solid rgba(0,229,255,0.08)' }}>
          <LogoMark />
          <button onClick={() => setOpen(false)}
            className="md:hidden" style={{ color: 'rgba(0,229,255,0.5)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User card */}
        <div className="px-4 py-4 shrink-0" style={{ borderBottom: '1px solid rgba(0,229,255,0.06)' }}>
          <div className="flex items-center gap-3 px-3 py-3 rounded"
            style={{ background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.1)' }}>
            <div className="relative shrink-0">
              <img
                src={user.photoURL}
                alt=""
                className="w-9 h-9 rounded"
                onError={e => { (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/bottts/svg?seed=${user.uid}`; }}
              />
              <div
                className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full"
                style={{ background: '#00FF88', boxShadow: '0 0 6px #00FF88' }}
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{user.displayName}</p>
              <p className="font-mono text-[9px] truncate" style={{ color: 'rgba(0,229,255,0.5)' }}>
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
        <div className="px-4 pb-6 shrink-0 space-y-4" style={{ borderTop: '1px solid rgba(0,229,255,0.06)' }}>
          {/* Squad strength */}
          <div className="pt-4 px-2">
            <div className="flex justify-between items-center mb-2">
              <span className="section-label opacity-60">Squad Strength</span>
              <span className="font-mono text-xs" style={{ color: '#00E5FF' }}>
                {playerCount}<span style={{ color: 'rgba(208,232,255,0.3)' }}>/8</span>
              </span>
            </div>
            <div className="h-px w-full" style={{ background: 'rgba(0,229,255,0.1)' }}>
              <div
                className="h-px transition-all duration-700"
                style={{
                  width: `${Math.min((playerCount / 8) * 100, 100)}%`,
                  background: playerCount >= 8 ? '#00FF88' : '#00E5FF',
                  boxShadow: playerCount >= 8 ? '0 0 8px #00FF88' : '0 0 8px #00E5FF',
                }}
              />
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded text-sm font-bold transition-all group"
            style={{ color: 'rgba(255,0,102,0.6)', letterSpacing: '.06em', fontFamily: 'Orbitron, sans-serif', fontSize: '11px' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#FF0066')}
            onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,0,102,0.6)')}
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

const LogoMark = () => (
  <div className="flex items-center gap-2.5">
    <div
      className="w-8 h-8 flex items-center justify-center rounded"
      style={{ background: 'rgba(0,229,255,0.1)', border: '1px solid rgba(0,229,255,0.4)', boxShadow: '0 0 12px rgba(0,229,255,0.2)' }}
    >
      <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none">
        <circle cx="10" cy="6"  r="2.2" fill="#00E5FF" opacity=".95" />
        <circle cx="7"  cy="11" r="2.2" fill="#00E5FF" opacity=".75" />
        <circle cx="13" cy="11" r="2.2" fill="#00E5FF" opacity=".75" />
        <circle cx="4"  cy="16" r="2.2" fill="#00E5FF" opacity=".5"  />
        <circle cx="10" cy="16" r="2.2" fill="#FFB700" opacity=".95" />
        <circle cx="16" cy="16" r="2.2" fill="#00E5FF" opacity=".5"  />
      </svg>
    </div>
    <div>
      <span className="font-orbitron font-black text-base tracking-widest" style={{ color: '#00E5FF', textShadow: '0 0 12px rgba(0,229,255,0.6)' }}>
        APA
      </span>
      <span className="font-orbitron font-bold text-base tracking-widest text-white ml-1">
        COACH
      </span>
    </div>
  </div>
);
