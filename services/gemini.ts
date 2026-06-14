
import { GoogleGenAI, Type } from "@google/genai";
import { Player, SkillLevel } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// ── Lineup suggestion ─────────────────────────────────────────────────────────
export const suggestLineup = async (
  players: Player[],
  opponentSkills: SkillLevel[],
  currentAssignments: (string | null)[]
) => {
  const ai = getAI();

  const prompt = `
You are a professional APA pool team captain optimizing a 10-game lineup.
Matches 1-5 are 8-Ball. Matches 6-10 are 9-Ball.

TEAM ROSTER:
${players.map(p => `- ID:${p.id} Name:${p.name} 8B-SL:${p.skillLevel8Ball} 9B-SL:${p.skillLevel9Ball} 8B-Games:${p.games8Ball} 9B-Games:${p.games9Ball} Wins:${p.wins8Ball + p.wins9Ball}`).join('\n')}

CURRENT ASSIGNMENTS (locked — do not change):
${currentAssignments.map((id, i) => `Match ${i + 1}: ${id ? `LOCKED: ${id}` : 'OPEN'}`).join('\n')}

OPPONENT SKILL LEVELS:
${opponentSkills.map((s, i) => `Match ${i + 1}: SL ${s}`).join(', ')}

CONSTRAINTS:
1. Rule of 23: 8-Ball slot sum ≤ 23, 9-Ball slot sum ≤ 23.
2. Prioritize players with < 4 games in the format (qualification need).
3. Then maximize win rate.
4. A player may appear at most once per format (1-5 and 6-10 are separate).
5. Return the same ID for locked slots.
  `.trim();

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            assignments: { type: Type.ARRAY, items: { type: Type.STRING } },
            reasoning:   { type: Type.STRING },
          },
          required: ["assignments"],
        },
      },
    });
    return JSON.parse(response.text || 'null');
  } catch (e) {
    console.error("Gemini lineup error:", e);
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
  const ai = getAI();

  try {
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
              text: `Extract all pool players from this APA roster image.
For each player find: full name, 8-Ball skill level (1-7), 9-Ball skill level (1-9, mapped to 1-7 for storage).
If only one skill level is shown, use it for both.
If skill level is not visible, default to 3.
Return only the JSON array, nothing else.`,
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
    return JSON.parse(response.text || '[]');
  } catch (e) {
    console.error("Gemini roster parse error:", e);
    return [];
  }
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
