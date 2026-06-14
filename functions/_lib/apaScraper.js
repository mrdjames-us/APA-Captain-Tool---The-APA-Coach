// Shared APA (poolplayers.com) scraper.
//
// Runs in BOTH environments:
//   - Cloudflare Pages Functions (Workers runtime) in production
//   - the local Express dev server (Node 18+) for `npm run dev`
//
// It uses only web-standard APIs (global fetch, Headers.getSetCookie, URL,
// URLSearchParams) plus cheerio, so there is a single source of truth for the
// fragile scraping logic. Sessions are stateless: login returns the
// poolplayers.com cookies (base64-encoded) as an opaque token that the client
// sends back on roster/stats requests. Nothing is stored server-side.

import * as cheerio from 'cheerio';

const BASE_URL = 'https://www.poolplayers.com';

const URLS = {
  home: `${BASE_URL}/`,
  login: `${BASE_URL}/members/login/`,
  dashboard: `${BASE_URL}/members/`,
  team: `${BASE_URL}/members/team/`,
  stats: `${BASE_URL}/members/stats/`,
  roster: `${BASE_URL}/members/roster/`,
};

const BASE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

// ── Cookie jar helpers (no tough-cookie dependency) ───────────────────────────

function readSetCookies(res) {
  if (typeof res.headers.getSetCookie === 'function') {
    return res.headers.getSetCookie();
  }
  const raw = res.headers.get('set-cookie');
  return raw ? [raw] : [];
}

function mergeCookies(jar, setCookies) {
  for (const sc of setCookies) {
    const pair = sc.split(';')[0];
    const idx = pair.indexOf('=');
    if (idx > 0) {
      const name = pair.slice(0, idx).trim();
      const value = pair.slice(idx + 1).trim();
      if (name) jar.set(name, value);
    }
  }
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

// Fetch that accumulates cookies into `jar` and manually follows redirects so
// Set-Cookie headers issued mid-redirect (typical of login flows) are captured.
async function fetchJar(url, options, jar) {
  let current = url;
  let method = options.method || 'GET';
  let body = options.body;
  const headers = { ...BASE_HEADERS, ...(options.headers || {}) };

  for (let i = 0; i < 10; i++) {
    const cookies = cookieHeader(jar);
    if (cookies) headers.Cookie = cookies;
    else delete headers.Cookie;

    const res = await fetch(current, { method, body, headers, redirect: 'manual' });
    mergeCookies(jar, readSetCookies(res));

    if (res.status >= 300 && res.status < 400) {
      const loc = res.headers.get('location');
      if (!loc) {
        const text = await res.text();
        return { res, finalUrl: current, text };
      }
      current = new URL(loc, current).toString();
      method = 'GET';
      body = undefined;
      delete headers['Content-Type'];
      continue;
    }

    const text = await res.text();
    return { res, finalUrl: current, text };
  }
  return { res: null, finalUrl: current, text: '' };
}

// ── Login ─────────────────────────────────────────────────────────────────────

async function discoverLoginUrl(jar) {
  try {
    const { res, text } = await fetchJar(URLS.login, {}, jar);
    if (res && res.status === 200 && cheerio.load(text)('input[type="password"]').length > 0) {
      return URLS.login;
    }
  } catch {}

  try {
    const { text } = await fetchJar(URLS.home, {}, jar);
    const $ = cheerio.load(text);
    const href = $(
      'a[href*="login"], a[href*="signin"], a[href*="sign-in"], a:contains("Login"), a:contains("Sign In"), a:contains("Member"), a:contains("Portal")'
    )
      .first()
      .attr('href');
    if (href) return href.startsWith('http') ? href : `${BASE_URL}${href}`;
  } catch {}

  return URLS.login;
}

function parseTeamInfo($) {
  const trySelectors = (selectors) => {
    for (const sel of selectors) {
      const text = $(sel).first().text().trim();
      if (text && text.length > 0 && text.length < 100) return text;
    }
    return '';
  };
  return {
    teamName: trySelectors(['.team-name', '#team-name', 'h1.team', '.page-title', '.dashboard-team', 'h1', 'h2']),
    division: trySelectors(['.division', '.team-division', '.league-division', '.division-name']),
    season: trySelectors(['.season', '.current-season', '.season-name', '.league-season']),
  };
}

export async function apaLogin(memberId, password) {
  const jar = new Map();

  const loginUrl = await discoverLoginUrl(jar);
  const { text: loginPage } = await fetchJar(loginUrl, {}, jar);
  const $ = cheerio.load(loginPage);

  // Find the login form and collect all its inputs (including CSRF tokens).
  const $form = $('form')
    .filter((_, el) => {
      const action = $(el).attr('action') || '';
      return $(el).find('input[type="password"]').length > 0 || action.includes('login');
    })
    .first();

  if ($form.length === 0) {
    return { success: false, error: 'Could not find the login form on poolplayers.com. The site layout may have changed.' };
  }

  const formFields = {};
  $form.find('input').each((_, el) => {
    const name = $(el).attr('name');
    const type = ($(el).attr('type') || 'text').toLowerCase();
    if (name && type !== 'submit' && type !== 'button') {
      formFields[name] = $(el).attr('value') || '';
    }
  });

  // Map credentials onto likely field names.
  const usernameFields = ['username', 'email', 'member_id', 'memberid', 'user_name', 'login', 'userid'];
  const passwordFields = ['password', 'pass', 'pwd', 'user_pass'];
  let userSet = false;
  let passSet = false;
  for (const f of usernameFields) if (f in formFields) { formFields[f] = memberId; userSet = true; break; }
  for (const f of passwordFields) if (f in formFields) { formFields[f] = password; passSet = true; break; }

  if (!userSet) {
    const firstText = $form.find('input[type="text"], input[type="email"], input:not([type])').first().attr('name');
    if (firstText) formFields[firstText] = memberId;
  }
  if (!passSet) {
    const pw = $form.find('input[type="password"]').first().attr('name');
    if (pw) formFields[pw] = password;
  }

  const action = $form.attr('action') || loginUrl;
  const submitUrl = action.startsWith('http')
    ? action
    : `${BASE_URL}${action.startsWith('/') ? '' : '/'}${action}`;

  const { res, finalUrl, text: respText } = await fetchJar(
    submitUrl,
    {
      method: 'POST',
      body: new URLSearchParams(formFields).toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Referer: loginUrl,
        Origin: BASE_URL,
      },
    },
    jar
  );

  if (!res) return { success: false, error: 'No response from poolplayers.com during login.' };

  const $resp = cheerio.load(respText);

  const errorText = $resp(
    '.error, .alert-danger, .alert-error, .login-error, .invalid-credentials, [class*="error-msg"], [class*="login-fail"]'
  ).first().text().trim();
  if (errorText && errorText.length > 0 && errorText.length < 300) {
    return { success: false, error: errorText };
  }

  const bodyText = $resp('body').text().toLowerCase();
  const isAuthenticated =
    finalUrl !== loginUrl ||
    $resp('a[href*="logout"], .logout-link, .signed-in, .member-nav, .dashboard, .team-name').length > 0 ||
    bodyText.includes('welcome') ||
    bodyText.includes('dashboard');

  if (!isAuthenticated) {
    return { success: false, error: 'Login failed. Please verify your APA Member ID and password.' };
  }

  const token = base64Encode(cookieHeader(jar));
  return { success: true, sessionId: token, teamInfo: parseTeamInfo($resp) };
}

// ── Roster ──────────────────────────────────────────────────────────────────

export async function apaGetRoster(sessionId) {
  const jar = decodeJar(sessionId);

  let html;
  for (const url of [URLS.roster, URLS.team, URLS.dashboard]) {
    try {
      const { res, text } = await fetchJar(url, {}, jar);
      if (res && res.status === 200) {
        const $ = cheerio.load(text);
        if ($('table').length > 0 || $('[class*="player"]').length > 0 || $('[class*="roster"]').length > 0) {
          html = text;
          break;
        }
      }
    } catch {}
  }
  if (!html) throw new Error('Could not find the roster page on poolplayers.com');

  const $ = cheerio.load(html);
  const players = [];

  $('table').each((_, table) => {
    const rows = $(table).find('tr');
    const headers = [];
    $(rows[0]).find('th, td').each((_, th) => headers.push($(th).text().trim().toLowerCase()));
    if (headers.length < 2) return;

    const nameIdx = headers.findIndex((h) => h.includes('name') || h.includes('player'));
    const sl8Idx = headers.findIndex((h) => h.includes('8') || h.includes('eight') || h === 'sl' || h.includes('skill'));
    const sl9Idx = headers.findIndex((h) => h.includes('9') || h.includes('nine'));
    const idIdx = headers.findIndex((h) => h.includes('member') || h.includes('id') || h.includes('#'));
    if (nameIdx === -1) return;

    rows.each((rowI, row) => {
      if (rowI === 0) return;
      const cells = $(row).find('td');
      if (cells.length < 2) return;
      const name = $(cells[nameIdx !== -1 ? nameIdx : 0]).text().trim();
      if (!name || name.toLowerCase() === 'name') return;

      const rawSl8 = sl8Idx !== -1 ? parseInt($(cells[sl8Idx]).text().trim()) : NaN;
      const rawSl9 = sl9Idx !== -1 ? parseInt($(cells[sl9Idx]).text().trim()) : NaN;
      const sl8 = isNaN(rawSl8) ? 3 : Math.min(Math.max(rawSl8, 1), 7);
      const sl9 = isNaN(rawSl9) ? sl8 : Math.min(Math.max(rawSl9, 1), 9);
      const memberId = idIdx !== -1 ? $(cells[idIdx]).text().trim() : '';

      players.push({ name, memberId, skillLevel8Ball: sl8, skillLevel9Ball: sl9 });
    });
  });

  if (players.length > 0) return players;

  $('[class*="player"], [class*="roster"], [class*="member"]').each((_, el) => {
    const text = $(el).text().trim();
    if (text.length < 3 || text.length > 100) return;
    const nameMatch = text.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)/);
    if (nameMatch) {
      const slMatch = text.match(/(\d)\s*(?:SL|\/)/i);
      const sl = slMatch ? Math.min(Math.max(parseInt(slMatch[1]), 1), 7) : 3;
      players.push({ name: nameMatch[1], memberId: '', skillLevel8Ball: sl, skillLevel9Ball: sl });
    }
  });

  return players;
}

// ── Stats ─────────────────────────────────────────────────────────────────────

export async function apaGetStats(sessionId) {
  const jar = decodeJar(sessionId);

  let html;
  for (const url of [URLS.stats, URLS.team, URLS.dashboard]) {
    try {
      const { res, text } = await fetchJar(url, {}, jar);
      if (res && res.status === 200) { html = text; break; }
    } catch {}
  }
  if (!html) throw new Error('Could not find the stats page on poolplayers.com');

  const $ = cheerio.load(html);
  const stats = [];

  $('table').each((_, table) => {
    const rows = $(table).find('tr');
    const headers = [];
    $(rows[0]).find('th, td').each((_, th) => headers.push($(th).text().trim().toLowerCase()));

    const nameIdx = headers.findIndex((h) => h.includes('name') || h.includes('player'));
    const games8Idx = headers.findIndex((h) => (h.includes('8') && h.includes('game')) || h === 'games' || h.includes('played'));
    const wins8Idx = headers.findIndex((h) => (h.includes('8') && h.includes('win')) || h === 'wins');
    const games9Idx = headers.findIndex((h) => h.includes('9') && h.includes('game'));
    const wins9Idx = headers.findIndex((h) => h.includes('9') && h.includes('win'));
    const sl8Idx = headers.findIndex((h) => h.includes('8') && (h.includes('sl') || h.includes('skill')));
    const sl9Idx = headers.findIndex((h) => h.includes('9') && (h.includes('sl') || h.includes('skill')));
    if (nameIdx === -1 && headers.length < 2) return;

    rows.each((rowI, row) => {
      if (rowI === 0) return;
      const cells = $(row).find('td');
      if (cells.length < 2) return;
      const name = $(cells[nameIdx !== -1 ? nameIdx : 0]).text().trim();
      if (!name || name.toLowerCase() === 'name') return;

      const num = (idx) => (idx !== -1 ? parseInt($(cells[idx]).text().trim()) || 0 : 0);
      const sl = (idx, def) => {
        if (idx === -1) return def;
        const v = parseInt($(cells[idx]).text().trim());
        return isNaN(v) ? def : Math.min(Math.max(v, 1), 7);
      };

      stats.push({
        name,
        games8Ball: num(games8Idx),
        wins8Ball: num(wins8Idx),
        games9Ball: num(games9Idx),
        wins9Ball: num(wins9Idx),
        skillLevel8Ball: sl(sl8Idx, 3),
        skillLevel9Ball: sl(sl9Idx, 3),
      });
    });
  });

  return stats;
}

// ── Token (cookie) encoding — works in Workers and Node ───────────────────────

function base64Encode(str) {
  if (typeof btoa === 'function') return btoa(unescape(encodeURIComponent(str)));
  return Buffer.from(str, 'utf-8').toString('base64');
}

function base64Decode(b64) {
  if (typeof atob === 'function') return decodeURIComponent(escape(atob(b64)));
  return Buffer.from(b64, 'base64').toString('utf-8');
}

function decodeJar(sessionId) {
  const jar = new Map();
  if (!sessionId) throw new Error('Missing APA session token');
  let raw;
  try {
    raw = base64Decode(sessionId);
  } catch {
    throw new Error('Invalid APA session token');
  }
  for (const part of raw.split('; ')) {
    const idx = part.indexOf('=');
    if (idx > 0) jar.set(part.slice(0, idx), part.slice(idx + 1));
  }
  if (jar.size === 0) throw new Error('APA session expired. Please reconnect.');
  return jar;
}
