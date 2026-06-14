import { Player, SkillLevel } from "../types";

export const suggestLineup = async (
  players: Player[],
  opponentSkills: SkillLevel[],
  currentAssignments: (string | null)[]
): Promise<{ assignments: string[] } | null> => {
  try {
    const assignments = [...currentAssignments];

    const assigned8Ball = new Set(assignments.slice(0, 5).filter(Boolean) as string[]);
    const assigned9Ball = new Set(assignments.slice(5, 10).filter(Boolean) as string[]);

    const currentSkill8 = assignments.slice(0, 5).reduce((sum, id) => {
      if (!id) return sum;
      const p = players.find(pl => pl.id === id);
      return sum + (p?.skillLevel8Ball || 0);
    }, 0);

    const currentSkill9 = assignments.slice(5, 10).reduce((sum, id) => {
      if (!id) return sum;
      const p = players.find(pl => pl.id === id);
      return sum + (p?.skillLevel9Ball || 0);
    }, 0);

    const sortPlayers = (format: '8ball' | '9ball') => {
      return [...players].sort((a, b) => {
        const aGames = format === '8ball' ? a.games8Ball : a.games9Ball;
        const bGames = format === '8ball' ? b.games8Ball : b.games9Ball;
        const aWins = format === '8ball' ? a.wins8Ball : a.wins9Ball;
        const bWins = format === '8ball' ? b.wins8Ball : b.wins9Ball;
        const aNeedsQual = aGames < 4;
        const bNeedsQual = bGames < 4;
        if (aNeedsQual && !bNeedsQual) return -1;
        if (!aNeedsQual && bNeedsQual) return 1;
        return bWins - aWins;
      });
    };

    const sorted8 = sortPlayers('8ball');
    let remaining8 = 23 - currentSkill8;
    for (let i = 0; i < 5; i++) {
      if (assignments[i]) continue;
      for (const player of sorted8) {
        if (assigned8Ball.has(player.id)) continue;
        if (player.skillLevel8Ball > remaining8) continue;
        assignments[i] = player.id;
        assigned8Ball.add(player.id);
        remaining8 -= player.skillLevel8Ball;
        break;
      }
    }

    const sorted9 = sortPlayers('9ball');
    let remaining9 = 23 - currentSkill9;
    for (let i = 5; i < 10; i++) {
      if (assignments[i]) continue;
      for (const player of sorted9) {
        if (assigned9Ball.has(player.id)) continue;
        if (player.skillLevel9Ball > remaining9) continue;
        assignments[i] = player.id;
        assigned9Ball.add(player.id);
        remaining9 -= player.skillLevel9Ball;
        break;
      }
    }

    return { assignments: assignments.map(a => a || '') };
  } catch (error) {
    console.error("Lineup suggestion error:", error);
    return null;
  }
};
