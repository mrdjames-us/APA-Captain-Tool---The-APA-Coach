import React, { useState, useEffect, useCallback } from 'react';
import { Crosshair, Loader2, AlertTriangle, Target, TrendingUp, Users2 } from 'lucide-react';
import { APAConnection, APARoster, APARosterPlayer } from '../types';
import { apaTeam, apaScout } from '../services/apaApi';

interface Props {
  connection: APAConnection | null;
}

interface Opponent {
  id: number;
  name: string;
  number: string;
  week: number;
}

// Greedy "likely strong 5" under the APA 23-rule: opponents tend to field their
// most productive players, so pick by PPM while keeping the SL sum <= 23.
function projectLineup(players: APARosterPlayer[]): { lineup: APARosterPlayer[]; total: number } {
  const pool = [...players]
    .filter(p => typeof p.skillLevel === 'number')
    .sort((a, b) => (b.ppm || 0) - (a.ppm || 0));
  const lineup: APARosterPlayer[] = [];
  let total = 0;
  for (const p of pool) {
    const sl = p.skillLevel || 0;
    if (lineup.length >= 5) break;
    if (total + sl <= 23) { lineup.push(p); total += sl; }
  }
  return { lineup, total };
}

const winPct = (p: APARosterPlayer) =>
  p.matchesPlayed > 0 ? Math.round((p.matchesWon / p.matchesPlayed) * 100) : 0;

export const Scouting: React.FC<Props> = ({ connection }) => {
  const [opponents, setOpponents] = useState<Opponent[]>([]);
  const [loadingSched, setLoadingSched] = useState(false);
  const [scouting, setScouting] = useState<number | null>(null);
  const [report, setReport] = useState<{ opponent: Opponent; roster: APARoster } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeTeamId = connection?.activeTeamId ?? null;

  const loadSchedule = useCallback(async () => {
    if (!connection || !activeTeamId) return;
    setLoadingSched(true); setError(null);
    try {
      const res = await apaTeam(connection.deviceRefreshToken, activeTeamId);
      const seen = new Set<number>();
      const opps: Opponent[] = [];
      for (const m of res.schedule.matches) {
        if (m.isBye || m.isFinalized || !m.opponent) continue;
        if (seen.has(m.opponent.id)) continue;
        seen.add(m.opponent.id);
        opps.push({ id: m.opponent.id, name: m.opponent.name, number: m.opponent.number, week: m.week });
      }
      setOpponents(opps);
    } catch (err: any) {
      setError(err.message || 'Could not load your schedule.');
    } finally {
      setLoadingSched(false);
    }
  }, [connection, activeTeamId]);

  useEffect(() => { loadSchedule(); }, [loadSchedule]);

  const scout = async (opp: Opponent) => {
    if (!connection) return;
    setScouting(opp.id); setError(null); setReport(null);
    try {
      const res = await apaScout(connection.deviceRefreshToken, opp.id);
      setReport({ opponent: opp, roster: res.roster });
    } catch (err: any) {
      setError(err.message || 'Could not scout that team.');
    } finally {
      setScouting(null);
    }
  };

  if (!connection) {
    return (
      <div className="space-y-4">
        <Header />
        <div className="flex items-start gap-2 px-4 py-3 rounded text-sm max-w-lg"
          style={{ background: 'rgba(57,167,201,0.05)', border: '1px solid rgba(57,167,201,0.2)', color: 'rgba(239,231,214,0.8)' }}>
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: '#39A7C9' }} />
          <span>Connect your APA account in the <strong>APA Sync</strong> tab to scout opponents from your schedule.</span>
        </div>
      </div>
    );
  }

  const sortedRoster = report
    ? [...report.roster.players].sort((a, b) => winPct(b) - winPct(a) || (b.ppm || 0) - (a.ppm || 0))
    : [];
  const projection = report ? projectLineup(report.roster.players) : null;
  const rated = report ? report.roster.players.filter(p => typeof p.skillLevel === 'number') : [];
  const avgSL = rated.length ? (rated.reduce((s, p) => s + (p.skillLevel || 0), 0) / rated.length).toFixed(1) : '—';

  return (
    <div className="space-y-6">
      <Header />

      {error && (
        <div className="flex items-start gap-2 px-4 py-3 rounded text-sm"
          style={{ background: 'rgba(209,74,60,0.08)', border: '1px solid rgba(209,74,60,0.3)', color: '#ff87b0' }}>
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}

      {/* Opponent picker */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="section-label">Upcoming Opponents</span>
          {loadingSched && <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#39A7C9' }} />}
        </div>
        {opponents.length === 0 && !loadingSched ? (
          <p className="text-sm" style={{ color: 'rgba(239,231,214,0.5)' }}>No upcoming opponents found on this team's schedule.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {opponents.map(o => {
              const active = report?.opponent.id === o.id;
              return (
                <button key={o.id} onClick={() => scout(o)} disabled={scouting !== null}
                  className="flex items-center gap-2 px-3 py-2 rounded text-sm font-bold"
                  style={{
                    background: active ? '#39A7C9' : 'rgba(57,167,201,0.06)',
                    color: active ? '#0A1F17' : '#39A7C9',
                    border: '1px solid rgba(57,167,201,0.25)',
                  }}>
                  {scouting === o.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}
                  <span>Wk {o.week} · {o.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Scouting report */}
      {report && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat icon={Users2} label="Players" value={String(report.roster.players.length)} />
            <Stat icon={Target} label="Avg Skill" value={avgSL} />
            <Stat icon={TrendingUp} label="Top Threat" value={sortedRoster[0] ? `${winPct(sortedRoster[0])}%` : '—'}
              sub={sortedRoster[0]?.name} />
            <Stat icon={Crosshair} label="Likely 5 (SL)" value={projection ? String(projection.total) : '—'}
              sub={projection ? `${projection.lineup.length} players ≤23` : undefined} />
          </div>

          <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(57,167,201,0.15)' }}>
            <div className="px-4 py-3 text-sm font-bold text-white" style={{ background: 'rgba(57,167,201,0.05)' }}>
              {report.opponent.name} ({report.opponent.number}) — roster, ranked by win rate
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: 'rgba(239,231,214,0.5)' }} className="text-left text-xs">
                  <th className="px-4 py-2 font-medium">Player</th>
                  <th className="px-4 py-2 font-medium">SL</th>
                  <th className="px-4 py-2 font-medium">Win%</th>
                  <th className="px-4 py-2 font-medium">W/P</th>
                  <th className="px-4 py-2 font-medium">PPM</th>
                  <th className="px-4 py-2 font-medium">Likely</th>
                </tr>
              </thead>
              <tbody>
                {sortedRoster.map((p, i) => {
                  const inLineup = projection?.lineup.some(l => l.memberNumber === p.memberNumber);
                  return (
                    <tr key={i} style={{ borderTop: '1px solid rgba(57,167,201,0.06)' }}>
                      <td className="px-4 py-2 text-white">{p.name}</td>
                      <td className="px-4 py-2 font-mono" style={{ color: '#39A7C9' }}>{p.skillLevel ?? '—'}</td>
                      <td className="px-4 py-2 font-mono" style={{ color: winPct(p) >= 60 ? '#ff6b9d' : 'rgba(239,231,214,0.7)' }}>{winPct(p)}%</td>
                      <td className="px-4 py-2 font-mono" style={{ color: 'rgba(239,231,214,0.6)' }}>{p.matchesWon}/{p.matchesPlayed}</td>
                      <td className="px-4 py-2 font-mono" style={{ color: 'rgba(239,231,214,0.6)' }}>{p.ppm?.toFixed(2)}</td>
                      <td className="px-4 py-2">{inLineup && <span style={{ color: '#39C46B' }}>●</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-[11px]" style={{ color: 'rgba(239,231,214,0.4)' }}>
            "Likely 5" is a projection of their strongest PPM-weighted lineup that stays under the 23 cap — a planning aid, not a guarantee of who they'll field.
          </p>
        </div>
      )}
    </div>
  );
};

const Header = () => (
  <div className="flex items-center gap-3">
    <Crosshair className="w-6 h-6" style={{ color: '#39A7C9' }} />
    <div>
      <h1 className="font-orbitron font-black text-xl text-white tracking-wide">SCOUTING</h1>
      <p className="text-xs" style={{ color: 'rgba(239,231,214,0.5)' }}>
        Live opponent rosters & skill levels from poolplayers.com
      </p>
    </div>
  </div>
);

const Stat: React.FC<{ icon: React.ElementType; label: string; value: string; sub?: string }> = ({ icon: Icon, label, value, sub }) => (
  <div className="p-3 rounded-lg" style={{ background: 'rgba(9,30,22,0.6)', border: '1px solid rgba(57,167,201,0.12)' }}>
    <div className="flex items-center gap-1.5 mb-1">
      <Icon className="w-3.5 h-3.5" style={{ color: 'rgba(57,167,201,0.7)' }} />
      <span className="section-label">{label}</span>
    </div>
    <p className="font-orbitron font-black text-lg" style={{ color: '#39A7C9' }}>{value}</p>
    {sub && <p className="text-[11px] truncate" style={{ color: 'rgba(239,231,214,0.5)' }}>{sub}</p>}
  </div>
);
