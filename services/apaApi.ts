import { APAPlayer, APATeamInfo } from '../types';

const BASE = '/api/apa';

async function apiRequest<T>(url: string, options?: RequestInit): Promise<T> {
  const resp = await fetch(url, options);
  const data = await resp.json();
  return data as T;
}

export async function loginToAPA(
  memberId: string,
  password: string
): Promise<{ success: boolean; sessionId?: string; teamInfo?: APATeamInfo; error?: string }> {
  return apiRequest(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memberId, password }),
  });
}

export async function fetchAPARoster(
  sessionId: string
): Promise<{ success: boolean; roster?: APAPlayer[]; error?: string }> {
  return apiRequest(`${BASE}/roster`, {
    headers: { 'x-apa-session': sessionId },
  });
}

export async function fetchAPAStats(
  sessionId: string
): Promise<{ success: boolean; stats?: APAPlayer[]; error?: string }> {
  return apiRequest(`${BASE}/stats`, {
    headers: { 'x-apa-session': sessionId },
  });
}

export async function logoutFromAPA(sessionId: string): Promise<void> {
  await fetch(`${BASE}/logout`, {
    method: 'POST',
    headers: { 'x-apa-session': sessionId },
  });
}

export async function checkServerHealth(): Promise<boolean> {
  try {
    const resp = await fetch(`${BASE}/health`);
    return resp.ok;
  } catch {
    return false;
  }
}
