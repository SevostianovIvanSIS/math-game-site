// ── Режимы игры ─────────────────────────────────────
//
// Метаданные режимов (для переключателя на главной) и реестр контроллеров.
// Контроллер режима регистрирует себя сам: window.GAME_MODES.<id> = <объект>.
//
// Контракт контроллера режима:
//   limitMs                                  — лимит времени на один ответ
//   endless                                  — игра до проигрыша (иначе до rounds)
//   init({ rounds, topicId })  → boolean     — подготовить сцену, true если готова
//   onAnswer({correct, timedOut, elapsedMs, limitMs}) — отыграть ответ
//   isOver()                   → boolean
//   getState()                 → { won, headline, sub, stats, score, stars }
//   stop()                                   — остановить анимацию

const MODES = [
  {id:'garden',name:'Сад знаний',icon:'🌷',desc:'Без таймера · подсказки · повтор ошибок',recordLabel:'Цветы'},
  {
    id: 'battle',
    name: 'Битва пауков',
    icon: '🕷️',
    desc: 'Верный ответ — удар, серия — крит',
    recordLabel: 'Рекорд',
  },
  {
    id: 'tower',
    name: 'Башенки',
    icon: '🏗️',
    desc: 'Ответь верно и поймай центр башни',
    recordLabel: 'Высота',
  },
];

const DEFAULT_MODE = 'garden';

function getMode(id) {
  return MODES.find(m => m.id === id) || MODES[0];
}

window.MODES = MODES;
window.DEFAULT_MODE = DEFAULT_MODE;
window.getMode = getMode;
window.GAME_MODES = window.GAME_MODES || {};
