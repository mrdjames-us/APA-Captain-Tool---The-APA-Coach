
export type SkillLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
}

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
  isActive: boolean; // For archiving players no longer on the team
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
