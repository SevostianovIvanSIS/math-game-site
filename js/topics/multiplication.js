// ── Тема: Таблица умножения ─────────────────────────
// Тема — только поставщик вопросов. Цикл раунда, лимит времени,
// очки и финал — в js/round.js, визуал — в активном режиме.

const Topic = {
  init(topicId) {
    Round.start({ topicId, rounds: 15, next: () => this.question() });
  },

  question() {
    const q = DB.multiplication();
    return { ...q, question: `${q.question} = ?` };
  },
};

window.Topic = Topic;
export { Topic };
