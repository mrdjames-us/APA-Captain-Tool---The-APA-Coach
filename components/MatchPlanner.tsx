
import React, { useState, useMemo, useEffect } from 'react';
import { Player, SkillLevel, Match, GameType, User } from '../types';
import { suggestLineup } from '../services/gemini';
import { Sparkles, BrainCircuit, Save, Swords, Target, Users, Check, X, CloudUpload, FileEdit, CheckCircle2 } from 'lucide-react';

interface MatchPlannerProps {
  players: Player[];
  onMatchComplete: (match: Match) => void;
  user: User;
}

export const MatchPlanner: React.FC<MatchPlannerProps> = ({ players, onMatchComplete, user }) => {
  const [opponentTeamName, setOpponentTeamName] = useState('');
  const [opponentSkills, setOpponentSkills] = useState<SkillLevel[]>(new Array(10).fill(3));
  const [assignments, setAssignments] = useState<(string | null)[]>(new Array(10).fill(null));
  const [results, setResults] = useState<('Win' | 'Loss' | null)[]>(new Array(10).fill(null));
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const PROGRESS_KEY = `cuemaster_inprogress_${user.id}`;

  // Load in-progress match on mount
  useEffect(() => {
    const saved = localStorage.getItem(PROGRESS_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setOpponentTeamName(data.opponentTeamName || '');
        setOpponentSkills(data.opponentSkills || new Array(10).fill(3));
        setAssignments(data.assignments || new Array(10).fill(null));
        setResults(data.results || new Array(10).fill(null));
      } catch (e) {
        console.error("Failed to restore battle progress", e);
      }
    }
  }, [PROGRESS_KEY]);

  const handleSaveProgress = () => {
    const data = {
      opponentTeamName,
      opponentSkills,
      assignments,
      results
    };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(data));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const skillTotal8Ball = useMemo(() => {
    return [0, 1, 2, 3, 4].reduce((sum, idx) => {
      const p = players.find(player => player.id === assignments[idx]);
      return sum + (p?.skillLevel8Ball || 0);
    }, 0);
  }, [assignments, players]);

  const skillTotal9Ball = useMemo(() => {
    return [5, 6, 7, 8, 9].reduce((sum, idx) => {
      const p = players.find(player => player.id === assignments[idx]);
      return sum + (p?.skillLevel9Ball || 0);
    }, 0);
  }, [assignments, players]);

  const handleSuggest = async () => {
    setIsLoading(true);
    const result = await suggestLineup(players, opponentSkills, assignments);
    if (result && result.assignments) {
      const mergedAssignments = assignments.map((current, idx) => {
        return current ? current : result.assignments[idx];
      });
      setAssignments(mergedAssignments);
    }
    setIsLoading(false);
  };

  const finalizeMatch = () => {
    const slots = assignments.map((pid, idx) => ({
      id: idx,
      gameType: idx < 5 ? GameType.EIGHT_BALL : GameType.NINE_BALL,
      opponentSkill: opponentSkills[idx],
      assignedPlayerId: pid,
      result: results[idx]
    }));

    const totalWins = results.filter(r => r === 'Win').length;
    const totalLosses = results.filter(r => r === 'Loss').length;

    onMatchComplete({
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString(),
      opponentTeamName: opponentTeamName || "Unknown Opponent",
      slots,
      totalWins,
      totalLosses
    });

    // Clear local storage and state
    localStorage.removeItem(PROGRESS_KEY);
    setAssignments(new Array(10).fill(null));
    setResults(new Array(10).fill(null));
    setOpponentTeamName('');
    setShowConfirm(false);
  };

  const isReady = assignments.some(a => a !== null) && 
                  skillTotal8Ball <= 23 && 
                  skillTotal9Ball <= 23;

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-32">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <Swords className="text-indigo-500 w-8 h-8" />
            Tactical War Room
          </h2>
          <p className="text-slate-400 mt-1">Live matchup tracking & battle state persistence.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button 
            onClick={handleSaveProgress}
            className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all border ${
              isSaved 
              ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' 
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {isSaved ? <CheckCircle2 className="w-5 h-5 animate-in zoom-in" /> : <CloudUpload className="w-5 h-5" />}
            <span>{isSaved ? 'Progress Synced' : 'Sync Battle State'}</span>
          </button>
          
          <button 
            onClick={handleSuggest}
            disabled={isLoading || players.length === 0}
            className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-xl shadow-indigo-500/20"
          >
            {isLoading ? <BrainCircuit className="w-5 h-5 animate-pulse" /> : <Sparkles className="w-5 h-5" />}
            <span>AI Matchup Engine</span>
          </button>
        </div>
      </header>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <FileEdit className="w-20 h-20 text-indigo-500" />
        </div>
        <label className="text-xs font-black text-slate-500 uppercase tracking-widest block mb-2">Opposing Team</label>
        <input 
          type="text" 
          placeholder="e.g. Corner Pocket Kings" 
          value={opponentTeamName}
          onChange={(e) => setOpponentTeamName(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-3 text-lg font-bold text-indigo-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-all relative z-10"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className={`p-6 rounded-3xl border transition-colors ${skillTotal8Ball > 23 ? 'bg-rose-500/10 border-rose-500' : 'bg-slate-900 border-slate-800'}`}>
          <div className="flex justify-between items-start">
            <p className="text-slate-400 text-xs font-bold uppercase mb-2">8-Ball Budget</p>
            {skillTotal8Ball > 23 && <span className="text-[10px] font-black text-rose-500 uppercase animate-pulse">OVER BUDGET</span>}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black">{skillTotal8Ball}</span>
            <span className="text-lg text-slate-600">/ 23</span>
          </div>
        </div>
        <div className={`p-6 rounded-3xl border transition-colors ${skillTotal9Ball > 23 ? 'bg-rose-500/10 border-rose-500' : 'bg-slate-900 border-slate-800'}`}>
          <div className="flex justify-between items-start">
            <p className="text-slate-400 text-xs font-bold uppercase mb-2">9-Ball Budget</p>
            {skillTotal9Ball > 23 && <span className="text-[10px] font-black text-rose-500 uppercase animate-pulse">OVER BUDGET</span>}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-4xl font-black">{skillTotal9Ball}</span>
            <span className="text-lg text-slate-600">/ 23</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {[
          { type: '8-Ball', start: 0, color: 'indigo' },
          { type: '9-Ball', start: 5, color: 'pink' }
        ].map(section => (
          <div key={section.type} className="space-y-4">
            <h3 className={`text-xl font-bold flex items-center gap-2 text-${section.color}-400`}>
               <div className={`w-1.5 h-6 bg-${section.color}-500 rounded-full`}></div>
               {section.type} Matches
            </h3>
            <div className="space-y-3">
              {new Array(5).fill(null).map((_, i) => {
                const gameIdx = section.start + i;
                return (
                  <div key={gameIdx} className="bg-slate-900/60 border border-slate-800 rounded-3xl p-5 hover:bg-slate-900 transition-all">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center font-black text-xs text-slate-500">
                        {gameIdx + 1}
                      </div>
                      <select 
                        value={assignments[gameIdx] || ''}
                        onChange={(e) => {
                          const na = [...assignments];
                          na[gameIdx] = e.target.value || null;
                          setAssignments(na);
                        }}
                        className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm font-bold text-white outline-none"
                      >
                        <option value="">Select Player</option>
                        {players.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.name} (SL {gameIdx < 5 ? p.skillLevel8Ball : p.skillLevel9Ball})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex justify-between items-center">
                       <div className="flex items-center gap-3">
                         <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Opponent SL:</span>
                         <select 
                           value={opponentSkills[gameIdx]}
                           onChange={(e) => {
                             const ns = [...opponentSkills];
                             ns[gameIdx] = Number(e.target.value) as SkillLevel;
                             setOpponentSkills(ns);
                           }}
                           className="bg-slate-800 rounded-lg px-2 py-1 text-xs font-bold outline-none"
                         >
                           {[1,2,3,4,5,6,7].map(s => <option key={s} value={s}>{s}</option>)}
                         </select>
                       </div>
                       <div className="flex gap-2">
                         <button 
                            onClick={() => {
                              const nr = [...results];
                              nr[gameIdx] = nr[gameIdx] === 'Win' ? null : 'Win';
                              setResults(nr);
                            }}
                            className={`p-2 rounded-xl border transition-all ${results[gameIdx] === 'Win' ? 'bg-emerald-500 border-emerald-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-emerald-400'}`}
                         >
                           <Check className="w-4 h-4" />
                         </button>
                         <button 
                            onClick={() => {
                              const nr = [...results];
                              nr[gameIdx] = nr[gameIdx] === 'Loss' ? null : 'Loss';
                              setResults(nr);
                            }}
                            className={`p-2 rounded-xl border transition-all ${results[gameIdx] === 'Loss' ? 'bg-rose-500 border-rose-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-rose-400'}`}
                         >
                           <X className="w-4 h-4" />
                         </button>
                       </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50">
        {!showConfirm ? (
          <button 
            disabled={!isReady}
            onClick={() => setShowConfirm(true)}
            className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white px-10 py-5 rounded-full font-black transition-all shadow-2xl shadow-indigo-500/40 text-sm uppercase tracking-widest border border-indigo-400/20"
          >
            <Save className="w-5 h-5" />
            Finalize Match Report
          </button>
        ) : (
          <div className="bg-slate-900 border border-slate-700 p-8 rounded-[3rem] shadow-2xl flex flex-col items-center gap-6 animate-in slide-in-from-bottom-12 duration-500">
            <div className="text-center">
              <h4 className="text-2xl font-black text-white">Confirm Results?</h4>
              <p className="text-sm text-slate-500 mt-2">This will record session stats and clear battle progress.</p>
            </div>
            <div className="flex gap-4 w-full">
              <button onClick={finalizeMatch} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-3xl font-black text-xs uppercase transition-colors">Confirm</button>
              <button onClick={() => setShowConfirm(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-4 rounded-3xl font-black text-xs uppercase transition-colors">Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
