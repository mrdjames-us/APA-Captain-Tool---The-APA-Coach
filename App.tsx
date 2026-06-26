
import React, { useState, useCallback } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import { Layout, TabId } from './components/Layout';
import { AuthScreen } from './components/AuthScreen';
import { Dashboard } from './components/Dashboard';
import { Roster } from './components/Roster';
import { MatchPlanner } from './components/MatchPlanner';
import { Performance } from './components/Performance';
import { ScheduleView } from './components/ScheduleView';
import { MissionControl } from './components/MissionControl';

import { useAuth } from './hooks/useAuth';
import { usePlayers, useMatches, useArchives, useSchedule, useSeasonWeek } from './hooks/useFirestore';

import { Player, SkillLevel, Match, GameType, SessionArchive } from './types';
import { Loader2 } from 'lucide-react';

// ── Public /mission-control route (no auth required) ────────────────────────
const MissionControlPage: React.FC = () => {
  const navigate = useNavigate();
  return (
    <MissionControl
      onBack={() => navigate('/')}
      onSignIn={() => navigate('/')}
    />
  );
};

// ── Main app (auth-gated) ────────────────────────────────────────────────────
const MainApp: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading, error: authError, loginGoogle, loginFacebook, logout } = useAuth();
  const uid = user?.uid ?? null;

  const { players, save: savePlayer, remove: removePlayer } = usePlayers(uid);
  const { matches, save: saveMatch } = useMatches(uid);
  const { archives, save: saveArchive, deleteAllMatches } = useArchives(uid);
  const { schedule, save: saveScheduleEntry, remove: removeScheduleEntry, saveAll: saveAllSchedule } = useSchedule(uid);
  const [currentWeek, setCurrentWeek] = useSeasonWeek(uid);

  const [activeTab, setActiveTab]       = useState<TabId>('dashboard');
  const [plannerOpponent, setPlannerOpponent] = useState<string | undefined>(undefined);

  // ── Player ops ─────────────────────────────────────────────────────────────
  const addPlayer = useCallback((name: string, skill8: SkillLevel, skill9: SkillLevel) => {
    const p: Player = {
      id: Math.random().toString(36).slice(2, 11),
      name, skillLevel8Ball: skill8, skillLevel9Ball: skill9,
      games8Ball: 0, games9Ball: 0,
      wins8Ball: 0, wins9Ball: 0,
      monthlyParticipation: 0, isActive: true,
    };
    savePlayer(p);
  }, [savePlayer]);

  const updatePlayer = useCallback((id: string, updates: Partial<Player>) => {
    const existing = players.find(p => p.id === id);
    if (existing) savePlayer({ ...existing, ...updates });
  }, [players, savePlayer]);

  const deletePlayer = useCallback((id: string) => removePlayer(id), [removePlayer]);

  // ── Match ops ──────────────────────────────────────────────────────────────
  const recordMatch = useCallback((match: Match) => {
    saveMatch(match);
    match.slots.forEach(slot => {
      const player = players.find(p => p.id === slot.assignedPlayerId);
      if (!player) return;
      const is8 = slot.gameType === GameType.EIGHT_BALL;
      savePlayer({
        ...player,
        games8Ball:  player.games8Ball  + (is8 ? 1 : 0),
        games9Ball:  player.games9Ball  + (is8 ? 0 : 1),
        wins8Ball:   player.wins8Ball   + (is8 && slot.result === 'Win' ? 1 : 0),
        wins9Ball:   player.wins9Ball   + (!is8 && slot.result === 'Win' ? 1 : 0),
        monthlyParticipation: player.monthlyParticipation + 1,
      });
    });
  }, [players, saveMatch, savePlayer]);

  // ── Archive op ─────────────────────────────────────────────────────────────
  const archiveSession = useCallback(async (sessionName: string) => {
    const archive: SessionArchive = {
      id: Math.random().toString(36).slice(2, 11),
      name: sessionName,
      startDate: matches.length > 0 ? matches[0].date : new Date().toISOString(),
      endDate: new Date().toISOString(),
      matches: [...matches],
      playerSnapshots: JSON.parse(JSON.stringify(players)),
    };
    await saveArchive(archive);
    await deleteAllMatches();
    players.forEach(p => savePlayer({ ...p, monthlyParticipation: 0 }));
  }, [matches, players, saveArchive, deleteAllMatches, savePlayer]);

  // ── Schedule ops ───────────────────────────────────────────────────────────
  const planMatchFromSchedule = useCallback((opponentName: string) => {
    setPlannerOpponent(opponentName);
    setActiveTab('planner');
  }, []);

  // ── Loading ────────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#00B4D8' }} />
          <p className="section-label opacity-60">INITIALISING</p>
        </div>
      </div>
    );
  }

  // ── Auth ───────────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <AuthScreen
        onGoogle={loginGoogle}
        onFacebook={loginFacebook}
        loading={false}
        error={authError}
        onPlayGame={() => navigate('/mission-control')}
      />
    );
  }

  // ── Main app ───────────────────────────────────────────────────────────────
  const activePlayers = players.filter(p => p.isActive);

  return (
    <Layout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      playerCount={activePlayers.length}
      user={user}
      onLogout={logout}
    >
      {activeTab === 'dashboard' && (
        <Dashboard
          players={activePlayers}
          currentWeek={currentWeek}
          onWeekChange={setCurrentWeek}
        />
      )}

      {activeTab === 'roster' && (
        <Roster
          players={players}
          onAddPlayer={addPlayer}
          onUpdatePlayer={updatePlayer}
          onDeletePlayer={deletePlayer}
        />
      )}

      {activeTab === 'schedule' && (
        <ScheduleView
          schedule={schedule}
          onSaveEntry={saveScheduleEntry}
          onDeleteEntry={removeScheduleEntry}
          onSaveAll={saveAllSchedule}
          onPlanMatch={planMatchFromSchedule}
        />
      )}

      {activeTab === 'planner' && (
        <MatchPlanner
          players={activePlayers}
          onMatchComplete={recordMatch}
          userId={user.uid}
          opponentFromSchedule={plannerOpponent}
        />
      )}

      {activeTab === 'history' && (
        <Performance
          players={players}
          matches={matches}
          archives={archives}
          onArchiveSession={archiveSession}
        />
      )}

      {activeTab === 'game' && (
        <MissionControl />
      )}
    </Layout>
  );
};

// ── Router root ───────────────────────────────────────────────────────────────
const App: React.FC = () => (
  <Routes>
    <Route path="/mission-control" element={<MissionControlPage />} />
    <Route path="/*" element={<MainApp />} />
  </Routes>
);

export default App;
