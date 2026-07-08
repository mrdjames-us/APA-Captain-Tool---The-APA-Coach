import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Player, SkillLevel, Match, GameType, APAConnection, APARosterPlayer, PlannerContext } from '../types';
import { apaScout } from '../services/apaApi';
import {
  Sparkles, Save, CloudUpload, CheckCircle2, Loader2, Globe, AlertTriangle, Users2,
} from 'lucide-react';

interface MatchPlannerProps {
  players: Player[];
  connection?: APAConnection | null;
  onMatchComplete: (match: Match) => void;
  userId: string;
  context?: PlannerContext;
}

const SKILL_LEVELS: SkillLevel[] = [1, 2, 3, 4, 5, 6, 7];
const SLOTS = 5;
const CAP = 23;

const clampSL = (n: number | null | undefined): SkillLevel =>
  Math.max(1, Math.min(7, Math.round(n || 3))) as SkillLevel;

// Greedy "best legal 5" for one format: prioritise players who still need
// qualifying games (< 4 played), then by win rate, filling under the 23 cap
// without reusing a player. Only fills slots that are still empty.
function suggestFormatLineup(
  players: Player[],
  format: 'EIGHT' | 'NINE',
  current: (string | null)[]
): (string | null)[] {
  const sl = (p: Player) => (format === 'EIGHT' ? p.skillLevel8Ball : p.skillLevel9Ball);
  const games = (p: Player) => (format === 'EIGHT' ? p.games8Ball : p.games9Ball);
  const wins = (p: Player) => (format === 'EIGHT' ? p.wins8Ball : p.wins9Ball);

  const next = [...current];
  const used = new Set(next.filter(Boolean) as string[]);
  let budget = CAP - next.reduce((s, id) => s + (id ? sl(players.find(p => p.id === id)!) : 0), 0);

  const pool = [...players].sort((a, b) => {
    const aQual = games(a) < 4, bQual = games(b) < 4;
    if (aQual !== bQual) return aQual ? -1 : 1;
    return wins(b) - wins(a);
  });

  for (let i = 0; i < SLOTS; i++) {
    if (next[i]) continue;
    for (const p of pool) {
      if (used.has(p.id)) continue;
      if (sl(p) > budget) continue;
      next[i] = p.id;
      used.add(p.id);
      budget -= sl(p);
      break;
    }
  }
  return next;
}

export const MatchPlanner: React.FC<MatchPlannerProps> = ({
  players, connection, onMatchComplete, userId, context,
}) => {
  const PROGRESS_KEY = `apa_inprogress_${userId}`;

  const [format, setFormat] = useState<'EIGHT' | 'NINE'>(context?.format || 'EIGHT');
  const [opponentTeamName, setOpponentTeamName] = useState(context?.opponentName || '');
  const [assignments, setAssignments] = useState<(string | null)[]>(new Array(SLOTS).fill(null));
  const [oppAssignments, setOppAssignments] = useState<(string | null)[]>(new Array(SLOTS).fill(null));
  const [oppSkills, setOppSkills] = useState<SkillLevel[]>(new Array(SLOTS).fill(3) as SkillLevel[]);
  const [results, setResults] = useState<('Win' | 'Loss' | null)[]>(new Array(SLOTS).fill(null));
  const [showConfirm, setShowConfirm] = useState(false);
  const [saved, setSaved] = useState(false);

  const [oppRoster, setOppRoster] = useState<APARosterPlayer[] | null>(null);
  const [loadingOpp, setLoadingOpp] = useState(false);
  const [oppError, setOppError] = useState<string | null>(null);

  const is8 = format === 'EIGHT';
  const gameType = is8 ? GameType.EIGHT_BALL : GameType.NINE_BALL;
  const accent = is8 ? '#00E5FF' : '#FF0066';

  // Pull the opponent's roster for this match when we know their team id.
  useEffect(() => {
    let cancelled = false;
    const teamId = context?.opponentApaTeamId;
    if (!teamId || !connection?.deviceRefreshToken) { setOppRoster(null); return; }
    setLoadingOpp(true); setOppError(null); setOppRoster(null);
    apaScout(connection.deviceRefreshToken, teamId)
      .then(res => { if (!cancelled) setOppRoster(res.roster.players); })
      .catch(err => { if (!cancelled) setOppError(err.message || 'Could not load opponent roster.'); })
      .finally(() => { if (!cancelled) setLoadingOpp(false); });
    return () => { cancelled = true; };
  }, [context?.opponentApaTeamId, connection?.deviceRefreshToken]);

  // Sync from context when navigating in from a scheduled match.
  useEffect(() => {
    if (context?.format) setFormat(context.format);
    if (context?.opponentName) setOpponentTeamName(context.opponentName);
    if (context) {
      setAssignments(new Array(SLOTS).fill(null));
      setOppAssignments(new Array(SLOTS).fill(null));
      setOppSkills(new Array(SLOTS).fill(3) as SkillLevel[]);
      setResults(new Array(SLOTS).fill(null));
    }
  }, [context?.scheduleEntryId]);

  const saveProgress = useCallback(() => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ format, opponentTeamName, assignments, oppAssignments, oppSkills, results }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }, [PROGRESS_KEY, format, opponentTeamName, assignments, oppAssignments, oppSkills, results]);

  const skillTotal = useMemo(
    () => assignments.reduce((s, id) => s + (id ? clampSL(is8
      ? players.find(p => p.id === id)?.skillLevel8Ball
      : players.find(p => p.id === id)?.skillLevel9Ball) : 0), 0),
    [assignments, players, is8]
  );
  const over = skillTotal > CAP;

  const handleSuggest = () => {
    setAssignments(prev => suggestFormatLineup(players, format, prev));
  };

  // When an opponent player is chosen for a slot, capture their skill level.
  const pickOpponent = (idx: number, memberNumber: string) => {
    const oa = [...oppAssignments]; oa[idx] = memberNumber || null; setOppAssignments(oa);
    const rp = oppRoster?.find(p => p.memberNumber === memberNumber);
    if (rp) { const s = [...oppSkills]; s[idx] = clampSL(rp.skillLevel); setOppSkills(s); }
  };

  const finalizeMatch = () => {
    const slots = assignments.map((pid, idx) => ({
      id: idx,
      gameType,
      opponentSkill: oppSkills[idx],
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
    setAssignments(new Array(SLOTS).fill(null));
    setOppAssignments(new Array(SLOTS).fill(null));
    setOppSkills(new Array(SLOTS).fill(3) as SkillLevel[]);
    setResults(new Array(SLOTS).fill(null));
    setShowConfirm(false);
  };

  const isReady = assignments.some(Boolean) && !over;
  const usesOpponentRoster = !!oppRoster && oppRoster.length > 0;

  return (
    <div className="space-y-6 pb-32">
      {/* Header */}
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h2 className="font-orbitron font-black text-2xl md:text-3xl tracking-wider text-glow-cyan" style={{ color: accent }}>
            MATCH PLANNER
          </h2>
          <p className="text-sm mt-1" style={{ color: 'rgba(208,232,255,0.78)' }}>
            Rule of 23 · {is8 ? '8-Ball' : '9-Ball'} match
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Format toggle */}
          <div className="flex rounded overflow-hidden" style={{ border: '1px solid rgba(208,232,255,0.25)' }}>
            {(['EIGHT', 'NINE'] as const).map(f => (
              <button key={f} onClick={() => setFormat(f)}
                className="px-4 py-2.5 text-xs font-orbitron font-bold uppercase tracking-widest transition-all"
                style={format === f
                  ? { background: f === 'EIGHT' ? '#00E5FF' : '#FF0066', color: '#00020e' }
                  : { background: 'transparent', color: 'rgba(208,232,255,0.7)' }}>
                {f === 'EIGHT' ? '8-Ball' : '9-Ball'}
              </button>
            ))}
          </div>
          <button onClick={saveProgress}
            className="btn-neon flex items-center gap-2 px-5 py-2.5 rounded text-xs font-bold uppercase tracking-widest"
            style={saved ? { borderColor: '#00FF88', color: '#00FF88' } : undefined}>
            {saved ? <CheckCircle2 className="w-4 h-4" /> : <CloudUpload className="w-4 h-4" />}
            {saved ? 'SAVED' : 'SAVE STATE'}
          </button>
          <button onClick={handleSuggest} disabled={players.length === 0}
            className="btn-neon-gold flex items-center gap-2 px-5 py-2.5 rounded text-xs font-bold uppercase tracking-widest disabled:opacity-40">
            <Sparkles className="w-4 h-4" />
            SUGGEST
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
          style={{ color: accent, fontSize: '1.1rem' }}
        />
        {/* Opponent roster status */}
        <div className="mt-3 text-xs flex items-center gap-2">
          {loadingOpp ? (
            <span style={{ color: 'rgba(0,229,255,0.8)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading opponent roster from poolplayers.com…
            </span>
          ) : oppError ? (
            <span style={{ color: '#ff87b0', display: 'flex', alignItems: 'center', gap: 6 }}>
              <AlertTriangle className="w-3.5 h-3.5" /> {oppError} Enter skill levels manually below.
            </span>
          ) : usesOpponentRoster ? (
            <span style={{ color: '#7dffb8', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Users2 className="w-3.5 h-3.5" /> Opponent roster loaded — pick who they put up and skill levels fill in.
            </span>
          ) : (
            <span style={{ color: 'rgba(208,232,255,0.5)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Globe className="w-3.5 h-3.5" /> Plan a match from the Schedule tab to auto-load the opponent's players.
            </span>
          )}
        </div>
      </div>

      {/* Budget meter */}
      <div className="card rounded p-5 transition-all"
        style={over ? { borderColor: '#FF0066', boxShadow: '0 0 20px rgba(255,0,102,0.2)' } : undefined}>
        <p className="section-label mb-2">{is8 ? '8-Ball' : '9-Ball'} Skill Budget</p>
        <div className="flex items-baseline gap-2">
          <span className="stat-num" style={{ color: over ? '#FF0066' : '#D0E8FF' }}>{skillTotal}</span>
          <span className="font-mono text-lg" style={{ color: 'rgba(208,232,255,0.65)' }}>/ {CAP}</span>
          {over && <span className="section-label animate-pulse" style={{ color: '#FF0066' }}>OVER CAP</span>}
        </div>
      </div>

      {/* Slots */}
      <div className="space-y-3">
        <h3 className="section-label" style={{ color: accent }}>{is8 ? '8-BALL' : '9-BALL'} LINEUP</h3>
        {Array.from({ length: SLOTS }, (_, idx) => {
          const win = results[idx] === 'Win';
          const loss = results[idx] === 'Loss';
          return (
            <div key={idx} className="card rounded p-4 space-y-3">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-mono text-xs w-6 shrink-0" style={{ color: 'rgba(208,232,255,0.65)' }}>
                  {String(idx + 1).padStart(2, '0')}
                </span>
                {/* Your player */}
                <select
                  value={assignments[idx] || ''}
                  onChange={e => { const a = [...assignments]; a[idx] = e.target.value || null; setAssignments(a); }}
                  className="input-neon flex-1 min-w-[160px] px-3 py-2 text-sm font-bold rounded"
                >
                  <option value="">— Your Player —</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id}
                      disabled={assignments.includes(p.id) && assignments[idx] !== p.id}>
                      {p.name} · SL {is8 ? p.skillLevel8Ball : p.skillLevel9Ball}
                    </option>
                  ))}
                </select>

                <span className="font-mono text-xs shrink-0" style={{ color: 'rgba(208,232,255,0.4)' }}>vs</span>

                {/* Opponent: real roster dropdown, or manual SL fallback */}
                {usesOpponentRoster ? (
                  <select
                    value={oppAssignments[idx] || ''}
                    onChange={e => pickOpponent(idx, e.target.value)}
                    className="input-neon flex-1 min-w-[160px] px-3 py-2 text-sm font-bold rounded"
                    style={{ borderColor: 'rgba(255,0,102,0.35)' }}
                  >
                    <option value="">— Opponent —</option>
                    {oppRoster!.map(op => (
                      <option key={op.memberNumber} value={op.memberNumber}
                        disabled={oppAssignments.includes(op.memberNumber) && oppAssignments[idx] !== op.memberNumber}>
                        {op.name} · SL {op.skillLevel ?? '?'} · {op.matchesWon}/{op.matchesPlayed}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="section-label" style={{ color: 'rgba(208,232,255,0.75)' }}>Opp SL</span>
                    <select
                      value={oppSkills[idx]}
                      onChange={e => { const s = [...oppSkills]; s[idx] = Number(e.target.value) as SkillLevel; setOppSkills(s); }}
                      className="input-neon px-2 py-1 text-xs font-mono rounded w-14"
                    >
                      {SKILL_LEVELS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2">
                <button onClick={() => { const r = [...results]; r[idx] = win ? null : 'Win'; setResults(r); }}
                  className="px-3 py-1.5 rounded text-xs font-orbitron font-bold transition-all"
                  style={win
                    ? { background: 'rgba(0,255,136,0.15)', border: '1px solid #00FF88', color: '#00FF88' }
                    : { background: 'transparent', border: '1px solid rgba(208,232,255,0.3)', color: 'rgba(208,232,255,0.7)' }}>
                  W
                </button>
                <button onClick={() => { const r = [...results]; r[idx] = loss ? null : 'Loss'; setResults(r); }}
                  className="px-3 py-1.5 rounded text-xs font-orbitron font-bold transition-all"
                  style={loss
                    ? { background: 'rgba(255,0,102,0.15)', border: '1px solid #FF0066', color: '#FF0066' }
                    : { background: 'transparent', border: '1px solid rgba(208,232,255,0.3)', color: 'rgba(208,232,255,0.7)' }}>
                  L
                </button>
              </div>
            </div>
          );
        })}
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
            style={{ border: '1px solid rgba(0,229,255,0.4)' }}>
            <div className="text-center">
              <h4 className="font-orbitron font-black text-lg text-white">CONFIRM RESULTS?</h4>
              <p className="text-xs mt-2" style={{ color: 'rgba(208,232,255,0.75)' }}>Records {is8 ? '8-ball' : '9-ball'} stats · clears match state</p>
            </div>
            <div className="flex gap-4 w-full">
              <button onClick={finalizeMatch}
                className="flex-1 btn-solid-cyan py-3 rounded font-orbitron text-xs font-bold uppercase tracking-widest">
                CONFIRM
              </button>
              <button onClick={() => setShowConfirm(false)}
                className="flex-1 py-3 rounded font-orbitron text-xs font-bold uppercase tracking-widest transition-all"
                style={{ border: '1px solid rgba(208,232,255,0.35)', color: 'rgba(208,232,255,0.75)' }}>
                CANCEL
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
