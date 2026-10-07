(() => {
  'use strict';

  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  const scoreEl = document.getElementById('score');
  const livesEl = document.getElementById('lives');
  const comboValueEl = document.getElementById('combo-value');
  const comboCard = document.getElementById('combo');
  const startScreen = document.getElementById('start-screen');
  const gameOverScreen = document.getElementById('game-over');
  const bestStartEl = document.getElementById('start-best');
  const finalScoreEl = document.getElementById('final-score');
  const finalBestEl = document.getElementById('final-best');
  const toast = document.getElementById('toast');
  const soundButton = document.getElementById('sound');

  const colors = ['#ff684f', '#ffbf38', '#ba82ff', '#4bd5dc', '#ff75a6', '#86db61'];
  const sizes = [17, 23, 30];
  const points = [10, 20, 30];
  let width = 0, height = 0, dpr = 1;
  let state = 'menu', score = 0, lives = 3, combo = 0, best = Number(localStorage.getItem('trexMeteorBest') || 0);
  let meteors = [], particles = [], stars = [], spawnClock = 0, elapsed = 0, lastFrame = 0, shake = 0, hitFlash = 0;
  let soundOn = true, audio = null, dinoBob = 0;

  bestStartEl.textContent = best.toLocaleString();

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width; height = rect.height; dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    stars = Array.from({ length: Math.max(45, Math.floor(width * height / 9500)) }, () => ({
      x: Math.random() * width, y: Math.random() * height, r: Math.random() * 1.7 + .4,
      a: Math.random() * .55 + .2, phase: Math.random() * 6
    }));
    draw();
  }
  window.addEventListener('resize', resize, { passive: true });

  function roundedRect(x, y, w, h, r) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r);
  }

  function background(time = 0) {
    const grad = ctx.createLinearGradient(0, 0, 0, height);
    grad.addColorStop(0, '#192858'); grad.addColorStop(.53, '#253467'); grad.addColorStop(1, '#513c81');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, width, height);
    // Soft planetary glow
    const glow = ctx.createRadialGradient(width * .5, height * .68, 0, width * .5, height * .68, width * .7);
    glow.addColorStop(0, 'rgba(255,141,164,.16)'); glow.addColorStop(1, 'rgba(255,141,164,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);
    for (const s of stars) {
      ctx.globalAlpha = s.a * (.72 + Math.sin(time * .001 + s.phase) * .28);
      ctx.fillStyle = '#fff4cf'; ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Distant planet
    ctx.globalAlpha = .38;
    ctx.fillStyle = '#e7a6c5'; ctx.beginPath(); ctx.arc(width * .82, height * .3, Math.min(width, height) * .115, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,228,214,.45)'; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.ellipse(width * .82, height * .3, Math.min(width, height) * .16, Math.min(width, height) * .045, -.35, 0, Math.PI * 2); ctx.stroke();
    ctx.globalAlpha = 1;
    // Ground
    const gy = height * .83;
    ctx.fillStyle = '#25375f'; ctx.beginPath(); ctx.moveTo(0, gy + 28);
    ctx.quadraticCurveTo(width * .18, gy - 15, width * .34, gy + 16);
    ctx.quadraticCurveTo(width * .67, gy + 60, width, gy - 4); ctx.lineTo(width, height); ctx.lineTo(0, height); ctx.fill();
    ctx.fillStyle = '#33476c'; ctx.fillRect(0, gy + 31, width, height - gy);
    ctx.fillStyle = 'rgba(153,200,185,.26)';
    for (let i = 0; i < width; i += 34) ctx.fillRect(i, gy + 40 + (i % 3) * 7, 3, 9);
  }

  function drawDino(time) {
    const cx = width * .5, base = height * .825 + Math.sin(time * .004) * 3;
    dinoBob = base;
    ctx.save(); ctx.translate(cx, base);
    if (hitFlash > 0) { ctx.translate((Math.random() - .5) * 7, 0); }
    const scale = Math.min(width / 390, height / 720, 1.18);
    ctx.scale(scale, scale);
    // Tail
    ctx.fillStyle = '#69d79b'; ctx.strokeStyle = '#258b79'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(-35, -36); ctx.quadraticCurveTo(-78, -40, -100, -16); ctx.quadraticCurveTo(-74, -22, -50, -8); ctx.lineTo(-29, -10); ctx.fill(); ctx.stroke();
    // Feet
    ctx.fillStyle = '#53c98d';
    roundedRect(-35, -14, 25, 23, 8); ctx.fill(); roundedRect(15, -14, 25, 23, 8); ctx.fill();
    ctx.fillStyle = '#fff4d6';
    for (const fx of [-30, -18, 21, 33]) { ctx.beginPath(); ctx.moveTo(fx, 5); ctx.lineTo(fx + 4, 11); ctx.lineTo(fx + 8, 5); ctx.fill(); }
    // Body
    ctx.fillStyle = '#6be0a0'; ctx.strokeStyle = '#258b79'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(0, -43, 47, 46, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // Spikes
    ctx.fillStyle = '#ff9d55';
    for (let i = 0; i < 4; i++) { const sx = -28 + i * 19; ctx.beginPath(); ctx.moveTo(sx, -76 + i * 3); ctx.lineTo(sx + 8, -91 + i * 3); ctx.lineTo(sx + 15, -72 + i * 3); ctx.fill(); }
    // Head
    ctx.fillStyle = '#78e8a6'; ctx.strokeStyle = '#258b79'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.ellipse(20, -95, 39, 34, -.1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(50, -78, 28, 16, .08, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // Shirt
    ctx.fillStyle = '#fffdf3'; ctx.strokeStyle = '#becce1'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-34, -62); ctx.quadraticCurveTo(0, -77, 29, -58); ctx.lineTo(30, -19); ctx.quadraticCurveTo(2, -3, -31, -22); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#263866'; ctx.font = '700 15px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('RRR', 0, -38);
    // Eye + nostril
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(30, -106, 11, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#172348'; ctx.beginPath(); ctx.arc(33, -106, 5.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#287b6d'; ctx.beginPath(); ctx.arc(67, -82, 3.5, 0, Math.PI * 2); ctx.fill();
    // Arm
    ctx.strokeStyle = '#42b886'; ctx.lineWidth = 8; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(22, -48); ctx.quadraticCurveTo(40, -43, 42, -29); ctx.stroke();
    ctx.restore();
  }

  function drawMeteor(m) {
    ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.angle);
    const r = m.r;
    // Tail
    const tail = ctx.createLinearGradient(0, -r * 2.1, 0, 0);
    tail.addColorStop(0, 'rgba(255,171,69,0)'); tail.addColorStop(1, m.color + 'bb');
    ctx.fillStyle = tail; ctx.beginPath(); ctx.moveTo(-r * .55, -r * .2); ctx.lineTo(0, -r * 2.4); ctx.lineTo(r * .55, -r * .2); ctx.fill();
    ctx.fillStyle = m.color; ctx.strokeStyle = 'rgba(255,239,191,.8)'; ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 9; i++) {
      const a = i * Math.PI * 2 / 9, rr = r * (i % 2 ? .84 : 1.05);
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(107,51,67,.35)'; ctx.beginPath(); ctx.arc(-r * .24, -r * .12, r * .22, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(r * .3, r * .27, r * .14, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  function drawParticles(p) {
    ctx.save(); ctx.globalAlpha = Math.max(0, p.life / p.maxLife); ctx.fillStyle = p.color;
    if (p.star) {
      ctx.font = `${p.size * 2}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('✦', p.x, p.y);
    } else { ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }

  function draw(time = 0) {
    if (!width || !height) return;
    ctx.save();
    if (shake > 0) ctx.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake);
    background(time);
    for (const m of meteors) drawMeteor(m);
    drawDino(time);
    for (const p of particles) drawParticles(p);
    if (hitFlash > 0) { ctx.fillStyle = `rgba(255,112,126,${hitFlash * .16})`; ctx.fillRect(0, 0, width, height); }
    ctx.restore();
  }

  function spawnMeteor() {
    const tier = Math.random() < .34 ? 0 : Math.random() < .7 ? 1 : 2;
    const r = sizes[tier] * Math.min(width / 390, 1.2);
    const margin = r + 18;
    const speed = (100 + Math.random() * 45 + Math.min(elapsed * 2.8, 155)) * (height / 780);
    meteors.push({ x: margin + Math.random() * Math.max(1, width - margin * 2), y: -r - 24, r, tier, color: colors[Math.floor(Math.random() * colors.length)], speed, angle: Math.random() * 6, spin: (Math.random() - .5) * 1.5, alive: true, points: points[tier] });
  }

  function burst(x, y, color, count = 15) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2, speed = 35 + Math.random() * 150;
      particles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, life: .42 + Math.random() * .42, maxLife: .84, size: 2 + Math.random() * 4, color: i % 4 === 0 ? '#fff2b0' : color, star: i % 5 === 0 });
    }
  }

  function beep(freq, duration, type = 'sine', volume = .055) {
    if (!soundOn) return;
    try {
      audio ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audio.state === 'suspended') audio.resume();
      const osc = audio.createOscillator(), gain = audio.createGain();
      osc.type = type; osc.frequency.setValueAtTime(freq, audio.currentTime);
      gain.gain.setValueAtTime(volume, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
      osc.connect(gain); gain.connect(audio.destination); osc.start(); osc.stop(audio.currentTime + duration);
    } catch (_) { /* Audio is optional; gameplay stays available. */ }
  }

  function updateHud() {
    scoreEl.textContent = score.toLocaleString();
    livesEl.textContent = Array.from({ length: 3 }, (_, i) => i < lives ? '❤️' : '🖤').join(' ');
    livesEl.setAttribute('aria-label', `${lives} ${lives === 1 ? 'life' : 'lives'} remaining`);
    comboValueEl.textContent = `×${combo}`;
  }

  function showToast(message) {
    toast.textContent = message; toast.classList.remove('show'); void toast.offsetWidth; toast.classList.add('show');
  }

  function startGame() {
    score = 0; lives = 3; combo = 0; elapsed = 0; spawnClock = 0;
    meteors = []; particles = []; shake = 0; hitFlash = 0; state = 'playing';
    startScreen.classList.add('hidden'); gameOverScreen.classList.add('hidden'); updateHud();
    lastFrame = performance.now(); requestAnimationFrame(loop);
  }

  function endGame() {
    state = 'over';
    if (score > best) { best = score; localStorage.setItem('trexMeteorBest', String(best)); }
    finalScoreEl.textContent = score.toLocaleString(); finalBestEl.textContent = best.toLocaleString();
    bestStartEl.textContent = best.toLocaleString();
    gameOverScreen.classList.remove('hidden'); beep(180, .45, 'triangle', .07);
  }

  function missMeteor(index, m) {
    meteors.splice(index, 1); lives--; combo = 0; hitFlash = .9; shake = 9; updateHud();
    burst(width * .5, dinoBob - 78, '#ffbd74', 16); beep(115, .2, 'sawtooth', .04);
    showToast(lives > 0 ? 'OH NO! 💥' : 'GAME OVER');
    if (lives <= 0) endGame();
  }

  function loop(now) {
    if (state !== 'playing') return;
    const dt = Math.min((now - lastFrame) / 1000, .04); lastFrame = now;
    elapsed += dt; spawnClock += dt;
    const interval = Math.max(.48, 1.18 - elapsed * .012);
    const cap = Math.min(3 + Math.floor(elapsed / 16), 7);
    while (spawnClock >= interval && meteors.length < cap) { spawnClock -= interval; spawnMeteor(); }

    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i]; m.y += m.speed * dt; m.angle += m.spin * dt;
      if (m.y >= dinoBob - 88 - m.r) { missMeteor(i, m); if (state !== 'playing') break; }
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 150 * dt; p.life -= dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    shake = Math.max(0, shake - dt * 30); hitFlash = Math.max(0, hitFlash - dt * 2.6);
    draw(now);
    if (state === 'playing') requestAnimationFrame(loop);
  }

  function tap(event) {
    if (state !== 'playing') return;
    event.preventDefault();
    const rect = canvas.getBoundingClientRect(), x = event.clientX - rect.left, y = event.clientY - rect.top;
    for (let i = meteors.length - 1; i >= 0; i--) {
      const m = meteors[i];
      if (Math.hypot(x - m.x, y - m.y) <= m.r + Math.max(17, width * .035)) {
        meteors.splice(i, 1); burst(m.x, m.y, m.color); score += m.points * (combo >= 4 ? 2 : 1); combo++;
        updateHud(); comboCard.classList.remove('pop'); void comboCard.offsetWidth; comboCard.classList.add('pop');
        setTimeout(() => comboCard.classList.remove('pop'), 190);
        beep(400 + Math.min(combo * 25, 300), .1, 'sine');
        if (combo > 1) showToast(combo >= 5 ? `COMBO ×${combo} 🔥` : `×${combo} NICE!`);
        draw(performance.now()); return;
      }
    }
  }

  canvas.addEventListener('pointerdown', tap, { passive: false });
  document.getElementById('play').addEventListener('click', startGame);
  document.getElementById('again').addEventListener('click', startGame);
  soundButton.addEventListener('click', () => {
    soundOn = !soundOn; soundButton.textContent = soundOn ? '♫' : '♪̸';
    soundButton.title = soundOn ? 'Sound on' : 'Sound off'; soundButton.setAttribute('aria-label', soundOn ? 'Turn sound off' : 'Turn sound on');
    if (soundOn) beep(520, .1);
  });

  resize(); updateHud();
})();

