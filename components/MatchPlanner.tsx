
import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Player, SkillLevel, Match, GameType } from '../types';
import { suggestLineup } from '../services/gemini';
import {
  Sparkles, Save, Check, X, CloudUpload, CheckCircle2, Loader2, Cpu,
} from 'lucide-react';

interface MatchPlannerProps {
  players: Player[];
  onMatchComplete: (match: Match) => void;
  userId: string;
  opponentFromSchedule?: string;
}

const SKILL_LEVELS: SkillLevel[] = [1, 2, 3, 4, 5, 6, 7];

export const MatchPlanner: React.FC<MatchPlannerProps> = ({
  players, onMatchComplete, userId, opponentFromSchedule,
}) => {
  const PROGRESS_KEY = `apa_inprogress_${userId}`;

  const [opponentTeamName, setOpponentTeamName] = useState(opponentFromSchedule || '');
  const [opponentSkills, setOpponentSkills] = useState<SkillLevel[]>(new Array(10).fill(3) as SkillLevel[]);
  const [assignments, setAssignments] = useState<(string | null)[]>(new Array(10).fill(null));
  const [results, setResults] = useState<('Win' | 'Loss' | null)[]>(new Array(10).fill(null));
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saved, setSaved] = useState(false);

  // Load in-progress state
  useEffect(() => {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      if (d.opponentTeamName) setOpponentTeamName(d.opponentTeamName);
      if (d.opponentSkills)   setOpponentSkills(d.opponentSkills);
      if (d.assignments)      setAssignments(d.assignments);
      if (d.results)          setResults(d.results);
    } catch {}
  }, [PROGRESS_KEY]);

  // Pre-fill opponent from schedule
  useEffect(() => {
    if (opponentFromSchedule) setOpponentTeamName(opponentFromSchedule);
  }, [opponentFromSchedule]);

  const saveProgress = useCallback(() => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ opponentTeamName, opponentSkills, assignments, results }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }, [PROGRESS_KEY, opponentTeamName, opponentSkills, assignments, results]);

  const skillTotal8 = useMemo(() =>
    [0,1,2,3,4].reduce((s, i) => s + (players.find(p => p.id === assignments[i])?.skillLevel8Ball || 0), 0),
    [assignments, players]);

  const skillTotal9 = useMemo(() =>
    [5,6,7,8,9].reduce((s, i) => s + (players.find(p => p.id === assignments[i])?.skillLevel9Ball || 0), 0),
    [assignments, players]);

  const handleSuggest = async () => {
    setIsLoading(true);
    const result = await suggestLineup(players, opponentSkills, assignments);
    if (result?.assignments) {
      setAssignments(prev => prev.map((cur, i) => cur || result.assignments[i] || null));
    }
    setIsLoading(false);
  };

  const finalizeMatch = () => {
    const slots = assignments.map((pid, idx) => ({
      id: idx,
      gameType: idx < 5 ? GameType.EIGHT_BALL : GameType.NINE_BALL,
      opponentSkill: opponentSkills[idx],
      assignedPlayerId: pid,
      result: results[idx],
    }));
    onMatchComplete({
      id: Math.random().toString(36).slice(2, 11),
      date: new Date().toISOString(),
      opponentTeamName: opponentTeamName || 'Unknown Opponent',
      slots,
      totalWins: results.filter(r => r === 'Win').length,
      totalLosses: results.filter(r => r === 'Loss').length,
    });
    localStorage.removeItem(PROGRESS_KEY);
    setAssignments(new Array(10).fill(null));
    setResults(new Array(10).fill(null));
    setOpponentTeamName('');
    setShowConfirm(false);
  };

  const isReady = assignments.some(Boolean) && skillTotal8 <= 23 && skillTotal9 <= 23;
  const over8 = skillTotal8 > 23;
  const over9 = skillTotal9 > 23;

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-orbitron font-black text-2xl md:text-3xl tracking-wider text-glow-cyan" style={{ color: '#00E5FF' }}>
            MATCH PLANNER
          </h2>
          <p className="text-sm mt-1" style={{ color: 'rgba(208,232,255,0.78)' }}>
            Rule of 23 · AI lineup optimisation
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={saveProgress}
            className={`btn-neon flex items-center gap-2 px-5 py-2.5 rounded text-xs font-bold uppercase tracking-widest ${saved ? 'text-neon-green' : ''}`}
            style={saved ? { borderColor: '#00FF88', color: '#00FF88', textShadow: '0 0 10px rgba(0,255,136,0.7)' } : undefined}>
            {saved ? <CheckCircle2 className="w-4 h-4" /> : <CloudUpload className="w-4 h-4" />}
            {saved ? 'SAVED' : 'SAVE STATE'}
          </button>
          <button onClick={handleSuggest} disabled={isLoading || players.length === 0}
            className="btn-neon-gold flex items-center gap-2 px-5 py-2.5 rounded text-xs font-bold uppercase tracking-widest disabled:opacity-40">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            AI SUGGEST
          </button>
        </div>
      </header>

      {/* Opponent */}
      <div className="card rounded p-5">
        <label className="section-label block mb-2">Opposing Team</label>
        <input
          type="text"
          placeholder="e.g. Corner Pocket Kings"
          value={opponentTeamName}
          onChange={e => setOpponentTeamName(e.target.value)}
          className="input-neon w-full px-4 py-3 text-lg font-bold rounded"
          style={{ color: '#00E5FF', fontSize: '1.1rem' }}
        />
      </div>

      {/* Budget meters */}
      <div className="grid grid-cols-2 gap-4">
        {[
          { label: '8-Ball Budget', total: skillTotal8, over: over8 },
          { label: '9-Ball Budget', total: skillTotal9, over: over9 },
        ].map(({ label, total, over }) => (
          <div key={label} className="card rounded p-5 transition-all"
            style={over ? { borderColor: '#FF0066', boxShadow: '0 0 20px rgba(255,0,102,0.2)' } : undefined}>
            <p className="section-label mb-2">{label}</p>
            <div className="flex items-baseline gap-2">
              <span className="stat-num" style={{ color: over ? '#FF0066' : '#D0E8FF', textShadow: over ? '0 0 12px rgba(255,0,102,0.8)' : undefined }}>
                {total}
              </span>
              <span className="font-mono text-lg" style={{ color: 'rgba(208,232,255,0.65)' }}>/ 23</span>
              {over && <span className="section-label animate-pulse" style={{ color: '#FF0066' }}>OVER</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Slot columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[
          { label: '8-BALL MATCHES', start: 0, color: '#00E5FF' },
          { label: '9-BALL MATCHES', start: 5, color: '#FF0066' },
        ].map(({ label, start, color }) => (
          <div key={label} className="space-y-3">
            <h3 className="section-label" style={{ color }}>{label}</h3>
            {Array.from({ length: 5 }, (_, i) => {
              const idx = start + i;
              const win  = results[idx] === 'Win';
              const loss = results[idx] === 'Loss';
              return (
                <div key={idx} className="card rounded p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs w-6 shrink-0" style={{ color: 'rgba(208,232,255,0.65)' }}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <select
                      value={assignments[idx] || ''}
                      onChange={e => { const a = [...assignments]; a[idx] = e.target.value || null; setAssignments(a); }}
                      className="input-neon flex-1 px-3 py-2 text-sm font-bold rounded"
                    >
                      <option value="">— Select Player —</option>
                      {players.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} · SL {idx < 5 ? p.skillLevel8Ball : p.skillLevel9Ball}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="section-label" style={{ color: 'rgba(208,232,255,0.75)' }}>Opp SL</span>
                      <select
                        value={opponentSkills[idx]}
                        onChange={e => { const s = [...opponentSkills]; s[idx] = Number(e.target.value) as SkillLevel; setOpponentSkills(s); }}
                        className="input-neon px-2 py-1 text-xs font-mono rounded w-14"
                      >
                        {SKILL_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => { const r = [...results]; r[idx] = win ? null : 'Win'; setResults(r); }}
                        className="px-3 py-1.5 rounded text-xs font-orbitron font-bold transition-all"
                        style={win
                          ? { background: 'rgba(0,255,136,0.15)', border: '1px solid #00FF88', color: '#00FF88', boxShadow: '0 0 12px rgba(0,255,136,0.4)' }
                          : { background: 'transparent', border: '1px solid rgba(208,232,255,0.3)', color: 'rgba(208,232,255,0.7)' }}>
                        W
                      </button>
                      <button onClick={() => { const r = [...results]; r[idx] = loss ? null : 'Loss'; setResults(r); }}
                        className="px-3 py-1.5 rounded text-xs font-orbitron font-bold transition-all"
                        style={loss
                          ? { background: 'rgba(255,0,102,0.15)', border: '1px solid #FF0066', color: '#FF0066', boxShadow: '0 0 12px rgba(255,0,102,0.4)' }
                          : { background: 'transparent', border: '1px solid rgba(208,232,255,0.3)', color: 'rgba(208,232,255,0.7)' }}>
                        L
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Floating finalize button */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50">
        {!showConfirm ? (
          <button disabled={!isReady} onClick={() => setShowConfirm(true)}
            className="btn-solid-cyan flex items-center gap-3 px-10 py-4 rounded text-sm font-orbitron font-bold uppercase tracking-widest disabled:opacity-40 shadow-2xl">
            <Save className="w-5 h-5" /> FINALIZE MATCH
          </button>
        ) : (
          <div className="card rounded p-8 flex flex-col items-center gap-6 shadow-2xl"
            style={{ border: '1px solid rgba(0,229,255,0.4)', boxShadow: '0 0 60px rgba(0,229,255,0.15)' }}>
            <div className="text-center">
              <h4 className="font-orbitron font-black text-lg text-white">CONFIRM RESULTS?</h4>
              <p className="text-xs mt-2" style={{ color: 'rgba(208,232,255,0.75)' }}>Records stats · clears match state</p>
            </div>
            <div className="flex gap-4 w-full">
              <button onClick={finalizeMatch}
                className="flex-1 btn-solid-cyan py-3 rounded font-orbitron text-xs font-bold uppercase tracking-widest">
                CONFIRM
              </button>
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded font-orbitron text-xs font-bold uppercase tracking-widest transition-all"
                style={{ border: '1px solid rgba(208,232,255,0.35)', color: 'rgba(208,232,255,0.75)' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(208,232,255,0.65)')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(208,232,255,0.35)')}>
                CANCEL
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
