
import React, { useState } from 'react';
import { Player, Match, SessionArchive } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { History, TrendingUp, Calendar, Archive, Download, ChevronRight, Trophy, Target } from 'lucide-react';

interface PerformanceProps {
  players: Player[];
  matches: Match[];
  archives: SessionArchive[];
  onArchiveSession: (name: string) => void;
}

export const Performance: React.FC<PerformanceProps> = ({ players, matches, archives, onArchiveSession }) => {
  const [isArchiving, setIsArchiving] = useState(false);
  const [sessionName, setSessionName] = useState(`Session ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`);

  const totalWins = matches.reduce((acc, m) => acc + m.totalWins, 0);
  const totalGames = matches.reduce((acc, m) => acc + (m.totalWins + m.totalLosses), 0);
  const sessionWinRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

  const playerStats = players
    .filter(p => p.games8Ball + p.games9Ball > 0)
    .map(p => ({
      name: p.name.split(' ')[0],
      winRate: Math.round(((p.wins8Ball + p.wins9Ball) / (p.games8Ball + p.games9Ball)) * 100),
      totalGames: p.games8Ball + p.games9Ball
    }))
    .sort((a, b) => b.winRate - a.winRate);

  const matchTimeline = matches.map((m, i) => ({
    match: i + 1,
    wins: m.totalWins,
    losses: m.totalLosses
  }));

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">Tactical History</h2>
          <p className="text-slate-400 mt-1">Combat effectiveness & seasonal mission data.</p>
        </div>
        <button 
          onClick={() => setIsArchiving(true)}
          className="flex items-center gap-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 px-5 py-2.5 rounded-xl border border-rose-500/20 font-bold transition-all"
        >
          <Archive className="w-5 h-5" />
          <span>End Session</span>
        </button>
      </header>

      {isArchiving && (
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] animate-in zoom-in-95">
          <h3 className="text-xl font-bold mb-4">Confirm Mission Completion</h3>
          <p className="text-slate-400 mb-6 text-sm">This will archive all active matches and reset player session stats. Historical data will be preserved in the mission archive.</p>
          <div className="flex flex-col gap-4">
            <input 
              value={sessionName} 
              onChange={e => setSessionName(e.target.value)}
              className="bg-slate-950 border border-slate-800 p-4 rounded-2xl text-white font-bold outline-none focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setIsArchiving(false)} className="text-slate-500 px-4">Abort</button>
              <button 
                onClick={() => { onArchiveSession(sessionName); setIsArchiving(false); }}
                className="bg-rose-600 px-8 py-3 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-rose-500/20"
              >
                Archive & Start New Session
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
           <div className="flex items-center gap-3 mb-4 text-emerald-500">
              <Trophy className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Session Win Rate</span>
           </div>
           <p className="text-5xl font-black">{sessionWinRate}%</p>
           <p className="text-xs text-slate-500 mt-2">{totalWins} Wins from {totalGames} matches</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
           <div className="flex items-center gap-3 mb-4 text-indigo-500">
              <Target className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Active Players</span>
           </div>
           <p className="text-5xl font-black">{players.filter(p => p.isActive).length}</p>
           <p className="text-xs text-slate-500 mt-2">{players.filter(p => !p.isActive).length} currently archived</p>
        </div>
        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800">
           <div className="flex items-center gap-3 mb-4 text-amber-500">
              <Calendar className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Missions Run</span>
           </div>
           <p className="text-5xl font-black">{matches.length}</p>
           <p className="text-xs text-slate-500 mt-2">Current Session Timeline</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800">
          <h4 className="text-lg font-bold mb-8">Performance Leaderboard</h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={playerStats} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" stroke="#64748b" fontSize={12} width={80} />
                <Tooltip 
                  cursor={{ fill: 'rgba(99, 102, 241, 0.1)' }}
                  contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }}
                />
                <Bar dataKey="winRate" fill="#6366f1" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 p-8 rounded-3xl border border-slate-800">
          <h4 className="text-lg font-bold mb-8">Success Trends</h4>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={matchTimeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="match" stroke="#64748b" fontSize={10} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '12px' }} />
                <Line type="monotone" dataKey="wins" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-bold flex items-center gap-2">
          <History className="w-6 h-6 text-slate-500" />
          Mission Archive
        </h3>
        {archives.length === 0 ? (
          <div className="bg-slate-900/50 border border-slate-800 border-dashed rounded-[2.5rem] p-12 text-center">
            <Archive className="w-12 h-12 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">No historical archives found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {archives.map(archive => (
              <div key={archive.id} className="bg-slate-900 border border-slate-800 p-6 rounded-[2rem] hover:border-slate-700 transition-all flex justify-between items-center group">
                <div>
                  <h4 className="font-bold text-white group-hover:text-indigo-400 transition-colors">{archive.name}</h4>
                  <p className="text-[10px] text-slate-500 mt-1 uppercase tracking-widest">{new Date(archive.startDate).toLocaleDateString()} — {new Date(archive.endDate).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-xs font-black text-indigo-400">{archive.matches.length} Matches</p>
                    <p className="text-[10px] text-slate-600 font-bold">DATA CAPTURED</p>
                  </div>
                  <button className="p-2 bg-slate-800 rounded-xl text-slate-500 hover:text-white">
                    <Download className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
