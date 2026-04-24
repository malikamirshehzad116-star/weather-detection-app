/* ================================================================
   SkyCast Weather App — script.js
   Full-featured weather app with full-screen result layout.

   HOW TO USE:
   1. Go to https://openweathermap.org/api
   2. Create a free account and get your API key
   3. Replace "YOUR_API_KEY" below with your actual key
================================================================ */

const API_KEY = "9566e18016126784c4be618e098d1fbc";   // ← Replace with your OpenWeatherMap API key
const BASE    = "https://api.openweathermap.org/data/2.5";

/* ================================================================
   STATE
================================================================ */
let currentWeatherData = null;   
let currentUnit        = "C";    
let currentTempC       = null;   
let currentFeelsLikeC  = null;  
let currentTempMaxC    = null;
let currentTempMinC    = null;
let savedCities        = JSON.parse(localStorage.getItem("skycast_saved") || "[]");

/* ================================================================
   DOM HELPERS
================================================================ */
const $  = id => document.getElementById(id);
const el = id => document.getElementById(id);

/* ================================================================
   TEMPERATURE CONVERSION HELPERS
================================================================ */
function toCelsius(c)    { return Math.round(c); }
function toFahrenheit(c) { return Math.round(c * 9 / 5 + 32); }

function formatTemp(celsiusValue) {
  if (currentUnit === "C") return toCelsius(celsiusValue)   + "°C";
  return toFahrenheit(celsiusValue) + "°F";
}

/* ================================================================
   PAGE NAVIGATION
   Switches between: searchPage, loadingPage, errorPage, resultPage
================================================================ */
const ALL_PAGES = ["searchPage", "loadingPage", "errorPage", "resultPage"];

function showPage(pageId) {
  ALL_PAGES.forEach(p => {
    const pageEl = $(p);
    if (!pageEl) return;
    if (p === pageId) {
      pageEl.classList.remove("hidden");
      pageEl.classList.add("active");
      pageEl.style.display = (p === "loadingPage" || p === "errorPage") ? "flex" : "block";
    } else {
      pageEl.classList.add("hidden");
      pageEl.classList.remove("active");
      pageEl.style.display = "none";
    }
  });
}

function goBack() {
  showPage("searchPage");
  $("cityInput").value = "";
  $("cityInput").focus();
}

/* ================================================================
   QUICK SEARCH — called from inline onclick in HTML pills
================================================================ */
function quickSearch(city) {
  $("cityInput").value = city;
  getWeather(city);
}

/* ================================================================
   UNIT TOGGLE — °C / °F
================================================================ */
function setUnit(unit) {
  currentUnit = unit;

  // Update toggle button active state
  $("btnC").classList.toggle("active", unit === "C");
  $("btnF").classList.toggle("active", unit === "F");

  // Update displayed temperatures if data is loaded
  if (currentTempC !== null) {
    $("temp").textContent      = formatTemp(currentTempC);
    $("feelsLike").textContent = "Feels like " + formatTemp(currentFeelsLikeC);
    $("tempMax").textContent   = formatTemp(currentTempMaxC);
    $("tempMin").textContent   = formatTemp(currentTempMinC);
  }

  // Re-render forecast with new unit
  if (currentWeatherData) {
    getForecast(currentWeatherData.name);
  }
}

/* ================================================================
   FETCH WEATHER BY CITY NAME
================================================================ */
async function getWeather(city) {
  city = city.trim();
  if (!city) {
    showToast("⚠️ Please enter a city name.");
    return;
  }

  // Show loading with city name
  $("loadingCityName").textContent = "Searching for " + city + "...";
  showPage("loadingPage");
  startLoadingAnimation();

  try {
    const response = await fetch(
      `${BASE}/weather?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`
    );
    const data = await response.json();

    if (data.cod !== 200) {
      showPage("errorPage");
      return;
    }

    // Store state
    currentWeatherData = data;
    currentTempC       = data.main.temp;
    currentFeelsLikeC  = data.main.feels_like;
    currentTempMaxC    = data.main.temp_max;
    currentTempMinC    = data.main.temp_min;

    // Render and switch page
    renderWeather(data);
    getForecast(city);
    getHourlyForecast(city);
    showPage("resultPage");

  } catch (error) {
    console.error("Weather fetch error:", error);
    showPage("errorPage");
  }
}

/* ================================================================
   FETCH WEATHER BY COORDINATES (GPS Location)
================================================================ */
async function getWeatherByCoords(lat, lon) {
  $("loadingCityName").textContent = "Detecting your location...";
  showPage("loadingPage");
  startLoadingAnimation();

  try {
    const response = await fetch(
      `${BASE}/weather?lat=${lat}&lon=${lon}&units=metric&appid=${API_KEY}`
    );
    const data = await response.json();

    if (data.cod !== 200) {
      showPage("errorPage");
      return;
    }

    currentWeatherData = data;
    currentTempC       = data.main.temp;
    currentFeelsLikeC  = data.main.feels_like;
    currentTempMaxC    = data.main.temp_max;
    currentTempMinC    = data.main.temp_min;

    renderWeather(data);
    getForecast(data.name);
    getHourlyForecast(data.name);
    showPage("resultPage");

  } catch (error) {
    console.error("Coords fetch error:", error);
    showPage("errorPage");
  }
}

/* ================================================================
   RENDER WEATHER DATA INTO DOM
================================================================ */
function renderWeather(data) {
  // --- Location ---
  $("cityName").textContent    = data.name;
  $("countryBadge").textContent = data.sys?.country || "";

  // --- Temperature ---
  $("temp").textContent      = formatTemp(data.main.temp);
  $("feelsLike").textContent = "Feels like " + formatTemp(data.main.feels_like);
  $("tempMax").textContent   = formatTemp(data.main.temp_max);
  $("tempMin").textContent   = formatTemp(data.main.temp_min);

  // --- Condition ---
  const desc = data.weather[0].description;
  $("description").textContent       = desc;
  $("conditionBadge").textContent    = desc;

  // --- Weather Icon ---
  const iconCode = data.weather[0].icon;
  $("weatherIcon").src = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
  $("weatherIcon").alt = desc;

  // --- DateTime ---
  updateDateTime();

  // --- Stats ---
  $("humidity").textContent   = data.main.humidity + "%";
  $("windSpeed").textContent  = Math.round(data.wind.speed) + " m/s";
  $("windDir").textContent    = getWindDirection(data.wind.deg) + " " + (data.wind.deg || 0) + "°";
  $("windGust").textContent   = data.wind.gust ? Math.round(data.wind.gust) : "—";
  $("visibility").textContent = data.visibility ? (data.visibility / 1000).toFixed(1) + " km" : "—";
  $("pressure").textContent   = data.main.pressure + " hPa";
  $("cloudCover").textContent = data.clouds?.all + "%" || "—";

  // --- Progress Bars ---
  $("humidityBar").style.width = data.main.humidity + "%";
  $("cloudBar").style.width    = (data.clouds?.all || 0) + "%";

  // --- Sunrise / Sunset ---
  $("sunrise").textContent = formatUnixTime(data.sys.sunrise, data.timezone);
  $("sunset").textContent  = formatUnixTime(data.sys.sunset,  data.timezone);

  // --- Sea Level / Ground Level ---
  $("seaLevel").textContent  = data.main.sea_level   ? data.main.sea_level   + " hPa" : "—";
  $("groundLevel").textContent = data.main.grnd_level ? data.main.grnd_level + " hPa" : "—";

  // --- Location Info ---
  $("coordsDisplay").textContent   = `${data.coord.lat.toFixed(2)}°N, ${data.coord.lon.toFixed(2)}°E`;
  $("timezoneDisplay").textContent = formatTimezoneOffset(data.timezone);

  // --- Dew Point Estimate (Magnus formula approximation) ---
  const td = estimateDewPoint(data.main.temp, data.main.humidity);
  $("dewPoint").textContent = formatTemp(td);

  // --- UV Index ---
  renderUVIndex();

  // --- Favorites in result page ---
  renderFavsInResult();
}

/* ================================================================
   FETCH 5-DAY FORECAST
================================================================ */
async function getForecast(city) {
  try {
    const response = await fetch(
      `${BASE}/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`
    );
    const data = await response.json();

    if (data.cod !== "200") return;

    // Get one entry per day at 12:00
    const dailyList = data.list.filter(item => item.dt_txt.includes("12:00:00")).slice(0, 5);
    const container = $("forecastContainer");
    container.innerHTML = "";

    dailyList.forEach(day => {
      const date        = new Date(day.dt_txt);
      const dayName     = date.toDateString().slice(0, 3);
      const fullDate    = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const iconCode    = day.weather[0].icon;
      const description = day.weather[0].description;
      const hiTemp      = formatTemp(day.main.temp_max);
      const loTemp      = formatTemp(day.main.temp_min);
      const rainChance  = Math.round((day.pop || 0) * 100);

      const card = document.createElement("div");
      card.className = "fc-card";
      card.title = description;
      card.innerHTML = `
        <div class="fc-day">${dayName}</div>
        <div style="font-size:10px;color:var(--muted2);margin-bottom:6px;">${fullDate}</div>
        <img class="fc-img"
             src="https://openweathermap.org/img/wn/${iconCode}@2x.png"
             alt="${description}" />
        <div class="fc-hi">${hiTemp}</div>
        <div class="fc-lo">${loTemp}</div>
        <div class="fc-rain">💧 ${rainChance}%</div>
      `;
      container.appendChild(card);
    });

  } catch (error) {
    console.warn("Forecast unavailable:", error);
  }
}

/* ================================================================
   FETCH HOURLY FORECAST (next 24h = 8 slots of 3h each)
================================================================ */
async function getHourlyForecast(city) {
  try {
    const response = await fetch(
      `${BASE}/forecast?q=${encodeURIComponent(city)}&units=metric&appid=${API_KEY}`
    );
    const data = await response.json();

    if (data.cod !== "200") return;

    const hourlyList = data.list.slice(0, 8);  // 8 × 3h = 24 hours
    const container  = $("hourlyContainer");
    container.innerHTML = "";

    hourlyList.forEach(item => {
      const time       = new Date(item.dt_txt);
      const timeStr    = time.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
      const iconCode   = item.weather[0].icon;
      const temp       = formatTemp(item.main.temp);
      const rain       = Math.round((item.pop || 0) * 100);

      const card = document.createElement("div");
      card.className = "hr-card";
      card.innerHTML = `
        <div class="hr-time">${timeStr}</div>
        <img class="hr-img"
             src="https://openweathermap.org/img/wn/${iconCode}@2x.png"
             alt="weather" />
        <div class="hr-temp">${temp}</div>
        <div class="hr-rain">💧${rain}%</div>
      `;
      container.appendChild(card);
    });

  } catch (error) {
    console.warn("Hourly forecast unavailable:", error);
  }
}

/* ================================================================
   UV INDEX — rendered with simulated value (OpenWeatherMap UV
   requires a separate One Call API plan. Replace uvIndex below
   with a real API call if you have the One Call subscription.)
================================================================ */
function renderUVIndex() {
  // Simulated UV based on time of day and random for demo
  // Replace this with: GET /uvi?lat=...&lon=...&appid=...
  const hour = new Date().getHours();
  let uvIndex;
  if (hour < 6 || hour > 20)       uvIndex = 0;
  else if (hour < 9 || hour > 17)  uvIndex = Math.floor(Math.random() * 3) + 1;
  else if (hour < 11 || hour > 15) uvIndex = Math.floor(Math.random() * 4) + 3;
  else                              uvIndex = Math.floor(Math.random() * 5) + 5;

  let label, advice;
  if (uvIndex <= 2) {
    label  = "Low";
    advice = "No protection needed. Safe to be outside.";
  } else if (uvIndex <= 5) {
    label  = "Moderate";
    advice = "Wear sunscreen SPF 30+. Seek shade around midday.";
  } else if (uvIndex <= 7) {
    label  = "High";
    advice = "Wear sunscreen, a hat and sunglasses. Reduce time in sun.";
  } else if (uvIndex <= 10) {
    label  = "Very High";
    advice = "Extra protection required. Avoid being outside 10am–4pm.";
  } else {
    label  = "Extreme";
    advice = "Take all precautions — unprotected skin burns quickly!";
  }

  $("uvNumber").textContent    = uvIndex;
  $("uvLabelText").textContent = label;
  $("uvAdvice").textContent    = advice;

  // Needle position: 0–11 mapped to 0%–100%
  const pct = Math.min((uvIndex / 11) * 100, 97);
  $("uvNeedle").style.left = pct + "%";
}

/* ================================================================
   FAVORITES — SAVE / LOAD / RENDER
================================================================ */
function saveCity() {
  if (!currentWeatherData) {
    showToast("⚠️ Search a city first!");
    return;
  }

  const cityName = currentWeatherData.name;

  if (savedCities.includes(cityName)) {
    showToast("✅ " + cityName + " is already saved!");
    return;
  }

  savedCities.push(cityName);
  persistFavs();
  renderFavsInResult();
  renderFavsInPanel();
  showToast("⭐ " + cityName + " saved to favorites!");
}

function persistFavs() {
  localStorage.setItem("skycast_saved", JSON.stringify(savedCities));
}

function renderFavsInResult() {
  const row   = $("favsResultRow");
  const label = $("favsResultLabel");
  row.innerHTML = "";

  if (savedCities.length === 0) {
    label.style.display = "none";
    row.style.display   = "none";
    return;
  }

  label.style.display = "block";
  row.style.display   = "flex";

  savedCities.forEach(city => {
    const chip = document.createElement("button");
    chip.className   = "fav-chip";
    chip.textContent = "⭐ " + city;
    chip.onclick     = () => getWeather(city);
    row.appendChild(chip);
  });
}

function renderFavsInPanel() {
  const list     = $("favPanelList");
  const emptyMsg = $("favsEmptyMsg");
  list.innerHTML = "";

  if (savedCities.length === 0) {
    emptyMsg.classList.remove("hidden");
    return;
  }

  emptyMsg.classList.add("hidden");

  savedCities.forEach(city => {
    const chip = document.createElement("button");
    chip.className   = "city-pill";
    chip.textContent = "⭐ " + city;
    chip.onclick     = () => {
      closeFavPanel();
      getWeather(city);
    };
    list.appendChild(chip);
  });
}

/* ================================================================
   SHARE FUNCTIONALITY
================================================================ */
function buildShareText() {
  if (!currentWeatherData) return "";
  const d    = currentWeatherData;
  const temp = formatTemp(currentTempC);
  return (
    `🌤 SkyCast Weather Update\n` +
    `📍 ${d.name}, ${d.sys?.country || ""}\n` +
    `🌡 Temperature: ${temp}\n` +
    `☁️ Condition: ${d.weather[0].description}\n` +
    `💧 Humidity: ${d.main.humidity}%\n` +
    `💨 Wind: ${Math.round(d.wind.speed)} m/s\n` +
    `👁 Visibility: ${d.visibility ? (d.visibility / 1000).toFixed(1) + " km" : "N/A"}\n\n` +
    `Checked via SkyCast Weather App`
  );
}

function openShareModal() {
  if (!currentWeatherData) {
    showToast("⚠️ Search a city first!");
    return;
  }
  $("sharePreviewText").textContent = buildShareText();
  $("shareModal").classList.remove("hidden");
}

function closeShareModal() {
  $("shareModal").classList.add("hidden");
}

function shareVia(method) {
  const text = buildShareText();

  switch (method) {
    case "copy":
      navigator.clipboard.writeText(text)
        .then(() => { showToast("📋 Copied to clipboard!"); closeShareModal(); })
        .catch(() => { showToast("❌ Copy failed. Try again."); });
      break;

    case "whatsapp":
      window.open("https://wa.me/?text=" + encodeURIComponent(text), "_blank");
      closeShareModal();
      break;

    case "twitter":
      const tweet = `🌤 ${currentWeatherData.name}: ${formatTemp(currentTempC)}, ${currentWeatherData.weather[0].description}. #Weather #SkyCast`;
      window.open("https://twitter.com/intent/tweet?text=" + encodeURIComponent(tweet), "_blank");
      closeShareModal();
      break;

    case "telegram":
      window.open("https://t.me/share/url?url=https://skycast.app&text=" + encodeURIComponent(text), "_blank");
      closeShareModal();
      break;

    case "native":
      if (navigator.share) {
        navigator.share({ title: "SkyCast Weather", text })
          .then(() => closeShareModal())
          .catch(() => {});
      } else {
        showToast("ℹ️ Native share not supported in this browser.");
      }
      break;
  }
}

/* ================================================================
   COPY FULL DATA
================================================================ */
function copyFullData() {
  if (!currentWeatherData) {
    showToast("⚠️ Search a city first!");
    return;
  }
  const text = buildShareText();
  navigator.clipboard.writeText(text)
    .then(() => showToast("📋 Weather data copied!"))
    .catch(() => showToast("❌ Copy failed."));
}

/* ================================================================
   OPEN MAP
================================================================ */
function openMap() {
  if (!currentWeatherData) {
    showToast("⚠️ Search a city first!");
    return;
  }
  const { lat, lon } = currentWeatherData.coord;
  window.open(`https://www.google.com/maps/@${lat},${lon},11z`, "_blank");
}

/* ================================================================
   TOAST NOTIFICATION
================================================================ */
function showToast(message) {
  const t = $("toastBox");
  t.textContent = message;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2800);
}

/* ================================================================
   DATE / TIME DISPLAY
================================================================ */
function updateDateTime() {
  const now  = new Date();
  const opts = { weekday: "long", month: "long", day: "numeric", year: "numeric" };
  const date = now.toLocaleDateString("en-US", opts);
  const time = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  $("dateTime").textContent = date + " · " + time;
}

/* ================================================================
   UTILITY HELPERS
================================================================ */

// Convert Unix timestamp to local HH:MM using timezone offset (seconds)
function formatUnixTime(unixTime, timezoneOffset) {
  const utc   = unixTime + (new Date().getTimezoneOffset() * 60);
  const local = new Date((utc + timezoneOffset) * 1000);
  return local.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

// Format timezone offset in seconds to ±HH:MM
function formatTimezoneOffset(offsetSeconds) {
  const sign  = offsetSeconds >= 0 ? "+" : "-";
  const abs   = Math.abs(offsetSeconds);
  const hours = Math.floor(abs / 3600);
  const mins  = Math.floor((abs % 3600) / 60);
  return `UTC ${sign}${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

// Wind direction from degrees
function getWindDirection(deg) {
  if (deg == null) return "—";
  const dirs = ["N","NE","E","SE","S","SW","W","NW"];
  return dirs[Math.round(deg / 45) % 8];
}

// Dew point estimation (Magnus formula)
function estimateDewPoint(tempC, humidity) {
  const a  = 17.27;
  const b  = 237.7;
  const alpha = ((a * tempC) / (b + tempC)) + Math.log(humidity / 100);
  return (b * alpha) / (a - alpha);
}

// Loading bar animation kickoff
function startLoadingAnimation() {
  const bar = $("loadingBar");
  if (bar) {
    bar.style.animation = "none";
    void bar.offsetWidth; // reflow
    bar.style.animation = "";
  }
}

/* ================================================================
   ANIMATED STAR CANVAS BACKGROUND
================================================================ */
(function initStarCanvas() {
  const canvas = $("starsCanvas");
  const ctx    = canvas.getContext("2d");
  let W, H;

  // Each star has position, velocity, radius, opacity
  const stars = Array.from({ length: 140 }, () => ({
    x:  Math.random() * 3000,
    y:  Math.random() * 2000,
    r:  Math.random() * 1.6 + 0.2,
    vx: (Math.random() - 0.5) * 0.12,
    vy: (Math.random() - 0.5) * 0.12,
    o:  Math.random() * 0.55 + 0.08,
  }));

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }

  function drawFrame() {
    ctx.clearRect(0, 0, W, H);

    // Dark gradient background
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0,   "#06080f");
    grad.addColorStop(0.45, "#0b0d1a");
    grad.addColorStop(1,   "#070a14");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // Draw and move each star
    stars.forEach(s => {
      ctx.beginPath();
      ctx.arc(s.x % W, s.y % H, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(190, 210, 255, ${s.o})`;
      ctx.fill();
      s.x += s.vx;
      s.y += s.vy;

      // Subtle twinkling
      s.o += (Math.random() - 0.5) * 0.008;
      s.o  = Math.min(Math.max(s.o, 0.05), 0.65);
    });

    requestAnimationFrame(drawFrame);
  }

  resize();
  window.addEventListener("resize", resize);
  drawFrame();
})();

/* ================================================================
   FAVORITES PANEL (on search page)
================================================================ */
function openFavPanel() {
  renderFavsInPanel();
  $("favPanel").classList.remove("hidden");
}

function closeFavPanel() {
  $("favPanel").classList.add("hidden");
}

/* ================================================================
   EVENT LISTENERS — SEARCH PAGE
================================================================ */

// Search button click
$("searchBtn").addEventListener("click", () => {
  getWeather($("cityInput").value);
});

// Enter key in search input
$("cityInput").addEventListener("keypress", function (e) {
  if (e.key === "Enter") {
    getWeather(this.value);
  }
});

// Auto-clear placeholder on focus
$("cityInput").addEventListener("focus", function () {
  this.select();
});

// Detect location button
$("locationBtn").addEventListener("click", () => {
  if (!navigator.geolocation) {
    showToast("❌ Geolocation is not supported by your browser.");
    return;
  }
  showToast("📍 Detecting your location...");
  navigator.geolocation.getCurrentPosition(
    pos => getWeatherByCoords(pos.coords.latitude, pos.coords.longitude),
    err => {
      console.warn("Geolocation error:", err);
      showToast("❌ Location access denied. Please allow location permission.");
    },
    { timeout: 10000 }
  );
});

// Nav: Saved cities button
$("navFavsBtn").addEventListener("click", () => {
  if ($("favPanel").classList.contains("hidden")) {
    openFavPanel();
  } else {
    closeFavPanel();
  }
});

// Close favs panel button
$("closeFavsBtn").addEventListener("click", closeFavPanel);

// Theme toggle (brightness) — cosmetic effect
let brightnessOn = false;
$("themeToggleBtn").addEventListener("click", () => {
  brightnessOn = !brightnessOn;
  document.body.style.filter = brightnessOn ? "brightness(1.25) saturate(1.15)" : "";
  $("themeToggleBtn").textContent = brightnessOn ? "☀️" : "🌙";
});

/* ================================================================
   EVENT LISTENERS — RESULT PAGE
================================================================ */

// Refresh button
$("refreshBtn").addEventListener("click", () => {
  if (currentWeatherData) {
    getWeather(currentWeatherData.name);
  } else {
    showToast("⚠️ No city loaded yet.");
  }
});

// Share buttons (top navbar + bottom action tile)
$("shareTopBtn").addEventListener("click", openShareModal);
$("shareBtn2").addEventListener("click",   openShareModal);

// Save city button
$("saveFavBtn").addEventListener("click", saveCity);

// Map button
$("mapBtn").addEventListener("click", openMap);

// Copy data button
$("copyDataBtn").addEventListener("click", copyFullData);

/* ================================================================
   EVENT LISTENERS — SHARE MODAL
================================================================ */

// Close modal when clicking the dark overlay background
$("shareModal").addEventListener("click", function (e) {
  if (e.target === this) closeShareModal();
});

// Close modal on Escape key
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closeShareModal();
    closeFavPanel();
  }
});

/* ================================================================
   INITIALISATION — runs once on page load
================================================================ */
(function init() {
  // Make sure we start on the search page
  showPage("searchPage");

  // Render any saved cities into the panel
  renderFavsInPanel();

  // Update clock every minute if result is showing
  setInterval(() => {
    if (currentWeatherData) updateDateTime();
  }, 60000);

  // Focus search input immediately
  setTimeout(() => {
    const inp = $("cityInput");
    if (inp) inp.focus();
  }, 300);
})();
