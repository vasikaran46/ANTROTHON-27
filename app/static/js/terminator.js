/**
 * ANTROTHON'27 - TERMINATOR THEME JAVASCRIPT
 * HUD Telemetry, Dynamic Coordinates, Background Music Engine, Countdown Engine
 */

// Sound Synthesizer via Web Audio API for interactive clicks/hover
class CyberAudioEngine {
  constructor() {
    this.enabled = false;
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.ctx = new AudioContext();
      }
    }
  }

  playBeep(freq = 880, duration = 0.06, type = 'sine') {
    if (!this.enabled || !this.ctx) return;
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (e) {
      // Audio fail silent
    }
  }

  playTargetLock() {
    if (!this.enabled || !this.ctx) return;
    this.playBeep(1200, 0.04, 'square');
    setTimeout(() => this.playBeep(1600, 0.08, 'sawtooth'), 50);
  }
}

const cyberAudio = new CyberAudioEngine();

// =====================================================================
// DYNAMIC USER LOCATION COORDINATES
// =====================================================================
function initDynamicLocation() {
  const locEl = document.getElementById('hud-live-location');
  if (!locEl) return;

  function renderCoords(lat, lng) {
    if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) return;
    const latDir = lat >= 0 ? 'N' : 'S';
    const lngDir = lng >= 0 ? 'E' : 'W';
    locEl.textContent = `[LOC: ${Math.abs(lat).toFixed(4)}° ${latDir}, ${Math.abs(lng).toFixed(4)}° ${lngDir}]`;
    locEl.style.color = 'var(--term-yellow, #ffd000)';
  }

  // 1. Check cached session coordinates first for instant display
  try {
    const cached = sessionStorage.getItem('antrothon_user_coords');
    if (cached) {
      const data = JSON.parse(cached);
      if (data && typeof data.lat === 'number' && typeof data.lng === 'number') {
        renderCoords(data.lat, data.lng);
      }
    }
  } catch (e) {}

  // 2. Query browser Geolocation API
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        renderCoords(lat, lng);
        try {
          sessionStorage.setItem('antrothon_user_coords', JSON.stringify({ lat, lng }));
        } catch (e) {}
      },
      () => {
        // Fallback: IP-based location lookup
        fetchLocationFromIP();
      },
      { timeout: 8000, maximumAge: 600000, enableHighAccuracy: false }
    );
  } else {
    fetchLocationFromIP();
  }

  function fetchLocationFromIP() {
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(d => {
        if (d && typeof d.latitude === 'number' && typeof d.longitude === 'number') {
          renderCoords(d.latitude, d.longitude);
          try {
            sessionStorage.setItem('antrothon_user_coords', JSON.stringify({ lat: d.latitude, lng: d.longitude }));
          } catch (e) {}
        }
      })
      .catch(() => {
        // Secondary fallback
        fetch('https://ipwho.is/')
          .then(r => r.json())
          .then(d => {
            if (d && d.success !== false && typeof d.latitude === 'number' && typeof d.longitude === 'number') {
              renderCoords(d.latitude, d.longitude);
              try {
                sessionStorage.setItem('antrothon_user_coords', JSON.stringify({ lat: d.latitude, lng: d.longitude }));
              } catch (e) {}
            }
          })
          .catch(() => {
            // Retains default Patrician College Chennai coords [LOC: 13.0067° N, 80.2570° E]
          });
      });
  }
}

// =====================================================================
// BACKGROUND MUSIC & TACTICAL HUD AUDIO CONTROLLER
// =====================================================================
function initBackgroundMusic() {
  const bgm = document.getElementById('term-bgm');
  const soundBtn = document.getElementById('term-sound-toggle');
  if (!bgm || !soundBtn) return;

  const iconUnmuted = soundBtn.querySelector('.audio-icon-unmuted');
  const iconMuted = soundBtn.querySelector('.audio-icon-muted');
  const textSpan = soundBtn.querySelector('.sound-state-text');

  bgm.volume = 0.35; // Ambient, tactical volume

  function updateVisuals(isPlaying) {
    soundBtn.classList.toggle('active', isPlaying);
    if (iconUnmuted && iconMuted) {
      iconUnmuted.style.display = isPlaying ? 'inline-block' : 'none';
      iconMuted.style.display = isPlaying ? 'none' : 'inline-block';
    }
    if (textSpan) {
      textSpan.textContent = isPlaying ? 'HUD AUDIO: ON' : 'HUD AUDIO: OFF';
    }
    cyberAudio.enabled = isPlaying;
  }

  function playMusic() {
    cyberAudio.init();
    bgm.play().then(() => {
      updateVisuals(true);
      try { localStorage.setItem('antrothon_bgm_muted', 'false'); } catch (e) {}
    }).catch(() => {
      updateVisuals(false);
    });
  }

  function pauseMusic() {
    bgm.pause();
    updateVisuals(false);
    try { localStorage.setItem('antrothon_bgm_muted', 'true'); } catch (e) {}
  }

  // Sound toggle button click in HUD top bar
  soundBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if (bgm.paused) {
      playMusic();
      cyberAudio.playTargetLock();
    } else {
      pauseMusic();
    }
  });

  // Check user's stored mute preference
  let isMutedPref = false;
  try {
    isMutedPref = localStorage.getItem('antrothon_bgm_muted') === 'true';
  } catch (e) {}

  if (!isMutedPref) {
    // Attempt automatic playback
    const promise = bgm.play();
    if (promise !== undefined) {
      promise.then(() => {
        updateVisuals(true);
      }).catch(() => {
        // Browser autoplay blocked audio until user interaction
        updateVisuals(false);
        const startOnGesture = () => {
          let mutedNow = false;
          try { mutedNow = localStorage.getItem('antrothon_bgm_muted') === 'true'; } catch (e) {}
          if (!mutedNow && bgm.paused) {
            playMusic();
          }
          window.removeEventListener('click', startOnGesture);
          window.removeEventListener('keydown', startOnGesture);
          window.removeEventListener('touchstart', startOnGesture);
        };
        window.addEventListener('click', startOnGesture, { once: true });
        window.addEventListener('keydown', startOnGesture, { once: true });
        window.addEventListener('touchstart', startOnGesture, { once: true });
      });
    }
  } else {
    updateVisuals(false);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Background Music & Audio Toggle
  initBackgroundMusic();

  // 2. Initialize Dynamic Location
  initDynamicLocation();

  // 3. Interactive buttons sound trigger
  document.querySelectorAll('.btn-terminator, .btn-cyber-outline, .track-card, .faq-trigger').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cyberAudio.playBeep(640, 0.03, 'sine');
    });
    el.addEventListener('click', () => {
      cyberAudio.playTargetLock();
    });
  });

  // 4. Mobile navigation
  const navToggle = document.getElementById('mobile-nav-toggle');
  const navLinks = document.getElementById('term-nav-links');
  if (navToggle && navLinks) {
    navToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      navLinks.classList.toggle('open');
    });

    // Auto-close on link click (jump to section or navigate)
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
      });
    });

    // Auto-close on outside click
    document.addEventListener('click', (e) => {
      if (!navToggle.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('open');
      }
    });
  }

  // 5. Live HUD Clock (UTC & IST)
  function updateTelemetryClock() {
    const clockEl = document.getElementById('hud-live-clock');
    if (!clockEl) return;
    const now = new Date();
    const istTime = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
    clockEl.textContent = `T-SYS: ${istTime} IST`;
  }
  setInterval(updateTelemetryClock, 1000);
  updateTelemetryClock();

  // 6. COUNTDOWN ENGINE
  // Target: December 20, 2026 23:59:59 IST (Registration Deadline)
  const targetDateStr = document.body.dataset.countdownTarget || '2026-12-20T23:59:59';
  const targetDate = new Date(targetDateStr).getTime();

  function updateCountdown() {
    const daysEl = document.getElementById('cd-days');
    const hoursEl = document.getElementById('cd-hours');
    const minsEl = document.getElementById('cd-mins');
    const secsEl = document.getElementById('cd-secs');

    if (!daysEl || !hoursEl || !minsEl || !secsEl) return;

    const now = new Date().getTime();
    const distance = targetDate - now;

    if (distance <= 0) {
      daysEl.textContent = '00';
      hoursEl.textContent = '00';
      minsEl.textContent = '00';
      secsEl.textContent = '00';
      const statusBadge = document.getElementById('cd-status-badge');
      if (statusBadge) {
        statusBadge.textContent = 'SYSTEM UNLOCKED // LIVE NOW';
        statusBadge.classList.remove('term-badge-amber');
        statusBadge.classList.add('term-badge-green');
      }
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((distance % (1000 * 60)) / 1000);

    daysEl.textContent = String(days).padStart(2, '0');
    hoursEl.textContent = String(hours).padStart(2, '0');
    minsEl.textContent = String(minutes).padStart(2, '0');
    secsEl.textContent = String(seconds).padStart(2, '0');
  }

  setInterval(updateCountdown, 1000);
  updateCountdown();

  // 7. FAQ Accordion
  document.querySelectorAll('.faq-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const item = trigger.closest('.faq-item');
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!isOpen) {
        item.classList.add('open');
      }
    });
  });
});
