const IMAGE_BASE =
  "https://images.weserv.nl/?url=https://image.tmdb.org/t/p/w500";

const wheelCanvas = document.getElementById("wheelCanvas");

const movieGrid = document.getElementById("movieGrid");
const trendingMovies = document.getElementById("trendingMovies");
const spinButton = document.getElementById("spinButton");

// result
const resultDisplay = document.getElementById("resultDisplay");
const resultPlaceholder = document.getElementById("resultPlaceholder");
const spoilerResult = document.getElementById("spoilerResult");
const resultMovieName = document.getElementById("resultMovieName");
const resultPoster = document.getElementById("resultPoster");
const spoilerTextEl = document.getElementById("spoilerText");
const memePreviewImg = document.getElementById("resultMemePreview");

// share
const shareControls = document.getElementById("shareControls");
const generateMemeBtn = document.getElementById("generateMemeBtn");
const downloadMemeBtn = document.getElementById("downloadMemeBtn");
const copySpoilerBtn = document.getElementById("copySpoilerBtn");

let movies = [];
let selectedMovie = null;
let selectedIndex = -1;
// --------------------------------------------------
async function loadMovies(timeWindow = "week") {
  try {
    const res = await fetch(
      `/api/movies?time=${encodeURIComponent(timeWindow)}`
    );

    const json = await res.json();
    movies = json.results || [];

    renderMovies();
    renderTrending();
    spinButton.disabled = false;
    spinButton.innerHTML = `<i class="fas fa-play"></i> SPIN`;
  } catch (err) {
    console.log(err, "Failed to load movies!"); // bad ux
    // keep button disabled if loading failed
    spinButton.disabled = true;
  }
}

// --------------------------------------------------
function renderMovies() {
  movieGrid.innerHTML = "";

  const topMovies = movies
    .filter((m) => m.vote_average)
    .sort((a, b) => b.vote_average - a.vote_average)
    .slice(0, 6);

  topMovies.forEach((m, i) => {
    const el = document.createElement("div");
    el.className = "movie-option";
    const rating = Number(m.vote_average || 0).toFixed(1);

    el.innerHTML = `
      <img class="movie-poster" src="${IMAGE_BASE}${m.poster_path}">
      <div class="movie-rating"><i class="fas fa-star"></i>${rating}</div>
      <div class="movie-name">${m.title}</div>
    `;

    el.addEventListener("click", () => {
      selectMovie(m, el);
    });

    movieGrid.appendChild(el);
  });

  // auto-select first
  //   selectMovie(movies[0], movieGrid.children[0]);
}

// --------------------------------------------------
function renderTrending() {
  trendingMovies.innerHTML = "";

  movies.forEach((m, i) => {
    const el = document.createElement("div");
    el.className = "trending-movie";
    el.innerHTML = `
      <img class="trending-poster" src="${IMAGE_BASE}${m.poster_path}">
      <div class="trending-info">
        <div class="trending-title">${m.title}</div>
      </div>
    `;

    el.addEventListener("click", () => {
      selectMovie(m, el);
      document
        .querySelector(".wheel-container")
        .scrollIntoView({ behavior: "smooth" });
    });

    trendingMovies.appendChild(el);
  });
}

const wheelData = [
  {
    label: "🔍 Literal",
    fullTitle: "Overly Literal",
    color: "#FF6B6B",
    description:
      "Believe exactly what you see, no metaphors allowed. Spoons are just spoons here.",
  },
  {
    label: "🎬 Context",
    fullTitle: "Out of Context",
    color: "#4ECDC4",
    description:
      "Remove all setup, create maximum confusion. Perfect scenes for chaos.",
  },
  {
    label: "📱 Tech",
    fullTitle: "Modern Tech",
    color: "#45B7D1",
    description:
      "Solve plot problems with today's tech. They should've just texted.",
  },
  {
    label: "👶 Child's",
    fullTitle: "Child's Explanation",
    color: "#96CEB4",
    description:
      "A 5-year-old's simple, literal version. Everything is exactly what it looks like.",
  },
  {
    label: "😤 Petty",
    fullTitle: "Petty Complaint",
    color: "#FFEAA7",
    description:
      "Minor character's unreasonable gripe. It's always the little things that bother them.",
  },
  {
    label: "🔄 Sequel",
    fullTitle: "Unnecessary Sequel",
    color: "#DDA0DD",
    description: "Follow-up nobody asked for. Hollywood's favorite cash grab.",
  },
  {
    label: "📊 Corporate",
    fullTitle: "Corporate Jargon",
    color: "#98D8C8",
    description: "MBA-speak for epic stories. Let's synergize this narrative.",
  },
  {
    label: "📰 Clickbait",
    fullTitle: "Clickbait",
    color: "#F7DC6F",
    description:
      "Tabloid sensationalism for viral shares. Number 7 will shock you!",
  },
];

// ai based spoiler text
async function generateSpoiler(movie, categoryData) {
  try {
    const category = categoryData?.fullTitle;
    const description = categoryData?.description;
    const response = await fetch("/api/spoiler", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ movie, category, description }),
    });

    // If the API returns non-OK, throw to let caller decide fallback
    if (!response.ok) {
      const retryAfter = response.headers.get("Retry-After");
      if (retryAfter) {
        console.warn(
          `AI temporarily unavailable — retry after ${retryAfter}s.`
        );
      } else {
        console.warn("AI temporarily unavailable.");
      }
      throw new Error("Spoiler API returned non-OK");
    }

    // Prefer JSON, but fallback to text if parsing fails
    let data;
    try {
      data = await response.json();
    } catch (e) {
      const text = await response.text().catch(() => "");
      data = { spoiler: text };
    }

    const out = data?.spoiler ?? (typeof data === "string" ? data : undefined);
    if (!out) throw new Error("No spoiler in API response");

    return String(out);
  } catch (err) {
    // Bubble error up so the caller (spin) can choose to use the
    // client-side fake generator. Keep console message minimal.
    console.warn(
      "AI unavailable, falling back to client-side spoiler generator."
    );
    throw err;
  }
}

// --------------------------------------------------
const spinInfo = document.getElementById("spinInfoText");
const spinInfoMessage = document.getElementById("spinInfoMessage");
const closeBtn = document.getElementById("closeSpinInfo");

function showSpinInfo(message, duration = 2000) {
  spinInfoMessage.textContent = message;
  spinInfo.style.display = "flex";

  // Auto hide after duration
  setTimeout(() => {
    spinInfo.style.display = "none";
  }, duration);
}

closeBtn.addEventListener("click", () => {
  spinInfo.style.display = "none";
});

// -------
function selectMovie(m, element) {
  selectedMovie = m;

  [...movieGrid.children].forEach((el) => el.classList.remove("active"));
  element.classList.add("active");

  drawWheel(0);

  wheelCanvas.scrollIntoView({ behavior: "smooth", block: "center" });

  showSpinInfo(`Spin to get "${m.title}" spoiler!`, 10000);
  resultPoster.src = `${IMAGE_BASE}${m.poster_path}`;
}

// ------------------- Wheel ------------------------

function setWheelSize(newSize) {
  wheelCanvas.width = newSize;
  wheelCanvas.height = newSize;
  drawWheel(); // redraw after resizing
}

// setWheelSize(600);

const ctx = wheelCanvas.getContext("2d");
// Wheel configuration with colors for better visual

// Get just wheel items by mapping
const wheelItems = wheelData.map((item) => ({
  label: item.label,
  color: item.color,
}));

function drawWheel(rotation = 0) {
  const size = wheelCanvas.width;
  const center = size / 2;
  const radius = size / 2;

  const sliceCount = wheelItems.length;
  const sliceAngle = (2 * Math.PI) / sliceCount;

  ctx.clearRect(0, 0, size, size);

  wheelItems.forEach((item, i) => {
    const startAngle = i * sliceAngle + rotation;
    const endAngle = startAngle + sliceAngle;

    // Color slice - use the color from wheelData
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, startAngle, endAngle);
    ctx.closePath();

    // Use the color from wheelData instead of alternating colors
    ctx.fillStyle = item.color;
    ctx.fill();

    // Add a border between slices for better visual separation
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text / emoji
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(startAngle + sliceAngle / 2);

    ctx.textAlign = "right";
    ctx.fillStyle = "#ffffff"; // White text for contrast
    ctx.font = "bold 22px Segoe UI";

    // Use the label from wheelData (includes emoji)
    ctx.fillText(item.label, radius - 15, 8);

    ctx.restore();
  });

  // Optional: Add a center circle for better aesthetics
  ctx.beginPath();
  ctx.arc(center, center, 20, 0, 2 * Math.PI);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.strokeStyle = "#333333";
  ctx.lineWidth = 3;
  ctx.stroke();
}

drawWheel();

// --------------------------------------------------
async function spin() {
  if (!selectedMovie) {
    movieGrid.scrollIntoView({ behavior: "smooth", block: "center" });
    return;
  }

  spinButton.disabled = true;
  spinButton.innerHTML = `<i class="fas fa-spinner fa-spin"></i> SPINNING...`;

  const duration = 3000;
  const start = performance.now();
  const segmentCount = wheelItems.length;
  const segmentAngle = (2 * Math.PI) / segmentCount;

  // Pick a random segment to land on
  const targetSegmentIndex = Math.floor(Math.random() * segmentCount);

  // Calculate the rotation needed to land this segment at the top (12 o'clock)
  // We need to rotate enough so that the selected segment ends up at angle 0 (top)
  // Plus some full rotations for visual effect
  const fullRotations = 4 + Math.floor(Math.random() * 3); // 4-6 full spins
  const targetRotation =
    fullRotations * 2 * Math.PI + targetSegmentIndex * segmentAngle;

  // Adjust so the text is upright (each segment's text is drawn at its center)
  // We want the segment to be at the top, not the text - so we adjust by half a segment
  const adjustedTargetRotation = targetRotation + segmentAngle / 2;

  let finalCategory = null;

  function anim(now) {
    const t = Math.min((now - start) / duration, 1);
    // Ease-out function for realistic spin (starts fast, ends slow)
    const ease = t < 0.8 ? t * (2 - t) : 1 - Math.pow(1 - t, 4);

    // Calculate current rotation
    const currentRotation = ease * adjustedTargetRotation;
    drawWheel(currentRotation);

    // Determine the selected segment at the very end
    if (t >= 0.99 && !finalCategory) {
      // The wheel is drawn with 0 rotation at top, so we need to find
      // which segment is currently at angle 0 (top position)
      const normalizedRotation = currentRotation % (2 * Math.PI);

      // Calculate which segment's center is closest to angle 0 (top)
      // Each segment's text is drawn at its center (startAngle + segmentAngle/2)
      // So we want to find which segment has its center near angle 0
      let minDiff = 2 * Math.PI; // Start with large value

      for (let i = 0; i < segmentCount; i++) {
        const segmentCenter = i * segmentAngle + segmentAngle / 2;
        const segmentPosition =
          (segmentCenter - normalizedRotation + 2 * Math.PI) % (2 * Math.PI);
        const diff = Math.abs(segmentPosition);

        if (diff < minDiff) {
          minDiff = diff;
          selectedIndex = i;
        }
      }

      finalCategory = wheelData[selectedIndex];
    }

    if (t < 1) {
      requestAnimationFrame(anim);
    } else {
      // Ensure we have the final category, then generate spoiler
      if (!finalCategory || selectedIndex == -1) {
        // Fallback calculation if above didn't work
        const normalizedRotation = currentRotation % (2 * Math.PI);
        selectedIndex = Math.floor(
          (segmentCount - normalizedRotation / segmentAngle) % segmentCount
        );
        finalCategory = wheelData[selectedIndex];
      }

      generateSpoiler(selectedMovie, finalCategory)
        .then((spoiler) => {
          // Guard against undefined / unexpected types
          if (!spoiler) {
            const fb = generateFakeSpoiler(selectedMovie, selectedIndex);
            console.warn("Spoiler was falsy; using fallback:", fb);
            return done(fb);
          }
          return done(spoiler);
        })
        .catch((err) => {
          console.error("generateSpoiler promise rejected:", err);
          const fb = generateFakeSpoiler(selectedMovie, selectedIndex);
          done(fb);
        });
    }
  }

  requestAnimationFrame(anim);

  // UI cleanup
  memePreviewImg.style.display = "none";
  downloadMemeBtn.style.display = "none";

  resultPoster.style.display = "block";
  resultMovieName.textContent = selectedMovie.title;
}

function showResult(spoiler) {
  resultPlaceholder.style.display = "none";
  spoilerResult.style.display = "block";
  shareControls.style.display = "block";

  spoiler = String(spoiler);

  // Clean the spoiler text before displaying
  let cleanSpoiler = spoiler
    .replace(/\*\*(.*?)\*\*/g, "$1") // Remove **bold**
    .replace(/\*(.*?)\*/g, "$1") // Remove *italic*
    .replace(/`(.*?)`/g, "$1") // Remove `code`
    .replace(/\*/g, "") // Remove any remaining *
    .trim();

  spoilerTextEl.textContent = cleanSpoiler;
  window.lastSpoiler = cleanSpoiler; // Store cleaned version
}

function done(spoiler) {
  spinButton.disabled = false;
  spinButton.innerHTML = `<i class="fas fa-redo"></i> SPIN AGAIN`;

  resultDisplay.scrollIntoView({ behavior: "smooth", block: "center" });

  showResult(spoiler);
}

// --------------------------------------------------

function generateFakeSpoiler(movie, indexOverride = selectedIndex) {
  const movieTitle = movie?.title || "this movie";

  // Generic spoilers that work for any movie
  const genericSpoilers = [
    [
      `${movieTitle}: The "magic" was just really good stage lighting.`,
      `Turns out the "chosen one" in ${movieTitle} was literally chosen... by a random drawing.`,
      `${movieTitle}'s hero wins by reading the instructions for once.`,
      `The prophecy in ${movieTitle} was just a badly worded restaurant review.`,
      `${movieTitle} ends when someone realizes "eternal love" means 2-3 business days.`,
      `The "ancient artifact" in ${movieTitle} was just grandpa's weird paperweight.`,
      `${movieTitle}: They defeat the villain by calling his mom.`,
      `The "forbidden forest" in ${movieTitle} had a "No Trespassing" sign they ignored.`,
    ],
    [
      `Watch ${movieTitle}'s climax without sound: it's just people making faces at each other.`,
      `${movieTitle}'s emotional reunion scene is just two people awkwardly hugging.`,
      `Remove the slow-mo from ${movieTitle} and it's just people running weirdly fast.`,
      `${movieTitle}'s most intense moment is someone really focused on chewing gum.`,
      `The dramatic stare-down in ${movieTitle} is just two people who forgot their glasses.`,
      `${movieTitle}'s "epic battle" looks like a really aggressive dance-off.`,
      `Without context, ${movieTitle}'s hero is just breaking into someone's house.`,
      `${movieTitle}'s romantic scene: two people breathing heavily near each other.`,
    ],
    [
      `${movieTitle}'s entire plot could've been a 3-minute TikTok.`,
      `The villain in ${movieTitle} loses because he didn't update his iOS.`,
      `${movieTitle}: Two hours of drama solved by turning it off and on again.`,
      `They could've just DoorDash'd the MacGuffin in ${movieTitle}.`,
      `${movieTitle}'s conflict starts with an "U up?" text sent to wrong person.`,
      `The hero in ${movieTitle} wins by putting the villain on mute.`,
      `${movieTitle}: Ancient curse broken by 5-star Yelp review.`,
      `The whole mess in ${movieTitle} started with an autocorrect fail.`,
    ],
    [
      `${movieTitle} is about a grown-up who needs to say sorry.`,
      `The bad guy in ${movieTitle} just needed a hug and a snack.`,
      `${movieTitle}: People fighting over who gets to be line leader.`,
      `They spent the whole movie in ${movieTitle} looking for a shiny rock.`,
      `${movieTitle} is about someone who won't share their toys.`,
      `The scary monster in ${movieTitle} was just lonely and wanted friends.`,
      `${movieTitle}: Everyone learns it's not nice to point.`,
      `The magic in ${movieTitle} was just being kind to each other.`,
    ],
    [
      `${movieTitle} ends because someone didn't refill the coffee pot.`,
      `The real villain in ${movieTitle} was the person who double-parked.`,
      `${movieTitle}: World almost ends over a disputed group chat admin role.`,
      `It all started when someone in ${movieTitle} used the last of the milk.`,
      `${movieTitle}'s hero was motivated by a really annoying email signature.`,
      `The war in ${movieTitle} began with a passive-aggressive sticky note.`,
      `${movieTitle}: Apocalypse over incorrect microwave popcorn timing.`,
      `The conflict in ${movieTitle} was about who gets the window seat.`,
    ],
    [
      `${movieTitle} 2: Return of the Guy Who Was in One Scene`,
      `Coming soon: ${movieTitle}: The Musical (But Only Act 2)`,
      `${movieTitle}: The Prequel to the Prequel We Didn't Need`,
      `${movieTitle} Babies: Now With More Baby Sounds!`,
      `${movieTitle} in Space! (It's the Same Plot But In Space)`,
      `${movieTitle}: The Holiday Special That Explains Tax Forms`,
      `${movieTitle} VR: You Can Watch the Same Movie But With Headaches`,
      `${movieTitle}: The Prequel Where We Learn How the Coffee Machine Works`,
    ],
    [
      `${movieTitle} ends by circling back to core competencies.`,
      `The hero in ${movieTitle} leverages synergy to disrupt the villain space.`,
      `${movieTitle} concludes with a paradigm shift in actionable deliverables.`,
      `They achieve victory in ${movieTitle} by thinking outside the box... literally.`,
      `${movieTitle}: Conflict resolved through effective stakeholder alignment.`,
      `The magic in ${movieTitle} was just scalable cloud-based solutions.`,
      `${movieTitle} ends with a robust framework for optimized outcomes.`,
      `The prophecy in ${movieTitle} was just the quarterly projections.`,
    ],
    [
      `The ending of ${movieTitle} left me SHAKING! You won't believe what happens!`,
      `What NOBODY tells you about ${movieTitle}'s final scene! #MindBlown`,
      `The ONE secret about ${movieTitle} that will change how you see EVERYTHING!`,
      `${movieTitle}'s post-credit scene DESTROYS the entire franchise!`,
      `You've been watching ${movieTitle} WRONG this whole time!`,
      `The HIDDEN meaning behind ${movieTitle} that scholars are AFRAID to discuss!`,
      `What REALLY happens in ${movieTitle} will make you QUESTION REALITY!`,
      `This ${movieTitle} fan theory will RUIN the movie for you FOREVER!`,
    ],
  ];
  // Try to get genre-specific spoilers if movie has genre info.
  // TMDB can return `genres` as an array of strings or objects
  // (e.g. [{id, name}, ...]). Be defensive about the shape.
  let genre = null;
  if (Array.isArray(movie?.genres) && movie.genres.length > 0) {
    const g0 = movie.genres[0];
    if (typeof g0 === "string") genre = g0.toLowerCase();
    else if (g0 && typeof g0.name === "string") genre = g0.name.toLowerCase();
  }

  const genreSpecific = {
    action: [
      `${movieTitle}: Hero defeats villain by throwing a REALLY big rock.`,
      `The climax of ${movieTitle} is just two sweaty men hugging angrily.`,
      `${movieTitle} ends with a slow-motion walk away from an explosion they caused.`,
      `The hero in ${movieTitle} survives because the villain explains his whole plan first.`,
      `${movieTitle}: All problems solved by shooting them until they stop moving.`,
      `The sequel to ${movieTitle} is just the same movie but with more squinting.`,
      `${movieTitle}'s hero reloads his gun by dramatically slamming it once.`,
      `The villain's lair in ${movieTitle} has terrible WiFi, which is his real downfall.`,
    ],
    comedy: [
      `${movieTitle} ends with a really long fart joke that somehow ties everything together.`,
      `The romantic subplot in ${movieTitle} was just there to kill time.`,
      `${movieTitle}'s punchline is just someone falling down. Again.`,
      `The "hilarious" misunderstanding in ${movieTitle} could've been solved with a text.`,
      `${movieTitle}: Two hours of setup for a single "that's what she said" joke.`,
      `The quirky best friend in ${movieTitle} is just annoying if you think about it.`,
      `${movieTitle}'s entire third act is just running through a wedding venue.`,
      `The moral of ${movieTitle} is: don't do the thing. They do the thing.`,
    ],
    drama: [
      `${movieTitle} ends with someone staring meaningfully into the middle distance.`,
      `The emotional breakthrough in ${movieTitle} happens in the rain. Obviously.`,
      `${movieTitle}: Two hours of tension resolved by someone finally saying "I love you."`,
      `The protagonist in ${movieTitle} learns the real treasure was the friends they ignored.`,
      `${movieTitle}'s Oscar clip is just someone crying while eating alone.`,
      `The "twist" in ${movieTitle} is that the narrator was dead the whole time. Psych!`,
      `${movieTitle} concludes with an ambiguous ending that's just lazy writing.`,
      `The "artistic" shots in ${movieTitle} are just things out of focus for too long.`,
    ],
    horror: [
      `${movieTitle} ends because the teens finally thought to call the police.`,
      `The monster in ${movieTitle} was defeated by turning on the lights.`,
      `${movieTitle}: Don't worry, the dog survives! (The people don't.)`,
      `The "scary" basement in ${movieTitle} just had a weird smell and poor lighting.`,
      `${movieTitle}'s villain is defeated by someone remembering they have a gun.`,
      `The ghost in ${movieTitle} just wanted someone to fix the leaky faucet.`,
      `${movieTitle} concludes with the monster getting a corporate job and settling down.`,
      `The curse in ${movieTitle} was broken by reading the terms and conditions.`,
    ],
    romance: [
      `${movieTitle} ends with a kiss in the rain, which is terrible for your hair.`,
      `The "meet-cute" in ${movieTitle} is just a traffic violation.`,
      `${movieTitle}: They overcome all obstacles by making out about it.`,
      `The grand gesture in ${movieTitle} is just stalking with a boombox.`,
      `${movieTitle}'s lovers were perfect for each other because they're both terrible.`,
      `The conflict in ${movieTitle} is solved by someone running through an airport.`,
      `${movieTitle} concludes with a wedding that definitely ends in divorce.`,
      `The "spark" in ${movieTitle} was just indigestion from bad oysters.`,
    ],
    scifi: [
      `${movieTitle}: The aliens were defeated by a common Earth cold virus.`,
      `The time travel in ${movieTitle} creates a paradox that's solved by a shrug.`,
      `${movieTitle}'s advanced AI just wants to watch cat videos all day.`,
      `The spaceship in ${movieTitle} breaks down because someone forgot to update Java.`,
      `${movieTitle}: Humanity saved by someone who's really good at Minesweeper.`,
      `The futuristic society in ${movieTitle} still has terrible customer service.`,
      `${movieTitle} ends with the hero rebooting the entire universe.`,
      `The alien language in ${movieTitle} turns out to be just bad WiFi signals.`,
    ],
    fantasy: [
      `${movieTitle}: The dragon just wanted someone to scratch that hard-to-reach spot.`,
      `The magic spell in ${movieTitle} was just sneezing with conviction.`,
      `${movieTitle}'s chosen one was picked because his name sounded cool.`,
      `The prophecy in ${movieTitle} was misinterpreted due to bad handwriting.`,
      `${movieTitle}: Evil overlord defeated by really aggressive taxation policies.`,
      `The enchanted forest in ${movieTitle} was just regular forest with good PR.`,
      `${movieTitle} ends when the wizard remembers he has homeowner's insurance.`,
      `The quest in ${movieTitle} was for a coupon that expired last Tuesday.`,
    ],
  };

  // If we have a genre match, sometimes use genre-specific spoiler
  if (genre && genreSpecific[genre] && Math.random() > 0.5) {
    const genreSpoilers = genreSpecific[genre];
    return genreSpoilers[Math.floor(Math.random() * genreSpoilers.length)];
  }

  // Determine which generic bucket to use. Prefer an explicit override
  // (passed from caller), otherwise fall back to `selectedIndex`. If
  // neither is valid, pick a random bucket.
  const totalBuckets = genericSpoilers.length;
  const idx =
    typeof indexOverride === "number" &&
    indexOverride >= 0 &&
    indexOverride < totalBuckets
      ? indexOverride
      : typeof selectedIndex === "number" &&
        selectedIndex >= 0 &&
        selectedIndex < totalBuckets
      ? selectedIndex
      : Math.floor(Math.random() * totalBuckets);

  const spoilerOptions =
    genericSpoilers[idx] ||
    genericSpoilers[Math.floor(Math.random() * totalBuckets)];
  return spoilerOptions[Math.floor(Math.random() * spoilerOptions.length)];
}

// --------------------------------------------------
async function loadImageSafely(url) {
  const res = await fetch(url, { mode: "cors" });
  const blob = await res.blob();
  return await new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.src = URL.createObjectURL(blob);
  });
}

// -------------- Meme Creation ---------------------
async function createMeme() {
  const memeCanvas = document.getElementById("memeCanvas");
  const memeCtx = memeCanvas.getContext("2d");

  const topText = String(window.lastSpoiler).toUpperCase();

  // Load image
  const posterUrl = resultPoster.src;
  const img = await loadImageSafely(posterUrl);

  // Draw image
  const maxWidth = 1080;
  const scale = Math.min(1, maxWidth / img.width);

  memeCanvas.width = img.width * scale;
  memeCanvas.height = img.width * scale;
  memeCtx.drawImage(img, 0, 0, memeCanvas.width, memeCanvas.height);

  // MEME FONT SETTINGS
  const fontSize = Math.floor(memeCanvas.width / 12);
  memeCtx.font = `bold ${fontSize}px Impact, Arial Black, sans-serif`;
  memeCtx.fillStyle = "white";
  memeCtx.strokeStyle = "black";
  memeCtx.lineWidth = Math.floor(fontSize / 6);
  memeCtx.textAlign = "center";
  memeCtx.textBaseline = "middle";

  // --- TOP TEXT ---
  wrapText(
    memeCtx,
    topText,
    memeCanvas.width / 2,
    fontSize * 1.2,
    memeCanvas.width - 20,
    fontSize * 1.2
  );

  // EXPORT RESULT
  const memeData = memeCanvas.toDataURL("image/png");
  memePreviewImg.src = memeData;
  memePreviewImg.style.display = "block";
  resultPoster.style.display = "none";
  downloadMemeBtn.style.display = "inline-flex";
}

// helper: function
function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
  const words = String(text);
  let line = "";
  let cy = y;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + " ";
    const testWidth = ctx.measureText(testLine).width;

    if (testWidth > maxWidth && i > 0) {
      ctx.strokeText(line, x, cy);
      ctx.fillText(line, x, cy);
      line = words[i] + " ";
      cy += lineHeight;
    } else {
      line = testLine;
    }
  }

  ctx.strokeText(line, x, cy);
  ctx.fillText(line, x, cy);
}

// --------------------------------------------------
function download() {
  const a = document.createElement("a");
  a.href = memeCanvas.toDataURL("image/png");
  // show preview in result area

  a.download = "spoiler.png";
  a.click();
}

function copySpoiler() {
  navigator.clipboard.writeText(window.lastSpoiler);
  copySpoilerBtn.innerHTML = "Copied!";
  setTimeout(
    () => (copySpoilerBtn.innerHTML = "<i class='fas fa-copy'></i>Copy"),
    1500
  );
}

function shareOnTwitter() {
  const text = encodeURIComponent(window.lastSpoiler);
  const url = encodeURIComponent(window.location.href);
  window.open(
    `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
    "_blank"
  );
}

function shareOnFacebook() {
  const text = encodeURIComponent(window.lastSpoiler);
  const url = encodeURIComponent(window.location.href);
  window.open(
    `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`,
    "_blank"
  );
}

function shareOnReddit() {
  const text = encodeURIComponent(window.lastSpoiler);
  const url = encodeURIComponent(window.location.href);
  window.open(
    `https://www.reddit.com/submit?url=${url}&title=${text}`,
    "_blank"
  );
}

function shareOnTelegram() {
  const text = encodeURIComponent(window.lastSpoiler);
  const url = encodeURIComponent(window.location.href);
  window.open(`https://t.me/share/url?url=${url}&text=${text}`, "_blank");
}

// ---------------- Events --------------------------
// Make it editable when clicked
spoilerTextEl.addEventListener("click", () => {
  spoilerTextEl.setAttribute("contenteditable", "true");
  spoilerTextEl.focus();
});

// Save the latest edited spoiler to a global variable
spoilerTextEl.addEventListener("input", () => {
  window.lastSpoiler = spoilerTextEl.innerText;
});

// stop editing when focus is lost
spoilerTextEl.addEventListener("blur", () => {
  spoilerTextEl.removeAttribute("contenteditable");
});

spinButton.addEventListener("click", spin);
generateMemeBtn.addEventListener("click", createMeme);
downloadMemeBtn.addEventListener("click", download);
copySpoilerBtn.addEventListener("click", copySpoiler);
document
  .getElementById("shareTweetBtn")
  .addEventListener("click", shareOnTwitter);
document
  .getElementById("shareFacebookBtn")
  .addEventListener("click", shareOnFacebook);
document
  .getElementById("shareRedditBtn")
  .addEventListener("click", shareOnReddit);
document
  .getElementById("shareTelegramBtn")
  .addEventListener("click", shareOnTelegram);

// Trending time window selector
const timeWindowSelect = document.getElementById("timeWindowSelect");
if (timeWindowSelect) {
  timeWindowSelect.addEventListener("change", (e) => {
    const val = e.target.value || "week";
    // Reload movies using selected time window (week/day)
    loadMovies(val);
    renderTrending();
  });
}

// start
loadMovies();
drawWheel(0);
