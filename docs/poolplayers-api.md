# poolplayers.com GraphQL API — reverse-engineered spec

Captured live from the Member Services app (`league.poolplayers.com`, v3.18.53)
on 2026-07-07 by logging in and intercepting the app's own GraphQL traffic.
This replaces the old HTML-scraping approach (`functions/_lib/apaScraper.js`),
which is dead — the member area is now a React SPA backed by GraphQL.

## Endpoints

| Purpose | URL |
|---|---|
| GraphQL API (prod) | `https://gql.poolplayers.com/graphql` |
| Accounts / OAuth login (prod) | `https://accounts.poolplayers.com` |
| Dev / train / uat variants | `gql-dev.`, `gql-train.`, `gql-uat.poolplayers.com/graphql` |

Introspection is **disabled** in production (Apollo Server). All queries below
were captured from the live app, not introspected.

## ⚠️ Critical gotcha: Authorization header has NO "Bearer " prefix

poolplayers.com's GraphQL server expects the raw access token in the
`Authorization` header **without** the standard `Bearer ` prefix:

- ✅ `Authorization: eyJhbGci...`  → resolves `viewer` as your Member
- ❌ `Authorization: Bearer eyJhbGci...`  → server silently returns `viewer: null`
  with HTTP 200 and **no GraphQL error** (looks like "0 teams", not an auth failure)

This cost hours to find because there's no error — the query just returns null.
Also send `apollographql-client-name: MemberServices` (no space) and
`apollographql-client-version: 3.18.53-3856` to match the web app.

## Auth model

- Login is an OAuth flow at `accounts.poolplayers.com` (Next.js app, form at `/login`).
- The app stores two tokens in `localStorage`: `accessToken` and `refreshToken`.
- GraphQL requests send `Authorization: Bearer <accessToken>`.
- Access tokens are short-lived; refresh via GraphQL mutation:

```graphql
mutation GenerateAccessTokenMutation($refreshToken: String!) {
  generateAccessToken(refreshToken: $refreshToken) { ... }
}
```
(sent with a `skipAuthHeader` flag — i.e. no Bearer header on the refresh call itself).

### Login flow (captured 2026-07-07 — structure only, no token values recorded)

Full OAuth flow, in order:

1. App sends the user to
   `https://accounts.poolplayers.com/authorize?client_name=Member+Services&redirect_uri=https://league.poolplayers.com/token?`
2. Not authenticated → redirect to `https://accounts.poolplayers.com/login`
   (Next.js page; `<form method=POST action="https://accounts.poolplayers.com/login">`
   with an email/username field + a password field).
3. Credentials POST to `https://accounts.poolplayers.com/login` →
   302 to `https://accounts.poolplayers.com/authorize?deviceRefreshToken=<JWT>`.
   - The `deviceRefreshToken` is an RS256 JWT. Decoded payload fields:
     `deviceRefreshTokenId, username, displayName, initials, iat, iss:"APA", sub`.
     (A long-lived, device-scoped refresh token — the durable credential.)
4. `/authorize` shows a consent screen ("Continue to Member Services"). Clicking
   Continue → redirect to `https://league.poolplayers.com/token?...` which hands the
   SPA its short-lived `accessToken` + a session `refreshToken` (stored in localStorage).
5. Ongoing: `GenerateAccessTokenMutation($refreshToken)` mints fresh access tokens;
   GraphQL calls carry `Authorization: Bearer <accessToken>`.

**Server-side implication:** headless login = POST credentials to
`accounts.poolplayers.com/login`, follow the redirect chain (capturing the
`deviceRefreshToken`, then completing `/authorize` consent), land on `/token` to
extract the session tokens. There may be a CSRF/hidden field on the login form and
an anti-bot check — verify when implementing. **Security note for David:** this means
the backend would hold his APA password (or at least the deviceRefreshToken). Prefer
storing only the long-lived `deviceRefreshToken` rather than the raw password, and
encrypt it at rest. Decide storage/consent model before shipping auto-sync.

## Core read queries (all captured verbatim)

### 1. Entry point — my teams + matches
`matchesByViewer` (no variables). Returns the logged-in member's teams:

```graphql
query matchesByViewer {
  viewer {
    id
    ... on Member {
      membershipExpires
      fee { total }
      teams {
        id
        name
        number
        session { id name }
        matches { type ...matchListItem }
      }
    }
  }
}
```

### 2. Team roster (WORKS FOR ANY TEAM ID — including opponents → scouting)
`teamRoster($id: Int!)`:

```graphql
query teamRoster($id: Int!) {
  team(id: $id) {
    id
    name
    number
    league { id slug }
    division { id type }
    roster {
      id
      memberNumber
      displayName
      matchesWon
      matchesPlayed
      ... on EightBallPlayer { pa ppm skillLevel }
      ... on NineBallPlayer  { pa ppm skillLevel }
      member { id }
    }
  }
}
```

### 3. Team schedule & results
`teamSchedule($id: Int!)`:

```graphql
query teamSchedule($id: Int!) {
  team(id: $id) {
    id
    sessionBonusPoints
    sessionPoints
    sessionTotalPoints
    division { id isTournament }
    matches(unscheduled: true) {
      week
      type
      ...matchListItem
    }
  }
}
```

### 4. Team metadata / standing
`teamPage($id: Int!)`:

```graphql
query teamPage($id: Int!) {
  team(id: $id) {
    id name number isTied standing
    division { id name number timeOfPlay nightOfPlay format state isTournament
               tournament { id name } }
    location { id name address { id name } }
    session { id name }
    league { id slug }
  }
}
```

### Shared fragment: `matchListItem` on `Match`
```graphql
fragment matchListItem on Match {
  id isBye status scoresheet startTime isMine isPaid isTournament
  isScored isFinalized isPlayoff description tableNumber
  results { homeAway points { total } }
  timeZone { id name }
  location { id name address { id name } }
  home { id name number isMine }
  away { id name number isMine }
  league { id isMine slug isElectronicPaymentsEnabled }
  # orderItems { ... } (payment stuff, not needed)
}
```

## Data model notes (from Apollo cache extract)

- `viewer` → `Member` { id firstName lastName emailAddress initials leagues teams aliases membershipExpires }
- `Member.aliases` → `Alias` { id displayName memberNumber league formats stats
  players(active,current,format,session) sessions(format) member } — per-format identity
- `Alias.stats(filter: EIGHT|NINE)` → lifetime stats
- `EightBallPlayer` / `NineBallPlayer` { session team pa ppm skillLevel matchesWon
  matchesPlayed + achievement counts: eightOnBreaks, breakAndRuns, miniSlams, rackless, skunks, nineOnSnaps }
- `EightBallLifetimeStatistics` / `NineBallLifetimeStatistics` { matchesWon matchesPlayed CLA defensiveShotAvg lastPlayed }
- `Team` { id name number active standing isTied roster matches division location session }
- Format enum: `EIGHT`, `NINE`. Skill levels 1–7 (8-ball), 1–9 (9-ball).

## Lifetime match counts (UNVERIFIED — added for the "10 lifetime matches" rule)

The Vegas/World-Qualifier eligibility rule needs each player's LIFETIME match
count per format (not the team-scoped `matchesPlayed` on EightBallPlayer/
NineBallPlayer, which is this-session only). Lifetime stats live on the member's
per-format alias: `Member.aliases[].stats(filter: EIGHT|NINE)` →
`{Eight,Nine}BallLifetimeStatistics { matchesPlayed }`.

Query added in `apaClient.js` as `teamLifetime` (built dynamically per format),
called by the isolated `/api/apa/lifetime` endpoint and merged into the roster on
import (summing `matchesPlayed` across a member's aliases for a cross-league
total). **This query was written from the cache-extract notes, NOT confirmed
against live traffic** — kept isolated + fail-soft so a wrong field only blanks
the Vegas lifetime meter, never roster/schedule sync. If the meter stays empty
after a fresh import, capture the real `Alias.stats` shape from live traffic and
correct `lifetimeQuery()`.

```graphql
query teamLifetime($id: Int!) {
  team(id: $id) {
    id
    division { id type }
    roster {
      id memberNumber
      member { id aliases { id stats(filter: EIGHT) { ... on EightBallLifetimeStatistics { matchesPlayed } } } }
    }
  }
}
```

## Example real IDs (David's account, for testing)

- Member id: `3402779`
- Team "Pocket Pounders (DJ)" (8-ball): team id `13038075`, division 432902, league 477
- Session "Summer 2026": id 139
- Other teams: Safety Breakers (AD), a second Pocket Pounders (DJ) 9-ball entry

## How to fetch (shape)

```
POST https://gql.poolplayers.com/graphql
Headers: Authorization: Bearer <accessToken>, Content-Type: application/json
Body: { "operationName": "teamRoster", "query": "<query text>", "variables": { "id": 13038075 } }
```
