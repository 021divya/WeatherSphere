/* =============================================
   WeatherSphere — Charts Module
   Chart.js temperature, humidity, wind graphs
   ============================================= */

const Charts = (() => {
  let tempChart = null;
  let humidityChart = null;
  let windChart = null;

  const DEFAULTS = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 900, easing: 'easeInOutQuart' },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#111827',
        titleColor: '#94a3b8',
        bodyColor: '#f1f5f9',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 10,
      },
    },
    scales: {
      x: {
        grid:  { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#64748b', font: { size: 11 } },
      },
      y: {
        grid:  { color: 'rgba(255,255,255,0.05)' },
        ticks: { color: '#64748b', font: { size: 11 } },
      },
    },
  };

  function destroyAll() {
    [tempChart, humidityChart, windChart].forEach(c => c && c.destroy());
    tempChart = humidityChart = windChart = null;
  }

  return {
    render(forecast) {
      destroyAll();

      const items = forecast.list.slice(0, 8);
      const labels = items.map(item => {
        const d = new Date(item.dt * 1000);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      });
      const temps    = items.map(i => Math.round(i.main.temp));
      const humidity = items.map(i => i.main.humidity);
      const wind     = items.map(i => Math.round(AppState.unit === 'C' ? i.wind.speed * 3.6 : i.wind.speed));
      const tempUnit = AppState.unit === 'C' ? '°C' : '°F';
      const windUnit = AppState.unit === 'C' ? 'km/h' : 'mph';

      // -- Temperature Line Chart --
      const tCtx = document.getElementById('tempChart');
      if (tCtx) {
        tCtx.style.height = '160px';
        tempChart = new Chart(tCtx, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              data: temps,
              borderColor: '#38bdf8',
              backgroundColor: 'rgba(56,189,248,0.08)',
              borderWidth: 2.5,
              pointBackgroundColor: '#38bdf8',
              pointRadius: 4,
              pointHoverRadius: 6,
              fill: true,
              tension: 0.4,
            }],
          },
          options: {
            ...DEFAULTS,
            plugins: {
              ...DEFAULTS.plugins,
              tooltip: {
                ...DEFAULTS.plugins.tooltip,
                callbacks: { label: ctx => `${ctx.raw}${tempUnit}` },
              },
            },
            scales: {
              ...DEFAULTS.scales,
              y: { ...DEFAULTS.scales.y, ticks: { ...DEFAULTS.scales.y.ticks, callback: v => `${v}°` } },
            },
          },
        });
      }

      // -- Humidity Bar Chart --
      const hCtx = document.getElementById('humidityChart');
      if (hCtx) {
        hCtx.style.height = '160px';
        humidityChart = new Chart(hCtx, {
          type: 'bar',
          data: {
            labels,
            datasets: [{
              data: humidity,
              backgroundColor: 'rgba(52,211,153,0.3)',
              borderColor: '#34d399',
              borderWidth: 2,
              borderRadius: 6,
              borderSkipped: false,
            }],
          },
          options: {
            ...DEFAULTS,
            plugins: {
              ...DEFAULTS.plugins,
              tooltip: {
                ...DEFAULTS.plugins.tooltip,
                callbacks: { label: ctx => `${ctx.raw}%` },
              },
            },
            scales: {
              ...DEFAULTS.scales,
              y: { ...DEFAULTS.scales.y, min: 0, max: 100, ticks: { ...DEFAULTS.scales.y.ticks, callback: v => `${v}%` } },
            },
          },
        });
      }

      // -- Wind Speed Line Chart --
      const wCtx = document.getElementById('windChart');
      if (wCtx) {
        wCtx.style.height = '160px';
        windChart = new Chart(wCtx, {
          type: 'line',
          data: {
            labels,
            datasets: [{
              data: wind,
              borderColor: '#c084fc',
              backgroundColor: 'rgba(192,132,252,0.08)',
              borderWidth: 2.5,
              pointBackgroundColor: '#c084fc',
              pointRadius: 4,
              pointHoverRadius: 6,
              fill: true,
              tension: 0.4,
            }],
          },
          options: {
            ...DEFAULTS,
            plugins: {
              ...DEFAULTS.plugins,
              tooltip: {
                ...DEFAULTS.plugins.tooltip,
                callbacks: { label: ctx => `${ctx.raw} ${windUnit}` },
              },
            },
            scales: {
              ...DEFAULTS.scales,
              y: { ...DEFAULTS.scales.y, ticks: { ...DEFAULTS.scales.y.ticks, callback: v => `${v}` } },
            },
          },
        });
      }
    },

    destroy: destroyAll,
  };
})();