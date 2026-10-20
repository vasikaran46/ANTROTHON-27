/**
 * ANTROTHON'27 - TERMINATOR THEME JAVASCRIPT
 * HUD Telemetry, Countdown Engine, Sound FX Synthesizer
 */

// Sound Synthesizer via Web Audio API (zero external assets needed)
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

  toggle() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    this.enabled = !this.enabled;
    return this.enabled;
  }

  playBeep(freq = 880, duration = 0.06, type = 'sine') {
    if (!this.enabled || !this.ctx) return;
    try {
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

document.addEventListener('DOMContentLoaded', () => {
  // Sound toggle button in HUD
  const soundBtn = document.getElementById('term-sound-toggle');
  if (soundBtn) {
    soundBtn.addEventListener('click', () => {
      const active = cyberAudio.toggle();
      soundBtn.classList.toggle('active', active);
      const textSpan = soundBtn.querySelector('.sound-state-text');
      if (textSpan) {
        textSpan.textContent = active ? 'HUD AUDIO: ON' : 'HUD AUDIO: OFF';
      }
      if (active) cyberAudio.playTargetLock();
    });
  }

  // Interactive buttons sound trigger
  document.querySelectorAll('.btn-terminator, .btn-cyber-outline, .track-card, .faq-trigger').forEach(el => {
    el.addEventListener('mouseenter', () => {
      cyberAudio.playBeep(640, 0.03, 'sine');
    });
    el.addEventListener('click', () => {
      cyberAudio.playTargetLock();
    });
  });

  // Mobile navigation
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

  // Live HUD Clock (UTC & IST)
  function updateTelemetryClock() {
    const clockEl = document.getElementById('hud-live-clock');
    if (!clockEl) return;
    const now = new Date();
    const istTime = now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: false });
    clockEl.textContent = `T-SYS: ${istTime} IST`;
  }
  setInterval(updateTelemetryClock, 1000);
  updateTelemetryClock();

  // COUNTDOWN ENGINE
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

  // FAQ Accordion
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
