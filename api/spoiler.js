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

    const { movie, category, description } = await req.json();

    const ai = new GoogleGenAI({ apiKey: GEMINI_KEY });

    const prompt = `
Generate a short, fun, shareable movie spoiler in the style of viral movie memes.

Movie: ${movie.title}
Overview: ${movie.overview}
Category: ${category}
Category Description: ${description}

INSPIRATION - Famous Movie Meme Styles:
• "What If I Told You..." (The Matrix) - Philosophical twists on obvious truths
• "You Don't Say?" (Vampire's Kiss) - Sarcastic reactions to obvious facts  
• "One Does Not Simply..." (Lord of the Rings) - Mock-epic struggles with simple tasks
• "Cheers, Old Sport" (Great Gatsby) - Over-the-top celebration of trivial things
• "That Escalated Quickly" (Anchorman) - Understated reaction to sudden chaos
• Condescending Wonka (Willy Wonka) - Smug, sarcastic commentary
• "I Understood That Reference" (Avengers) - Geeky pride in catching details
• "This. Is. Sparta!" (300) - Dramatic overreaction to minor situations
• "Hitler Reacts" (Downfall) - Overblown anger about trivial problems

RULES:
1. LENGTH: Max 50 characters - must be tweetable!
2. STYLE: Match the "${category}" vibe: ${description}
3. HUMOR: Witty, meme-worthy, instantly shareable
4. CONTENT: Hint at something from the movie WITHOUT revealing major endings
5. TONE: Like the iconic memes above - exaggerated, relatable, ironic

EXAMPLES by Category:
• "Overly Literal": "The 'magic' was just really good stage lighting."
• "Out of Context": "Watch the climax on mute: just people making faces."
• "Modern Tech": "Two hours of drama solved by turning it off and on."
• "Child's Explanation": "Bad guy just needed a hug and a snack."
• "Petty Complaint": "World almost ended over a parking spot."
• "Unnecessary Sequel": "Part 2: The Prequel to the Prequel We Didn't Need"
• "Corporate Jargon": "Victory achieved through effective stakeholder alignment."
• "Clickbait": "What NOBODY tells you about the final scene! #MindBlown"

DELIVERABLE: One perfect spoiler that feels like it could go viral as a meme.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", text: prompt }],
    });

    const spoiler = response?.text || "No spoiler generated";

    return Response.json({ spoiler });
  } catch (err) {
    // Log full error on the server for diagnostics
    const detail = String(err);
    console.error("AI generation failed:", detail);

    // Try to extract a retry delay (in seconds) from the error string
    let retryAfter = undefined;
    try {
      const m1 = detail.match(/Retry-After\"?:\s*\"?(\\d+)/i);
      const m2 = detail.match(/retryDelay\"?:\"?(\\d+(?:\\.\\d*)?)s/i);
      const m3 = detail.match(/Please retry in (\\d+(?:\\.\\d*)?)s/i);
      const num = (m1 && m1[1]) || (m2 && m2[1]) || (m3 && m3[1]);
      if (num) retryAfter = Math.ceil(Number(num));
    } catch (e) {
      // ignore
    }

    // Minimal fallback spoiler generator so the client still receives a usable string
    function generateFallbackSpoiler(movie, category) {
      const title = movie?.title || "this movie";
      const cat = category || "something wild";
      const fallbacks = [
        `${title}: Turns out it was all a dream (but fun).`,
        `${title}: The villain was just misunderstood.`,
        `${title}: Someone forgot to check the map.`,
        `${title}: They solved it by sending a text.`,
        `${title}: This scene explains everything (not really).`,
        `${title}: The secret was in plain sight the whole time.`,
        `${title}: You won't believe how mildly surprising this is.`,
      ];
      return `${cat} — ${
        fallbacks[Math.floor(Math.random() * fallbacks.length)]
      }`;
    }

    // Attempt to parse the incoming request body to build a better fallback
    let body = {};
    try {
      body = await req.json();
    } catch (e) {
      // ignore
    }

    const fallback = generateFallbackSpoiler(
      body.movie || {},
      body.category || "Clickbait"
    );

    const headers = { "Content-Type": "application/json" };
    if (retryAfter) headers["Retry-After"] = String(retryAfter);

    // Return a 200 with a fallback `spoiler` so the client can continue gracefully.
    return Response.json(
      { spoiler: fallback, error: "AI failed", detail },
      { status: 200, headers }
    );
  }
}
