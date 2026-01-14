
import { GoogleGenAI, Type } from "@google/genai";
import { Player, SkillLevel } from "../types";

export const suggestLineup = async (
  players: Player[],
  opponentSkills: SkillLevel[],
  currentAssignments: (string | null)[]
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Identify players already assigned to calculate remaining budget
  const assignedPlayersInfo = currentAssignments.map((id, index) => {
    if (!id) return null;
    const p = players.find(player => player.id === id);
    return p ? { name: p.name, skill: index < 5 ? p.skillLevel8Ball : p.skillLevel9Ball } : null;
  });

  const prompt = `
    As a professional pool team captain, complete a 10-game lineup. 
    Matches 1-5 are 8-Ball. Matches 6-10 are 9-Ball.

    TEAM ROSTER DATA:
    ${players.map(p => `- ID: ${p.id}, Name: ${p.name}, 8B-SL: ${p.skillLevel8Ball}, 9B-SL: ${p.skillLevel9Ball}, 8B-Games: ${p.games8Ball}, 9B-Games: ${p.games9Ball}, Total Wins: ${p.wins8Ball + p.wins9Ball}`).join('\n')}
    
    CURRENT PARTIAL LINEUP (DO NOT CHANGE THESE):
    ${currentAssignments.map((id, i) => `Match ${i + 1}: ${id ? `STAY WITH Player ID ${id}` : 'EMPTY - YOU MUST SUGGEST A PLAYER'}`).join('\n')}

    OPPONENT SKILLS:
    ${opponentSkills.map((s, i) => `Match ${i + 1}: Skill ${s}`).join(', ')}
    
    CRITICAL TACTICAL CONSTRAINTS:
    1. RULE OF 23: The total skill level of players in Matches 1-5 (8-Ball) MUST NOT exceed 23. Total skill for Matches 6-10 (9-Ball) MUST NOT exceed 23. You must factor in the pre-filled players.
    2. PRIORITY 1 (QUALIFICATION): Heavily prioritize players who have FEWER THAN 4 games in the format they are being assigned to (8-Ball for matches 1-5, 9-Ball for 6-10).
    3. PRIORITY 2 (WINNERS): If qualification needs are met, select the players with the HIGHEST win counts to maximize team success.
    4. NO DUPLICATES IN FORMAT: A player can only play ONCE in the 8-Ball set and ONCE in the 9-Ball set (though they can play in both sets).

    Return a full array of 10 Player IDs. For slots that were already filled, return the same ID provided in the partial lineup.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            assignments: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of 10 player IDs for the 10 games."
            },
            reasoning: {
              type: Type.STRING,
              description: "Short tactical summary of why these players were chosen."
            }
          },
          required: ["assignments"]
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("Empty AI response");
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini Lineup Suggestion Error:", error);
    return null;
  }
};
