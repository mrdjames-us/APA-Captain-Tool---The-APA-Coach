import axios from 'axios';
import * as cheerio from 'cheerio';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

const BASE_URL = 'https://www.poolplayers.com';

const URLS = {
  home: `${BASE_URL}/`,
  login: `${BASE_URL}/members/login/`,
  dashboard: `${BASE_URL}/members/`,
  team: `${BASE_URL}/members/team/`,
  stats: `${BASE_URL}/members/stats/`,
  roster: `${BASE_URL}/members/roster/`,
};

export class APAService {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(
      axios.create({
        jar: this.jar,
        withCredentials: true,
        maxRedirects: 10,
        timeout: 30000,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          Connection: 'keep-alive',
        },
      })
    );
    this.authenticated = false;
    this.currentUrl = null;
  }

  async login(memberId, password) {
    try {
      // Discover login URL
      const loginUrl = await this.discoverLoginUrl();

      // GET the login page to capture CSRF tokens and form structure
      const loginPage = await this.client.get(loginUrl);
      const $ = cheerio.load(loginPage.data);

      // Extract hidden form fields (including CSRF tokens)
      const formFields = {};
      const $form = $('form').filter((_, el) => {
        const action = $(el).attr('action') || '';
        const hasPassword = $(el).find('input[type="password"]').length > 0;
        return hasPassword || action.includes('login');
      }).first();

      $form.find('input').each((_, el) => {
        const name = $(el).attr('name');
        const value = $(el).val() || '';
        const type = $(el).attr('type') || 'text';
        if (name && type !== 'submit' && type !== 'button') {
          formFields[name] = value;
        }
      });

      // Map credentials to likely field names
      const usernameFields = ['username', 'email', 'member_id', 'memberid', 'user_name', 'login', 'userid'];
      const passwordFields = ['password', 'pass', 'pwd', 'user_pass'];

      let usernameFieldSet = false;
      let passwordFieldSet = false;

      for (const f of usernameFields) {
        if (f in formFields) {
          formFields[f] = memberId;
          usernameFieldSet = true;
          break;
        }
      }
      for (const f of passwordFields) {
        if (f in formFields) {
          formFields[f] = password;
          passwordFieldSet = true;
          break;
        }
      }

      // Fallback: set by input placeholder or type
      if (!usernameFieldSet) {
        $form.find('input[type="text"], input[type="email"], input:not([type])').each((_, el) => {
          const name = $(el).attr('name');
          const placeholder = ($(el).attr('placeholder') || '').toLowerCase();
          if (name && !usernameFieldSet && (placeholder.includes('email') || placeholder.includes('member') || placeholder.includes('user'))) {
            formFields[name] = memberId;
            usernameFieldSet = true;
          }
        });
        if (!usernameFieldSet) {
          const firstText = $form.find('input[type="text"], input[type="email"]').first().attr('name');
          if (firstText) formFields[firstText] = memberId;
        }
      }
      if (!passwordFieldSet) {
        const pwField = $form.find('input[type="password"]').first().attr('name');
        if (pwField) formFields[pwField] = password;
      }

      // Resolve form action URL
      const formAction = $form.attr('action') || loginUrl;
      const submitUrl = formAction.startsWith('http')
        ? formAction
        : `${BASE_URL}${formAction.startsWith('/') ? '' : '/'}${formAction}`;

      // POST login form
      const response = await this.client.post(
        submitUrl,
        new URLSearchParams(formFields).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            Referer: loginUrl,
            Origin: BASE_URL,
          },
        }
      );

      const $resp = cheerio.load(response.data);
      this.currentUrl = response.request?.res?.responseUrl || response.config?.url || loginUrl;

      // Detect error messages
      const errorText = $resp(
        '.error, .alert-danger, .alert-error, .login-error, .invalid-credentials, [class*="error-msg"], [class*="login-fail"]'
      )
        .first()
        .text()
        .trim();

      if (errorText && errorText.length > 0 && errorText.length < 300) {
        return { success: false, error: errorText };
      }

      // Verify successful login by checking for authenticated page indicators
      const isAuthenticated =
        this.currentUrl !== loginUrl ||
        $resp('a[href*="logout"], .logout-link, .signed-in, .member-nav, .dashboard, .team-name').length > 0 ||
        $resp('body').text().toLowerCase().includes('welcome') ||
        $resp('body').text().toLowerCase().includes('dashboard');

      if (!isAuthenticated) {
        return {
          success: false,
          error: 'Login failed. Please verify your APA Member ID and password.',
        };
      }

      this.authenticated = true;
      const teamInfo = this.parseTeamInfo($resp);
      return { success: true, teamInfo };
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        return { success: false, error: 'Invalid credentials' };
      }
      if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
        return { success: false, error: 'Cannot reach poolplayers.com. Check your internet connection.' };
      }
      throw err;
    }
  }

  async discoverLoginUrl() {
    // Try the direct login URL first
    try {
      const resp = await this.client.get(URLS.login);
      if (resp.status === 200) {
        const $ = cheerio.load(resp.data);
        if ($('input[type="password"]').length > 0) {
          return URLS.login;
        }
      }
    } catch {}

    // Try the homepage to find login link
    try {
      const resp = await this.client.get(URLS.home);
      const $ = cheerio.load(resp.data);
      const loginHref = $(
        'a[href*="login"], a[href*="signin"], a[href*="sign-in"], a:contains("Login"), a:contains("Sign In"), a:contains("Member"), a:contains("Portal")'
      )
        .first()
        .attr('href');

      if (loginHref) {
        return loginHref.startsWith('http') ? loginHref : `${BASE_URL}${loginHref}`;
      }
    } catch {}

    return URLS.login;
  }

  parseTeamInfo($) {
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

  async getRoster() {
    if (!this.authenticated) throw new Error('Not authenticated');

    // Try the team roster URL, then fallback to dashboard
    let html;
    for (const url of [URLS.roster, URLS.team, URLS.dashboard]) {
      try {
        const resp = await this.client.get(url);
        if (resp.status === 200) {
          const $ = cheerio.load(resp.data);
          if (
            $('table').length > 0 ||
            $('[class*="player"]').length > 0 ||
            $('[class*="roster"]').length > 0
          ) {
            html = resp.data;
            break;
          }
        }
      } catch {}
    }

    if (!html) throw new Error('Could not find roster page on poolplayers.com');

    const $ = cheerio.load(html);
    const players = [];

    // Strategy 1: Parse standard HTML tables
    const tables = $('table');
    tables.each((_, table) => {
      const rows = $(table).find('tr');
      const headers = [];
      $(rows[0])
        .find('th, td')
        .each((_, th) => headers.push($(th).text().trim().toLowerCase()));

      if (headers.length < 2) return;

      // Detect column indices for known field names
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

    // Strategy 2: Look for player list elements
    $('[class*="player"], [class*="roster"], [class*="member"]').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length < 3 || text.length > 100) return;
      const nameMatch = text.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+)+)/);
      if (nameMatch) {
        const slMatch = text.match(/(\d)\s*(?:SL|\/)/i);
        const sl = slMatch ? parseInt(slMatch[1]) : 3;
        players.push({
          name: nameMatch[1],
          memberId: '',
          skillLevel8Ball: Math.min(Math.max(sl, 1), 7),
          skillLevel9Ball: Math.min(Math.max(sl, 1), 7),
        });
      }
    });

    return players;
  }

  async getStats() {
    if (!this.authenticated) throw new Error('Not authenticated');

    let html;
    for (const url of [URLS.stats, URLS.team, URLS.dashboard]) {
      try {
        const resp = await this.client.get(url);
        if (resp.status === 200) {
          html = resp.data;
          break;
        }
      } catch {}
    }

    if (!html) throw new Error('Could not find stats page on poolplayers.com');

    const $ = cheerio.load(html);
    const stats = [];

    $('table').each((_, table) => {
      const rows = $(table).find('tr');
      const headers = [];
      $(rows[0])
        .find('th, td')
        .each((_, th) => headers.push($(th).text().trim().toLowerCase()));

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

        const g = (idx) => (idx !== -1 ? parseInt($(cells[idx]).text().trim()) || 0 : 0);
        const sl = (idx, def) => {
          if (idx === -1) return def;
          const v = parseInt($(cells[idx]).text().trim());
          return isNaN(v) ? def : Math.min(Math.max(v, 1), 7);
        };

        stats.push({
          name,
          games8Ball: g(games8Idx),
          wins8Ball: g(wins8Idx),
          games9Ball: g(games9Idx),
          wins9Ball: g(wins9Idx),
          skillLevel8Ball: sl(sl8Idx, 3),
          skillLevel9Ball: sl(sl9Idx, 3),
        });
      });
    });

    return stats;
  }
}
