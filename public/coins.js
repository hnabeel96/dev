// pineapp.win - shared coin wallet
//
// One coin = one game, like a real arcade.
//   - The coin machine in the arcade hall dispenses a random number of coins.
//   - Clicking a cabinet spends a coin and hands that game a "credit" for one run.
//   - Each replay on a game page spends another coin.
//
// Coins live in this browser only (localStorage). They have no value outside the site.
//
// Future ad rewards: call Coins.grant(amount, 'ad') (or Coins.dispense('ad')) from the
// rewarded-ad "viewed" callback. Everything else (counters, animations) reacts through
// Coins.onChange, so nothing else needs to change.
(function () {
  'use strict';

  const KEY = 'pineappCoins';
  const CREDIT_KEY = 'pineappCredit';
  const listeners = new Set();

  function read(store, key, fallback) {
    try { const v = store.getItem(key); return v === null ? fallback : v; } catch (e) { return fallback; }
  }
  function write(store, key, value) {
    try { store.setItem(key, value); } catch (e) { /* storage blocked: coins last for this page only */ }
  }

  let memory = Math.max(0, parseInt(read(localStorage, KEY, '0'), 10) || 0);

  function balance() {
    const stored = parseInt(read(localStorage, KEY, String(memory)), 10);
    memory = Number.isFinite(stored) ? Math.max(0, stored) : memory;
    return memory;
  }

  function set(n, reason) {
    memory = Math.max(0, Math.floor(n));
    write(localStorage, KEY, String(memory));
    listeners.forEach((fn) => { try { fn(memory, reason); } catch (e) { /* ignore */ } });
  }

  // Random payout: mostly small handfuls, the odd jackpot.
  const PAYOUTS = [
    [1, 30], [2, 28], [3, 20], [4, 11], [5, 7], [10, 4]
  ];
  function rollPayout() {
    const total = PAYOUTS.reduce((s, [, w]) => s + w, 0);
    let r = Math.random() * total;
    for (const [amount, weight] of PAYOUTS) {
      if ((r -= weight) < 0) return amount;
    }
    return 1;
  }

  const Coins = {
    balance,

    /** Add coins. `source` is 'machine' today; use 'ad' for rewarded ads later. */
    grant(amount, source) {
      const n = Math.max(0, Math.floor(amount));
      if (n) set(balance() + n, { type: 'grant', amount: n, source: source || 'machine' });
      return n;
    },

    /** Roll a random payout and add it. Returns the number of coins given. */
    dispense(source) {
      return Coins.grant(rollPayout(), source || 'machine');
    },

    /** Spend one coin. Returns false if the wallet is empty. */
    spend() {
      const b = balance();
      if (b < 1) return false;
      set(b - 1, { type: 'spend', amount: 1 });
      return true;
    },

    /** Spend a coin at a cabinet and carry one play over to that game's page. */
    insertFor(game) {
      if (!Coins.spend()) return false;
      write(sessionStorage, CREDIT_KEY, game);
      return true;
    },

    /** On a game page: use the play paid for at the cabinet, if there is one. */
    takeCredit(game) {
      if (read(sessionStorage, CREDIT_KEY, '') !== game) return false;
      try { sessionStorage.removeItem(CREDIT_KEY); } catch (e) { /* ignore */ }
      return true;
    },

    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    /** Format for display: 2 -> "02" */
    format(n) { return String(n).padStart(2, '0'); }
  };

  // Keep several open tabs in step.
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) set(balance(), { type: 'sync' });
  });

  // Fill any coin counters on the page: <span data-coin-count></span>
  function paintCounters() {
    document.querySelectorAll('[data-coin-count]').forEach((el) => { el.textContent = Coins.format(balance()); });
  }
  Coins.onChange(paintCounters);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', paintCounters);
  else paintCounters();

  window.Coins = Coins;
})();
