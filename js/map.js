const WeatherMap = (() => {

  let map = null;
  let currentTileLayer = null;
  let weatherLayer = null;
  let initialized = false;

  // Initialize Map

  function init() {

    if (initialized) return;

    initialized = true;

    // Base map
    map = L.map('weatherMap', {
      center: [20, 0],
      zoom: 3,
      zoomControl: true,
      attributionControl: false,
    });

    // Dark theme tiles
    L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 19,
      }
    ).addTo(map);

    // Attribution
    L.control.attribution({
      position: 'bottomright',
      prefix: ''
    })
      .addAttribution(
        '© CARTO | OpenWeatherMap'
      )
      .addTo(map);

    // Default weather layer
    addWeatherLayer('clouds_new');

    // Click anywhere → Weather popup

    map.on('click', async function (e) {

      const lat = e.latlng.lat;
      const lng = e.latlng.lng;

      // Loading popup
      const popup = L.popup({
        closeButton: true,
        className: 'map-popup'
      })
        .setLatLng(e.latlng)
        .setContent(`
          <div class="map-popup">
            <div class="popup-city">
              Loading weather...
            </div>
          </div>
        `)
        .openOn(map);

      try {

        // Fetch weather data

        const data = await API.getWeatherAtPoint(
          lat.toFixed(4),
          lng.toFixed(4)
        );

        // Reverse geocoding

        const locationData =
          await API.reverseGeocode(
            lat.toFixed(4),
            lng.toFixed(4)
          );

        let city = data.name;
        let state = '';
        let country = data.sys.country;

        if (
          locationData &&
          locationData.length > 0
        ) {

          city =
            locationData[0].name ||
            city;

          state =
            locationData[0].state ||
            '';

          country =
            locationData[0].country ||
            country;
        }

        // Weather formatting

        const icon =
          UI.getWeatherIcon(
            data.weather[0].id
          );

        const temp =
          UI.fmtTemp(
            data.main.temp
          );

        const desc =
          data.weather[0].description;

        const humidity =
          data.main.humidity;

        const wind =
          UI.fmtWind(
            data.wind.speed,
            data.wind.deg
          );

        // Final popup content

        popup.setContent(`
          <div class="map-popup">

            <div class="popup-city">
              📍 ${city}${state ? ', ' + state : ''}, ${country}
            </div>

            <div class="popup-temp">
              ${icon} ${temp}
            </div>

            <div class="popup-cond">
              ${desc}
            </div>

            <div class="popup-cond">
              💧 ${humidity}%
              &nbsp; • &nbsp;
              💨 ${wind}
            </div>

            <div class="popup-coords">
              ${lat.toFixed(2)}°, ${lng.toFixed(2)}°
            </div>

          </div>
        `);

      } catch (err) {

        console.error(err);

        popup.setContent(`
          <div class="map-popup">
            <div class="popup-city">
              Could not load weather
            </div>
          </div>
        `);
      }
    });

     // Center map on current city

    if (AppState.currentWeather) {

      const lat =
        AppState.currentWeather.coord.lat;

      const lon =
        AppState.currentWeather.coord.lon;

      map.setView([lat, lon], 6);
    }
  }

  // Add weather layer

  function addWeatherLayer(layerName) {

    if (weatherLayer) {

      map.removeLayer(weatherLayer);

      weatherLayer = null;
    }

    weatherLayer = L.tileLayer(
      API.mapTileUrl(layerName),
      {
        opacity: 0.6,
        maxZoom: 19,
      }
    ).addTo(map);

    currentTileLayer = layerName;
  }

  // Public API

  return {

    init,

    // When map tab opens
    activate() {

      init();

      // Fix Leaflet hidden container issue
      setTimeout(() => {

        if (map) {
          map.invalidateSize();
        }

      }, 100);

      // Center on current city
      if (AppState.currentWeather) {

        const lat =
          AppState.currentWeather.coord.lat;

        const lon =
          AppState.currentWeather.coord.lon;

        map.setView([lat, lon], 6);
      }
    },

    // Toggle weather layer
    toggleLayer(layerName) {

      if (!map) return;

      addWeatherLayer(layerName);
    },
  };

})();

// Global layer toggle

function toggleMapLayer(layer, btn) {

  WeatherMap.toggleLayer(layer);

  document
    .querySelectorAll('.layer-btn')
    .forEach(b =>
      b.classList.remove('active')
    );

  btn.classList.add('active');
}
