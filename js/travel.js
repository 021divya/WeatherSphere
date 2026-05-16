/* =============================================
   WeatherSphere — Travel Planner Module
   Trip weather + AI packing list via Claude API
   FIX 1: City input now has autocomplete dropdown (same as main search)
   FIX 2: Geocode city first → use coords for forecast (accurate data)
   ============================================= */

const Travel = (() => {

  // ---- Autocomplete state ----
  let _travelSearchTimer = null;
  let _selectedCoords = null; // { lat, lon, name } once user picks from dropdown

  // ---- Init travel city autocomplete ----
  function initCityAutocomplete() {
    const input  = document.getElementById('travelCity');
    const sugEl  = document.getElementById('travelCitySuggestions');
    if (!input || !sugEl) return;

    input.addEventListener('input', () => {
      const q = input.value.trim();
      _selectedCoords = null; // reset whenever user types
      if (q.length < 2) { hideSuggestions(sugEl); return; }

      clearTimeout(_travelSearchTimer);
      _travelSearchTimer = setTimeout(async () => {
        try {
          const results = await API.geocode(q, 5);
          if (!results.length) { hideSuggestions(sugEl); return; }

          sugEl.innerHTML = results.map(r => {
            const label = [r.name, r.state, r.country].filter(Boolean).join(', ');
            return `
              <div class="suggestion-item travel-suggestion-item"
                   data-lat="${r.lat}" data-lon="${r.lon}" data-name="${label}"
                   onclick="Travel._pickCity('${label}', ${r.lat}, ${r.lon})">
                <span>📍</span>
                <span>${label}</span>
              </div>`;
          }).join('');
          sugEl.classList.add('visible');
        } catch {
          hideSuggestions(sugEl);
        }
      }, 300);
    });

    input.addEventListener('keydown', e => {
      if (e.key === 'Escape') hideSuggestions(sugEl);
      if (e.key === 'Enter') {
        // If user hits Enter without picking, geocode and pick first result
        hideSuggestions(sugEl);
      }
    });

    // Close on outside click
    document.addEventListener('click', e => {
      if (!e.target.closest('.travel-city-wrapper')) hideSuggestions(sugEl);
    });
  }

  function hideSuggestions(el) {
    if (el) el.classList.remove('visible');
  }

  // ---- Called when user clicks a suggestion ----
  function _pickCity(label, lat, lon) {
    document.getElementById('travelCity').value = label;
    _selectedCoords = { lat, lon, name: label };
    const sugEl = document.getElementById('travelCitySuggestions');
    hideSuggestions(sugEl);
  }

  // ---- Call Claude API for packing suggestions ----
  async function getAIPacking(destination, forecastSummary) {
    if (!CONFIG.ANTHROPIC_API_KEY) {
      return generateMockPacking(forecastSummary);
    }

    const prompt = `You are a smart travel packing assistant.

Destination: ${destination}
Weather Forecast:
${forecastSummary}

Generate a detailed packing list organized into categories based on this forecast.
Be specific and practical. Include weather-specific items prominently.

Respond ONLY with a JSON object (no markdown) like:
{
  "summary": "One sentence trip weather summary",
  "categories": [
    {
      "name": "Clothing",
      "emoji": "👕",
      "items": ["item1", "item2"]
    }
  ],
  "tip": "One key travel tip based on the weather"
}`;

    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': CONFIG.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });
      const data = await res.json();
      const text = data.content?.[0]?.text || '';
      return JSON.parse(text.replace(/```json|```/g, '').trim());
    } catch {
      return generateMockPacking(forecastSummary);
    }
  }

  // ---- Smart mock packing (no Anthropic API key needed) ----
  function generateMockPacking(summary) {
    const s       = summary.toLowerCase();
    const hasRain = s.includes('rain') || s.includes('drizzle') || s.includes('shower');
    const hasSnow = s.includes('snow');
    const hasHot  = s.includes('hot') || /3[5-9]|4\d/.test(summary);
    const hasCold = s.includes('cold') || hasSnow || /^-?\d/.test(summary);
    const hasSun  = s.includes('clear') || s.includes('sunny');

    const categories = [
      {
        name: 'Clothing Essentials', emoji: '👕',
        items: ['Comfortable walking shoes', 'Casual t-shirts', 'Underwear & socks',
                hasCold ? 'Warm sweater / fleece' : 'Light breathable tops',
                hasHot  ? 'Shorts & summer clothes' : 'Trousers / jeans'],
      },
    ];

    if (hasRain) categories.push({
      name: 'Rain Gear', emoji: '☂️',
      items: ['Compact travel umbrella', 'Waterproof jacket / raincoat', 'Waterproof shoes', 'Dry bag for electronics'],
    });
    if (hasSnow) categories.push({
      name: 'Cold Weather', emoji: '🧣',
      items: ['Heavy winter coat', 'Thermal underwear', 'Gloves & mittens', 'Warm hat / beanie', 'Snow boots', 'Hand warmers'],
    });
    if (hasSun) categories.push({
      name: 'Sun Protection', emoji: '🕶️',
      items: ['Sunscreen SPF 50+', 'Sunglasses', 'Wide-brim hat', 'Lip balm with SPF'],
    });

    categories.push({
      name: 'Travel Tech', emoji: '🔌',
      items: ['Universal power adapter', 'Portable charger / power bank', 'Phone & charging cable', 'Earphones'],
    });
    categories.push({
      name: 'Health & Comfort', emoji: '💊',
      items: ['Personal medications', 'Pain relievers', 'Hand sanitizer', 'Travel-sized toiletries', 'Reusable water bottle'],
    });

    return {
      summary: hasRain ? 'Your trip has rain expected — pack accordingly.' :
               hasSun  ? 'Your trip has mostly sunny skies ahead!' :
                         'Your trip has mixed weather — be prepared for changes.',
      categories,
      tip: hasRain ? '🌂 Keep your umbrella accessible — not buried in your bag.' :
           hasHot  ? '💧 Stay hydrated and carry a water bottle everywhere.' :
           hasCold ? '🧤 Layer up — easier to remove layers than to add them.' :
                     '📦 Pack light — you can always buy things you forgot!',
    };
  }

  // ---- Build forecast summary string for AI ----
  function buildForecastSummary(forecastItems) {
    return forecastItems.map((item, i) => {
      const d    = new Date(item.dt * 1000);
      const date = d.toDateString();
      const temp = Math.round(item.main.temp);
      const sym  = AppState.unit === 'C' ? '°C' : '°F';
      const cond = item.weather[0].description;
      const rain = item.pop ? `${Math.round(item.pop * 100)}% rain chance` : 'dry';
      return `Day ${i + 1} (${date}): ${temp}${sym}, ${cond}, ${rain}`;
    }).join('\n');
  }

  // ---- Render trip day cards ----
  function renderForecastCards(items) {
    const container = document.getElementById('travelForecast');
    container.innerHTML = items.map(item => {
      const d    = new Date(item.dt * 1000);
      const date = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
      const icon = UI.getWeatherIcon(item.weather[0].id);
      const temp = UI.fmtTemp(item.main.temp);
      const desc = item.weather[0].main;
      const rain = item.pop ? `💧 ${Math.round(item.pop * 100)}%` : '';
      return `
        <div class="travel-day-card glass-card">
          <div class="travel-day-date">${date}</div>
          <div class="travel-day-icon">${icon}</div>
          <div class="travel-day-temp">${temp}</div>
          <div class="travel-day-desc">${desc} ${rain}</div>
        </div>`;
    }).join('');
  }

  // ---- Render summary stats ----
  function renderSummary(items) {
    const temps    = items.map(i => i.main.temp);
    const avg      = Math.round(temps.reduce((a, b) => a + b, 0) / temps.length);
    const max      = Math.round(Math.max(...temps));
    const min      = Math.round(Math.min(...temps));
    const rainDays = items.filter(i => (i.pop || 0) > 0.3).length;
    const sym      = AppState.unit === 'C' ? '°C' : '°F';

    document.getElementById('travelSummary').innerHTML = `
      <div class="summary-stat"><div class="stat-number">${avg}${sym}</div><div class="stat-label">Avg Temp</div></div>
      <div class="summary-stat"><div class="stat-number">${max}${sym}</div><div class="stat-label">Hottest Day</div></div>
      <div class="summary-stat"><div class="stat-number">${min}${sym}</div><div class="stat-label">Coolest Day</div></div>
      <div class="summary-stat"><div class="stat-number">${rainDays}</div><div class="stat-label">Rainy Days</div></div>
      <div class="summary-stat"><div class="stat-number">${items.length}</div><div class="stat-label">Days Planned</div></div>`;
  }

  // ---- Render AI packing list ----
  function renderPacking(data) {
    const listEl = document.getElementById('packingList');
    const loadEl = document.getElementById('aiLoading');
    loadEl.classList.add('hidden');

    let html = '';
    if (data.summary) {
      html += `<p style="color:var(--accent-blue);font-size:0.95rem;margin-bottom:16px;">💬 ${data.summary}</p>`;
    }
    if (data.tip) {
      html += `<div style="background:rgba(56,189,248,0.08);border:1px solid rgba(56,189,248,0.2);border-radius:10px;padding:12px 16px;margin-bottom:18px;font-size:0.88rem;color:var(--text-secondary)">${data.tip}</div>`;
    }

    (data.categories || []).forEach(cat => {
      html += `
        <div class="packing-category">
          <h4>${cat.emoji || ''} ${cat.name}</h4>
          <div class="packing-items">
            ${(cat.items || []).map(item => `<span class="packing-tag">✓ ${item}</span>`).join('')}
          </div>
        </div>`;
    });

    listEl.innerHTML = html;
  }

  // ---- Main plan function ----
  async function plan(destination, startDate, endDate) {
    if (!destination || !startDate || !endDate) {
      UI.showError('Please fill in all fields');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      UI.showError('End date must be after start date');
      return;
    }

    const resultsEl = document.getElementById('travelResults');
    const loadEl    = document.getElementById('aiLoading');
    const listEl    = document.getElementById('packingList');

    resultsEl.classList.remove('hidden');
    loadEl.classList.remove('hidden');
    listEl.innerHTML = '';

    try {
      let forecast;

      // FIX: Use stored coords if user picked from dropdown, otherwise geocode first
      if (_selectedCoords) {
        forecast = await API.getForecastByCoords(_selectedCoords.lat, _selectedCoords.lon);
      } else {
        // Geocode the typed city name to get accurate coords
        const geo = await API.geocode(destination, 1);
        if (!geo || !geo.length) throw new Error('City not found');
        forecast = await API.getForecastByCoords(geo[0].lat, geo[0].lon);
      }

      // Filter to trip date range — one entry per day (prefer noon slot)
      const startTs = new Date(startDate).getTime() / 1000;
      const endTs   = new Date(endDate).getTime() / 1000 + 86400;

      const dayMap = {};
      forecast.list.forEach(item => {
        if (item.dt < startTs || item.dt > endTs) return;
        const day  = new Date(item.dt * 1000).toDateString();
        const hour = new Date(item.dt * 1000).getHours();
        // Prefer the slot closest to noon
        if (!dayMap[day] || Math.abs(hour - 12) < Math.abs(new Date(dayMap[day].dt * 1000).getHours() - 12)) {
          dayMap[day] = item;
        }
      });

      let tripItems = Object.values(dayMap);

      // Fallback: if date range is beyond 5-day forecast window, take first 5 noon-ish slots
      if (tripItems.length === 0) {
        tripItems = forecast.list.filter((_, i) => i % 8 === 4).slice(0, 5);
      }

      if (tripItems.length === 0) {
        throw new Error('No forecast data for selected dates');
      }

      renderSummary(tripItems);
      renderForecastCards(tripItems);

      const summary = buildForecastSummary(tripItems);
      const packing = await getAIPacking(destination, summary);
      renderPacking(packing);

    } catch (e) {
      UI.showError(`Could not load forecast for "${destination}". ${e.message || ''}`);
      loadEl.classList.add('hidden');
    }
  }

  return {
    init: initCityAutocomplete,
    plan,
    _pickCity, // exposed for inline onclick
  };
})();

// ---- Global for HTML onclick ----
async function planTrip() {
  const city  = document.getElementById('travelCity').value.trim();
  const start = document.getElementById('travelStart').value;
  const end   = document.getElementById('travelEnd').value;
  await Travel.plan(city, start, end);
}