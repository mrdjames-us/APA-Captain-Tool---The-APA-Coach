
import React, { useState, useEffect } from 'react';
import { Player } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, PieChart, Pie } from 'recharts';
import { CheckCircle2, AlertCircle, TrendingUp, Users, Target, ShieldCheck, Calendar, Info } from 'lucide-react';

interface DashboardProps {
  players: Player[];
}

export const Dashboard: React.FC<DashboardProps> = ({ players }) => {
  const [currentWeek, setCurrentWeek] = useState(() => {
    const saved = localStorage.getItem('cuemaster_current_week');
    return saved ? parseInt(saved) : 1;
  });

  useEffect(() => {
    localStorage.setItem('cuemaster_current_week', currentWeek.toString());
  }, [currentWeek]);

  const unqualifiedPlayers = players.filter(p => p.games8Ball < 4 || p.games9Ball < 4);
  const qualifiedCount = players.length - unqualifiedPlayers.length;

  const chartData = players.map(p => ({
    name: p.name.split(' ')[0],
    '8-Ball': p.games8Ball,
    '9-Ball': p.games9Ball,
    Total: p.games8Ball + p.games9Ball
  }));

  const total8Ball = players.reduce((acc, p) => acc + p.games8Ball, 0);
  const total9Ball = players.reduce((acc, p) => acc + p.games9Ball, 0);
  const COLORS = ['#6366f1', '#ec4899'];
  const pieData = [{ name: '8-Ball', value: total8Ball }, { name: '9-Ball', value: total9Ball }];

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white">Command Board</h2>
          <p className="text-slate-400 mt-1 text-sm font-medium italic">Tactical deployment and mission readiness.</p>
        </div>
        
        {/* Season Progress Tracker */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center gap-6 shadow-lg">
          <div className="flex flex-col">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Season Progress</label>
            <div className="flex items-center gap-3">
              <Calendar className="w-4 h-4 text-indigo-500" />
              <span className="font-black text-white">Week {currentWeek} <span className="text-slate-600">/ 16</span></span>
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setCurrentWeek(Math.max(1, currentWeek - 1))} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"> - </button>
            <button onClick={() => setCurrentWeek(Math.min(16, currentWeek + 1))} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-slate-400 transition-colors"> + </button>
          </div>
          <div className="hidden lg:block w-32 h-1.5 bg-slate-800 rounded-full overflow-hidden">
             <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: `${(currentWeek / 16) * 100}%` }}></div>
          </div>
        </div>
      </header>

      {/* Playoff Qualification Section */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 opacity-5 hidden md:block"><ShieldCheck className="w-64 h-64 text-indigo-500" /></div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
          <div className="max-w-xl">
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-6 h-6 text-indigo-500" />
              <h3 className="text-xl md:text-2xl font-black text-white">Playoff Eligibility Tracker</h3>
            </div>
            <p className="text-slate-400 text-sm">
              Current deadline: <span className="text-white font-bold">Week 16</span>. All operators need <span className="text-white font-bold">4 matches in each format</span> to qualify.
            </p>
            {currentWeek > 12 && (
              <div className="mt-3 flex items-center gap-2 text-rose-400 bg-rose-500/10 px-3 py-1.5 rounded-lg border border-rose-500/20 text-[10px] font-black uppercase tracking-widest animate-pulse">
                <Info className="w-3.5 h-3.5" /> Qualification Deadline Approaching
              </div>
            )}
          </div>
          <div className="bg-slate-950 px-6 py-4 rounded-3xl border border-slate-800 text-center shrink-0">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Squad Qualified</p>
            <p className="text-2xl md:text-3xl font-black text-white">{qualifiedCount} <span className="text-slate-600">/ {players.length}</span></p>
          </div>
        </div>

        {unqualifiedPlayers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 relative z-10">
            {unqualifiedPlayers.map(player => (
              <div key={player.id} className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <p className="font-bold text-slate-200 group-hover:text-indigo-400 transition-colors text-sm">{player.name}</p>
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                </div>
                <div className="space-y-4">
                  <ProgressTrack label="8-Ball" count={player.games8Ball} color="indigo" />
                  <ProgressTrack label="9-Ball" count={player.games9Ball} color="pink" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 text-center bg-emerald-500/5 border border-dashed border-emerald-500/20 rounded-3xl">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mb-4" />
            <h4 className="text-xl font-black text-white">Full Squad Readiness</h4>
            <p className="text-emerald-500/60 font-bold uppercase text-[10px] tracking-widest mt-1">All operators meet eligibility criteria</p>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-slate-900 border border-slate-800 p-5 md:p-8 rounded-[2.5rem] shadow-xl">
          <h4 className="text-base font-black text-white mb-6 flex items-center gap-3">
            <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div> Match Activity Profile
          </h4>
          <div className="h-[250px] md:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: '#1e293b', radius: 12 }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '15px', fontSize: '12px' }} />
                <Bar dataKey="8-Ball" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={15} />
                <Bar dataKey="9-Ball" fill="#ec4899" radius={[4, 4, 0, 0]} barSize={15} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 md:p-8 rounded-[2.5rem] shadow-xl flex flex-col items-center">
          <h4 className="text-base font-black text-white mb-6 w-full flex items-center gap-3">
             <div className="w-1.5 h-6 bg-pink-500 rounded-full"></div> Squad Deployment
          </h4>
          <div className="h-[250px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={8} dataKey="value" stroke="none">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '15px', fontSize: '12px' }} />
                <Legend iconType="circle" formatter={(v) => <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest">{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

const ProgressTrack: React.FC<{ label: string, count: number, color: string }> = ({ label, count, color }) => (
  <div>
    <div className="flex justify-between items-center mb-1.5">
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
      <span className={`text-xs font-black ${count >= 4 ? 'text-emerald-500' : `text-${color}-400`}`}>
        {count >= 4 ? 'QUALIFIED' : `${count}/4`}
      </span>
    </div>
    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
      <div className={`h-full transition-all duration-1000 ${count >= 4 ? 'bg-emerald-500' : `bg-${color}-500`}`} style={{ width: `${Math.min((count / 4) * 100, 100)}%` }}></div>
    </div>
  </div>
);
