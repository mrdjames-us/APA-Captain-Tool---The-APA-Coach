
import React, { useState, useRef } from 'react';
import { ScheduleEntry } from '../types';
import { parseScheduleScreenshot, ParsedScheduleEntry } from '../services/gemini';
import ICAL from 'ical.js';
import {
  Calendar,
  Upload,
  Plus,
  Trash2,
  ChevronRight,
  Home,
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle2,
  FileText,
  Image,
} from 'lucide-react';

// ── Types ──────────────────────────────────────────────────────────────────────

interface ScheduleViewProps {
  schedule: ScheduleEntry[];
  onSaveEntry: (e: ScheduleEntry) => void;
  onDeleteEntry: (id: string) => void;
  onSaveAll: (entries: ScheduleEntry[]) => void;
  onPlanMatch: (opponentName: string) => void;
}

type ActiveImport = 'none' | 'screenshot' | 'ics' | 'manual';

// ── Helpers ────────────────────────────────────────────────────────────────────

const genId = () => Math.random().toString(36).slice(2, 10);

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

// ── ICS import modal ───────────────────────────────────────────────────────────

interface ICSModalProps {
  onClose: () => void;
  onImport: (entries: ParsedScheduleEntry[], selected: Set<number>) => void;
}

const ICSModal: React.FC<ICSModalProps> = ({ onClose, onImport }) => {
  const [error, setError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<ParsedScheduleEntry[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const fileRef = useRef<HTMLInputElement>(null);

  const processICS = (text: string) => {
    setError(null);
    try {
      const jcal = ICAL.parse(text);
      const comp = new ICAL.Component(jcal);
      const vevents = comp.getAllSubcomponents('vevent');

      if (vevents.length === 0) {
        setError('No events found in this ICS file.');
        return;
      }

      const entries: ParsedScheduleEntry[] = vevents.map(ev => {
        const vevent = new ICAL.Event(ev);
        const dtstart = vevent.startDate;
        const jsDate: Date = dtstart ? dtstart.toJSDate() : new Date();
        const summary: string = vevent.summary ?? 'Unknown Opponent';
        const location: string | undefined = ev.getFirstPropertyValue('location') as string | undefined;

        return {
          date: jsDate.toISOString(),
          opponentTeamName: summary,
          location: location || undefined,
          isHome: true,
        };
      });

      setParsed(entries);
      setSelected(new Set(entries.map((_, i) => i)));
    } catch (e) {
      setError('Failed to parse ICS file. Make sure it is a valid iCalendar file.');
      console.error(e);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith('.ics') && file.type !== 'text/calendar') {
      setError('Please select a valid .ics file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => processICS(ev.target?.result as string);
    reader.onerror = () => setError('Could not read file.');
    reader.readAsText(file);
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
    <Modal title="IMPORT FROM ICS FILE" onClose={onClose}>
      <div
        onClick={() => fileRef.current?.click()}
        className="card"
        style={{
          border: '2px dashed #00E5FF66',
          borderRadius: '10px',
          padding: '28px 16px',
          textAlign: 'center',
          cursor: 'pointer',
          marginBottom: '20px',
          background: '#00E5FF04',
        }}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".ics,text/calendar"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
        <FileText style={{ width: 32, height: 32, margin: '0 auto 10px', color: '#00E5FF' }} />
        <p style={{ color: '#00E5FF', fontSize: '13px', fontWeight: 600 }}>
          Click to select an .ics calendar file
        </p>
        <p style={{ color: '#666', fontSize: '11px', marginTop: 4 }}>iCalendar format (.ics)</p>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#FF0066', marginBottom: 16, fontSize: 13 }}>
          <AlertCircle style={{ width: 16, height: 16, flexShrink: 0 }} />
          {error}
        </div>
      )}

      {parsed.length > 0 && (
        <>
          <p className="section-label" style={{ marginBottom: 8 }}>
            FOUND {parsed.length} EVENT{parsed.length !== 1 ? 'S' : ''} — SELECT TO IMPORT
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

// ── Manual entry panel ─────────────────────────────────────────────────────────

interface ManualEntryPanelProps {
  onAdd: (entry: ScheduleEntry) => void;
  onClose: () => void;
}

const ManualEntryPanel: React.FC<ManualEntryPanelProps> = ({ onAdd, onClose }) => {
  const [date, setDate] = useState('');
  const [opponent, setOpponent] = useState('');
  const [location, setLocation] = useState('');
  const [isHome, setIsHome] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    if (!date) { setError('Date is required.'); return; }
    if (!opponent.trim()) { setError('Opponent name is required.'); return; }
    setError(null);
    const entry: ScheduleEntry = {
      id: genId(),
      date: new Date(date).toISOString(),
      opponentTeamName: opponent.trim(),
      location: location.trim() || undefined,
      isHome,
    };
    onAdd(entry);
    setDate('');
    setOpponent('');
    setLocation('');
    setIsHome(true);
  };

  return (
    <div
      className="card"
      style={{ border: '1px solid #00E5FF44', marginBottom: '24px', padding: '20px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 className="font-orbitron text-glow-cyan" style={{ fontSize: '13px', letterSpacing: '0.1em' }}>
          ADD MANUAL ENTRY
        </h3>
        <button
          onClick={onClose}
          style={{ color: '#FF0066', background: 'none', border: 'none', cursor: 'pointer', fontSize: '18px' }}
        >
          ×
        </button>
      </div>

      <div style={{ display: 'grid', gap: 12 }}>
        {/* Date */}
        <div>
          <label className="section-label" style={{ display: 'block', marginBottom: 4 }}>MATCH DATE &amp; TIME</label>
          <input
            type="datetime-local"
            className="input-neon"
            value={date}
            onChange={e => setDate(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        {/* Opponent */}
        <div>
          <label className="section-label" style={{ display: 'block', marginBottom: 4 }}>OPPONENT TEAM NAME</label>
          <input
            type="text"
            className="input-neon"
            placeholder="e.g. Rack City Rebels"
            value={opponent}
            onChange={e => setOpponent(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        {/* Location */}
        <div>
          <label className="section-label" style={{ display: 'block', marginBottom: 4 }}>LOCATION (OPTIONAL)</label>
          <input
            type="text"
            className="input-neon"
            placeholder="e.g. Lucky's Bar & Grill"
            value={location}
            onChange={e => setLocation(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        {/* Home / Away toggle */}
        <div>
          <label className="section-label" style={{ display: 'block', marginBottom: 6 }}>HOME OR AWAY</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setIsHome(true)}
              className={isHome ? 'btn-solid-cyan' : 'btn-neon'}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: isHome ? '0 0 12px #00E5FF88' : undefined,
              }}
            >
              <Home style={{ width: 13, height: 13 }} />
              HOME
            </button>
            <button
              onClick={() => setIsHome(false)}
              className="btn-neon"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                color: !isHome ? '#FF0066' : undefined,
                borderColor: !isHome ? '#FF0066' : undefined,
                boxShadow: !isHome ? '0 0 12px #FF006688' : undefined,
              }}
            >
              <ChevronRight style={{ width: 13, height: 13 }} />
              AWAY
            </button>
          </div>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#FF0066', fontSize: 12 }}>
            <AlertCircle style={{ width: 14, height: 14 }} />
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn-solid-cyan" onClick={handleAdd} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Plus style={{ width: 15, height: 15 }} />
            ADD ENTRY
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Schedule entry card ────────────────────────────────────────────────────────

interface EntryCardProps {
  entry: ScheduleEntry;
  dimmed?: boolean;
  onDelete: (id: string) => void;
  onPlanMatch: (opponentName: string) => void;
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
          </span>
        </div>

        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
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
          {entry.matchId && (
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
          onClick={() => onPlanMatch(entry.opponentTeamName)}
          style={{
            fontSize: 11,
            padding: '4px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
          }}
        >
          <Upload style={{ width: 11, height: 11 }} />
          PLAN LINEUP
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
  onICS: () => void;
  onManual: () => void;
}

const ImportToolbar: React.FC<ImportToolbarProps> = ({ onScreenshot, onICS, onManual }) => (
  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
    <button
      className="btn-neon-gold"
      onClick={onScreenshot}
      style={{ display: 'flex', alignItems: 'center', gap: 7 }}
    >
      <Image style={{ width: 14, height: 14 }} />
      SCREENSHOT
    </button>
    <button
      className="btn-neon"
      onClick={onICS}
      style={{ display: 'flex', alignItems: 'center', gap: 7 }}
    >
      <FileText style={{ width: 14, height: 14 }} />
      ICS FILE
    </button>
    <button
      className="btn-neon"
      onClick={onManual}
      style={{ display: 'flex', alignItems: 'center', gap: 7 }}
    >
      <Plus style={{ width: 14, height: 14 }} />
      ADD MANUALLY
    </button>
  </div>
);

// ── Main ScheduleView ──────────────────────────────────────────────────────────

export const ScheduleView: React.FC<ScheduleViewProps> = ({
  schedule,
  onSaveEntry,
  onDeleteEntry,
  onSaveAll,
  onPlanMatch,
}) => {
  const [activeImport, setActiveImport] = useState<ActiveImport>('none');

  const upcoming = schedule
    .filter(e => isUpcoming(e.date))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const past = schedule
    .filter(e => !isUpcoming(e.date))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const upcomingCount = upcoming.length;

  const closeModal = () => {
    setActiveImport('none');
    setImportError(null);
    setImportParsed([]);
    setImportSelected(new Set());
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

  const handleManualAdd = (entry: ScheduleEntry) => {
    onSaveEntry(entry);
    setActiveImport('none');
  };

  const openScreenshot = () => setActiveImport('screenshot');
  const openICS = () => setActiveImport('ics');
  const openManual = () => setActiveImport(prev => (prev === 'manual' ? 'none' : 'manual'));

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
          onICS={openICS}
          onManual={openManual}
        />
      </header>

      {/* ── Manual entry panel ── */}
      {activeImport === 'manual' && (
        <ManualEntryPanel onAdd={handleManualAdd} onClose={() => setActiveImport('none')} />
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
            Import your league schedule or add matches manually.
          </p>
          <ImportToolbar
            onScreenshot={openScreenshot}
            onICS={openICS}
            onManual={openManual}
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

      {/* ── ICS modal ── */}
      {activeImport === 'ics' && (
        <ICSModal onClose={closeModal} onImport={handleImportConfirm} />
      )}
    </div>
  );
};

export default ScheduleView;
