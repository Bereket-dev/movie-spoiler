const IMAGE_BASE = "https://images.weserv.nl/?url=image.tmdb.org/t/p/w500";

const wheelCanvas = document.getElementById("wheelCanvas");
const wheelCtx = wheelCanvas.getContext("2d");

const movieGrid = document.getElementById("movieGrid");
const trendingMovies = document.getElementById("trendingMovies");
const spinButton = document.getElementById("spinButton");

// result
const resultPlaceholder = document.getElementById("resultPlaceholder");
const spoilerResult = document.getElementById("spoilerResult");
const resultMovieName = document.getElementById("resultMovieName");
const resultPoster = document.getElementById("resultPoster");
const spoilerTextEl = document.getElementById("spoilerText");
const memePreviewImg = document.getElementById("resultMemePreview");

// share
const shareControls = document.getElementById("shareControls");
const memeCanvas = document.getElementById("memeCanvas");
const memeCtx = memeCanvas.getContext("2d");
const generateMemeBtn = document.getElementById("generateMemeBtn");
const downloadMemeBtn = document.getElementById("downloadMemeBtn");
const copySpoilerBtn = document.getElementById("copySpoilerBtn");

let movies = [];
let selectedMovie = null;

// --------------------------------------------------
async function loadMovies() {
  try {
    const res = await fetch("/api/movies");

    const json = await res.json();
    movies = json.results.slice(0, 8);

    renderMovies();
    renderTrending();
    spinButton.disabled = false;
    spinButton.innerHTML = `<i class="fas fa-play"></i> SPIN`;
  } catch (err) {
    console.log(err, "Failed to load movies!"); // bad ux
  }
}

// --------------------------------------------------
function renderMovies() {
  movieGrid.innerHTML = "";

  movies.forEach((m, i) => {
    const el = document.createElement("div");
    el.className = "movie-option";

    el.innerHTML = `
      <img class="movie-poster" src="${IMAGE_BASE}${m.poster_path}">
      <div class="movie-rating"><i class="fas fa-star"></i>${m.vote_average.toFixed(
        1
      )}</div>
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
      const match = [...movieGrid.children].find(
        (el) => el.querySelector(".movie-name").textContent === m.title
      );

      selectMovie(m, match);
      document
        .querySelector(".wheel-container")
        .scrollIntoView({ behavior: "smooth" });
    });

    trendingMovies.appendChild(el);
  });
}

// ai based spoiler text
async function generateSpoiler(movie, category) {
  try {
    const response = await fetch("/api/spoiler", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        movie,
        category,
      }),
    });

    const data = await response.json();
    return data.text;
  } catch (err) {
    const fakeResponse = fakeSpoiler(movie);
    console.error("Error generating spoiler:", err);
    return fakeResponse;
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

  [...movieGrid.children].forEach(() => {
    wheelCanvas.scrollIntoView({ behavior: "smooth", block: "center" });
  });

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
const wheelItems = [
  "😂 Funny",
  "💀 Death",
  "🔥 Drama",
  "😭 Sad",
  "🤯 Plot Twist",
  "👽 Sci-Fi",
  "💘 Romance",
  "🤡 WTF",
];

function drawWheel(rotation = 0) {
  const size = wheelCanvas.width;
  const center = size / 2;
  const radius = size / 2;

  const sliceCount = wheelItems.length;
  const sliceAngle = (2 * Math.PI) / sliceCount;

  ctx.clearRect(0, 0, size, size);

  wheelItems.forEach((text, i) => {
    const startAngle = i * sliceAngle + rotation;
    const endAngle = startAngle + sliceAngle;

    // Color slice
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.arc(center, center, radius, startAngle, endAngle);
    ctx.closePath();

    ctx.fillStyle = i % 2 === 0 ? "#7b2cbf" : "#01b4e4";
    ctx.fill();

    // Text / emoji
    ctx.save();

    ctx.translate(center, center);
    ctx.rotate(startAngle + sliceAngle / 2);

    ctx.textAlign = "right";
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px Segoe UI";
    ctx.fillText(text, radius - 15, 8);

    ctx.restore();
  });
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

  const category = wheelItems[Math.floor(Math.random() * wheelItems.length)];
  const spoiler = await generateSpoiler(selectedMovie, category);

  function anim(now) {
    const t = Math.min((now - start) / duration, 1);
    const ease = 1 - Math.pow(1 - t, 3);

    drawWheel(ease * 12 * Math.PI);

    if (t < 1) requestAnimationFrame(anim);
    else done(spoiler);
  }
  requestAnimationFrame(anim);

  //remove previous meme
  memePreviewImg.style.display = "none";
  downloadMemeBtn.style.display = "none";

  resultPoster.style.display = "block";
  resultMovieName.textContent = selectedMovie.title;
  setTimeout(() => {
    const resultDisplay = document.getElementById("resultDisplay");
    resultDisplay.scrollIntoView({ behavior: "smooth", block: "center" });
  }, 5000);
}

function done(spoiler) {
  spinButton.disabled = false;
  spinButton.innerHTML = `<i class="fas fa-redo"></i> SPIN AGAIN`;

  showResult(spoiler);
}

// --------------------------------------------------
const SPOILERS = [
  "The villain becomes a motivational speaker.",
  "The hero is allergic to the plot twist.",
  "The sidekick wins the lottery but never tells anyone.",
  "The final battle is decided over karaoke.",
  "The monster writes a very emotional blog.",
  "Everyone forgets why they were fighting.",
  "A dog solves the mystery accidentally.",
  "Aliens just wanted pizza delivery.",
];

function fakeSpoiler(movie) {
  let s = SPOILERS[Math.floor(Math.random() * SPOILERS.length)];
  return `"${movie.title}" ends because ${s}`;
}

// --------------------------------------------------
function showResult(spoiler) {
  resultPlaceholder.style.display = "none";
  spoilerResult.style.display = "block";
  shareControls.style.display = "block";

  spoilerTextEl.textContent = spoiler;
  window.lastSpoiler = spoiler;
}

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
  const posterUrl = resultPoster.src;

  const img = await loadImageSafely(posterUrl);

  memeCtx.clearRect(0, 0, 1080, 1080);
  memeCtx.drawImage(img, 0, 0, 1080, 1080);

  memeCtx.fillStyle = "rgba(0,0,0,0.55)";
  memeCtx.fillRect(0, 0, 1080, 1080);

  memeCtx.fillStyle = "#fff";
  memeCtx.font = "bold 64px Segoe UI";
  memeCtx.textAlign = "center";
  memeCtx.fillText(selectedMovie.title, 540, 140);

  memeCtx.fillStyle = "#ffd166";
  memeCtx.font = "bold 50px Segoe UI";

  wrap(window.lastSpoiler, 920).forEach((line, i) => {
    memeCtx.fillText(line, 540, 360 + i * 70);
  });

  //add in the result - display
  const memeData = memeCanvas.toDataURL("image/png");
  memePreviewImg.src = memeData;
  memePreviewImg.style.display = "block";
  document.getElementById("resultPoster").style.display = "none";

  downloadMemeBtn.style.display = "inline-flex";
}

function wrap(text, maxW) {
  const ctx = memeCtx;
  const words = text.split(" ");
  let line = "",
    lines = [];

  words.forEach((w) => {
    const test = (line + " " + w).trim();
    if (ctx.measureText(test).width < maxW) line = test;
    else {
      lines.push(line);
      line = w;
    }
  });

  if (line) lines.push(line);
  return lines;
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

// start
loadMovies();
drawWheel(0);
