
import React, { useState } from 'react';
import { Player, SkillLevel } from '../types';
import { Trash2, ShieldCheck, UserPlus, Archive, UserCheck, AlertTriangle, X } from 'lucide-react';

interface RosterProps {
  players: Player[];
  onAddPlayer: (name: string, skill8: SkillLevel, skill9: SkillLevel) => void;
  onUpdatePlayer: (id: string, name: string, skill8: SkillLevel, skill9: SkillLevel, isActive?: boolean) => void;
  onDeletePlayer: (id: string) => void;
}

export const Roster: React.FC<RosterProps> = ({ players, onAddPlayer, onUpdatePlayer, onDeletePlayer }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [confirmArchivePlayer, setConfirmArchivePlayer] = useState<Player | null>(null);
  
  const [newName, setNewName] = useState('');
  const [newSkill8, setNewSkill8] = useState<SkillLevel>(3);
  const [newSkill9, setNewSkill9] = useState<SkillLevel>(3);

  const filteredPlayers = players.filter(p => p.isActive !== showArchived);

  const handleArchiveClick = (player: Player) => {
    if (player.isActive) {
      setConfirmArchivePlayer(player);
    } else {
      // Direct restore if already archived
      onUpdatePlayer(player.id, player.name, player.skillLevel8Ball, player.skillLevel9Ball, true);
    }
  };

  const executeArchive = () => {
    if (confirmArchivePlayer) {
      onUpdatePlayer(
        confirmArchivePlayer.id, 
        confirmArchivePlayer.name, 
        confirmArchivePlayer.skillLevel8Ball, 
        confirmArchivePlayer.skillLevel9Ball, 
        false
      );
      setConfirmArchivePlayer(null);
    }
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20 relative">
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h2 className="text-3xl font-bold">Team Roster</h2>
          <div className="flex gap-4 mt-2">
            <button 
              onClick={() => setShowArchived(false)}
              className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${!showArchived ? 'border-indigo-500 text-white' : 'border-transparent text-slate-500'}`}
            >
              Active Roster
            </button>
            <button 
              onClick={() => setShowArchived(true)}
              className={`text-xs font-black uppercase tracking-widest pb-1 border-b-2 transition-all ${showArchived ? 'border-rose-500 text-white' : 'border-transparent text-slate-500'}`}
            >
              Inactive/Archived
            </button>
          </div>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg w-full sm:w-auto justify-center"
          >
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
            <div className="flex justify-center mb-6">
              <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center border border-amber-500/20">
                <AlertTriangle className="w-10 h-10 text-amber-500" />
              </div>
            </div>
            <div className="text-center space-y-2 mb-8">
              <h3 className="text-2xl font-black text-white">Archive Player?</h3>
              <p className="text-slate-400 text-sm">
                Moving <span className="text-white font-bold">{confirmArchivePlayer.name}</span> to the Inactive list will exclude them from current lineup suggestions.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <button 
                onClick={executeArchive}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all active:scale-95"
              >
                Confirm Archival
              </button>
              <button 
                onClick={() => setConfirmArchivePlayer(null)}
                className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all"
              >
                Cancel
              </button>
            </div>
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
              <button type="button" onClick={() => setIsAdding(false)} className="text-slate-500 px-4 hover:text-white">Cancel</button>
              <button type="submit" className="bg-indigo-600 px-6 py-2 rounded-xl font-bold shadow-lg shadow-indigo-500/20">Add Player</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPlayers.length === 0 ? (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-600 border-2 border-dashed border-slate-800 rounded-[3rem]">
            <ShieldCheck className="w-12 h-12 mb-4 opacity-20" />
            <p className="font-bold uppercase tracking-widest text-xs">No personnel found in this sector</p>
          </div>
        ) : (
          filteredPlayers.map(player => (
            <div key={player.id} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 group hover:border-slate-700 transition-all shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-slate-800 rounded-2xl group-hover:bg-indigo-500/10 transition-colors">
                  <ShieldCheck className={`w-8 h-8 ${player.isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleArchiveClick(player)}
                    className={`p-2 rounded-xl transition-all ${player.isActive ? 'text-slate-500 hover:text-amber-500 bg-slate-800' : 'text-emerald-500 hover:text-emerald-400 bg-emerald-500/10 border border-emerald-500/20'}`}
                    title={player.isActive ? "Move to Inactive" : "Restore to Active"}
                  >
                    {player.isActive ? <Archive className="w-5 h-5" /> : <UserCheck className="w-5 h-5" />}
                  </button>
                  <button onClick={() => onDeletePlayer(player.id)} className="p-2 text-slate-500 hover:text-rose-500 bg-slate-800 rounded-xl transition-all" title="Permanently Delete">
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
