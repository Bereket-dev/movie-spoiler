import { GoogleGenerativeAI } from "@google/generative-ai";

export const config = {
  runtime: "edge", // best performance on Vercel
};

export default async function handler(req, res) {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  try {
    if (!GEMINI_API_KEY)
      throw new Error({ error: "TMDB API key not configured." });

    const { movie, category } = await req.json(); // movie data + wheel category

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      Generate a short, realistic movie spoiler.

      Movie Title: ${movie.title}
      Overview: ${movie.overview}
      Genre: ${movie.genres.map((g) => g.name).join(", ")}
      Main Actors: ${movie.cast
        .slice(0, 3)
        .map((a) => a.name)
        .join(", ")}
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
    const spoiler = result.response.text();

    return res.status(200).json({ text: spoiler });
  } catch (err) {
    return res
      .status(500)
      .json({ error: "Failed to get ai generated spoiler!" });
  }
}
