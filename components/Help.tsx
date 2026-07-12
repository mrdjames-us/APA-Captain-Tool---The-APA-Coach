import React from 'react';
import {
  LifeBuoy, Rocket, Compass, Scale, Wrench, ShieldCheck,
} from 'lucide-react';

const CYAN = '#39A7C9';
const GOLD = '#F2C14E';

// ── Small building blocks ──────────────────────────────────────────────────────
const Section: React.FC<{
  icon: React.ElementType; title: string; accent: string; children: React.ReactNode;
}> = ({ icon: Icon, title, accent, children }) => (
  <section className="card rounded-3xl" style={{ padding: '26px 28px 28px', borderColor: `${accent}2e` }}>
    <div className="flex items-center gap-3 mb-5">
      <Icon style={{ width: 18, height: 18, color: accent }} />
      <h3 className="font-orbitron" style={{ fontSize: 13, fontWeight: 800, color: '#EFE7D6', letterSpacing: '0.1em' }}>
        {title}
      </h3>
    </div>
    {children}
  </section>
);

// A labelled entry (e.g. one tab, one rule).
const Item: React.FC<{ term: string; children: React.ReactNode }> = ({ term, children }) => (
  <div style={{ marginBottom: 16 }}>
    <p style={{ fontWeight: 700, fontSize: 13, color: '#EFE7D6', marginBottom: 4, letterSpacing: '0.02em' }}>{term}</p>
    <p style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(239,231,214,0.72)' }}>{children}</p>
  </div>
);

const Step: React.FC<{ n: number; title: string; children: React.ReactNode }> = ({ n, title, children }) => (
  <div className="flex gap-4" style={{ marginBottom: 18 }}>
    <div
      className="flex items-center justify-center shrink-0"
      style={{
        width: 30, height: 30, borderRadius: 8, fontFamily: 'Space Mono, monospace',
        fontSize: 14, fontWeight: 700, color: CYAN, border: `1px solid ${CYAN}55`,
        background: `${CYAN}12`, boxShadow: `0 0 10px ${CYAN}22`,
      }}
    >
      {n}
    </div>
    <div>
      <p style={{ fontWeight: 700, fontSize: 13, color: '#EFE7D6', marginBottom: 3 }}>{title}</p>
      <p style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(239,231,214,0.72)' }}>{children}</p>
    </div>
  </div>
);

export const Help: React.FC = () => (
  <div className="space-y-6 pb-20">
    {/* Header */}
    <header>
      <div className="flex items-center gap-3">
        <LifeBuoy style={{ width: 24, height: 24, color: CYAN }} />
        <h2
          className="font-orbitron text-glow-cyan"
          style={{ fontSize: 'clamp(1.4rem, 4vw, 2.2rem)', fontWeight: 900, color: CYAN, letterSpacing: '0.12em' }}
        >
          HELP &amp; GUIDE
        </h2>
      </div>
      <p className="section-label mt-2" style={{ color: 'rgba(57,167,201,0.82)' }}>
        How the tool works &amp; how to get the most out of it
      </p>
    </header>

    {/* Quick start */}
    <Section icon={Rocket} title="QUICK START" accent={CYAN}>
      <Step n={1} title="Connect your APA account">
        Open the <strong>APA Sync</strong> tab and sign in with your poolplayers.com
        email and password once. Only a secure sync token is stored — never your
        password. This links the tool to your real teams.
      </Step>
      <Step n={2} title="Import your roster">
        From <strong>APA Sync</strong>, import your team. Players come in with their
        real skill levels, win/loss records, and PPM/PA per format. Re-run any time
        to pull the latest numbers.
        <span style={{ display: 'block', marginTop: 8, color: GOLD, fontSize: 12.5 }}>
          Tip: only import the teams you actually captain — not every team you're a
          member on. This tool is built for running your own teams, so importing
          teams you just play on clutters your roster and stats with players you
          don't manage.
        </span>
      </Step>
      <Step n={3} title="Sync your schedule">
        On the <strong>Schedule</strong> tab, click <strong>Sync from APA</strong> to
        pull the whole season — week numbers, home/away, locations, and final scores.
        From there you can plan any match against the opponent's real roster.
      </Step>
    </Section>

    {/* Tab guide */}
    <Section icon={Compass} title="WHAT EACH TAB DOES" accent={CYAN}>
      <Item term="Dashboard">
        Season overview: playoff eligibility (4 matches per format), Vegas
        eligibility progress, week tracker, and match-activity charts.
      </Item>
      <Item term="Team Roster">
        Your player list with per-format skill levels and season stats. Edit
        manually or let APA Sync fill it in.
      </Item>
      <Item term="APA Sync">
        Connect / reconnect your poolplayers.com account and import your roster.
        The starting point for everything live.
      </Item>
      <Item term="Schedule">
        The full season pulled from APA. Each match can launch the Match Planner
        pre-loaded with that opponent.
      </Item>
      <Item term="Match Planner">
        Plan a lineup for a match under the Rule of 23. Toggle 8-ball / 9-ball, fill
        five slots, and — when launched from the schedule — pick the opponent's
        actual players with skill levels auto-filled.
      </Item>
      <Item term="Scouting">
        Pull any opponent's roster with win rates and a projected best legal lineup
        under the 23 cap, so you know what you're walking into.
      </Item>
      <Item term="Stats &amp; History">
        Win rates, streaks, home/away splits, head-to-head records, the Trophy Case
        of highlight stats, and your archived past sessions — split by 8-ball and
        9-ball.
      </Item>
    </Section>

    {/* Key rules */}
    <Section icon={Scale} title="KEY RULES" accent={GOLD}>
      <Item term="The Rule of 23">
        In a five-player match, the combined skill levels of your lineup can't
        exceed 23. The Match Planner enforces this automatically and flags an
        illegal lineup before you commit.
      </Item>
      <Item term="Playoff eligibility (4 matches)">
        A player generally needs at least 4 matches played with the team in a format
        to be playoff-eligible. The Dashboard's LED bars track this per player.
      </Item>
      <Item term="Vegas / Nationals eligibility (10 matches)">
        Advancing toward Nationals takes more matches played with the team. The
        Dashboard's Vegas Eligibility section shows each player's progress toward the
        threshold and how many more they need. If your division's number differs,
        it's a one-line change — just ask.
      </Item>
      <Item term="8-ball and 9-ball are separate">
        They're different teams and divisions, so stats and eligibility never blend
        across formats. Most views have their own format toggle.
      </Item>
    </Section>

    {/* Troubleshooting */}
    <Section icon={Wrench} title="TROUBLESHOOTING" accent={GOLD}>
      <Item term="Sync says my session expired">
        Go to <strong>APA Sync</strong> and reconnect. Access tokens are short-lived;
        reconnecting refreshes them without changing your data.
      </Item>
      <Item term="A player's stats look stale">
        Re-import from <strong>APA Sync</strong>. Players are matched by their stable
        APA member number, so re-importing safely updates existing records rather
        than duplicating them.
      </Item>
      <Item term="The Trophy Case is empty">
        It only shows highlight stats (break-and-runs, mini-slams, etc.) that APA
        actually reports for your team — if nobody has any yet, or APA doesn't
        return them, the section stays hidden rather than showing an error.
      </Item>
      <Item term="Something looks wrong after a sync">
        Your data lives in your account, not the device — refresh the page or sign
        out and back in. If a number is still off, it usually means APA hasn't
        finalized that match yet.
      </Item>
    </Section>

    {/* Data & privacy */}
    <Section icon={ShieldCheck} title="YOUR DATA &amp; PRIVACY" accent={CYAN}>
      <p style={{ fontSize: 13, lineHeight: 1.6, color: 'rgba(239,231,214,0.72)', marginBottom: 14 }}>
        Your roster, schedule, and history are stored privately under your own
        account. The tool stores only a secure sync token for poolplayers.com, never
        your APA password. You can disconnect or delete your data at any time from
        the APA Sync tab and the roster/schedule/history controls.
      </p>
      <div className="flex flex-wrap gap-4">
        {[
          { label: 'Privacy Policy', href: '/privacy.html' },
          { label: 'Terms of Use', href: '/terms.html' },
          { label: 'Delete My Data', href: '/data-deletion.html' },
        ].map(l => (
          <a
            key={l.href}
            href={l.href}
            target="_blank"
            rel="noreferrer"
            className="section-label"
            style={{ color: CYAN, textDecoration: 'underline', textUnderlineOffset: 3 }}
          >
            {l.label}
          </a>
        ))}
      </div>
    </Section>

    {/* Footer note */}
    <p style={{ fontSize: 12, textAlign: 'center', color: 'rgba(239,231,214,0.4)', paddingTop: 4 }}>
      Built for chasing the APA Championship in Vegas. Run into something this guide
      doesn't cover? It can always be added.
    </p>
  </div>
);
