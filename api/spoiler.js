const GoogleGenerativeAI = require("@google/generative-ai");

export const config = {
  runtime: "edge", // best performance on Vercel
};

export default async function handler(req) {
  try {
    const { movie, category } = await req.json(); // movie data + wheel category

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

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

    return new Response(JSON.stringify({ spoiler }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
    });
  }
}
