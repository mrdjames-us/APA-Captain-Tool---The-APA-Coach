
import React, { useState, useRef } from 'react';
import { ScheduleEntry, APAConnection } from '../types';
import { parseScheduleScreenshot, ParsedScheduleEntry } from '../services/gemini';
import { apaTeam } from '../services/apaApi';
import {
  Calendar,
  Trash2,
  ChevronRight,
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Image,
  Globe,
  RefreshCw,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ScheduleViewProps {
  schedule: ScheduleEntry[];
  connection?: APAConnection | null;
  onSaveEntry: (e: ScheduleEntry) => void;
  onDeleteEntry: (id: string) => void;
  onSaveAll: (entries: ScheduleEntry[]) => void;
  onPlanMatch: (entry: ScheduleEntry) => void;
}

type ActiveImport = 'none' | 'screenshot';

// ── Helpers ────────────────────────────────────────────────────────────────────

const genId = () => Math.random().toString(36).slice(2, 10);

// Merge a freshly-pulled APA schedule for one team into the existing entries.
// Idempotent: replaces this team's previously-synced entries (keeping manual
// entries and other teams' synced entries), so re-syncing never duplicates.
function mergeApaSchedule(
  existing: ScheduleEntry[],
  apa: import('../services/apaApi').TeamResult,
  teamId: number
): { merged: ScheduleEntry[]; count: number } {
  const kept = existing.filter(e => e.apaTeamId !== teamId);
  const format = (apa.roster.format || apa.page.division?.format || null) as 'EIGHT' | 'NINE' | null;
  const synced: ScheduleEntry[] = apa.schedule.matches
    .filter(m => !m.isBye && m.opponent)
    .map(m => {
      const mine = (m.points || []).find(p => p.homeAway === (m.isHome ? 'HOME' : 'AWAY'));
      const opp = (m.points || []).find(p => p.homeAway === (m.isHome ? 'AWAY' : 'HOME'));
      return {
        id: `apa-${teamId}-${m.id}`,
        date: m.startTime || new Date().toISOString(),
        opponentTeamName: `${m.opponent!.name} (${m.opponent!.number})`,
        location: m.location || undefined,
        isHome: m.isHome,
        source: 'apa' as const,
        apaMatchId: m.id,
        apaTeamId: teamId,
        opponentApaTeamId: m.opponent!.id,
        format: format || undefined,
        week: m.week,
        isBye: m.isBye,
        isScored: m.isScored,
        myPoints: m.isScored && mine ? mine.total : null,
        oppPoints: m.isScored && opp ? opp.total : null,
      };
    });
  return { merged: [...kept, ...synced], count: synced.length };
}

const formatDate = (iso: string): string => {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      year:    'numeric',
      month:   'short',
      day:     'numeric',
    });
  } catch {
    return iso;
  }
};

const formatTime = (iso: string): string => {
  try {
    const d = new Date(iso);
    // Only show time if it's not midnight (i.e., a real time was set)
    if (d.getHours() === 0 && d.getMinutes() === 0) return '';
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
};

const isUpcoming = (iso: string): boolean => new Date(iso) >= new Date();

const fileToBase64 = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // strip "data:...;base64," prefix
      resolve(result.split(',')[1] ?? '');
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

// ── Preview table shared by screenshot + ICS modals ───────────────────────────

interface PreviewTableProps {
  entries: ParsedScheduleEntry[];
  selected: Set<number>;
  onToggle: (i: number) => void;
  onToggleAll: () => void;
}

const PreviewTable: React.FC<PreviewTableProps> = ({ entries, selected, onToggle, onToggleAll }) => {
  const allChecked = entries.length > 0 && selected.size === entries.length;
  return (
    <div className="overflow-x-auto" style={{ maxHeight: '260px', overflowY: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #00E5FF44' }}>
            <th style={{ padding: '6px 8px', textAlign: 'left' }}>
              <input
                type="checkbox"
                checked={allChecked}
                onChange={onToggleAll}
                style={{ accentColor: '#00E5FF' }}
              />
            </th>
            {['Date', 'Opponent', 'Location', 'H/A'].map(h => (
              <th
                key={h}
                className="section-label"
                style={{ padding: '6px 8px', textAlign: 'left', color: '#00E5FF', fontSize: '10px' }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {entries.map((e, i) => (
            <tr
              key={i}
              style={{
                borderBottom: '1px solid #ffffff10',
                background: selected.has(i) ? '#00E5FF0A' : 'transparent',
              }}
            >
              <td style={{ padding: '6px 8px' }}>
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  onChange={() => onToggle(i)}
                  style={{ accentColor: '#00E5FF' }}
                />
              </td>
              <td className="font-mono" style={{ padding: '6px 8px', color: '#e0e0e0', whiteSpace: 'nowrap' }}>
                {formatDate(e.date)}
              </td>
              <td style={{ padding: '6px 8px', color: '#ffffff', fontWeight: 600 }}>
                {e.opponentTeamName}
              </td>
              <td style={{ padding: '6px 8px', color: '#aaa' }}>{e.location ?? '—'}</td>
              <td style={{ padding: '6px 8px' }}>
                {e.isHome ? (
                  <span style={{ color: '#00E5FF', fontSize: '10px', fontWeight: 700 }}>HOME</span>
                ) : (
                  <span style={{ color: '#FF0066', fontSize: '10px', fontWeight: 700 }}>AWAY</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// ── Modal shell ────────────────────────────────────────────────────────────────

const Modal: React.FC<{ title: string; onClose: () => void; children: React.ReactNode }> = ({
  title,
  onClose,
  children,
}) => (
  <div
    style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.85)',
      zIndex: 50,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '16px',
    }}
  >
    <div
      className="card"
      style={{
        width: '100%',
        maxWidth: '680px',
        maxHeight: '90vh',
        overflowY: 'auto',
        border: '1px solid #00E5FF55',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h3 className="font-orbitron text-glow-cyan" style={{ fontSize: '16px', letterSpacing: '0.12em' }}>
          {title}
        </h3>
        <button
          onClick={onClose}
          style={{ color: '#FF0066', background: 'none', border: 'none', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}
        >
          ×
        </button>
      </div>
      {children}
    </div>
  </div>
);

// ── Screenshot import modal ────────────────────────────────────────────────────

interface ScreenshotModalProps {
  onClose: () => void;
  onImport: (entries: ParsedScheduleEntry[], selected: Set<number>) => void;
}

const ScreenshotModal: React.FC<ScreenshotModalProps> = ({ onClose, onImport }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedScheduleEntry[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      return;
    }
    setLoading(true);
    setError(null);
    setParsed([]);
    try {
      const base64 = await fileToBase64(file);
      const results = await parseScheduleScreenshot(base64, file.type);
      if (results.length === 0) {
        setError('No schedule entries could be parsed from this image. Try a clearer screenshot.');
      } else {
        setParsed(results);
        setSelected(new Set(results.map((_, i) => i)));
      }
    } catch (e) {
      setError('Failed to parse screenshot. Please try again.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const toggleIndex = (i: number) => {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    setSelected(next);
  };

  const toggleAll = () => {
    if (selected.size === parsed.length) setSelected(new Set());
    else setSelected(new Set(parsed.map((_, i) => i)));
  };

  return (
    <Modal title="IMPORT FROM SCREENSHOT" onClose={onClose}>
      {/* Drop zone */}
      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className="card"
        style={{
          border: `2px dashed ${dragOver ? '#FFB700' : '#00E5FF66'}`,
          borderRadius: '10px',
          padding: '32px 16px',
          textAlign: 'center',
          cursor: 'pointer',
          marginBottom: '20px',
          transition: 'border-color 0.2s',
          background: dragOver ? '#FFB70008' : '#00E5FF04',
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <Image style={{ width: 36, height: 36, margin: '0 auto 12px', color: '#00E5FF' }} />
        <p style={{ color: '#00E5FF', fontSize: '13px', fontWeight: 600 }}>
          Drop schedule screenshot here or click to browse
        </p>
        <p style={{ color: '#666', fontSize: '11px', marginTop: 4 }}>PNG, JPG, WEBP accepted</p>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#00E5FF', marginBottom: 16 }}>
          <Loader2 style={{ width: 18, height: 18, animation: 'spin 1s linear infinite' }} />
          <span style={{ fontSize: 13 }}>Analyzing screenshot with AI…</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#FF0066', marginBottom: 16, fontSize: 13 }}>
          <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
          {error}
        </div>
      )}

      {/* Preview */}
      {parsed.length > 0 && (
        <>
          <p className="section-label" style={{ marginBottom: 8 }}>
            PARSED {parsed.length} MATCH{parsed.length !== 1 ? 'ES' : ''} — SELECT TO IMPORT
          </p>
          <PreviewTable entries={parsed} selected={selected} onToggle={toggleIndex} onToggleAll={toggleAll} />
          <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button className="btn-neon" onClick={onClose}>CANCEL</button>
            <button
              className="btn-solid-cyan"
              disabled={selected.size === 0}
              onClick={() => onImport(parsed, selected)}
              style={{ opacity: selected.size === 0 ? 0.4 : 1 }}
            >
              IMPORT SELECTED ({selected.size})
            </button>
          </div>
        </>
      )}
    </Modal>
  );
};

// ── Schedule entry card ────────────────────────────────────────────────────────

interface EntryCardProps {
  entry: ScheduleEntry;
  dimmed?: boolean;
  onDelete: (id: string) => void;
  onPlanMatch: (entry: ScheduleEntry) => void;
}

const EntryCard: React.FC<EntryCardProps> = ({ entry, dimmed, onDelete, onPlanMatch }) => {
  const [deleteHover, setDeleteHover] = useState(false);

  return (
    <div
      className={`card ${!dimmed ? 'card-active' : ''}`}
      style={{
        opacity: dimmed ? 0.55 : 1,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        padding: '14px 16px',
        border: dimmed ? '1px solid #ffffff15' : '1px solid #00E5FF33',
        transition: 'opacity 0.2s',
      }}
    >
      {/* Top row: date + badges */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 6 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Calendar style={{ width: 14, height: 14, color: dimmed ? '#555' : '#00E5FF', flexShrink: 0 }} />
          <span
            className="font-mono"
            style={{ fontSize: 12, color: dimmed ? '#555' : '#00E5FF', letterSpacing: '0.04em' }}
          >
            {formatDate(entry.date)}
            {formatTime(entry.date) && (
              <span style={{ color: dimmed ? '#444' : 'rgba(0,229,255,0.55)', marginLeft: 6, fontSize: 11 }}>
                {formatTime(entry.date)}
              </span>
            )}
          </span>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Week badge (APA-synced) */}
          {entry.week != null && (
            <span
              style={{
                fontSize: 10, fontWeight: 700, color: '#888',
                border: '1px solid #ffffff22', borderRadius: 4,
                padding: '2px 7px', letterSpacing: '0.06em',
              }}
            >
              WK {entry.week}
            </span>
          )}
          {/* Home/Away badge */}
          {entry.isHome ? (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#00E5FF',
                border: '1px solid #00E5FF55',
                borderRadius: 4,
                padding: '2px 7px',
                letterSpacing: '0.08em',
              }}
            >
              HOME
            </span>
          ) : (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#FF0066',
                border: '1px solid #FF006655',
                borderRadius: 4,
                padding: '2px 7px',
                letterSpacing: '0.08em',
              }}
            >
              AWAY
            </span>
          )}

          {/* Played badge */}
          {(entry.matchId || entry.isScored) && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#00ff88',
                border: '1px solid #00ff8855',
                borderRadius: 4,
                padding: '2px 7px',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                letterSpacing: '0.08em',
              }}
            >
              <CheckCircle2 style={{ width: 10, height: 10 }} />
              PLAYED
            </span>
          )}
        </div>
      </div>

      {/* Opponent name */}
      <div style={{ fontWeight: 700, fontSize: 15, color: '#fff', letterSpacing: '0.02em' }}>
        {entry.opponentTeamName}
      </div>

      {/* Result / score (APA-synced, scored matches) */}
      {entry.isScored && entry.myPoints != null && entry.oppPoints != null && (() => {
        const won = entry.myPoints > entry.oppPoints;
        const tie = entry.myPoints === entry.oppPoints;
        const color = tie ? '#FFB700' : won ? '#00ff88' : '#FF0066';
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
            <span style={{ fontWeight: 800, color, letterSpacing: '0.06em' }}>
              {tie ? 'TIE' : won ? 'WON' : 'LOST'}
            </span>
            <span className="font-mono" style={{ color: '#ccc' }}>
              {entry.myPoints}–{entry.oppPoints}
            </span>
          </div>
        );
      })()}

      {/* Location */}
      {entry.location && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#888', fontSize: 12 }}>
          <MapPin style={{ width: 12, height: 12, flexShrink: 0 }} />
          {entry.location}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
        <button
          className="btn-neon"
          onClick={() => onPlanMatch(entry)}
          style={{
            fontSize: 11,
            padding: '4px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          PLAN LINEUP
          <ChevronRight style={{ width: 11, height: 11 }} />
        </button>
        <button
          onClick={() => onDelete(entry.id)}
          onMouseEnter={() => setDeleteHover(true)}
          onMouseLeave={() => setDeleteHover(false)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: '4px 6px',
            borderRadius: 6,
            color: deleteHover ? '#FF0066' : '#555',
            transition: 'color 0.15s',
          }}
          title="Delete entry"
        >
          <Trash2 style={{ width: 14, height: 14 }} />
        </button>
      </div>
    </div>
  );
};

// ── Import toolbar (shared between header and empty state) ─────────────────────

interface ImportToolbarProps {
  onScreenshot: () => void;
  onApaSync?: () => void;
  apaConnected?: boolean;
  syncing?: boolean;
}

const ImportToolbar: React.FC<ImportToolbarProps> = ({ onScreenshot, onApaSync, apaConnected, syncing }) => (
  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
    {apaConnected && onApaSync && (
      <button
        className="btn-solid-cyan"
        onClick={onApaSync}
        disabled={syncing}
        style={{ display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 0 12px #00E5FF88' }}
      >
        {syncing
          ? <Loader2 style={{ width: 14, height: 14, animation: 'spin 1s linear infinite' }} />
          : <Globe style={{ width: 14, height: 14 }} />}
        {syncing ? 'SYNCING…' : 'SYNC FROM APA'}
      </button>
    )}
    <button
      className="btn-neon-gold"
      onClick={onScreenshot}
      style={{ display: 'flex', alignItems: 'center', gap: 7 }}
    >
      <Image style={{ width: 14, height: 14 }} />
      SCREENSHOT
    </button>
  </div>
);

// ── Main ScheduleView ──────────────────────────────────────────────────────────

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  schedule,
  connection,
  onSaveEntry,
  onDeleteEntry,
  onSaveAll,
  onPlanMatch,
}) => {
  const [activeImport, setActiveImport] = useState<ActiveImport>('none');
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const apaConnected = !!(connection && connection.deviceRefreshToken && connection.activeTeamId);
  const activeTeam = connection?.teams.find(t => t.id === connection.activeTeamId);

  const handleApaSync = async () => {
    if (!connection || !connection.activeTeamId) return;
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await apaTeam(connection.deviceRefreshToken, connection.activeTeamId);
      const { merged, count } = mergeApaSchedule(schedule, res, connection.activeTeamId);
      onSaveAll(merged);
      const teamLabel = activeTeam ? `${activeTeam.name}` : 'team';
      setSyncMsg({ ok: true, text: `Synced ${count} matches for ${teamLabel} from poolplayers.com.` });
    } catch (e: any) {
      setSyncMsg({ ok: false, text: e.message || 'Sync failed — your APA session may have expired. Reconnect in the APA Sync tab.' });
    } finally {
      setSyncing(false);
    }
  };

  const upcoming = schedule
    .filter(e => isUpcoming(e.date))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const past = schedule
    .filter(e => !isUpcoming(e.date))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const upcomingCount = upcoming.length;

  const closeModal = () => {
    setActiveImport('none');
  };

  const handleImportConfirm = (entries: ParsedScheduleEntry[], selected: Set<number>) => {
    const newEntries: ScheduleEntry[] = Array.from(selected).map(i => ({
      id: genId(),
      date: entries[i].date,
      opponentTeamName: entries[i].opponentTeamName,
      location: entries[i].location,
      isHome: entries[i].isHome,
    }));
    onSaveAll([...schedule, ...newEntries]);
    closeModal();
  };

  const openScreenshot = () => setActiveImport('screenshot');

  return (
    <div
      className="animate-in slide-in-from-bottom-4 duration-500 pb-20"
      style={{ maxWidth: 760, margin: '0 auto' }}
    >
      {/* ── Header ── */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <h2
            className="font-orbitron text-glow-cyan"
            style={{ fontSize: '26px', letterSpacing: '0.16em', color: '#00E5FF' }}
          >
            SCHEDULE
          </h2>
          {upcomingCount > 0 && (
            <span
              style={{
                background: '#FFB700',
                color: '#000',
                fontWeight: 900,
                fontSize: 11,
                borderRadius: 20,
                padding: '3px 10px',
                letterSpacing: '0.06em',
                boxShadow: '0 0 10px #FFB70088',
              }}
            >
              {upcomingCount} UPCOMING
            </span>
          )}
        </div>

        <ImportToolbar
          onScreenshot={openScreenshot}
          onApaSync={handleApaSync}
          apaConnected={apaConnected}
          syncing={syncing}
        />
      </header>

      {/* ── APA sync hint / status ── */}
      {apaConnected && activeTeam && (
        <div style={{ marginBottom: 16, fontSize: 12, color: 'rgba(0,229,255,0.7)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw style={{ width: 12, height: 12 }} />
          Active team: <strong style={{ color: '#fff' }}>{activeTeam.name}</strong>. Switch teams in the APA Sync tab, then sync again to add another team's matches.
        </div>
      )}
      {syncMsg && (
        <div
          style={{
            marginBottom: 16, padding: '10px 14px', borderRadius: 6, fontSize: 13,
            display: 'flex', alignItems: 'center', gap: 8,
            background: syncMsg.ok ? 'rgba(0,255,136,0.07)' : 'rgba(255,0,102,0.08)',
            border: `1px solid ${syncMsg.ok ? 'rgba(0,255,136,0.3)' : 'rgba(255,0,102,0.3)'}`,
            color: syncMsg.ok ? '#7dffb8' : '#ff87b0',
          }}
        >
          {syncMsg.ok ? <CheckCircle2 style={{ width: 15, height: 15 }} /> : <AlertCircle style={{ width: 15, height: 15 }} />}
          {syncMsg.text}
        </div>
      )}

      {/* ── Schedule list ── */}
      {schedule.length === 0 ? (
        /* Empty state */
        <div
          className="card"
          style={{
            textAlign: 'center',
            padding: '56px 24px',
            border: '1px solid #00E5FF22',
            background: `
              radial-gradient(circle at 50% 50%, #00E5FF05 0%, transparent 70%),
              repeating-linear-gradient(0deg, transparent, transparent 39px, #00E5FF0A 39px, #00E5FF0A 40px),
              repeating-linear-gradient(90deg, transparent, transparent 39px, #00E5FF0A 39px, #00E5FF0A 40px)
            `,
          }}
        >
          <Calendar style={{ width: 48, height: 48, margin: '0 auto 16px', color: '#00E5FF33' }} />
          <p className="section-label" style={{ marginBottom: 20, fontSize: 14 }}>NO MATCHES SCHEDULED</p>
          <p style={{ color: '#444', fontSize: 12, marginBottom: 24 }}>
            {apaConnected
              ? 'Sync your schedule straight from poolplayers.com, or add matches manually.'
              : 'Connect your APA account (APA Sync tab) to pull your schedule automatically, or import manually.'}
          </p>
          <ImportToolbar
            onScreenshot={openScreenshot}
            onApaSync={handleApaSync}
            apaConnected={apaConnected}
            syncing={syncing}
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span className="led led-on-cyan" />
                <span className="section-label" style={{ color: '#00E5FF' }}>UPCOMING</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {upcoming.map(e => (
                  <EntryCard key={e.id} entry={e} onDelete={onDeleteEntry} onPlanMatch={onPlanMatch} />
                ))}
              </div>
            </section>
          )}

          {/* Past */}
          {past.length > 0 && (
            <section>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span className="led led-off" />
                <span className="section-label" style={{ color: '#555' }}>PAST</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {past.map(e => (
                  <EntryCard key={e.id} entry={e} dimmed onDelete={onDeleteEntry} onPlanMatch={onPlanMatch} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── Screenshot modal ── */}
      {activeImport === 'screenshot' && (
        <ScreenshotModal onClose={closeModal} onImport={handleImportConfirm} />
      )}

    </div>
  );
};

export default ScheduleView;
