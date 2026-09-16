// ── Список тем ──────────────────────────────────────

const TOPICS = [
  // pace: 'fast' — скорость ответа влияет на результат; 'medium' / 'long' — время по сложности,
  // считается только правильность (см. Round.paceFor).
  { id: 'multiplication', name: 'Таблица умножения', icon: '✖️', desc: 'Нажимай быстро!', next: true, pace: 'fast' },
  { id: 'fractions', name: 'Дроби', icon: '🍕', desc: 'Пицца, пицца, пицца!', next: 'multiplication', pace: 'medium' },
  { id: 'numbers5', name: 'Натуральные числа', icon: '🔢', desc: 'Большая арифметика (5 кл.)', next: 'fractions', pace: 'long' },
  { id: 'divisibility', name: 'Делимость чисел', icon: '🧩', desc: 'Простые числа (5–6 кл.)', next: 'fractions', pace: 'medium' },
  { id: 'expressions', name: 'Числовые выражения', icon: '🧮', desc: 'Скобки и порядок действий', next: 'fractions', pace: 'long' },
  { id: 'percentages', name: 'Проценты', icon: '💰', desc: 'Скидки и расчёты', next: 'fractions', pace: 'long' },
  { id: 'coordinates', name: 'Координаты', icon: '📍', desc: 'Морской бой (6 кл.)', next: 'fractions', pace: 'medium' },
  { id: 'speed', name: 'Скорость и время', icon: '🚗', desc: 'Км/ч, метры, часы', next: 'fractions', pace: 'long' }
 ];
TOPICS.forEach(t => t.subject = "math");
TOPICS.push(...LearningBank.topics);
window.TOPICS = TOPICS;   // Round.paceFor читает темп темы

// ── Главный контроллер ──────────────────────────────

const App = {
  currentTopic: null,
  subject: localStorage.getItem("learning_subject") || "math",
  grade: localStorage.getItem("learning_grade") || "5",
  visibleTopics() { return TOPICS.filter(t => t.subject === this.subject && (!t.min || t.min <= Number(this.grade))); },
  setSubject(id) {
    if (!["math", "russian"].includes(id)) return;
    this.subject=id; localStorage.setItem("learning_subject",id);
    this.currentMode="garden"; localStorage.setItem("mathgame_mode", "garden"); this.renderHome();
  },
  setGrade(value) { this.grade=value; localStorage.setItem("learning_grade",value); this.renderHome(); },
  currentMode: localStorage.getItem('mathgame_mode') || window.DEFAULT_MODE,

  init() {
    document.getElementById('back-btn').addEventListener('click', () => this.goHome());
    if (!window.MODES.some(m => m.id === this.currentMode)) this.currentMode = window.DEFAULT_MODE;
    this.renderHome();
  },

  // ── Главная страница ──────────────────────────────

  renderHome() {
    if (!["math", "russian"].includes(this.subject)) this.subject="math";
    document.getElementById('subject-switch').innerHTML = [['math','✖️','Математика'],['russian','Аа','Русский язык']].map(([id,icon,name])=>`<button class="subject-card ${this.subject===id?'active':''}" aria-pressed="${this.subject===id}" onclick="App.setSubject('${id}')"><b>${icon}</b><span>${name}</span></button>`).join('');
    document.getElementById('grade-select').value=this.grade;
    document.querySelector('.hero-cube').innerHTML=this.subject==='russian'?'А<span>→</span>Я':'7<span>×</span>8';
    const topics=this.visibleTopics();
    const stats=topics.map(t=>Learning.stats(t.id));
    const recommended=topics.slice().sort((a,b)=>Learning.stats(b.id).review-Learning.stats(a.id).review || Learning.stats(a.id).attempts-Learning.stats(b.id).attempts).find(t=>this.isUnlocked(t));
    const mastered=stats.reduce((s,t)=>s+t.mastered,0), review=stats.reduce((s,t)=>s+t.review,0);
    document.getElementById('learning-progress').innerHTML=`<span class="garden-badge">${mastered>=10?'🌳':mastered?'🌿':'🌱'}</span><div><h2>Твой сад знаний</h2><p>${mastered} заданий закреплено · ${review} ждут повторения</p><small>Закрепление — 3 верных ответа подряд без подсказки. Ошибки повторяем в первую очередь.</small>${recommended?`<button class="practice-start" onclick="App.setMode('garden');App.loadTopic('${recommended.id}')">${review?'Повторить трудное':'Начать тренировку'} · ${recommended.name} →</button>`:''}</div>`;
    this.renderModeSwitch();
    this.renderTopics();
    document.getElementById('total-stars').textContent = `★ ${topics.reduce((sum, t) => sum + Engine.getStars(t.id), 0)} / ${topics.length*3}`;
    document.getElementById('topics-progress').textContent = `${topics.filter(t => this.isUnlocked(t)).length} из ${topics.length} открыто`;
  },

  renderModeSwitch() {
    const box = document.getElementById('mode-switch');
    if (!box) return;
    box.innerHTML = window.MODES.map(m => `
      <button type="button" aria-pressed="${m.id === this.currentMode}" class="mode-card ${m.id === this.currentMode ? 'active' : ''} mode-${m.id}"
           onclick="App.setMode('${m.id}')">
        <div class="mode-art" aria-hidden="true">${m.id === 'garden' ? '<span class="garden-mode-art">🌷</span>' : m.id === 'battle' ? '<span class="mini-moon"></span><span class="web-line"></span><span class="mini-spider"><i></i><b></b></span>' : '<span class="mini-moon"></span><span class="mini-tower"><i></i><i></i><i></i><i></i></span>'}</div>
        <div class="mode-text">
          <div class="mode-tag">${m.id === 'garden' ? 'УЧИМСЯ БЕЗ СПЕШКИ' : m.id === 'battle' ? 'ВЕРНЫЙ ОТВЕТ — УДАР' : 'ТОЧНОСТЬ И РИТМ'}</div><div class="mode-name">${m.name}</div>
          <div class="mode-desc">${m.desc}</div>
        </div>
        <div class="mode-check">${m.id === this.currentMode ? '✓' : '↗'}</div>
      </button>`).join('');
  },

  renderTopics() {
    const mode = window.getMode(this.currentMode);
    const grid = document.getElementById('topic-grid');
    grid.innerHTML = this.visibleTopics().map((topic, index) => {
      const unlocked = this.isUnlocked(topic);
      const stars = unlocked ? Engine.getStars(topic.id) : 0;
      const learningStats = Learning.stats(topic.id);
      const status = unlocked ? `${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}` : '🔒';
      const record = unlocked ? Engine.getRecord(topic.id, this.currentMode) : 0;
      return `
        <button type="button" ${!unlocked ? 'disabled' : ''} style="--card-order:${index}" class="topic-card ${!unlocked ? 'locked' : ''}" onclick="${unlocked ? `App.loadTopic('${topic.id}')` : ''}">
          <div class="topic-top"><div class="topic-icon">${topic.icon}</div><span class="topic-number">${String(index + 1).padStart(2, '0')}</span></div>
          <div class="topic-name">${topic.name}</div>
          <div class="topic-desc">${topic.desc}</div>
          <div class="topic-best ${record > 0 ? '' : 'empty'}">
            ${mode.icon} ${mode.recordLabel}: ${record > 0 ? record : '—'}
          </div>
          ${learningStats.attempts ? `<div class="topic-learning">🌱 ${learningStats.mastered} закреплено · ${learningStats.accuracy}% без подсказок<br>↻ На повторение: ${learningStats.review}</div>` : ''}
          <div class="topic-status">${status}<span>${unlocked ? 'Играть ↗' : `★ в теме «${TOPICS.find(t => t.id === topic.next)?.name}»`}</span></div>
        </button>`;
    }).join('');
  },

  setMode(id) {
    if (!window.MODES.some(m => m.id === id)) return;
    this.currentMode = id;
    localStorage.setItem('mathgame_mode', id);
    this.renderHome();
  },

  // ── Проверка разблокировки ────────────────────────

  isUnlocked(topic) {
    if (topic.next === true) return true;
    return Engine.getStars(topic.next) >= 1;
  },

  // ── Загрузка темы ─────────────────────────────────

  async loadTopic(id) {
    document.getElementById('home-screen').hidden = true;
    document.getElementById('game-screen').hidden = false;
    document.body.classList.add('playing');
    Engine.reset();
    Engine.updateScoreDisplay();

    this.currentTopic = id;
    const topicData = TOPICS.find(t => t.id === id);
    const mode = window.getMode(this.currentMode);
    document.querySelector('#game-screen .btn-back').textContent = `← ${mode.icon} ${topicData.name}`;

    try {
      if (LearningBank.topics.some(t => t.id === id)) { Learning.start(id); return; }
      const module = await import(`./topics/${id}.js`);
      if(this.currentTopic !== id) return;
      if (module.Topic && typeof module.Topic.init === 'function') {
        window.Topic = module.Topic;
        module.Topic.init(id);
      } else {
        this.showPlaceholder(id);
      }
    } catch (e) {
      console.error(`Failed to load topic ${id}:`, e);
      this.showPlaceholder(id);
    }
  },

  showPlaceholder(id) {
    const topicData = TOPICS.find(t => t.id === id);
    document.getElementById('game-content').innerHTML = `
      <div class="result">
        <div class="result-title">${topicData.icon} ${topicData.name}</div>
        <div class="result-score">Игра в разработке...</div>
        <button class="play-again" onclick="App.goHome()">На главную</button>
      </div>`;
  },

  // ── Возврат на главную ────────────────────────────

  goHome() {
    Round.hidePopup();
    Round.stop();
    Engine.stopGame();
    document.getElementById('game-screen').hidden = true;
    document.getElementById('home-screen').hidden = false;
    document.body.classList.remove('playing');
    this.currentTopic = null;
    this.renderHome();
  }
};

// ── Запуск ──────────────────────────────────────────

// Инлайновые onclick в HTML ("App.loadTopic(...)") ищут ГЛОБАЛЬНЫЕ имена:
// exports ES-модуля в окно не попадают, поэтому публикуем App явно.
window.App = App;

document.addEventListener('DOMContentLoaded', () => App.init());

export { App };
