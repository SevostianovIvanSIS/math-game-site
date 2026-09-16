// ── Тема: Делимость чисел ───────────────────────────

const Topic = {
  init(topicId) {
    Round.start({ topicId, rounds: 15, next: () => this.question() });
  },

  question() {
    const q = Math.random() < 0.65
      ? DB.divisibility(pick([2, 3, 5, 9, 10]))
      : DB.prime_check();
    return { ...q, question: `🔍 ${q.question}` };
  },
};

window.Topic = Topic;
export { Topic };
