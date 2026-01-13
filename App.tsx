
import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Roster } from './components/Roster';
import { MatchPlanner } from './components/MatchPlanner';
import { Performance } from './components/Performance';
import { Player, SkillLevel, User, Match, SessionArchive } from './types';
import { Trophy, Shield, ChevronRight, Fingerprint, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

// Start with an empty roster to prevent overwriting user data with sample data
const INITIAL_PLAYERS: Player[] = [];

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('cuemaster_session');
    return saved ? JSON.parse(saved) : null;
  });

  const [players, setPlayers] = useState<Player[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [archives, setArchives] = useState<SessionArchive[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'roster' | 'planner' | 'performance'>('dashboard');
  
  // Login State
  const [callsignInput, setCallsignInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load user-specific data and migrate legacy data if necessary
  useEffect(() => {
    if (user) {
      const pKey = `cuemaster_players_${user.id}`;
      const mKey = `cuemaster_matches_${user.id}`;
      const aKey = `cuemaster_archives_${user.id}`;

      const savedPlayers = localStorage.getItem(pKey);
      const savedMatches = localStorage.getItem(mKey);
      const savedArchives = localStorage.getItem(aKey);
      
      // MIGRATION LOGIC: Check for legacy global keys if user-specific keys are empty
      if (savedPlayers === null) {
        const legacyPlayers = localStorage.getItem('cuemaster_players');
        const legacyMatches = localStorage.getItem('cuemaster_matches');
        const legacyArchives = localStorage.getItem('cuemaster_archives');

        if (legacyPlayers) {
          // Found legacy data, migrate it to the current user
          const parsedPlayers = JSON.parse(legacyPlayers);
          setPlayers(parsedPlayers);
          localStorage.setItem(pKey, legacyPlayers);
          
          if (legacyMatches) {
            setMatches(JSON.parse(legacyMatches));
            localStorage.setItem(mKey, legacyMatches);
          }
          if (legacyArchives) {
            setArchives(JSON.parse(legacyArchives));
            localStorage.setItem(aKey, legacyArchives);
          }
        } else {
          // Truly a new user or fresh start
          setPlayers(INITIAL_PLAYERS);
          localStorage.setItem(pKey, JSON.stringify(INITIAL_PLAYERS));
        }
      } else {
        setPlayers(JSON.parse(savedPlayers));
      }

      if (savedMatches) setMatches(JSON.parse(savedMatches));
      if (savedArchives) setArchives(JSON.parse(savedArchives));
    }
  }, [user?.id]);

  // Save changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(`cuemaster_players_${user.id}`, JSON.stringify(players));
      localStorage.setItem(`cuemaster_matches_${user.id}`, JSON.stringify(matches));
      localStorage.setItem(`cuemaster_archives_${user.id}`, JSON.stringify(archives));
    }
  }, [players, matches, archives, user?.id]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const callsign = callsignInput.trim();
    const password = passwordInput.trim();
    if (!callsign || !password) return;

    setIsLoading(true);
    setError(null);

    setTimeout(() => {
      const userId = callsign.toLowerCase();
      const authRegistryKey = 'cuemaster_auth_registry';
      const registry = JSON.parse(localStorage.getItem(authRegistryKey) || '{}');

      if (registry[userId]) {
        if (registry[userId] !== password) {
          setError("Access Denied: Invalid Security Key.");
          setIsLoading(false);
          return;
        }
      } else {
        registry[userId] = password;
        localStorage.setItem(authRegistryKey, JSON.stringify(registry));
      }

      const newUser: User = {
        id: userId,
        name: callsign,
        email: `${userId}@apacoach.ai`,
        picture: `https://api.dicebear.com/7.x/bottts/svg?seed=${callsign}`,
      };
      
      setUser(newUser);
      localStorage.setItem('cuemaster_session', JSON.stringify(newUser));
      setIsLoading(false);
    }, 1000);
  };

  const addPlayer = (name: string, skill8: SkillLevel, skill9: SkillLevel) => {
    const newPlayer: Player = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      skillLevel8Ball: skill8,
      skillLevel9Ball: skill9,
      games8Ball: 0,
      games9Ball: 0,
      wins8Ball: 0,
      wins9Ball: 0,
      monthlyParticipation: 0,
      isActive: true
    };
    setPlayers(prev => [...prev, newPlayer]);
  };

  const updatePlayer = (id: string, name: string, skill8: SkillLevel, skill9: SkillLevel, isActive?: boolean) => {
    setPlayers(prev => prev.map(p => p.id === id ? { 
      ...p, 
      name, 
      skillLevel8Ball: skill8, 
      skillLevel9Ball: skill9,
      isActive: isActive !== undefined ? isActive : p.isActive 
    } : p));
  };

  const deletePlayer = (id: string) => {
    setPlayers(prev => prev.filter(p => p.id !== id));
  };

  const recordMatch = (match: Match) => {
    setMatches(prev => [...prev, match]);
    
    // Update player stats
    setPlayers(prev => prev.map(p => {
      const playerGames = match.slots.filter(s => s.assignedPlayerId === p.id);
      if (playerGames.length === 0) return p;

      let wins8 = 0;
      let wins9 = 0;
      let games8 = 0;
      let games9 = 0;

      playerGames.forEach(g => {
        if (g.gameType === '8-Ball') {
          games8++;
          if (g.result === 'Win') wins8++;
        } else {
          games9++;
          if (g.result === 'Win') wins9++;
        }
      });

      return {
        ...p,
        games8Ball: p.games8Ball + games8,
        games9Ball: p.games9Ball + games9,
        wins8Ball: p.wins8Ball + wins8,
        wins9Ball: p.wins9Ball + wins9,
        monthlyParticipation: p.monthlyParticipation + playerGames.length
      };
    }));
  };

  const archiveSession = (sessionName: string) => {
    const newArchive: SessionArchive = {
      id: Math.random().toString(36).substr(2, 9),
      name: sessionName,
      startDate: matches.length > 0 ? matches[0].date : new Date().toISOString(),
      endDate: new Date().toISOString(),
      matches: [...matches],
      playerSnapshots: [...players]
    };

    setArchives(prev => [...prev, newArchive]);
    
    // Reset session data
    setMatches([]);
    setPlayers(prev => prev.map(p => ({
      ...p,
      games8Ball: 0,
      games9Ball: 0,
      wins8Ball: 0,
      wins9Ball: 0,
      monthlyParticipation: 0
    })));
  };

  const handleLogout = () => {
    setUser(null);
    setPlayers([]);
    setMatches([]);
    setArchives([]);
    setPasswordInput('');
    localStorage.removeItem('cuemaster_session');
  };

  if (!user) {
    return (
      <div className="min-h-screen login-gradient flex flex-col items-center justify-center p-6 text-center">
        <div className="mb-12 animate-in zoom-in-95 duration-1000">
          <div className="w-24 h-24 bg-gradient-to-br from-indigo-500 to-violet-700 rounded-[2.5rem] flex items-center justify-center shadow-[0_0_50px_rgba(99,102,241,0.3)] mx-auto mb-8 relative">
            <Trophy className="w-12 h-12 text-white" />
            <div className="absolute -top-1 -right-1 w-6 h-6 bg-emerald-500 rounded-full border-4 border-[#020617] animate-pulse"></div>
          </div>
          <h1 className="text-6xl font-black tracking-tighter mb-4 text-white">APA <span className="text-indigo-500">Coach</span></h1>
          <p className="text-slate-400 max-w-sm mx-auto text-lg leading-relaxed">Rule of 23 optimized. Quota enforced. Identity verified.</p>
        </div>
        
        <div className="w-full max-w-md bg-slate-900/40 backdrop-blur-2xl border border-slate-800 p-10 rounded-[3rem] shadow-2xl animate-in slide-in-from-bottom-12 duration-700">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="text-left space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Captain Callsign</label>
              <div className="relative group">
                <Shield className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type="text" 
                  value={callsignInput}
                  onChange={(e) => setCallsignInput(e.target.value)}
                  placeholder="Tactical ID" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-14 pr-6 py-4 text-white font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="text-left space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Command Password</label>
              <div className="relative group">
                <Lock className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-500 transition-colors" />
                <input 
                  type={showPassword ? "text" : "password"}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Security Key" 
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-14 pr-14 py-4 text-white font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  required
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-rose-500 text-xs font-bold justify-center py-2 animate-bounce">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading || !callsignInput.trim() || !passwordInput.trim()}
              className="w-full mt-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 shadow-xl shadow-indigo-500/20 transition-all active:scale-95"
            >
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  <span className="text-sm">Unlocking Vault...</span>
                </div>
              ) : (
                <>
                  <Fingerprint className="w-5 h-5" />
                  <span>Decrypt & Connect</span>
                  <ChevronRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
          
          <div className="mt-8 pt-8 border-t border-slate-800/50">
            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest leading-relaxed">
              New Users: Your first password sets your password
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab} 
      playerCount={players.filter(p => p.isActive).length}
      user={user}
      onLogout={handleLogout}
    >
      {activeTab === 'dashboard' && <Dashboard players={players.filter(p => p.isActive)} matches={matches} />}
      {activeTab === 'roster' && (
        <Roster 
          players={players} 
          onAddPlayer={addPlayer} 
          onUpdatePlayer={updatePlayer}
          onDeletePlayer={deletePlayer} 
        />
      )}
      {activeTab === 'planner' && (
        <MatchPlanner 
          players={players.filter(p => p.isActive)} 
          onMatchComplete={recordMatch}
        />
      )}
      {activeTab === 'performance' && (
        <Performance 
          players={players} 
          matches={matches} 
          archives={archives}
          onArchiveSession={archiveSession}
        />
      )}
    </Layout>
  );
};

export default App;
