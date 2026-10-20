// pineapp.win - Arcade hall front page
// Dropping a coin: a short "clink" plus a screen flash, then the game loads.
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let audioCtx = null;

  function coinSound() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = audioCtx || new Ctx();
      const t = audioCtx.currentTime;
      // Classic two-note coin chime
      [[988, 0], [1319, 0.07]].forEach(([freq, offset]) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(freq, t + offset);
        gain.gain.setValueAtTime(0.0001, t + offset);
        gain.gain.exponentialRampToValueAtTime(0.08, t + offset + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + offset + 0.22);
        osc.connect(gain).connect(audioCtx.destination);
        osc.start(t + offset);
        osc.stop(t + offset + 0.24);
      });
    } catch (e) {
      // Sound is a nicety; never block navigation on it.
    }
  }

  document.querySelectorAll('a.cab').forEach((cab) => {
    cab.addEventListener('click', (e) => {
      // Let new-tab / new-window clicks behave normally.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      coinSound();
      cab.classList.add('is-coined');
      const href = cab.getAttribute('href');
      window.setTimeout(() => { window.location.href = href; }, reduceMotion ? 120 : 380);
    });
  });

  // Arrow keys walk along the aisle when it scrolls (phones and narrow windows).
  const aisle = document.getElementById('aisle');
  if (aisle) {
    aisle.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const cabs = Array.from(aisle.querySelectorAll('a.cab'));
      const i = cabs.indexOf(document.activeElement);
      if (i === -1) return;
      const next = cabs[i + (e.key === 'ArrowRight' ? 1 : -1)];
      if (next) {
        e.preventDefault();
        next.focus();
        next.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
      }
    });
  }

  // Undo the coin-drop state if the page is restored from the back/forward cache.
  window.addEventListener('pageshow', () => {
    document.querySelectorAll('.cab.is-coined').forEach((c) => c.classList.remove('is-coined'));
  });
})();
