
import React, { useState } from 'react';
import { Player, Match, SessionArchive, ScheduleEntry, APAConnection, GameType } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { Archive, Trophy, Target, Calendar, History, Zap, X, Check, Flame, Home, Swords, Users } from 'lucide-react';
import { TrophyCase } from './TrophyCase';

interface PerformanceProps {
  players: Player[];
  matches: Match[];
  archives: SessionArchive[];
  schedule?: ScheduleEntry[];
  connection?: APAConnection | null;
  onArchiveSession: (name: string) => void;
}

const CYAN    = '#39A7C9';
const MAGENTA = '#D14A3C';
const GOLD    = '#F2C14E';
const GREEN   = '#39C46B';

// ── Shared dark tooltip ────────────────────────────────────────────────────────
const NeonTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(10,31,23,0.97)',
      border: '1px solid rgba(57,167,201,0.3)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 11,
      boxShadow: '0 0 20px rgba(57,167,201,0.15)',
    }}>
      <p style={{
        color: 'rgba(239,231,214,0.55)',
        marginBottom: 6,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.1em',
        fontSize: 9,
        fontFamily: 'Orbitron, sans-serif',
      }}>
        {label}
      </p>
      {payload.map((entry: any) => (
        <p key={entry.name} style={{ color: entry.stroke || entry.fill, margin: '2px 0', fontFamily: 'Space Mono, monospace', fontSize: 11 }}>
          {entry.name}: <strong>{entry.value}</strong>
        </p>
      ))}
    </div>
  );
};

// ── Stat card ──────────────────────────────────────────────────────────────────
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  accentColor: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, sub, accentColor }) => (
  <div
    className="card rounded-3xl"
    style={{
      padding: '24px 24px 20px',
      borderColor: `${accentColor}33`,
      boxShadow: `0 0 24px ${accentColor}0d`,
    }}
  >
    <div className="flex items-center gap-3 mb-4">
      <span style={{ color: accentColor }}>{icon}</span>
      <span className="section-label" style={{ color: `${accentColor}dd` }}>{label}</span>
    </div>
    <p
      className="stat-num"
      style={{
        color: accentColor,
        textShadow: `0 0 18px ${accentColor}cc, 0 0 40px ${accentColor}44`,
      }}
    >
      {value}
    </p>
    <p style={{ fontSize: 11, color: 'rgba(239,231,214,0.75)', marginTop: 8, fontFamily: 'Space Mono, monospace' }}>
      {sub}
    </p>
  </div>
);

export const Performance: React.FC<PerformanceProps> = ({
  players,
  matches,
  archives,
  schedule = [],
  connection = null,
  onArchiveSession,
}) => {
  const [isArchiving, setIsArchiving] = useState(false);
  const [sessionName, setSessionName] = useState(
    `Session ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
  );
  // 8-ball and 9-ball are separate teams in this league — scope the whole
  // page to one format at a time instead of blending two teams' records.
  const [format, setFormat] = useState<'EIGHT' | 'NINE'>('EIGHT');
  const is8 = format === 'EIGHT';
  const formatLabel = is8 ? '8-Ball' : '9-Ball';
  const formatAccent = is8 ? CYAN : GOLD;

  // ── Derived stats ─────────────────────────────────────────────────────────────
  // Prefer the synced APA schedule (real season results) when available; fall
  // back to matches recorded locally via the Match Planner for captains who
  // haven't connected APA yet. Both are scoped to the selected format.
  const scheduleHasAnySync = schedule.some(e => e.isScored);
  const seasonMatches = schedule
    .filter(e => e.isScored && e.myPoints != null && e.oppPoints != null && (is8 ? e.format !== 'NINE' : e.format === 'NINE'))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const usingSeasonData = seasonMatches.length > 0;
  const missingFormatSync = scheduleHasAnySync && !usingSeasonData;

  const targetGameType = is8 ? GameType.EIGHT_BALL : GameType.NINE_BALL;
  const localMatchesForFormat = matches.filter(m => m.slots.some(s => s.gameType === targetGameType));

  const seasonWins = seasonMatches.filter(e => (e.myPoints as number) > (e.oppPoints as number)).length;
  const localTotalWins  = localMatchesForFormat.reduce((acc, m) => acc + m.totalWins,   0);
  const localTotalGames = localMatchesForFormat.reduce((acc, m) => acc + m.totalWins + m.totalLosses, 0);

  const totalWins  = usingSeasonData ? seasonWins : localTotalWins;
  const totalGames = usingSeasonData ? seasonMatches.length : localTotalGames;
  const sessionWinRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

  const winRateLabel = `${usingSeasonData ? 'Season' : 'Session'} Win Rate (${formatLabel})`;
  const winRateSub = usingSeasonData
    ? `${totalWins} nights won of ${totalGames} played`
    : `${totalWins} wins from ${totalGames} games`;
  const matchesRunLabel = `${usingSeasonData ? 'Matches Played' : 'Matches Run'} (${formatLabel})`;
  const matchesRunValue = usingSeasonData ? seasonMatches.length : localMatchesForFormat.length;
  const matchesRunSub = usingSeasonData ? 'Synced from poolplayers.com' : 'Current session timeline';

  const activePlayers = players.filter(p => p.isActive);

  // Single-format leaderboard — a player's 8-ball and 9-ball win rates come
  // from two different teams, so they don't belong on the same bar.
  const playerStats = players
    .filter(p => (is8 ? p.games8Ball : p.games9Ball) > 0)
    .map(p => ({
      name: p.name.split(' ')[0],
      winRate: is8
        ? Math.round((p.wins8Ball / p.games8Ball) * 100)
        : Math.round((p.wins9Ball / p.games9Ball) * 100),
      games: is8 ? p.games8Ball : p.games9Ball,
    }))
    .sort((a, b) => b.winRate - a.winRate);

  const matchTimeline = usingSeasonData
    ? seasonMatches.map((e, i) => ({ match: i + 1, wins: e.myPoints as number, losses: e.oppPoints as number }))
    : localMatchesForFormat.map((m, i) => ({ match: i + 1, wins: m.totalWins, losses: m.totalLosses }));

  // Resolve each format's real APA team id from the synced schedule (not the
  // "active team" currently selected in APA Sync, which may not match the
  // format toggle) so Trophy Case fetches achievements for the right team.
  const eightTeamId = schedule.find(e => e.format !== 'NINE' && e.apaTeamId != null)?.apaTeamId ?? null;
  const nineTeamId  = schedule.find(e => e.format === 'NINE' && e.apaTeamId != null)?.apaTeamId ?? null;
  const trophyTeamId = is8 ? eightTeamId : nineTeamId;

  // ── Streaks, home/away split, head-to-head, most active — all derived from
  // the synced schedule, no extra API calls needed. ─────────────────────────
  const result = (e: ScheduleEntry): 'W' | 'L' | 'T' => {
    const my = e.myPoints as number, opp = e.oppPoints as number;
    return my > opp ? 'W' : my < opp ? 'L' : 'T';
  };

  const currentStreak = (() => {
    let type: 'W' | 'L' | null = null, count = 0;
    for (let i = seasonMatches.length - 1; i >= 0; i--) {
      const r = result(seasonMatches[i]);
      if (r === 'T') break;
      if (type === null) { type = r; count = 1; }
      else if (r === type) count++;
      else break;
    }
    return type ? { type, count } : null;
  })();

  const longestStreak = (() => {
    let bestType: 'W' | 'L' | null = null, best = 0, curType: 'W' | 'L' | null = null, cur = 0;
    for (const e of seasonMatches) {
      const r = result(e);
      if (r === 'T') { curType = null; cur = 0; continue; }
      cur = r === curType ? cur + 1 : 1;
      curType = r;
      if (cur > best) { best = cur; bestType = curType; }
    }
    return bestType ? { type: bestType, count: best } : null;
  })();

  const homeMatches = seasonMatches.filter(e => e.isHome);
  const awayMatches = seasonMatches.filter(e => !e.isHome);
  const homeWinRate = homeMatches.length
    ? Math.round((homeMatches.filter(e => result(e) === 'W').length / homeMatches.length) * 100) : 0;
  const awayWinRate = awayMatches.length
    ? Math.round((awayMatches.filter(e => result(e) === 'W').length / awayMatches.length) * 100) : 0;

  const headToHead = (() => {
    const map = new Map<string, { name: string; w: number; l: number; t: number }>();
    for (const e of seasonMatches) {
      const key = e.opponentApaTeamId != null ? String(e.opponentApaTeamId) : e.opponentTeamName;
      if (!map.has(key)) map.set(key, { name: e.opponentTeamName, w: 0, l: 0, t: 0 });
      const rec = map.get(key)!;
      const r = result(e);
      if (r === 'W') rec.w++; else if (r === 'L') rec.l++; else rec.t++;
    }
    return [...map.values()].sort((a, b) => (b.w + b.l + b.t) - (a.w + a.l + a.t));
  })();

  const mostActive = [...players]
    .map(p => ({ name: p.name, games: is8 ? p.games8Ball : p.games9Ball }))
    .filter(p => p.games > 0)
    .sort((a, b) => b.games - a.games)
    .slice(0, 5);

  const handleConfirmArchive = () => {
    onArchiveSession(sessionName.trim() || `Session ${new Date().toLocaleDateString()}`);
    setIsArchiving(false);
    setSessionName(`Session ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`);
  };

  return (
    <div className="space-y-8 pb-20">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2
            className="font-orbitron text-glow-gold"
            style={{
              fontSize: 'clamp(1.4rem, 4vw, 2.2rem)',
              fontWeight: 900,
              color: GOLD,
              letterSpacing: '0.12em',
            }}
          >
            TACTICAL HISTORY
          </h2>
          <p className="section-label mt-2" style={{ color: 'rgba(242,193,78,0.82)' }}>
            Combat effectiveness &amp; seasonal mission data
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex rounded overflow-hidden" style={{ border: '1px solid rgba(239,231,214,0.25)' }}>
            {(['EIGHT', 'NINE'] as const).map(f => (
              <button key={f} onClick={() => setFormat(f)}
                className="px-4 py-2.5 text-xs font-orbitron font-bold uppercase tracking-widest transition-all"
                style={format === f
                  ? { background: f === 'EIGHT' ? CYAN : GOLD, color: '#0A1F17' }
                  : { background: 'transparent', color: 'rgba(239,231,214,0.7)' }}>
                {f === 'EIGHT' ? '8-Ball' : '9-Ball'}
              </button>
            ))}
          </div>
          <button
            onClick={() => setIsArchiving(true)}
            className="btn-neon-magenta flex items-center gap-2 rounded-xl"
            style={{ padding: '10px 20px' }}
          >
            <Archive style={{ width: 16, height: 16 }} />
            <span className="font-orbitron" style={{ fontSize: 11, letterSpacing: '0.1em' }}>End Session</span>
          </button>
        </div>
      </header>

      {/* ── Missing sync hint for this format ─────────────────────────────────── */}
      {missingFormatSync && (
        <div className="flex items-start gap-2 px-4 py-3 rounded text-sm"
          style={{ background: `${formatAccent}0d`, border: `1px solid ${formatAccent}33`, color: 'rgba(239,231,214,0.8)' }}>
          <span>No synced {formatLabel} matches yet — sync your {formatLabel} team's schedule in the <strong>Schedule</strong> tab.</span>
        </div>
      )}

      {/* ── Archive Confirm Panel ─────────────────────────────────────────────── */}
      {isArchiving && (
        <div
          className="card rounded-3xl"
          style={{
            padding: '32px',
            borderColor: `${MAGENTA}55`,
            boxShadow: `0 0 30px ${MAGENTA}18`,
          }}
        >
          <h3
            className="font-orbitron"
            style={{ fontSize: 14, fontWeight: 800, color: '#EFE7D6', letterSpacing: '0.12em', marginBottom: 8 }}
          >
            CONFIRM MISSION COMPLETION
          </h3>
          <p style={{ fontSize: 13, color: 'rgba(239,231,214,0.78)', marginBottom: 24, lineHeight: 1.6 }}>
            This will archive all active matches and reset player session stats.
            Historical data will be preserved in the mission archive.
          </p>

          <input
            value={sessionName}
            onChange={e => setSessionName(e.target.value)}
            className="input-neon"
            style={{ width: '100%', marginBottom: 20 }}
            placeholder="Session name..."
          />

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setIsArchiving(false)}
              className="btn-neon flex items-center gap-2 rounded-xl"
              style={{ padding: '10px 18px' }}
            >
              <X style={{ width: 14, height: 14 }} />
              <span style={{ fontFamily: 'Orbitron, sans-serif', fontSize: 10, letterSpacing: '0.1em' }}>Abort</span>
            </button>
            <button
              onClick={handleConfirmArchive}
              className="btn-neon-magenta flex items-center gap-2 rounded-xl"
              style={{ padding: '10px 24px' }}
            >
              <Check style={{ width: 14, height: 14 }} />
              <span className="font-orbitron" style={{ fontSize: 10, letterSpacing: '0.1em' }}>Archive &amp; New Session</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Stat cards ────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <StatCard
          icon={<Trophy style={{ width: 18, height: 18 }} />}
          label={winRateLabel}
          value={`${sessionWinRate}%`}
          sub={winRateSub}
          accentColor={GOLD}
        />
        <StatCard
          icon={<Target style={{ width: 18, height: 18 }} />}
          label="Active Players"
          value={activePlayers.length}
          sub={`${players.filter(p => !p.isActive).length} currently archived`}
          accentColor={CYAN}
        />
        <StatCard
          icon={<Calendar style={{ width: 18, height: 18 }} />}
          label={matchesRunLabel}
          value={matchesRunValue}
          sub={matchesRunSub}
          accentColor="#F2C14E"
        />
        <StatCard
          icon={<Flame style={{ width: 18, height: 18 }} />}
          label="Current Streak"
          value={currentStreak ? `${currentStreak.count}${currentStreak.type}` : '—'}
          sub={longestStreak ? `Longest: ${longestStreak.count}${longestStreak.type} this season` : 'No streak data yet'}
          accentColor={currentStreak?.type === 'L' ? MAGENTA : GREEN}
        />
      </div>

      {/* ── Trophy Case ───────────────────────────────────────────────────────── */}
      <TrophyCase connection={connection} teamId={trophyTeamId} />

      {/* ── Charts row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Player Leaderboard — horizontal BarChart */}
        <div className="card rounded-3xl" style={{ padding: '24px 24px 20px' }}>
          <div className="flex items-center gap-3 mb-6">
            <div style={{ width: 3, height: 22, background: CYAN, borderRadius: 2, boxShadow: `0 0 8px ${CYAN}` }} />
            <h4
              className="font-orbitron"
              style={{ fontSize: 11, fontWeight: 800, color: '#EFE7D6', letterSpacing: '0.12em' }}
            >
              {formatLabel.toUpperCase()} LEADERBOARD
            </h4>
          </div>

          <div style={{ height: 300 }}>
            {playerStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={playerStats} layout="vertical" barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(57,167,201,0.06)" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    stroke="rgba(239,231,214,0.2)"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                    style={{ fontFamily: 'Space Mono, monospace' }}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="rgba(239,231,214,0.3)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    width={70}
                    style={{ fontFamily: 'Space Mono, monospace' }}
                  />
                  <Tooltip
                    content={<NeonTooltip />}
                    cursor={{ fill: 'rgba(57,167,201,0.04)' }}
                  />
                  <Bar dataKey="winRate" name={`${formatLabel} Win %`} fill={formatAccent} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="section-label" style={{ color: 'rgba(239,231,214,0.6)' }}>No {formatLabel} player data yet</p>
              </div>
            )}
          </div>
        </div>

        {/* Success Trends — LineChart */}
        <div className="card rounded-3xl" style={{ padding: '24px 24px 20px' }}>
          <div className="flex items-center gap-3 mb-6">
            <div style={{ width: 3, height: 22, background: GREEN, borderRadius: 2, boxShadow: `0 0 8px ${GREEN}` }} />
            <h4
              className="font-orbitron"
              style={{ fontSize: 11, fontWeight: 800, color: '#EFE7D6', letterSpacing: '0.12em' }}
            >
              SUCCESS TRENDS
            </h4>
          </div>

          <div style={{ height: 300 }}>
            {matchTimeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={matchTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(57,167,201,0.06)" vertical={false} />
                  <XAxis
                    dataKey="match"
                    stroke="rgba(239,231,214,0.25)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    style={{ fontFamily: 'Space Mono, monospace' }}
                    label={{ value: 'Match #', position: 'insideBottom', offset: -2, fill: 'rgba(239,231,214,0.25)', fontSize: 9 }}
                  />
                  <YAxis
                    stroke="rgba(239,231,214,0.25)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    style={{ fontFamily: 'Space Mono, monospace' }}
                  />
                  <Tooltip
                    content={<NeonTooltip />}
                    cursor={{ stroke: 'rgba(57,196,107,0.2)', strokeWidth: 1 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="wins"
                    name={usingSeasonData ? 'Points For' : 'Wins'}
                    stroke={GREEN}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: GREEN, stroke: 'rgba(10,31,23,0.8)', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: GREEN, stroke: GREEN, strokeWidth: 0, style: { filter: `drop-shadow(0 0 8px ${GREEN})` } }}
                    style={{ filter: `drop-shadow(0 0 4px ${GREEN})` }}
                  />
                  {usingSeasonData && (
                    <Line
                      type="monotone"
                      dataKey="losses"
                      name="Points Against"
                      stroke={MAGENTA}
                      strokeWidth={2}
                      dot={{ r: 3, fill: MAGENTA, stroke: 'rgba(10,31,23,0.8)', strokeWidth: 2 }}
                      activeDot={{ r: 5, fill: MAGENTA, stroke: MAGENTA, strokeWidth: 0 }}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="section-label" style={{ color: 'rgba(239,231,214,0.6)' }}>No match timeline yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Season Breakdown: Home/Away split + Most Active players ──────────── */}
      {usingSeasonData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card rounded-3xl" style={{ padding: '24px 24px 20px' }}>
            <div className="flex items-center gap-3 mb-6">
              <Home style={{ width: 16, height: 16, color: CYAN }} />
              <h4 className="font-orbitron" style={{ fontSize: 11, fontWeight: 800, color: '#EFE7D6', letterSpacing: '0.12em' }}>
                HOME VS AWAY
              </h4>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <p className="stat-num" style={{ color: CYAN, fontSize: '2rem' }}>{homeWinRate}%</p>
                <p className="section-label mt-1" style={{ color: 'rgba(239,231,214,0.6)' }}>Home ({homeMatches.length})</p>
              </div>
              <div className="text-center" style={{ borderLeft: '1px solid rgba(57,167,201,0.12)' }}>
                <p className="stat-num" style={{ color: MAGENTA, fontSize: '2rem' }}>{awayWinRate}%</p>
                <p className="section-label mt-1" style={{ color: 'rgba(239,231,214,0.6)' }}>Away ({awayMatches.length})</p>
              </div>
            </div>
          </div>

          <div className="card rounded-3xl" style={{ padding: '24px 24px 20px' }}>
            <div className="flex items-center gap-3 mb-6">
              <Users style={{ width: 16, height: 16, color: CYAN }} />
              <h4 className="font-orbitron" style={{ fontSize: 11, fontWeight: 800, color: '#EFE7D6', letterSpacing: '0.12em' }}>
                MOST ACTIVE
              </h4>
            </div>
            {mostActive.length > 0 ? (
              <div className="space-y-2.5">
                {mostActive.map((p, i) => (
                  <div key={p.name} className="flex items-center justify-between text-sm">
                    <span style={{ color: 'rgba(239,231,214,0.85)' }}>
                      <span className="font-mono" style={{ color: 'rgba(239,231,214,0.4)', marginRight: 8 }}>{i + 1}.</span>
                      {p.name}
                    </span>
                    <span className="font-mono" style={{ color: CYAN }}>{p.games} games</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="section-label" style={{ color: 'rgba(239,231,214,0.6)' }}>No participation data yet</p>
            )}
          </div>
        </div>
      )}

      {/* ── Head-to-Head ──────────────────────────────────────────────────────── */}
      {usingSeasonData && headToHead.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-5">
            <Swords style={{ width: 18, height: 18, color: GOLD }} />
            <h3 className="font-orbitron" style={{ fontSize: 13, fontWeight: 800, color: '#EFE7D6', letterSpacing: '0.1em' }}>
              HEAD-TO-HEAD
            </h3>
          </div>
          <div className="card rounded-3xl overflow-hidden" style={{ padding: 0 }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: 'rgba(239,231,214,0.5)' }} className="text-left text-xs">
                  <th className="px-5 py-3 font-medium">Opponent</th>
                  <th className="px-5 py-3 font-medium">Record</th>
                  <th className="px-5 py-3 font-medium">Win %</th>
                </tr>
              </thead>
              <tbody>
                {headToHead.map((h, i) => {
                  const played = h.w + h.l + h.t;
                  const pct = played > 0 ? Math.round((h.w / played) * 100) : 0;
                  return (
                    <tr key={i} style={{ borderTop: '1px solid rgba(57,167,201,0.06)' }}>
                      <td className="px-5 py-3" style={{ color: '#EFE7D6' }}>{h.name}</td>
                      <td className="px-5 py-3 font-mono" style={{ color: 'rgba(239,231,214,0.75)' }}>
                        {h.w}-{h.l}{h.t > 0 ? `-${h.t}` : ''}
                      </td>
                      <td className="px-5 py-3 font-mono" style={{ color: pct >= 50 ? GREEN : MAGENTA }}>{pct}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── Mission Archive ───────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <History style={{ width: 18, height: 18, color: GOLD }} />
          <h3
            className="font-orbitron"
            style={{ fontSize: 13, fontWeight: 800, color: '#EFE7D6', letterSpacing: '0.1em' }}
          >
            MISSION ARCHIVE
          </h3>
        </div>

        {archives.length === 0 ? (
          <div
            className="rounded-3xl flex flex-col items-center justify-center"
            style={{
              padding: '56px 20px',
              border: '1px dashed rgba(57,167,201,0.15)',
              background: 'rgba(10,31,23,0.4)',
              textAlign: 'center',
            }}
          >
            <Archive style={{ width: 40, height: 40, color: 'rgba(57,167,201,0.4)', marginBottom: 14 }} />
            <p className="section-label" style={{ color: 'rgba(239,231,214,0.7)' }}>
              No historical archives found
            </p>
            <p style={{ fontSize: 12, color: 'rgba(239,231,214,0.55)', marginTop: 6, fontFamily: 'Space Mono, monospace' }}>
              End a session to create the first archive
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {archives.map(archive => {
              const archiveWins   = archive.matches.reduce((acc, m) => acc + m.totalWins,   0);
              const archiveGames  = archive.matches.reduce((acc, m) => acc + m.totalWins + m.totalLosses, 0);
              const archiveWinPct = archiveGames > 0 ? Math.round((archiveWins / archiveGames) * 100) : 0;

              return (
                <div
                  key={archive.id}
                  className="card rounded-2xl"
                  style={{ padding: '20px 24px', transition: 'border-color 0.2s' }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = `${GOLD}55`;
                    (e.currentTarget as HTMLElement).style.boxShadow   = `0 0 18px ${GOLD}10`;
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.borderColor = '';
                    (e.currentTarget as HTMLElement).style.boxShadow   = '';
                  }}
                >
                  <div className="flex justify-between items-start">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h4
                        className="font-orbitron"
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color: '#EFE7D6',
                          letterSpacing: '0.06em',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {archive.name}
                      </h4>
                      <p
                        className="section-label mt-1"
                        style={{ color: 'rgba(239,231,214,0.68)' }}
                      >
                        {new Date(archive.startDate).toLocaleDateString()}
                        {' — '}
                        {new Date(archive.endDate).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-5 ml-4 flex-shrink-0">
                      <div className="text-right">
                        <p style={{
                          fontFamily: 'Space Mono, monospace',
                          fontSize: 18,
                          fontWeight: 700,
                          color: GOLD,
                          textShadow: `0 0 10px ${GOLD}88`,
                        }}>
                          {archiveWinPct}%
                        </p>
                        <p className="section-label" style={{ color: 'rgba(239,231,214,0.65)' }}>Win Rate</p>
                      </div>

                      <div style={{
                        textAlign: 'right',
                        paddingLeft: 16,
                        borderLeft: '1px solid rgba(57,167,201,0.12)',
                      }}>
                        <p style={{
                          fontFamily: 'Space Mono, monospace',
                          fontSize: 18,
                          fontWeight: 700,
                          color: CYAN,
                          textShadow: `0 0 10px ${CYAN}88`,
                        }}>
                          {archive.matches.length}
                        </p>
                        <p className="section-label" style={{ color: 'rgba(239,231,214,0.65)' }}>Matches</p>
                      </div>
                    </div>
                  </div>

                  {/* Mini progress bar showing win rate */}
                  <div style={{
                    marginTop: 14,
                    height: 2,
                    background: 'rgba(57,167,201,0.08)',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${archiveWinPct}%`,
                      background: `linear-gradient(90deg, ${CYAN}, ${GOLD})`,
                      boxShadow: `0 0 8px ${GOLD}66`,
                      borderRadius: 2,
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
