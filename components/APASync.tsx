
import React, { useState, useCallback } from 'react';
import {
  Globe, LogIn, LogOut, RefreshCw, Download, CheckCircle2,
  XCircle, AlertCircle, Eye, EyeOff, Users, BarChart3,
  Shield, ChevronRight, Info, ServerCrash, Loader2
} from 'lucide-react';
import { APAPlayer, APATeamInfo, Player, SkillLevel } from '../types';
import { loginToAPA, fetchAPARoster, fetchAPAStats, logoutFromAPA, checkServerHealth } from '../services/apaApi';

type SyncStatus = 'idle' | 'checking' | 'connecting' | 'connected' | 'error' | 'no-server';
type DataView = 'roster' | 'stats';

interface ImportResult {
  added: number;
  updated: number;
}

interface APASyncProps {
  onImportPlayers: (players: APAPlayer[]) => ImportResult;
}

export const APASync: React.FC<APASyncProps> = ({ onImportPlayers }) => {
  const [memberId, setMemberId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [status, setStatus] = useState<SyncStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [teamInfo, setTeamInfo] = useState<APATeamInfo | null>(null);

  const [roster, setRoster] = useState<APAPlayer[]>([]);
  const [stats, setStats] = useState<APAPlayer[]>([]);
  const [dataView, setDataView] = useState<DataView>('roster');

  const [loadingRoster, setLoadingRoster] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const handleConnect = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setImportResult(null);
    setError(null);
    setStatus('checking');

    const serverOk = await checkServerHealth();
    if (!serverOk) {
      setStatus('no-server');
      return;
    }

    setStatus('connecting');
    try {
      const result = await loginToAPA(memberId.trim(), password);
      if (result.success && result.sessionId) {
        setSessionId(result.sessionId);
        setTeamInfo(result.teamInfo ?? null);
        setStatus('connected');
        // Auto-fetch roster on login
        await loadRoster(result.sessionId);
      } else {
        setStatus('error');
        setError(result.error || 'Login failed. Check your credentials.');
      }
    } catch (err) {
      setStatus('error');
      setError('Could not reach the APA proxy server. Run: npm run server');
    }
  }, [memberId, password]);

  const loadRoster = useCallback(async (sid?: string) => {
    const id = sid ?? sessionId;
    if (!id) return;
    setLoadingRoster(true);
    setError(null);
    try {
      const result = await fetchAPARoster(id);
      if (result.success && result.roster) {
        setRoster(result.roster);
        setSelected(new Set(result.roster.map((p) => p.name)));
      } else {
        setError(result.error || 'Failed to fetch roster.');
      }
    } catch {
      setError('Roster fetch error. The session may have expired.');
    } finally {
      setLoadingRoster(false);
    }
  }, [sessionId]);

  const loadStats = useCallback(async () => {
    if (!sessionId) return;
    setLoadingStats(true);
    setError(null);
    try {
      const result = await fetchAPAStats(sessionId);
      if (result.success && result.stats) {
        setStats(result.stats);
      } else {
        setError(result.error || 'Failed to fetch stats.');
      }
    } catch {
      setError('Stats fetch error. The session may have expired.');
    } finally {
      setLoadingStats(false);
    }
  }, [sessionId]);

  const handleTabChange = (view: DataView) => {
    setDataView(view);
    if (view === 'stats' && stats.length === 0) {
      loadStats();
    }
  };

  const handleDisconnect = async () => {
    if (sessionId) await logoutFromAPA(sessionId);
    setSessionId(null);
    setTeamInfo(null);
    setRoster([]);
    setStats([]);
    setSelected(new Set());
    setStatus('idle');
    setError(null);
    setImportResult(null);
    setPassword('');
  };

  const toggleSelect = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const source = dataView === 'roster' ? roster : stats;
    if (selected.size === source.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(source.map((p) => p.name)));
    }
  };

  const handleImport = () => {
    const source = dataView === 'roster' ? roster : stats;
    const toImport = source.filter((p) => selected.has(p.name));
    if (toImport.length === 0) return;
    const result = onImportPlayers(toImport);
    setImportResult(result);
  };

  const currentData = dataView === 'roster' ? roster : stats;

  // ── No-server state ──────────────────────────────────────────────────────
  if (status === 'no-server') {
    return (
      <div className="space-y-6">
        <Header />
        <div className="bg-slate-900/40 border border-amber-500/30 rounded-3xl p-8 text-center">
          <ServerCrash className="w-12 h-12 text-amber-400 mx-auto mb-4" />
          <h3 className="text-lg font-black text-white mb-2">Proxy Server Not Running</h3>
          <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
            The APA Sync feature requires a local proxy server to bypass CORS restrictions when
            communicating with poolplayers.com.
          </p>
          <div className="bg-slate-950 border border-slate-700 rounded-2xl p-4 text-left mb-6 max-w-md mx-auto">
            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest mb-2">Start the proxy server</p>
            <code className="text-emerald-400 text-sm font-mono">npm run server</code>
            <p className="text-slate-600 text-xs mt-2">Or run both together: <code className="text-indigo-400">npm run dev:full</code></p>
          </div>
          <button
            onClick={() => setStatus('idle')}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-2xl transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // ── Login form ────────────────────────────────────────────────────────────
  if (status !== 'connected') {
    return (
      <div className="space-y-6">
        <Header />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Login Card */}
          <div className="bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 rounded-xl">
                <Globe className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white">Connect to PoolPlayers.com</h3>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">APA Member Credentials</p>
              </div>
            </div>

            <form onSubmit={handleConnect} className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                  APA Member ID or Email
                </label>
                <div className="relative">
                  <Shield className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={memberId}
                    onChange={(e) => setMemberId(e.target.value)}
                    placeholder="Member ID or email"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-4 py-3.5 text-white text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">
                  Password
                </label>
                <div className="relative">
                  <LogIn className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="APA password"
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-11 pr-12 py-3.5 text-white text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                  <XCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                  <p className="text-xs text-rose-300 font-bold">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={status === 'connecting' || status === 'checking' || !memberId.trim() || !password}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3.5 rounded-2xl font-black flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20 transition-all active:scale-95 text-sm"
              >
                {status === 'checking' || status === 'connecting' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{status === 'checking' ? 'Checking server...' : 'Connecting to APA...'}</span>
                  </>
                ) : (
                  <>
                    <Globe className="w-4 h-4" />
                    <span>Connect to PoolPlayers.com</span>
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Info Card */}
          <div className="bg-slate-900/20 border border-slate-800/60 rounded-3xl p-8 space-y-5">
            <div className="flex items-center gap-2 mb-1">
              <Info className="w-4 h-4 text-indigo-400" />
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">What Gets Imported</p>
            </div>

            <div className="space-y-4">
              {[
                { icon: Users, title: 'Team Roster', desc: 'All active players on your registered APA team, including member IDs.' },
                { icon: BarChart3, title: 'Skill Levels', desc: '8-Ball and 9-Ball skill levels pulled directly from the APA records.' },
                { icon: Shield, title: 'Season Stats', desc: 'Games played and win counts for the current session.' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex gap-3">
                  <div className="p-2 bg-indigo-600/10 border border-indigo-500/20 rounded-xl shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-200">{title}</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-4">
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-1">Security Note</p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Your APA credentials are sent only to the local proxy server and never stored. The proxy
                communicates securely with poolplayers.com on your behalf.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Connected view ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <Header />

      {/* Team Info + Status Bar */}
      <div className="bg-slate-900/40 border border-emerald-500/20 rounded-3xl p-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-black text-white truncate">
                {teamInfo?.teamName || 'Team Connected'}
              </p>
              <span className="px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-black uppercase rounded-full tracking-widest shrink-0">
                Live
              </span>
            </div>
            <p className="text-[10px] text-slate-500 truncate">
              {[teamInfo?.division, teamInfo?.season].filter(Boolean).join(' · ') || 'poolplayers.com'}
            </p>
          </div>
        </div>
        <button
          onClick={handleDisconnect}
          className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-400 text-xs font-black rounded-xl transition-all uppercase tracking-widest shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          Disconnect
        </button>
      </div>

      {/* Import Result Banner */}
      {importResult && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <p className="text-sm font-bold text-emerald-300">
            Import complete — <span className="font-black">{importResult.added}</span> players added,{' '}
            <span className="font-black">{importResult.updated}</span> updated.
          </p>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <p className="text-sm font-bold text-rose-300">{error}</p>
        </div>
      )}

      {/* Data Tabs + Table */}
      <div className="bg-slate-900/40 border border-slate-800 rounded-3xl overflow-hidden">
        {/* Tab Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 flex-wrap gap-3">
          <div className="flex gap-1 bg-slate-950/50 p-1 rounded-xl">
            {(['roster', 'stats'] as DataView[]).map((view) => (
              <button
                key={view}
                onClick={() => handleTabChange(view)}
                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                  dataView === view
                    ? 'bg-indigo-600 text-white shadow-lg'
                    : 'text-slate-500 hover:text-white'
                }`}
              >
                {view === 'roster' ? (
                  <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" />Roster</span>
                ) : (
                  <span className="flex items-center gap-1.5"><BarChart3 className="w-3.5 h-3.5" />Stats</span>
                )}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => dataView === 'roster' ? loadRoster() : loadStats()}
              disabled={loadingRoster || loadingStats}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-black rounded-xl transition-all"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loadingRoster || loadingStats ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Loading state */}
        {(loadingRoster && dataView === 'roster') || (loadingStats && dataView === 'stats') ? (
          <div className="flex items-center justify-center py-16 gap-3">
            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
            <span className="text-slate-400 text-sm font-bold">
              Fetching {dataView} from poolplayers.com…
            </span>
          </div>
        ) : currentData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center px-6">
            <Globe className="w-10 h-10 text-slate-600" />
            <p className="text-slate-400 font-bold">No {dataView} data found.</p>
            <p className="text-slate-600 text-sm max-w-md">
              This may indicate poolplayers.com's page structure doesn't match what the parser expects.
              The site layout may have changed.
            </p>
          </div>
        ) : (
          <>
            {/* Selection controls */}
            <div className="flex items-center justify-between px-6 py-3 bg-slate-950/30 border-b border-slate-800/60">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.size === currentData.length && currentData.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded accent-indigo-500"
                />
                <span className="text-xs font-black text-slate-400 uppercase tracking-widest">
                  {selected.size} / {currentData.length} selected
                </span>
              </label>
              <button
                onClick={handleImport}
                disabled={selected.size === 0}
                className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl transition-all shadow-lg shadow-indigo-500/20"
              >
                <Download className="w-3.5 h-3.5" />
                Import {selected.size > 0 ? `(${selected.size})` : ''}
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800/60">
                    <th className="w-10 px-4 py-3"></th>
                    <th className="text-left px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Player</th>
                    {dataView === 'roster' ? (
                      <>
                        <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">8-Ball SL</th>
                        <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">9-Ball SL</th>
                        <th className="text-left px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Member ID</th>
                      </>
                    ) : (
                      <>
                        <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">8-Ball G/W</th>
                        <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">9-Ball G/W</th>
                        <th className="text-center px-4 py-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Win %</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {currentData.map((player, idx) => {
                    const isSelected = selected.has(player.name);
                    const totalGames = (player.games8Ball || 0) + (player.games9Ball || 0);
                    const totalWins = (player.wins8Ball || 0) + (player.wins9Ball || 0);
                    const winPct = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
                    return (
                      <tr
                        key={`${player.name}-${idx}`}
                        onClick={() => toggleSelect(player.name)}
                        className={`border-b border-slate-800/40 cursor-pointer transition-colors ${
                          isSelected ? 'bg-indigo-600/5 hover:bg-indigo-600/10' : 'hover:bg-slate-800/30'
                        }`}
                      >
                        <td className="px-4 py-3.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelect(player.name)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-4 h-4 rounded accent-indigo-500"
                          />
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-bold text-slate-200">{player.name}</p>
                        </td>
                        {dataView === 'roster' ? (
                          <>
                            <td className="px-4 py-3.5 text-center">
                              <SkillBadge value={player.skillLevel8Ball} />
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <SkillBadge value={player.skillLevel9Ball} />
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="text-xs text-slate-500 font-mono">{player.memberId || '—'}</span>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-4 py-3.5 text-center">
                              <span className="text-xs font-bold text-slate-300">
                                {player.games8Ball || 0} / {player.wins8Ball || 0}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <span className="text-xs font-bold text-slate-300">
                                {player.games9Ball || 0} / {player.wins9Ball || 0}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <span className={`text-xs font-black ${winPct >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                {totalGames > 0 ? `${winPct}%` : '—'}
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

const Header: React.FC = () => (
  <div>
    <div className="flex items-center gap-3 mb-1">
      <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 rounded-xl">
        <Globe className="w-5 h-5 text-indigo-400" />
      </div>
      <h2 className="text-2xl font-black text-white tracking-tight">APA Sync</h2>
    </div>
    <p className="text-slate-400 text-sm ml-12">Import your official roster and stats directly from poolplayers.com</p>
  </div>
);

const SkillBadge: React.FC<{ value: number }> = ({ value }) => {
  const colors: Record<number, string> = {
    1: 'bg-slate-700 text-slate-300',
    2: 'bg-blue-900/50 text-blue-300',
    3: 'bg-cyan-900/50 text-cyan-300',
    4: 'bg-emerald-900/50 text-emerald-300',
    5: 'bg-yellow-900/50 text-yellow-300',
    6: 'bg-orange-900/50 text-orange-300',
    7: 'bg-rose-900/50 text-rose-300',
  };
  return (
    <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-black ${colors[value] || 'bg-slate-700 text-slate-300'}`}>
      {value}
    </span>
  );
};
