// ── Тема: Натуральные числа (5 класс) ───────────────

const Topic = {
  step: 0,

  init(topicId) {
    this.step = 0;
    Round.start({ topicId, rounds: 15, next: () => this.question() });
  },

  question() {
    // По кругу: округление → сравнение → вычисления
    const kind = this.step++ % 3;
    const q = kind === 0 ? DB.numbers_round()
      : kind === 1 ? DB.numbers_compare()
      : DB.numbers_operations();
    return { ...q, question: `🔢 ${q.question}${kind === 2 ? ' = ?' : ''}` };
  },
};

window.Topic = Topic;
export { Topic };
