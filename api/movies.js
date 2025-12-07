export default async function handler(req, res) {
  const TMDB_API_KEY = process.env.TMDB_API_KEY;
  const reqTimeWindow = req.time || "week";

  try {
    const timeWindow = reqTimeWindow;

    if (!TMDB_API_KEY) {
      return new Response(
        JSON.stringify({ error: "TMDB API key not configured." }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const url = `https://api.themoviedb.org/3/trending/movie/${timeWindow}?api_key=${TMDB_API_KEY}`;

    const response = await fetch(url);
    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: `TMDB API responded with status ${response.status}`,
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    // data.results is an array of trending movies. :contentReference[oaicite:1]{index=1}

    return new Response(JSON.stringify({ results: data.results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching trending movies:", err);
    return new Response(
      JSON.stringify({ error: "Failed to fetch trending movies." }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
