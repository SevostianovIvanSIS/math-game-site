// ── Round — общий цикл раунда для всех тем и режимов ─────────────────
//
// Тема отвечает только за вопросы: Round.start({ topicId, rounds, next }),
// где next() возвращает { question, options, correctAnswer, type, draw }.
// Всё остальное — рендер, лимит времени, очки, передача в режим, финал —
// здесь.

const Round = {
  topicId: null,
  modeId: 'battle',
  mode: null,
  next: null,
  rounds: 15,
  index: 0,
  correct: 0,
  wrong: 0,
  current: null,
  startedAt: 0,
  limitMs: 10000,
  rafId: null,
  locked: true,
  finished: false,
  advanceId: null,
  pace: 'fast',       // fast | medium | long | calm — темп текущего вопроса
  pending: false,     // режим доигрывает ход (кран в «Башенках»), ждём его сигнала

  // ── Старт ─────────────────────────────────────────

  start({ topicId, rounds = 15, next }) {
    this.stop();
    this.topicId = topicId;
    this.rounds = rounds;
    this.next = next;
    this.modeId = (window.App && App.currentMode) || window.DEFAULT_MODE;
    this.mode = window.GAME_MODES[this.modeId] || window.GAME_MODES.battle;
    this.limitMs = this.mode.limitMs ?? 10000;
    if(this.mode.manual && window.Learning && !LearningBank.topics.some(t=>t.id===topicId)) {
      const pending=Object.values(Learning.read(topicId)).filter(v=>v.needsReview && !v.question.canvas).slice(0,5).map(v=>v.question);
      this.next=()=>pending.length?pending.shift():next();
    }
    this.baseRounds=rounds; this.retries=[]; this.retried=new Set();
    this.pending = false;
    this.index = 0;
    this.correct = 0;
    this.wrong = 0;
    this.finished = false;
    Engine.reset();

    this.hidePopup();
    this.mode.init({ rounds, topicId });
    this.updateHud();
    this.renderQuestion();
  },

  restart() {
    this.hidePopup();
    // init темы сбрасывает её собственное состояние и снова зовёт Round.start
    if (window.Topic && this.topicId) window.Topic.init(this.topicId);
  },

  stop() {
    if(window.speechSynthesis) window.speechSynthesis.cancel();
    clearTimeout(this.advanceId);
    this.advanceId = null;
    this.locked = true;
    this.pending = false;
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.mode && this.mode.stop) this.mode.stop();
  },

  // ── Рендер вопроса ────────────────────────────────

  renderQuestion() {
    if(window.speechSynthesis)window.speechSynthesis.cancel();
    if (this.finished) return;
    if (!this.mode.endless && this.index >= this.rounds) {
      this.finish();
      return;
    }

    const q = this.index >= this.baseRounds && this.retries.length ? this.retries.shift() : this.next();
    if (!q.id) q.id = `${this.topicId}:${q.question}:${q.correctAnswer}`;
    this.assisted=false;
    this.current = q;
    this.pace = this.paceFor(q);
    this.limitMs = this.limitFor(q, this.pace);
    const container = document.getElementById('game-content');
    const counter = this.mode.endless
      ? `${this.mode.icon} ${this.mode.counterLabel(this)}`
      : `Раунд ${this.index + 1} / ${this.rounds}`;

    const body = q.type === 'input'
      ? `<input class="answer-input" id="answer-input" aria-label="Твой ответ" type="text" inputmode="${q.inputmode || 'decimal'}"
                autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${q.placeholder || 'Ответ'}"
                onkeydown="if(event.key==='Enter')Round.submitInput()">
         <button class="submit-btn" onclick="Round.submitInput()">Ответить</button>`
      : `<div class="options">${q.options.map((opt, i) =>
            `<button class="option-btn" data-i="${i}" onclick="Round.pick(${i})">${opt}</button>`
          ).join('')}</div>`;

    container.innerHTML = `
      <div class="round-counter">${counter}</div>
      <div class="question">${q.question}</div>
      ${q.canvas ? `<div class="canvas-container"><canvas id="${q.canvas.id}" width="${q.canvas.w}" height="${q.canvas.h}"></canvas></div>` : ''}
      ${body}
      ${this.mode.manual && q.hint ? '<button class="hint-btn" onclick="Round.showHint()">💡 Нужна подсказка</button><div id="hint-text" class="hint-text" hidden></div>' : ''}
      <div class="answer-feedback" role="status" aria-live="polite">${this.paceHint()}</div>
    `;

    if (typeof q.draw === 'function') q.draw();
    const input = document.getElementById('answer-input');
    if (input) input.focus();

    this.startedAt = this.now();
    this.locked = false;
    // Режим отсчитывает своё время от показа вопроса (кран в «Башенках»)
    if (this.mode.onQuestionStart) this.mode.onQuestionStart();
    if (this.limitMs > 0) this.startTicking();
    else { this.renderTimeBar(1); const timer=document.getElementById('timer-value'); if(timer)timer.textContent='∞'; }
  },

  // ── Темп вопроса ──────────────────────────────────
  //
  // Быстрый темп (скорость влияет на результат) — только для таблицы умножения
  // и уже закреплённых слов (3 самостоятельных верных ответа подряд).
  // Остальные задания получают время по сложности, а результат зависит от
  // правильности, не от скорости.

  paceFor(q) {
    if (this.mode.manual) return 'calm';
    if (q.pace) return q.pace;
    if (window.LearningBank && LearningBank.topics.some(t => t.id === this.topicId)) {
      const saved = window.Learning ? Learning.read(this.topicId)[q.id] : null;
      return saved && saved.streak >= 3 ? 'fast' : 'medium';
    }
    const topic = (window.TOPICS || []).find(t => t.id === this.topicId);
    return topic?.pace || 'medium';
  },

  limitFor(q, pace) {
    const base = this.mode.limitMs ?? 10000;
    if (base <= 0) return 0;
    if (q.limitMs) return q.limitMs;
    if (pace === 'fast') return q.inputmode === 'text' ? Math.max(base, 15000) : base;
    return pace === 'long' ? 45000 : 25000;
  },

  paceHint() {
    if (this.mode.manual) return 'Подумай спокойно. Здесь можно ошибаться.';
    const seconds = Math.round(this.limitMs / 1000);
    if (this.modeId === 'tower') {
      return this.pace === 'fast' ? 'Быстрый темп: ответь и поймай центр' : `Кран ждёт: ${seconds} с на верный ответ, затем отпусти кубик`;
    }
    return this.pace === 'fast' ? 'Быстрый ответ — сильнее удар' : `Главное — верный ответ. Времени: ${seconds} с`;
  },

  speak() {
    if(!window.speechSynthesis || !this.current)return;
    window.speechSynthesis.cancel();
    const phrase=new SpeechSynthesisUtterance(this.current.spoken || this.current.explanation);
    phrase.lang='ru-RU'; phrase.rate=0.85;
    window.speechSynthesis.speak(phrase);
  },

  showHint() {
    if(this.locked || !this.current.hint)return;
    this.assisted=true;
    const box=document.getElementById('hint-text'); box.hidden=false; box.textContent=this.current.hint;
  },

  // ── Лимит времени ─────────────────────────────────

  now() {
    return (typeof performance !== 'undefined' ? performance.now() : Date.now());
  },

  startTicking() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    const loop = () => {
      this.rafId = null;
      if (this.locked || this.finished) return;
      const elapsed = this.now() - this.startedAt;
      const left = Math.max(0, this.limitMs - elapsed);
      this.renderTimeBar(left / this.limitMs);
      const secEl = document.getElementById('timer-value');
      if (secEl) secEl.textContent = Math.ceil(left / 1000);
      if (left <= 0) {
        this.resolve(false, true);
        return;
      }
      this.rafId = requestAnimationFrame(loop);
    };
    this.rafId = requestAnimationFrame(loop);
  },

  renderTimeBar(fraction) {
    const fill = document.getElementById('time-bar-fill');
    if (!fill) return;
    fill.style.width = `${Math.max(0, fraction) * 100}%`;
    fill.className = 'time-bar-fill' +
      (fraction > 0.55 ? ' fast' : fraction > 0.25 ? ' mid' : ' slow');
  },

  // ── Ответы ────────────────────────────────────────

  pick(i) {
    if (this.locked || !this.current) return;
    const chosen = this.current.options[i];
    const isCorrect = String(chosen) === String(this.current.correctAnswer);
    this.markOptions(i, isCorrect);
    this.resolve(isCorrect, false);
  },

  submitInput() {
    if (this.locked || !this.current) return;
    const input = document.getElementById('answer-input');
    const raw = input ? input.value : '';
    if (String(raw).trim() === '') return;
    const isCorrect = [this.current.correctAnswer,...(this.current.accepted || [])].some(a=>this.normalize(raw) === this.normalize(a));
    if (input) input.classList.add(isCorrect ? 'correct' : 'wrong');
    this.resolve(isCorrect, false);
  },

  /** «3,-2» == «3, -2», «2.5» == «2,5» */
  normalize(v) {
    return String(v).trim().toLowerCase().replace(/\u0301/g, '').replace(/\s+/g, '').replace(',', '.');
  },

  markOptions(chosenIndex, isCorrect) {
    const btns = document.querySelectorAll('.option-btn');
    btns.forEach(btn => {
      btn.disabled = true;
      const i = parseInt(btn.dataset.i);
      if (String(this.current.options[i]) === String(this.current.correctAnswer)) {
        btn.classList.add('correct');
      } else if (i === chosenIndex && !isCorrect) {
        btn.classList.add('wrong');
      }
    });
  },

  resolve(isCorrect, timedOut) {
    if (this.locked || this.finished) return;
    this.locked = true;
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }

    const elapsedMs = timedOut ? this.limitMs : Math.min(this.limitMs, this.now() - this.startedAt);
    this.correctLast = isCorrect; this.timedOutLast = timedOut;
    if (isCorrect) this.correct++; else this.wrong++;
    Engine.addAnswer(isCorrect);
    if(window.Learning) Learning.record(this.topicId,this.current,isCorrect,this.assisted);
    if(this.mode.manual && (!isCorrect || this.assisted) && !this.retried.has(this.current.id)) {
      this.retried.add(this.current.id); this.retries.push({...this.current}); this.rounds++;
    }

    const feedback = document.querySelector('.answer-feedback');
    if (feedback) {
      feedback.className = `answer-feedback ${isCorrect ? 'good' : 'bad'}`;
      feedback.textContent = isCorrect ? (Engine.streak >= 2 ? `✦ Серия ${Engine.streak}! Так держать` : '✓ Верно! Отличный ход') : `${timedOut ? 'Время вышло' : 'Не совсем'} · Ответ: ${this.current.correctAnswer}`;
    }
    if (timedOut) this.flashTimeout();
    const res = this.mode.onAnswer({
      correct: isCorrect, timedOut, elapsedMs, limitMs: this.limitMs, assisted:this.assisted, pace: this.pace,
    }) || {};
    this.updateHud();
    if (res.pending) {
      // Ход продолжается в режиме (например, игрок отпускает кубик крана);
      // режим позовёт Round.completePending(), когда закончит.
      this.pending = true;
      const box = document.createElement('div');
      box.className = 'pending-box'; box.id = 'pending-box';
      box.innerHTML = res.pendingHtml || '';
      document.getElementById('game-content').appendChild(box);
      const btn = box.querySelector('button'); if (btn) btn.focus();
      return;
    }
    this.afterAnswer(res, isCorrect);
  },

  /** Режим закончил свою часть хода — продолжаем обычный путь к следующему вопросу. */
  completePending(res) {
    if (!this.pending || this.finished) return;
    this.pending = false;
    const box = document.getElementById('pending-box');
    if (box && box.remove) box.remove();
    this.afterAnswer(res || {}, this.correctLast);
  },

  afterAnswer(res, isCorrect) {
    const advance = () => {
      this.advanceId=null;
      if(this.finished)return;
      if(this.mode.isOver()) this.finish();
      else { this.index++;this.renderQuestion(); }
    };
    const autoAdvance = isCorrect && this.topicId.startsWith('ru_');
    if(!autoAdvance && (this.mode.manual || this.current.explanation)) {
      const box=document.createElement('div'); box.className='explanation';
      const explanation=document.createElement('p');
      explanation.textContent=(this.assisted?'С подсказкой — повторим для закрепления. ':'')+(this.current.explanation || `Верный ответ: ${this.current.correctAnswer}.`)+(this.current.spoken?` Прочитай вслух: «${this.current.spoken}»`:'');
      const button=document.createElement('button');button.className='submit-btn';button.textContent='Дальше →';
      button.onclick=()=>{button.disabled=true;advance();};
      box.appendChild(explanation);
      if(this.current.spoken && window.speechSynthesis) {
        const listen=document.createElement('button');listen.className='hint-btn';listen.textContent='🔊 Послушать правильную фразу';listen.onclick=()=>this.speak();box.appendChild(listen);
      }
      box.appendChild(button);document.getElementById('game-content').appendChild(box);
      button.focus();
    } else {
      const delay=res.delayMs || (isCorrect ? 750 : 1100);
      this.advanceId=setTimeout(advance,delay);
    }
  },

  flashTimeout() {
    const q = document.querySelector('.question');
    if (q) {
      q.classList.add('timeout');
      setTimeout(() => q.classList.remove('timeout'), 600);
    }
  },

  updateHud() {
    Engine.updateScoreDisplay(this.mode.hudLabel ? this.mode.hudLabel(this) : null);
  },

  // ── Финал ─────────────────────────────────────────

  finish() {
    if (this.finished) return;
    this.finished = true;
    this.locked = true;
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null; }
    this.renderTimeBar(0);

    const state = this.mode.getState(this);
    const isRecord = Engine.saveRecord(this.topicId, this.modeId, state.score);
    Engine.saveStars(this.topicId, state.stars);

    this.showPopup(state, isRecord);
  },

  showPopup(state, isRecord) {
    const set = (id, html) => {
      const el = document.getElementById(id);
      if (el) el.innerHTML = html;
    };
    const best = Engine.getRecord(this.topicId, this.modeId);
    set('popup-icon', state.won ? '🏆' : '💀');
    set('popup-title', state.headline);
    set('popup-sub', state.sub || '');
    set('popup-stars', Array.from({ length: 3 }, (_, i) => `<span style="--star:${i}">${i < state.stars ? '★' : '☆'}</span>`).join(''));
    set('popup-stats', `
      <div class="popup-row"><span>✅ Верно</span><b>${this.correct}</b></div>
      <div class="popup-row"><span>❌ Ошибки</span><b>${this.wrong}</b></div>
      <div class="popup-row"><span>${state.scoreLabel}</span><b>${state.score}</b></div>
      <div class="popup-row ${isRecord ? 'record' : ''}">
        <span>${isRecord ? '🎉 Новый рекорд' : '🥇 Рекорд'}</span><b>${best}</b>
      </div>`);

    const popup = document.getElementById('result-popup');
    if (popup) {
      popup.hidden = false;
      popup.classList.add('visible');
      popup.classList.toggle('lose', !state.won);
      popup.querySelector('.popup-card').focus();
    }
  },

  hidePopup() {
    const popup = document.getElementById('result-popup');
    if (popup) {
      popup.hidden = true;
      popup.classList.remove('visible', 'lose');
    }
  },
};

window.Round = Round;
