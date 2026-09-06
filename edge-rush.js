const game = document.querySelector('#game'),
      ball = document.querySelector('#ball'),
      overlay = document.querySelector('#overlay'),
      start = document.querySelector('#start'),
      message = document.querySelector('#message'),
      scoreEl = document.querySelector('#score'),
      bestEl = document.querySelector('#best');

const sides = {
  top: { el: document.querySelector('#edge-top'), count: 6 },
  right: { el: document.querySelector('#edge-right'), count: 4 },
  bottom: { el: document.querySelector('#edge-bottom'), count: 6 },
  left: { el: document.querySelector('#edge-left'), count: 4 }
};

let state, frame, lastTime;

function best() {
  return Number(localStorage.getItem('edgeRushBest') || 0);
}

function setMessage(text, type = '') {
  message.textContent = text;
  message.className = `message ${type}`;
}

function updateTileCounts() {
  const isMobile = window.innerWidth <= 600;
  const topBottomCount = isMobile ? 4 : 6;
  const sideCount = 4;
  if (sides.top.count !== topBottomCount || sides.left.count !== sideCount) {
    sides.top.count = topBottomCount;
    sides.bottom.count = topBottomCount;
    sides.left.count = sideCount;
    sides.right.count = sideCount;
    buildEdges();
  }
}

function buildEdges() {
  Object.entries(sides).forEach(([side, data]) => {
    data.el.innerHTML = '';
    for (let i = 0; i < data.count; i++) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.side = side;
      button.dataset.index = i;
      button.setAttribute('aria-label', `${side} section ${i + 1}`);
      button.addEventListener('click', () => catchEdge(side, i));
      data.el.append(button);
    }
  });
}

function dimensions() {
  const rect = game.getBoundingClientRect();
  return { w: rect.width, h: rect.height };
}

function setTileDepth() {
  const isMobile = window.innerWidth <= 600;
  const maxDepth = isMobile ? 34 : 48;
  const minDepth = 18;
  state.tileDepth = Math.max(minDepth, maxDepth - state.score * 1.5);
  game.style.setProperty('--tile-depth', `${state.tileDepth}px`);
}

function reset() {
  updateTileCounts();
  const { w, h } = dimensions();
  const isMobile = window.innerWidth <= 600;
  state = {
    x: w / 2,
    y: h / 2,
    vx: (Math.random() > 0.5 ? 1 : -1) * 145,
    vy: (Math.random() > 0.5 ? 1 : -1) * 105,
    speed: 185,
    score: 0,
    tileDepth: isMobile ? 34 : 48,
    waiting: null,
    deadline: 0,
    running: true
  };
  setTileDepth();
  scoreEl.textContent = '0';
  setMessage('Watch the ball.');
  lastTime = performance.now();
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(loop);
}

function setBall() {
  ball.style.left = `${state.x}px`;
  ball.style.top = `${state.y}px`;
}

function segment(side, x, y, w, h) {
  const count = sides[side].count;
  const d = state.tileDepth;
  let value;
  if (side === 'top' || side === 'bottom') {
    value = (x - d) / Math.max(1, w - 2 * d);
  } else {
    value = (y - d) / Math.max(1, h - 2 * d);
  }
  return Math.max(0, Math.min(count - 1, Math.floor(value * count)));
}

function clearTarget() {
  document.querySelectorAll('.edge button.target').forEach(button => button.classList.remove('target'));
}

function twang() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = new AudioContext(),
        oscillator = context.createOscillator(),
        gain = context.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(170, context.currentTime);
  oscillator.frequency.exponentialRampToValueAtTime(510, context.currentTime + 0.11);
  gain.gain.setValueAtTime(0.09, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.22);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + 0.23);
}

function arrive(side) {
  const { w, h } = dimensions();
  const index = segment(side, state.x, state.y, w, h);
  state.waiting = { side, index };
  state.deadline = performance.now() + 1150;
  clearTarget();
  if (sides[side].el.children[index]) {
    sides[side].el.children[index].classList.add('target');
  }
  setMessage('Click the glowing edge!', 'danger');
}

function rebound(side) {
  const angle = (25 + Math.random() * 40) * Math.PI / 180;
  const speed = state.speed;
  if (side === 'left') {
    state.vx = Math.cos(angle) * speed;
    state.vy = (Math.random() > 0.5 ? 1 : -1) * Math.sin(angle) * speed;
  } else if (side === 'right') {
    state.vx = -Math.cos(angle) * speed;
    state.vy = (Math.random() > 0.5 ? 1 : -1) * Math.sin(angle) * speed;
  } else if (side === 'top') {
    state.vy = Math.cos(angle) * speed;
    state.vx = (Math.random() > 0.5 ? 1 : -1) * Math.sin(angle) * speed;
  } else {
    state.vy = -Math.cos(angle) * speed;
    state.vx = (Math.random() > 0.5 ? 1 : -1) * Math.sin(angle) * speed;
  }
}

function catchEdge(side, index) {
  if (!state?.running || !state.waiting) return;
  if (state.waiting.side !== side || state.waiting.index !== index) {
    end('Wrong section!');
    return;
  }
  clearTarget();
  state.score++;
  setTileDepth();
  state.speed = Math.min(680, state.speed * 1.06);
  scoreEl.textContent = state.score;
  state.waiting = null;
  twang();
  rebound(side);
  setMessage(`Nice catch — speed ${Math.round(state.speed)}.`, 'success');
}

function end(reason) {
  state.running = false;
  clearTarget();
  cancelAnimationFrame(frame);
  const current = best();
  if (state.score > current) localStorage.setItem('edgeRushBest', state.score);
  bestEl.textContent = Math.max(current, state.score);
  overlay.innerHTML = `<div>
    <p class="kicker">GAME OVER</p>
    <h2>${state.score} ${state.score === 1 ? 'point' : 'points'}</h2>
    <p>${reason} Your best is ${Math.max(current, state.score)}.</p>
    <button id="restart" type="button">Play again <span>→</span></button>
  </div>`;
  overlay.classList.remove('hidden');
  document.querySelector('#restart').addEventListener('click', play);
  setMessage('');
}

function loop(now) {
  if (!state.running) return;
  const dt = Math.min(0.03, (now - lastTime) / 1000);
  lastTime = now;
  const { w, h } = dimensions(), pad = state.tileDepth + 11;
  if (state.waiting) {
    if (now > state.deadline) end('Too slow!');
    else frame = requestAnimationFrame(loop);
    return;
  }
  state.speed = Math.min(680, state.speed + dt * 1.6);
  const length = Math.hypot(state.vx, state.vy) || 1;
  state.vx = state.vx / length * state.speed;
  state.vy = state.vy / length * state.speed;
  state.x += state.vx * dt;
  state.y += state.vy * dt;

  let side = null;
  if (state.x <= pad) {
    state.x = pad;
    side = 'left';
  } else if (state.x >= w - pad) {
    state.x = w - pad;
    side = 'right';
  } else if (state.y <= pad) {
    state.y = pad;
    side = 'top';
  } else if (state.y >= h - pad) {
    state.y = h - pad;
    side = 'bottom';
  }

  setBall();
  if (side) arrive(side);
  frame = requestAnimationFrame(loop);
}

function play() {
  overlay.classList.add('hidden');
  reset();
}

updateTileCounts();
buildEdges();
bestEl.textContent = best();
start.addEventListener('click', play);

window.addEventListener('resize', () => {
  updateTileCounts();
  if (state?.running && !state.waiting) {
    const { w, h } = dimensions(), pad = state.tileDepth + 11;
    state.x = Math.min(Math.max(state.x, pad), w - pad);
    state.y = Math.min(Math.max(state.y, pad), h - pad);
    setBall();
  }
});
