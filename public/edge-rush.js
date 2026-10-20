// Edge Rush - four paddles, one on each side of the box. Each paddle stays on its own side.
// You control one paddle at a time: switch to the side the ball is heading for, then slide it into place.
(function () {
  'use strict';

  const screen = document.getElementById('screen');
  const canvas = document.getElementById('arena');
  const ctx = canvas.getContext('2d');
  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const livesEl = document.getElementById('lives');
  const startCard = document.getElementById('start-card');
  const overCard = document.getElementById('over-card');
  const finalEl = document.getElementById('final');
  const soundBtn = document.getElementById('sound');
  const startBtn = document.getElementById('start');
  const againBtn = document.getElementById('again');
  const startLabel = document.getElementById('start-label');
  const Coins = window.Coins;
  // A coin inserted at the cabinet in the arcade hall pays for the first game here.
  let credit = Coins ? (Coins.takeCredit('edge-rush') ? 1 : 0) : 1;

  // ---- Geometry, all in "box units" where the arena is 1 x 1 ----
  const GAP = 0.035;         // space between the wall and a paddle
  const THICK = 0.022;       // paddle thickness
  const BALL_R = 0.018;
  const START_SPEED = 0.42;  // box widths per second
  const MAX_SPEED = 1.25;
  const KEY_SPEED = 1.35;    // how fast arrow keys slide a paddle
  const SIDES = ['top', 'right', 'bottom', 'left'];
  const COLORS = { lime: '#b6ff3b', cyan: '#36e4ff', pink: '#ff4fa3', sun: '#ffd23f' };

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : v; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* storage blocked: play on */ } }
  };

  let size = 600;
  let dpr = 1;
  let best = Number(store.get('edgeRushBest', 0)) || 0;
  let soundOn = store.get('edgeRushSound', '1') === '1';
  let audioCtx = null;

  const S = {
    running: false,
    score: 0,
    lives: 3,
    speed: START_SPEED,
    active: 'bottom',
    paddles: { top: 0.5, right: 0.5, bottom: 0.5, left: 0.5 },
    flashes: { top: 0, right: 0, bottom: 0, left: 0 },   // red flash after a miss
    hits: { top: 0, right: 0, bottom: 0, left: 0 },      // bright pulse after a hit
    ball: { x: 0.5, y: 0.5, vx: 0, vy: 0 },
    trail: [],
    serveIn: 0,   // seconds until the ball launches
    keys: new Set()
  };

  const pad6 = (n) => String(n).padStart(6, '0');
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const paddleLen = () => Math.max(0.18, 0.27 - S.score * 0.0025);

  // ---------------------------------------------------------------- sound
  function tone(freq, dur, type, vol, slideTo) {
    if (!soundOn) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      audioCtx = audioCtx || new Ctx();
      if (audioCtx.state === 'suspended') audioCtx.resume();
      const t = audioCtx.currentTime;
      const o = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(audioCtx.destination);
      o.start(t);
      o.stop(t + dur + 0.02);
    } catch (e) { /* ignore */ }
  }
  const sfx = {
    hit: () => tone(320 + Math.min(S.score, 40) * 14, 0.12, 'square', 0.06),
    switchTo: () => tone(880, 0.04, 'square', 0.03),
    miss: () => tone(160, 0.35, 'sawtooth', 0.12, 50),
    start: () => { tone(523, 0.08, 'square', 0.05); setTimeout(() => tone(784, 0.12, 'square', 0.05), 90); }
  };

  function renderSoundBtn() {
    soundBtn.textContent = soundOn ? '🔊' : '🔇';
    soundBtn.setAttribute('aria-pressed', String(soundOn));
  }
  soundBtn.addEventListener('click', () => {
    soundOn = !soundOn;
    store.set('edgeRushSound', soundOn ? '1' : '0');
    renderSoundBtn();
  });

  // ---------------------------------------------------------------- HUD
  function renderHUD() {
    scoreEl.textContent = pad6(S.score);
    bestEl.textContent = pad6(best);
    livesEl.querySelectorAll('.life').forEach((el, i) => el.classList.toggle('lost', i >= S.lives));
    livesEl.setAttribute('aria-label', `${S.lives} ${S.lives === 1 ? 'life' : 'lives'} left`);
  }

  // ---------------------------------------------------------------- game flow
  function serve() {
    S.ball.x = 0.5;
    S.ball.y = 0.5;
    S.ball.vx = 0;
    S.ball.vy = 0;
    S.trail = [];
    S.serveIn = 0.9;
  }

  function launch() {
    // A diagonal, never too close to an axis, so every side gets used.
    const a = (30 + Math.random() * 30) * Math.PI / 180;
    const sx = Math.random() < 0.5 ? -1 : 1;
    const sy = Math.random() < 0.5 ? -1 : 1;
    S.ball.vx = Math.cos(a) * S.speed * sx;
    S.ball.vy = Math.sin(a) * S.speed * sy;
  }

  function startGame() {
    S.running = true;
    S.score = 0;
    S.lives = 3;
    S.speed = START_SPEED;
    S.active = 'bottom';
    SIDES.forEach((s) => { S.paddles[s] = 0.5; S.flashes[s] = 0; S.hits[s] = 0; });
    startCard.classList.add('hidden');
    overCard.classList.add('hidden');
    renderHUD();
    serve();
    sfx.start();
    screen.focus({ preventScroll: true });
  }

  function gameOver() {
    S.running = false;
    if (S.score > best) {
      best = S.score;
      store.set('edgeRushBest', best);
    }
    renderHUD();
    finalEl.textContent = pad6(S.score);
    renderCoinGate();
    overCard.classList.remove('hidden');
    S.overAt = performance.now();
  }

  function miss(side) {
    S.flashes[side] = 1;
    S.lives -= 1;
    sfx.miss();
    screen.classList.remove('shake');
    void screen.offsetWidth; // restart the shake animation
    screen.classList.add('shake');
    renderHUD();
    if (S.lives <= 0) gameOver();
    else serve();
  }

  function bounce(side, along) {
    // `along` is where the ball met the paddle, -1 (one end) .. +1 (other end).
    // Hitting near an end sends the ball off at a steeper angle, like Pong.
    let deg = along * 52 + (Math.random() * 16 - 8);
    if (Math.abs(deg) < 9) deg = deg < 0 ? -9 : 9;
    const a = deg * Math.PI / 180;
    S.speed = Math.min(MAX_SPEED, S.speed * 1.035);
    const n = Math.cos(a) * S.speed;   // away from the paddle
    const t = Math.sin(a) * S.speed;   // along the paddle
    if (side === 'top') { S.ball.vx = t; S.ball.vy = n; }
    if (side === 'bottom') { S.ball.vx = t; S.ball.vy = -n; }
    if (side === 'left') { S.ball.vx = n; S.ball.vy = t; }
    if (side === 'right') { S.ball.vx = -n; S.ball.vy = t; }
    S.score += 1;
    S.hits[side] = 1;
    sfx.hit();
    renderHUD();
  }

  // Checks one side: did the ball cross the paddle's face this frame?
  function checkSide(side, px, py, nx, ny) {
    const face = GAP + THICK;
    const L = paddleLen();
    let crossed = false;
    let t = 0;
    let along = 0;
    if (side === 'top' && S.ball.vy < 0 && py - BALL_R >= face && ny - BALL_R < face) {
      t = (py - BALL_R - face) / (py - ny); along = px + (nx - px) * t; crossed = true;
    } else if (side === 'bottom' && S.ball.vy > 0 && py + BALL_R <= 1 - face && ny + BALL_R > 1 - face) {
      t = (1 - face - py - BALL_R) / (ny - py); along = px + (nx - px) * t; crossed = true;
    } else if (side === 'left' && S.ball.vx < 0 && px - BALL_R >= face && nx - BALL_R < face) {
      t = (px - BALL_R - face) / (px - nx); along = py + (ny - py) * t; crossed = true;
    } else if (side === 'right' && S.ball.vx > 0 && px + BALL_R <= 1 - face && nx + BALL_R > 1 - face) {
      t = (1 - face - px - BALL_R) / (nx - px); along = py + (ny - py) * t; crossed = true;
    }
    if (!crossed) return false;
    const center = S.paddles[side];
    const off = along - center;
    if (Math.abs(off) > L / 2 + BALL_R * 0.6) return false; // missed the paddle, keeps flying to the wall
    // Put the ball back on the paddle face, then send it away.
    if (side === 'top') { S.ball.y = face + BALL_R; S.ball.x = along; }
    if (side === 'bottom') { S.ball.y = 1 - face - BALL_R; S.ball.x = along; }
    if (side === 'left') { S.ball.x = face + BALL_R; S.ball.y = along; }
    if (side === 'right') { S.ball.x = 1 - face - BALL_R; S.ball.y = along; }
    bounce(side, clamp(off / (L / 2), -1, 1));
    return true;
  }

  function update(dt) {
    // Slide the active paddle with the arrow keys
    const L = paddleLen();
    const horizontal = S.active === 'top' || S.active === 'bottom';
    const dir = horizontal
      ? (S.keys.has('ArrowRight') ? 1 : 0) - (S.keys.has('ArrowLeft') ? 1 : 0)
      : (S.keys.has('ArrowDown') ? 1 : 0) - (S.keys.has('ArrowUp') ? 1 : 0);
    if (dir) S.paddles[S.active] += dir * KEY_SPEED * dt;
    SIDES.forEach((s) => { S.paddles[s] = clamp(S.paddles[s], GAP + L / 2, 1 - GAP - L / 2); });

    SIDES.forEach((s) => {
      S.flashes[s] = Math.max(0, S.flashes[s] - dt * 2.2);
      S.hits[s] = Math.max(0, S.hits[s] - dt * 4);
    });

    if (!S.running) return;

    if (S.serveIn > 0) {
      S.serveIn -= dt;
      if (S.serveIn <= 0) launch();
      return;
    }

    const px = S.ball.x;
    const py = S.ball.y;
    const nx = px + S.ball.vx * dt;
    const ny = py + S.ball.vy * dt;

    let bounced = false;
    for (const side of SIDES) {
      if (checkSide(side, px, py, nx, ny)) { bounced = true; break; }
    }
    if (!bounced) {
      S.ball.x = nx;
      S.ball.y = ny;
    }

    S.trail.push({ x: S.ball.x, y: S.ball.y });
    if (S.trail.length > 8) S.trail.shift();

    // Reached a wall: that side's paddle wasn't there.
    if (S.ball.y - BALL_R <= 0) miss('top');
    else if (S.ball.y + BALL_R >= 1) miss('bottom');
    else if (S.ball.x - BALL_R <= 0) miss('left');
    else if (S.ball.x + BALL_R >= 1) miss('right');
  }

  // ---------------------------------------------------------------- drawing
  function paddleRect(side) {
    const L = paddleLen();
    const c = S.paddles[side];
    if (side === 'top') return [c - L / 2, GAP, L, THICK];
    if (side === 'bottom') return [c - L / 2, 1 - GAP - THICK, L, THICK];
    if (side === 'left') return [GAP, c - L / 2, THICK, L];
    return [1 - GAP - THICK, c - L / 2, THICK, L];
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function draw() {
    const u = size;
    ctx.clearRect(0, 0, u, u);

    // Faint grid
    ctx.strokeStyle = 'rgba(182, 255, 59, 0.06)';
    ctx.lineWidth = 1;
    const step = u / 16;
    ctx.beginPath();
    for (let i = 1; i < 16; i++) {
      ctx.moveTo(i * step, 0); ctx.lineTo(i * step, u);
      ctx.moveTo(0, i * step); ctx.lineTo(u, i * step);
    }
    ctx.stroke();

    // Walls (flash red on a miss)
    SIDES.forEach((s) => {
      const f = S.flashes[s];
      ctx.save();
      ctx.lineWidth = 3 + f * 5;
      ctx.strokeStyle = f > 0 ? `rgba(255, 79, 163, ${0.25 + f * 0.75})` : 'rgba(182, 255, 59, 0.18)';
      ctx.shadowColor = COLORS.pink;
      ctx.shadowBlur = f * 24;
      ctx.beginPath();
      if (s === 'top') { ctx.moveTo(0, 1.5); ctx.lineTo(u, 1.5); }
      if (s === 'bottom') { ctx.moveTo(0, u - 1.5); ctx.lineTo(u, u - 1.5); }
      if (s === 'left') { ctx.moveTo(1.5, 0); ctx.lineTo(1.5, u); }
      if (s === 'right') { ctx.moveTo(u - 1.5, 0); ctx.lineTo(u - 1.5, u); }
      ctx.stroke();
      ctx.restore();
    });

    // Paddles
    SIDES.forEach((s) => {
      const [x, y, w, h] = paddleRect(s).map((v) => v * u);
      const isActive = s === S.active;
      const hit = S.hits[s];
      ctx.save();
      if (isActive) {
        // Rail the active paddle slides on
        ctx.strokeStyle = 'rgba(182, 255, 59, 0.22)';
        ctx.setLineDash([4, 6]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const g = GAP * u + THICK * u / 2;
        if (s === 'top') { ctx.moveTo(GAP * u, g); ctx.lineTo(u - GAP * u, g); }
        if (s === 'bottom') { ctx.moveTo(GAP * u, u - g); ctx.lineTo(u - GAP * u, u - g); }
        if (s === 'left') { ctx.moveTo(g, GAP * u); ctx.lineTo(g, u - GAP * u); }
        if (s === 'right') { ctx.moveTo(u - g, GAP * u); ctx.lineTo(u - g, u - GAP * u); }
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.shadowColor = isActive ? COLORS.lime : COLORS.cyan;
      ctx.shadowBlur = isActive ? 18 + hit * 20 : 6 + hit * 20;
      ctx.fillStyle = isActive
        ? (hit > 0 ? '#f4ffd9' : COLORS.lime)
        : `rgba(54, 228, 255, ${0.38 + hit * 0.6})`;
      roundRect(x, y, w, h, Math.min(w, h) / 2);
      ctx.fill();

      if (isActive) {
        // Little arrows at the ends: this paddle moves along this line
        ctx.shadowBlur = 0;
        ctx.fillStyle = COLORS.lime;
        const a = Math.max(5, u * 0.012);
        const horizontal = s === 'top' || s === 'bottom';
        const cx = x + w / 2;
        const cy = y + h / 2;
        ctx.beginPath();
        if (horizontal) {
          const inward = s === 'top' ? 1 : -1;
          const yy = cy + inward * (h / 2 + a * 1.6);
          ctx.moveTo(x - a * 0.2, yy); ctx.lineTo(x + a * 1.2, yy - a); ctx.lineTo(x + a * 1.2, yy + a);
          ctx.moveTo(x + w + a * 0.2, yy); ctx.lineTo(x + w - a * 1.2, yy - a); ctx.lineTo(x + w - a * 1.2, yy + a);
        } else {
          const inward = s === 'left' ? 1 : -1;
          const xx = cx + inward * (w / 2 + a * 1.6);
          ctx.moveTo(xx, y - a * 0.2); ctx.lineTo(xx - a, y + a * 1.2); ctx.lineTo(xx + a, y + a * 1.2);
          ctx.moveTo(xx, y + h + a * 0.2); ctx.lineTo(xx - a, y + h - a * 1.2); ctx.lineTo(xx + a, y + h - a * 1.2);
        }
        ctx.fill();
      }
      ctx.restore();
    });

    // Ball and trail
    if (S.running || S.lives > 0) {
      const blink = S.serveIn > 0 && Math.floor(S.serveIn * 8) % 2 === 0;
      S.trail.forEach((p, i) => {
        ctx.fillStyle = `rgba(182, 255, 59, ${(i + 1) / S.trail.length * 0.22})`;
        ctx.beginPath();
        ctx.arc(p.x * u, p.y * u, BALL_R * u * (0.5 + i / S.trail.length * 0.5), 0, Math.PI * 2);
        ctx.fill();
      });
      if (!blink) {
        ctx.save();
        ctx.fillStyle = '#ffffff';
        ctx.shadowColor = COLORS.lime;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(S.ball.x * u, S.ball.y * u, BALL_R * u, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  // ---------------------------------------------------------------- loop
  let last = 0;
  function frame(now) {
    const dt = Math.min(0.033, (now - (last || now)) / 1000);
    last = now;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  function resize() {
    const rect = screen.getBoundingClientRect();
    size = Math.max(200, Math.floor(rect.width));
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // ---------------------------------------------------------------- controls
  function setActive(side) {
    if (side === S.active) return;
    S.active = side;
    sfx.switchTo();
  }

  const PICK = { w: 'top', a: 'left', s: 'bottom', d: 'right' };

  window.addEventListener('keydown', (e) => {
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if ((k === ' ' || k === 'Enter') && !S.running) {
      if (e.target.closest && e.target.closest('a, button')) return; // let the focused control handle it
      e.preventDefault();
      if (!overCard.classList.contains('hidden') && performance.now() - (S.overAt || 0) < 500) return;
      payAndStart();
      return;
    }
    if (PICK[k]) { setActive(PICK[k]); e.preventDefault(); return; }
    if (k.startsWith('Arrow')) { S.keys.add(k); e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => S.keys.delete(e.key));
  window.addEventListener('blur', () => S.keys.clear());

  // Pointer: tap/click near a side to take that paddle; drag (or just move the mouse) to slide it.
  let dragging = false;
  function local(e) {
    const r = canvas.getBoundingClientRect();
    return { u: clamp((e.clientX - r.left) / r.width, 0, 1), v: clamp((e.clientY - r.top) / r.height, 0, 1) };
  }
  function follow(pt) {
    const horizontal = S.active === 'top' || S.active === 'bottom';
    S.paddles[S.active] = horizontal ? pt.u : pt.v;
  }

  screen.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    if (!S.running) return;
    e.preventDefault();
    const pt = local(e);
    const d = { top: pt.v, bottom: 1 - pt.v, left: pt.u, right: 1 - pt.u };
    const nearest = SIDES.reduce((a, b) => (d[a] <= d[b] ? a : b));
    setActive(nearest);
    follow(pt);
    dragging = true;
    try { screen.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
  });
  screen.addEventListener('pointermove', (e) => {
    if (!S.running) return;
    if (dragging || e.pointerType === 'mouse') follow(local(e));
  });
  const stopDrag = () => { dragging = false; };
  screen.addEventListener('pointerup', stopDrag);
  screen.addEventListener('pointercancel', stopDrag);

  // ---------------------------------------------------------------- coins: 1 coin = 1 game
  function renderCoinGate() {
    const canPay = credit > 0 || !Coins || Coins.balance() > 0;
    startLabel.textContent = credit > 0 ? 'Press start' : 'Insert coin';
    startBtn.hidden = !canPay;
    againBtn.hidden = !canPay;
    document.querySelectorAll('[data-get-coins]').forEach((a) => { a.hidden = canPay; });
  }

  function payAndStart() {
    if (S.running) return;
    if (credit > 0) credit -= 1;
    else if (Coins && !Coins.spend()) { renderCoinGate(); return; }
    startGame();
  }

  if (Coins) Coins.onChange(() => { if (!S.running) renderCoinGate(); });
  startBtn.addEventListener('click', payAndStart);
  againBtn.addEventListener('click', payAndStart);
  renderCoinGate();

  screen.tabIndex = 0;
  window.addEventListener('resize', resize);
  resize();
  renderSoundBtn();
  renderHUD();
  requestAnimationFrame(frame);
})();
