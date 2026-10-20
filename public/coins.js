// pineapp.win - shared coin wallet
//
// One coin = one game, like a real arcade.
//   - The coin machine in the arcade hall dispenses a random number of coins.
//   - Clicking a cabinet spends a coin and hands that game a "credit" for one run.
//   - Each replay on a game page spends another coin.
//   - The machine only pays out when the wallet is empty.
//   - Coins expire 24 hours after the machine (or an ad) last paid out.
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
  const STAMP_KEY = 'pineappCoinsAt';       // when the current coins were handed out
  const LIFETIME_MS = 24 * 60 * 60 * 1000;  // coins are wiped a day after that
  const listeners = new Set();

  function read(store, key, fallback) {
    try { const v = store.getItem(key); return v === null ? fallback : v; } catch (e) { return fallback; }
  }
  function write(store, key, value) {
    try { store.setItem(key, value); } catch (e) { /* storage blocked: coins last for this page only */ }
  }

  let memory = Math.max(0, parseInt(read(localStorage, KEY, '0'), 10) || 0);

  function grantedAt() {
    return parseInt(read(localStorage, STAMP_KEY, '0'), 10) || 0;
  }

  function balance() {
    const stored = parseInt(read(localStorage, KEY, String(memory)), 10);
    memory = Number.isFinite(stored) ? Math.max(0, stored) : memory;
    // A day after the last payout, whatever is left is wiped.
    if (memory > 0 && Date.now() - grantedAt() >= LIFETIME_MS) {
      memory = 0;
      write(localStorage, KEY, '0');
    }
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
      if (n) {
        write(localStorage, STAMP_KEY, String(Date.now())); // starts the 24-hour clock
        set(balance() + n, { type: 'grant', amount: n, source: source || 'machine' });
        scheduleExpiry();
      }
      return n;
    },

    /** The coin machine only pays out to an empty wallet. */
    canDispense() {
      return balance() === 0;
    },

    /** Roll a random payout and add it. Returns the number of coins given (0 if the wallet isn't empty). */
    dispense(source) {
      if (!Coins.canDispense()) return 0;
      return Coins.grant(rollPayout(), source || 'machine');
    },

    /** When the current coins will be wiped (ms timestamp), or 0 if there are none. */
    expiresAt() {
      return balance() > 0 ? grantedAt() + LIFETIME_MS : 0;
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
      // Kept for 2 minutes: long enough for the game page to load, short enough not to linger.
      write(localStorage, CREDIT_KEY, JSON.stringify({ game, at: Date.now() }));
      return true;
    },

    /** On a game page: use the play paid for at the cabinet, if there is one. */
    takeCredit(game) {
      let credit = null;
      try { credit = JSON.parse(read(localStorage, CREDIT_KEY, 'null')); } catch (e) { credit = null; }
      if (!credit || credit.game !== game || Date.now() - credit.at > 2 * 60 * 1000) return false;
      try { localStorage.removeItem(CREDIT_KEY); } catch (e) { /* ignore */ }
      return true;
    },

    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    /** Format for display: 2 -> "02" */
    format(n) { return String(n).padStart(2, '0'); }
  };

  // Wipe the counters on time if the page is still open when the coins expire.
  let expiryTimer = 0;
  function scheduleExpiry() {
    clearTimeout(expiryTimer);
    const at = Coins.expiresAt();
    if (!at) return;
    const wait = Math.min(at - Date.now() + 50, 2147483000);
    expiryTimer = setTimeout(() => set(balance(), { type: 'expired' }), Math.max(0, wait));
  }
  scheduleExpiry();

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
