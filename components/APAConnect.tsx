import React, { useState } from 'react';
import { Globe, Loader2, CheckCircle2, AlertTriangle, RefreshCw, LogOut, Download, ShieldCheck } from 'lucide-react';
import { APAConnection, APARoster, Player, SkillLevel } from '../types';
import { apaLogin, apaTeams, apaTeam } from '../services/apaApi';

interface Props {
  connection: APAConnection | null;
  players: Player[];
  onSaveConnection: (c: APAConnection) => Promise<void>;
  onUpdateConnection: (patch: Partial<APAConnection>) => Promise<void>;
  onDisconnect: () => Promise<void>;
  onImportPlayers: (players: Player[]) => Promise<void>;
}

const clampSL = (n: number | null): SkillLevel => {
  const v = Math.max(1, Math.min(7, Math.round(n || 3)));
  return v as SkillLevel;
};

// Merge an APA roster into the local player list. Existing players (matched by
// name, case-insensitive) get their skill level for the team's format updated;
// new players are added. Returns the full list to persist and a summary.
function mergeRoster(existing: Player[], roster: APARoster): { merged: Player[]; added: number; updated: number } {
  const is8 = roster.format !== 'NINE';
  const byName = new Map(existing.map(p => [p.name.trim().toLowerCase(), p]));
  let added = 0, updated = 0;
  const merged = [...existing];

  for (const rp of roster.players) {
    const key = rp.name.trim().toLowerCase();
    const sl = clampSL(rp.skillLevel);
    const played = rp.matchesPlayed || 0;
    const won = rp.matchesWon || 0;
    const hit = byName.get(key);
    if (hit) {
      const idx = merged.findIndex(p => p.id === hit.id);
      merged[idx] = {
        ...hit,
        // Skill level + this session's W/L come from APA for the team's format;
        // the other format's numbers are left untouched.
        skillLevel8Ball: is8 ? sl : hit.skillLevel8Ball,
        skillLevel9Ball: is8 ? hit.skillLevel9Ball : sl,
        games8Ball: is8 ? played : hit.games8Ball,
        wins8Ball:  is8 ? won    : hit.wins8Ball,
        games9Ball: is8 ? hit.games9Ball : played,
        wins9Ball:  is8 ? hit.wins9Ball  : won,
        isActive: true,
      };
      updated++;
    } else {
      merged.push({
        id: Math.random().toString(36).slice(2, 11),
        name: rp.name,
        skillLevel8Ball: is8 ? sl : 3,
        skillLevel9Ball: is8 ? 3 : sl,
        games8Ball: is8 ? played : 0,
        wins8Ball:  is8 ? won : 0,
        games9Ball: is8 ? 0 : played,
        wins9Ball:  is8 ? 0 : won,
        monthlyParticipation: 0, isActive: true,
      });
      added++;
    }
  }
  return { merged, added, updated };
}

export const APAConnect: React.FC<Props> = ({
  connection, players, onSaveConnection, onUpdateConnection, onDisconnect, onImportPlayers,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [preview, setPreview] = useState<APARoster | null>(null);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setNotice(null); setBusy(true);
    try {
      const res = await apaLogin(email.trim(), password);
      const conn: APAConnection = {
        deviceRefreshToken: res.deviceRefreshToken,
        member: res.member,
        teams: res.teams,
        activeTeamId: res.teams[0]?.id ?? null,
        connectedAt: new Date().toISOString(),
      };
      await onSaveConnection(conn);
      setPassword('');
      setNotice(`Connected as ${res.member?.firstName ?? 'member'}. Found ${res.teams.length} team${res.teams.length === 1 ? '' : 's'}.`);
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setBusy(false);
    }
  };

  const refreshTeams = async () => {
    if (!connection) return;
    setBusy(true); setError(null);
    try {
      const res = await apaTeams(connection.deviceRefreshToken);
      await onUpdateConnection({ teams: res.teams, member: res.member });
      setNotice('Team list refreshed.');
    } catch (err: any) {
      setError(err.message || 'Could not refresh — your APA session may have expired. Reconnect below.');
    } finally {
      setBusy(false);
    }
  };

  const loadRoster = async () => {
    if (!connection || !connection.activeTeamId) return;
    setBusy(true); setError(null); setNotice(null); setPreview(null);
    try {
      const res = await apaTeam(connection.deviceRefreshToken, connection.activeTeamId);
      setPreview(res.roster);
    } catch (err: any) {
      setError(err.message || 'Could not load roster.');
    } finally {
      setBusy(false);
    }
  };

  const importRoster = async () => {
    if (!preview) return;
    setBusy(true); setError(null);
    try {
      const { merged, added, updated } = mergeRoster(players, preview);
      await onImportPlayers(merged);
      setNotice(`Imported: ${added} added, ${updated} updated (${preview.format === 'NINE' ? '9' : '8'}-ball skill levels).`);
      setPreview(null);
    } catch (err: any) {
      setError(err.message || 'Import failed.');
    } finally {
      setBusy(false);
    }
  };

  const disconnect = async () => {
    setBusy(true);
    try { await onDisconnect(); setPreview(null); setNotice(null); setError(null); }
    finally { setBusy(false); }
  };

  const inputStyle: React.CSSProperties = {
    background: 'rgba(0,229,255,0.04)', border: '1px solid rgba(0,229,255,0.2)',
    borderRadius: 6, padding: '10px 12px', color: 'white', width: '100%', fontSize: 14,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Globe className="w-6 h-6" style={{ color: '#00E5FF' }} />
        <div>
          <h1 className="font-orbitron font-black text-xl text-white tracking-wide">APA SYNC</h1>
          <p className="text-xs" style={{ color: 'rgba(208,232,255,0.5)' }}>
            Pull live rosters & schedules from poolplayers.com
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-start gap-2 px-4 py-3 rounded text-sm"
          style={{ background: 'rgba(255,0,102,0.08)', border: '1px solid rgba(255,0,102,0.3)', color: '#ff87b0' }}>
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> <span>{error}</span>
        </div>
      )}
      {notice && (
        <div className="flex items-start gap-2 px-4 py-3 rounded text-sm"
          style={{ background: 'rgba(0,255,136,0.07)', border: '1px solid rgba(0,255,136,0.3)', color: '#7dffb8' }}>
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> <span>{notice}</span>
        </div>
      )}

      {!connection ? (
        // ── Connect form ──────────────────────────────────────────────
        <form onSubmit={handleConnect} className="space-y-4 max-w-md p-5 rounded-lg"
          style={{ background: 'rgba(0,2,14,0.6)', border: '1px solid rgba(0,229,255,0.12)' }}>
          <div>
            <label className="section-label block mb-1.5">APA Email</label>
            <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com" style={inputStyle} autoComplete="username" />
          </div>
          <div>
            <label className="section-label block mb-1.5">APA Password</label>
            <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" style={inputStyle} autoComplete="current-password" />
          </div>
          <button type="submit" disabled={busy}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded font-bold text-sm"
            style={{ background: busy ? 'rgba(0,229,255,0.15)' : '#00E5FF', color: busy ? '#00E5FF' : '#00020e',
              fontFamily: 'Orbitron, sans-serif', letterSpacing: '.05em', cursor: busy ? 'default' : 'pointer' }}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Globe className="w-4 h-4" />}
            {busy ? 'CONNECTING…' : 'CONNECT ACCOUNT'}
          </button>
          <div className="flex items-start gap-2 text-[11px] pt-1" style={{ color: 'rgba(208,232,255,0.45)' }}>
            <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0" style={{ color: 'rgba(0,229,255,0.6)' }} />
            <span>Your password is used once to connect and is never stored. Only a revocable device token is kept.</span>
          </div>
        </form>
      ) : (
        // ── Connected panel ───────────────────────────────────────────
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-lg"
            style={{ background: 'rgba(0,255,136,0.05)', border: '1px solid rgba(0,255,136,0.2)' }}>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="w-4 h-4" style={{ color: '#00FF88' }} />
              <span className="text-white font-bold">
                Connected{connection.member ? ` — ${connection.member.firstName} ${connection.member.lastName}` : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={refreshTeams} disabled={busy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold"
                style={{ background: 'rgba(0,229,255,0.08)', border: '1px solid rgba(0,229,255,0.25)', color: '#00E5FF' }}>
                <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} /> Refresh
              </button>
              <button onClick={disconnect} disabled={busy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold"
                style={{ background: 'rgba(255,0,102,0.08)', border: '1px solid rgba(255,0,102,0.25)', color: '#ff87b0' }}>
                <LogOut className="w-3.5 h-3.5" /> Disconnect
              </button>
            </div>
          </div>

          <div>
            <label className="section-label block mb-1.5">Active Team</label>
            <select
              value={connection.activeTeamId ?? ''}
              onChange={e => onUpdateConnection({ activeTeamId: Number(e.target.value) })}
              style={{ ...inputStyle, maxWidth: 420 }}>
              {connection.teams.map(t => (
                <option key={t.id} value={t.id} style={{ background: '#00020e' }}>
                  {t.name} ({t.number}){t.session ? ` — ${t.session.name}` : ''}
                </option>
              ))}
            </select>
          </div>

          <button onClick={loadRoster} disabled={busy || !connection.activeTeamId}
            className="flex items-center gap-2 px-4 py-2.5 rounded font-bold text-sm"
            style={{ background: '#00E5FF', color: '#00020e', fontFamily: 'Orbitron, sans-serif', letterSpacing: '.05em' }}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            LOAD ROSTER
          </button>

          {preview && (
            <div className="rounded-lg overflow-hidden" style={{ border: '1px solid rgba(0,229,255,0.15)' }}>
              <div className="flex items-center justify-between px-4 py-3"
                style={{ background: 'rgba(0,229,255,0.05)' }}>
                <span className="text-sm font-bold text-white">
                  {preview.teamName} — {preview.players.length} players ({preview.format === 'NINE' ? '9' : '8'}-ball)
                </span>
                <button onClick={importRoster} disabled={busy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold"
                  style={{ background: '#00FF88', color: '#00020e' }}>
                  <Download className="w-3.5 h-3.5" /> Import to Roster
                </button>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ color: 'rgba(208,232,255,0.5)' }} className="text-left text-xs">
                    <th className="px-4 py-2 font-medium">Player</th>
                    <th className="px-4 py-2 font-medium">SL</th>
                    <th className="px-4 py-2 font-medium">W/P</th>
                    <th className="px-4 py-2 font-medium">PPM</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.players.map((p, i) => (
                    <tr key={i} style={{ borderTop: '1px solid rgba(0,229,255,0.06)' }}>
                      <td className="px-4 py-2 text-white">{p.name}</td>
                      <td className="px-4 py-2 font-mono" style={{ color: '#00E5FF' }}>{p.skillLevel ?? '—'}</td>
                      <td className="px-4 py-2 font-mono" style={{ color: 'rgba(208,232,255,0.7)' }}>{p.matchesWon}/{p.matchesPlayed}</td>
                      <td className="px-4 py-2 font-mono" style={{ color: 'rgba(208,232,255,0.7)' }}>{p.ppm?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
