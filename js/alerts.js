const Alerts = (() => {
  let notifPermission = Notification.permission;
  let shownAlerts = new Set();

  // ---- Severity levels ----
  function getSeverity(event = '') {
    const e = event.toLowerCase();
    if (e.includes('extreme') || e.includes('emergency') || e.includes('tornado') ||
        e.includes('hurricane') || e.includes('cyclone') || e.includes('tsunami')) return 'red';
    if (e.includes('warning') || e.includes('severe') || e.includes('storm') ||
        e.includes('heatwave') || e.includes('blizzard') || e.includes('flood')) return 'orange';
    return 'yellow';
  }

  // ---- Show banner ----
  function showBanner(text, severity = 'yellow') {
    const banner = document.getElementById('alertBanner');
    const textEl = document.getElementById('alertText');
    banner.className = `alert-banner ${severity}`;
    textEl.textContent = text;
    banner.classList.remove('hidden');

    // Auto-dismiss after 10s
    setTimeout(() => banner.classList.add('hidden'), 10000);
  }

  // ---- Send push notification ----
  function sendPush(title, body) {
    if (notifPermission !== 'granted') return;
    try {
      new Notification(title, {
        body,
        icon: 'https://cdn-icons-png.flaticon.com/512/1163/1163624.png',
        badge: 'https://cdn-icons-png.flaticon.com/512/1163/1163624.png',
        tag: 'weather-alert',
      });
    } catch (e) {
      console.warn('Push notification failed:', e);
    }
  }

  // ---- Check conditions for auto-alerts ----
  function checkWeatherConditions(weather) {
    const id = weather.weather[0].id;
    const temp = weather.main.temp;
    const wind = weather.wind.speed;
    const city = weather.name;

    const alerts = [];

    if (id >= 200 && id < 300) alerts.push({ text: `⛈️ Thunderstorm warning in ${city}`, sev: 'orange' });
    if (id >= 502 && id < 600) alerts.push({ text: `🌧️ Heavy rain alert in ${city}`, sev: 'yellow' });
    if (id >= 600 && id < 700) alerts.push({ text: `❄️ Snowfall alert in ${city}`, sev: 'yellow' });
    if (id === 781) alerts.push({ text: `🌪️ TORNADO WARNING in ${city}!`, sev: 'red' });
    if (wind > 20) alerts.push({ text: `💨 High wind advisory in ${city}: ${Math.round(wind * 3.6)} km/h`, sev: 'yellow' });
    if (AppState.unit === 'C' && temp >= 42) alerts.push({ text: `🌡️ Extreme heat alert in ${city}: ${Math.round(temp)}°C`, sev: 'red' });
    if (AppState.unit === 'C' && temp <= -10) alerts.push({ text: `🥶 Extreme cold alert in ${city}: ${Math.round(temp)}°C`, sev: 'orange' });

    alerts.forEach(a => {
      const key = a.text.slice(0, 30);
      if (!shownAlerts.has(key)) {
        shownAlerts.add(key);
        showBanner(a.text, a.sev);
        sendPush('WeatherSphere Alert', a.text);
      }
    });
  }

  // ---- Request notification permission ----
  function requestPermission() {
    if (notifPermission === 'granted') return;
    if (notifPermission === 'denied') return;

    // Show custom prompt
    const prompt = document.createElement('div');
    prompt.className = 'notif-prompt';
    prompt.innerHTML = `
      <h4>🔔 Weather Alerts</h4>
      <p>Get browser notifications for severe weather in your area?</p>
      <div class="notif-prompt-btns">
        <button class="notif-yes" id="notifYes">Enable</button>
        <button class="notif-no" id="notifNo">Not now</button>
      </div>`;
    document.body.appendChild(prompt);

    document.getElementById('notifYes').onclick = () => {
      Notification.requestPermission().then(p => {
        notifPermission = p;
        if (p === 'granted') sendPush('WeatherSphere', '✅ You will now receive severe weather alerts!');
      });
      prompt.remove();
    };
    document.getElementById('notifNo').onclick = () => prompt.remove();
  }

  return {
    init() {
      // Ask for notification permission after 3 seconds
      setTimeout(requestPermission, 3000);
    },

    check(weather) {
      checkWeatherConditions(weather);
    },

    showManual(text, severity) {
      showBanner(text, severity);
    },
  };
})();

// Global dismiss function (used in HTML onclick)
function dismissAlert() {
  document.getElementById('alertBanner').classList.add('hidden');
}
