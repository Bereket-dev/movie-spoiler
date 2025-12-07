import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  runtime: "edge",
};

export default async function handler(req) {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    if (!GEMINI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing GEMINI_API_KEY" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { movie, category } = body;

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Generate a short, realistic movie spoiler.

      Movie Title: ${movie.title}
      Overview: ${movie.overview}
      Genre: ${movie.genres.map((g) => g.name).join(", ")}
      Main Actors: ${movie.cast.slice(0, 3).map((a) => a.name).join(", ")}
      Keywords: ${movie.keywords.map((k) => k.name).join(", ")}

      Spoiler category: ${category}

      Rules:
      - Must match the selected category
      - Must be short (max 2 sentences)
      - Must be realistic but not overly revealing
      - No ending explanation
      - Sound like a fun spoiler fact
    `;

    const result = await model.generateContent(prompt);

    // Different SDK versions return different response structures
    let spoiler =
      result?.response?.text?.() ||
      result?.output_text ||
      result?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "No spoiler generated";

    return new Response(
      JSON.stringify({ text: spoiler }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: "AI failed",
        detail: String(err)
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
