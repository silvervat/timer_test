import { GoogleGenAI } from "@google/genai";

const AI_KEY = process.env.API_KEY || '';

// Initialize safely
let ai: GoogleGenAI | null = null;
if (AI_KEY) {
  ai = new GoogleGenAI({ apiKey: AI_KEY });
}

/**
 * Analyzes a construction site photo to verify context and log activities.
 */
export const analyzeSitePhoto = async (base64Image: string): Promise<string> => {
  if (!ai) {
    console.warn("Gemini API Key missing. Skipping analysis.");
    return "AI Analüüs pole saadaval (API võti puudub).";
  }

  try {
    // Strip the prefix if present (e.g., "data:image/jpeg;base64,")
    const cleanBase64 = base64Image.replace(/^data:image\/(png|jpeg|webp);base64,/, "");

    const model = 'gemini-2.5-flash';
    // Updated prompt for stricter verification context
    const prompt = "Oled ehitusobjekti järelevalve abiline. Analüüsi seda pilti. Sinu eesmärk on kinnitada, kas pilt on tehtud tõenäoliselt töökeskkonnas või ehitusobjektil. 1. Kirjelda lühidalt, mida näed (tööriistad, materjalid, keskkond). 2. Kui pilt on täiesti must või ebaoluline, anna hoiatus. Vasta lühidalt eesti keeles.";

    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: cleanBase64
            }
          },
          {
            text: prompt
          }
        ]
      }
    });

    return response.text || "Analüüs ei andnud vastust.";
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    return "Analüüsi viga: Ei suutnud pilti töödelda.";
  }
};