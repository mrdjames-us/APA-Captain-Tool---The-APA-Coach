
import React, { useState } from 'react';
import { LayoutDashboard, Users, CalendarDays, Trophy, LogOut, Lock, BarChart3, BookOpen, Menu, X as CloseIcon } from 'lucide-react';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: 'dashboard' | 'roster' | 'planner' | 'performance';
  setActiveTab: (tab: 'dashboard' | 'roster' | 'planner' | 'performance') => void;
  playerCount: number;
  user: User;
  onLogout: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, playerCount, user, onLogout }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navItems = [
    { id: 'dashboard', label: 'Command Board', icon: LayoutDashboard },
    { id: 'roster', label: 'Team Roster', icon: Users },
    { id: 'planner', label: 'Match Planner', icon: CalendarDays },
    { id: 'performance', label: 'Tactical History', icon: BarChart3 },
  ] as const;

  const handleNavClick = (tab: typeof activeTab) => {
    setActiveTab(tab);
    setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#020617] text-slate-200">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-xl">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-600 rounded-lg">
            <Trophy className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-black tracking-tighter text-white">APA <span className="text-indigo-400">Coach</span></h1>
        </div>
        <button 
          onClick={() => setIsMenuOpen(true)}
          className="p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl"
        >
          <Menu className="w-6 h-6" />
        </button>
      </header>

      {/* Backdrop for mobile */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}

      {/* Sidebar / Navigation Drawer */}
      <nav className={`
        fixed md:sticky top-0 left-0 z-[60] h-screen
        w-72 bg-slate-900 border-r border-slate-800 p-6 
        flex flex-col gap-6 shadow-2xl transition-transform duration-300 ease-in-out
        ${isMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        overflow-y-auto shrink-0
      `}>
        <div className="flex items-center justify-between mb-2 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/20">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-black tracking-tighter text-white">APA <span className="text-indigo-400">Coach</span></h1>
          </div>
          <button 
            onClick={() => setIsMenuOpen(false)}
            className="md:hidden p-2 text-slate-500 hover:text-white"
          >
            <CloseIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Identity Profile */}
        <div className="relative group shrink-0">
          <div className="flex items-center gap-3 p-3 bg-slate-950/50 rounded-2xl border border-slate-800 group-hover:border-indigo-500/30 transition-all duration-300">
            <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 bg-slate-800 flex items-center justify-center font-black text-indigo-400 overflow-hidden shrink-0 relative">
               {user.picture ? (
                 <img src={user.picture} alt="" className="w-full h-full object-cover" />
               ) : (
                 user.name.charAt(0).toUpperCase()
               )}
               <div className="absolute bottom-0 right-0 bg-emerald-500 w-3 h-3 rounded-full border-2 border-slate-900"></div>
            </div>
            <div className="overflow-hidden">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-black truncate text-slate-100">{user.name}</p>
                <Lock className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
              </div>
              <p className="text-[10px] text-slate-500 font-bold tracking-tight truncate uppercase">{user.id}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 shrink-0">
          {navItems.map((item) => (
            <button 
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="font-bold text-sm tracking-tight">{item.label}</span>
            </button>
          ))}
        </div>

        {/* Command Briefing (Help Section) */}
        <div className="bg-slate-950/40 border border-slate-800/60 rounded-2xl p-4 mt-2 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Command Manual</p>
          </div>
          
          <div className="space-y-3">
            <div className="group">
              <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-tight mb-0.5">Command Board</p>
              <p className="text-[10px] text-slate-500 leading-relaxed italic">Monitor squad readiness and playoff eligibility status.</p>
            </div>
            
            <div className="group">
              <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-tight mb-0.5">Team Roster</p>
              <p className="text-[10px] text-slate-500 leading-relaxed italic">Manage personnel files, update skill levels, and archive players.</p>
            </div>
            
            <div className="group">
              <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-tight mb-0.5">Match Planner</p>
              <p className="text-[10px] text-slate-500 leading-relaxed italic">Optimize lineups under the Rule of 23 and log live results.</p>
            </div>
            
            <div className="group p-2 rounded-lg bg-indigo-500/5 border border-indigo-500/20 ring-1 ring-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.1)]">
              <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-tight mb-0.5">Tactical History</p>
              <p className="text-[10px] text-slate-400 leading-relaxed italic">Analyze seasonal trends and manage mission archives.</p>
              <div className="mt-1.5 flex items-start gap-1.5">
                <div className="w-1 h-1 rounded-full bg-rose-500 mt-1 shrink-0"></div>
                <p className="text-[9px] font-black text-rose-400 uppercase leading-tight">
                  New Season: Select 'End Session' here to archive data and reset current stats.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-6 shrink-0">
          <div className="pt-6 border-t border-slate-800">
            <div className="flex justify-between items-center mb-3">
              <p className="text-[10px] text-slate-500 font-black tracking-widest uppercase">Team Strength</p>
              <span className="text-[10px] font-black text-indigo-400">{playerCount}/8</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div 
                className={`h-1.5 rounded-full transition-all duration-1000 ${playerCount >= 8 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'bg-indigo-500'}`} 
                style={{ width: `${Math.min((playerCount / 8) * 100, 100)}%` }}
              ></div>
            </div>
          </div>

          <button 
            onClick={onLogout}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-all group"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-bold text-xs uppercase tracking-widest">Terminate Session</span>
          </button>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
