import { GoogleGenAI } from "@google/genai";

export const runtime = "edge";

export async function POST(req) {
  try {
    const GEMINI_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_KEY)
      return Response.json(
        { error: "Missing GEMINI_API_KEY" },
        { status: 500 }
      );

    const { movie, category } = await req.json();

    const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

    const prompt = `
      Generate a short, fun, realistic movie spoiler.

      Movie: ${movie.title}
      Overview: ${movie.overview}
      Category: ${category}
      Rules:
      - Must be short (max 2 sentences)
      - Fun spoiler fact
      - No major endings
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", text: prompt }],
    });

    const spoiler = response?.text || "No spoiler generated";

    return Response.json({ spoiler });
  } catch (err) {
    return Response.json(
      { error: "AI failed", detail: String(err) },
      { status: 500 }
    );
  }
}
