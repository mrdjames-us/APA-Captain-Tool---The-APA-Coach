import React, { useEffect, useState } from 'react';
import { Award, Loader2 } from 'lucide-react';
import { APAConnection, APAAchievementPlayer } from '../types';
import { apaAchievements } from '../services/apaApi';

interface Props {
  connection: APAConnection | null;
  // The APA team id to fetch achievements for. Callers resolve this
  // themselves (e.g. from the synced schedule for a specific format) rather
  // than us defaulting to whatever team is "active" in APA Sync, which may
  // not match the format the caller is currently showing.
  teamId: number | null;
}

interface Category {
  key: keyof Omit<APAAchievementPlayer, 'memberNumber' | 'name'>;
  label: string;
}

const CATEGORIES: Category[] = [
  { key: 'breakAndRuns8', label: '8-Ball Break & Runs' },
  { key: 'breakAndRuns9', label: '9-Ball Break & Runs' },
  { key: 'eightOnBreaks', label: '8-on-the-Break' },
  { key: 'nineOnSnaps',   label: '9-on-the-Snap' },
  { key: 'miniSlams',     label: 'Mini Slams' },
  { key: 'rackless',      label: 'Rackless Runs' },
  { key: 'skunks',        label: 'Skunks' },
];

const GOLD = '#F2C14E';

// Best-effort highlight-reel stats (break-and-runs, mini-slams, etc). The
// underlying query is unverified against live traffic — if APA's schema
// doesn't match, this quietly shows nothing rather than an alarming error;
// it never affects roster or schedule sync.
export const TrophyCase: React.FC<Props> = ({ connection, teamId }) => {
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [leaders, setLeaders] = useState<{ label: string; name: string; count: number }[] | null>(null);

  useEffect(() => {
    if (!connection || !teamId) { setLeaders(null); return; }
    let cancelled = false;
    setLoading(true); setUnavailable(false);
    apaAchievements(connection.deviceRefreshToken, teamId)
      .then(res => {
        if (cancelled) return;
        const found: { label: string; name: string; count: number }[] = [];
        for (const cat of CATEGORIES) {
          let best: APAAchievementPlayer | null = null;
          for (const p of res.players) {
            const v = p[cat.key];
            if (typeof v === 'number' && v > 0 && (!best || v > (best[cat.key] as number))) best = p;
          }
          if (best) found.push({ label: cat.label, name: best.name, count: best[cat.key] as number });
        }
        setLeaders(found);
      })
      .catch(() => { if (!cancelled) setUnavailable(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [connection, teamId]);

  if (!connection || !teamId) return null;
  if (unavailable) return null; // fail soft — no scary error for a bonus feature
  if (!loading && (!leaders || leaders.length === 0)) return null;

  return (
    <section>
      <div className="flex items-center gap-3 mb-5">
        <Award style={{ width: 18, height: 18, color: GOLD }} />
        <h3 className="font-orbitron" style={{ fontSize: 13, fontWeight: 800, color: '#EFE7D6', letterSpacing: '0.1em' }}>
          TROPHY CASE
        </h3>
        {loading && <Loader2 className="w-4 h-4 animate-spin" style={{ color: GOLD }} />}
      </div>
      {leaders && leaders.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {leaders.map(l => (
            <div key={l.label} className="card rounded-2xl" style={{ padding: '18px', borderColor: `${GOLD}33` }}>
              <p className="section-label" style={{ color: `${GOLD}cc` }}>{l.label}</p>
              <p className="stat-num" style={{ color: GOLD, fontSize: '1.8rem', marginTop: 6 }}>{l.count}</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(239,231,214,0.7)' }}>{l.name}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
