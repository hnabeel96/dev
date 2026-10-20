// pineapp.win - Arcade hall front page
// The coin machine hands out a random number of coins; every cabinet costs one coin to play.
(function () {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const Coins = window.Coins;
  let audioCtx = null;

  // ---------------------------------------------------------------- sound
  function beep(freq, dur, type, vol, when) {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = audioCtx || new Ctx();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const t = audioCtx.currentTime + (when || 0);
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = type || 'square';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(vol || 0.08, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      osc.connect(gain).connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    } catch (e) {
      // Sound is a nicety; never block anything on it.
    }
  }
  const sound = {
    insert: () => { beep(988, 0.2, 'square', 0.08); beep(1319, 0.22, 'square', 0.08, 0.07); },
    clink: () => beep(2200 + Math.random() * 500, 0.09, 'sine', 0.06),
    buzz: () => beep(130, 0.25, 'sawtooth', 0.05),
    refuse: () => { beep(220, 0.12, 'square', 0.06); beep(165, 0.18, 'square', 0.06, 0.12); },
    jackpot: () => [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.14, 'square', 0.06, i * 0.09)),
    kaching: kaching
  };

  // Cash-register "ka-ching": a short metallic clack (drawer), then a bright bell that rings out.
  function kaching() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = audioCtx || new Ctx();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const c = audioCtx, t = c.currentTime;
      // "ka": filtered noise burst
      const n = Math.floor(c.sampleRate * 0.05), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
      const src = c.createBufferSource(), bp = c.createBiquadFilter(), ng = c.createGain();
      src.buffer = buf; bp.type = 'bandpass'; bp.frequency.value = 3200; bp.Q.value = 1.2; ng.gain.value = 0.35;
      src.connect(bp).connect(ng).connect(c.destination); src.start(t);
      // "ching": bell partials (slightly inharmonic, like a real bell), long decay
      [[2093, 0.12, 0.9], [2637, 0.07, 0.7], [3951, 0.05, 0.5], [5274, 0.03, 0.35]].forEach(([f, v, dur]) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t + 0.06);
        g.gain.exponentialRampToValueAtTime(v, t + 0.065);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06 + dur);
        o.connect(g).connect(c.destination); o.start(t + 0.06); o.stop(t + 0.1 + dur);
      });
    } catch (e) { /* sound is optional */ }
  }

  // ---------------------------------------------------------------- coin counter + toast
  const chip = document.getElementById('coin-chip');
  const toast = document.getElementById('hall-toast');
  let toastTimer = 0;

  function paintChip() {
    if (!chip || !Coins) return;
    const n = Coins.balance();
    chip.classList.toggle('empty', n === 0);
    chip.setAttribute('aria-label', `You have ${n} ${n === 1 ? 'coin' : 'coins'}`);
    chip.title = n > 0 ? `Coins vanish in about ${hoursLeft()}` : 'Get coins from the coin machine';
  }
  function bumpChip() {
    if (!chip) return;
    chip.classList.remove('bump');
    void chip.offsetWidth;
    chip.classList.add('bump');
  }
  function say(text) {
    if (!toast) return;
    toast.textContent = text;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  if (Coins) {
    Coins.onChange(paintChip);
    paintChip();
  }

  // ---------------------------------------------------------------- coin machine
  const machine = document.getElementById('coin-machine');
  const button = document.getElementById('dispense');
  const readout = document.getElementById('changer-readout');
  const display = readout ? readout.parentElement : null;
  const tray = document.getElementById('tray');
  let dispensing = false;

  function setReadout(text, cls) {
    if (!readout) return;
    readout.textContent = text;
    display.classList.remove('win', 'jackpot');
    if (cls) {
      void display.offsetWidth;
      cls.split(' ').forEach((c) => display.classList.add(c));
    }
  }

  function idleReadout() {
    if (dispensing || !Coins) return;
    setReadout(Coins.canDispense() ? 'PUSH' : 'SPEND');
    machine.classList.toggle('locked', !Coins.canDispense());
  }

  function hoursLeft() {
    const ms = Coins.expiresAt() - Date.now();
    const h = Math.max(1, Math.ceil(ms / 3600000));
    return `${h} ${h === 1 ? 'hour' : 'hours'}`;
  }

  function dispense() {
    if (dispensing || !Coins) return;
    if (!Coins.canDispense()) {
      // Only an empty wallet gets a payout.
      sound.buzz();
      machine.classList.remove('refuse');
      void machine.offsetWidth;
      machine.classList.add('refuse');
      const n = Coins.balance();
      say(`You still have ${n} ${n === 1 ? 'coin' : 'coins'}. The machine pays out when you hit 0.`);
      return;
    }
    dispensing = true;
    button.disabled = true;
    button.classList.add('is-pressed');
    machine.classList.remove('call');
    setReadout('....');

    // Decide the payout now, add it once the coins have landed.
    const before = Coins.balance();
    const amount = Coins.dispense('machine');
    // Hold the counter at the old value until the coins reach it
    document.querySelectorAll('[data-coin-count]').forEach((el) => { el.textContent = Coins.format(before); });

    const step = reduceMotion ? 0 : 140;
    const shown = Math.min(amount, 10);
    const coins = [];
    for (let i = 0; i < shown; i++) {
      setTimeout(() => {
        const c = document.createElement('span');
        c.className = 'drop-coin';
        c.style.setProperty('--x', `${22 + Math.random() * 56}%`);
        c.style.zIndex = String(3 + i);
        tray.appendChild(c);
        coins.push(c);
        sound.clink();
      }, 250 + i * step);
    }

    const landed = 250 + shown * step + 350;
    setTimeout(() => {
      const jackpot = amount >= 10;
      setReadout(`+${String(amount).padStart(2, '0')}`, jackpot ? 'win jackpot' : 'win');
      if (jackpot) sound.jackpot();
      button.classList.remove('is-pressed');
    }, landed);

    setTimeout(() => {
      coins.forEach((c) => c.classList.add('collect'));
      sound.kaching();
      document.querySelectorAll('[data-coin-count]').forEach((el) => { el.textContent = Coins.format(Coins.balance()); });
      bumpChip();
      say(`${amount} ${amount === 1 ? 'coin' : 'coins'} added. 1 coin = 1 game. Unused coins vanish in 24 hours.`);
    }, landed + 650);

    setTimeout(() => {
      coins.forEach((c) => c.remove());
      button.disabled = false;
      dispensing = false;
      idleReadout();
    }, landed + 1400);
  }

  if (button && tray) {
    button.addEventListener('click', dispense);
    if (Coins) Coins.onChange(idleReadout);
    idleReadout();
  }

  // ---------------------------------------------------------------- cabinets
  function callMachine() {
    if (!machine) return;
    machine.classList.remove('call');
    void machine.offsetWidth;
    machine.classList.add('call');
    // On phones the machine may be off to the side of the aisle
    const r = machine.getBoundingClientRect();
    if (r.right < 0 || r.left > window.innerWidth) {
      machine.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
    }
  }

  document.querySelectorAll('a.cab').forEach((cab) => {
    cab.addEventListener('click', (e) => {
      if (e.button !== 0) return;
      // New-tab clicks still need a coin; send them through the same flow.
      e.preventDefault();
      if (cab.classList.contains('is-coined')) return;

      const game = cab.dataset.game;
      if (!Coins || !Coins.insertFor(game)) {
        cab.classList.remove('no-coin');
        void cab.offsetWidth;
        cab.classList.add('no-coin');
        sound.refuse();
        say('Out of coins. Push the yellow button on the coin machine.');
        callMachine();
        return;
      }

      // Coin drops into this cabinet's slot, then the game loads
      const door = cab.querySelector('.coin-door');
      if (door) {
        const coin = document.createElement('span');
        coin.className = 'slot-coin';
        door.appendChild(coin);
        setTimeout(() => coin.remove(), 600);
      }
      bumpChip();
      sound.insert();
      cab.classList.add('is-coined');
      const href = cab.getAttribute('href');
      window.setTimeout(() => { window.location.href = href; }, reduceMotion ? 150 : 480);
    });
  });

  // Arrow keys walk along the aisle when it scrolls (phones and narrow windows).
  const aisle = document.getElementById('aisle');
  if (aisle) {
    aisle.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      const stops = Array.from(aisle.querySelectorAll('a.cab, #dispense'));
      const i = stops.indexOf(document.activeElement);
      if (i === -1) return;
      const next = stops[i + (e.key === 'ArrowRight' ? 1 : -1)];
      if (next) {
        e.preventDefault();
        next.focus();
        next.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', inline: 'center', block: 'nearest' });
      }
    });
  }

  // Coming back with the browser's back button: reset the cabinet and counter.
  window.addEventListener('pageshow', () => {
    document.querySelectorAll('.cab.is-coined').forEach((c) => c.classList.remove('is-coined'));
    document.querySelectorAll('[data-coin-count]').forEach((el) => { el.textContent = Coins ? Coins.format(Coins.balance()) : '00'; });
    paintChip();
    if (button && tray) idleReadout();
  });

  // Arriving from a game with an empty wallet (index.html#coin-machine): point at the machine.
  if (location.hash === '#coin-machine') setTimeout(callMachine, 1200);
})();
