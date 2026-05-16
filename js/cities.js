/* =============================================
   WeatherSphere — Cities Module
   Multi-city pinned dashboard with drag & drop
   ============================================= */

const Cities = (() => {
  const STORAGE_KEY = 'ws_cities';
  let cities = [];
  let refreshTimer = null;
  let dragSrc = null;

  // ---- Load from localStorage ----
  function load() {
    try {
      cities = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch { cities = []; }
  }

  // ---- Save to localStorage ----
  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cities));
  }

  // ---- Fetch weather for one city ----
  async function fetchCity(city) {
    const data = await API.getCurrentWeather(city);
    return {
      name: data.name,
      country: data.sys.country,
      lat: data.coord.lat,
      lon: data.coord.lon,
      temp: Math.round(data.main.temp),
      condition: data.weather[0].description,
      icon: UI.getWeatherIcon(data.weather[0].id),
      iconId: data.weather[0].id,
      timezone: data.timezone,
    };
  }

  // ---- Render all city cards ----
  function renderAll() {
    const grid = document.getElementById('citiesGrid');
    const empty = document.getElementById('emptyCities');

    if (cities.length === 0) {
      grid.innerHTML = '';
      grid.appendChild(empty);
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    grid.innerHTML = '';

    cities.forEach((city, idx) => renderCard(city, idx));
    initDragDrop();
  }

  // ---- Render one city card ----
  function renderCard(city, idx) {
    const grid = document.getElementById('citiesGrid');
    const card = document.createElement('div');
    card.className = 'city-card';
    card.dataset.idx = idx;
    card.draggable = true;

    // Local time
    const now = new Date((Date.now() / 1000 + city.timezone) * 1000);
    const localTime = now.toUTCString().slice(17, 22) + ' local';

    card.innerHTML = `
      <div class="city-card-header">
        <div>
          <div class="city-card-name">${city.name}</div>
          <div class="city-card-country">${city.country}</div>
        </div>
        <button class="city-card-remove" onclick="Cities.remove(${idx})" title="Remove city" aria-label="Remove ${city.name}">✕</button>
      </div>
      <div class="city-card-body">
        <div>
          <div class="city-card-temp">${city.temp}°</div>
          <div class="city-card-condition">${city.condition}</div>
          <div class="city-card-time">${localTime}</div>
        </div>
        <div class="city-card-icon">${city.icon}</div>
      </div>`;

    grid.appendChild(card);
  }

  // ---- Drag & Drop ----
  function initDragDrop() {
    const cards = document.querySelectorAll('.city-card');
    cards.forEach(card => {
      card.addEventListener('dragstart', e => {
        dragSrc = card;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', () => {
        cards.forEach(c => c.classList.remove('dragging', 'drag-over'));
        dragSrc = null;
      });
      card.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (card !== dragSrc) card.classList.add('drag-over');
      });
      card.addEventListener('dragleave', () => card.classList.remove('drag-over'));
      card.addEventListener('drop', e => {
        e.preventDefault();
        if (dragSrc && dragSrc !== card) {
          const fromIdx = parseInt(dragSrc.dataset.idx);
          const toIdx   = parseInt(card.dataset.idx);
          const [moved] = cities.splice(fromIdx, 1);
          cities.splice(toIdx, 0, moved);
          save();
          renderAll();
        }
      });
    });
  }

  // ---- Refresh all cities weather ----
  async function refreshAll() {
    const updated = await Promise.allSettled(cities.map(c => fetchCity(c.name)));
    updated.forEach((result, i) => {
      if (result.status === 'fulfilled') cities[i] = { ...cities[i], ...result.value };
    });
    save();
    renderAll();
  }

  return {
    init() {
      load();
      renderAll();
      // Auto-refresh cities every 5 minutes
      refreshTimer = setInterval(refreshAll, CONFIG.CITIES_REFRESH);
    },

    async add(cityName) {
      if (!cityName.trim()) return;
      if (cities.length >= CONFIG.MAX_CITIES) {
        UI.showError(`Maximum ${CONFIG.MAX_CITIES} cities allowed`);
        return;
      }
      if (cities.some(c => c.name.toLowerCase() === cityName.toLowerCase())) {
        UI.showError(`${cityName} is already pinned`);
        return;
      }
      try {
        const city = await fetchCity(cityName);
        cities.push(city);
        save();
        renderAll();
      } catch (e) {
        UI.showError(`City "${cityName}" not found`);
      }
    },

    remove(idx) {
      cities.splice(idx, 1);
      save();
      renderAll();
    },

    refresh: refreshAll,
  };
})();

// Global for HTML onclick
function addCity() {
  const input = document.getElementById('addCityInput');
  Cities.add(input.value);
  input.value = '';
}