import { GoogleGenAI, Type } from "@google/genai";
import { Player, SkillLevel } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// ── Lineup suggestion (pure JS — no API key needed) ───────────────────────────
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

// ── Screenshot → Roster ───────────────────────────────────────────────────────
export interface ParsedPlayer {
  name: string;
  skillLevel8Ball: number;
  skillLevel9Ball: number;
}

export const parseRosterScreenshot = async (base64Image: string, mimeType: string): Promise<ParsedPlayer[]> => {
  if (!process.env.API_KEY) {
    throw new Error('Screenshot import requires a Gemini API key. Add GEMINI_API_KEY to your Cloudflare Pages environment variables, then redeploy.');
  }

  const ai = getAI();

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          {
            inlineData: { mimeType, data: base64Image },
          },
          {
            text: `Extract all pool players from this APA roster image or table.
This may be a screenshot from poolplayers.com showing a "Team Roster" table.

For each player row extract:
- name: the player's full name (ignore member ID numbers like #64001865)
- skillLevel8Ball: their skill level as a number 1-7. The column may be labeled "Skill Level". If not shown, use 3.
- skillLevel9Ball: same value as skillLevel8Ball unless a separate 9-ball skill level is shown.

Ignore header rows and any non-player rows.
Return a JSON array only, no other text.`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name:             { type: Type.STRING },
            skillLevel8Ball:  { type: Type.NUMBER },
            skillLevel9Ball:  { type: Type.NUMBER },
          },
          required: ["name", "skillLevel8Ball", "skillLevel9Ball"],
        },
      },
    },
  });

  const parsed = JSON.parse(response.text || '[]');
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error('No players found in the image. Make sure the roster table is clearly visible.');
  }
  return parsed;
};

// ── Screenshot → Schedule ─────────────────────────────────────────────────────
export interface ParsedScheduleEntry {
  date: string;       // ISO 8601
  opponentTeamName: string;
  location?: string;
  isHome: boolean;
}

export const parseScheduleScreenshot = async (base64Image: string, mimeType: string): Promise<ParsedScheduleEntry[]> => {
  const ai = getAI();
  const currentYear = new Date().getFullYear();

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            { inlineData: { mimeType, data: base64Image } },
            {
              text: `Extract the pool league schedule from this image. Current year: ${currentYear}.
For each match: date (ISO 8601, e.g. "${currentYear}-09-15T19:00:00"), opponent team name, location if visible, and whether it is a home game.
If home/away is unclear, default isHome to true.
Return only the JSON array.`,
            },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              date:             { type: Type.STRING },
              opponentTeamName: { type: Type.STRING },
              location:         { type: Type.STRING },
              isHome:           { type: Type.BOOLEAN },
            },
            required: ["date", "opponentTeamName", "isHome"],
          },
        },
      },
    });
    return JSON.parse(response.text || '[]');
  } catch (e) {
    console.error("Gemini schedule parse error:", e);
    return [];
  }
};
