// ── Режим «Битва пауков» ────────────────────────────────────────────
//
// Быстрый темп (таблица умножения, закреплённые слова): чем быстрее ответ,
// тем сильнее удар: ≤25 % лимита — крит ×3, ≤55 % — ×2, иначе ×1.
// Остальные задания: время даётся по сложности, а сила удара зависит от
// правильности — верный ответ ×2, третий верный подряд — крит ×3.
// Ошибка или истёкший лимит — бьёт бот (−1 HP).
// Финальный экран рисует не canvas, а попап (js/round.js).

const SpiderBattle = {
  id: 'battle',
  icon: '⚔️',
  limitMs: 10000,
  endless: false,

  canvas: null,
  ctx: null,
  w: 0,
  h: 0,
  running: false,
  rafId: null,
  lastT: 0,

  player: null,
  bot: null,
  fx: null,
  combo: 0,
  bestCombo: 0,
  crits: 0,
  rounds: 15,

  // ── Жизненный цикл ────────────────────────────────

  init({ rounds = 15 } = {}) {
    this.canvas = document.getElementById('game-canvas');
    if (!this.canvas) return false;
    this.ctx = this.canvas.getContext('2d');
    this.rounds = rounds;
    this.resize();

    this.player = this.makeFighter({ hp: 3, maxHp: 3, side: 1, color: '#4A90D9', name: '🛡️ Ты' });
    this.bot = this.makeFighter({ hp: 24, maxHp: 24, side: -1, color: '#C0392B', name: '🕷️ Бот' });
    this.fx = { particles: [], texts: [], shake: 0, flashRed: 0, flashGold: 0 };
    this.combo = 0;
    this.bestCombo = 0;
    this.crits = 0;

    const stage = document.getElementById('game-stage');
    if (stage) { stage.hidden = false; stage.className = 'game-stage mode-battle'; }

    this.start();
    return true;
  },

  makeFighter({ hp, maxHp, side, color, name }) {
    return {
      hp, maxHp, shownHp: hp, side, color, name,
      state: 'idle',      // idle | windup | lunge | impact | recover | hurt | ko | win
      stateAt: 0,
      dash: 0,            // смещение к противнику, 0..1
      recoil: 0,
      flash: 0,
      t: Math.random() * 10,
    };
  },

  start() {
    this.running = true;
    this.lastT = 0;
    const loop = (ts) => {
      if (!this.running) return;
      const dt = this.lastT ? Math.min(64, ts - this.lastT) : 16;
      this.lastT = ts;
      this.update(dt, ts);
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  },

  stop() {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  },

  resize() {
    const stage = this.canvas.parentElement;
    const rect = stage.getBoundingClientRect();
    this.w = Math.max(320, Math.round(rect.width || window.innerWidth));
    this.h = Math.max(320, Math.round(rect.height || window.innerHeight));
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.reducedMotion = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  },

  // ── Урон от скорости ──────────────────────────────

  damageFor(elapsedMs, limitMs, pace = 'fast') {
    if (pace !== 'fast') {
      // Длинные задания: считается правильность, не секунды
      return this.combo >= 2
        ? { dmg: 3, label: 'КРИТ! Серия ×3', crit: true }
        : { dmg: 2, label: 'Точный удар ×2', crit: false };
    }
    const part = elapsedMs / limitMs;
    if (part <= 0.25) return { dmg: 3, label: 'КРИТ! ×3', crit: true };
    if (part <= 0.55) return { dmg: 2, label: 'Сильный ×2', crit: false };
    return { dmg: 1, label: 'Слабый ×1', crit: false };
  },

  // ── Ответ игрока ──────────────────────────────────

  onAnswer({ correct, timedOut, elapsedMs, limitMs, pace = 'fast' }) {
    if (correct) {
      const hit = this.damageFor(elapsedMs, limitMs, pace);
      this.bot.hp = Math.max(0, this.bot.hp - hit.dmg);
      this.combo++;
      this.bestCombo = Math.max(this.bestCombo, this.combo);
      if (hit.crit) this.crits++;
      this.attack(this.player, this.bot, hit);
      if (this.bot.hp <= 0) this.finishBattle('player');
      return { delayMs: 800 };
    }

    // Ошибка или таймаут — атакует бот
    this.combo = 0;
    this.player.hp = Math.max(0, this.player.hp - 1);
    this.floatText(timedOut ? '⏰ Время!' : '✗ Мимо', this.w * 0.5, this.h * 0.3, '#FFB020');
    this.attack(this.bot, this.player, { dmg: 1, label: '−1 ❤️', crit: false });
    if (this.player.hp <= 0) this.finishBattle('bot');
    return { delayMs: 1150 };
  },

  attack(attacker, target, hit) {
    attacker.state = 'windup';
    attacker.stateAt = 0;
    attacker.pendingHit = hit;
    attacker.target = target;
  },

  land(attacker, target, hit) {
    target.flash = 1;
    target.recoil = 1;
    this.fx.shake = hit.crit ? 22 : 12;
    if (target === this.player) this.fx.flashRed = 0.5;
    if (hit.crit) this.fx.flashGold = 0.45;

    const tx = this.fighterX(target);
    const ty = this.groundY() - this.size() * 0.5;
    this.burst(tx, ty, hit.crit ? 46 : 24, hit.crit ? ['#FFD700', '#FFF2A0', '#FF8C00'] : ['#FFD9A0', '#FF9F43']);
    this.floatText(hit.label, tx, ty - this.size() * 0.5, hit.crit ? '#FFD700' : '#FFFFFF', hit.crit ? 1.5 : 1.1);
  },

  finishBattle(winner) {
    this.player.state = winner === 'player' ? 'win' : 'ko';
    this.bot.state = winner === 'player' ? 'ko' : 'win';
    this.player.stateAt = this.bot.stateAt = 0;
    if (winner === 'player') {
      for (let i = 0; i < 70; i++) {
        this.fx.particles.push(this.makeParticle(
          this.fighterX(this.player) + (Math.random() - 0.5) * 160,
          this.groundY() - 40,
          ['#FFD700', '#50C878', '#4A90D9', '#FF69B4', '#00CED1'],
          { vy: -Math.random() * 0.9 - 0.25, life: 1600 }
        ));
      }
    }
  },

  isOver() {
    return this.player.hp <= 0 || this.bot.hp <= 0;
  },

  getState(round) {
    const won = this.bot.hp > 0 ? false : true;
    const dealt = this.bot.maxHp - this.bot.hp;
    const score = Engine.score + this.crits * 15 + (won ? 50 : 0);
    let stars = 0;
    if (won) stars = this.player.hp === 3 ? 3 : this.player.hp === 2 ? 2 : 1;
    else if (dealt >= this.bot.maxHp * 0.6) stars = 1;
    return {
      won,
      score,
      stars,
      scoreLabel: '⚡ Очки',
      headline: won ? 'Бот повержен!' : (this.player.hp <= 0 ? 'Бот победил' : 'Бот выстоял'),
      sub: won
        ? `Ты снял ${dealt} HP и сохранил ${this.player.hp} ❤️`
        : `Осталось снять ${this.bot.hp} HP — верные ответы подряд бьют сильнее`,
      extra: { crits: this.crits, bestCombo: this.bestCombo },
    };
  },

  hudLabel() {
    return `⚡ Очки: ${Engine.score}`;
  },

  counterLabel(round) {
    return `Раунд ${round.index + 1} / ${round.rounds}`;
  },

  // ── Обновление ────────────────────────────────────

  update(dt, ts) {
    if (this.canvas.parentElement &&
        (Math.abs(this.canvas.parentElement.getBoundingClientRect().width - this.w) > 2 || Math.abs(this.canvas.parentElement.getBoundingClientRect().height - this.h) > 2)) {
      this.resize();
    }

    [this.player, this.bot].forEach(f => {
      f.t += dt / 1000;
      f.stateAt += dt;
      f.shownHp += (f.hp - f.shownHp) * Math.min(1, dt / 120);
      f.flash = Math.max(0, f.flash - dt / 300);
      f.recoil = Math.max(0, f.recoil - dt / 380);

      switch (f.state) {
        case 'windup':
          f.dash = -0.18 * (f.stateAt / 160);
          if (f.stateAt >= 160) { f.state = 'lunge'; f.stateAt = 0; }
          break;
        case 'lunge':
          f.dash = -0.18 + 1.18 * this.easeOut(f.stateAt / 170);
          if (f.stateAt >= 170) {
            f.state = 'impact'; f.stateAt = 0;
            this.land(f, f.target, f.pendingHit);
          }
          break;
        case 'impact':
          f.dash = 1 - 0.12 * (f.stateAt / 110);
          if (f.stateAt >= 110) { f.state = 'recover'; f.stateAt = 0; }
          break;
        case 'recover':
          f.dash = 0.88 * (1 - this.easeOut(f.stateAt / 320));
          if (f.stateAt >= 320) { f.state = 'idle'; f.stateAt = 0; f.dash = 0; }
          break;
        default:
          f.dash += (0 - f.dash) * Math.min(1, dt / 200);
      }
    });

    this.fx.shake = Math.max(0, this.fx.shake - dt / 22);
    this.fx.flashRed = Math.max(0, this.fx.flashRed - dt / 600);
    this.fx.flashGold = Math.max(0, this.fx.flashGold - dt / 500);

    this.fx.particles = this.fx.particles.filter(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.0016 * dt;
      p.life -= dt;
      return p.life > 0;
    });
    this.fx.texts = this.fx.texts.filter(t => {
      t.y -= 0.035 * dt;
      t.life -= dt;
      return t.life > 0;
    });
  },

  easeOut(x) { const t = Math.min(1, Math.max(0, x)); return 1 - Math.pow(1 - t, 3); },

  // ── Геометрия ─────────────────────────────────────

  /** Верх палубы с вопросом: сцена не должна уезжать под неё. */
  deckTop() {
    const deck = document.querySelector('.game-content');
    if (deck) {
      const t = deck.getBoundingClientRect().top - this.canvas.getBoundingClientRect().top;
      if (t > 0) return t;
    }
    return this.h * 0.72;
  },

  hudY() {
    const bar = document.querySelector('.time-bar');
    const bottom = bar ? bar.getBoundingClientRect().bottom - this.canvas.getBoundingClientRect().top : 0;
    return Math.max(92, this.h * 0.15, bottom + 26);
  },

  size() {
    const hudBottom = this.hudY() + 24;
    const available = (this.deckTop() - hudBottom - 16) / 1.9;
    return Math.max(24, Math.min(this.w * 0.16, this.h * 0.13, available));
  },
  groundY() { return Math.min(this.h * 0.78, this.deckTop() - this.size() * 0.55); },
  fighterX(f) {
    const base = f === this.player ? this.w * 0.28 : this.w * 0.72;
    const reach = (this.w * 0.44 - this.size() * 1.2) * f.dash * (f === this.player ? 1 : -1);
    const recoil = f.recoil * 18 * (f === this.player ? -1 : 1);
    return base + reach + recoil;
  },

  // ── Отрисовка ─────────────────────────────────────

  render() {
    const ctx = this.ctx;
    const { w, h } = this;
    ctx.setTransform(this.dpr || 1, 0, 0, this.dpr || 1, 0, 0);
    ctx.clearRect(0, 0, w, h);

    this.drawBackground(ctx, w, h);

    ctx.save();
    if (!this.reducedMotion && this.fx.shake > 0) {
      ctx.translate((Math.random() - 0.5) * this.fx.shake, (Math.random() - 0.5) * this.fx.shake);
    }

    const order = this.player.dash > this.bot.dash ? [this.bot, this.player] : [this.player, this.bot];
    order.forEach(f => this.drawSpider(ctx, f));

    this.fx.particles.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * (0.4 + 0.6 * p.life / p.maxLife), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    this.fx.texts.forEach(t => {
      ctx.globalAlpha = Math.min(1, t.life / 420);
      ctx.font = `bold ${Math.round(20 * t.scale)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.65)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    });
    ctx.globalAlpha = 1;
    ctx.restore();

    this.drawHUD(ctx, w, h);

    if (!this.reducedMotion && this.fx.flashRed > 0) {
      const g = ctx.createRadialGradient(w / 2, h / 2, h * 0.25, w / 2, h / 2, h * 0.8);
      g.addColorStop(0, 'rgba(255,0,0,0)');
      g.addColorStop(1, `rgba(255,0,0,${this.fx.flashRed})`);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    if (!this.reducedMotion && this.fx.flashGold > 0) {
      ctx.fillStyle = `rgba(255,215,0,${this.fx.flashGold * 0.25})`;
      ctx.fillRect(0, 0, w, h);
    }
  },

  drawBackground(ctx, w, h) {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#0b0b23');
    sky.addColorStop(0.45, '#1b1b4a');
    sky.addColorStop(0.75, '#232a5c');
    sky.addColorStop(1, '#0d1030');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Quiet starlight and layered silhouettes above the arena.
    for (let i = 0; i < 60; i++) {
      const x = ((i * 137.508) % 997) / 997 * w;
      const y = ((i * 79.31) % 431) / 431 * this.groundY();
      ctx.globalAlpha = this.reducedMotion ? .5 : .3 + .25 * Math.sin(this.player.t * .7 + i);
      ctx.fillStyle = '#d3c7ff';
      ctx.fillRect(x, y, i % 4 === 0 ? 2 : 1, i % 4 === 0 ? 2 : 1);
    }
    ctx.globalAlpha = 1;
    for (let layer = 0; layer < 3; layer++) {
      ctx.fillStyle = ['#292347', '#211d3b', '#1a1830'][layer];
      ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w + 20; x += 20) {
        ctx.lineTo(x, this.groundY() - 25 - (2 - layer) * 30 + Math.sin(x / (90 + layer * 40) + layer) * 28);
      }
      ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    }
    // Луна
    const moonX = w * 0.88, moonY = h * 0.30, moonR = Math.min(w, h) * 0.07;
    const halo = ctx.createRadialGradient(moonX, moonY, moonR * 0.4, moonX, moonY, moonR * 3.2);
    halo.addColorStop(0, 'rgba(255,255,220,0.22)');
    halo.addColorStop(1, 'rgba(255,255,220,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(moonX, moonY, moonR * 3.2, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#F7F3D0';
    ctx.beginPath(); ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2); ctx.fill();

    // Паутина в углах
    ctx.strokeStyle = 'rgba(180,200,255,0.13)';
    ctx.lineWidth = 1;
    [[0, 0, 1, 1], [w, 0, -1, 1]].forEach(([ox, oy, sx, sy]) => {
      const R = Math.min(w, h) * 0.42;
      for (let i = 0; i <= 6; i++) {
        const a = (i / 6) * (Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ox + Math.cos(a) * R * sx, oy + Math.sin(a) * R * sy);
        ctx.stroke();
      }
      for (let r = R * 0.22; r < R; r += R * 0.19) {
        ctx.beginPath();
        for (let i = 0; i <= 6; i++) {
          const a = (i / 6) * (Math.PI / 2);
          const x = ox + Math.cos(a) * r * sx, y = oy + Math.sin(a) * r * sy;
          i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    });

    // Земля
    const gY = this.groundY();
    const ground = ctx.createLinearGradient(0, gY - 20, 0, h);
    ground.addColorStop(0, '#2b2450');
    ground.addColorStop(1, '#120e2a');
    ctx.fillStyle = ground;
    ctx.fillRect(0, gY, w, h - gY);
    ctx.strokeStyle = 'rgba(140,170,255,0.25)';
    ctx.beginPath(); ctx.moveTo(0, gY); ctx.lineTo(w, gY); ctx.stroke();
  },

  drawSpider(ctx, f) {
    const s = this.size();
    const x = this.fighterX(f);
    const bob = !this.reducedMotion && f.state === 'idle' ? Math.sin(f.t * 3) * s * 0.045 : 0;
    const ko = f.state === 'ko';
    const y = this.groundY() - s * 0.55 + bob + (ko ? s * 0.35 : 0);
    const face = f === this.player ? 1 : -1;
    const hurt = f.flash > 0;
    const body = hurt ? '#FF7676' : f.color;

    ctx.save();
    ctx.translate(x, y);
    if (ko) ctx.rotate(Math.PI * 0.9 * Math.min(1, f.stateAt / 420) * face);
    if (!this.reducedMotion && f.state === 'win') ctx.translate(0, -Math.abs(Math.sin(f.stateAt / 180)) * s * 0.3);

    // Тень
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.62 - bob, s * 0.5, s * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();

    // Ноги
    const attacking = f.state === 'lunge' || f.state === 'impact';
    ctx.lineCap = 'round';
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? 1 : -1;
      const idx = i % 4;
      const walk = Math.sin(f.t * 7 + i * 1.1) * (f.state === 'idle' ? 0.12 : 0.3);
      const spread = 0.42 + idx * 0.3;
      const lift = attacking && side === face ? 0.55 : 0;
      const kneeX = side * s * (0.45 + idx * 0.08) * (1 + lift * 0.4);
      const kneeY = -s * (0.32 + walk * 0.3 + lift * 0.5);
      const footX = side * s * spread * 1.35;
      const footY = s * (0.55 - lift * 0.9) + Math.sin(f.t * 7 + i) * s * 0.03;

      ctx.strokeStyle = hurt ? '#FFB3B3' : this.shade(f.color, -18);
      ctx.lineWidth = Math.max(2, s * 0.055);
      ctx.beginPath();
      ctx.moveTo(side * s * 0.12, -s * 0.05);
      ctx.quadraticCurveTo(kneeX, kneeY, footX, footY);
      ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle;
      ctx.beginPath(); ctx.arc(footX, footY, s * 0.035, 0, Math.PI * 2); ctx.fill();
    }

    // Брюшко
    const grad = ctx.createRadialGradient(-s * 0.1, -s * 0.05, s * 0.05, 0, s * 0.05, s * 0.55);
    grad.addColorStop(0, this.shade(body, 45));
    grad.addColorStop(1, this.shade(body, -25));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(-face * s * 0.12, s * 0.05, s * 0.42, s * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();

    // Узор песочные часы
    ctx.fillStyle = this.shade(body, -45);
    ctx.beginPath();
    ctx.moveTo(-face * s * 0.12 - s * 0.1, -s * 0.12);
    ctx.lineTo(-face * s * 0.12 + s * 0.1, -s * 0.12);
    ctx.lineTo(-face * s * 0.12, s * 0.04);
    ctx.lineTo(-face * s * 0.12 + s * 0.1, s * 0.2);
    ctx.lineTo(-face * s * 0.12 - s * 0.1, s * 0.2);
    ctx.lineTo(-face * s * 0.12, s * 0.04);
    ctx.closePath();
    ctx.fill();

    // Головогрудь
    ctx.fillStyle = this.shade(body, 12);
    ctx.beginPath();
    ctx.ellipse(face * s * 0.26, -s * 0.06, s * 0.26, s * 0.23, 0, 0, Math.PI * 2);
    ctx.fill();

    // Глаза
    const blink = Math.sin(f.t * 1.7) > 0.97 ? 0.15 : 1;
    const eyes = [[0.1, -0.16, 0.075], [0.3, -0.17, 0.065], [0.14, -0.02, 0.05], [0.32, -0.03, 0.045]];
    eyes.forEach(([ex, ey, er]) => {
      ctx.fillStyle = ko ? '#7a7a7a' : '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(face * s * (0.16 + ex), s * ey, s * er, s * er * blink, 0, 0, Math.PI * 2);
      ctx.fill();
      if (!ko) {
        ctx.fillStyle = '#12122b';
        ctx.beginPath();
        ctx.ellipse(face * s * (0.18 + ex), s * ey, s * er * 0.5, s * er * 0.5 * blink, 0, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.strokeStyle = '#12122b';
        ctx.lineWidth = s * 0.03;
        const cx = face * s * (0.16 + ex), cy = s * ey, r = s * er;
        ctx.beginPath();
        ctx.moveTo(cx - r, cy - r); ctx.lineTo(cx + r, cy + r);
        ctx.moveTo(cx + r, cy - r); ctx.lineTo(cx - r, cy + r);
        ctx.stroke();
      }
    });

    // Клыки
    ctx.strokeStyle = attacking ? '#FFF3B0' : this.shade(body, -50);
    ctx.lineWidth = Math.max(2, s * 0.05);
    const fangOut = attacking ? s * 0.16 : s * 0.07;
    [-1, 1].forEach(k => {
      ctx.beginPath();
      ctx.moveTo(face * s * 0.42, s * (0.02 + k * 0.05));
      ctx.lineTo(face * (s * 0.42 + fangOut), s * (0.12 + k * 0.06));
      ctx.stroke();
    });

    ctx.restore();

    // Имя — над пауком: под ним палуба с вопросом
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `bold ${Math.round(s * 0.26)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(f.name, x, this.groundY() - s * 1.2);
  },

  drawHUD(ctx, w, h) {
    const pad = Math.max(14, w * 0.03);
    const barW = Math.min(w * 0.34, 260);
    const barH = 14;
    const y = this.hudY();   // ниже фактической шапки и полосы времени

    // Бот — полоса HP
    const pct = Math.max(0, this.bot.shownHp / this.bot.maxHp);
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    this.roundRect(ctx, w - pad - barW, y, barW, barH, 7); ctx.fill();
    const bg = ctx.createLinearGradient(w - pad - barW, 0, w - pad, 0);
    bg.addColorStop(0, '#FF7043'); bg.addColorStop(1, '#C0392B');
    ctx.fillStyle = bg;
    this.roundRect(ctx, w - pad - barW, y, Math.max(2, barW * pct), barH, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`🕷️ Бот  ${Math.ceil(this.bot.shownHp)} / ${this.bot.maxHp}`, w - pad, y - 6);

    // Игрок — сердца
    ctx.textAlign = 'left';
    ctx.font = `${Math.round(barH * 1.5)}px system-ui, sans-serif`;
    let hx = pad;
    for (let i = 0; i < this.player.maxHp; i++) {
      ctx.globalAlpha = i < this.player.hp ? 1 : 0.25;
      ctx.fillText('❤️', hx, y + barH);
      hx += barH * 1.75;
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.fillText('🛡️ Ты', pad, y - 6);

    if (this.combo >= 2) {
      ctx.textAlign = 'center';
      ctx.fillStyle = '#7CFFB2';
      ctx.font = `bold ${Math.round(Math.min(26, w * 0.045))}px system-ui, sans-serif`;
      ctx.fillText(`🔥 Серия ×${this.combo}`, w / 2, y + barH);
    }
  },

  roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  // ── Эффекты ───────────────────────────────────────

  makeParticle(x, y, colors, opts = {}) {
    const life = opts.life || 700 + Math.random() * 400;
    const a = Math.random() * Math.PI * 2;
    const sp = 0.12 + Math.random() * 0.35;
    return {
      x, y,
      vx: Math.cos(a) * sp,
      vy: opts.vy !== undefined ? opts.vy : Math.sin(a) * sp - 0.18,
      r: 2 + Math.random() * 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      life, maxLife: life,
    };
  },

  burst(x, y, n, colors) {
    for (let i = 0; i < n; i++) this.fx.particles.push(this.makeParticle(x, y, colors));
  },

  floatText(text, x, y, color, scale = 1) {
    this.fx.texts.push({ text, x, y, color, scale, life: 1000 });
  },

  shade(hex, amount) {
    const n = parseInt(String(hex).replace('#', ''), 16);
    const c = v => Math.min(255, Math.max(0, v + amount));
    return `rgb(${c(n >> 16)},${c((n >> 8) & 0xFF)},${c(n & 0xFF)})`;
  },
};

window.SPIDER_BATTLE = SpiderBattle;
window.GAME_MODES = window.GAME_MODES || {};
window.GAME_MODES.battle = SpiderBattle;
