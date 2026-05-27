const WeatherAnimations = (() => {
  const canvas = document.getElementById('weatherCanvas');
  const ctx = canvas.getContext('2d');
  let particles = [];
  let animId = null;
  let currentType = null;

  // Resize canvas to fill viewport
  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // ---- Particle Factories ----

  function makeRainDrop() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      length: Math.random() * 18 + 8,
      speed: Math.random() * 14 + 10,
      opacity: Math.random() * 0.4 + 0.1,
      thickness: Math.random() * 1 + 0.5,
    };
  }

  function makeSnowFlake() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: Math.random() * 3 + 1,
      speed: Math.random() * 1.5 + 0.5,
      drift: (Math.random() - 0.5) * 0.8,
      opacity: Math.random() * 0.5 + 0.2,
      wobble: Math.random() * Math.PI * 2,
    };
  }

  function makeStarParticle() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.3,
      opacity: Math.random() * 0.6 + 0.1,
      pulse: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.02 + 0.005,
    };
  }

  function makeFogParticle() {
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 120 + 60,
      opacity: Math.random() * 0.03 + 0.01,
      dx: (Math.random() - 0.5) * 0.3,
      dy: (Math.random() - 0.5) * 0.1,
    };
  }

  // ---- Draw Functions ----

  function drawRain() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(147,210,255,${p.opacity})`;
      ctx.lineWidth = p.thickness;
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - 2, p.y + p.length);
      ctx.stroke();

      p.y += p.speed;
      p.x -= 1.5;
      if (p.y > canvas.height) { Object.assign(p, makeRainDrop()); p.y = -p.length; }
    });
  }

  function drawHeavyRain() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx.beginPath();
      ctx.strokeStyle = `rgba(147,210,255,${p.opacity})`;
      ctx.lineWidth = p.thickness;
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x - 4, p.y + p.length);
      ctx.stroke();

      p.y += p.speed * 1.8;
      p.x -= 3;
      if (p.y > canvas.height) { Object.assign(p, makeRainDrop()); p.y = -p.length; p.speed += 2; }
    });
    // Occasional lightning
    if (Math.random() < 0.005) triggerLightning();
  }

  function drawSnow() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.wobble += 0.02;
      p.x += Math.sin(p.wobble) * p.drift;
      p.y += p.speed;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(220,240,255,${p.opacity})`;
      ctx.fill();

      if (p.y > canvas.height) { Object.assign(p, makeSnowFlake()); p.y = -10; }
      if (p.x > canvas.width)  { p.x = 0; }
      if (p.x < 0)             { p.x = canvas.width; }
    });
  }

  function drawSunny() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.pulse += p.speed;
      const alpha = p.opacity * (0.5 + 0.5 * Math.sin(p.pulse));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(251,191,36,${alpha})`;
      ctx.fill();
    });
  }

  function drawFog() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.dx;
      p.y += p.dy;
      if (p.x < -p.r) p.x = canvas.width + p.r;
      if (p.x > canvas.width + p.r) p.x = -p.r;
      if (p.y < -p.r) p.y = canvas.height + p.r;
      if (p.y > canvas.height + p.r) p.y = -p.r;

      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r);
      grad.addColorStop(0, `rgba(180,200,220,${p.opacity})`);
      grad.addColorStop(1, 'rgba(180,200,220,0)');
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    });
  }

  // ---- Lightning helper ----
  function triggerLightning() {
    const flash = document.createElement('div');
    flash.className = 'lightning-flash';
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 200);
  }

  // ---- Stop / Start ----
  function stop() {
    if (animId) cancelAnimationFrame(animId);
    animId = null;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function loop(drawFn) {
    function frame() {
      drawFn();
      animId = requestAnimationFrame(frame);
    }
    frame();
  }

  // ---- Remove/add body weather classes ----
  const WEATHER_CLASSES = ['weather-sunny','weather-cloudy','weather-rainy','weather-stormy','weather-snowy','weather-foggy'];
  function setBodyClass(cls) {
    document.body.classList.remove(...WEATHER_CLASSES);
    if (cls) document.body.classList.add(cls);
  }

  // Remove/add sun rays
  function removeSunRays() { document.querySelector('.sun-rays')?.remove(); }
  function addSunRays() {
    removeSunRays();
    const el = document.createElement('div');
    el.className = 'sun-rays';
    document.body.appendChild(el);
  }

  function removeFog() { document.querySelector('.fog-layer')?.remove(); }
  function addFog() {
    removeFog();
    const el = document.createElement('div');
    el.className = 'fog-layer';
    document.body.appendChild(el);
  }

  // ---- Public: set animation by OWM weather condition id ----
  return {
    set(conditionId, conditionMain) {
      if (currentType === conditionId) return;
      currentType = conditionId;
      stop();
      removeSunRays();
      removeFog();

      const id = conditionId;
      const main = (conditionMain || '').toLowerCase();

      // Thunderstorm: 200-232
      if (id >= 200 && id < 300) {
        setBodyClass('weather-stormy');
        particles = Array.from({ length: 250 }, makeRainDrop);
        loop(drawHeavyRain);
        setInterval(triggerLightning, 4000);
      }
      // Drizzle: 300-321
      else if (id >= 300 && id < 400) {
        setBodyClass('weather-rainy');
        particles = Array.from({ length: 120 }, makeRainDrop);
        loop(drawRain);
      }
      // Rain: 500-531
      else if (id >= 500 && id < 600) {
        setBodyClass('weather-rainy');
        const count = id >= 502 ? 300 : 180;
        particles = Array.from({ length: count }, makeRainDrop);
        loop(id >= 502 ? drawHeavyRain : drawRain);
      }
      // Snow: 600-622
      else if (id >= 600 && id < 700) {
        setBodyClass('weather-snowy');
        particles = Array.from({ length: 160 }, makeSnowFlake);
        loop(drawSnow);
      }
      // Atmosphere (fog/mist/haze/dust): 700-781
      else if (id >= 700 && id < 800) {
        setBodyClass('weather-foggy');
        particles = Array.from({ length: 40 }, makeFogParticle);
        addFog();
        loop(drawFog);
      }
      // Clear: 800
      else if (id === 800) {
        setBodyClass('weather-sunny');
        particles = Array.from({ length: 80 }, makeStarParticle);
        addSunRays();
        loop(drawSunny);
      }
      // Clouds: 801-804
      else {
        setBodyClass('weather-cloudy');
        particles = Array.from({ length: 50 }, makeStarParticle);
        loop(drawSunny); // dim stars for cloudy nights
      }
    },

    stop,
  };
})();

function createRainEffect() {

  const container = document.getElementById('weatherParticles');

  container.innerHTML = '';

  for (let i = 0; i < 80; i++) {

    const particle = document.createElement('div');

    particle.className = 'particle';

    particle.style.left = Math.random() * 100 + 'vw';

    particle.style.animationDuration =
      (Math.random() * 1 + 0.5) + 's';

    particle.style.opacity = Math.random();

    container.appendChild(particle);
  }
}
