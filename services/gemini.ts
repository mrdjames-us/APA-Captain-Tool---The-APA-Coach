
import { GoogleGenAI, Type } from "@google/genai";
import { Player, SkillLevel } from "../types";

export const suggestLineup = async (
  players: Player[],
  opponentSkills: SkillLevel[]
) => {
  // Always create a fresh instance as per high-quality requirements
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    As a professional pool team captain using the APA Coach system, optimize a 10-game lineup (5 8-Ball games, 5 9-Ball games).
    
    My Team Players (ID, Name, 8B-Skill, 9B-Skill, Monthly Games Played):
    ${players.map(p => `- ${p.id}: ${p.name} (8B: ${p.skillLevel8Ball}, 9B: ${p.skillLevel9Ball}, Played: ${p.monthlyParticipation})`).join('\n')}
    
    Opponent Skill Levels for the 10 games (Games 1-5: 8-Ball, Games 6-10: 9-Ball):
    ${opponentSkills.map((s, i) => `Game ${i + 1}: Skill ${s}`).join(', ')}
    
    CRITICAL RULES:
    1. THE RULE OF 23 (8-Ball): The total of the 8-Ball Skill Levels for the 5 players in Games 1-5 MUST NOT EXCEED 23.
    2. THE RULE OF 23 (9-Ball): The total of the 9-Ball Skill Levels for the 5 players in Games 6-10 MUST NOT EXCEED 23.
    3. MONTHLY QUOTA: Each player needs a minimum of 4 games per month. Heavily prioritize assigning players with 'Played' counts less than 4.
    4. COMPETITIVENESS: Try to match player skill level to opponent skill level while respecting the Rule of 23.
    
    Return a list of 10 Player IDs assigned to these 10 games in order.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            assignments: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: "Array of 10 player IDs for the 10 games in sequence."
            },
            reasoning: {
              type: Type.STRING,
              description: "Brief explanation of the strategy used."
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
