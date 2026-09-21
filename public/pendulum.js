/**
 * Chrono Pendulum - pineapp.win Original
 * Precision timing game with metallic pendulum physics and target circle intersections.
 */

(function () {
  'use strict';

  // DOM Elements
  const canvas = document.getElementById('game-canvas');
  const ctx = canvas.getContext('2d');
  const arenaContainer = document.getElementById('arena-container');
  const currentScoreEl = document.getElementById('current-score');
  const bestScoreEl = document.getElementById('best-score');
  const speedMeterEl = document.getElementById('speed-meter');
  const shieldsRow = document.getElementById('shields-display');
  const startOverlay = document.getElementById('start-overlay');
  const gameoverOverlay = document.getElementById('gameover-overlay');
  const startBtn = document.getElementById('start-btn');
  const restartBtn = document.getElementById('restart-btn');
  const soundToggleBtn = document.getElementById('sound-toggle');
  const soundIcon = document.getElementById('sound-icon');
  const finalScoreEl = document.getElementById('final-score');
  const summaryBestEl = document.getElementById('summary-best');
  const summaryPerfectsEl = document.getElementById('summary-perfects');
  const summarySpeedEl = document.getElementById('summary-speed');
  const tapHint = document.getElementById('tap-hint');

  // Audio Context & Settings
  let audioCtx = null;
  let soundEnabled = localStorage.getItem('pendulum_sound') !== 'false';
  updateSoundIcon();

  function initAudio() {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioCtx = new AudioCtx();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  function updateSoundIcon() {
    if (soundIcon) {
      soundIcon.textContent = soundEnabled ? '🔊' : '🔇';
    }
  }

  soundToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    soundEnabled = !soundEnabled;
    localStorage.setItem('pendulum_sound', soundEnabled);
    updateSoundIcon();
  });

  // Sound Synthesizers (Web Audio API)
  function playMetallicChime(freqs, duration, gainLevel, type = 'sine') {
    if (!soundEnabled || !audioCtx) return;
    try {
      const now = audioCtx.currentTime;
      freqs.forEach((f, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(f, now);

        const individualGain = gainLevel / (i + 1);
        gain.gain.setValueAtTime(individualGain, now);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(now);
        osc.stop(now + duration);
      });
    } catch (e) {
      // Audio error ignored
    }
  }

  function playPerfectSound() {
    // Rich sparkling metallic bell chord: C6 (1046Hz), E6 (1318Hz), G6 (1568Hz), C7 (2093Hz)
    initAudio();
    playMetallicChime([1046.5, 1318.5, 1567.98, 2093], 1.2, 0.28, 'triangle');
    setTimeout(() => {
      playMetallicChime([2093, 2637, 3136], 0.8, 0.15, 'sine');
    }, 60);
  }

  function playGoodSound() {
    // Clean metallic ping chime: A5 (880Hz) and E6 (1318Hz)
    initAudio();
    playMetallicChime([880, 1318.5], 0.45, 0.2, 'triangle');
  }

  function playMissSound() {
    // Low mechanical damping thud
    if (!soundEnabled || !audioCtx) return;
    try {
      initAudio();
      const now = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(45, now + 0.22);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {}
  }

  // Game State Variables
  let isPlaying = false;
  let score = 0;
  let bestScore = parseInt(localStorage.getItem('pendulum_best_score') || '0', 10);
  let perfectHitsCount = 0;
  let shields = 3;
  let speedMultiplier = 1.0;
  let lastFrameTime = 0;
  let clickCooldown = 0;

  // Visual Effects Lists
  let particles = [];
  let shockwaves = [];
  let popups = [];
  let ghostTrails = [];

  // Canvas Sizing
  let canvasWidth = 800;
  let canvasHeight = 580;
  let dpr = window.devicePixelRatio || 1;

  function resizeCanvas() {
    const rect = arenaContainer.getBoundingClientRect();
    canvasWidth = rect.width;
    canvasHeight = rect.height;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(canvasWidth * dpr);
    canvas.height = Math.floor(canvasHeight * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Responsive scaling for mobile and small screens
    const scale = Math.max(0.65, Math.min(1.0, canvasWidth / 520));
    pendulum.bobRadius = Math.round(24 * scale);
    targetCircle.radius = Math.round(38 * scale);

    // Dynamic horizontal & vertical reach constraints so the pendulum NEVER clips
    pendulum.pivotX = canvasWidth / 2;
    pendulum.pivotY = Math.max(34, Math.round(canvasHeight * 0.10));

    // Safe boundaries: pendulum swing must stay completely inside horizontal boundaries
    const safeMargin = 16;
    const safeHorizontalForBob = (canvasWidth / 2) - pendulum.bobRadius - safeMargin;
    const safeHorizontalForTarget = (canvasWidth / 2) - targetCircle.radius - safeMargin;

    const maxLenFromBob = safeHorizontalForBob / Math.sin(pendulum.maxAngle);
    const maxLenFromTarget = safeHorizontalForTarget / Math.sin(pendulum.maxAngle * 0.78);
    const maxLenFromWidth = Math.min(maxLenFromBob, maxLenFromTarget);

    const maxLenFromHeight = canvasHeight - pendulum.pivotY - pendulum.bobRadius - 20;

    pendulum.length = Math.round(Math.max(120, Math.min(maxLenFromWidth, maxLenFromHeight * 0.78, canvasHeight * 0.62)));

    if (!targetCircle.initialized) {
      spawnTargetCircle();
    } else {
      updateTargetPosition();
    }
  }

  // Pendulum Physics Configuration
  const pendulum = {
    pivotX: 400,
    pivotY: 70,
    length: 360,
    bobRadius: 26,
    maxAngle: 1.08, // ~62 degrees
    baseSpeed: 1.65, // Gentle starting swing frequency (rad/sec)
    currentPhase: 0,
    angle: 0,
    bobX: 400,
    bobY: 430,
    prevBobX: 400,
    prevBobY: 430
  };

  // Target Circle Configuration
  const targetCircle = {
    initialized: false,
    angle: 0,
    x: 400,
    y: 430,
    radius: 40, // Target radius (larger than bobRadius so bob can fit completely inside)
    pulsePhase: 0,
    rotation: 0
  };

  function updateTargetPosition() {
    targetCircle.x = pendulum.pivotX + pendulum.length * Math.sin(targetCircle.angle);
    targetCircle.y = pendulum.pivotY + pendulum.length * Math.cos(targetCircle.angle);
  }

  function spawnTargetCircle() {
    targetCircle.initialized = true;
    // Pick an angle along the pendulum arc, ensuring it's not right on top of current bob
    // Ensure candidate angle keeps target circle safely inside canvas horizontally
    const safeHorizontalForTarget = (canvasWidth / 2) - targetCircle.radius - 16;
    const maxSafeArcSin = Math.min(0.95, Math.max(0.1, safeHorizontalForTarget / Math.max(1, pendulum.length)));
    const maxSafeTargetAngle = Math.min(pendulum.maxAngle * 0.78, Math.asin(maxSafeArcSin));

    const minAngle = -maxSafeTargetAngle;
    const maxAngle = maxSafeTargetAngle;
    let candidateAngle = 0;
    let attempts = 0;

    do {
      candidateAngle = minAngle + Math.random() * (maxAngle - minAngle);
      attempts++;
    } while (attempts < 15 && Math.abs(candidateAngle - pendulum.angle) < 0.32);

    targetCircle.angle = candidateAngle;
    updateTargetPosition();
  }

  // Particle Class
  class Particle {
    constructor(x, y, color, size, speed, angle, friction = 0.94, gravity = 0.18, life = 1.0) {
      this.x = x;
      this.y = y;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      this.color = color;
      this.size = size;
      this.maxLife = life;
      this.life = life;
      this.friction = friction;
      this.gravity = gravity;
      this.alpha = 1;
    }

    update(dt) {
      this.vx *= this.friction;
      this.vy = this.vy * this.friction + this.gravity;
      this.x += this.vx * dt * 60;
      this.y += this.vy * dt * 60;
      this.life -= dt;
      this.alpha = Math.max(0, this.life / this.maxLife);
      return this.life > 0;
    }

    draw(c) {
      c.save();
      c.globalAlpha = this.alpha;
      c.fillStyle = this.color;
      c.shadowColor = this.color;
      c.shadowBlur = 8;
      c.beginPath();
      c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      c.fill();
      c.restore();
    }
  }

  // Shockwave Class
  class Shockwave {
    constructor(x, y, maxRadius, color = '#ffd15c', lineWidth = 4) {
      this.x = x;
      this.y = y;
      this.radius = 8;
      this.maxRadius = maxRadius;
      this.color = color;
      this.lineWidth = lineWidth;
      this.life = 1.0;
    }

    update(dt) {
      this.radius += (this.maxRadius - this.radius) * 12 * dt;
      this.life -= dt * 2.2;
      return this.life > 0;
    }

    draw(c) {
      if (this.life <= 0) return;
      c.save();
      c.globalAlpha = Math.max(0, this.life);
      c.strokeStyle = this.color;
      c.lineWidth = this.lineWidth * this.life;
      c.shadowColor = this.color;
      c.shadowBlur = 15;
      c.beginPath();
      c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
  }

  // Floating Text Popups
  class TextPopup {
    constructor(text, x, y, color = '#ffd15c', fontSize = 28, isPerfect = false) {
      this.text = text;
      this.x = x;
      this.y = y;
      this.color = color;
      this.fontSize = fontSize;
      this.isPerfect = isPerfect;
      this.life = 1.0;
      this.vy = -1.8;
      this.scale = 0.5;
    }

    update(dt) {
      this.y += this.vy * dt * 60;
      this.scale = Math.min(1.15, this.scale + dt * 5);
      this.life -= dt * 1.3;
      return this.life > 0;
    }

    draw(c) {
      if (this.life <= 0) return;
      c.save();
      c.globalAlpha = Math.max(0, Math.min(1, this.life * 1.5));
      c.font = `800 ${this.fontSize}px 'Space Grotesk', sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillStyle = this.color;
      c.shadowColor = this.color;
      c.shadowBlur = this.isPerfect ? 18 : 8;

      c.translate(this.x, this.y);
      c.scale(this.scale, this.scale);
      c.fillText(this.text, 0, 0);
      c.restore();
    }
  }

  // Ghost Trails for Motion Effect
  class GhostTrail {
    constructor(x, y, radius) {
      this.x = x;
      this.y = y;
      this.radius = radius;
      this.alpha = 0.28;
    }

    update(dt) {
      this.alpha -= dt * 2.5;
      return this.alpha > 0;
    }

    draw(c) {
      if (this.alpha <= 0) return;
      c.save();
      c.globalAlpha = this.alpha;
      c.strokeStyle = '#d9f36a';
      c.lineWidth = 1.5;
      c.shadowColor = '#d9f36a';
      c.shadowBlur = 6;
      c.beginPath();
      c.arc(this.x, this.y, this.radius * 0.95, 0, Math.PI * 2);
      c.stroke();
      c.restore();
    }
  }

  // Update Pendulum Position
  function updatePendulum(dt) {
    const angularSpeed = pendulum.baseSpeed * speedMultiplier;
    pendulum.currentPhase += angularSpeed * dt;

    // Harmonic motion: angle = maxAngle * sin(phase)
    pendulum.angle = pendulum.maxAngle * Math.sin(pendulum.currentPhase);

    pendulum.prevBobX = pendulum.bobX;
    pendulum.prevBobY = pendulum.bobY;

    pendulum.bobX = pendulum.pivotX + pendulum.length * Math.sin(pendulum.angle);
    pendulum.bobY = pendulum.pivotY + pendulum.length * Math.cos(pendulum.angle);

    // Spawn subtle ghost trails at higher speeds
    if (speedMultiplier > 1.25 && Math.random() < 0.4) {
      ghostTrails.push(new GhostTrail(pendulum.bobX, pendulum.bobY, pendulum.bobRadius));
    }
  }

  // Visual Effects Spawners
  function triggerPerfectEffect(x, y) {
    playPerfectSound();

    // Shockwaves
    shockwaves.push(new Shockwave(x, y, 95, '#ffd15c', 5));
    shockwaves.push(new Shockwave(x, y, 140, '#5ef3d2', 3));
    shockwaves.push(new Shockwave(x, y, 190, '#d9f36a', 2));

    // Particle explosion (gold, lime, cyan, chrome silver)
    const colors = ['#ffd15c', '#ffe699', '#ffffff', '#d9f36a', '#5ef3d2'];
    for (let i = 0; i < 45; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2.5 + Math.random() * 8.5;
      const size = 2 + Math.random() * 4.5;
      const color = colors[Math.floor(Math.random() * colors.length)];
      particles.push(new Particle(x, y, color, size, speed, angle, 0.93, 0.22, 1.1 + Math.random() * 0.4));
    }

    // Floating text banner
    popups.push(new TextPopup('+10 PERFECT!', x, y - 25, '#ffd15c', 32, true));

    // Screen shake and golden perimeter flash
    triggerScreenShake();
    arenaContainer.classList.add('flash-gold');
    setTimeout(() => arenaContainer.classList.remove('flash-gold'), 320);
  }

  function triggerGoodEffect(x, y) {
    playGoodSound();

    // Small shockwave
    shockwaves.push(new Shockwave(x, y, 70, '#d9f36a', 3));

    // Sparks
    for (let i = 0; i < 18; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      const size = 1.8 + Math.random() * 3;
      const color = Math.random() > 0.4 ? '#d9f36a' : '#ffffff';
      particles.push(new Particle(x, y, color, size, speed, angle, 0.94, 0.18, 0.7 + Math.random() * 0.3));
    }

    // Floating text
    popups.push(new TextPopup('+1 GOOD', x, y - 20, '#d9f36a', 24, false));
  }

  function triggerMissEffect(x, y) {
    playMissSound();

    // Red spark particles
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4;
      particles.push(new Particle(x, y, '#ff5252', 2.5, speed, angle, 0.92, 0.2, 0.6));
    }

    // Floating Miss text
    popups.push(new TextPopup('MISS!', x, y - 20, '#ff5252', 24, false));

    // Screen shake and red flash
    triggerScreenShake();
    arenaContainer.classList.add('flash-red');
    setTimeout(() => arenaContainer.classList.remove('flash-red'), 260);
  }

  function triggerScreenShake() {
    arenaContainer.classList.remove('shake-screen');
    void arenaContainer.offsetWidth; // Force reflow
    arenaContainer.classList.add('shake-screen');
    setTimeout(() => arenaContainer.classList.remove('shake-screen'), 280);
  }

  // Update HUD
  function updateHUD() {
    currentScoreEl.textContent = score;
    bestScoreEl.textContent = bestScore;
    speedMeterEl.textContent = `${speedMultiplier.toFixed(1)}x`;

    // Shields display
    if (shieldsRow) {
      const pips = shieldsRow.querySelectorAll('.shield-pip');
      pips.forEach((pip, idx) => {
        if (idx < shields) {
          pip.className = 'shield-pip active';
        } else {
          pip.className = 'shield-pip lost';
        }
      });
    }
  }

  // Main Strike / Action Trigger
  function handleStrike() {
    if (!isPlaying) return;
    if (clickCooldown > 0) return;
    clickCooldown = 0.16; // 160ms cooldown to prevent multi-tap spam

    // Calculate distance between center of pendulum bob and target circle
    const dx = pendulum.bobX - targetCircle.x;
    const dy = pendulum.bobY - targetCircle.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    const bobR = pendulum.bobRadius;
    const targetR = targetCircle.radius;

    // Condition 1: Completely inside the circle
    // The bob is fully contained when: distance + bobR <= targetR
    if (distance + bobR <= targetR) {
      score += 10;
      perfectHitsCount++;
      // Accelerate pendulum with accurate tap (halved for smoother scaling)
      speedMultiplier += 0.0425;
      triggerPerfectEffect(targetCircle.x, targetCircle.y);
      spawnTargetCircle();
    }
    // Condition 2: Partially inside the circle
    // The bob intersects or overlaps partially: distance < bobR + targetR
    else if (distance < bobR + targetR) {
      score += 1;
      // Accelerate pendulum with accurate tap (halved for smoother scaling)
      speedMultiplier += 0.0225;
      triggerGoodEffect(pendulum.bobX, pendulum.bobY);
      spawnTargetCircle();
    }
    // Condition 3: Miss (not touching circle)
    else {
      shields--;
      triggerMissEffect(pendulum.bobX, pendulum.bobY);
      if (shields <= 0) {
        gameOver();
      }
    }

    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('pendulum_best_score', bestScore);
    }

    updateHUD();
  }

  // Start Game
  function startGame() {
    initAudio();
    isPlaying = true;
    score = 0;
    shields = 3;
    speedMultiplier = 1.0;
    perfectHitsCount = 0;
    particles = [];
    shockwaves = [];
    popups = [];
    ghostTrails = [];
    pendulum.currentPhase = 0;

    spawnTargetCircle();
    updateHUD();

    startOverlay.classList.add('hidden');
    gameoverOverlay.classList.add('hidden');
    if (tapHint) tapHint.style.display = 'block';
  }

  // Game Over
  function gameOver() {
    isPlaying = false;
    if (score > bestScore) {
      bestScore = score;
      localStorage.setItem('pendulum_best_score', bestScore);
    }

    finalScoreEl.textContent = score;
    summaryBestEl.textContent = bestScore;
    summaryPerfectsEl.textContent = perfectHitsCount;
    summarySpeedEl.textContent = `${speedMultiplier.toFixed(1)}x`;

    gameoverOverlay.classList.remove('hidden');
    if (tapHint) tapHint.style.display = 'none';
  }

  // Event Listeners for Controls
  startBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    initAudio();
    startGame();
  });

  restartBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    initAudio();
    startGame();
  });

  arenaContainer.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    e.preventDefault();
    initAudio();
    if (!isPlaying) {
      if (!startOverlay.classList.contains('hidden') || !gameoverOverlay.classList.contains('hidden')) {
        startGame();
      }
      return;
    }
    handleStrike();
  });

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      initAudio();
      if (!isPlaying) {
        startGame();
      } else {
        handleStrike();
      }
    }
  });

  // RENDER ROUTINES

  // Draw Background Elements & Arc Guide Path
  function drawBackground() {
    // Subtle background trajectory arc along which the pendulum swings
    ctx.save();
    ctx.strokeStyle = 'rgba(217, 243, 106, 0.12)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 6]);
    ctx.beginPath();
    const startArc = Math.PI / 2 - pendulum.maxAngle;
    const endArc = Math.PI / 2 + pendulum.maxAngle;
    ctx.arc(pendulum.pivotX, pendulum.pivotY, pendulum.length, startArc, endArc, false);
    ctx.stroke();
    ctx.restore();

    // Ambient radial glow behind target circle
    ctx.save();
    const targetGlow = ctx.createRadialGradient(
      targetCircle.x, targetCircle.y, 0,
      targetCircle.x, targetCircle.y, targetCircle.radius * 2
    );
    targetGlow.addColorStop(0, 'rgba(217, 243, 106, 0.12)');
    targetGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = targetGlow;
    ctx.beginPath();
    ctx.arc(targetCircle.x, targetCircle.y, targetCircle.radius * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // Draw Target Circle
  function drawTargetCircle(dt) {
    targetCircle.pulsePhase += dt * 3.5;
    targetCircle.rotation += dt * 0.8;

    const x = targetCircle.x;
    const y = targetCircle.y;
    const r = targetCircle.radius;
    const pulseScale = 1 + Math.sin(targetCircle.pulsePhase) * 0.04;

    ctx.save();
    ctx.translate(x, y);

    // Outer subtle radar pulse ring
    const radarRadius = r * (1 + (Math.sin(targetCircle.pulsePhase) + 1) * 0.22);
    ctx.strokeStyle = 'rgba(217, 243, 106, 0.15)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, radarRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Main Target Ring (Rotating dashed futuristic perimeter)
    ctx.rotate(targetCircle.rotation);
    ctx.strokeStyle = '#d9f36a';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = '#d9f36a';
    ctx.shadowBlur = 12;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.arc(0, 0, r * pulseScale, 0, Math.PI * 2);
    ctx.stroke();

    // Inner Target Reticle Core
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(94, 243, 210, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.55, 0, Math.PI * 2);
    ctx.stroke();

    // Center Crosshair Dot
    ctx.fillStyle = '#5ef3d2';
    ctx.shadowColor = '#5ef3d2';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(0, 0, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Draw Metallic Pendulum (Chrome Rod, Pivot, and Specular Bob)
  function drawMetallicPendulum() {
    const pX = pendulum.pivotX;
    const pY = pendulum.pivotY;
    const bX = pendulum.bobX;
    const bY = pendulum.bobY;
    const bR = pendulum.bobRadius;

    ctx.save();

    // 1. Draw Metallic Rod (Cylinder with Chrome Specular Highlight)
    const rodWidth = 8;
    const angle = Math.atan2(bY - pY, bX - pX);
    const perpAngle = angle + Math.PI / 2;

    const dx = Math.cos(perpAngle) * (rodWidth / 2);
    const dy = Math.sin(perpAngle) * (rodWidth / 2);

    // Multi-stop linear gradient perpendicular to the rod
    const rodGrad = ctx.createLinearGradient(
      pX - dx, pY - dy,
      pX + dx, pY + dy
    );
    rodGrad.addColorStop(0.0, '#2d3832');
    rodGrad.addColorStop(0.2, '#7d8e85');
    rodGrad.addColorStop(0.48, '#ffffff'); // Bright specular chrome streak
    rodGrad.addColorStop(0.75, '#8c9e94');
    rodGrad.addColorStop(1.0, '#1a221e');

    ctx.fillStyle = rodGrad;
    ctx.beginPath();
    ctx.moveTo(pX - dx, pY - dy);
    ctx.lineTo(bX - dx, bY - dy);
    ctx.lineTo(bX + dx, bY + dy);
    ctx.lineTo(pX + dx, pY + dy);
    ctx.closePath();
    ctx.fill();

    // Subtle edge contour on rod
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // 2. Draw Metallic Bob (3D Polished Chrome Sphere)
    // Multi-stop radial gradient with light source offset toward top-left
    const lightOffsetX = bX - bR * 0.35;
    const lightOffsetY = bY - bR * 0.35;

    const sphereGrad = ctx.createRadialGradient(
      lightOffsetX, lightOffsetY, 2,
      bX, bY, bR
    );
    sphereGrad.addColorStop(0.0, '#ffffff'); // Specular highlight glare
    sphereGrad.addColorStop(0.12, '#f0f5f2');
    sphereGrad.addColorStop(0.35, '#a4b5ac'); // Polished steel
    sphereGrad.addColorStop(0.65, '#506158'); // Deep metal body
    sphereGrad.addColorStop(0.88, '#1e2622'); // Dark shadow rim
    sphereGrad.addColorStop(1.0, '#6d8076');  // Secondary rim bounce reflection

    // Outer subtle metallic glow
    ctx.shadowColor = 'rgba(217, 243, 106, 0.35)';
    ctx.shadowBlur = 15;
    ctx.fillStyle = sphereGrad;
    ctx.beginPath();
    ctx.arc(bX, bY, bR, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Specular Reflection Curved Horizon Line (Classic Chrome Reflection)
    ctx.save();
    ctx.beginPath();
    ctx.arc(bX, bY, bR - 1, 0, Math.PI * 2);
    ctx.clip();

    // Horizontal chrome reflection band across sphere
    const bandGrad = ctx.createLinearGradient(bX, bY - bR * 0.5, bX, bY + bR * 0.7);
    bandGrad.addColorStop(0, 'rgba(255, 255, 255, 0.45)');
    bandGrad.addColorStop(0.35, 'rgba(217, 243, 106, 0.2)');
    bandGrad.addColorStop(0.5, 'transparent');
    bandGrad.addColorStop(0.8, 'rgba(94, 243, 210, 0.15)');
    bandGrad.addColorStop(1, 'rgba(255, 255, 255, 0.3)');

    ctx.fillStyle = bandGrad;
    ctx.fillRect(bX - bR, bY - bR, bR * 2, bR * 2);

    // Primary Specular Glare Dot
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(bX - bR * 0.35, bY - bR * 0.35, bR * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Secondary lower bounce crescent
    ctx.strokeStyle = 'rgba(217, 243, 106, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(bX, bY, bR - 2, Math.PI * 0.2, Math.PI * 0.75);
    ctx.stroke();

    ctx.restore();

    // 3. Draw Pivot (Mechanical Top Bearing & Mounting Flange)
    const pivotR = 16;
    const pivotGrad = ctx.createRadialGradient(
      pX - pivotR * 0.3, pY - pivotR * 0.3, 1,
      pX, pY, pivotR
    );
    pivotGrad.addColorStop(0.0, '#ffffff');
    pivotGrad.addColorStop(0.3, '#94a69d');
    pivotGrad.addColorStop(0.8, '#323d37');
    pivotGrad.addColorStop(1.0, '#151c18');

    ctx.fillStyle = pivotGrad;
    ctx.strokeStyle = '#d9f36a';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#d9f36a';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(pX, pY, pivotR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Center Brass Screw
    ctx.fillStyle = '#ffd15c';
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(pX, pY, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // Main Render Loop
  function render(timestamp) {
    if (!lastFrameTime) lastFrameTime = timestamp;
    const dt = Math.min(0.05, (timestamp - lastFrameTime) / 1000);
    lastFrameTime = timestamp;

    if (clickCooldown > 0) {
      clickCooldown = Math.max(0, clickCooldown - dt);
    }

    // Clear Canvas
    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Update Physics
    updatePendulum(dt);

    // Draw Visuals
    drawBackground();
    drawTargetCircle(dt);

    // Draw Ghost Trails
    ghostTrails = ghostTrails.filter(t => t.update(dt));
    ghostTrails.forEach(t => t.draw(ctx));

    // Draw Metallic Pendulum
    drawMetallicPendulum();

    // Draw Shockwaves
    shockwaves = shockwaves.filter(s => s.update(dt));
    shockwaves.forEach(s => s.draw(ctx));

    // Draw Particles
    particles = particles.filter(p => p.update(dt));
    particles.forEach(p => p.draw(ctx));

    // Draw Text Popups
    popups = popups.filter(pop => pop.update(dt));
    popups.forEach(pop => pop.draw(ctx));

    requestAnimationFrame(render);
  }

  // Initialization
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
  updateHUD();
  requestAnimationFrame(render);

})();
