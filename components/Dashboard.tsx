
import React, { useState, useEffect } from 'react';
import { Player } from '../types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend
} from 'recharts';
import { CheckCircle2, AlertTriangle, Target, ChevronUp, ChevronDown, Zap, Plane } from 'lucide-react';

interface DashboardProps {
  players: Player[];
  currentWeek?: number;
  onWeekChange?: (w: number) => void;
}

const CYAN    = '#39A7C9';
const NINE = '#F2C14E';
const GREEN   = '#39C46B';
const GOLD    = '#F2C14E';

// APA "10 lifetime matches" rule: to be eligible for the World Qualifier / Vegas,
// a player must have at least this many LIFETIME match scores in the format
// (regular sessions + playoffs + Tri-Annuals all count). Under this, they can't
// be put up or used for Rule-of-23 math. Counted per format — 8-ball and 9-ball
// are separate. If your division's number differs, change this one line.
const VEGAS_THRESHOLD = 10;

// Lifetime matches for the Vegas rule, per format. Prefer the true lifetime count
// pulled from APA; fall back to this session's team matches if lifetime hasn't
// been synced yet (e.g. players imported before lifetime sync existed).
const life8 = (p: Player) => p.lifetime8Ball ?? p.games8Ball;
const life9 = (p: Player) => p.lifetime9Ball ?? p.games9Ball;

// ── Custom tooltip ─────────────────────────────────────────────────────────────
const NeonTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(10,31,23,0.97)',
      border: '1px solid rgba(57,167,201,0.35)',
      borderRadius: 8,
      padding: '10px 14px',
      fontSize: 11,
      boxShadow: '0 0 20px rgba(57,167,201,0.18)',
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
        <p key={entry.name} style={{ color: entry.fill, margin: '2px 0', fontFamily: 'Space Mono, monospace', fontSize: 11 }}>
          {entry.name}: <strong>{entry.value}</strong>
        </p>
      ))}
    </div>
  );
};

// ── LED progress bar (4 LEDs) ──────────────────────────────────────────────────
const LedBar: React.FC<{ label: string; count: number }> = ({ label, count }) => {
  const qualified = count >= 4;
  const litColor = qualified ? GREEN : CYAN;
  const litShadow = qualified
    ? '0 0 6px #39C46B, 0 0 12px rgba(57,196,107,0.5)'
    : '0 0 6px #39A7C9, 0 0 12px rgba(57,167,201,0.5)';

  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="section-label">{label}</span>
        <span style={{
          fontFamily: 'Space Mono, monospace',
          fontSize: 10,
          color: litColor,
          textShadow: `0 0 8px ${litColor}`,
        }}>
          {qualified ? 'QUAL' : `${Math.min(count, 4)}/4`}
        </span>
      </div>
      <div className="flex gap-1.5">
        {[0, 1, 2, 3].map(i => (
          <div
            key={i}
            className={`led ${i < count ? 'led-on-cyan' : 'led-off'}`}
            style={i < count ? {
              background: litColor,
              boxShadow: litShadow,
            } : undefined}
          />
        ))}
      </div>
    </div>
  );
};

// ── Vegas eligibility meter (progress toward VEGAS_THRESHOLD matches) ──────────
const VegasMeter: React.FC<{ name: string; count: number }> = ({ name, count }) => {
  const qualified = count >= VEGAS_THRESHOLD;
  const remaining = Math.max(0, VEGAS_THRESHOLD - count);
  const pct = Math.min(100, (count / VEGAS_THRESHOLD) * 100);
  const color = qualified ? GREEN : GOLD;

  return (
    <div className="flex items-center gap-3">
      <span
        style={{ flex: '0 0 92px', fontWeight: 700, fontSize: 12, color: '#EFE7D6', letterSpacing: '0.03em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
        title={name}
      >
        {name}
      </span>
      <div style={{ flex: 1, height: 6, background: 'rgba(239,231,214,0.08)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: color,
          boxShadow: `0 0 6px ${color}, 0 0 12px ${color}55`,
          borderRadius: 3,
          transition: 'width 0.5s ease',
        }} />
      </div>
      <span style={{ flex: '0 0 auto', fontFamily: 'Space Mono, monospace', fontSize: 11, color, textShadow: `0 0 8px ${color}66`, minWidth: 62, textAlign: 'right' }}>
        {qualified ? 'QUAL' : `${count}/${VEGAS_THRESHOLD}`}
      </span>
      {!qualified && (
        <span style={{ flex: '0 0 auto', fontFamily: 'Orbitron, sans-serif', fontSize: 8, letterSpacing: '0.1em', color: 'rgba(239,231,214,0.4)', minWidth: 60, textAlign: 'right' }}>
          +{remaining} TO GO
        </span>
      )}
      {qualified && (
        <CheckCircle2 style={{ flex: '0 0 auto', width: 14, height: 14, color: GREEN }} />
      )}
    </div>
  );
};

export const Dashboard: React.FC<DashboardProps> = ({
  players,
  currentWeek: weekProp,
  onWeekChange,
}) => {
  const [internalWeek, setInternalWeek] = useState<number>(() => {
    const saved = localStorage.getItem('cuemaster_current_week');
    return saved ? parseInt(saved, 10) : 1;
  });

  const currentWeek = weekProp !== undefined ? weekProp : internalWeek;

  const handleWeekChange = (w: number) => {
    const clamped = Math.max(1, Math.min(16, w));
    if (onWeekChange) {
      onWeekChange(clamped);
    } else {
      setInternalWeek(clamped);
    }
  };

  useEffect(() => {
    if (weekProp === undefined) {
      localStorage.setItem('cuemaster_current_week', internalWeek.toString());
    }
  }, [internalWeek, weekProp]);

  // ── Derived data ─────────────────────────────────────────────────────────────
  const unqualifiedPlayers = players.filter(p => p.games8Ball < 4 || p.games9Ball < 4);
  const qualifiedCount     = players.length - unqualifiedPlayers.length;
  const allQualified       = unqualifiedPlayers.length === 0 && players.length > 0;
  const progressPct        = (currentWeek / 16) * 100;

  const chartData = players.map(p => ({
    name: p.name.split(' ')[0],
    '8-Ball': p.games8Ball,
    '9-Ball': p.games9Ball,
  }));

  // Vegas / Nationals eligibility, per format. Only active players count.
  const activePlayers   = players.filter(p => p.isActive);
  const vegas8          = [...activePlayers].sort((a, b) => life8(b) - life8(a));
  const vegas9          = [...activePlayers].sort((a, b) => life9(b) - life9(a));
  const vegasQual8      = activePlayers.filter(p => life8(p) >= VEGAS_THRESHOLD).length;
  const vegasQual9      = activePlayers.filter(p => life9(p) >= VEGAS_THRESHOLD).length;

  const total8Ball = players.reduce((acc, p) => acc + p.games8Ball, 0);
  const total9Ball = players.reduce((acc, p) => acc + p.games9Ball, 0);
  const pieData    = [
    { name: '8-Ball', value: total8Ball },
    { name: '9-Ball', value: total9Ball },
  ];
  const PIE_COLORS = [CYAN, NINE];

  return (
    <div className="space-y-8 pb-20">

      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h2
            className="font-orbitron text-glow-cyan"
            style={{
              fontSize: 'clamp(1.4rem, 4vw, 2.2rem)',
              fontWeight: 900,
              color: CYAN,
              letterSpacing: '0.12em',
            }}
          >
            DASHBOARD
          </h2>
          <p className="section-label mt-2" style={{ color: 'rgba(57,167,201,0.82)' }}>
            Team overview &amp; playoff readiness
          </p>
        </div>

        {/* Season week tracker */}
        <div
          className="card glow-cyan flex items-center gap-5 rounded-2xl"
          style={{ padding: '14px 20px' }}
        >
          <div>
            <p className="section-label mb-1">Season Progress</p>
            <div className="flex items-center gap-2">
              <Zap style={{ width: 14, height: 14, color: CYAN }} />
              <span style={{ fontFamily: 'Space Mono, monospace', color: '#EFE7D6', fontSize: 15, fontWeight: 700 }}>
                Week{' '}
                <span className="font-mono" style={{ color: CYAN, textShadow: '0 0 10px rgba(57,167,201,0.9)' }}>
                  {currentWeek}
                </span>
                <span style={{ color: 'rgba(239,231,214,0.3)', fontSize: 12 }}> / 16</span>
              </span>
            </div>

            {/* Glowing thin progress bar */}
            <div
              style={{
                marginTop: 8,
                width: 140,
                height: 2,
                background: 'rgba(57,167,201,0.1)',
                borderRadius: 2,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${progressPct}%`,
                  background: CYAN,
                  boxShadow: `0 0 8px ${CYAN}, 0 0 16px rgba(57,167,201,0.4)`,
                  borderRadius: 2,
                  transition: 'width 0.5s ease',
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <button
              onClick={() => handleWeekChange(currentWeek + 1)}
              disabled={currentWeek >= 16}
              className="btn-neon rounded-lg flex items-center justify-center"
              style={{ width: 32, height: 32, padding: 0 }}
              aria-label="Increase week"
            >
              <ChevronUp style={{ width: 16, height: 16 }} />
            </button>
            <button
              onClick={() => handleWeekChange(currentWeek - 1)}
              disabled={currentWeek <= 1}
              className="btn-neon rounded-lg flex items-center justify-center"
              style={{ width: 32, height: 32, padding: 0 }}
              aria-label="Decrease week"
            >
              <ChevronDown style={{ width: 16, height: 16 }} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Playoff Eligibility ───────────────────────────────────────────────── */}
      <section className="card rounded-3xl" style={{ padding: '28px 28px 32px' }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Target style={{ width: 20, height: 20, color: CYAN }} />
            <h3
              className="font-orbitron"
              style={{ fontSize: 15, fontWeight: 800, color: '#EFE7D6', letterSpacing: '0.1em' }}
            >
              PLAYOFF ELIGIBILITY
            </h3>
            {currentWeek > 12 && (
              <span style={{
                fontFamily: 'Orbitron, sans-serif',
                fontSize: 8,
                letterSpacing: '0.15em',
                color: '#D14A3C',
                textShadow: '0 0 8px rgba(209,74,60,0.8)',
                border: '1px solid rgba(209,74,60,0.4)',
                borderRadius: 4,
                padding: '2px 7px',
                textTransform: 'uppercase',
              }}>
                DEADLINE APPROACHING
              </span>
            )}
          </div>

          {/* Qualified count badge */}
          <div
            className="card rounded-2xl text-center"
            style={{ padding: '10px 20px', minWidth: 100 }}
          >
            <p className="section-label mb-1">Qualified</p>
            <p style={{ fontFamily: 'Space Mono, monospace', fontSize: 22, fontWeight: 700, color: '#EFE7D6' }}>
              <span style={{ color: CYAN, textShadow: '0 0 10px rgba(57,167,201,0.8)' }}>{qualifiedCount}</span>
              <span style={{ color: 'rgba(239,231,214,0.25)', fontSize: 14 }}> / {players.length}</span>
            </p>
          </div>
        </div>

        {players.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(239,231,214,0.3)' }}>
            <p className="section-label">No players in roster</p>
          </div>
        )}

        {allQualified && (
          <div
            className="rounded-2xl flex flex-col items-center justify-center"
            style={{
              padding: '36px 20px',
              border: '1px solid rgba(57,196,107,0.3)',
              background: 'rgba(57,196,107,0.04)',
              textAlign: 'center',
              boxShadow: '0 0 30px rgba(57,196,107,0.08)',
            }}
          >
            <CheckCircle2 style={{ width: 44, height: 44, color: GREEN, marginBottom: 12 }} />
            <h4
              className="font-orbitron"
              style={{
                fontSize: 18,
                fontWeight: 900,
                color: GREEN,
                textShadow: '0 0 18px rgba(57,196,107,0.9), 0 0 40px rgba(57,196,107,0.4)',
                letterSpacing: '0.12em',
              }}
            >
              ALL QUALIFIED
            </h4>
            <p className="section-label mt-2" style={{ color: 'rgba(57,196,107,0.6)' }}>
              All players meet eligibility criteria
            </p>
          </div>
        )}

        {!allQualified && unqualifiedPlayers.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {unqualifiedPlayers.map(player => (
              <div
                key={player.id}
                className="card rounded-2xl"
                style={{ padding: '18px 20px' }}
              >
                <div className="flex justify-between items-start mb-4">
                  <p style={{ fontWeight: 700, fontSize: 13, color: '#EFE7D6', letterSpacing: '0.04em' }}>
                    {player.name}
                  </p>
                  <AlertTriangle style={{ width: 14, height: 14, color: '#F2C14E', flexShrink: 0 }} />
                </div>
                <div className="flex flex-col gap-4">
                  <LedBar label="8-Ball" count={player.games8Ball} />
                  <LedBar label="9-Ball" count={player.games9Ball} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Vegas / Nationals Eligibility ─────────────────────────────────────── */}
      <section className="card rounded-3xl" style={{ padding: '28px 28px 32px', borderColor: `${GOLD}2e` }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <Plane style={{ width: 20, height: 20, color: GOLD }} />
            <h3
              className="font-orbitron"
              style={{ fontSize: 15, fontWeight: 800, color: '#EFE7D6', letterSpacing: '0.1em' }}
            >
              VEGAS ELIGIBILITY
            </h3>
            <span style={{
              fontFamily: 'Space Mono, monospace', fontSize: 9, color: 'rgba(239,231,214,0.45)',
              letterSpacing: '0.05em',
            }}>
              {VEGAS_THRESHOLD} lifetime matches / format
            </span>
          </div>
        </div>

        {activePlayers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(239,231,214,0.3)' }}>
            <p className="section-label">No active players in roster</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-6">
            {([
              { label: '8-Ball', list: vegas8, qual: vegasQual8, get: life8 },
              { label: '9-Ball', list: vegas9, qual: vegasQual9, get: life9 },
            ]).map(col => (
              <div key={col.label}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div style={{ width: 3, height: 16, background: GOLD, borderRadius: 2, boxShadow: `0 0 8px ${GOLD}` }} />
                    <span className="section-label" style={{ color: 'rgba(239,231,214,0.85)' }}>{col.label}</span>
                  </div>
                  <span style={{ fontFamily: 'Space Mono, monospace', fontSize: 12, color: '#EFE7D6' }}>
                    <span style={{ color: GOLD, textShadow: `0 0 10px ${GOLD}99` }}>{col.qual}</span>
                    <span style={{ color: 'rgba(239,231,214,0.3)' }}> / {activePlayers.length} qual</span>
                  </span>
                </div>
                <div className="flex flex-col gap-3">
                  {col.list.map(p => (
                    <VegasMeter key={p.id} name={p.name} count={col.get(p)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Charts row ───────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Match Activity BarChart */}
        <div className="card rounded-3xl" style={{ padding: '24px 24px 20px' }}>
          <div className="flex items-center gap-3 mb-6">
            <div style={{ width: 3, height: 22, background: CYAN, borderRadius: 2, boxShadow: `0 0 8px ${CYAN}` }} />
            <h4
              className="font-orbitron"
              style={{ fontSize: 11, fontWeight: 800, color: '#EFE7D6', letterSpacing: '0.12em' }}
            >
              MATCH ACTIVITY
            </h4>
          </div>

          <div style={{ height: 280 }}>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barGap={3}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(57,167,201,0.06)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="rgba(239,231,214,0.25)"
                    fontSize={10}
                    fontWeight={700}
                    tickLine={false}
                    axisLine={false}
                    style={{ fontFamily: 'Space Mono, monospace' }}
                  />
                  <YAxis
                    stroke="rgba(239,231,214,0.25)"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    style={{ fontFamily: 'Space Mono, monospace' }}
                  />
                  <Tooltip content={<NeonTooltip />} cursor={{ fill: 'rgba(57,167,201,0.04)' }} />
                  <Bar dataKey="8-Ball" fill={CYAN}    radius={[3, 3, 0, 0]} barSize={14} />
                  <Bar dataKey="9-Ball" fill={NINE} radius={[3, 3, 0, 0]} barSize={14} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="section-label" style={{ color: 'rgba(239,231,214,0.6)' }}>No match data yet</p>
              </div>
            )}
          </div>

          <div className="flex gap-6 mt-4 justify-center">
            {[{ label: '8-Ball', color: CYAN }, { label: '9-Ball', color: NINE }].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-2">
                <div style={{ width: 8, height: 8, borderRadius: 2, background: color, boxShadow: `0 0 6px ${color}` }} />
                <span className="section-label" style={{ color: 'rgba(239,231,214,0.8)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Games by format donut */}
        <div className="card rounded-3xl" style={{ padding: '24px 24px 20px' }}>
          <div className="flex items-center gap-3 mb-6">
            <div style={{ width: 3, height: 22, background: NINE, borderRadius: 2, boxShadow: `0 0 8px ${NINE}` }} />
            <h4
              className="font-orbitron"
              style={{ fontSize: 11, fontWeight: 800, color: '#EFE7D6', letterSpacing: '0.12em' }}
            >
              GAMES BY FORMAT
            </h4>
          </div>

          <div style={{ height: 280 }}>
            {(total8Ball + total9Ball) > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={72}
                    outerRadius={108}
                    paddingAngle={6}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((_entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={PIE_COLORS[index % PIE_COLORS.length]}
                        style={{ filter: `drop-shadow(0 0 8px ${PIE_COLORS[index % PIE_COLORS.length]})` }}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(10,31,23,0.97)',
                      border: '1px solid rgba(57,167,201,0.3)',
                      borderRadius: 8,
                      fontSize: 11,
                      fontFamily: 'Space Mono, monospace',
                    }}
                  />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string, entry: any) => (
                      <span style={{
                        color: entry.color,
                        fontFamily: 'Orbitron, sans-serif',
                        fontSize: 9,
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                      }}>
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="section-label" style={{ color: 'rgba(239,231,214,0.6)' }}>No game data</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
