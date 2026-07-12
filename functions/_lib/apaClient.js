// poolplayers.com GraphQL client — shared by Cloudflare Pages Functions (prod)
// and the local Express dev server (`npm run dev`). Uses only web-standard APIs
// (global fetch), so it runs unchanged on the Workers runtime and Node 18+.
//
// Replaces the old HTML scraper. poolplayers.com's member area is now a React
// SPA on a GraphQL API. Full reverse-engineered spec: docs/poolplayers-api.md
//
// Auth chain (all mutations hit the same GraphQL endpoint):
//   login(username, password)          -> deviceRefreshToken   (durable credential)
//   authorize(deviceRefreshToken)      -> refreshToken         (session)
//   generateAccessToken(refreshToken)  -> accessToken          (short-lived bearer)
// Data queries then send: Authorization: Bearer <accessToken>
//
// We persist ONLY the deviceRefreshToken (the caller stores it, ideally
// encrypted). accessToken/refreshToken are derived per sync and never stored.

const GQL_ENDPOINT = 'https://gql.poolplayers.com/graphql';

const BASE_HEADERS = {
  'Content-Type': 'application/json',
  Accept: '*/*',
  // Match the Member Services web app exactly. The client-name is "MemberServices"
  // (no space) — the server keys off it.
  'apollographql-client-name': 'MemberServices',
  'apollographql-client-version': '3.18.53-3856',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Origin: 'https://league.poolplayers.com',
  Referer: 'https://league.poolplayers.com/',
};

// ── Low-level GraphQL POST ────────────────────────────────────────────────────

async function gql(operationName, query, variables, accessToken) {
  const headers = { ...BASE_HEADERS };
  // NOTE: poolplayers.com expects the raw token in Authorization with NO "Bearer "
  // prefix. Sending "Bearer <token>" makes the server silently return viewer: null.
  if (accessToken) headers.Authorization = accessToken;

  let res;
  try {
    res = await fetch(GQL_ENDPOINT, {
      method: 'POST',
      headers,
      body: JSON.stringify({ operationName, query, variables }),
    });
  } catch (err) {
    throw new ApaError('NETWORK', `Could not reach poolplayers.com: ${err.message}`);
  }

  let body;
  try {
    body = await res.json();
  } catch {
    throw new ApaError('BAD_RESPONSE', `poolplayers.com returned a non-JSON response (HTTP ${res.status}).`);
  }

  if (body.errors && body.errors.length) {
    const msg = body.errors.map((e) => e.message).join('; ');
    const code = res.status === 401 || /unauthorized|token/i.test(msg) ? 'AUTH' : 'GQL';
    throw new ApaError(code, msg);
  }
  return body.data;
}

export class ApaError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'ApaError';
    this.code = code; // NETWORK | BAD_RESPONSE | AUTH | GQL | DENIED
  }
}

// ── Operation documents (captured verbatim from the live app) ─────────────────

const M_LOGIN = `mutation login($username: String!, $password: String!) {
  login(input: {username: $username, password: $password}) {
    __typename
    ... on SuccessLoginPayload { deviceRefreshToken }
    ... on PartialSuspendedLoginPayload { leagueIds deviceRefreshToken }
    ... on DeniedLoginPayload { reason }
  }
}`;

const M_AUTHORIZE = `mutation authorize($deviceRefreshToken: String!) {
  authorize(deviceRefreshToken: $deviceRefreshToken) { refreshToken }
}`;

const M_ACCESS_TOKEN = `mutation GenerateAccessTokenMutation($refreshToken: String!) {
  generateAccessToken(refreshToken: $refreshToken) { accessToken }
}`;

const Q_VIEWER_TEAMS = `query matchesByViewer {
  viewer {
    id
    __typename
    ... on Member {
      firstName
      lastName
      teams {
        id
        name
        number
        session { id name }
      }
    }
  }
}`;

const Q_TEAM_ROSTER = `query teamRoster($id: Int!) {
  team(id: $id) {
    id name number
    league { id slug }
    division { id type }
    roster {
      id memberNumber displayName matchesWon matchesPlayed
      ... on EightBallPlayer { pa ppm skillLevel }
      ... on NineBallPlayer  { pa ppm skillLevel }
      member { id }
    }
  }
}`;

const Q_TEAM_SCHEDULE = `query teamSchedule($id: Int!) {
  team(id: $id) {
    id sessionBonusPoints sessionPoints sessionTotalPoints
    division { id isTournament }
    matches(unscheduled: true) {
      week type
      ...matchListItem
    }
  }
}
fragment matchListItem on Match {
  id isBye status startTime isMine isScored isFinalized isPlayoff description
  results { homeAway points { total } }
  location { id name address { id name } }
  home { id name number isMine }
  away { id name number isMine }
}`;

// Achievement/highlight counts (break-and-runs, 8-on-the-break, mini-slams,
// rackless runs, skunks, 9-on-the-snap). These fields are NOT part of the
// working teamRoster query above — kept isolated in their own query so that if
// a field name here is wrong (unverified against live traffic, only from a
// cached-state capture), it only breaks the Trophy Case feature, never the
// roster/schedule sync that everything else depends on.
const Q_TEAM_ACHIEVEMENTS = `query teamAchievements($id: Int!) {
  team(id: $id) {
    id
    roster {
      id
      memberNumber
      displayName
      ... on EightBallPlayer { eightOnBreaks breakAndRuns8: breakAndRuns miniSlams rackless }
      ... on NineBallPlayer  { breakAndRuns9: breakAndRuns nineOnSnaps miniSlams skunks }
    }
  }
}`;

// Lifetime match counts per roster member, for the APA "10 lifetime matches"
// eligibility rule. Lifetime stats live on the member's per-format alias
// (Alias.stats(filter) -> {Eight,Nine}BallLifetimeStatistics), NOT on the
// team-scoped EightBallPlayer/NineBallPlayer (those are this-session only).
//
// UNVERIFIED against live traffic (built from the docs' Apollo-cache notes),
// so it's kept in its own query, called separately and fail-soft — a wrong
// field here can only blank the Vegas lifetime meter, never break roster sync.
// The format filter + inline fragment are injected per call (see getLifetime).
function lifetimeQuery(format) {
  const isNine = format === 'NINE';
  const filter = isNine ? 'NINE' : 'EIGHT';
  const frag = isNine
    ? '... on NineBallLifetimeStatistics { matchesPlayed }'
    : '... on EightBallLifetimeStatistics { matchesPlayed }';
  return `query teamLifetime($id: Int!) {
  team(id: $id) {
    id
    division { id type }
    roster {
      id
      memberNumber
      member {
        id
        aliases {
          id
          displayName
          formats
          stats(filter: ${filter}) { __typename ${frag} }
        }
      }
    }
  }
}`;
}

const Q_TEAM_PAGE = `query teamPage($id: Int!) {
  team(id: $id) {
    id name number isTied standing
    division {
      id name number timeOfPlay nightOfPlay format state isTournament
    }
    location { id name address { id name } }
    session { id name }
    league { id slug }
  }
}`;

// ── Auth ──────────────────────────────────────────────────────────────────────

// Exchange username+password for the durable deviceRefreshToken.
export async function login(username, password) {
  let data;
  try {
    data = await gql('login', M_LOGIN, { username, password });
  } catch (err) {
    // The API reports bad email/password as a top-level GraphQL error rather
    // than a DeniedLoginPayload; surface those as a clean auth denial.
    if (err instanceof ApaError && err.code === 'GQL' && /account|password|email|credential|found/i.test(err.message)) {
      throw new ApaError('DENIED', err.message);
    }
    throw err;
  }
  const p = data && data.login;
  if (!p) throw new ApaError('GQL', 'Login returned no payload.');

  if (p.__typename === 'DeniedLoginPayload') {
    throw new ApaError('DENIED', p.reason || 'Login denied. Check your email and password.');
  }
  if (!p.deviceRefreshToken) {
    throw new ApaError('DENIED', 'Login did not return a device token.');
  }
  return {
    deviceRefreshToken: p.deviceRefreshToken,
    suspended: p.__typename === 'PartialSuspendedLoginPayload',
    leagueIds: p.leagueIds || null,
  };
}

// Turn the durable deviceRefreshToken into a short-lived accessToken.
export async function getAccessToken(deviceRefreshToken) {
  const a = await gql('authorize', M_AUTHORIZE, { deviceRefreshToken });
  const refreshToken = a && a.authorize && a.authorize.refreshToken;
  if (!refreshToken) throw new ApaError('AUTH', 'Session expired — please reconnect your APA account.');

  const t = await gql('GenerateAccessTokenMutation', M_ACCESS_TOKEN, { refreshToken });
  const accessToken = t && t.generateAccessToken && t.generateAccessToken.accessToken;
  if (!accessToken) throw new ApaError('AUTH', 'Could not obtain an access token — please reconnect.');
  return accessToken;
}

// ── Data ────────────────────────────────────────────────────────────────────

export async function getViewerTeams(accessToken) {
  const data = await gql('matchesByViewer', Q_VIEWER_TEAMS, {}, accessToken);
  const v = data && data.viewer;
  if (!v) return { member: null, teams: [] };
  return {
    member: { id: v.id, firstName: v.firstName, lastName: v.lastName },
    teams: (v.teams || []).map((t) => ({
      id: t.id,
      name: t.name,
      number: t.number,
      session: t.session ? { id: t.session.id, name: t.session.name } : null,
    })),
  };
}

export async function getRoster(accessToken, teamId) {
  const data = await gql('teamRoster', Q_TEAM_ROSTER, { id: Number(teamId) }, accessToken);
  const team = data && data.team;
  if (!team) throw new ApaError('GQL', `Team ${teamId} not found.`);
  const format = team.division && team.division.type; // EIGHT | NINE (may be null)
  return {
    teamId: team.id,
    teamName: team.name,
    teamNumber: team.number,
    format,
    players: (team.roster || []).map((r) => ({
      memberId: r.member ? r.member.id : null,
      memberNumber: r.memberNumber,
      name: r.displayName,
      skillLevel: typeof r.skillLevel === 'number' ? r.skillLevel : null,
      matchesWon: r.matchesWon,
      matchesPlayed: r.matchesPlayed,
      ppm: r.ppm,
      pa: r.pa,
    })),
  };
}

export async function getSchedule(accessToken, teamId) {
  const data = await gql('teamSchedule', Q_TEAM_SCHEDULE, { id: Number(teamId) }, accessToken);
  const team = data && data.team;
  if (!team) throw new ApaError('GQL', `Team ${teamId} not found.`);
  return {
    teamId: team.id,
    sessionPoints: team.sessionPoints,
    sessionBonusPoints: team.sessionBonusPoints,
    sessionTotalPoints: team.sessionTotalPoints,
    matches: (team.matches || []).map((m) => {
      const mine = m.home && m.home.isMine ? m.home : m.away;
      const opp = m.home && m.home.isMine ? m.away : m.home;
      return {
        id: m.id,
        week: m.week,
        type: m.type,
        isBye: m.isBye,
        isScored: m.isScored,
        isFinalized: m.isFinalized,
        isPlayoff: m.isPlayoff,
        startTime: m.startTime,
        isHome: !!(m.home && m.home.isMine),
        opponent: opp ? { id: opp.id, name: opp.name, number: opp.number } : null,
        location: m.location ? m.location.name : null,
        points: (m.results || []).map((r) => ({ homeAway: r.homeAway, total: r.points && r.points.total })),
      };
    }),
  };
}

export async function getTeamPage(accessToken, teamId) {
  const data = await gql('teamPage', Q_TEAM_PAGE, { id: Number(teamId) }, accessToken);
  const team = data && data.team;
  if (!team) throw new ApaError('GQL', `Team ${teamId} not found.`);
  return {
    id: team.id,
    name: team.name,
    number: team.number,
    standing: team.standing,
    isTied: team.isTied,
    division: team.division
      ? {
          id: team.division.id,
          name: team.division.name,
          number: team.division.number,
          format: team.division.format,
          nightOfPlay: team.division.nightOfPlay,
          timeOfPlay: team.division.timeOfPlay,
        }
      : null,
    location: team.location ? team.location.name : null,
    session: team.session ? { id: team.session.id, name: team.session.name } : null,
  };
}

// Best-effort achievement/highlight counts per player. Throws ApaError like the
// other queries if the API rejects it — callers should treat this feature as
// optional and fail soft (see components/TrophyCase.tsx).
export async function getAchievements(accessToken, teamId) {
  const data = await gql('teamAchievements', Q_TEAM_ACHIEVEMENTS, { id: Number(teamId) }, accessToken);
  const team = data && data.team;
  if (!team) throw new ApaError('GQL', `Team ${teamId} not found.`);
  return {
    teamId: team.id,
    players: (team.roster || []).map((r) => ({
      memberNumber: r.memberNumber,
      name: r.displayName,
      eightOnBreaks: r.eightOnBreaks ?? null,
      breakAndRuns8: r.breakAndRuns8 ?? null,
      rackless: r.rackless ?? null,
      breakAndRuns9: r.breakAndRuns9 ?? null,
      nineOnSnaps: r.nineOnSnaps ?? null,
      skunks: r.skunks ?? null,
      miniSlams: r.miniSlams ?? null,
    })),
  };
}

// Best-effort lifetime match counts per roster member, for a given format.
// Sums matchesPlayed across the member's aliases (per-league identities) to get
// a cross-league lifetime total. Throws ApaError like the others; callers treat
// it as optional and fail soft.
export async function getLifetime(accessToken, teamId, format) {
  const data = await gql('teamLifetime', lifetimeQuery(format), { id: Number(teamId) }, accessToken);
  const team = data && data.team;
  if (!team) throw new ApaError('GQL', `Team ${teamId} not found.`);
  const fmt = (team.division && team.division.type) || format || null;
  // TEMP diagnostic: raw shape of the first roster member so we can see whether
  // aliases is empty, stats is null, or the concrete stats type differs.
  const sampleRaw = JSON.stringify((team.roster || [])[0] || null);
  return {
    teamId: team.id,
    format: fmt,
    sampleRaw,
    players: (team.roster || []).map((r) => {
      const aliases = (r.member && r.member.aliases) || [];
      let total = null;
      for (const a of aliases) {
        const mp = a && a.stats && typeof a.stats.matchesPlayed === 'number' ? a.stats.matchesPlayed : null;
        if (mp !== null) total = (total || 0) + mp;
      }
      return { memberNumber: r.memberNumber, matchesPlayed: total };
    }),
  };
}

// ── High-level helpers ────────────────────────────────────────────────────────

// One-shot: given a stored deviceRefreshToken, return the member's teams.
export async function syncTeams(deviceRefreshToken) {
  const accessToken = await getAccessToken(deviceRefreshToken);
  return getViewerTeams(accessToken);
}

// Full pull for a single team: metadata + roster + schedule in one round of auth.
export async function syncTeam(deviceRefreshToken, teamId) {
  const accessToken = await getAccessToken(deviceRefreshToken);
  const [page, roster, schedule] = await Promise.all([
    getTeamPage(accessToken, teamId),
    getRoster(accessToken, teamId),
    getSchedule(accessToken, teamId),
  ]);
  return { page, roster, schedule };
}

// Scouting: pull any team's roster (opponents included) by id.
export async function scoutTeam(deviceRefreshToken, teamId) {
  const accessToken = await getAccessToken(deviceRefreshToken);
  const [page, roster] = await Promise.all([
    getTeamPage(accessToken, teamId),
    getRoster(accessToken, teamId),
  ]);
  return { page, roster };
}

// Trophy Case: best-effort achievement counts for a team's roster.
export async function syncAchievements(deviceRefreshToken, teamId) {
  const accessToken = await getAccessToken(deviceRefreshToken);
  return getAchievements(accessToken, teamId);
}

// Best-effort lifetime match counts for a team's roster in a given format.
export async function syncLifetime(deviceRefreshToken, teamId, format) {
  const accessToken = await getAccessToken(deviceRefreshToken);
  return getLifetime(accessToken, teamId, format);
}
