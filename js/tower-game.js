// ── Режим «Башенки» ─────────────────────────────────────────────────
//
// Пока игрок думает над вопросом, кран стоит ровно над центром башни: время
// на ответ даётся по сложности задания и на точность не влияет. После верного
// ответа начинается размещение: кран качается, а игрок сам отпускает кубик
// (кнопка, клик по сцене, пробел). Попал в центр — «идеально», промахнулся —
// свес срезается и башня сужается. Ошибка или истёкший лимит — кубик летит
// мимо, башня рушится. Игра на рекорд высоты: одна ошибка — конец.

const TowerGame = {
  id: 'tower',
  icon: '🏗️',
  limitMs: 10000,
  endless: true,

  canvas: null,
  ctx: null,
  w: 0,
  h: 0,
  running: false,
  rafId: null,
  lastT: 0,

  blocks: [],        // [{ cx, w, level }] снизу вверх
  falling: null,     // летящий кубик
  debris: [],        // срезанные куски и обломки
  puffs: [],         // пыль и искры
  texts: [],
  camera: 0,         // сдвиг мира вверх, px
  cameraTarget: 0,
  questionAt: 0,     // отметка времени начала текущего вопроса
  phase: 'thinking', // thinking — кран стоит; placing — качается, ждём отпускания; dropping — кубик летит
  placeAt: 0,        // начало фазы размещения: от него считается качание крана
  crane: { x: 0, cable: 0 },
  placed: 0,          // сколько кубиков уложено — счёт игры
  perfects: 0,
  over: false,
  collapsing: false,
  shake: 0,
  topicId: null,
  clouds: [],

  BLOCK_H: 30,
  BASE_W: 150,
  PERFECT_PX: 7,

  // ── Жизненный цикл ────────────────────────────────

  init({ topicId } = {}) {
    this.canvas = document.getElementById('game-canvas');
    if (!this.canvas) return false;
    this.ctx = this.canvas.getContext('2d');
    this.topicId = topicId;
    this.resize();

    this.blocks = [{ cx: this.w / 2, w: this.BASE_W, level: 0 }];
    this.falling = null;
    this.debris = [];
    this.puffs = [];
    this.texts = [];
    this.camera = 0;
    this.cameraTarget = 0;
    this.placed = 0;
    this.perfects = 0;
    this.over = false;
    this.collapsing = false;
    this.shake = 0;
    this.questionAt = this.now();
    this.phase = 'thinking';
    this.placeAt = 0;
    this.crane = { x: this.w / 2, cable: 0 };
    this.bindControls();
    this.clouds = Array.from({ length: 5 }, (_, i) => ({
      x: Math.random() * this.w,
      y: this.h * (0.08 + i * 0.13),
      s: 0.6 + Math.random() * 0.9,
      v: 0.004 + Math.random() * 0.012,
    }));

    const stage = document.getElementById('game-stage');
    if (stage) { stage.hidden = false; stage.className = 'game-stage mode-tower'; }

    this.start();
    return true;
  },

  start() {
    this.running = true;
    this.lastT = 0;
    const loop = (ts) => {
      if (!this.running) return;
      const dt = this.lastT ? Math.min(64, ts - this.lastT) : 16;
      this.lastT = ts;
      this.update(dt);
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  },

  stop() {
    clearTimeout(this.collapseId);
    this.unbindControls();
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = null;
  },

  now() { return typeof performance !== 'undefined' ? performance.now() : Date.now(); },

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

  /** Round зовёт это в момент показа вопроса: кран замирает над центром башни. */
  onQuestionStart() {
    this.questionAt = this.now();
    this.phase = 'thinking';
    if (this.blocks.length) this.crane.x = this.top().cx;
  },

  // ── Управление отпусканием кубика ─────────────────

  bindControls() {
    this.unbindControls();
    this._onCanvasTap = () => this.release();
    this._onKey = (e) => {
      if (this.phase !== 'placing') return;
      if (e.key !== ' ' && e.key !== 'Enter') return;
      if (e.target && /^(INPUT|TEXTAREA)$/.test(e.target.tagName || '')) return;
      e.preventDefault();
      this.release();
    };
    if (this.canvas && this.canvas.addEventListener) this.canvas.addEventListener('pointerdown', this._onCanvasTap);
    if (document.addEventListener) document.addEventListener('keydown', this._onKey);
  },

  unbindControls() {
    if (this._onCanvasTap && this.canvas && this.canvas.removeEventListener) this.canvas.removeEventListener('pointerdown', this._onCanvasTap);
    if (this._onKey && document.removeEventListener) document.removeEventListener('keydown', this._onKey);
    this._onCanvasTap = this._onKey = null;
  },

  /** Игрок отпускает кубик: где кран сейчас — туда он и упадёт. */
  release() {
    if (this.over || this.phase !== 'placing' || this.falling) return;
    // Защита от «двойного» нажатия сразу после ответа
    if (this.now() - this.placeAt < 250) return;
    const top = this.top();
    const dx = this.craneOffset(this.now() - this.placeAt);
    this.phase = 'dropping';
    this.drop(top.cx + dx, top.w, false);
    // Исход известен сразу: анимация падения только показывает его
    if (top.w - Math.abs(dx) <= 2) this.gameOver();
  },

  /** Размещение закончено (кубик лёг или улетел) — возвращаем ход в Round. */
  settled(delayMs) {
    this.phase = 'thinking';
    if (window.Round && Round.completePending) Round.completePending({ delayMs });
  },

  // ── Кран ──────────────────────────────────────────

  /** Счёт игры: уложенные кубики. Не зависит от массива — он обнуляется при обрушении. */
  height() { return this.placed; },
  top() { return this.blocks[this.blocks.length - 1]; },

  /** Смещение крана от центра башни в фазе размещения: 0 в её начале, дальше качается. */
  craneOffset(elapsedMs) {
    const t = Math.max(0, elapsedMs);
    const h = this.height();
    // На старте кубик у края ещё цепляет башню (150 → размах 120); с высотой размах растёт
    const maxAmp = Math.min(this.w * 0.42, this.top().w * 0.6 + 30 + h * 4);
    const ramp = Math.min(1, t / 450);
    const period = Math.max(1500, 3300 - h * 90);
    return maxAmp * ramp * Math.sin((2 * Math.PI * t) / period);
  },

  // ── Ответ игрока ──────────────────────────────────

  onAnswer({ correct, timedOut, elapsedMs }) {
    if (this.over) return { delayMs: 400 };
    const top = this.top();
    const blockW = top.w;

    if (correct) {
      // Верно — начинается размещение: кран качается, игрок сам отпускает кубик.
      this.phase = 'placing';
      this.placeAt = this.now();
      this.crane.x = top.cx;
      return {
        pending: true,
        pendingHtml: '<button type="button" class="submit-btn drop-btn" onclick="TOWER_GAME.release()">⬇ Отпустить кубик</button>'
          + '<div class="answer-feedback">Кран качается — нажми, когда кубик ровно над башней (или пробел)</div>',
      };
    }

    // Ошибка или таймаут — кубик гарантированно летит мимо башни
    this.phase = 'dropping';
    const side = Math.random() < 0.5 ? -1 : 1;
    const miss = side * (blockW + this.w * 0.12);
    this.pushText(timedOut ? '⏰ Время вышло!' : '✗ Ошибка!', this.w / 2, this.h * 0.38, '#FF5A5A', 1.3);
    this.drop(top.cx + miss, blockW, true);
    this.gameOver();
    return { delayMs: 1500 };
  },

  /** Отпускает кубик: он падает с крана на уровень вершины башни. */
  drop(x, w, forcedMiss) {
    const topScreenY = this.blockScreenY(this.blocks.length);
    this.falling = {
      cx: x,
      w,
      y: this.craneY() + 34,
      vy: 0.1,
      targetY: topScreenY,
      forcedMiss,
      missed: false,
    };
  },

  land(f) {
    const top = this.top();
    const dx = f.cx - top.cx;
    const overlap = top.w - Math.abs(dx);

    if (f.forcedMiss || overlap <= 2) {
      f.missed = true;               // кубик пролетает мимо и падает вниз
      this.gameOver();
      if (!f.forcedMiss) this.settled(1500);
      return;
    }

    const perfect = Math.abs(dx) <= this.PERFECT_PX;
    // Свес срезается: башня сужается ровно на промах
    const newW = perfect ? top.w : overlap;
    const newCx = perfect ? top.cx : (Math.max(top.cx - top.w / 2, f.cx - f.w / 2) + newW / 2);
    this.blocks.push({ cx: newCx, w: newW, level: this.blocks.length });
    this.placed++;

    if (!perfect) {
      const overhangW = f.w - overlap;
      const overhangCx = dx > 0 ? f.cx + f.w / 2 - overhangW / 2 : f.cx - f.w / 2 + overhangW / 2;
      this.debris.push({
        cx: overhangCx, w: overhangW, h: this.BLOCK_H,
        y: this.blockScreenY(this.blocks.length - 1),
        vy: 0, vx: dx > 0 ? 0.06 : -0.06, rot: 0, vr: dx > 0 ? 0.004 : -0.004,
        color: this.blockColor(this.blocks.length - 1),
      });
      this.pushText(`−${Math.round(overhangW)}px`, f.cx, this.blockScreenY(this.blocks.length) - 20, '#FFD3A0', 0.9);
    } else {
      this.perfects++;
      this.pushText('ИДЕАЛЬНО! ✨', this.w / 2, this.h * 0.38, '#2E7D32', 1.35);
      this.sparkle(newCx, this.blockScreenY(this.blocks.length - 1));
    }

    this.dust(newCx, this.blockScreenY(this.blocks.length - 1), newW);
    this.shake = perfect ? 6 : 10;
    this.falling = null;
    this.cameraTarget = Math.max(0, (this.blocks.length - 4) * this.BLOCK_H);
    this.settled(perfect ? 700 : 900);
  },

  gameOver() {
    if (this.over) return;
    this.over = true;
    this.shake = 18;
    this.collapseId = setTimeout(() => { this.collapsing = true; this.topple(); }, 420);
  },

  topple() {
    // Башня рассыпается — кроме фундамента
    for (let i = this.blocks.length - 1; i > 0; i--) {
      const b = this.blocks[i];
      const dir = Math.random() < 0.5 ? -1 : 1;
      this.debris.push({
        cx: b.cx, w: b.w, h: this.BLOCK_H,
        y: this.blockScreenY(i),
        vy: -0.05 - Math.random() * 0.12,
        vx: dir * (0.04 + Math.random() * 0.18),
        rot: 0, vr: dir * (0.002 + Math.random() * 0.006),
        color: this.blockColor(i),
      });
    }
    this.blocks = this.blocks.slice(0, 1);
  },

  isOver() { return this.over; },

  getState() {
    const height = this.height();
    const best = Engine.getRecord(this.topicId, 'tower');
    const stars = height >= 15 ? 3 : height >= 10 ? 2 : height >= 5 ? 1 : 0;
    const isRecord = height > 0 && height >= best;
    return {
      won: isRecord,
      score: height,
      stars,
      scoreLabel: '🏗️ Высота',
      headline: isRecord && height > 0 ? `Новый рекорд: ${height} 🏗️` : `Башня рухнула на ${height}`,
      sub: height >= 10
        ? `Идеальных попаданий: ${this.perfects}. Отличная работа!`
        : 'Отпускай кубик, когда он ровно над центром башни',
    };
  },

  hudLabel() {
    return `🏗️ Высота: ${this.height()} · 🥇 ${Engine.getRecord(this.topicId, 'tower')}`;
  },

  counterLabel() {
    return `Высота ${this.height()} · идеальных ${this.perfects}`;
  },

  // ── Обновление ────────────────────────────────────

  update(dt) {
    if (this.canvas.parentElement &&
        (Math.abs(this.canvas.parentElement.getBoundingClientRect().width - this.w) > 2 || Math.abs(this.canvas.parentElement.getBoundingClientRect().height - this.h) > 2)) {
      this.resize();
    }

    this.camera += (this.cameraTarget - this.camera) * Math.min(1, dt / 220);
    this.shake = Math.max(0, this.shake - dt / 26);
    this.clouds.forEach(c => {
      c.x += c.v * dt * 10;
      if (c.x - 60 * c.s > this.w) c.x = -60 * c.s;
    });

    // Пока игрок думает — кран стоит над центром; качается только при размещении
    if (!this.over && !this.falling) {
      const cx = this.top().cx;
      if (this.phase === 'placing') this.crane.x = cx + this.craneOffset(this.now() - this.placeAt);
      else this.crane.x += (cx - this.crane.x) * Math.min(1, dt / 160);
    }

    // Падение кубика
    const f = this.falling;
    if (f) {
      f.vy += 0.0035 * dt;
      f.y += f.vy * dt;
      if (!f.missed && f.y >= f.targetY) {
        f.y = f.targetY;
        this.land(f);
      } else if (f.missed && f.y > this.h + 120) {
        this.falling = null;
      }
    }

    this.debris = this.debris.filter(d => {
      d.vy += 0.0033 * dt;
      d.y += d.vy * dt;
      d.cx += d.vx * dt;
      d.rot += d.vr * dt;
      return d.y < this.h + 220;
    });

    this.puffs = this.puffs.filter(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.0008 * dt;
      p.life -= dt;
      return p.life > 0;
    });

    this.texts = this.texts.filter(t => {
      t.y -= 0.03 * dt;
      t.life -= dt;
      return t.life > 0;
    });
  },

  // ── Геометрия ─────────────────────────────────────

  /** Верх палубы с вопросом: сцена не должна уезжать под неё. */
  deckTop() {
    const deck = document.querySelector('.game-content');
    if (deck) {
      const t = deck.getBoundingClientRect().top;
      if (t > this.h * 0.35) return t;
    }
    return this.h * 0.72;
  },

  groundY() { return Math.min(this.h * 0.8, this.deckTop() - 14); },
  craneY() { return Math.max(84, Math.min(this.h * 0.18, this.groundY() - 150)); },
  /** Экранный Y верхней грани кубика уровня i (0 — фундамент). */
  blockScreenY(i) {
    return this.groundY() - (i + 1) * this.BLOCK_H + this.camera;
  },

  // ── Отрисовка ─────────────────────────────────────

  render() {
    const ctx = this.ctx;
    const { w, h } = this;
    ctx.setTransform(this.dpr || 1, 0, 0, this.dpr || 1, 0, 0);
    ctx.clearRect(0, 0, w, h);
    this.drawSky(ctx, w, h);

    ctx.save();
    if (!this.reducedMotion && this.shake > 0) {
      ctx.translate((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake);
    }

    this.drawGround(ctx, w, h);
    this.blocks.forEach((b, i) => this.drawBlock(ctx, b.cx, this.blockScreenY(i), b.w, this.blockColor(i), i === 0));
    this.debris.forEach(d => {
      ctx.save();
      ctx.translate(d.cx, d.y + d.h / 2);
      ctx.rotate(d.rot);
      this.drawBlock(ctx, 0, -d.h / 2, d.w, d.color, false, true);
      ctx.restore();
    });

    if (this.falling) {
      this.drawBlock(ctx, this.falling.cx, this.falling.y, this.falling.w,
        this.blockColor(this.blocks.length), false);
    }
    this.drawCrane(ctx, w);

    this.puffs.forEach(p => {
      ctx.globalAlpha = Math.max(0, p.life / p.maxLife) * 0.85;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;

    this.texts.forEach(t => {
      ctx.globalAlpha = Math.min(1, t.life / 400);
      ctx.font = `bold ${Math.round(20 * t.scale)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    });
    ctx.globalAlpha = 1;
    ctx.restore();

    this.drawHUD(ctx, w, h);
  },

  drawSky(ctx, w, h) {
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#333c68');
    sky.addColorStop(0.45, '#8a87af');
    sky.addColorStop(0.8, '#dfb9b0');
    sky.addColorStop(1, '#f2d9bd');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // Distant skyline layers provide depth as the camera climbs.
    for (let layer = 0; layer < 2; layer++) {
      ctx.fillStyle = layer ? 'rgba(67,70,107,0.2)' : 'rgba(93,87,126,0.13)';
      for (let i = 0; i < Math.ceil(w / 65); i++) {
        const height = 35 + (Math.sin(i * 4.7 + layer) + 1) * 45;
        ctx.fillRect(i * 65 + layer * 20, this.groundY() - height + this.camera * .15, 48, height + h * .4);
      }
    }
    // Солнце
    const sx = w * 0.87, sy = h * 0.33, r = Math.min(w, h) * 0.06;
    const halo = ctx.createRadialGradient(sx, sy, r * 0.5, sx, sy, r * 3);
    halo.addColorStop(0, 'rgba(255,240,150,0.5)');
    halo.addColorStop(1, 'rgba(255,240,150,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(sx, sy, r * 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#FFE680';
    ctx.beginPath(); ctx.arc(sx, sy, r, 0, Math.PI * 2); ctx.fill();

    // Облака
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    this.clouds.forEach(c => {
      const y = c.y + (this.camera * 0.25) % this.h;
      [[0, 0, 26], [22, 6, 20], [-22, 6, 18], [6, -10, 18]].forEach(([ox, oy, rr]) => {
        ctx.beginPath();
        ctx.arc(c.x + ox * c.s, y + oy * c.s, rr * c.s, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  },

  drawGround(ctx, w, h) {
    const gY = this.groundY() + this.camera;
    if (gY > h) return;
    // Холмы
    ctx.fillStyle = '#748e9d';
    ctx.beginPath();
    ctx.moveTo(0, gY);
    for (let x = 0; x <= w; x += 20) {
      ctx.lineTo(x, gY - 18 * Math.sin(x / 90) - 10);
    }
    ctx.lineTo(w, h); ctx.lineTo(0, h);
    ctx.closePath(); ctx.fill();

    const soil = ctx.createLinearGradient(0, gY, 0, h);
    soil.addColorStop(0, '#506c82');
    soil.addColorStop(1, '#2b3a54');
    ctx.fillStyle = soil;
    ctx.fillRect(0, gY, w, h - gY);
  },

  drawBlock(ctx, cx, topY, w, color, isBase, isDebris) {
    const hgt = this.BLOCK_H;
    const x = cx - w / 2;
    const g = ctx.createLinearGradient(x, topY, x + w, topY + hgt);
    g.addColorStop(0, this.shade(color, 28));
    g.addColorStop(1, this.shade(color, -22));
    ctx.fillStyle = g;
    ctx.strokeStyle = 'rgba(0,0,0,0.28)';
    ctx.lineWidth = 2;
    const r = Math.min(8, w / 4);
    ctx.beginPath();
    ctx.moveTo(x + r, topY);
    ctx.arcTo(x + w, topY, x + w, topY + hgt, r);
    ctx.arcTo(x + w, topY + hgt, x, topY + hgt, r);
    ctx.arcTo(x, topY + hgt, x, topY, r);
    ctx.arcTo(x, topY, x + w, topY, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Блик
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(x + 4, topY + 4, Math.max(0, w - 8), 4);

    if (isBase && !isDebris) {
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = 'bold 13px system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ФУНДАМЕНТ', cx, topY + hgt * 0.68);
    }
  },

  drawCrane(ctx, w) {
    if (this.over) return;
    const y = this.craneY();
    const x = this.falling ? this.falling.cx : this.crane.x;

    // Балка — стальная с косыми жёлтыми полосами
    ctx.fillStyle = '#4A4F5A';
    ctx.fillRect(0, y - 16, w, 16);
    ctx.fillStyle = '#F2B705';
    for (let i = -16; i < w; i += 34) {
      ctx.beginPath();
      ctx.moveTo(i, y); ctx.lineTo(i + 12, y);
      ctx.lineTo(i + 28, y - 16); ctx.lineTo(i + 16, y - 16);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(0, y - 2, w, 2);

    // Тележка
    ctx.fillStyle = '#4A4A55';
    ctx.fillRect(x - 22, y, 44, 12);
    // Трос
    ctx.strokeStyle = '#3A3A45';
    ctx.lineWidth = 3;
    const holdY = this.falling ? this.falling.y : y + 34;
    ctx.beginPath();
    ctx.moveTo(x, y + 12);
    ctx.lineTo(this.falling ? this.falling.cx : x, holdY);
    ctx.stroke();

    if (!this.falling) {
      // Кубик в захвате
      this.drawBlock(ctx, x, y + 34, this.top().w, this.blockColor(this.blocks.length), false);
      // Прицел: вертикальная линия от кубика к вершине башни
      ctx.setLineDash([6, 8]);
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y + 34 + this.BLOCK_H);
      ctx.lineTo(x, this.blockScreenY(this.blocks.length - 1));
      ctx.stroke();
      ctx.setLineDash([]);
    }
  },

  /** Высота и рекорд есть в шапке — на сцене только отметка рекорда на башне. */
  drawHUD(ctx, w, h) {
    const best = Engine.getRecord(this.topicId, 'tower');
    if (best <= 0) return;
    const recY = this.blockScreenY(best - 1);
    if (recY <= this.craneY() || recY >= h) return;

    ctx.setLineDash([10, 8]);
    ctx.strokeStyle = 'rgba(255,215,0,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, recY); ctx.lineTo(w, recY); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(255,215,0,0.95)';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.strokeStyle = 'rgba(0,60,120,0.45)';
    ctx.lineWidth = 3;
    ctx.strokeText(`🥇 рекорд ${best}`, w - Math.max(14, w * 0.03), recY - 6);
    ctx.fillText(`🥇 рекорд ${best}`, w - Math.max(14, w * 0.03), recY - 6);
  },

  // ── Эффекты ───────────────────────────────────────

  blockColor(i) {
    const hues = ['#E8505B', '#F9A03F', '#F6D55C', '#3CAEA3', '#4A90D9', '#9B72CF'];
    return hues[i % hues.length];
  },

  dust(cx, y, w) {
    for (let i = 0; i < 16; i++) {
      this.puffs.push({
        x: cx + (Math.random() - 0.5) * w,
        y: y + this.BLOCK_H,
        vx: (Math.random() - 0.5) * 0.25,
        vy: -Math.random() * 0.1,
        r: 3 + Math.random() * 7,
        color: 'rgba(220,220,230,0.8)',
        life: 500, maxLife: 500,
      });
    }
  },

  sparkle(cx, y) {
    const colors = ['#FFD700', '#7CFFB2', '#FFFFFF', '#66D9FF'];
    for (let i = 0; i < 26; i++) {
      const a = Math.random() * Math.PI * 2;
      this.puffs.push({
        x: cx, y,
        vx: Math.cos(a) * (0.1 + Math.random() * 0.35),
        vy: Math.sin(a) * (0.1 + Math.random() * 0.35) - 0.15,
        r: 2 + Math.random() * 4,
        color: colors[i % colors.length],
        life: 800, maxLife: 800,
      });
    }
  },

  pushText(text, x, y, color, scale = 1) {
    this.texts.push({ text, x, y, color, scale, life: 1100 });
  },

  shade(hex, amount) {
    const n = parseInt(String(hex).replace('#', ''), 16);
    const c = v => Math.min(255, Math.max(0, v + amount));
    return `rgb(${c(n >> 16)},${c((n >> 8) & 0xFF)},${c(n & 0xFF)})`;
  },
};

window.TOWER_GAME = TowerGame;
window.GAME_MODES = window.GAME_MODES || {};
window.GAME_MODES.tower = TowerGame;
