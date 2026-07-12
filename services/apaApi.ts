// Frontend transport for the APA (poolplayers.com) sync endpoints.
// In production these are Cloudflare Pages Functions (functions/api/apa/*);
// in local dev they're the Express mirror (npm run dev:full), proxied by Vite.
import { APATeam, APARoster, APASchedule, APATeamPage, APAAchievements, APALifetime } from '../types';

const BASE = '/api/apa';

interface ApiOk {
  success: true;
}
interface ApiErr {
  success: false;
  error: string;
  code?: string;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  let resp: Response;
  try {
    resp = await fetch(`${BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error('Could not reach the sync server. Is it running?');
  }
  let data: any;
  try {
    data = await resp.json();
  } catch {
    throw new Error(`Server error (HTTP ${resp.status}).`);
  }
  if (!data || data.success === false) {
    throw new Error((data && data.error) || `Request failed (HTTP ${resp.status}).`);
  }
  return data as T;
}

export interface LoginResult extends ApiOk {
  deviceRefreshToken: string;
  suspended: boolean;
  leagueIds: number[] | null;
  member: { id: number; firstName: string; lastName: string } | null;
  teams: APATeam[];
}

// Connect: exchange email/password for a durable token + the member's teams.
export function apaLogin(username: string, password: string): Promise<LoginResult> {
  return post<LoginResult>('/login', { username, password });
}

export interface TeamsResult extends ApiOk {
  member: { id: number; firstName: string; lastName: string } | null;
  teams: APATeam[];
}

// Refresh the member's team list using a stored token (no password).
export function apaTeams(deviceRefreshToken: string): Promise<TeamsResult> {
  return post<TeamsResult>('/teams', { deviceRefreshToken });
}

export interface TeamResult extends ApiOk {
  page: APATeamPage;
  roster: APARoster;
  schedule: APASchedule;
}

// Full pull for one of the member's own teams.
export function apaTeam(deviceRefreshToken: string, teamId: number): Promise<TeamResult> {
  return post<TeamResult>('/team', { deviceRefreshToken, teamId });
}

export interface ScoutResult extends ApiOk {
  page: APATeamPage;
  roster: APARoster;
}

// Scout any team (opponents included) by id.
export function apaScout(deviceRefreshToken: string, teamId: number): Promise<ScoutResult> {
  return post<ScoutResult>('/scout', { deviceRefreshToken, teamId });
}

export interface AchievementsResult extends ApiOk, APAAchievements {}

// Trophy Case: best-effort achievement counts. Treat failures as "unavailable"
// rather than a real error — the field names behind this were captured from a
// cached-state dump, not verified live traffic like the rest of the API.
export function apaAchievements(deviceRefreshToken: string, teamId: number): Promise<AchievementsResult> {
  return post<AchievementsResult>('/achievements', { deviceRefreshToken, teamId });
}

export interface LifetimeResult extends ApiOk, APALifetime {}

// Lifetime match counts per roster member (for the 10-lifetime-match Vegas
// rule). Best-effort like achievements — treat failures as "unavailable".
export function apaLifetime(deviceRefreshToken: string, teamId: number, format: 'EIGHT' | 'NINE' | null): Promise<LifetimeResult> {
  return post<LifetimeResult>('/lifetime', { deviceRefreshToken, teamId, format });
}
