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

    const prompt = `
      Generate a short, realistic movie spoiler.

      Movie: ${movie.title}
      Category: ${category}
      Overview: ${movie.overview}
    `;

    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" +
        GEMINI_KEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
        }),
      }
    );

    const result = await response.json();
    if (!result || !result.candidates || result.candidates.length === 0) {
      return Response.json(
        { error: "No spoiler generated", detail: result || "Empty response" },
        { status: 500 }
      );
    }

    return Response.json({ spoiler });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
