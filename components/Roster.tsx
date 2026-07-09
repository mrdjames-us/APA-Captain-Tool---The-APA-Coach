
import React, { useState, useRef } from 'react';
import { Player, SkillLevel } from '../types';
import { parseRosterScreenshot, ParsedPlayer } from '../services/gemini';
import {
  Trash2,
  Archive,
  UserCheck,
  AlertTriangle,
  Edit2,
  Plus,
  Minus,
  X,
  Save,
  UserPlus,
  Upload,
  Loader2,
  ImageIcon,
} from 'lucide-react';

interface RosterProps {
  players: Player[];
  onAddPlayer: (name: string, skill8: SkillLevel, skill9: SkillLevel) => void;
  onUpdatePlayer: (id: string, updates: Partial<Player>) => void;
  onDeletePlayer: (id: string) => void;
}

// ── LED strip for skill level 1-7 ────────────────────────────────────────────
const SkillLEDs: React.FC<{ level: number; color?: 'cyan' | 'gold' | 'magenta' }> = ({
  level,
  color = 'cyan',
}) => {
  const onClass =
    color === 'gold'
      ? 'led led-on-gold'
      : color === 'magenta'
      ? 'led led-on-magenta'
      : 'led led-on-cyan';
  return (
    <span className="flex items-center gap-[3px]">
      {Array.from({ length: 7 }, (_, i) => (
        <span key={i} className={i < level ? onClass : 'led led-off'} />
      ))}
    </span>
  );
};

// ── Stepper control used in edit modal ───────────────────────────────────────
const StatControl: React.FC<{
  label: string;
  value: number;
  onDec: () => void;
  onInc: () => void;
}> = ({ label, value, onDec, onInc }) => (
  <div className="space-y-1">
    <p className="section-label">{label}</p>
    <div
      className="flex items-center gap-2 rounded-xl p-1"
      style={{ background: 'rgba(2,4,20,0.85)', border: '1px solid rgba(57,167,201,0.2)' }}
    >
      <button
        type="button"
        onClick={onDec}
        className="btn-neon p-1.5 rounded-lg text-xs"
        style={{ minWidth: 28 }}
      >
        <Minus className="w-3 h-3" />
      </button>
      <span className="flex-1 text-center font-mono font-black" style={{ color: '#39A7C9' }}>
        {value}
      </span>
      <button
        type="button"
        onClick={onInc}
        className="btn-neon p-1.5 rounded-lg text-xs"
        style={{ minWidth: 28 }}
      >
        <Plus className="w-3 h-3" />
      </button>
    </div>
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────
export const Roster: React.FC<RosterProps> = ({
  players,
  onAddPlayer,
  onUpdatePlayer,
  onDeletePlayer,
}) => {
  // Tab / form state
  const [showArchived, setShowArchived] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSkill8, setNewSkill8] = useState<SkillLevel>(3);
  const [newSkill9, setNewSkill9] = useState<SkillLevel>(3);

  // Archive modal
  const [confirmArchivePlayer, setConfirmArchivePlayer] = useState<Player | null>(null);

  // Edit stats modal
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);

  // Screenshot import state
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importParsed, setImportParsed] = useState<ParsedPlayer[]>([]);
  const [importSelected, setImportSelected] = useState<Set<number>>(new Set());
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredPlayers = players.filter((p) => p.isActive !== showArchived);

  // ── Archive handlers ──────────────────────────────────────────────────────
  const handleArchiveClick = (player: Player) => {
    if (player.isActive) {
      setConfirmArchivePlayer(player);
    } else {
      onUpdatePlayer(player.id, { isActive: true });
    }
  };

  const executeArchive = () => {
    if (confirmArchivePlayer) {
      onUpdatePlayer(confirmArchivePlayer.id, { isActive: false });
      setConfirmArchivePlayer(null);
    }
  };

  // ── Edit stats modal handlers ─────────────────────────────────────────────
  const adjustStat = (field: keyof Player, delta: number) => {
    if (!editingPlayer) return;
    const currentVal = editingPlayer[field] as number;
    const newVal = Math.max(0, currentVal + delta);
    let updates: Partial<Player> = { [field]: newVal };
    if (field === 'wins8Ball' && newVal > editingPlayer.games8Ball)
      updates.games8Ball = newVal;
    else if (field === 'wins9Ball' && newVal > editingPlayer.games9Ball)
      updates.games9Ball = newVal;
    setEditingPlayer({ ...editingPlayer, ...updates });
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlayer) return;
    onUpdatePlayer(editingPlayer.id, {
      name: editingPlayer.name,
      skillLevel8Ball: editingPlayer.skillLevel8Ball,
      skillLevel9Ball: editingPlayer.skillLevel9Ball,
      games8Ball: editingPlayer.games8Ball,
      wins8Ball: editingPlayer.wins8Ball,
      games9Ball: editingPlayer.games9Ball,
      wins9Ball: editingPlayer.wins9Ball,
    });
    setEditingPlayer(null);
  };

  // ── Add player inline form ────────────────────────────────────────────────
  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    onAddPlayer(newName.trim(), newSkill8, newSkill9);
    setIsAdding(false);
    setNewName('');
    setNewSkill8(3);
    setNewSkill9(3);
  };

  // ── Screenshot import handlers ────────────────────────────────────────────
  const resetImport = () => {
    setImportFile(null);
    setImportParsed([]);
    setImportSelected(new Set());
    setImportError(null);
    setImportLoading(false);
  };

  const closeImport = () => {
    setIsImportOpen(false);
    resetImport();
  };

  const processFile = async (file: File) => {
    setImportFile(file);
    setImportParsed([]);
    setImportSelected(new Set());
    setImportError(null);
    setImportLoading(true);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const parsed = await parseRosterScreenshot(base64, file.type);
      setImportParsed(parsed);
      setImportSelected(new Set(parsed.map((_, i) => i)));
    } catch (e: any) {
      setImportError(e?.message || 'Failed to process image. Please try again.');
    } finally {
      setImportLoading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) processFile(file);
  };

  const toggleImportRow = (idx: number) => {
    setImportSelected((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };

  const handleImportSelected = () => {
    importParsed.forEach((p, i) => {
      if (!importSelected.has(i)) return;
      const sl8 = Math.min(Math.max(Math.round(p.skillLevel8Ball), 1), 7) as SkillLevel;
      const sl9 = Math.min(Math.max(Math.round(p.skillLevel9Ball), 1), 7) as SkillLevel;
      onAddPlayer(p.name, sl8, sl9);
    });
    closeImport();
  };

  // ── Shared modal layout styles ────────────────────────────────────────────
  const modalBack = 'fixed inset-0 z-[100] flex items-center justify-center p-4';
  const overlay = 'absolute inset-0 bg-black/85 backdrop-blur-sm';
  const modalBoxStyle: React.CSSProperties = {
    position: 'relative',
    zIndex: 10,
    background: 'rgba(2,4,20,0.97)',
    border: '1px solid rgba(57,167,201,0.33)',
    borderRadius: '2rem',
    padding: '2rem',
    width: '100%',
    boxShadow: '0 0 40px rgba(57,167,201,0.13)',
  };

  return (
    <div className="space-y-8 pb-20 relative" style={{ color: '#e0f7ff' }}>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2
            className="font-orbitron font-black text-3xl text-glow-gold"
            style={{ color: '#F2C14E', letterSpacing: '0.08em' }}
          >
            TEAM ROSTER
          </h2>
          <div className="flex gap-5 mt-3">
            <button
              onClick={() => setShowArchived(false)}
              className="section-label pb-1 transition-all"
              style={{
                color: !showArchived ? '#39A7C9' : 'rgba(180,220,255,0.45)',
                borderBottom: !showArchived ? '2px solid #39A7C9' : '2px solid transparent',
              }}
            >
              ACTIVE
            </button>
            <button
              onClick={() => setShowArchived(true)}
              className="section-label pb-1 transition-all"
              style={{
                color: showArchived ? '#D14A3C' : 'rgba(180,220,255,0.45)',
                borderBottom: showArchived ? '2px solid #D14A3C' : '2px solid transparent',
              }}
            >
              ARCHIVED
            </button>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          {/* Gold screenshot import button */}
          <button
            onClick={() => setIsImportOpen(true)}
            className="btn-neon flex items-center gap-2 px-4 py-2 text-xs font-orbitron"
            style={{ borderColor: '#F2C14E', color: '#F2C14E', boxShadow: '0 0 8px rgba(242,193,78,0.25)' }}
          >
            <ImageIcon className="w-4 h-4" />
            IMPORT VIA SCREENSHOT
          </button>
          {!isAdding && (
            <button
              onClick={() => setIsAdding(true)}
              className="btn-neon flex items-center gap-2 px-4 py-2 text-xs font-orbitron"
            >
              <UserPlus className="w-4 h-4" />
              ADD PLAYER
            </button>
          )}
        </div>
      </header>

      {/* ── Archive confirm modal ────────────────────────────────────────────── */}
      {confirmArchivePlayer && (
        <div className={modalBack}>
          <div className={overlay} onClick={() => setConfirmArchivePlayer(null)} />
          <div style={{ ...modalBoxStyle, maxWidth: 420, borderColor: 'rgba(209,74,60,0.33)' }}>
            <div className="flex justify-center mb-5">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(209,74,60,0.1)', border: '1px solid rgba(209,74,60,0.33)' }}
              >
                <AlertTriangle className="w-8 h-8" style={{ color: '#D14A3C' }} />
              </div>
            </div>
            <h3
              className="font-orbitron font-black text-xl text-center mb-2"
              style={{ color: '#D14A3C', textShadow: '0 0 12px rgba(209,74,60,0.6)' }}
            >
              ARCHIVE PLAYER?
            </h3>
            <p className="text-center text-sm mb-6" style={{ color: 'rgba(180,220,255,0.75)' }}>
              Moving{' '}
              <span className="font-bold" style={{ color: '#e0f7ff' }}>
                {confirmArchivePlayer.name}
              </span>{' '}
              to the inactive list.
            </p>
            <div className="flex flex-col gap-3">
              <button
                onClick={executeArchive}
                className="btn-neon-magenta w-full py-3 font-orbitron text-xs"
              >
                CONFIRM ARCHIVAL
              </button>
              <button
                onClick={() => setConfirmArchivePlayer(null)}
                className="btn-neon w-full py-3 font-orbitron text-xs"
                style={{ borderColor: 'rgba(180,220,255,0.3)', color: 'rgba(180,220,255,0.7)' }}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit stats modal ─────────────────────────────────────────────────── */}
      {editingPlayer && (
        <div className={`${modalBack} overflow-y-auto`}>
          <div className={overlay} onClick={() => setEditingPlayer(null)} />
          <div style={{ ...modalBoxStyle, maxWidth: 520 }}>
            <div className="flex justify-between items-center mb-6">
              <h3
                className="font-orbitron font-black text-lg flex items-center gap-2 text-glow-cyan"
                style={{ color: '#39A7C9' }}
              >
                <Edit2 className="w-5 h-5" /> EDIT PLAYER
              </h3>
              <button
                onClick={() => setEditingPlayer(null)}
                className="p-2 rounded-full transition-colors"
                style={{ color: '#8899aa' }}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-5">
              {/* Name */}
              <div>
                <p className="section-label mb-1">PLAYER NAME</p>
                <input
                  className="input-neon w-full"
                  value={editingPlayer.name}
                  onChange={(e) => setEditingPlayer({ ...editingPlayer, name: e.target.value })}
                  required
                />
              </div>

              {/* Skill levels */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="section-label mb-1">8-BALL SL</p>
                  <select
                    className="input-neon w-full"
                    value={editingPlayer.skillLevel8Ball}
                    onChange={(e) =>
                      setEditingPlayer({
                        ...editingPlayer,
                        skillLevel8Ball: Number(e.target.value) as SkillLevel,
                      })
                    }
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((l) => (
                      <option key={l} value={l}>
                        Level {l}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <p className="section-label mb-1">9-BALL SL</p>
                  <select
                    className="input-neon w-full"
                    value={editingPlayer.skillLevel9Ball}
                    onChange={(e) =>
                      setEditingPlayer({
                        ...editingPlayer,
                        skillLevel9Ball: Number(e.target.value) as SkillLevel,
                      })
                    }
                  >
                    {[1, 2, 3, 4, 5, 6, 7].map((l) => (
                      <option key={l} value={l}>
                        Level {l}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Stats steppers */}
              <div
                className="grid grid-cols-2 gap-6 pt-4"
                style={{ borderTop: '1px solid rgba(57,167,201,0.13)' }}
              >
                <div className="space-y-3">
                  <p className="section-label" style={{ color: '#39A7C9' }}>
                    8-BALL HISTORY
                  </p>
                  <StatControl
                    label="GAMES"
                    value={editingPlayer.games8Ball}
                    onDec={() => adjustStat('games8Ball', -1)}
                    onInc={() => adjustStat('games8Ball', 1)}
                  />
                  <StatControl
                    label="WINS"
                    value={editingPlayer.wins8Ball}
                    onDec={() => adjustStat('wins8Ball', -1)}
                    onInc={() => adjustStat('wins8Ball', 1)}
                  />
                </div>
                <div className="space-y-3">
                  <p className="section-label" style={{ color: '#F2C14E' }}>
                    9-BALL HISTORY
                  </p>
                  <StatControl
                    label="GAMES"
                    value={editingPlayer.games9Ball}
                    onDec={() => adjustStat('games9Ball', -1)}
                    onInc={() => adjustStat('games9Ball', 1)}
                  />
                  <StatControl
                    label="WINS"
                    value={editingPlayer.wins9Ball}
                    onDec={() => adjustStat('wins9Ball', -1)}
                    onInc={() => adjustStat('wins9Ball', 1)}
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn-solid-cyan w-full py-3 font-orbitron text-xs flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" /> SAVE CHANGES
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Screenshot Import Modal ──────────────────────────────────────────── */}
      {isImportOpen && (
        <div className={`${modalBack} overflow-y-auto`}>
          <div className={overlay} onClick={closeImport} />
          <div style={{ ...modalBoxStyle, maxWidth: 580, borderColor: 'rgba(242,193,78,0.33)' }}>
            <div className="flex justify-between items-center mb-5">
              <h3
                className="font-orbitron font-black text-lg text-glow-gold"
                style={{ color: '#F2C14E' }}
              >
                IMPORT VIA SCREENSHOT
              </h3>
              <button onClick={closeImport} style={{ color: '#8899aa' }}>
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drop zone — shown only when not loading and no results yet */}
            {!importLoading && importParsed.length === 0 && (
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className="card flex flex-col items-center justify-center gap-4 cursor-pointer transition-all py-12"
                style={{
                  borderStyle: 'dashed',
                  borderColor: isDragging ? '#39A7C9' : 'rgba(57,167,201,0.33)',
                  boxShadow: isDragging ? '0 0 20px rgba(57,167,201,0.27)' : undefined,
                  minHeight: 180,
                }}
              >
                <Upload className="w-10 h-10" style={{ color: '#39A7C9' }} />
                <div className="text-center">
                  <p className="font-orbitron text-sm" style={{ color: '#39A7C9' }}>
                    DROP IMAGE HERE
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'rgba(180,220,255,0.65)' }}>
                    or click to browse · PNG, JPG, WebP
                  </p>
                </div>
                {importFile && (
                  <p className="text-xs font-mono" style={{ color: '#F2C14E' }}>
                    {importFile.name}
                  </p>
                )}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileInputChange}
            />

            {/* Spinner */}
            {importLoading && (
              <div className="flex flex-col items-center justify-center gap-4 py-16">
                <Loader2
                  className="w-10 h-10 animate-spin"
                  style={{ color: '#39A7C9' }}
                />
                <p className="font-orbitron text-sm text-glow-cyan" style={{ color: '#39A7C9' }}>
                  SCANNING ROSTER...
                </p>
              </div>
            )}

            {/* Error state */}
            {importError && (
              <div
                className="flex items-center gap-3 rounded-xl p-4 mt-3"
                style={{ background: 'rgba(209,74,60,0.1)', border: '1px solid rgba(209,74,60,0.33)' }}
              >
                <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: '#D14A3C' }} />
                <p className="text-sm" style={{ color: '#D14A3C' }}>
                  {importError}
                </p>
              </div>
            )}

            {/* Parsed preview table */}
            {importParsed.length > 0 && !importLoading && (
              <div className="space-y-4 mt-2">
                <p className="section-label" style={{ color: '#39A7C9' }}>
                  {importParsed.length} PLAYER{importParsed.length !== 1 ? 'S' : ''} DETECTED
                </p>
                <div
                  className="rounded-xl overflow-hidden"
                  style={{ border: '1px solid rgba(57,167,201,0.2)' }}
                >
                  <table className="w-full text-xs">
                    <thead>
                      <tr style={{ background: 'rgba(57,167,201,0.07)' }}>
                        <th className="py-2 px-3 text-left section-label">SEL</th>
                        <th className="py-2 px-3 text-left section-label">NAME</th>
                        <th className="py-2 px-3 text-center section-label">8-BALL SL</th>
                        <th className="py-2 px-3 text-center section-label">9-BALL SL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importParsed.map((p, i) => (
                        <tr
                          key={i}
                          onClick={() => toggleImportRow(i)}
                          className="cursor-pointer transition-colors"
                          style={{
                            background: importSelected.has(i) ? 'rgba(57,167,201,0.05)' : 'transparent',
                            borderTop: '1px solid rgba(57,167,201,0.1)',
                          }}
                        >
                          <td className="py-2 px-3">
                            <input
                              type="checkbox"
                              checked={importSelected.has(i)}
                              onChange={() => toggleImportRow(i)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-4 h-4 cursor-pointer"
                              style={{ accentColor: '#39A7C9' }}
                            />
                          </td>
                          <td className="py-2 px-3 font-bold" style={{ color: '#e0f7ff' }}>
                            {p.name}
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-mono" style={{ color: '#39A7C9' }}>
                                SL {p.skillLevel8Ball}
                              </span>
                              <SkillLEDs level={p.skillLevel8Ball} color="cyan" />
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex flex-col items-center gap-1">
                              <span className="font-mono" style={{ color: '#F2C14E' }}>
                                SL {p.skillLevel9Ball}
                              </span>
                              <SkillLEDs level={p.skillLevel9Ball} color="gold" />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleImportSelected}
                    disabled={importSelected.size === 0}
                    className="btn-solid-cyan flex-1 py-3 font-orbitron text-xs disabled:opacity-40"
                  >
                    IMPORT SELECTED ({importSelected.size})
                  </button>
                  <button
                    onClick={resetImport}
                    className="btn-neon px-5 py-3 font-orbitron text-xs"
                    style={{ borderColor: 'rgba(180,220,255,0.3)', color: 'rgba(180,220,255,0.7)' }}
                  >
                    RETRY
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Add Player inline form ───────────────────────────────────────────── */}
      {isAdding && (
        <div className="card p-6">
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <p className="font-orbitron text-sm" style={{ color: '#39A7C9' }}>
              NEW PLAYER
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                className="input-neon"
                placeholder="Player Name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
              <select
                className="input-neon"
                value={newSkill8}
                onChange={(e) => setNewSkill8(Number(e.target.value) as SkillLevel)}
              >
                {[1, 2, 3, 4, 5, 6, 7].map((l) => (
                  <option key={l} value={l}>
                    8-Ball SL {l}
                  </option>
                ))}
              </select>
              <select
                className="input-neon"
                value={newSkill9}
                onChange={(e) => setNewSkill9(Number(e.target.value) as SkillLevel)}
              >
                {[1, 2, 3, 4, 5, 6, 7].map((l) => (
                  <option key={l} value={l}>
                    9-Ball SL {l}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="btn-neon px-5 py-2 text-xs font-orbitron"
                style={{ borderColor: 'rgba(180,220,255,0.3)', color: 'rgba(180,220,255,0.7)' }}
              >
                CANCEL
              </button>
              <button type="submit" className="btn-solid-cyan px-6 py-2 text-xs font-orbitron">
                SAVE PLAYER
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Player grid ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlayers.length === 0 ? (
          <div
            className="col-span-full py-20 flex flex-col items-center justify-center gap-4 rounded-3xl"
            style={{
              border: '2px dashed rgba(57,167,201,0.13)',
              color: 'rgba(180,220,255,0.45)',
            }}
          >
            <UserCheck className="w-12 h-12 opacity-40" />
            <p className="section-label">NO PERSONNEL FOUND</p>
          </div>
        ) : (
          filteredPlayers.map((player) => {
            const winRate8 = player.games8Ball
              ? Math.round((player.wins8Ball / player.games8Ball) * 100)
              : 0;
            const winRate9 = player.games9Ball
              ? Math.round((player.wins9Ball / player.games9Ball) * 100)
              : 0;

            return (
              <div key={player.id} className="card p-5 flex flex-col gap-4">
                {/* Card header: name + action icons */}
                <div className="flex justify-between items-start">
                  <h3
                    className="font-bold text-lg leading-tight"
                    style={{ color: '#e0f7ff' }}
                  >
                    {player.name}
                  </h3>
                  <div className="flex gap-1">
                    {/* Edit */}
                    <button
                      onClick={() => setEditingPlayer(player)}
                      className="p-2 rounded-lg transition-colors"
                      title="Edit"
                      style={{ color: 'rgba(180,220,255,0.45)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#39A7C9')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(180,220,255,0.45)')}
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {/* Archive / Restore */}
                    <button
                      onClick={() => handleArchiveClick(player)}
                      className="p-2 rounded-lg transition-colors"
                      title={player.isActive ? 'Archive' : 'Restore'}
                      style={{ color: player.isActive ? 'rgba(180,220,255,0.45)' : '#39A7C9' }}
                    >
                      {player.isActive ? (
                        <Archive className="w-4 h-4" />
                      ) : (
                        <UserCheck className="w-4 h-4" />
                      )}
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => onDeletePlayer(player.id)}
                      className="p-2 rounded-lg transition-colors"
                      title="Delete"
                      style={{ color: 'rgba(180,220,255,0.45)' }}
                      onMouseEnter={(e) => (e.currentTarget.style.color = '#D14A3C')}
                      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(180,220,255,0.45)')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Skill LED rows */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="section-label">8-BALL SL {player.skillLevel8Ball}</span>
                    <span className="font-mono text-xs" style={{ color: '#39A7C9' }}>
                      {winRate8}% WIN
                    </span>
                  </div>
                  <SkillLEDs level={player.skillLevel8Ball} color="cyan" />

                  <div className="flex items-center justify-between mt-1">
                    <span className="section-label">9-BALL SL {player.skillLevel9Ball}</span>
                    <span className="font-mono text-xs" style={{ color: '#F2C14E' }}>
                      {winRate9}% WIN
                    </span>
                  </div>
                  <SkillLEDs level={player.skillLevel9Ball} color="gold" />
                </div>

                {/* Stats footer */}
                <div
                  className="flex justify-between pt-3"
                  style={{ borderTop: '1px solid rgba(57,167,201,0.13)' }}
                >
                  <div>
                    <p className="section-label">SEASON WINS</p>
                    <p
                      className="stat-num"
                      style={{ color: '#39C46B', fontSize: '1.5rem' }}
                    >
                      {player.wins8Ball + player.wins9Ball}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="section-label">TOTAL GAMES</p>
                    <p
                      className="stat-num"
                      style={{ color: 'rgba(180,220,255,0.45)', fontSize: '1.5rem' }}
                    >
                      {player.games8Ball + player.games9Ball}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
