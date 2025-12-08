export default async function handler(req, res) {
  const TMDB_API_KEY = process.env.TMDB_API_KEY;

  // Determine time window from query string (`time`), default to 'week'
  let timeWindow = "week";
  try {
    const u = new URL(req.url, "http://localhost");
    const t = u.searchParams.get("time");
    if (t === "day" || t === "week") timeWindow = t;
  } catch (e) {
    // ignore and use default
  }

  try {
    if (!TMDB_API_KEY)
      throw new Error({ error: "TMDB API key not configured." });

    const url = `https://api.themoviedb.org/3/trending/movie/${timeWindow}?api_key=${TMDB_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`TMDB API responded with status ${response.status}`);
    }

    const data = await response.json();
    // data.results is an array of trending movies. :contentReference[oaicite:1]{index=1}

    res.status(200).json({ results: data.results });
  } catch (error) {
    console.error("Error fetching trending movies:", error);
    res.status(500).json({ error: "Failed to fetch trending movies." });
  }
}
