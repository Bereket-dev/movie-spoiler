export default async function handler(req, res) {
  const TMDB_API_KEY = process.env.VITE_TMDB_API_KEY;
  const reqTimeWindow = req.time || "week";

  if (!TMDB_API_KEY) {
    res.status(500).json({ error: "TMDB API key not configured." });
    return;
  }

  try {
    const timeWindow = reqTimeWindow;

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
