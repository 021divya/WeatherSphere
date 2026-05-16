/* =============================================
   WeatherSphere — UI Module
   All DOM update / render functions
   ============================================= */

const UI = {

  // ---- Weather condition → emoji icon ----
  getWeatherIcon(id, isDay = true) {
    if (id >= 200 && id < 300) return '⛈️';
    if (id >= 300 && id < 400) return '🌦️';
    if (id >= 500 && id < 600) {
      if (id === 511) return '🌨️';
      if (id >= 502) return '🌧️';
      return '🌦️';
    }
    if (id >= 600 && id < 700) return '❄️';
    if (id === 701 || id === 721) return '🌫️';
    if (id >= 700 && id < 800) return '🌁';
    if (id === 800) return isDay ? '☀️' : '🌙';
    if (id === 801) return isDay ? '🌤️' : '🌙';
    if (id === 802) return '⛅';
    if (id >= 803) return '☁️';
    return '🌡️';
  },

  // ---- AQI label ----
  getAQILabel(aqi) {
    const labels = ['', 'Good', 'Fair', 'Moderate', 'Poor', 'Very Poor'];
    const colors = ['', '#34d399', '#fbbf24', '#f97316', '#f87171', '#dc2626'];
    return {
      text: labels[aqi] || '—',
      color: colors[aqi] || 'inherit',
    };
  },

  // ---- UV Index label ----
  getUVLabel(uvi) {
    if (uvi <= 2)  return { text: `${uvi} Low`,       color: '#34d399' };
    if (uvi <= 5)  return { text: `${uvi} Moderate`,  color: '#fbbf24' };
    if (uvi <= 7)  return { text: `${uvi} High`,      color: '#f97316' };
    if (uvi <= 10) return { text: `${uvi} Very High`, color: '#f87171' };
    return { text: `${uvi} Extreme`, color: '#dc2626' };
  },

  // ---- Format temperature with unit symbol ----
  fmtTemp(t) {
    const deg = Math.round(t);
    const sym = AppState.unit === 'C' ? '°C' : '°F';
    return `${deg}${sym}`;
  },

  // ---- Format wind with direction ----
  fmtWind(speed, deg) {
    const dirs = ['N','NE','E','SE','S','SW','W','NW'];
    const dir = dirs[Math.round(deg / 45) % 8];
    const unit = AppState.unit === 'C' ? 'km/h' : 'mph';
    // OWM returns m/s in metric mode, convert to km/h
    const val = AppState.unit === 'C' ? Math.round(speed * 3.6) : Math.round(speed * 2.237);
    return `${val} ${unit} ${dir}`;
  },

  // ---- Format unix timestamp to HH:MM using city timezone offset ----
  // FIX: OWM timezone is seconds offset from UTC. We compute local time correctly.
  fmtTime(unix, timezone = 0) {
    // unix is UTC seconds, timezone is offset in seconds
    const localMs = (unix + timezone) * 1000;
    const d = new Date(localMs);
    // Use UTC methods since we've already added the offset
    const h = String(d.getUTCHours()).padStart(2, '0');
    const m = String(d.getUTCMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  },

  // ---- Sun progress position ----
  updateSunProgress(sunrise, sunset) {
    const now = Date.now() / 1000;
    const total = sunset - sunrise;
    const elapsed = now - sunrise;
    let pct = Math.min(Math.max(elapsed / total, 0), 1) * 100;
    const el = document.getElementById('sunProgress');
    if (el) el.style.left = `${pct}%`;
  },
// ---- Animate temperature counter ----
animateTemperature(el, value) {

  // Prevent multiple animations
  if (el._tempInterval) {
    clearInterval(el._tempInterval);
  }

  let current = 0;

  const increment = value / 30;

  el._tempInterval = setInterval(() => {

    current += increment;

    if (current >= value) {
      current = value;
      clearInterval(el._tempInterval);
    }

    el.textContent = `${Math.round(current)}°`;

  }, 20);
},

  // ---- Render hero card ----
  renderHero(weather, aqi) {
    const w = weather.weather[0];
    const nowSec = Date.now() / 1000;
    const isDay = nowSec > weather.sys.sunrise && nowSec < weather.sys.sunset;
    const icon  = this.getWeatherIcon(w.id, isDay);
    const tz    = weather.timezone;
    applyWeatherTheme(w.id);

    // City & meta
    document.getElementById('cityName').textContent = weather.name;
    document.getElementById('cityMeta').textContent =
      `${weather.sys.country} · ${weather.coord.lat.toFixed(2)}°N, ${weather.coord.lon.toFixed(2)}°E`;

    // Live clock
    this.startClock(tz);

    // Temperature
    const realTemp = Math.round(weather.main.temp);

    const tempEl = document.getElementById('tempMain');

    this.animateTemperature(tempEl, realTemp);
    document.getElementById('tempFeels').textContent = `Feels like ${this.fmtTemp(weather.main.feels_like)}`;
    document.getElementById('tempRange').textContent =
      `↓ ${this.fmtTemp(weather.main.temp_min)}  ↑ ${this.fmtTemp(weather.main.temp_max)}`;

    // Condition badge
    document.getElementById('conditionBadge').innerHTML =
      `${icon} ${w.description.replace(/\b\w/g, c => c.toUpperCase())}`;

    // Icon
    document.getElementById('weatherIconLarge').textContent = icon;

    // Stats
    document.getElementById('statHumidity').textContent = `${weather.main.humidity}%`;
    document.getElementById('statWind').textContent = this.fmtWind(weather.wind.speed, weather.wind.deg);
    document.getElementById('statVisibility').textContent = weather.visibility
      ? `${(weather.visibility / 1000).toFixed(1)} km` : '—';
    document.getElementById('statPressure').textContent = `${weather.main.pressure} hPa`;

    // AQI
    if (aqi && aqi.list && aqi.list[0]) {
      const aqiVal = aqi.list[0].main.aqi;
      const label = this.getAQILabel(aqiVal);
      const el = document.getElementById('statAQI');
      el.textContent = label.text;
      el.style.color = label.color;
    } else {
      document.getElementById('statAQI').textContent = '—';
    }

    // Sun times
    document.getElementById('sunriseTime').textContent = this.fmtTime(weather.sys.sunrise, tz);
    document.getElementById('sunsetTime').textContent  = this.fmtTime(weather.sys.sunset, tz);
    this.updateSunProgress(weather.sys.sunrise, weather.sys.sunset);

    // Hero card weather class
    const card = document.getElementById('heroCard');
    ['weather-sunny','weather-cloudy','weather-rainy','weather-stormy','weather-snowy','weather-foggy']
      .forEach(c => card.classList.remove(c));
    if (w.id >= 200 && w.id < 300)      card.classList.add('weather-stormy');
    else if (w.id >= 300 && w.id < 600) card.classList.add('weather-rainy');
    else if (w.id >= 600 && w.id < 700) card.classList.add('weather-snowy');
    else if (w.id >= 700 && w.id < 800) card.classList.add('weather-foggy');
    else if (w.id === 800)              card.classList.add('weather-sunny');
    else                                card.classList.add('weather-cloudy');

    // UV Index
    const uvEl = document.getElementById('statUV');
    if (AppState.uvIndex !== undefined && AppState.uvIndex !== null) {
      const uv = this.getUVLabel(AppState.uvIndex);
      uvEl.textContent = uv.text;
      uvEl.style.color = uv.color;
    } else {
      uvEl.textContent = '—';
    }
  },

  // ---- Live clock for current city ----
  startClock(timezone) {
    if (this._clockInterval) clearInterval(this._clockInterval);
    const tick = () => {
      const localMs = (Date.now() / 1000 + timezone) * 1000;
      const d = new Date(localMs);
      const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
      const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const dayName = days[d.getUTCDay()];
      const day = d.getUTCDate();
      const month = months[d.getUTCMonth()];
      const year = d.getUTCFullYear();
      const h = String(d.getUTCHours()).padStart(2, '0');
      const m = String(d.getUTCMinutes()).padStart(2, '0');
      const el = document.getElementById('localTime');
      if (el) el.textContent = `🕐 ${dayName}, ${day} ${month} ${year} ${h}:${m}`;
    };
    tick();
    this._clockInterval = setInterval(tick, 1000);
  },

  // ---- Render 3-hourly forecast ----
  // FIX: was targeting '3-hourlyForecast' but HTML id is 'hourlyForecast'
  renderHourly(forecast) {
    const container = document.getElementById('hourlyForecast'); // ← FIXED ID
    if (!container) return;
    const items = forecast.list.slice(0, 12);

    container.innerHTML = items.map((item, i) => {
      const icon = this.getWeatherIcon(item.weather[0].id);
      const time = i === 0 ? 'Now' : this.fmtTime(item.dt, forecast.city.timezone);
      const rain = item.pop ? `💧 ${Math.round(item.pop * 100)}%` : '';
      return `
        <div class="hourly-item ${i === 0 ? 'now' : ''}">
          <span class="hourly-time">${time}</span>
          <span class="hourly-icon">${icon}</span>
          <span class="hourly-temp">${Math.round(item.main.temp)}°</span>
          <span class="hourly-rain">${rain}</span>
        </div>`;
    }).join('');
  },

  // ---- Render 5-day forecast ----
  renderWeekly(forecast) {
    const container = document.getElementById('weeklyForecast');
    if (!container) return;
    const days = {};
    const dayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

    forecast.list.forEach(item => {
      const d = new Date(item.dt * 1000);
      const key = d.toDateString();
      if (!days[key]) {
        days[key] = { dt: item.dt, day: dayNames[d.getDay()], items: [], high: -999, low: 999 };
      }
      days[key].items.push(item);
      days[key].high = Math.max(days[key].high, item.main.temp_max);
      days[key].low  = Math.min(days[key].low,  item.main.temp_min);
    });

    const dayArr = Object.values(days).slice(0, 5);
    container.innerHTML = dayArr.map((day, i) => {
      const mid = day.items[Math.floor(day.items.length / 2)];
      const icon = this.getWeatherIcon(mid.weather[0].id);
      const desc = mid.weather[0].main;
      const pop  = mid.pop ? `💧 ${Math.round(mid.pop * 100)}%` : '';
      return `
        <div class="weekly-item">
          <span class="weekly-day">${i === 0 ? 'Today' : day.day}</span>
          <span class="weekly-icon">${icon}</span>
          <span class="weekly-desc">${desc}</span>
          <div class="weekly-temps">
            <span class="weekly-high">${Math.round(day.high)}°</span>
            <span class="weekly-low">${Math.round(day.low)}°</span>
          </div>
          <span class="weekly-rain">${pop}</span>
        </div>`;
    }).join('');
  },

  // ---- Show error toast ----
  showError(msg) {
    const existing = document.querySelector('.toast-error');
    if (existing) existing.remove();
    const el = document.createElement('div');
    el.className = 'toast-error';
    el.innerHTML = `⚠️ ${msg}`;
    el.style.cssText = `
      position:fixed; bottom:32px; left:50%; transform:translateX(-50%);
      background:#1f2937; border:1px solid rgba(248,113,113,0.4);
      color:#f87171; padding:12px 24px; border-radius:50px;
      font-size:0.9rem; z-index:1000; box-shadow:0 8px 32px rgba(0,0,0,0.5);
      animation: fadeSlideUp 0.3s ease;
    `;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4000);
  },

  // ---- Show loading state on hero ----
  showHeroLoading() {
    document.getElementById('cityName').innerHTML =
      '<span class="skeleton skeleton-text" style="width:200px;height:36px;display:inline-block"></span>';
    document.getElementById('tempMain').innerHTML =
      '<span class="skeleton skeleton-text" style="width:140px;height:100px;display:inline-block"></span>';
    document.getElementById('weatherIconLarge').textContent = '';
    // Also show skeleton for hourly
    const hourly = document.getElementById('hourlyForecast');
    if (hourly) {
      hourly.innerHTML = `<div class="skeleton-row">${Array(8).fill('<span class="skeleton skeleton-block"></span>').join('')}</div>`;
    }
  },
};

function applyWeatherTheme(weatherId) {

  document.body.classList.remove(
    'clear-theme',
    'cloud-theme',
    'rain-theme',
    'thunder-theme',
    'snow-theme'
  );

  if (weatherId >= 200 && weatherId < 300) {
    document.body.classList.add('thunder-theme');
  }
  else if (weatherId >= 300 && weatherId < 600) {
    document.body.classList.add('rain-theme');
  }
  else if (weatherId >= 600 && weatherId < 700) {
    document.body.classList.add('snow-theme');
  }
  else if (weatherId >= 700 && weatherId < 800) {
    document.body.classList.add('cloud-theme');
  }
  else if (weatherId === 800) {
    document.body.classList.add('clear-theme');
  }
  else {
    document.body.classList.add('cloud-theme');
  }
}