/* =============================================
   WeatherSphere — API Module
   All OpenWeatherMap fetch calls
   ============================================= */

const API = {
  key: () => CONFIG.OWM_API_KEY,
  unit: () => AppState.unit === 'C' ? 'metric' : 'imperial',
  base: 'https://api.openweathermap.org/data/2.5',
  geo:  'https://api.openweathermap.org/geo/1.0',

  // ---- Build URL helper ----
  url(endpoint, params = {}) {
    const base = endpoint.startsWith('http') ? endpoint : this.base + endpoint;
    const p = new URLSearchParams({
      appid: this.key(),
      units: this.unit(),
      ...params
    });
    return `${base}?${p}`;
  },

  // ---- Generic fetch with error handling ----
  async fetch(url) {
    const res = await fetch(url);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || `HTTP ${res.status}`);
    }
    return res.json();
  },

  // ---- Current Weather by city name ----
  async getCurrentWeather(city) {
    return this.fetch(this.url('/weather', { q: city }));
  },

  // ---- Current Weather by coordinates ----
  async getCurrentWeatherByCoords(lat, lon) {
    return this.fetch(this.url('/weather', { lat, lon }));
  },

  // ---- 5-day / 3-hour Forecast ----
  async getForecast(city) {
    return this.fetch(this.url('/forecast', { q: city, cnt: 40 }));
  },

  async getForecastByCoords(lat, lon) {
    return this.fetch(this.url('/forecast', { lat, lon, cnt: 40 }));
  },

  // ---- Air Quality Index ----
  async getAQI(lat, lon) {
    return this.fetch(this.url('/air_pollution', { lat, lon }));
  },

  // ---- Geocoding: city name → coordinates ----
  async geocode(city, limit = 5) {
    return this.fetch(this.url(`${this.geo}/direct`, { q: city, limit }));
  },

  // ---- Reverse geocode: coords → city ----
  async reverseGeocode(lat, lon) {
    return this.fetch(this.url(`${this.geo}/reverse`, { lat, lon, limit: 1 }));
  },

  // ---- Map tile URL for Leaflet ----
  mapTileUrl(layer) {
    return `https://tile.openweathermap.org/map/${layer}/{z}/{x}/{y}.png?appid=${this.key()}`;
  },

  // ---- Weather for arbitrary lat/lon (for map click) ----
  async getWeatherAtPoint(lat, lon) {
    return this.getCurrentWeatherByCoords(lat, lon);
  },

  // ---- Load all dashboard data ----
  async loadAll(city) {

  // First get current weather
  const weather = await this.getCurrentWeather(city);

  // Extract coordinates
  const lat = weather.coord.lat;
  const lon = weather.coord.lon;

  // Now fetch forecast using coordinates
  const forecast = await this.getForecastByCoords(lat, lon);

  // AQI
  const aqi = await this.getAQI(lat, lon).catch(() => null);

  return {
    weather,
    forecast,
    aqi
  };
},

  // ---- Load all by coordinates ----
  async loadAllByCoords(lat, lon) {
    const [weather, forecast] = await Promise.all([
      this.getCurrentWeatherByCoords(lat, lon),
      this.getForecastByCoords(lat, lon),
    ]);
    const aqi = await this.getAQI(lat, lon).catch(() => null);
    return { weather, forecast, aqi };
  },
};