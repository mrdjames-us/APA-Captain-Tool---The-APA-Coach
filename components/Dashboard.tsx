
import React from 'react';
import { Player } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell, PieChart, Pie } from 'recharts';
import { CheckCircle2, AlertCircle, TrendingUp, Users, Target, ShieldCheck } from 'lucide-react';

interface DashboardProps {
  players: Player[];
}

export const Dashboard: React.FC<DashboardProps> = ({ players }) => {
  // Qualification logic: 4 in 8-Ball AND 4 in 9-Ball
  const unqualifiedPlayers = players.filter(p => p.games8Ball < 4 || p.games9Ball < 4);
  const qualifiedCount = players.length - unqualifiedPlayers.length;

  const chartData = players.map(p => ({
    name: p.name.split(' ')[0],
    '8-Ball': p.games8Ball,
    '9-Ball': p.games9Ball,
    Total: p.games8Ball + p.games9Ball,
    Monthly: p.monthlyParticipation
  }));

  const total8Ball = players.reduce((acc, p) => acc + p.games8Ball, 0);
  const total9Ball = players.reduce((acc, p) => acc + p.games9Ball, 0);
  
  const pieData = [
    { name: '8-Ball', value: total8Ball },
    { name: '9-Ball', value: total9Ball }
  ];

  const avgSkill8 = players.length ? (players.reduce((acc, p) => acc + p.skillLevel8Ball, 0) / players.length).toFixed(1) : "0";
  const avgSkill9 = players.length ? (players.reduce((acc, p) => acc + p.skillLevel9Ball, 0) / players.length).toFixed(1) : "0";

  const COLORS = ['#6366f1', '#ec4899'];

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <header>
        <h2 className="text-2xl md:text-3xl font-bold text-white">Command Board</h2>
        <p className="text-slate-400 mt-1 text-sm md:text-base font-medium italic">Tactical deployment and mission readiness.</p>
      </header>

      {/* Playoff Qualification Section */}
      <section className="bg-slate-900/60 border border-slate-800 rounded-3xl md:rounded-[2.5rem] p-5 md:p-8 shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 right-0 p-8 opacity-5 hidden md:block">
          <ShieldCheck className="w-48 h-48 text-indigo-500" />
        </div>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Target className="w-6 h-6 text-indigo-500" />
              <h3 className="text-xl md:text-2xl font-black text-white">Qualified for Playoffs</h3>
            </div>
            <p className="text-slate-400 text-sm max-w-lg">Each operator requires a minimum of <span className="text-white font-bold">4 games in 8-Ball</span> and <span className="text-white font-bold">4 games in 9-Ball</span> to attain full combat eligibility.</p>
          </div>
          <div className="bg-slate-950 px-6 py-4 rounded-3xl border border-slate-800 text-center shrink-0">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-1">Squad Readiness</p>
            <p className="text-2xl md:text-3xl font-black text-white">{qualifiedCount} <span className="text-slate-600">/ {players.length}</span></p>
          </div>
        </div>

        {unqualifiedPlayers.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 relative z-10">
            {unqualifiedPlayers.map(player => (
              <div key={player.id} className="bg-slate-950/50 border border-slate-800 rounded-2xl md:rounded-3xl p-5 hover:border-slate-700 transition-all group">
                <div className="flex justify-between items-start mb-4">
                  <p className="font-bold text-slate-200 group-hover:text-indigo-400 transition-colors text-sm md:text-base">{player.name}</p>
                  <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                </div>
                
                <div className="space-y-4">
                  {/* 8-Ball Progress */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">8-Ball Track</span>
                      <span className={`text-xs font-black ${player.games8Ball >= 4 ? 'text-emerald-500' : 'text-indigo-400'}`}>
                        {player.games8Ball >= 4 ? 'VALIDATED' : `${player.games8Ball}/4`}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${player.games8Ball >= 4 ? 'bg-emerald-500' : 'bg-indigo-500'}`} 
                        style={{ width: `${Math.min((player.games8Ball / 4) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* 9-Ball Progress */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">9-Ball Track</span>
                      <span className={`text-xs font-black ${player.games9Ball >= 4 ? 'text-emerald-500' : 'text-pink-400'}`}>
                        {player.games9Ball >= 4 ? 'VALIDATED' : `${player.games9Ball}/4`}
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-1000 ${player.games9Ball >= 4 ? 'bg-emerald-500' : 'bg-pink-500'}`} 
                        style={{ width: `${Math.min((player.games9Ball / 4) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 md:py-12 text-center bg-emerald-500/5 border border-dashed border-emerald-500/20 rounded-3xl">
            <CheckCircle2 className="w-10 md:w-12 h-10 md:h-12 text-emerald-500 mb-4" />
            <h4 className="text-lg md:text-xl font-black text-white">Full Squad Readiness</h4>
            <p className="text-emerald-500/60 font-bold uppercase text-[10px] tracking-widest mt-1">All operators have met mission quotas</p>
          </div>
        )}
      </section>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-slate-900 border border-slate-800 p-5 md:p-6 rounded-[2rem] shadow-xl hover:border-indigo-500/30 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Season Intensity</p>
              <h3 className="text-3xl md:text-4xl font-black mt-2 text-white">{total8Ball + total9Ball}</h3>
              <p className="text-slate-600 text-[10px] font-bold mt-1 uppercase">Total Combined Games</p>
            </div>
            <div className="p-3 bg-indigo-500/10 rounded-2xl text-indigo-400 shrink-0">
              <TrendingUp className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 md:p-6 rounded-[2rem] shadow-xl hover:border-emerald-500/30 transition-all">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Playoff Eligibility</p>
              <h3 className="text-3xl md:text-4xl font-black mt-2 text-white">{qualifiedCount} <span className="text-lg text-slate-600">/ {players.length}</span></h3>
              <p className="text-slate-600 text-[10px] font-bold mt-1 uppercase">Squad Validation Status</p>
            </div>
            <div className="p-3 bg-emerald-500/10 rounded-2xl text-emerald-400 shrink-0">
              <CheckCircle2 className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 md:p-6 rounded-[2rem] shadow-xl hover:border-amber-500/30 transition-all sm:col-span-2 md:col-span-1">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">Intelligence Data</p>
              <div className="mt-2 space-y-1">
                <div className="flex justify-between items-center gap-4">
                  <span className="text-[10px] font-black text-indigo-400 uppercase">Avg 8-Ball SL:</span>
                  <span className="text-lg font-black text-slate-200">{avgSkill8}</span>
                </div>
                <div className="flex justify-between items-center gap-4">
                  <span className="text-[10px] font-black text-pink-400 uppercase">Avg 9-Ball SL:</span>
                  <span className="text-lg font-black text-slate-200">{avgSkill9}</span>
                </div>
              </div>
            </div>
            <div className="p-3 bg-slate-800 rounded-2xl text-slate-400 shrink-0">
              <Users className="w-5 h-5 md:w-6 md:h-6" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
        <div className="bg-slate-900 border border-slate-800 p-5 md:p-8 rounded-3xl md:rounded-[2.5rem] shadow-xl">
          <h4 className="text-base md:text-lg font-black text-white mb-6 md:mb-8 flex items-center gap-3">
            <div className="w-1.5 h-6 bg-indigo-500 rounded-full"></div>
            Operator Activity Profile
          </h4>
          <div className="h-[250px] md:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="name" stroke="#64748b" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                <YAxis stroke="#64748b" fontSize={10} fontWeight="bold" tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{ fill: '#1e293b', radius: 12 }}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '15px', fontSize: '12px' }}
                />
                <Bar dataKey="8-Ball" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={15} />
                <Bar dataKey="9-Ball" fill="#ec4899" radius={[4, 4, 0, 0]} barSize={15} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-5 md:p-8 rounded-3xl md:rounded-[2.5rem] shadow-xl flex flex-col items-center">
          <h4 className="text-base md:text-lg font-black text-white mb-6 md:mb-8 w-full flex items-center gap-3">
             <div className="w-1.5 h-6 bg-pink-500 rounded-full"></div>
             Squad Format Distribution
          </h4>
          <div className="h-[250px] md:h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                   contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '15px', fontSize: '12px' }}
                />
                <Legend 
                  iconType="circle" 
                  formatter={(value) => <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
