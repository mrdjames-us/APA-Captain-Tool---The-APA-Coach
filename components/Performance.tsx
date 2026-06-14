
import React, { useState } from 'react';
import { Player, Match, SessionArchive } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { Archive, Trophy, Target, Calendar, History, Zap, X, Check } from 'lucide-react';

interface PerformanceProps {
  players: Player[];
  matches: Match[];
  archives: SessionArchive[];
  onArchiveSession: (name: string) => void;
}

const CYAN    = '#00E5FF';
const MAGENTA = '#FF0066';
const GOLD    = '#FFB700';
const GREEN   = '#00FF88';

// ── Shared dark tooltip ────────────────────────────────────────────────────────
const NeonTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(0,0,8,0.97)',
      border: '1px solid rgba(0,229,255,0.3)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 11,
      boxShadow: '0 0 20px rgba(0,229,255,0.15)',
    }}>
      <p style={{
        color: 'rgba(208,232,255,0.55)',
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
      <span className="section-label" style={{ color: `${accentColor}99` }}>{label}</span>
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
    <p style={{ fontSize: 10, color: 'rgba(208,232,255,0.35)', marginTop: 8, fontFamily: 'Space Mono, monospace' }}>
      {sub}
    </p>
  </div>
);

export const Performance: React.FC<PerformanceProps> = ({
  players,
  matches,
  archives,
  onArchiveSession,
}) => {
  const [isArchiving, setIsArchiving] = useState(false);
  const [sessionName, setSessionName] = useState(
    `Session ${new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
  );

  // ── Derived stats ─────────────────────────────────────────────────────────────
  const totalWins  = matches.reduce((acc, m) => acc + m.totalWins,   0);
  const totalGames = matches.reduce((acc, m) => acc + m.totalWins + m.totalLosses, 0);
  const sessionWinRate = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

  const activePlayers = players.filter(p => p.isActive);

  const playerStats = players
    .filter(p => p.games8Ball + p.games9Ball > 0)
    .map(p => ({
      name: p.name.split(' ')[0],
      winRate: Math.round(((p.wins8Ball + p.wins9Ball) / (p.games8Ball + p.games9Ball)) * 100),
      totalGames: p.games8Ball + p.games9Ball,
    }))
    .sort((a, b) => b.winRate - a.winRate);

  const matchTimeline = matches.map((m, i) => ({
    match: i + 1,
    wins: m.totalWins,
    losses: m.totalLosses,
  }));

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
          <p className="section-label mt-2" style={{ color: 'rgba(255,183,0,0.4)' }}>
            Combat effectiveness &amp; seasonal mission data
          </p>
        </div>

        <button
          onClick={() => setIsArchiving(true)}
          className="btn-neon-magenta flex items-center gap-2 rounded-xl"
          style={{ padding: '10px 20px' }}
        >
          <Archive style={{ width: 16, height: 16 }} />
          <span className="font-orbitron" style={{ fontSize: 11, letterSpacing: '0.1em' }}>End Session</span>
        </button>
      </header>

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
            style={{ fontSize: 14, fontWeight: 800, color: '#D0E8FF', letterSpacing: '0.12em', marginBottom: 8 }}
          >
            CONFIRM MISSION COMPLETION
          </h3>
          <p style={{ fontSize: 12, color: 'rgba(208,232,255,0.4)', marginBottom: 24, lineHeight: 1.6 }}>
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

      {/* ── Three stat cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={<Trophy style={{ width: 18, height: 18 }} />}
          label="Session Win Rate"
          value={`${sessionWinRate}%`}
          sub={`${totalWins} wins from ${totalGames} games`}
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
          label="Matches Run"
          value={matches.length}
          sub="Current session timeline"
          accentColor={MAGENTA}
        />
      </div>

      {/* ── Charts row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Player Leaderboard — horizontal BarChart */}
        <div className="card rounded-3xl" style={{ padding: '24px 24px 20px' }}>
          <div className="flex items-center gap-3 mb-6">
            <div style={{ width: 3, height: 22, background: CYAN, borderRadius: 2, boxShadow: `0 0 8px ${CYAN}` }} />
            <h4
              className="font-orbitron"
              style={{ fontSize: 11, fontWeight: 800, color: '#D0E8FF', letterSpacing: '0.12em' }}
            >
              PERFORMANCE LEADERBOARD
            </h4>
          </div>

          <div style={{ height: 300 }}>
            {playerStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={playerStats} layout="vertical" barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,229,255,0.06)" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    stroke="rgba(208,232,255,0.2)"
                    fontSize={9}
                    tickLine={false}
                    axisLine={false}
                    style={{ fontFamily: 'Space Mono, monospace' }}
                    tickFormatter={(v: number) => `${v}%`}
                  />
                  <YAxis
                    dataKey="name"
                    type="category"
                    stroke="rgba(208,232,255,0.3)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    width={70}
                    style={{ fontFamily: 'Space Mono, monospace' }}
                  />
                  <Tooltip
                    content={<NeonTooltip />}
                    cursor={{ fill: 'rgba(0,229,255,0.04)' }}
                  />
                  <Bar
                    dataKey="winRate"
                    name="Win Rate"
                    fill={CYAN}
                    radius={[0, 4, 4, 0]}
                    style={{ filter: `drop-shadow(0 0 6px ${CYAN})` }}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full" style={{ color: 'rgba(208,232,255,0.2)' }}>
                <p className="section-label">No player data yet</p>
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
              style={{ fontSize: 11, fontWeight: 800, color: '#D0E8FF', letterSpacing: '0.12em' }}
            >
              SUCCESS TRENDS
            </h4>
          </div>

          <div style={{ height: 300 }}>
            {matchTimeline.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={matchTimeline}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,229,255,0.06)" vertical={false} />
                  <XAxis
                    dataKey="match"
                    stroke="rgba(208,232,255,0.25)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    style={{ fontFamily: 'Space Mono, monospace' }}
                    label={{ value: 'Match #', position: 'insideBottom', offset: -2, fill: 'rgba(208,232,255,0.25)', fontSize: 9 }}
                  />
                  <YAxis
                    stroke="rgba(208,232,255,0.25)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    style={{ fontFamily: 'Space Mono, monospace' }}
                  />
                  <Tooltip
                    content={<NeonTooltip />}
                    cursor={{ stroke: 'rgba(0,255,136,0.2)', strokeWidth: 1 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="wins"
                    name="Wins"
                    stroke={GREEN}
                    strokeWidth={2.5}
                    dot={{ r: 4, fill: GREEN, stroke: 'rgba(0,0,8,0.8)', strokeWidth: 2 }}
                    activeDot={{ r: 6, fill: GREEN, stroke: GREEN, strokeWidth: 0, style: { filter: `drop-shadow(0 0 8px ${GREEN})` } }}
                    style={{ filter: `drop-shadow(0 0 4px ${GREEN})` }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full" style={{ color: 'rgba(208,232,255,0.2)' }}>
                <p className="section-label">No match timeline yet</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Mission Archive ───────────────────────────────────────────────────── */}
      <section>
        <div className="flex items-center gap-3 mb-5">
          <History style={{ width: 18, height: 18, color: GOLD }} />
          <h3
            className="font-orbitron"
            style={{ fontSize: 13, fontWeight: 800, color: '#D0E8FF', letterSpacing: '0.1em' }}
          >
            MISSION ARCHIVE
          </h3>
        </div>

        {archives.length === 0 ? (
          <div
            className="rounded-3xl flex flex-col items-center justify-center"
            style={{
              padding: '56px 20px',
              border: '1px dashed rgba(0,229,255,0.15)',
              background: 'rgba(0,0,8,0.4)',
              textAlign: 'center',
            }}
          >
            <Archive style={{ width: 40, height: 40, color: 'rgba(0,229,255,0.15)', marginBottom: 14 }} />
            <p className="section-label" style={{ color: 'rgba(208,232,255,0.25)' }}>
              No historical archives found
            </p>
            <p style={{ fontSize: 10, color: 'rgba(208,232,255,0.15)', marginTop: 6, fontFamily: 'Space Mono, monospace' }}>
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
                          color: '#D0E8FF',
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
                        style={{ color: 'rgba(208,232,255,0.35)' }}
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
                        <p className="section-label" style={{ color: 'rgba(208,232,255,0.3)' }}>Win Rate</p>
                      </div>

                      <div style={{
                        textAlign: 'right',
                        paddingLeft: 16,
                        borderLeft: '1px solid rgba(0,229,255,0.12)',
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
                        <p className="section-label" style={{ color: 'rgba(208,232,255,0.3)' }}>Matches</p>
                      </div>
                    </div>
                  </div>

                  {/* Mini progress bar showing win rate */}
                  <div style={{
                    marginTop: 14,
                    height: 2,
                    background: 'rgba(0,229,255,0.08)',
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
