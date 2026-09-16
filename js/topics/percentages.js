// ── Тема: Проценты ──────────────────────────────────

const Topic = {
  init(topicId) {
    Round.start({ topicId, rounds: 15, next: () => this.question() });
  },

  question() {
    const q = Math.random() < 0.5 ? DB.percentages() : DB.percent_discount();
    return { ...q, question: `💰 ${q.question}` };
  },
};

window.Topic = Topic;
export { Topic };
