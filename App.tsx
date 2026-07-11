
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Layout, TabId } from './components/Layout';
import { AuthScreen } from './components/AuthScreen';
import { Dashboard } from './components/Dashboard';
import { Roster } from './components/Roster';
import { MatchPlanner } from './components/MatchPlanner';
import { Performance } from './components/Performance';
import { ScheduleView } from './components/ScheduleView';
import { APAConnect } from './components/APAConnect';
import { Scouting } from './components/Scouting';
import { GettingStarted } from './components/GettingStarted';

import { useAuth } from './hooks/useAuth';
import { usePlayers, useMatches, useArchives, useSchedule, useSeasonWeek, useApaConnection } from './hooks/useFirestore';

import { Player, SkillLevel, Match, GameType, SessionArchive, ScheduleEntry, PlannerContext } from './types';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
  const { user, loading: authLoading, error: authError, loginGoogle, logout } = useAuth();
  const uid = user?.uid ?? null;

  const { players, loading: playersLoading, save: savePlayer, remove: removePlayer, saveAll: saveAllPlayers } = usePlayers(uid);
  const { connection: apaConnection, loading: apaLoading, save: saveApa, update: updateApa, disconnect: disconnectApa } = useApaConnection(uid);
  const { matches, save: saveMatch } = useMatches(uid);
  const { archives, save: saveArchive, deleteAllMatches } = useArchives(uid);
  const { schedule, loading: scheduleLoading, save: saveScheduleEntry, remove: removeScheduleEntry, saveAll: saveAllSchedule } = useSchedule(uid);
  const [currentWeek, setCurrentWeek] = useSeasonWeek(uid);

  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const [plannerContext, setPlannerContext] = useState<PlannerContext | undefined>(undefined);

  // First-time captains: once their data has loaded and we can see they have no
  // APA connection and no roster yet, send them straight to APA Sync instead of
  // an empty Dashboard. Only fires once per session so it never fights back if
  // they navigate away.
  const autoRedirected = useRef(false);
  useEffect(() => {
    if (autoRedirected.current) return;
    if (playersLoading || apaLoading) return;
    autoRedirected.current = true;
    if (!apaConnection && players.length === 0) {
      setActiveTab('apa');
    }
  }, [playersLoading, apaLoading, apaConnection, players.length]);

  // ── Player ops ──────────────────────────────────────────────────────────────
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

  // ── Match ops ───────────────────────────────────────────────────────────────
  const recordMatch = useCallback((match: Match) => {
    saveMatch(match);
    match.slots.forEach(slot => {
      const player = players.find(p => p.id === slot.assignedPlayerId);
      if (!player) return;
      const is8 = slot.gameType === GameType.EIGHT_BALL;
      savePlayer({
        ...player,
        games8Ball:   player.games8Ball   + (is8 ? 1 : 0),
        games9Ball:   player.games9Ball   + (is8 ? 0 : 1),
        wins8Ball:    player.wins8Ball    + (is8 && slot.result === 'Win' ? 1 : 0),
        wins9Ball:    player.wins9Ball    + (!is8 && slot.result === 'Win' ? 1 : 0),
        monthlyParticipation: player.monthlyParticipation + 1,
      });
    });
  }, [players, saveMatch, savePlayer]);

  // ── Archive op ──────────────────────────────────────────────────────────────
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

  // ── Schedule ops ────────────────────────────────────────────────────────────
  const planMatchFromSchedule = useCallback((entry: ScheduleEntry) => {
    setPlannerContext({
      opponentName: entry.opponentTeamName,
      opponentApaTeamId: entry.opponentApaTeamId,
      format: entry.format,
      scheduleEntryId: entry.id,
    });
    setActiveTab('planner');
  }, []);

  // ── Loading screen ──────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin" style={{ color: '#39A7C9' }} />
          <p className="section-label opacity-60">INITIALISING</p>
        </div>
      </div>
    );
  }

  // ── Auth screen ─────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <AuthScreen
        onGoogle={loginGoogle}
        loading={false}
        error={authError}
      />
    );
  }

  // ── Main app ────────────────────────────────────────────────────────────────
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
        <div className="space-y-6">
          <GettingStarted
            connected={!!apaConnection}
            hasRoster={players.length > 0}
            hasSchedule={schedule.length > 0}
            loading={apaLoading || playersLoading || scheduleLoading}
            onGoToTab={setActiveTab}
          />
          <Dashboard
            players={activePlayers}
            currentWeek={currentWeek}
            onWeekChange={setCurrentWeek}
          />
        </div>
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
          connection={apaConnection}
          onSaveEntry={saveScheduleEntry}
          onDeleteEntry={removeScheduleEntry}
          onSaveAll={saveAllSchedule}
          onPlanMatch={planMatchFromSchedule}
        />
      )}

      {activeTab === 'planner' && (
        <MatchPlanner
          players={activePlayers}
          connection={apaConnection}
          onMatchComplete={recordMatch}
          userId={user.uid}
          context={plannerContext}
        />
      )}

      {activeTab === 'apa' && (
        <APAConnect
          connection={apaConnection}
          players={players}
          onSaveConnection={saveApa}
          onUpdateConnection={updateApa}
          onDisconnect={disconnectApa}
          onImportPlayers={saveAllPlayers}
        />
      )}

      {activeTab === 'scouting' && (
        <Scouting connection={apaConnection} />
      )}

      {activeTab === 'history' && (
        <Performance
          players={players}
          matches={matches}
          archives={archives}
          schedule={schedule}
          connection={apaConnection}
          onArchiveSession={archiveSession}
        />
      )}
    </Layout>
  );
};

export default App;
