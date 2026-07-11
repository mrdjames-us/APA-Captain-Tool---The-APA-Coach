
export type SkillLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface Player {
  id: string;
  name: string;
  skillLevel8Ball: SkillLevel;
  skillLevel9Ball: SkillLevel;
  games8Ball: number;
  games9Ball: number;
  wins8Ball: number;
  wins9Ball: number;
  monthlyParticipation: number;
  isActive: boolean;
  // APA's stable per-member id (from poolplayers.com roster data). Used to match
  // a player across imports even if their display name changes slightly —
  // name-only matching is fragile (nicknames, middle initials, stray whitespace).
  apaMemberNumber?: string;
  // Points-per-match / performance average from APA, per format. A better
  // efficiency read than win % alone (a 8-7 grinder and an 8-1 blowout look
  // identical under win rate).
  ppm8Ball?: number;
  pa8Ball?: number;
  ppm9Ball?: number;
  pa9Ball?: number;
}

export enum GameType {
  EIGHT_BALL = '8-Ball',
  NINE_BALL = '9-Ball'
}

export interface MatchSlot {
  id: number;
  gameType: GameType;
  opponentSkill: SkillLevel;
  assignedPlayerId: string | null;
  result: 'Win' | 'Loss' | null;
}

export interface Match {
  id: string;
  date: string;
  opponentTeamName: string;
  slots: MatchSlot[];
  totalWins: number;
  totalLosses: number;
}

export interface SessionArchive {
  id: string;
  startDate: string;
  endDate: string;
  name: string;
  matches: Match[];
  playerSnapshots: Player[];
}

export interface ScheduleEntry {
  id: string;
  date: string;
  opponentTeamName: string;
  location?: string;
  isHome: boolean;
  matchId?: string;
  // Populated when the entry was synced from poolplayers.com.
  source?: 'apa' | 'manual';
  apaMatchId?: number;
  apaTeamId?: number;
  opponentApaTeamId?: number; // opponent's team id — used to load their roster
  format?: 'EIGHT' | 'NINE';  // the division format of this match
  week?: number;
  isBye?: boolean;
  isScored?: boolean;
  myPoints?: number | null;
  oppPoints?: number | null;
}

// Context passed to the Match Planner when planning a specific match.
export interface PlannerContext {
  opponentName: string;
  opponentApaTeamId?: number;
  format?: 'EIGHT' | 'NINE';
  scheduleEntryId?: string;
}

export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  provider: 'google';
}

// ── poolplayers.com (APA) sync ────────────────────────────────────────────────
// Data pulled live from poolplayers.com's GraphQL API. See docs/poolplayers-api.md.

export interface APATeam {
  id: number;
  name: string;
  number: string;
  session?: { id: number; name: string } | null;
}

export interface APARosterPlayer {
  memberId: number | null;
  memberNumber: string;
  name: string;
  skillLevel: number | null;
  matchesWon: number;
  matchesPlayed: number;
  ppm: number;
  pa: number;
}

export interface APARoster {
  teamId: number;
  teamName: string;
  teamNumber: string;
  format: 'EIGHT' | 'NINE' | null;
  players: APARosterPlayer[];
}

export interface APAMatch {
  id: number;
  week: number;
  type: string;
  isBye: boolean;
  isScored: boolean;
  isFinalized: boolean;
  isPlayoff: boolean;
  startTime: string | null;
  isHome: boolean;
  opponent: { id: number; name: string; number: string } | null;
  location: string | null;
  points: { homeAway: string; total: number | null }[];
}

export interface APASchedule {
  teamId: number;
  sessionPoints: number;
  sessionBonusPoints: number;
  sessionTotalPoints: number;
  matches: APAMatch[];
}

export interface APATeamPage {
  id: number;
  name: string;
  number: string;
  standing: number | null;
  isTied: boolean;
  division: {
    id: number;
    name: string;
    number: string;
    format: string;
    nightOfPlay: string;
    timeOfPlay: string;
  } | null;
  location: string | null;
  session: { id: number; name: string } | null;
}

// Trophy Case: best-effort achievement/highlight counts per player. Any field
// may be null if APA doesn't report it for that player/format.
export interface APAAchievementPlayer {
  memberNumber: string;
  name: string;
  eightOnBreaks: number | null;
  breakAndRuns8: number | null;
  rackless: number | null;
  breakAndRuns9: number | null;
  nineOnSnaps: number | null;
  skunks: number | null;
  miniSlams: number | null;
}

export interface APAAchievements {
  teamId: number;
  players: APAAchievementPlayer[];
}

// What we persist locally to keep syncing without re-entering a password.
export interface APAConnection {
  deviceRefreshToken: string;
  member: { id: number; firstName: string; lastName: string } | null;
  teams: APATeam[];
  activeTeamId: number | null;
  connectedAt: string;
}
