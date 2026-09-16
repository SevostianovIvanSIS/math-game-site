// ── Engine — очки, звёзды, рекорды ──────────────────

const Engine = {
  score: 0,
  timeLeft: 0,
  timerId: null,
  streak: 0,
  stars: 0,
  gameActive: false,

  // ── Таймер (общий, посекундный) ───────────────────

  startGame(duration, onTick, onFinish) {
    this.timeLeft = duration;
    this.gameActive = true;
    if (onTick) onTick(this.timeLeft);
    this.timerId = setInterval(() => {
      this.timeLeft--;
      if (onTick) onTick(this.timeLeft);
      if (this.timeLeft <= 0) {
        this.stopGame();
        if (onFinish) onFinish();
      }
    }, 1000);
  },

  stopGame() {
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.gameActive = false;
  },

  // ── Ответы ────────────────────────────────────────

  reset() {
    this.score = 0;
    this.streak = 0;
    this.stars = 0;
  },

  addAnswer(correct) {
    if (correct) {
      this.score += 10;
      this.streak++;
      // Бонус за серию: каждые 3 правильных подряд +5
      if (this.streak % 3 === 0) {
        this.score += 5;
      }
      this.stars = Math.min(3, Math.floor(this.score / 20));
    } else {
      this.streak = 0;
    }
  },

  getCurrentScore() {
    return this.score;
  },

  // ── Сохранение / загрузка ─────────────────────────
  //
  // Ключи: mathgame_score_<topic> — очки режима битвы (он же общий прогресс),
  //        mathgame_tower_<topic> — рекорд высоты режима башенок,
  //        mathgame_stars_<topic> — звёзды темы (максимум за всё время).

  recordKey(topic, mode) {
    if (mode === 'garden') return `learning_garden_${topic}`;
    return mode === 'tower' ? `mathgame_tower_${topic}` : `mathgame_score_${topic}`;
  },

  getRecord(topic, mode) {
    return parseInt(localStorage.getItem(this.recordKey(topic, mode))) || 0;
  },

  /** Сохраняет рекорд режима. Возвращает true, если рекорд побит. */
  saveRecord(topic, mode, value) {
    const key = this.recordKey(topic, mode);
    const prev = parseInt(localStorage.getItem(key)) || 0;
    if (value > prev) {
      localStorage.setItem(key, value);
      return true;
    }
    return false;
  },

  saveStars(topic, stars) {
    const prev = parseInt(localStorage.getItem(`mathgame_stars_${topic}`)) || 0;
    if (stars > prev) {
      localStorage.setItem(`mathgame_stars_${topic}`, stars);
    }
  },

  /** Совместимость: сохранить и рекорд очков, и звёзды. */
  saveScore(topic, score, stars) {
    const isRecord = this.saveRecord(topic, 'battle', score);
    this.saveStars(topic, stars);
    return isRecord;
  },

  getStars(topic) {
    return parseInt(localStorage.getItem(`mathgame_stars_${topic}`)) || 0;
  },

  getBestScore(topic) {
    return this.getRecord(topic, 'battle');
  },

  // ── Обновление UI ─────────────────────────────────

  updateScoreDisplay(label) {
    const el = document.getElementById('score-display');
    if (el) {
      el.textContent = label || `Очки: ${this.score}`;
    }
  },

  updateTimerDisplay() {
    const el = document.getElementById('timer-value');
    if (el) {
      el.textContent = this.timeLeft;
    }
  }
};

window.Engine = Engine;
