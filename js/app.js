/* =============================================
   WeatherSphere — Main App
   Entry point, state, search, tabs, init
   ============================================= */

// ---- Global App State ----
const AppState = {
  unit: localStorage.getItem('ws_unit') || 'C',
  currentCity: null,
  currentWeather: null,
  currentForecast: null,
  uvIndex: undefined,
  recentSearches: JSON.parse(localStorage.getItem('ws_recent') || '[]'),
  loading: false,
  refreshTimer: null,
};

// ---- Load weather for a city ----
async function loadWeather(city, showLoading = true) {
  if (AppState.loading) return;
  AppState.loading = true;

  if (showLoading) UI.showHeroLoading();
  closeSuggestions();

  try {
    const { weather, forecast, aqi } = await API.loadAll(city);

    AppState.currentCity     = weather.name;
    AppState.currentWeather  = weather;
    AppState.currentForecast = forecast;
    AppState.uvIndex         = undefined; // UV requires One Call API (paid)

    // Render UI
    UI.renderHero(weather, aqi);
    UI.renderHourly(forecast);
    UI.renderWeekly(forecast);
    Charts.render(forecast);
    WeatherAnimations.set(weather.weather[0].id, weather.weather[0].main);
    Alerts.check(weather);

    // Save to recent
    addRecentSearch(weather.name);

    // Auto-refresh
    clearInterval(AppState.refreshTimer);
    AppState.refreshTimer = setInterval(() => loadWeather(AppState.currentCity, false), CONFIG.REFRESH_INTERVAL);

  } catch (err) {
    console.error('loadWeather error:', err);
    UI.showError(`Could not find weather for "${city}". Please try again.`);
  } finally {
    AppState.loading = false;
  }
}

// ---- Load weather by GPS coordinates ----
async function loadWeatherByCoords(lat, lon) {
  if (AppState.loading) return;
  AppState.loading = true;
  UI.showHeroLoading();

  try {
    const { weather, forecast, aqi } = await API.loadAllByCoords(lat, lon);
    AppState.currentCity     = weather.name;
    AppState.currentWeather  = weather;
    AppState.currentForecast = forecast;

    UI.renderHero(weather, aqi);
    UI.renderHourly(forecast);
    UI.renderWeekly(forecast);
    Charts.render(forecast);
    WeatherAnimations.set(weather.weather[0].id, weather.weather[0].main);
    Alerts.check(weather);
    addRecentSearch(weather.name);

    clearInterval(AppState.refreshTimer);
    AppState.refreshTimer = setInterval(() => loadWeather(AppState.currentCity, false), CONFIG.REFRESH_INTERVAL);
  } catch (err) {
    console.error('loadWeatherByCoords error:', err);
    UI.showError('Could not get weather for your location.');
  } finally {
    AppState.loading = false;
  }
}

// ---- Geolocation ----
function getLocation() {
  if (!navigator.geolocation) {
    UI.showError('Geolocation not supported by your browser');
    return;
  }
  const btn = document.getElementById('locateBtn');
  btn.style.animation = 'spin 1s linear infinite';

  navigator.geolocation.getCurrentPosition(
    pos => {
      btn.style.animation = '';
      loadWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
    },
    () => {
      btn.style.animation = '';
      UI.showError('Could not get your location. Please search manually.');
    },
    { timeout: 8000 }
  );
}

// ---- Recent searches ----
function addRecentSearch(city) {
  AppState.recentSearches = [city, ...AppState.recentSearches.filter(c => c !== city)]
    .slice(0, CONFIG.MAX_RECENT);
  localStorage.setItem('ws_recent', JSON.stringify(AppState.recentSearches));
}

function renderRecentSearches() {
  const container = document.getElementById('recentSearches');
  if (!AppState.recentSearches.length) { container.style.display = 'none'; return; }
  container.style.display = 'block';
  container.innerHTML = `
    <div style="padding:10px 16px 6px;font-size:0.75rem;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">Recent</div>
    ${AppState.recentSearches.map(c => `
      <div class="recent-item" onclick="selectCity('${c}')">
        <span>🕐</span> ${c}
      </div>`).join('')}`;
}

function selectCity(city) {
  document.getElementById('searchInput').value = city;
  document.getElementById('recentSearches').style.display = 'none';
  loadWeather(city);
}

// ---- City search autocomplete (header bar) ----
let searchTimer = null;
async function handleSearch(e) {
  const q = e.target.value.trim();
  const sugEl = document.getElementById('searchSuggestions');

  if (e.key === 'Enter' && q.length >= 2) {
    loadWeather(q);
    return;
  }
  if (q.length < 2) { sugEl.classList.remove('visible'); return; }

  clearTimeout(searchTimer);
  searchTimer = setTimeout(async () => {
    try {
      const results = await API.geocode(q, 5);
      if (!results.length) { sugEl.classList.remove('visible'); return; }
      sugEl.innerHTML = results.map(r => `
        <div class="suggestion-item" onclick="selectCity('${[r.name, r.state, r.country].filter(Boolean).join(', ')}')">
          <span>📍</span>
          <span>${r.name}${r.state ? ', ' + r.state : ''}, ${r.country}</span>
        </div>`).join('');
      sugEl.classList.add('visible');
    } catch { sugEl.classList.remove('visible'); }
  }, 300);
}

function closeSuggestions() {
  document.getElementById('searchSuggestions').classList.remove('visible');
  document.getElementById('recentSearches').style.display = 'none';
}

// ---- Temperature unit toggle ----
function setUnit(unit) {
  AppState.unit = unit;
  localStorage.setItem('ws_unit', unit);
  document.getElementById('btnCelsius').classList.toggle('active', unit === 'C');
  document.getElementById('btnFahrenheit').classList.toggle('active', unit === 'F');
  if (AppState.currentCity) loadWeather(AppState.currentCity, false);
}

// ---- Tab switching ----
function switchTab(tabId) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
  document.getElementById(`tab-${tabId}`).classList.add('active');
  document.querySelector(`[data-tab="${tabId}"]`).classList.add('active');

  if (tabId === 'map')    WeatherMap.activate();
  if (tabId === 'cities') Cities.refresh();
}

// ---- Init ----
function init() {
  // Apply stored unit
  if (AppState.unit === 'F') {
    document.getElementById('btnFahrenheit').classList.add('active');
    document.getElementById('btnCelsius').classList.remove('active');
  }

  // Header search input events
  const input = document.getElementById('searchInput');
  input.addEventListener('keyup', handleSearch);
  input.addEventListener('focus', () => {
    if (!input.value) renderRecentSearches();
  });

  // Close suggestions on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrapper')) closeSuggestions();
  });

  // Locate button
  document.getElementById('locateBtn').addEventListener('click', getLocation);

  // Add city input — Enter key
  const addCityInput = document.getElementById('addCityInput');
  if (addCityInput) {
    addCityInput.addEventListener('keyup', e => { if (e.key === 'Enter') addCity(); });
  }

  // Travel date defaults
  const today    = new Date().toISOString().split('T')[0];
  const nextWeek = new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0];
  const travelStart = document.getElementById('travelStart');
  const travelEnd   = document.getElementById('travelEnd');
  if (travelStart) { travelStart.value = today; travelStart.min = today; }
  if (travelEnd)   { travelEnd.value = nextWeek; travelEnd.min = today; }

  // Init modules
  Alerts.init();
  Cities.init();
  Travel.init(); // ← FIX: wire up travel city autocomplete

  // Load default/first city
  const lastCity = AppState.recentSearches[0] || CONFIG.DEFAULT_CITY;
  loadWeather(lastCity);

  // CSS spin keyframe for locate button
  const style = document.createElement('style');
  style.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
  document.head.appendChild(style);

  console.log('%c🌦️ WeatherSphere loaded!', 'color:#38bdf8;font-size:1.2rem;font-weight:bold;');
}

// ---- Start ----
document.addEventListener('DOMContentLoaded', init);

// =============================================
// Register Service Worker
// =============================================

if ('serviceWorker' in navigator) {

  window.addEventListener('load', () => {

    navigator.serviceWorker
      .register('./sw.js')

      .then(() => {
        console.log('Service Worker Registered');
      })

      .catch(err => {
        console.log('SW registration failed', err);
      });

  });
}