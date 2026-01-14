
import React, { useState } from 'react';
import { Player, SkillLevel } from '../types';
import { Trash2, ShieldCheck, UserPlus, Archive, UserCheck, AlertTriangle, Edit2, Plus, Minus, X, Save } from 'lucide-react';

interface RosterProps {
  players: Player[];
  onAddPlayer: (name: string, skill8: SkillLevel, skill9: SkillLevel) => void;
  onUpdatePlayer: (id: string, updates: Partial<Player>) => void;
  onDeletePlayer: (id: string) => void;
}

export const Roster: React.FC<RosterProps> = ({ players, onAddPlayer, onUpdatePlayer, onDeletePlayer }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [confirmArchivePlayer, setConfirmArchivePlayer] = useState<Player | null>(null);
  const [editingStatsPlayer, setEditingStatsPlayer] = useState<Player | null>(null);
  
  const [newName, setNewName] = useState('');
  const [newSkill8, setNewSkill8] = useState<SkillLevel>(3);
  const [newSkill9, setNewSkill9] = useState<SkillLevel>(3);

  const filteredPlayers = players.filter(p => p.isActive !== showArchived);

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

  const handleUpdateStats = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStatsPlayer) {
      onUpdatePlayer(editingStatsPlayer.id, {
        games8Ball: editingStatsPlayer.games8Ball,
        wins8Ball: editingStatsPlayer.wins8Ball,
        games9Ball: editingStatsPlayer.games9Ball,
        wins9Ball: editingStatsPlayer.wins9Ball,
        skillLevel8Ball: editingStatsPlayer.skillLevel8Ball,
        skillLevel9Ball: editingStatsPlayer.skillLevel9Ball,
        name: editingStatsPlayer.name
      });
      setEditingStatsPlayer(null);
    }
  };

  const adjustStat = (field: keyof Player, delta: number) => {
    if (!editingStatsPlayer) return;
    const currentVal = editingStatsPlayer[field] as number;
    const newVal = Math.max(0, currentVal + delta);
    
    // Ensure wins don't exceed games
    let updates: Partial<Player> = { [field]: newVal };
    if (field === 'wins8Ball' && newVal > editingStatsPlayer.games8Ball) {
       updates.games8Ball = newVal;
    } else if (field === 'wins9Ball' && newVal > editingStatsPlayer.games9Ball) {
       updates.games9Ball = newVal;
    }

    setEditingStatsPlayer({ ...editingStatsPlayer, ...updates });
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20 relative">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold">Team Roster</h2>
          <div className="flex gap-4 mt-2">
            <button onClick={() => setShowArchived(false)} className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${!showArchived ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500'}`}>Active Roster</button>
            <button onClick={() => setShowArchived(true)} className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${showArchived ? 'border-rose-500 text-white' : 'border-transparent text-slate-500'}`}>Inactive/Archived</button>
          </div>
        </div>
        {!isAdding && (
          <button onClick={() => setIsAdding(true)} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg w-full sm:w-auto justify-center">
            <UserPlus className="w-5 h-5" />
            <span>Add Player</span>
          </button>
        )}
      </header>

      {/* Confirmation Modal */}
      {confirmArchivePlayer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setConfirmArchivePlayer(null)} />
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 max-w-md w-full relative z-10 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-center mb-6"><div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20"><AlertTriangle className="w-10 h-10 text-amber-500" /></div></div>
            <div className="text-center space-y-2 mb-8"><h3 className="text-2xl font-black text-white">Archive Player?</h3><p className="text-slate-400 text-sm">Moving <span className="text-white font-bold">{confirmArchivePlayer.name}</span> to inactive list.</p></div>
            <div className="flex flex-col gap-3">
              <button onClick={executeArchive} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20">Confirm Archival</button>
              <button onClick={() => setConfirmArchivePlayer(null)} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-4 rounded-2xl font-black text-xs uppercase tracking-widest">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Edit Modal */}
      {editingStatsPlayer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setEditingStatsPlayer(null)} />
          <div className="bg-slate-900 border border-slate-800 rounded-[2.5rem] p-8 max-w-lg w-full relative z-10 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-2xl font-black text-white flex items-center gap-3"><Edit2 className="text-indigo-500 w-6 h-6" /> Tactical Sync</h3>
              <button onClick={() => setEditingStatsPlayer(null)} className="p-2 text-slate-500 hover:text-white bg-slate-800 rounded-full"><X className="w-5 h-5" /></button>
            </div>
            
            <form onSubmit={handleUpdateStats} className="space-y-6">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">General Profile</label>
                <input 
                  value={editingStatsPlayer.name} 
                  onChange={e => setEditingStatsPlayer({...editingStatsPlayer, name: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">8-Ball SL</label>
                    <select value={editingStatsPlayer.skillLevel8Ball} onChange={e => setEditingStatsPlayer({...editingStatsPlayer, skillLevel8Ball: Number(e.target.value) as SkillLevel})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white font-bold">
                      {[1,2,3,4,5,6,7].map(l => <option key={l} value={l}>Level {l}</option>)}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">9-Ball SL</label>
                    <select value={editingStatsPlayer.skillLevel9Ball} onChange={e => setEditingStatsPlayer({...editingStatsPlayer, skillLevel9Ball: Number(e.target.value) as SkillLevel})} className="w-full bg-slate-950 border border-slate-800 p-3 rounded-xl text-white font-bold">
                      {[1,2,3,4,5,6,7].map(l => <option key={l} value={l}>Level {l}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-800/50">
                {/* 8-Ball Stats */}
                <div className="space-y-6">
                  <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">8-Ball History</p>
                  <div className="space-y-4">
                    <StatControl label="Games" value={editingStatsPlayer.games8Ball} onDec={() => adjustStat('games8Ball', -1)} onInc={() => adjustStat('games8Ball', 1)} />
                    <StatControl label="Wins" value={editingStatsPlayer.wins8Ball} onDec={() => adjustStat('wins8Ball', -1)} onInc={() => adjustStat('wins8Ball', 1)} />
                  </div>
                </div>
                {/* 9-Ball Stats */}
                <div className="space-y-6">
                  <p className="text-[10px] font-black text-pink-400 uppercase tracking-widest">9-Ball History</p>
                  <div className="space-y-4">
                    <StatControl label="Games" value={editingStatsPlayer.games9Ball} onDec={() => adjustStat('games9Ball', -1)} onInc={() => adjustStat('games9Ball', 1)} />
                    <StatControl label="Wins" value={editingStatsPlayer.wins9Ball} onDec={() => adjustStat('wins9Ball', -1)} onInc={() => adjustStat('wins9Ball', 1)} />
                  </div>
                </div>
              </div>

              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all active:scale-95 flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> Save Adjustments
              </button>
            </form>
          </div>
        </div>
      )}

      {isAdding && (
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl animate-in zoom-in-95">
          <form onSubmit={(e) => { e.preventDefault(); onAddPlayer(newName, newSkill8, newSkill9); setIsAdding(false); setNewName(''); }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Player Name" className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-white outline-none focus:ring-2 focus:ring-indigo-500" required />
              <select value={newSkill8} onChange={e => setNewSkill8(Number(e.target.value) as SkillLevel)} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-white">
                {[1,2,3,4,5,6,7].map(l => <option key={l} value={l}>8-Ball SL {l}</option>)}
              </select>
              <select value={newSkill9} onChange={e => setNewSkill9(Number(e.target.value) as SkillLevel)} className="bg-slate-950 border border-slate-800 p-3 rounded-xl text-white">
                {[1,2,3,4,5,6,7].map(l => <option key={l} value={l}>9-Ball SL {l}</option>)}
              </select>
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setIsAdding(false)} className="text-slate-500 px-4 hover:text-white font-bold">Cancel</button>
              <button type="submit" className="bg-indigo-600 px-6 py-2 rounded-xl font-bold shadow-lg shadow-indigo-500/20">Add Player</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlayers.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-[3rem]">
            <ShieldCheck className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-bold uppercase tracking-widest text-xs">No personnel found</p>
          </div>
        ) : (
          filteredPlayers.map(player => (
            <div key={player.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 group hover:border-slate-700 transition-all shadow-lg relative overflow-hidden">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-slate-800 rounded-2xl group-hover:bg-indigo-500/10 transition-colors">
                  <ShieldCheck className={`w-8 h-8 ${player.isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingStatsPlayer(player)} className="p-2 text-slate-500 hover:text-indigo-400 bg-slate-800 rounded-xl transition-all" title="Edit Stats">
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button onClick={() => handleArchiveClick(player)} className={`p-2 rounded-xl transition-all ${player.isActive ? 'text-slate-500 hover:text-amber-500 bg-slate-800' : 'text-emerald-500 hover:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'}`} title={player.isActive ? "Move to Inactive" : "Restore to Active"}>
                    {player.isActive ? <Archive className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                  </button>
                  <button onClick={() => onDeletePlayer(player.id)} className="p-2 text-slate-500 hover:text-rose-500 bg-slate-800 rounded-xl transition-all" title="Delete">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <h3 className="text-xl font-bold text-white mb-4">{player.name}</h3>
              <div className="space-y-3 mb-6">
                 <div className="flex justify-between text-xs">
                   <span className="text-slate-500 font-bold uppercase tracking-tight">8-Ball SL {player.skillLevel8Ball}</span>
                   <span className="text-indigo-400 font-bold">{Math.round((player.wins8Ball / (player.games8Ball || 1)) * 100)}% Win Rate</span>
                 </div>
                 <div className="flex justify-between text-xs">
                   <span className="text-slate-500 font-bold uppercase tracking-tight">9-Ball SL {player.skillLevel9Ball}</span>
                   <span className="text-pink-400 font-bold">{Math.round((player.wins9Ball / (player.games9Ball || 1)) * 100)}% Win Rate</span>
                 </div>
              </div>
              <div className="pt-4 border-t border-slate-800 flex justify-between">
                <div>
                  <p className="text-[10px] text-slate-600 font-black tracking-widest uppercase">SEASON WINS</p>
                  <p className="font-black text-emerald-500 text-lg">{player.wins8Ball + player.wins9Ball}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-600 font-black tracking-widest uppercase">TOTAL GAMES</p>
                  <p className="font-black text-slate-400 text-lg">{player.games8Ball + player.games9Ball}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

const StatControl: React.FC<{ label: string, value: number, onDec: () => void, onInc: () => void }> = ({ label, value, onDec, onInc }) => (
  <div className="space-y-2">
    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">{label}</p>
    <div className="flex items-center gap-3 bg-slate-950 border border-slate-800 rounded-xl p-2">
      <button type="button" onClick={onDec} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"><Minus className="w-4 h-4" /></button>
      <span className="flex-1 text-center font-black text-white">{value}</span>
      <button type="button" onClick={onInc} className="p-2 hover:bg-slate-800 rounded-lg text-slate-500 transition-colors"><Plus className="w-4 h-4" /></button>
    </div>
  </div>
);
